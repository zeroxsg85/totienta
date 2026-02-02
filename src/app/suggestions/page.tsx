'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, Nav, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLightbulb,
    faCheck,
    faTimes,
    faTrash,
    faUserPlus,
    faEdit,
    faExclamationTriangle,
    faUndo,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/lib/api';
import Loading from '@/components/Loading';
import { Suggestion } from '@/types/suggestion';

export default function SuggestionsPage(): JSX.Element | null {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    const fetchSuggestions = async () => {
        try {
            const { data } = await API.get<Suggestion[]>(`/suggestions?status=${filter}`);
            setSuggestions(data);
        } catch (error) {
            toast.error('Lỗi khi tải danh sách đề xuất');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            setLoading(true);
            fetchSuggestions();
        }
    }, [isAuthenticated, filter]);

    const handleApprove = async (id: string) => {
        if (!confirm('Duyệt đề xuất này? Thay đổi sẽ được áp dụng tự động.')) return;

        try {
            await API.put(`/suggestions/${id}/approve`);
            toast.success('Đã duyệt đề xuất');
            fetchSuggestions();
        } catch (error) {
            toast.error('Lỗi khi duyệt đề xuất');
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Từ chối đề xuất này?')) return;

        try {
            await API.put(`/suggestions/${id}/reject`);
            toast.success('Đã từ chối đề xuất');
            fetchSuggestions();
        } catch (error) {
            toast.error('Lỗi khi từ chối đề xuất');
        }
    };

    const handleRevert = async (id: string) => {
        if (!confirm('Chuyển đề xuất này về trạng thái chờ duyệt?')) return;

        try {
            await API.put(`/suggestions/${id}/revert`);
            toast.success('Đã chuyển về chờ duyệt');
            fetchSuggestions();
        } catch (error) {
            toast.error('Lỗi khi cập nhật');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa đề xuất này?')) return;

        try {
            await API.delete(`/suggestions/${id}`);
            toast.success('Đã xóa đề xuất');
            fetchSuggestions();
        } catch (error) {
            toast.error('Lỗi khi xóa đề xuất');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'add':
                return <FontAwesomeIcon icon={faUserPlus} className="text-success" />;
            case 'edit':
                return <FontAwesomeIcon icon={faEdit} className="text-primary" />;
            case 'report':
                return <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning" />;
            default:
                return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'add':
                return 'Thêm người';
            case 'edit':
                return 'Sửa thông tin';
            case 'report':
                return 'Báo sai';
            default:
                return type;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge bg="warning">Chờ duyệt</Badge>;
            case 'approved':
                return <Badge bg="success">Đã duyệt</Badge>;
            case 'rejected':
                return <Badge bg="danger">Đã từ chối</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const getSuggestionDetail = (s: Suggestion) => {
        if (s.type === 'add' && s.newMemberData) {
            return (
                <>
                    <strong>Thêm:</strong> {s.newMemberData.name}
                    {s.newMemberData.parentName && (
                        <span className="text-muted"> (con của {s.newMemberData.parentName})</span>
                    )}
                    {s.newMemberData.note && <div className="text-muted small">Ghi chú: {s.newMemberData.note}</div>}
                </>
            );
        }

        if (s.type === 'edit' && s.editMemberData) {
            return (
                <>
                    <strong>Sửa:</strong> {s.editMemberData.memberName} - {s.editMemberData.field}
                    <div className="text-muted small">
                        Giá trị mới: <strong>{s.editMemberData.newValue}</strong>
                    </div>
                    {s.editMemberData.note && <div className="text-muted small">Ghi chú: {s.editMemberData.note}</div>}
                </>
            );
        }

        if (s.type === 'report' && s.reportData) {
            return (
                <>
                    <strong>Báo sai:</strong> {s.reportData.memberName}
                    <div className="text-muted small">{s.reportData.description}</div>
                </>
            );
        }

        return null;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('vi-VN');
    };

    if (isLoading || loading) {
        return <Loading text="Đang tải đề xuất..." />;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="container mt-5 pt-4">
            <h2 className="mb-4">
                <FontAwesomeIcon icon={faLightbulb} className="text-warning me-2" />
                Quản lý đề xuất
            </h2>

            <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                    <Nav.Link active={filter === 'pending'} onClick={() => setFilter('pending')}>
                        Chờ duyệt
                    </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link active={filter === 'approved'} onClick={() => setFilter('approved')}>
                        Đã duyệt
                    </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link active={filter === 'rejected'} onClick={() => setFilter('rejected')}>
                        Đã từ chối
                    </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link active={filter === 'all'} onClick={() => setFilter('all')}>
                        Tất cả
                    </Nav.Link>
                </Nav.Item>
            </Nav>

            {suggestions.length === 0 ? (
                <Card body className="text-center text-muted">
                    Không có đề xuất nào
                </Card>
            ) : (
                <div className="table-responsive">
                    <Table striped hover>
                        <thead>
                            <tr>
                                <th>Loại</th>
                                <th>Chi tiết</th>
                                <th>Người gửi</th>
                                <th>Ngày gửi</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suggestions.map((s) => (
                                <tr key={s._id}>
                                    <td>
                                        {getTypeIcon(s.type)} {getTypeLabel(s.type)}
                                    </td>
                                    <td>{getSuggestionDetail(s)}</td>
                                    <td>
                                        <div>{s.submitter.name}</div>
                                        {s.submitter.phone && (
                                            <small className="text-muted">{s.submitter.phone}</small>
                                        )}
                                        {s.submitter.relationship && (
                                            <small className="text-muted d-block">({s.submitter.relationship})</small>
                                        )}
                                    </td>
                                    <td>
                                        <small>{formatDate(s.createdAt)}</small>
                                    </td>
                                    <td>{getStatusBadge(s.status)}</td>
                                    <td>
                                        {s.status === 'pending' ? (
                                            <>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleApprove(s._id)}
                                                    title="Duyệt"
                                                >
                                                    <FontAwesomeIcon icon={faCheck} />
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleReject(s._id)}
                                                    title="Từ chối"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => handleRevert(s._id)}
                                                    title="Chuyển về chờ duyệt"
                                                >
                                                    <FontAwesomeIcon icon={faUndo} />
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(s._id)}
                                                    title="Xóa"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
        </div>
    );
}