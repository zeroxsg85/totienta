'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faCamera, faSync } from '@fortawesome/free-solid-svg-icons';
import { formatDate } from '@/lib/formatDate';
import API from '@/lib/api';
import { Member } from '@/types';

interface MemberCardProps {
  show: boolean;
  onHide: () => void;
  member: Member | null;
  onDelete?: (id: string) => void;
  onEdit?: (member: Member) => void;
  isEditable?: boolean;
  baseUrl: string;
}

export default function MemberCard({
  show,
  onHide,
  member,
  onDelete,
  onEdit,
  isEditable = false,
  baseUrl,
}: MemberCardProps): JSX.Element | null {
  const [avatar, setAvatar] = useState<string>('');
  const [loadingAva, setLoadingAva] = useState<boolean>(false);

  const defaultAvatar =
    member?.gender === 'male'
      ? '/avatars/noManProfile.png'
      : '/avatars/noWomanProfile.png';

  useEffect(() => {
    if (member) {
      setAvatar(
        member.avatar && member.avatar.trim() !== '' ? member.avatar : defaultAvatar
      );
    }
  }, [member, defaultAvatar]);

  if (!member) return null;

  const tenThanhVien = member.name?.includes('-')
    ? member.name.split('-')
    : [member.name, '', ''];

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingAva(true);

    let convertedFile: File = file;

    // Handle HEIC images
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9,
        });
        const blobResult = Array.isArray(blob) ? blob[0] : blob;
        convertedFile = new File([blobResult], file.name.replace('.heic', '.jpg'), {
          type: 'image/jpeg',
        });
      } catch (error) {
        console.error('Lỗi khi chuyển đổi HEIC:', error);
        setLoadingAva(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('_id', member._id);
    formData.append('avatar', convertedFile);

    try {
      const response = await API.post<{ avatar: string }>('/members/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatar(response.data.avatar);
    } catch (error) {
      console.error('Lỗi khi tải lên ảnh đại diện:', error);
    } finally {
      setLoadingAva(false);
    }
  };

  const getAvatarSrc = (): string => {
    if (avatar.startsWith('/')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `${baseUrl}/${avatar}`;
  };

  const childCount = member.children?.length || 0;

  return (
    <Modal show={show} onHide={onHide} fullscreen centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <strong>
            <FontAwesomeIcon icon={faIdCard} /> Thông Tin Thành Viên
          </strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Avatar */}
        <div className="text-center">
          <div className="avatar-container">
            {loadingAva ? (
              <>
                <br />
                <FontAwesomeIcon icon={faSync} spin /> Đang xử lý...
              </>
            ) : (
              <>
                <img
                  src={getAvatarSrc()}
                  alt="Avatar"
                  className="me-3"
                  style={{
                    width: '131px',
                    height: '131px',
                    border: '1px solid rgb(182, 135, 5)',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
                {isEditable && (
                  <>
                    <label
                      htmlFor="avatar-upload"
                      className="position-absolute"
                      style={{
                        top: '0px',
                        left: '0px',
                        background: '#ffffff',
                        padding: '3px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        boxShadow: '0px 0px 3px rgba(149, 16, 167, 0.2)',
                      }}
                    >
                      <FontAwesomeIcon icon={faCamera} />
                    </label>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                    />
                  </>
                )}
              </>
            )}
            <span
              className={`status-indicator ${member.isAlive ? 'alive' : 'deceased'}`}
            ></span>
          </div>
        </div>

        {/* Personal Info */}
        <div className="mt-3">
          <h4>{tenThanhVien[0] || 'Chưa cập nhật'}</h4>
          <hr />
          <p>
            <strong>Tên khai sinh:</strong> {tenThanhVien[1] || tenThanhVien[0]}
            <br />
            <strong>Tên ở nhà:</strong> {tenThanhVien[2] || 'Chưa cập nhật'}
            <br />
            <strong>Giới tính:</strong> {member.gender === 'male' ? 'Nam' : 'Nữ'}
            <br />
            <strong>Sinh nhật:</strong>{' '}
            {member.birthday ? formatDate(member.birthday) : 'Chưa cập nhật'}
            <br />
            <strong>Tình trạng hôn nhân: </strong>
            {member.maritalStatus === 'single'
              ? 'Độc thân'
              : member.maritalStatus === 'married'
              ? 'Đã kết hôn'
              : member.maritalStatus === 'divorced'
              ? 'Ly hôn'
              : 'Góa'}
            <br />
            {member.phoneNumber && (
              <>
                <strong>Số điện thoại:</strong> {member.phoneNumber}
                <br />
              </>
            )}
            {member.address && (
              <>
                <strong>Nơi ở:</strong> {member.address}
                <br />
              </>
            )}
            {!member.isAlive && member.deathDate && (
              <>
                <strong>🕯️ Ngày mất:</strong> {formatDate(member.deathDate)}
                <br />
              </>
            )}
          </p>
        </div>

        {/* Spouse Info */}
        {member.maritalStatus === 'married' && member.spouse?.[0] && (
          <div className="mt-3">
            <h5>{member.gender === 'male' ? 'Vợ' : 'Chồng'}</h5>
            <p>
              <strong>Tên:</strong> {member.spouse[0]?.name}
              {member.spouse[0]?.hometown && (
                <>
                  {' '}
                  - <strong>Quê quán:</strong> {member.spouse[0].hometown}
                </>
              )}
              {member.spouse[0]?.phoneNumber && (
                <>
                  {' '}
                  - <strong>Số điện thoại:</strong> {member.spouse[0].phoneNumber}
                </>
              )}
              {member.spouse[0]?.birthday && (
                <>
                  {' '}
                  - <strong>Sinh nhật:</strong> {formatDate(member.spouse[0].birthday)}
                </>
              )}
            </p>
          </div>
        )}

        {/* Custom Fields */}
        {member.customFields && member.customFields.length > 0 && (
          <div className="mt-3">
            <h5>📌 Thông tin bổ sung</h5>
            {member.customFields.map((field, index) => (
              <p key={index}>
                <strong>{field.label}:</strong>{' '}
                {field.type === 'date'
                  ? new Date(field.value as string).toLocaleDateString()
                  : String(field.value)}
              </p>
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between align-items-center">
        {isEditable ? (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete?.(member._id)}
              disabled={childCount > 0}
            >
              Xóa
            </Button>
            <Button variant="secondary" size="sm" onClick={onHide}>
              Đóng
            </Button>
            <Button variant="primary" size="sm" onClick={() => onEdit?.(member)}>
              Sửa
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={onHide} className="mx-auto">
            Đóng
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
