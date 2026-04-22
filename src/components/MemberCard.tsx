'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faCamera, faSync, faCross, faBookOpen, faMapMarkerAlt, faPrayingHands, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { formatDualDate, formatDate } from '@/lib/formatDate';
import Link from 'next/link';
import API from '@/lib/api';
import { Member } from '@/types';
import ShrineModal from './ShrineModal';
import '@/styles/MemberCard.css';

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
  const [showShrine, setShowShrine] = useState<boolean>(false);

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

    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        const blobResult = Array.isArray(blob) ? blob[0] : blob;
        convertedFile = new File([blobResult], file.name.replace('.heic', '.jpg'), { type: 'image/jpeg' });
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
  const hasBurialData = member.burial?.location || member.burial?.coordinates?.lat;
  const hasMemorialData = member.memorial?.biography || member.memorial?.story || member.memorial?.epitaph || (member.memorial?.achievements?.length ?? 0) > 0;
  const hasLegacyData = member.legacy?.lastWords || (member.legacy?.messages?.length ?? 0) > 0;

  return (
    <>
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
                          top: '0px', left: '0px',
                          background: '#ffffff', padding: '3px',
                          borderRadius: '50%', cursor: 'pointer',
                          boxShadow: '0px 0px 3px rgba(149, 16, 167, 0.2)',
                        }}
                      >
                        <FontAwesomeIcon icon={faCamera} />
                      </label>
                      <input type="file" id="avatar-upload" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    </>
                  )}
                </>
              )}
              <span className={`status-indicator ${member.isAlive ? 'alive' : 'deceased'}`}></span>
            </div>
          </div>

          {/* Bàn thờ số button */}
          {!member.isAlive && member.shrine?.isEnabled && (
            <div className="text-center mt-2 d-flex justify-content-center gap-2 flex-wrap">
              <Button variant="outline-warning" size="sm" onClick={() => setShowShrine(true)}>
                <FontAwesomeIcon icon={faPrayingHands} /> Thắp nhang
              </Button>
              {member.viewCode && (
                <Link
                  href={`/${member.viewCode}/shrine/${member._id}`}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-sm btn-outline-secondary"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} /> Bàn thờ
                </Link>
              )}
            </div>
          )}

          {/* Thông tin cơ bản */}
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
              {member.birthday ? formatDualDate(member.birthday) : 'Chưa cập nhật'}
              <br />
              <strong>Tình trạng hôn nhân: </strong>
              {member.maritalStatus === 'single' ? 'Độc thân'
                : member.maritalStatus === 'married' ? 'Đã kết hôn'
                : member.maritalStatus === 'divorced' ? 'Ly hôn'
                : 'Góa'}
              <br />
              {member.occupation && (
                <><strong>Nghề nghiệp:</strong> {member.occupation}<br /></>
              )}
              {member.hometown && (
                <><strong>Quê quán:</strong> {member.hometown}<br /></>
              )}
              {member.religion && (
                <><strong>Tín ngưỡng:</strong> {member.religion}<br /></>
              )}
              {member.phoneNumber && (
                <><strong>Số điện thoại:</strong> {member.phoneNumber}<br /></>
              )}
              {member.address && (
                <><strong>Nơi ở:</strong> {member.address}<br /></>
              )}
              {!member.isAlive && member.deathDate && (
                <>
                  <strong>🕯️ Ngày mất:</strong> {formatDualDate(member.deathDate)}
                  <br />
                </>
              )}
              {!member.isAlive && member.anniversaryDate?.lunar && (
                <>
                  <strong>🗓️ Ngày giỗ:</strong>{' '}
                  {`${member.anniversaryDate.lunar.day ? `ngày ${member.anniversaryDate.lunar.day}` : ''} tháng ${member.anniversaryDate.lunar.month || '?'} âm lịch`}
                  {member.anniversaryDate.note && ` (${member.anniversaryDate.note})`}
                  <br />
                </>
              )}
            </p>
          </div>

          {/* Thông tin vợ/chồng */}
          {member.maritalStatus === 'married' && member.spouse?.[0] && (
            <div className="mt-3">
              <h5>{member.gender === 'male' ? 'Vợ' : 'Chồng'}</h5>
              <p>
                <strong>Tên:</strong> {member.spouse[0]?.name}
                {member.spouse[0]?.hometown && <> - <strong>Quê quán:</strong> {member.spouse[0].hometown}</>}
                {member.spouse[0]?.phoneNumber && <> - <strong>Số điện thoại:</strong> {member.spouse[0].phoneNumber}</>}
                {member.spouse[0]?.birthday && <> - <strong>Sinh nhật:</strong> {formatDate(member.spouse[0].birthday)}</>}
              </p>
            </div>
          )}

          {/* Tưởng niệm */}
          {hasMemorialData && (
            <div className="mt-3">
              <h5><FontAwesomeIcon icon={faBookOpen} /> Tưởng niệm</h5>
              <hr />
              {member.memorial?.biography && (
                <><strong>Tiểu sử:</strong><p className="text-muted">{member.memorial.biography}</p></>
              )}
              {member.memorial?.story && (
                <><strong>Câu chuyện cuộc đời:</strong><p className="text-muted">{member.memorial.story}</p></>
              )}
              {member.memorial?.epitaph && (
                <blockquote className="blockquote text-center border-start border-warning ps-3">
                  <p className="fst-italic">"{member.memorial.epitaph}"</p>
                </blockquote>
              )}
              {member.memorial?.achievements && member.memorial.achievements.length > 0 && (
                <>
                  <strong>Thành tích / Công đức:</strong>
                  <ul className="mt-1">
                    {member.memorial.achievements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </>
              )}
              {member.memorial?.photos && member.memorial.photos.length > 0 && (
                <>
                  <strong>Ảnh kỷ niệm:</strong>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {member.memorial.photos.map((url, i) => (
                      <img key={i} src={url} alt={`Ảnh ${i + 1}`}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                </>
              )}
              {member.memorial?.audioUrl && (
                <div className="mt-2">
                  <strong>🎙️ Giọng nói:</strong>
                  <audio controls src={member.memorial.audioUrl} className="w-100 mt-1" />
                </div>
              )}
            </div>
          )}

          {/* Phần mộ */}
          {hasBurialData && (
            <div className="mt-3">
              <h5><FontAwesomeIcon icon={faCross} /> Phần mộ</h5>
              <hr />
              {member.burial?.location && (
                <><strong>Vị trí:</strong> {member.burial.location}<br /></>
              )}
              {member.burial?.coordinates?.lat && member.burial?.coordinates?.lng && (
                <a
                  href={`https://maps.google.com/?q=${member.burial.coordinates.lat},${member.burial.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-success btn-sm mt-1"
                >
                  <FontAwesomeIcon icon={faMapMarkerAlt} /> Xem trên bản đồ
                </a>
              )}
              {member.burial?.lastVisited && (
                <><br /><strong>Thăm gần nhất:</strong> {formatDate(member.burial.lastVisited)}</>
              )}
              {member.burial?.photo && (
                <div className="mt-2">
                  <img src={member.burial.photo} alt="Ảnh mộ"
                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 4 }} />
                </div>
              )}
            </div>
          )}

          {/* Di chúc */}
          {hasLegacyData && (
            <div className="mt-3">
              <h5>📜 Di chúc & Lời nhắn</h5>
              <hr />
              {member.legacy?.lastWords && (
                <blockquote className="blockquote border-start border-secondary ps-3">
                  <p className="fst-italic">"{member.legacy.lastWords}"</p>
                </blockquote>
              )}
              {member.legacy?.messages && member.legacy.messages.length > 0 && (
                <>
                  <strong>Thư gửi đời sau:</strong>
                  {member.legacy.messages.map((msg, i) => (
                    <div key={i} className="border rounded p-2 mt-2 bg-light">
                      {msg.toWhom && <div><Badge bg="secondary">{msg.toWhom}</Badge></div>}
                      {msg.scheduledAt && <small className="text-muted">Gửi vào: {formatDate(msg.scheduledAt)}</small>}
                      {msg.content && <p className="mb-0 mt-1">{msg.content}</p>}
                    </div>
                  ))}
                </>
              )}
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
              <Button variant="danger" size="sm" onClick={() => onDelete?.(member._id)} disabled={childCount > 0}>
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

      {/* Bàn thờ số */}
      <ShrineModal
        show={showShrine}
        onHide={() => setShowShrine(false)}
        member={member}
        baseUrl={baseUrl}
      />
    </>
  );
}
