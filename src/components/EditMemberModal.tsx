'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faUsers, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Member, Spouse } from '@/types';
import { toInputDateFormat } from '@/lib/formatDate';
import SearchableSelect from './SearchableSelect';
import SelectChildrenModal from './SelectChildrenModal';

const EMPTY_SPOUSE: Spouse = {
  name: '',
  phoneNumber: '',
  birthday: '',
  hometown: '',
};

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
  const [showChildrenModal, setShowChildrenModal] = useState<boolean>(false);

  useEffect(() => {
    if (member) {
      setEditMember({
        ...member,
        birthday: toInputDateFormat(member.birthday),
        deathDate: toInputDateFormat(member.deathDate),
        spouse:
          member.spouse && member.spouse.length > 0
            ? member.spouse.map((s) => ({
              ...s,
              birthday: toInputDateFormat(s.birthday),
            }))
            : [EMPTY_SPOUSE],
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
      // Lọc spouse rỗng
      const validSpouses = editMember.spouse?.filter((s) => s.name?.trim()) || [];

      await onSubmit({
        ...editMember,
        parent: editMember.parent || null,
        children: editMember.children || [],
        spouse: validSpouses.length > 0 ? validSpouses : undefined,
      } as Member);
      onHide();
    } finally {
      setLoading(false);
    }
  };

  const handleSpouseChange = (index: number, field: keyof Spouse, value: string): void => {
    if (!editMember?.spouse) return;

    const updatedSpouse = editMember.spouse.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );

    setEditMember({ ...editMember, spouse: updatedSpouse });
  };

  const handleAddSpouse = (): void => {
    if (!editMember) return;
    const currentSpouses = editMember.spouse || [];
    setEditMember({
      ...editMember,
      spouse: [...currentSpouses, { ...EMPTY_SPOUSE }],
    });
  };

  const handleRemoveSpouse = (index: number): void => {
    if (!editMember?.spouse || editMember.spouse.length <= 1) return;
    const updatedSpouse = editMember.spouse.filter((_, i) => i !== index);
    setEditMember({ ...editMember, spouse: updatedSpouse });
  };

  // Options cho dropdown "Con của"
  const parentOptions = allMembers
    .filter((m) => m._id !== editMember?._id)
    .map((m) => ({
      value: m._id,
      label: m.name,
    }));

  // Tên các con đã chọn
  const selectedChildrenNames = editMember?.children
    ?.map((id) => allMembers.find((m) => m._id === id)?.name)
    .filter(Boolean)
    .join(', ');

  if (!editMember) return null;

  return (
    <>
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

            {/* Multiple Spouses */}
            {editMember.maritalStatus === 'married' && (
              <div className="spouse-section mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>
                    {editMember.gender === 'male' ? 'Thông tin vợ' : 'Thông tin chồng'}
                  </strong>
                  <Button variant="outline-primary" size="sm" onClick={handleAddSpouse}>
                    <FontAwesomeIcon icon={faPlus} /> Thêm{' '}
                    {editMember.gender === 'male' ? 'vợ' : 'chồng'}
                  </Button>
                </div>

                {editMember.spouse?.map((spouse, index) => (
                  <div key={index} className="spouse-item p-3 mb-2 border rounded">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-secondary">
                        {editMember.gender === 'male' ? `Vợ ${index + 1}` : `Chồng ${index + 1}`}
                      </span>
                      {editMember.spouse && editMember.spouse.length > 1 && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveSpouse(index)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      )}
                    </div>

                    <InputGroup className="mb-2">
                      <InputGroup.Text>Tên</InputGroup.Text>
                      <Form.Control
                        type="text"
                        value={spouse.name || ''}
                        onChange={(e) => handleSpouseChange(index, 'name', e.target.value)}
                      />
                    </InputGroup>

                    <InputGroup className="mb-2">
                      <InputGroup.Text>Quê quán</InputGroup.Text>
                      <Form.Control
                        type="text"
                        value={spouse.hometown || ''}
                        onChange={(e) => handleSpouseChange(index, 'hometown', e.target.value)}
                      />
                    </InputGroup>

                    <InputGroup className="mb-2">
                      <InputGroup.Text>Số điện thoại</InputGroup.Text>
                      <Form.Control
                        type="text"
                        value={spouse.phoneNumber || ''}
                        onChange={(e) => handleSpouseChange(index, 'phoneNumber', e.target.value)}
                      />
                    </InputGroup>

                    <InputGroup>
                      <InputGroup.Text>Sinh nhật</InputGroup.Text>
                      <Form.Control
                        type="date"
                        value={spouse.birthday || ''}
                        onChange={(e) => handleSpouseChange(index, 'birthday', e.target.value)}
                      />
                    </InputGroup>
                  </div>
                ))}
              </div>
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

            {/* Parent with Search */}
            <InputGroup className="mb-3">
              <InputGroup.Text>Con của</InputGroup.Text>
              <div className="flex-grow-1">
                <SearchableSelect
                  options={parentOptions}
                  value={(editMember.parent as string) || ''}
                  onChange={(value) =>
                    setEditMember({ ...editMember, parent: value || null })
                  }
                  placeholder="Tìm kiếm..."
                  emptyLabel="Không (Là gốc)"
                />
              </div>
            </InputGroup>
            {/* Spouse Index - nếu có parent và parent có nhiều vợ/chồng */}
            {editMember.parent && (() => {
              const parentMember = allMembers.find(m => m._id === editMember.parent);
              if (parentMember?.spouse && parentMember.spouse.length > 1) {
                return (
                  <InputGroup className="mb-3">
                    <InputGroup.Text>
                      Con của {parentMember.gender === 'male' ? 'vợ' : 'chồng'}
                    </InputGroup.Text>
                    <Form.Select
                      value={editMember.spouseIndex || 0}
                      onChange={(e) =>
                        setEditMember({ ...editMember, spouseIndex: parseInt(e.target.value) })
                      }
                    >
                      {parentMember.spouse.map((spouse, idx) => (
                        <option key={idx} value={idx}>
                          {parentMember.gender === 'male' ? `Vợ ${idx + 1}` : `Chồng ${idx + 1}`}
                          {spouse.name ? `: ${spouse.name}` : ''}
                        </option>
                      ))}
                    </Form.Select>
                  </InputGroup>
                );
              }
              return null;
            })()}

            {/* Children Selection */}

            {/* Children Selection */}
            <InputGroup className="mb-3">
              <InputGroup.Text>Chọn con</InputGroup.Text>
              <Form.Control
                type="text"
                value={selectedChildrenNames || 'Chưa chọn'}
                readOnly
                onClick={() => setShowChildrenModal(true)}
                style={{ cursor: 'pointer', backgroundColor: '#fff' }}
              />
              <Button variant="outline-secondary" onClick={() => setShowChildrenModal(true)}>
                <FontAwesomeIcon icon={faUsers} />
              </Button>
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

      {/* Modal chọn con */}
      <SelectChildrenModal
        show={showChildrenModal}
        onHide={() => setShowChildrenModal(false)}
        allMembers={allMembers}
        selectedIds={editMember.children || []}
        excludeId={editMember._id}
        onConfirm={(ids) => setEditMember({ ...editMember, children: ids })}
      />
    </>
  );
}