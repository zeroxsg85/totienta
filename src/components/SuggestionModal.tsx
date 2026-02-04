'use client';

import { useState } from 'react';
import { Modal, Button, Form, InputGroup, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLightbulb,
    faUserPlus,
    faEdit,
    faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import API from '@/lib/api';
import { Member } from '@/types';
import SearchableSelect from './SearchableSelect';

interface SuggestionModalProps {
    show: boolean;
    onHide: () => void;
    viewCode: string;
    allMembers: Member[];
    preSelectedMember?: Member | null;
}

type SuggestionType = 'add' | 'edit' | 'report';

const FIELD_OPTIONS = [
    { value: 'name', label: 'Họ tên' },
    { value: 'birthday', label: 'Ngày sinh' },
    { value: 'phoneNumber', label: 'Số điện thoại' },
    { value: 'address', label: 'Địa chỉ' },
    { value: 'deathDate', label: 'Ngày mất' },
    { value: 'isAlive', label: 'Còn sống/Đã mất' },
];

export default function SuggestionModal({
    show,
    onHide,
    viewCode,
    allMembers,
    preSelectedMember,
}: SuggestionModalProps): JSX.Element {
    const [type, setType] = useState<SuggestionType>('add');
    const [loading, setLoading] = useState(false);

    // Thông tin người gửi
    const [submitter, setSubmitter] = useState({
        name: '',
        phone: '',
        email: '',
        relationship: '',
    });

    // Thêm người mới
    const [newMember, setNewMember] = useState({
        name: '',
        gender: 'male' as 'male' | 'female',
        birthday: '',
        phoneNumber: '',
        address: '',
        parentId: preSelectedMember?._id || '',
        isAlive: true,
        deathDate: '',
        note: '',
    });

    // Sửa thông tin
    const [editData, setEditData] = useState({
        memberId: preSelectedMember?._id || '',
        field: '',
        newValue: '',
        note: '',
    });

    // Báo sai
    const [reportData, setReportData] = useState({
        memberId: preSelectedMember?._id || '',
        description: '',
    });

    const resetForm = () => {
        setSubmitter({ name: '', phone: '', email: '', relationship: '' });
        setNewMember({
            name: '',
            gender: 'male',
            birthday: '',
            phoneNumber: '',
            address: '',
            parentId: '',
            isAlive: true,
            deathDate: '',
            note: '',
        });
        setEditData({ memberId: '', field: '', newValue: '', note: '' });
        setReportData({ memberId: '', description: '' });
    };

    const handleSubmit = async () => {
        if (!submitter.name.trim()) {
            toast.error('Vui lòng nhập tên của bạn');
            return;
        }

        // Validate theo loại
        if (type === 'add' && !newMember.name.trim()) {
            toast.error('Vui lòng nhập tên người muốn thêm');
            return;
        }

        if (type === 'edit' && (!editData.memberId || !editData.field || !editData.newValue)) {
            toast.error('Vui lòng chọn người cần sửa và điền đầy đủ thông tin');
            return;
        }

        if (type === 'report' && (!reportData.memberId || !reportData.description.trim())) {
            toast.error('Vui lòng chọn người và mô tả lỗi sai');
            return;
        }

        setLoading(true);

        try {
            const selectedMember = allMembers.find((m) => m._id === newMember.parentId);
            const editMember = allMembers.find((m) => m._id === editData.memberId);
            const reportMember = allMembers.find((m) => m._id === reportData.memberId);

            const payload: any = {
                type,
                viewCode,
                submitter,
            };

            if (type === 'add') {
                payload.newMemberData = {
                    ...newMember,
                    parentName: selectedMember?.name || '',
                };
            } else if (type === 'edit') {
                payload.editMemberData = {
                    ...editData,
                    memberName: editMember?.name || '',
                };
            } else if (type === 'report') {
                payload.reportData = {
                    ...reportData,
                    memberName: reportMember?.name || '',
                };
            }

            await API.post('/suggestions', payload);

            toast.success('Đã gửi đề xuất thành công! Chủ cây sẽ xem xét và phản hồi.');
            resetForm();
            onHide();
        } catch (error) {
            toast.error('Lỗi khi gửi đề xuất');
        } finally {
            setLoading(false);
        }
    };

    const memberOptions = allMembers.map((m) => ({
        value: m._id,
        label: m.name,
    }));

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    <FontAwesomeIcon icon={faLightbulb} className="text-warning me-2" />
                    Đề xuất thay đổi
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Chọn loại đề xuất */}
                <Nav variant="tabs" className="mb-3">
                    <Nav.Item>
                        <Nav.Link active={type === 'add'} onClick={() => setType('add')}>
                            <FontAwesomeIcon icon={faUserPlus} className="me-1" /> Thêm người
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link active={type === 'edit'} onClick={() => setType('edit')}>
                            <FontAwesomeIcon icon={faEdit} className="me-1" /> Sửa thông tin
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link active={type === 'report'} onClick={() => setType('report')}>
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" /> Báo sai
                        </Nav.Link>
                    </Nav.Item>
                </Nav>

                {/* Form Thêm người */}
                {type === 'add' && (
                    <div className="suggestion-form">
                        <h6>Thông tin người muốn thêm:</h6>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Tên *</InputGroup.Text>
                            <Form.Control
                                value={newMember.name}
                                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                placeholder="Tên thường gọi-Tên trong khai sinh-Tên ở nhà"
                            />
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Giới tính</InputGroup.Text>
                            <Form.Select
                                value={newMember.gender}
                                onChange={(e) =>
                                    setNewMember({ ...newMember, gender: e.target.value as 'male' | 'female' })
                                }
                            >
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </Form.Select>
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Ngày sinh</InputGroup.Text>
                            <Form.Control
                                type="date"
                                value={newMember.birthday}
                                onChange={(e) => setNewMember({ ...newMember, birthday: e.target.value })}
                            />
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Số điện thoại</InputGroup.Text>
                            <Form.Control
                                value={newMember.phoneNumber}
                                onChange={(e) => setNewMember({ ...newMember, phoneNumber: e.target.value })}
                            />
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Địa chỉ</InputGroup.Text>
                            <Form.Control
                                value={newMember.address}
                                onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                            />
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Là con của</InputGroup.Text>
                            <div className="flex-grow-1">
                                <SearchableSelect
                                    options={memberOptions}
                                    value={newMember.parentId}
                                    onChange={(value) => setNewMember({ ...newMember, parentId: value })}
                                    placeholder="Chọn cha/mẹ..."
                                    emptyLabel="Không rõ"
                                />
                            </div>
                        </InputGroup>

                        <Form.Check
                            type="checkbox"
                            label="Còn sống"
                            checked={newMember.isAlive}
                            onChange={(e) => setNewMember({ ...newMember, isAlive: e.target.checked })}
                            className="mb-2"
                        />

                        {!newMember.isAlive && (
                            <InputGroup className="mb-2">
                                <InputGroup.Text>Ngày mất</InputGroup.Text>
                                <Form.Control
                                    type="date"
                                    value={newMember.deathDate}
                                    onChange={(e) => setNewMember({ ...newMember, deathDate: e.target.value })}
                                />
                            </InputGroup>
                        )}

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Ghi chú</InputGroup.Text>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={newMember.note}
                                onChange={(e) => setNewMember({ ...newMember, note: e.target.value })}
                                placeholder="Thông tin bổ sung..."
                            />
                        </InputGroup>
                    </div>
                )}

                {/* Form Sửa thông tin */}
                {type === 'edit' && (
                    <div className="suggestion-form">
                        <h6>Thông tin cần sửa:</h6>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Chọn người *</InputGroup.Text>
                            <div className="flex-grow-1">
                                <SearchableSelect
                                    options={memberOptions}
                                    value={editData.memberId}
                                    onChange={(value) => setEditData({ ...editData, memberId: value })}
                                    placeholder="Tìm kiếm..."
                                    allowEmpty={false}
                                />
                            </div>
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Trường cần sửa *</InputGroup.Text>
                            <Form.Select
                                value={editData.field}
                                onChange={(e) => setEditData({ ...editData, field: e.target.value })}
                            >
                                <option value="">-- Chọn --</option>
                                {FIELD_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Giá trị mới *</InputGroup.Text>
                            {editData.field === 'birthday' || editData.field === 'deathDate' ? (
                                <Form.Control
                                    type="date"
                                    value={editData.newValue}
                                    onChange={(e) => setEditData({ ...editData, newValue: e.target.value })}
                                />
                            ) : editData.field === 'isAlive' ? (
                                <Form.Select
                                    value={editData.newValue}
                                    onChange={(e) => setEditData({ ...editData, newValue: e.target.value })}
                                >
                                    <option value="">-- Chọn --</option>
                                    <option value="true">Còn sống</option>
                                    <option value="false">Đã mất</option>
                                </Form.Select>
                            ) : (
                                <Form.Control
                                    value={editData.newValue}
                                    onChange={(e) => setEditData({ ...editData, newValue: e.target.value })}
                                    placeholder="Nhập giá trị mới"
                                />
                            )}
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Ghi chú</InputGroup.Text>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={editData.note}
                                onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                                placeholder="Lý do sửa..."
                            />
                        </InputGroup>
                    </div>
                )}

                {/* Form Báo sai */}
                {type === 'report' && (
                    <div className="suggestion-form">
                        <h6>Thông tin báo sai:</h6>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Chọn người *</InputGroup.Text>
                            <div className="flex-grow-1">
                                <SearchableSelect
                                    options={memberOptions}
                                    value={reportData.memberId}
                                    onChange={(value) => setReportData({ ...reportData, memberId: value })}
                                    placeholder="Tìm kiếm..."
                                    allowEmpty={false}
                                />
                            </div>
                        </InputGroup>

                        <InputGroup className="mb-2">
                            <InputGroup.Text>Mô tả lỗi sai *</InputGroup.Text>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={reportData.description}
                                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                                placeholder="Mô tả chi tiết thông tin sai..."
                            />
                        </InputGroup>
                    </div>
                )}

                <hr />

                {/* Thông tin người gửi */}
                <h6>Thông tin của bạn:</h6>

                <InputGroup className="mb-2">
                    <InputGroup.Text>Họ tên *</InputGroup.Text>
                    <Form.Control
                        value={submitter.name}
                        onChange={(e) => setSubmitter({ ...submitter, name: e.target.value })}
                        placeholder="Nhập tên của bạn"
                    />
                </InputGroup>

                <InputGroup className="mb-2">
                    <InputGroup.Text>Số điện thoại</InputGroup.Text>
                    <Form.Control
                        value={submitter.phone}
                        onChange={(e) => setSubmitter({ ...submitter, phone: e.target.value })}
                        placeholder="Để chủ cây liên hệ nếu cần"
                    />
                </InputGroup>

                <InputGroup className="mb-2">
                    <InputGroup.Text>Email</InputGroup.Text>
                    <Form.Control
                        type="email"
                        value={submitter.email}
                        onChange={(e) => setSubmitter({ ...submitter, email: e.target.value })}
                    />
                </InputGroup>

                <InputGroup className="mb-2">
                    <InputGroup.Text>Quan hệ</InputGroup.Text>
                    <Form.Control
                        value={submitter.relationship}
                        onChange={(e) => setSubmitter({ ...submitter, relationship: e.target.value })}
                        placeholder="VD: Con cháu, họ hàng, bạn bè..."
                    />
                </InputGroup>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={loading}>
                    Hủy
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Đang gửi...' : 'Gửi đề xuất'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}