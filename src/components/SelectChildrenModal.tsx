'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faUsers, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Member } from '@/types';

interface SelectChildrenModalProps {
    show: boolean;
    onHide: () => void;
    allMembers: Member[];
    selectedIds: string[];
    excludeId?: string; // Loại trừ chính member đang edit
    onConfirm: (selectedIds: string[]) => void;
}

export default function SelectChildrenModal({
    show,
    onHide,
    allMembers,
    selectedIds,
    excludeId,
    onConfirm,
}: SelectChildrenModalProps): JSX.Element {
    const [selected, setSelected] = useState<string[]>(selectedIds);
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        setSelected(selectedIds);
    }, [selectedIds, show]);

    // Lọc members (loại trừ chính mình)
    const availableMembers = allMembers.filter((m) => m._id !== excludeId);

    // Tìm kiếm
    const filteredMembers = availableMembers.filter((m) =>
        m.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Đã chọn
    const selectedMembers = availableMembers.filter((m) => selected.includes(m._id));

    // Chưa chọn (để hiển thị trong checklist)
    const unselectedMembers = filteredMembers.filter((m) => !selected.includes(m._id));

    const handleToggle = (memberId: string) => {
        setSelected((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        );
    };

    const handleRemove = (memberId: string) => {
        setSelected((prev) => prev.filter((id) => id !== memberId));
    };

    const handleConfirm = () => {
        onConfirm(selected);
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} centered fullscreen>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FontAwesomeIcon icon={faUsers} /> Chọn con
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Danh sách đã chọn */}
                <div className="mb-3">
                    <Form.Label>
                        <strong>Đã chọn ({selected.length})</strong>
                    </Form.Label>
                    <div className="selected-children-list">
                        {selectedMembers.length > 0 ? (
                            selectedMembers.map((m) => (
                                <Badge
                                    key={m._id}
                                    bg="primary"
                                    className="me-1 mb-1 selected-badge"
                                >
                                    {m.name}
                                    <span
                                        className="remove-badge"
                                        onClick={() => handleRemove(m._id)}
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </span>
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted">Chưa chọn ai</span>
                        )}
                    </div>
                </div>

                <hr />

                {/* Tìm kiếm */}
                <InputGroup className="mb-3">
                    <InputGroup.Text>
                        <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Tìm kiếm thành viên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                            ✕
                        </Button>
                    )}
                </InputGroup>

                {/* Checklist */}
                <div className="children-checklist">
                    {unselectedMembers.length > 0 ? (
                        unselectedMembers.map((m) => (
                            <Form.Check
                                key={m._id}
                                type="checkbox"
                                id={`child-${m._id}`}
                                label={m.name}
                                checked={selected.includes(m._id)}
                                onChange={() => handleToggle(m._id)}
                                className="mb-2"
                            />
                        ))
                    ) : (
                        <span className="text-muted">
                            {searchTerm ? 'Không tìm thấy' : 'Tất cả đã được chọn'}
                        </span>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Hủy
                </Button>
                <Button variant="primary" onClick={handleConfirm}>
                    Xác nhận ({selected.length})
                </Button>
            </Modal.Footer>
        </Modal>
    );
}