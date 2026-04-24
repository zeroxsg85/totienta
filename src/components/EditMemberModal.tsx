'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Modal, Button, Form, InputGroup, Row, Col, Nav, Tab, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faUsers, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { Member, Spouse, Memorial, Burial, Shrine, Legacy, LegacyMessage, CustomField } from '@/types';
import { PRESET_OFFERINGS } from './ShrineModal';
import MemberBasicFields, { BasicMemberData } from './MemberBasicFields';
import API from '@/lib/api';
import SearchableSelect from './SearchableSelect';
import SelectChildrenModal from './SelectChildrenModal';
import '@/styles/Modals.css';

const EMPTY_SPOUSE: Spouse = { name: '', phoneNumber: '', birthday: '', hometown: '' };

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
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [resetting, setResetting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (member) {
      setActiveTab('basic');
      setEditMember({
        ...member,
        birthday: member.birthday || {},
        deathDate: member.deathDate || {},
        anniversaryDate: member.anniversaryDate || {},
        memorial: member.memorial || {},
        burial: member.burial || {},
        // Mặc định bật shrine nếu đã mất (trừ khi admin đã tắt thủ công trước đó)
        shrine: member.shrine
          ? { ...member.shrine, isEnabled: member.isAlive ? false : (member.shrine.isEnabled ?? true) }
          : { isEnabled: !member.isAlive, incenseCount: 0, offerings: [] },
        legacy: member.legacy || { messages: [] },
        spouse:
          member.spouse && member.spouse.length > 0
            ? member.spouse.map((s) => ({ ...s, birthday: s.birthday || '' }))
            : [{ ...EMPTY_SPOUSE }],
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

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const set = (patch: Partial<EditMemberState>) =>
    setEditMember((prev) => prev ? { ...prev, ...patch } : prev);

  const setMemorial = (patch: Partial<Memorial>) =>
    set({ memorial: { ...editMember?.memorial, ...patch } });

  const setBurial = (patch: Partial<Burial>) =>
    set({ burial: { ...editMember?.burial, ...patch } });

  const setShrine = (patch: Partial<Shrine>) =>
    set({ shrine: { ...editMember?.shrine, ...patch } });

  const setLegacy = (patch: Partial<Legacy>) =>
    set({ legacy: { ...editMember?.legacy, ...patch } });

  // ── Spouse helpers ────────────────────────────────────────────────────────────
  const handleSpouseChange = (index: number, field: keyof Spouse, value: string): void => {
    if (!editMember?.spouse) return;
    const updatedSpouse = editMember.spouse.map((s, i) => i === index ? { ...s, [field]: value } : s);
    set({ spouse: updatedSpouse });
  };

  const handleAddSpouse = (): void => {
    if (!editMember) return;
    set({ spouse: [...(editMember.spouse || []), { ...EMPTY_SPOUSE }] });
  };

  const handleRemoveSpouse = (index: number): void => {
    if (!editMember?.spouse || editMember.spouse.length <= 1) return;
    set({ spouse: editMember.spouse.filter((_, i) => i !== index) });
  };

  // ── Legacy message helpers ────────────────────────────────────────────────────
  const handleAddMessage = () => {
    const msgs = editMember?.legacy?.messages || [];
    setLegacy({ messages: [...msgs, { content: '', toWhom: '', scheduledAt: '' }] });
  };

  const handleRemoveMessage = (idx: number) => {
    const msgs = (editMember?.legacy?.messages || []).filter((_, i) => i !== idx);
    setLegacy({ messages: msgs });
  };

  const handleMessageChange = (idx: number, patch: Partial<LegacyMessage>) => {
    const msgs = (editMember?.legacy?.messages || []).map((m, i) => i === idx ? { ...m, ...patch } : m);
    setLegacy({ messages: msgs });
  };

  // ── Achievement helpers ───────────────────────────────────────────────────────
  const handleAddAchievement = () => {
    setMemorial({ achievements: [...(editMember?.memorial?.achievements || []), ''] });
  };

  const handleAchievementChange = (idx: number, val: string) => {
    const arr = (editMember?.memorial?.achievements || []).map((a, i) => i === idx ? val : a);
    setMemorial({ achievements: arr });
  };

  const handleRemoveAchievement = (idx: number) => {
    setMemorial({ achievements: (editMember?.memorial?.achievements || []).filter((_, i) => i !== idx) });
  };

  // ── Photo URL helpers ─────────────────────────────────────────────────────────
  const handleAddPhoto = () => setMemorial({ photos: [...(editMember?.memorial?.photos || []), ''] });
  const handlePhotoChange = (idx: number, val: string) =>
    setMemorial({ photos: (editMember?.memorial?.photos || []).map((p, i) => i === idx ? val : p) });
  const handleRemovePhoto = (idx: number) =>
    setMemorial({ photos: (editMember?.memorial?.photos || []).filter((_, i) => i !== idx) });

  // ── Album ảnh (customFields type=image) ──────────────────────────────────────
  const handleAlbumFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editMember?._id) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await API.post<{ customFields: CustomField[] }>(
        `/members/${editMember._id}/album/upload`, fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      set({ customFields: data.customFields });
      toast.success('Đã thêm ảnh vào album');
    } catch {
      toast.error('Không thể upload ảnh');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAlbumCaption = (globalIdx: number, label: string) => {
    const fields = (editMember?.customFields || []).map((f, i) => i === globalIdx ? { ...f, label } : f);
    set({ customFields: fields });
  };

  const handleRemoveAlbum = async (globalIdx: number) => {
    if (!editMember?._id) return;
    if (!confirm('Xóa ảnh này?')) return;
    try {
      const { data } = await API.delete<{ customFields: CustomField[] }>(
        `/members/${editMember._id}/album/${globalIdx}`
      );
      set({ customFields: data.customFields });
      toast.success('Đã xóa ảnh');
    } catch {
      toast.error('Không thể xóa ảnh');
    }
  };

  // ── Parent/children options ───────────────────────────────────────────────────
  const parentOptions = allMembers
    .filter((m) => m._id !== editMember?._id)
    .map((m) => ({ value: m._id, label: m.name }));

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
            <strong><FontAwesomeIcon icon={faPencilAlt} /> Chỉnh Sửa Thành Viên</strong>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')}>
              <Nav variant="tabs" className="mb-3" style={{ flexWrap: 'wrap' }}>
                {[
                  { key: 'basic',    icon: '👤', label: 'Cơ bản' },
                  { key: 'album',    icon: '🖼️', label: 'Album ảnh' },
                  { key: 'memorial', icon: '🌸', label: 'Tưởng niệm' },
                  { key: 'burial',   icon: '📍', label: 'Phần mộ',    disabled: editMember?.isAlive === true },
                  { key: 'shrine',   icon: '🕯️', label: 'Bàn thờ số', disabled: editMember?.isAlive === true },
                  { key: 'legacy',   icon: '📜', label: 'Di chúc' },
                ].map(({ key, icon, label, disabled }) => (
                  <Nav.Item key={key}>
                    <Nav.Link
                      eventKey={key}
                      disabled={disabled}
                      className={activeTab === key ? 'fw-bold' : ''}
                      title={disabled ? 'Chỉ dành cho thành viên đã mất' : undefined}
                    >
                      {icon} {label}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>

              <Tab.Content>
                {/* ══════════════════════ TAB CƠ BẢN ══════════════════════ */}
                <Tab.Pane eventKey="basic">
                  {/* B6: Cảnh báo trùng tên trong cùng cây (trừ chính member đang sửa) */}
                  {editMember.name && (() => {
                    const nameA = editMember.name.toLowerCase().trim();
                    const dups = allMembers.filter((m) => {
                      if (m._id === editMember._id) return false;
                      const nameB = m.name.toLowerCase().trim();
                      return nameA.length >= 2 && (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA));
                    });
                    return dups.length > 0 ? (
                      <div className="alert alert-warning py-2 mb-3">
                        ⚠️ <strong>Tên tương tự:</strong>{' '}
                        {dups.map((m) => m.name).join(', ')} đã có trong cây.
                      </div>
                    ) : null;
                  })()}

                  {/* ── Các trường cơ bản dùng chung ── */}
                  <MemberBasicFields
                    data={editMember as BasicMemberData}
                    onChange={(patch) => {
                      if ('isAlive' in patch) {
                        const alive = patch.isAlive!;
                        set({
                          ...patch,
                          shrine: {
                            ...editMember?.shrine,
                            isEnabled: alive ? false : (editMember?.shrine?.isEnabled ?? true),
                          },
                        });
                      } else {
                        set(patch);
                      }
                    }}
                  />

                  {/* Danh sách vợ/chồng */}
                  {editMember.maritalStatus === 'married' && (
                    <div className="spouse-section mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>{editMember.gender === 'male' ? 'Thông tin vợ' : 'Thông tin chồng'}</strong>
                        <Button variant="outline-primary" size="sm" onClick={handleAddSpouse}>
                          <FontAwesomeIcon icon={faPlus} /> Thêm {editMember.gender === 'male' ? 'vợ' : 'chồng'}
                        </Button>
                      </div>
                      {editMember.spouse?.map((spouse, index) => (
                        <div key={index} className="spouse-item p-3 mb-2 border rounded">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="badge bg-secondary">
                              {editMember.gender === 'male' ? `Vợ ${index + 1}` : `Chồng ${index + 1}`}
                            </span>
                            {editMember.spouse && editMember.spouse.length > 1 && (
                              <Button variant="outline-danger" size="sm" onClick={() => handleRemoveSpouse(index)}>
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            )}
                          </div>
                          <InputGroup className="mb-2"><InputGroup.Text>Tên</InputGroup.Text>
                            <Form.Control type="text" value={spouse.name || ''} onChange={(e) => handleSpouseChange(index, 'name', e.target.value)} /></InputGroup>
                          <InputGroup className="mb-2"><InputGroup.Text>Quê quán</InputGroup.Text>
                            <Form.Control type="text" value={spouse.hometown || ''} onChange={(e) => handleSpouseChange(index, 'hometown', e.target.value)} /></InputGroup>
                          <InputGroup className="mb-2"><InputGroup.Text>SĐT</InputGroup.Text>
                            <Form.Control type="text" value={spouse.phoneNumber || ''} onChange={(e) => handleSpouseChange(index, 'phoneNumber', e.target.value)} /></InputGroup>
                          <InputGroup><InputGroup.Text>Sinh nhật</InputGroup.Text>
                            <Form.Control type="date" value={spouse.birthday || ''} onChange={(e) => handleSpouseChange(index, 'birthday', e.target.value)} /></InputGroup>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Con của */}
                  <InputGroup className="mb-3">
                    <InputGroup.Text>Con của</InputGroup.Text>
                    <div className="flex-grow-1">
                      <SearchableSelect
                        options={parentOptions}
                        value={(editMember.parent as string) || ''}
                        onChange={(value) => set({ parent: value || null })}
                        placeholder="Tìm kiếm..."
                        emptyLabel="Không (Là gốc)"
                      />
                    </div>
                  </InputGroup>

                  {/* Spouse Index */}
                  {editMember.parent && (() => {
                    const parentMember = allMembers.find((m) => m._id === editMember.parent);
                    if (parentMember?.spouse && parentMember.spouse.length > 1) {
                      return (
                        <InputGroup className="mb-3">
                          <InputGroup.Text>Con của {parentMember.gender === 'male' ? 'vợ' : 'chồng'}</InputGroup.Text>
                          <Form.Select value={editMember.spouseIndex || 0}
                            onChange={(e) => set({ spouseIndex: parseInt(e.target.value) })}>
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

                  {/* Chọn con */}
                  <InputGroup className="mb-3">
                    <InputGroup.Text>Chọn con</InputGroup.Text>
                    <Form.Control type="text" value={selectedChildrenNames || 'Chưa chọn'} readOnly
                      onClick={() => setShowChildrenModal(true)} style={{ cursor: 'pointer', backgroundColor: '#fff' }} />
                    <Button variant="outline-secondary" onClick={() => setShowChildrenModal(true)}>
                      <FontAwesomeIcon icon={faUsers} />
                    </Button>
                  </InputGroup>

                </Tab.Pane>

                {/* ══════════════════════ TAB TƯỞNG NIỆM ══════════════════════ */}
                <Tab.Pane eventKey="memorial">
                  <Form.Group className="mb-3">
                    <Form.Label><strong>Tiểu sử</strong></Form.Label>
                    <Form.Control as="textarea" rows={4} placeholder="Viết tiểu sử ngắn..."
                      value={editMember.memorial?.biography || ''}
                      onChange={(e) => setMemorial({ biography: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Câu chuyện cuộc đời</strong></Form.Label>
                    <Form.Control as="textarea" rows={5} placeholder="Kể về cuộc đời..."
                      value={editMember.memorial?.story || ''}
                      onChange={(e) => setMemorial({ story: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Lời ai điếu / Câu để đời</strong></Form.Label>
                    <Form.Control as="textarea" rows={2} placeholder="Câu để đời, lời ai điếu..."
                      value={editMember.memorial?.epitaph || ''}
                      onChange={(e) => setMemorial({ epitaph: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Thành tích / Công đức</strong></Form.Label>
                    {(editMember.memorial?.achievements || []).map((a, idx) => (
                      <InputGroup key={idx} className="mb-2">
                        <Form.Control type="text" value={a}
                          onChange={(e) => handleAchievementChange(idx, e.target.value)} />
                        <Button variant="outline-danger" onClick={() => handleRemoveAchievement(idx)}>
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </InputGroup>
                    ))}
                    <Button variant="outline-primary" size="sm" onClick={handleAddAchievement}>
                      <FontAwesomeIcon icon={faPlus} /> Thêm
                    </Button>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Ảnh kỷ niệm (URL)</strong></Form.Label>
                    {(editMember.memorial?.photos || []).map((url, idx) => (
                      <InputGroup key={idx} className="mb-2">
                        <Form.Control type="url" placeholder="https://..." value={url}
                          onChange={(e) => handlePhotoChange(idx, e.target.value)} />
                        <Button variant="outline-danger" onClick={() => handleRemovePhoto(idx)}>
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </InputGroup>
                    ))}
                    <Button variant="outline-primary" size="sm" onClick={handleAddPhoto}>
                      <FontAwesomeIcon icon={faPlus} /> Thêm ảnh
                    </Button>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Video (URL)</strong></Form.Label>
                    {(editMember.memorial?.videos || []).map((url, idx) => (
                      <InputGroup key={idx} className="mb-2">
                        <Form.Control type="url" placeholder="https://..." value={url}
                          onChange={(e) => setMemorial({ videos: (editMember.memorial?.videos || []).map((v, i) => i === idx ? e.target.value : v) })} />
                        <Button variant="outline-danger" onClick={() => setMemorial({ videos: (editMember.memorial?.videos || []).filter((_, i) => i !== idx) })}>
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </InputGroup>
                    ))}
                    <Button variant="outline-primary" size="sm"
                      onClick={() => setMemorial({ videos: [...(editMember.memorial?.videos || []), ''] })}>
                      <FontAwesomeIcon icon={faPlus} /> Thêm video
                    </Button>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>URL ghi âm giọng nói</strong></Form.Label>
                    <Form.Control type="url" placeholder="https://..."
                      value={editMember.memorial?.audioUrl || ''}
                      onChange={(e) => setMemorial({ audioUrl: e.target.value })} />
                  </Form.Group>
                </Tab.Pane>

                {/* ══════════════════════ TAB PHẦN MỘ ══════════════════════ */}
                <Tab.Pane eventKey="burial">
                  <Form.Group className="mb-3">
                    <Form.Label><strong>Mô tả vị trí mộ</strong></Form.Label>
                    <Form.Control as="textarea" rows={2} placeholder="VD: Nghĩa trang X, hàng Y, số Z..."
                      value={editMember.burial?.location || ''}
                      onChange={(e) => setBurial({ location: e.target.value })} />
                  </Form.Group>

                  <Row className="mb-3">
                    <Col xs={6}>
                      <InputGroup>
                        <InputGroup.Text>Vĩ độ (lat)</InputGroup.Text>
                        <Form.Control type="number" step="any" placeholder="10.12345"
                          value={editMember.burial?.coordinates?.lat || ''}
                          onChange={(e) => setBurial({ coordinates: { ...editMember.burial?.coordinates, lat: Number(e.target.value) } })} />
                      </InputGroup>
                    </Col>
                    <Col xs={6}>
                      <InputGroup>
                        <InputGroup.Text>Kinh độ (lng)</InputGroup.Text>
                        <Form.Control type="number" step="any" placeholder="106.12345"
                          value={editMember.burial?.coordinates?.lng || ''}
                          onChange={(e) => setBurial({ coordinates: { ...editMember.burial?.coordinates, lng: Number(e.target.value) } })} />
                      </InputGroup>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Ảnh mộ (URL)</strong></Form.Label>
                    <Form.Control type="url" placeholder="https://..."
                      value={editMember.burial?.photo || ''}
                      onChange={(e) => setBurial({ photo: e.target.value })} />
                  </Form.Group>

                  <InputGroup className="mb-3">
                    <InputGroup.Text>Thăm gần nhất</InputGroup.Text>
                    <Form.Control type="date"
                      value={editMember.burial?.lastVisited ? editMember.burial.lastVisited.split('T')[0] : ''}
                      onChange={(e) => setBurial({ lastVisited: e.target.value })} />
                  </InputGroup>
                </Tab.Pane>

                {/* ══════════════════════ TAB BÀN THỜ SỐ ══════════════════════ */}
                <Tab.Pane eventKey="shrine">
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      label={editMember?.isAlive ? 'Bàn thờ số (chỉ dành cho người đã mất)' : 'Bật bàn thờ số'}
                      checked={editMember?.shrine?.isEnabled || false}
                      disabled={editMember?.isAlive === true}
                      onChange={(e) => setShrine({ isEnabled: e.target.checked })}
                    />
                    {editMember?.isAlive && (
                      <small className="text-muted">Chỉ có thể bật bàn thờ số cho thành viên đã mất.</small>
                    )}
                  </Form.Group>

                  {editMember.shrine?.isEnabled && (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label><strong>Giao diện bàn thờ</strong></Form.Label>
                        <Form.Select value={editMember.shrine?.backgroundTheme || ''}
                          onChange={(e) => setShrine({ backgroundTheme: e.target.value })}>
                          <option value="">-- Mặc định --</option>
                          <option value="traditional">Truyền thống</option>
                          <option value="modern">Hiện đại</option>
                          <option value="nature">Thiên nhiên</option>
                          <option value="lotus">Sen</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label><strong>Lễ vật cho phép dâng</strong></Form.Label>
                        <div className="d-flex flex-wrap gap-2 mt-1">
                          {PRESET_OFFERINGS.map(({ emoji, label }) => {
                            const checked = (editMember.shrine?.offerings || []).includes(label);
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => {
                                  const current = editMember.shrine?.offerings || [];
                                  const next = checked
                                    ? current.filter((o) => o !== label)
                                    : [...current, label];
                                  setShrine({ offerings: next });
                                }}
                                style={{
                                  background: checked ? '#6c757d' : 'transparent',
                                  border: '2px solid #6c757d',
                                  borderRadius: 10,
                                  padding: '5px 12px',
                                  cursor: 'pointer',
                                  color: checked ? '#fff' : '#6c757d',
                                  fontSize: '0.9rem',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {emoji} {label}
                              </button>
                            );
                          })}
                        </div>
                        <small className="text-muted d-block mt-1">Bấm để chọn / bỏ chọn. Khách vào shrine sẽ thấy và dâng được các lễ vật này.</small>
                      </Form.Group>

                      <div className="text-muted small">
                        Số lần thắp nhang: <strong>{editMember.shrine?.incenseCount || 0}</strong>
                        {editMember.shrine?.lastIncense && (
                          <> – Lần cuối: <strong>{new Date(editMember.shrine.lastIncense).toLocaleDateString('vi-VN')}</strong></>
                        )}
                      </div>

                      {/* Reset controls */}
                      <div className="mt-3 d-flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={resetting}
                          onClick={async () => {
                            if (!confirm('Reset toàn bộ nhang và lễ vật về 0?')) return;
                            setResetting(true);
                            try {
                              await API.delete(`/members/${editMember?._id}/shrine/reset`);
                              setShrine({ incenseCount: 0, offeringStats: [], lastIncense: undefined });
                              toast.success('Đã reset bàn thờ');
                            } catch {
                              toast.error('Không thể reset');
                            } finally {
                              setResetting(false);
                            }
                          }}
                        >
                          🔄 Reset nhang & lễ vật
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-warning"
                          disabled={resetting}
                          onClick={async () => {
                            if (!confirm('Reset chỉ số nhang về 0?')) return;
                            setResetting(true);
                            try {
                              await API.delete(`/members/${editMember?._id}/shrine/reset?type=incense`);
                              setShrine({ incenseCount: 0, lastIncense: undefined });
                              toast.success('Đã reset nhang');
                            } catch {
                              toast.error('Không thể reset');
                            } finally {
                              setResetting(false);
                            }
                          }}
                        >
                          🔄 Reset nhang
                        </Button>
                      </div>
                    </>
                  )}
                </Tab.Pane>

                {/* ══════════════════════ TAB DI CHÚC ══════════════════════ */}
                <Tab.Pane eventKey="legacy">
                  <Form.Group className="mb-3">
                    <Form.Label><strong>Lời trăng trối / Câu nói cuối</strong></Form.Label>
                    <Form.Control as="textarea" rows={3}
                      value={editMember.legacy?.lastWords || ''}
                      onChange={(e) => setLegacy({ lastWords: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>URL nhân bản giọng nói (AI)</strong></Form.Label>
                    <Form.Control type="url" placeholder="https://..."
                      value={editMember.legacy?.voiceCloneUrl || ''}
                      onChange={(e) => setLegacy({ voiceCloneUrl: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Thư gửi đời sau</strong></Form.Label>
                    {(editMember.legacy?.messages || []).map((msg, idx) => (
                      <div key={idx} className="border rounded p-3 mb-3">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="fw-bold">Thư #{idx + 1}</span>
                          <Button variant="outline-danger" size="sm" onClick={() => handleRemoveMessage(idx)}>
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </div>
                        <InputGroup className="mb-2">
                          <InputGroup.Text>Gửi đến</InputGroup.Text>
                          <Form.Control type="text" placeholder="VD: Con trai cả, cháu nội..."
                            value={msg.toWhom || ''}
                            onChange={(e) => handleMessageChange(idx, { toWhom: e.target.value })} />
                        </InputGroup>
                        <InputGroup className="mb-2">
                          <InputGroup.Text>Ngày gửi</InputGroup.Text>
                          <Form.Control type="date"
                            value={msg.scheduledAt ? msg.scheduledAt.split('T')[0] : ''}
                            onChange={(e) => handleMessageChange(idx, { scheduledAt: e.target.value })} />
                        </InputGroup>
                        <Form.Control as="textarea" rows={3} placeholder="Nội dung thư..."
                          value={msg.content || ''}
                          onChange={(e) => handleMessageChange(idx, { content: e.target.value })} />
                      </div>
                    ))}
                    <Button variant="outline-primary" size="sm" onClick={handleAddMessage}>
                      <FontAwesomeIcon icon={faPlus} /> Thêm thư
                    </Button>
                  </Form.Group>
                </Tab.Pane>
                {/* ══════════════════════ TAB ALBUM ẢNH ══════════════════════ */}
                <Tab.Pane eventKey="album">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAlbumFileChange}
                  />

                  {(() => {
                    const albumEntries = (editMember.customFields || [])
                      .map((f, idx) => ({ ...f, _idx: idx }))
                      .filter(f => f.type === 'image');

                    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

                    return (
                      <>
                        {albumEntries.length === 0 && !uploadingPhoto && (
                          <p className="text-muted text-center py-4">Chưa có ảnh nào trong album.</p>
                        )}

                        <Row className="g-3 mb-3">
                          {albumEntries.map((photo) => (
                            <Col xs={6} md={4} key={photo._idx}>
                              <div className="border rounded overflow-hidden position-relative" style={{ aspectRatio: '1' }}>
                                <img
                                  src={`${API_BASE}/${photo.value}`}
                                  alt={photo.label || ''}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                                />
                                {/* Overlay xóa */}
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="position-absolute top-0 end-0 m-1 py-0 px-1"
                                  style={{ fontSize: '0.7rem', opacity: 0.85 }}
                                  onClick={() => handleRemoveAlbum(photo._idx)}
                                >
                                  ✕
                                </Button>
                              </div>
                              {/* Chú thích — lưu khi submit form */}
                              <Form.Control
                                size="sm"
                                type="text"
                                className="mt-1"
                                placeholder="Chú thích..."
                                value={photo.label}
                                onChange={(e) => handleAlbumCaption(photo._idx, e.target.value)}
                              />
                            </Col>
                          ))}

                          {/* Ô upload mới */}
                          <Col xs={6} md={4}>
                            <button
                              type="button"
                              disabled={uploadingPhoto}
                              onClick={() => fileInputRef.current?.click()}
                              className="w-100 border rounded d-flex flex-column align-items-center justify-content-center text-muted"
                              style={{
                                aspectRatio: '1', background: '#f8f9fa',
                                border: '2px dashed #dee2e6', cursor: 'pointer',
                                fontSize: '0.85rem', gap: 6,
                              }}
                            >
                              {uploadingPhoto
                                ? <Spinner animation="border" size="sm" />
                                : <><span style={{ fontSize: '1.8rem' }}>📷</span>Thêm ảnh</>
                              }
                            </button>
                          </Col>
                        </Row>

                        <p className="text-muted small mb-0">
                          Chú thích được lưu khi bấm <strong>Cập Nhật</strong>. Xóa ảnh có hiệu lực ngay.
                        </p>
                      </>
                    );
                  })()}
                </Tab.Pane>

              </Tab.Content>
            </Tab.Container>

            <Modal.Footer className="d-flex justify-content-between align-items-center">
              <Button variant="secondary" onClick={onHide} disabled={loading}>Hủy</Button>
              <Button type="submit" variant="success" disabled={loading}>
                {loading ? 'Đang cập nhật...' : 'Cập Nhật'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Body>
      </Modal>

      <SelectChildrenModal
        show={showChildrenModal}
        onHide={() => setShowChildrenModal(false)}
        allMembers={allMembers}
        selectedIds={editMember.children || []}
        excludeId={editMember._id}
        onConfirm={(ids) => set({ children: ids })}
      />
    </>
  );
}
