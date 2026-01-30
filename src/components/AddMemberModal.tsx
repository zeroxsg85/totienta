'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Modal, Button, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Member, MemberFormData, Spouse } from '@/types';

interface AddMemberModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: MemberFormData) => Promise<void>;
  allMembers: Member[];
  parentId?: string | null;
}

const initialMemberState: MemberFormData = {
  name: '',
  birthday: '',
  gender: 'male',
  maritalStatus: 'single',
  isAlive: true,
  phoneNumber: '',
  address: '',
  spouse: undefined,
  deathDate: '',
  parent: null,
  children: [],
};

export default function AddMemberModal({
  show,
  onHide,
  onSubmit,
  allMembers = [],
  parentId = null,
}: AddMemberModalProps): JSX.Element {
  const [newMember, setNewMember] = useState<MemberFormData>(initialMemberState);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const spouse = newMember.spouse as Spouse | undefined;
      await onSubmit({
        ...newMember,
        parent: parentId || newMember.parent,
        children: selectedChildren,
        spouse:
          newMember.maritalStatus === 'married' && spouse
            ? [spouse]
            : undefined,
      });

      // Reset form
      setNewMember(initialMemberState);
      setSelectedChildren([]);
      onHide();
    } finally {
      setLoading(false);
    }
  };

  const handleSpouseChange = (field: keyof Spouse, value: string): void => {
    const currentSpouse = (newMember.spouse as Spouse) || {};
    setNewMember({
      ...newMember,
      spouse: { ...currentSpouse, [field]: value },
    });
  };

  const handleChildrenChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setSelectedChildren(selected);
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>
          <strong>
            <FontAwesomeIcon icon={faPlusCircle} /> Thêm Thành Viên Mới
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
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              required
            />
          </InputGroup>

          <Row className="mb-3 d-flex flex-wrap gap-2">
            {/* Birthday */}
            <Col xs={12} sm={6} md={3} className="d-flex align-items-center">
              <InputGroup>
                <InputGroup.Text style={{ whiteSpace: 'nowrap' }}>Sinh nhật</InputGroup.Text>
                <Form.Control
                  type="date"
                  value={newMember.birthday || ''}
                  onChange={(e) => setNewMember({ ...newMember, birthday: e.target.value })}
                />
              </InputGroup>
            </Col>

            {/* Gender */}
            <Col xs={12} sm={6} md={3} className="d-flex align-items-center">
              <InputGroup>
                <InputGroup.Text style={{ whiteSpace: 'nowrap' }}>Giới tính</InputGroup.Text>
                <Form.Select
                  value={newMember.gender}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      gender: e.target.value as 'male' | 'female',
                    })
                  }
                  required
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </Form.Select>
              </InputGroup>
            </Col>

            {/* Phone */}
            <Col xs={12} sm={6} md={3} className="d-flex align-items-center">
              <InputGroup>
                <InputGroup.Text style={{ whiteSpace: 'nowrap' }}>Số điện thoại</InputGroup.Text>
                <Form.Control
                  type="text"
                  value={newMember.phoneNumber || ''}
                  onChange={(e) => setNewMember({ ...newMember, phoneNumber: e.target.value })}
                />
              </InputGroup>
            </Col>

            {/* Address */}
            <Col xs={12} sm={6} md={3} className="d-flex align-items-center">
              <InputGroup>
                <InputGroup.Text style={{ whiteSpace: 'nowrap' }}>Nơi ở</InputGroup.Text>
                <Form.Control
                  type="text"
                  value={newMember.address || ''}
                  onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                />
              </InputGroup>
            </Col>
          </Row>

          {/* Marital Status */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Hôn nhân</InputGroup.Text>
            <Form.Select
              value={newMember.maritalStatus}
              onChange={(e) =>
                setNewMember({
                  ...newMember,
                  maritalStatus: e.target.value as MemberFormData['maritalStatus'],
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
          {newMember.maritalStatus === 'married' && (
            <>
              <InputGroup className="mb-3">
                <InputGroup.Text>
                  {newMember.gender === 'male' ? 'Tên vợ' : 'Tên chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  value={(newMember.spouse as Spouse)?.name || ''}
                  onChange={(e) => handleSpouseChange('name', e.target.value)}
                />
              </InputGroup>

              <InputGroup className="mb-3">
                <InputGroup.Text>
                  Quê quán {newMember.gender === 'male' ? 'vợ' : 'chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  value={(newMember.spouse as Spouse)?.hometown || ''}
                  onChange={(e) => handleSpouseChange('hometown', e.target.value)}
                />
              </InputGroup>

              <InputGroup className="mb-3">
                <InputGroup.Text>
                  Số điện thoại {newMember.gender === 'male' ? 'vợ' : 'chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  value={(newMember.spouse as Spouse)?.phoneNumber || ''}
                  onChange={(e) => handleSpouseChange('phoneNumber', e.target.value)}
                />
              </InputGroup>

              <InputGroup className="mb-3">
                <InputGroup.Text>
                  Sinh nhật {newMember.gender === 'male' ? 'vợ' : 'chồng'}
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  value={(newMember.spouse as Spouse)?.birthday || ''}
                  onChange={(e) => handleSpouseChange('birthday', e.target.value)}
                />
              </InputGroup>
            </>
          )}

          {/* Parent Selection (only if no parentId provided) */}
          {!parentId && (
            <InputGroup className="mb-3">
              <InputGroup.Text>Con của</InputGroup.Text>
              <Form.Select
                value={newMember.parent || ''}
                onChange={(e) =>
                  setNewMember({ ...newMember, parent: e.target.value || null })
                }
              >
                <option value="">Không (Là gốc)</option>
                {allMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </Form.Select>
            </InputGroup>
          )}

          {/* Children Selection */}
          <InputGroup className="mb-3">
            <InputGroup.Text>Chọn con</InputGroup.Text>
            <Form.Select multiple value={selectedChildren} onChange={handleChildrenChange}>
              {allMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </Form.Select>
          </InputGroup>

          {/* Is Alive */}
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Còn sống"
              checked={newMember.isAlive}
              onChange={(e) => setNewMember({ ...newMember, isAlive: e.target.checked })}
            />
          </Form.Group>

          {/* Death Date */}
          {!newMember.isAlive && (
            <InputGroup className="mb-3">
              <InputGroup.Text>Ngày mất</InputGroup.Text>
              <Form.Control
                type="date"
                value={newMember.deathDate || ''}
                onChange={(e) => setNewMember({ ...newMember, deathDate: e.target.value })}
              />
            </InputGroup>
          )}

          <Modal.Footer>
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Đang thêm...' : 'Thêm'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
