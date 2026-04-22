'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Member, MemberFormData, Spouse } from '@/types';
import MemberBasicFields, { BasicMemberData } from './MemberBasicFields';
import SearchableSelect from './SearchableSelect';
import SelectChildrenModal from './SelectChildrenModal';
import '@/styles/Modals.css';

interface AddMemberModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: MemberFormData) => Promise<void>;
  allMembers: Member[];
  parentId?: string | null;
  defaultChildId?: string | null;
}

const initialMemberState: MemberFormData & { spouseIndex?: number } = {
  name: '',
  birthday: {},
  gender: 'male',
  maritalStatus: 'single',
  isAlive: true,
  phoneNumber: '',
  address: '',
  occupation: '',
  hometown: '',
  religion: '',
  spouse: undefined,
  deathDate: {},
  anniversaryDate: {},
  parent: null,
  children: [],
  spouseIndex: 0,
};

export default function AddMemberModal({
  show,
  onHide,
  onSubmit,
  allMembers = [],
  parentId = null,
  defaultChildId = null,
}: AddMemberModalProps): JSX.Element {
  const [newMember, setNewMember] = useState<MemberFormData & { spouseIndex?: number }>(initialMemberState);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showChildrenModal, setShowChildrenModal] = useState<boolean>(false);
  const isAddParentMode = !!defaultChildId;

  useEffect(() => {
    if (!show) return;
    setNewMember({
      ...initialMemberState,
      parent: parentId,
      maritalStatus: isAddParentMode ? 'married' : 'single',
    });
    if (isAddParentMode) {
      setSelectedChildren([defaultChildId!]);
    } else {
      setSelectedChildren([]);
    }
  }, [show, parentId, defaultChildId]);

  const selectedParent = parentId
    ? allMembers.find((m) => m._id === parentId)
    : newMember.parent
      ? allMembers.find((m) => m._id === newMember.parent)
      : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const spouse = newMember.spouse as Spouse | undefined;
      await onSubmit({
        ...newMember,
        parent: parentId || newMember.parent,
        children: selectedChildren,
        spouse: newMember.maritalStatus === 'married' && spouse ? [spouse] : undefined,
        spouseIndex: newMember.spouseIndex || 0,
      } as any);
      setNewMember(initialMemberState);
      setSelectedChildren([]);
      onHide();
    } finally {
      setLoading(false);
    }
  };

  const handleSpouseChange = (field: keyof Spouse, value: string): void => {
    const currentSpouse = (newMember.spouse as Spouse) || {};
    setNewMember({ ...newMember, spouse: { ...currentSpouse, [field]: value } });
  };

  const handleBasicChange = (patch: Partial<BasicMemberData>) =>
    setNewMember((prev) => ({ ...prev, ...patch }));

  const parentOptions = allMembers.map((m) => ({ value: m._id, label: m.name }));

  const selectedChildrenNames = selectedChildren
    .map((id) => allMembers.find((m) => m._id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Modal show={show} onHide={onHide} centered fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>
            <strong><FontAwesomeIcon icon={faPlusCircle} /> Thêm Thành Viên Mới</strong>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            {/* ── Field chung (name, birthday, gender, phone, address, occupation,
                hometown, religion, idCard, maritalStatus, isAlive, deathDate…) ── */}
            <MemberBasicFields
              data={newMember as BasicMemberData}
              onChange={handleBasicChange}
            />

            {/* Thông tin vợ/chồng */}
            {newMember.maritalStatus === 'married' && (
              <>
                <InputGroup className="mb-3">
                  <InputGroup.Text>{newMember.gender === 'male' ? 'Tên vợ' : 'Tên chồng'}</InputGroup.Text>
                  <Form.Control type="text"
                    value={(newMember.spouse as Spouse)?.name || ''}
                    onChange={(e) => handleSpouseChange('name', e.target.value)}
                  />
                </InputGroup>
                <InputGroup className="mb-3">
                  <InputGroup.Text>Quê quán {newMember.gender === 'male' ? 'vợ' : 'chồng'}</InputGroup.Text>
                  <Form.Control type="text"
                    value={(newMember.spouse as Spouse)?.hometown || ''}
                    onChange={(e) => handleSpouseChange('hometown', e.target.value)}
                  />
                </InputGroup>
                <InputGroup className="mb-3">
                  <InputGroup.Text>SĐT {newMember.gender === 'male' ? 'vợ' : 'chồng'}</InputGroup.Text>
                  <Form.Control type="text"
                    value={(newMember.spouse as Spouse)?.phoneNumber || ''}
                    onChange={(e) => handleSpouseChange('phoneNumber', e.target.value)}
                  />
                </InputGroup>
                <InputGroup className="mb-3">
                  <InputGroup.Text>Sinh nhật {newMember.gender === 'male' ? 'vợ' : 'chồng'}</InputGroup.Text>
                  <Form.Control type="date"
                    value={(newMember.spouse as Spouse)?.birthday || ''}
                    onChange={(e) => handleSpouseChange('birthday', e.target.value)}
                  />
                </InputGroup>
              </>
            )}

            {/* Con của */}
            <InputGroup className="mb-3">
              <InputGroup.Text>{isAddParentMode ? 'Cha/mẹ của' : 'Con của'}</InputGroup.Text>
              {parentId ? (
                <Form.Control type="text" value={selectedParent?.name || ''} disabled className="bg-light" />
              ) : (
                <div className="flex-grow-1">
                  <SearchableSelect
                    options={parentOptions}
                    value={newMember.parent || ''}
                    onChange={(value) => setNewMember({ ...newMember, parent: value || null })}
                    placeholder="Tìm kiếm..."
                    emptyLabel="Không (Là gốc)"
                  />
                </div>
              )}
            </InputGroup>

            {/* Spouse Index */}
            {selectedParent && selectedParent.spouse && selectedParent.spouse.length > 1 && (
              <InputGroup className="mb-3">
                <InputGroup.Text>Con của {selectedParent.gender === 'male' ? 'vợ' : 'chồng'}</InputGroup.Text>
                <Form.Select
                  value={newMember.spouseIndex || 0}
                  onChange={(e) => setNewMember({ ...newMember, spouseIndex: parseInt(e.target.value) })}
                >
                  {selectedParent.spouse.map((spouse, idx) => (
                    <option key={idx} value={idx}>
                      {selectedParent.gender === 'male' ? `Vợ ${idx + 1}` : `Chồng ${idx + 1}`}
                      {spouse.name ? `: ${spouse.name}` : ''}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            )}

            {/* Chọn con */}
            <InputGroup className="mb-3">
              <InputGroup.Text>Chọn con</InputGroup.Text>
              <Form.Control
                type="text" value={selectedChildrenNames || 'Chưa chọn'} readOnly
                onClick={() => setShowChildrenModal(true)}
                style={{ cursor: 'pointer', backgroundColor: '#fff' }}
              />
              <Button variant="outline-secondary" onClick={() => setShowChildrenModal(true)}>
                <FontAwesomeIcon icon={faUsers} />
              </Button>
            </InputGroup>

            <Modal.Footer>
              <Button variant="secondary" onClick={onHide} disabled={loading}>Hủy</Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Đang thêm...' : 'Thêm'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Body>
      </Modal>

      <SelectChildrenModal
        show={showChildrenModal}
        onHide={() => setShowChildrenModal(false)}
        allMembers={allMembers}
        selectedIds={selectedChildren}
        onConfirm={(ids) => {
          if (defaultChildId && !ids.includes(defaultChildId)) {
            setSelectedChildren([defaultChildId, ...ids]);
          } else {
            setSelectedChildren(ids);
          }
        }}
      />
    </>
  );
}
