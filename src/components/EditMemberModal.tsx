'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { Member, Spouse } from '@/types';
import { toInputDateFormat } from '@/lib/formatDate';

interface EditMemberModalProps {
  show: boolean;
  onHide: () => void;
  member: Member | null;
  onSubmit: (data: Member) => Promise<void>;
  allMembers: Member[];
}

interface EditMemberState extends Omit<Member, 'children'> {
  children: string[];
}

export default function EditMemberModal({
  show,
  onHide,
  member,
  onSubmit,
  allMembers = [],
}: EditMemberModalProps): JSX.Element | null {
  const [editMember, setEditMember] = useState<EditMemberState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (member) {
      setEditMember({
        ...member,
        birthday: toInputDateFormat(member.birthday),
        deathDate: toInputDateFormat(member.deathDate),
        spouse: member.spouse || [{}],
        children:
          member.children?.map((c) =>
            typeof c === 'object' ? (c as Member)._id : (c as string)
          ) || [],
      });
    }
  }, [member]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editMember) return;

    setLoading(true);
    try {
      await onSubmit({
        ...editMember,
        parent: editMember.parent || null,
        children: editMember.children || [],
      } as Member);
      onHide();
    } finally {
      setLoading(false);
    }
  };

  const handleSpouseChange = (field: keyof Spouse, value: string): void => {
    if (!editMember) return;

    const updatedSpouse = editMember.spouse?.length ? [...editMember.spouse] : [{}];
    updatedSpouse[0] = { ...updatedSpouse[0], [field]: value } as Spouse;
    setEditMember({ ...editMember, spouse: updatedSpouse });
  };

  const handleChildrenChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    if (!editMember) return;

    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setEditMember({ ...editMember, children: selected });
  };

  if (!editMember) return null;

  return (
    <Modal show={show} onHide={onHide} centered fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>
          <strong>
            <FontAwesomeIcon icon={faPencilAlt} /> Chỉnh Sửa Thành Viên
          </strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Name */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Tên</InputGroup.Text>
            <Form.Control
              type="text"
              value={editMember.name || ''}
              onChange={(e) => setEditMember({ ...editMember, name: e.target.value })}
              required
            />
          </InputGroup>

          {/* Birthday */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Sinh nhật</InputGroup.Text>
            <Form.Control
              type="date"
              value={editMember.birthday || ''}
              onChange={(e) => setEditMember({ ...editMember, birthday: e.target.value })}
            />
          </InputGroup>

          {/* Gender */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Giới tính</InputGroup.Text>
            <Form.Select
              value={editMember.gender || 'male'}
              onChange={(e) =>
                setEditMember({
                  ...editMember,
                  gender: e.target.value as 'male' | 'female',
                })
              }
              required
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </Form.Select>
          </InputGroup>

          {/* Marital Status */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Hôn nhân</InputGroup.Text>
            <Form.Select
              value={editMember.maritalStatus || 'single'}
              onChange={(e) =>
                setEditMember({
                  ...editMember,
                  maritalStatus: e.target.value as Member['maritalStatus'],
                })
              }
              required
            >
              <option value="single">Độc thân</option>
              <option value="married">Đã kết hôn</option>
              <option value="divorced">Ly hôn</option>
              <option value="widowed">Góa</option>
            </Form.Select>
          </InputGroup>

          {/* Spouse Info */}
          {editMember.maritalStatus === 'married' && (
            <>
              <InputGroup className="mb-3">
                <InputGroup.Text>
                  {editMember.gender === 'male' ? 'Tên vợ' : 'Tên chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  value={editMember.spouse?.[0]?.name || ''}
                  onChange={(e) => handleSpouseChange('name', e.target.value)}
                />
              </InputGroup>

              <InputGroup className="mb-3">
                <InputGroup.Text>
                  Quê quán {editMember.gender === 'male' ? 'vợ' : 'chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  value={editMember.spouse?.[0]?.hometown || ''}
                  onChange={(e) => handleSpouseChange('hometown', e.target.value)}
                />
              </InputGroup>

              <InputGroup className="mb-3">
                <InputGroup.Text>
                  Số điện thoại {editMember.gender === 'male' ? 'vợ' : 'chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  value={editMember.spouse?.[0]?.phoneNumber || ''}
                  onChange={(e) => handleSpouseChange('phoneNumber', e.target.value)}
                />
              </InputGroup>

              <InputGroup className="mb-3">
                <InputGroup.Text>
                  Sinh nhật {editMember.gender === 'male' ? 'vợ' : 'chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  value={toInputDateFormat(editMember.spouse?.[0]?.birthday)}
                  onChange={(e) => handleSpouseChange('birthday', e.target.value)}
                />
              </InputGroup>
            </>
          )}

          {/* Phone */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Số điện thoại</InputGroup.Text>
            <Form.Control
              type="text"
              value={editMember.phoneNumber || ''}
              onChange={(e) => setEditMember({ ...editMember, phoneNumber: e.target.value })}
            />
          </InputGroup>

          {/* Address */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Nơi ở</InputGroup.Text>
            <Form.Control
              type="text"
              value={editMember.address || ''}
              onChange={(e) => setEditMember({ ...editMember, address: e.target.value })}
            />
          </InputGroup>

          {/* Parent */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Con của</InputGroup.Text>
            <Form.Select
              value={(editMember.parent as string) || ''}
              onChange={(e) =>
                setEditMember({ ...editMember, parent: e.target.value || null })
              }
            >
              <option value="">Không</option>
              {allMembers
                .filter((m) => m._id !== editMember._id)
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
            </Form.Select>
          </InputGroup>

          {/* Children */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Chọn con</InputGroup.Text>
            <Form.Select
              multiple
              value={editMember.children || []}
              onChange={handleChildrenChange}
            >
              {allMembers
                .filter((m) => m._id !== editMember._id)
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
            </Form.Select>
          </InputGroup>

          {/* Is Alive */}
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Còn sống"
              checked={editMember.isAlive || false}
              onChange={(e) => setEditMember({ ...editMember, isAlive: e.target.checked })}
            />
          </Form.Group>

          {/* Death Date */}
          {!editMember.isAlive && (
            <InputGroup className="mb-3">
              <InputGroup.Text>Ngày mất</InputGroup.Text>
              <Form.Control
                type="date"
                value={editMember.deathDate || ''}
                onChange={(e) => setEditMember({ ...editMember, deathDate: e.target.value })}
              />
            </InputGroup>
          )}

          <Modal.Footer className="d-flex justify-content-between align-items-center">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" variant="success" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Cập Nhật'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
