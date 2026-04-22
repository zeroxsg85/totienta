'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Card, Row, Col, Badge, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faEnvelope,
    faPhone,
    faMapMarkerAlt,
    faBirthdayCake,
    faCrown,
    faKey,
    faSave,
    faTree,
    faShieldAlt,
    faChartBar,
    faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import API from '@/lib/api';
import { UserProfile } from '@/types';

interface GlobalSearchResult {
    _id: string;
    name: string;
    gender: 'male' | 'female';
    birthday?: { solar?: string };
    viewCode?: string;
    treeName: string;
    isMyTree: boolean;
}
import Loading from '@/components/Loading';
import TwoFactorSetup from '@/components/TwoFactorSetup';

export default function ProfilePage(): JSX.Element | null {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    // B7: Tìm tôi trong gia phả
    const [findQuery, setFindQuery] = useState('');
    const [findResults, setFindResults] = useState<GlobalSearchResult[]>([]);
    const [findLoading, setFindLoading] = useState(false);
    const findTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        address: '',
        birthday: '',
        treeName: '',
    });

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await API.get<UserProfile>('/users/profile');
                setProfile(data);
                setForm({
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    birthday: data.birthday ? data.birthday.split('T')[0] : '',
                    treeName: data.treeName || '',
                });
            } catch (error) {
                toast.error('Không thể tải thông tin profile');
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchProfile();
        }
    }, [isAuthenticated]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { data } = await API.put<UserProfile>('/users/profile', form);
            setProfile(data);
            toast.success('Cập nhật thành công!');
        } catch (error) {
            toast.error('Lỗi khi cập nhật thông tin');
        } finally {
            setSaving(false);
        }
    };

    // B7: Tìm mình trong TOÀN BỘ app (debounce 400ms)
    const handleFindQuery = (q: string) => {
        setFindQuery(q);
        if (findTimer.current) clearTimeout(findTimer.current);
        if (!q.trim() || q.trim().length < 2) { setFindResults([]); return; }
        findTimer.current = setTimeout(async () => {
            setFindLoading(true);
            try {
                const { data } = await API.get<{ results: GlobalSearchResult[] }>(
                    '/members/search-global', { params: { q: q.trim() } }
                );
                setFindResults(data.results);
            } catch {
                setFindResults([]);
            } finally {
                setFindLoading(false);
            }
        }, 400);
    };

    const getPlanBadge = (plan?: string) => {
        switch (plan) {
            case 'premium':
                return <Badge bg="warning" text="dark"><FontAwesomeIcon icon={faCrown} /> Premium</Badge>;
            case 'basic':
                return <Badge bg="info">Basic</Badge>;
            default:
                return <Badge bg="secondary">Miễn phí</Badge>;
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    if (isLoading || loading) {
        return <Loading text="Đang tải cây gia phả..." />;
    }

    if (!isAuthenticated || !profile) {
        return null;
    }

    return (
        <div className="container mt-5 pt-4">
            <h2 className="mb-4">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Thông tin tài khoản
            </h2>

            <Row>
                {/* Cột trái - Form thông tin */}
                <Col lg={8}>
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-white">
                            <strong>Thông tin cá nhân</strong>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                {/* Email */}
                                <Form.Group className="mb-3">
                                    <InputGroup>
                                        <InputGroup.Text><FontAwesomeIcon icon={faEnvelope} /></InputGroup.Text>
                                        <Form.Control
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="bg-light"
                                        />
                                    </InputGroup>
                                    <Form.Text className="text-muted">Email không thể thay đổi</Form.Text>
                                </Form.Group>

                                {/* Họ tên */}
                                <Form.Group className="mb-3">
                                    <InputGroup>
                                        <InputGroup.Text><FontAwesomeIcon icon={faUser} /></InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="Họ và tên"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                {/* SĐT */}
                                <Form.Group className="mb-3">
                                    <InputGroup>
                                        <InputGroup.Text><FontAwesomeIcon icon={faPhone} /></InputGroup.Text>
                                        <Form.Control
                                            type="tel"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="Số điện thoại"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                {/* Địa chỉ */}
                                <Form.Group className="mb-3">
                                    <InputGroup>
                                        <InputGroup.Text><FontAwesomeIcon icon={faMapMarkerAlt} /></InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            name="address"
                                            value={form.address}
                                            onChange={handleChange}
                                            placeholder="Địa chỉ"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                {/* Ngày sinh */}
                                <Form.Group className="mb-3">
                                    <InputGroup>
                                        <InputGroup.Text><FontAwesomeIcon icon={faBirthdayCake} /></InputGroup.Text>
                                        <Form.Control
                                            type="date"
                                            name="birthday"
                                            value={form.birthday}
                                            onChange={handleChange}
                                        />
                                    </InputGroup>
                                </Form.Group>

                                {/* Tên cây gia phả */}
                                <Form.Group className="mb-3">
                                    <InputGroup>
                                        <InputGroup.Text><FontAwesomeIcon icon={faTree} /></InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            name="treeName"
                                            value={form.treeName}
                                            onChange={handleChange}
                                            placeholder="Tên cây gia phả (VD: Họ Hoàng Lạng Sơn)"
                                        />
                                    </InputGroup>
                                    <Form.Text className="text-muted">
                                        Tên này sẽ hiển thị khi chia sẻ cây gia phả
                                    </Form.Text>
                                </Form.Group>

                                <Button type="submit" variant="primary" disabled={saving}>
                                    <FontAwesomeIcon icon={faSave} className="me-2" />
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>

                    {/* Bảo mật */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-white">
                            <strong><FontAwesomeIcon icon={faShieldAlt} className="me-2" />Bảo mật</strong>
                        </Card.Header>
                        <Card.Body>
                            <Button
                                variant="outline-secondary"
                                className="mb-4"
                                onClick={() => router.push('/change-password')}
                            >
                                <FontAwesomeIcon icon={faKey} className="me-2" />
                                Đổi mật khẩu
                            </Button>

                            <hr />
                            <p className="fw-semibold mb-2">🔐 Xác thực 2 bước (2FA)</p>
                            <p className="text-muted small mb-3">
                                Bảo vệ tài khoản bằng mã OTP từ ứng dụng Authenticator.
                                Mỗi lần đăng nhập sẽ cần nhập thêm mã 6 chữ số.
                            </p>
                            <TwoFactorSetup />
                        </Card.Body>
                    </Card>
                </Col>

                {/* Cột phải - Sidebar */}
                <Col lg={4}>
                    {/* Gói dịch vụ */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-white">
                            <strong>Gói dịch vụ</strong>
                        </Card.Header>
                        <Card.Body>
                            <p className="mb-2">
                                Gói hiện tại: {getPlanBadge(profile.plan)}
                            </p>
                            {profile.planExpiry && (
                                <p className="text-muted small mb-3">
                                    Hết hạn: {formatDate(profile.planExpiry)}
                                </p>
                            )}
                            <Button variant="outline-warning" size="sm" disabled>
                                <FontAwesomeIcon icon={faCrown} className="me-2" />
                                Nâng cấp (Sắp ra mắt)
                            </Button>
                        </Card.Body>
                    </Card>

                    {/* Thống kê */}
                    <Card className="shadow-sm">
                        <Card.Header className="bg-white">
                            <strong><FontAwesomeIcon icon={faChartBar} className="me-2" />Thống kê</strong>
                        </Card.Header>
                        <Card.Body>
                            <p className="mb-0">
                                <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-muted" />
                                <small className="text-muted">Ngày tham gia:</small>
                                <br />
                                <strong>{formatDate(profile.createdAt)}</strong>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* B7: Tìm tôi trong gia phả (search toàn bộ app) */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-white">
                    <strong>🔍 Tìm tôi trong gia phả</strong>
                </Card.Header>
                <Card.Body>
                    <p className="text-muted small mb-3">
                        Nhập tên của bạn để xem bạn đã được thêm vào cây gia phả nào trong toàn bộ hệ thống.
                    </p>
                    <InputGroup className="mb-3">
                        <InputGroup.Text>🔍</InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Nhập họ tên của bạn..."
                            value={findQuery}
                            onChange={(e) => handleFindQuery(e.target.value)}
                        />
                    </InputGroup>

                    {findLoading && <p className="text-muted small">Đang tìm...</p>}

                    {!findLoading && findQuery.length >= 2 && findResults.length === 0 && (
                        <p className="text-muted small">Không tìm thấy ai tên này trong hệ thống.</p>
                    )}

                    {findResults.length > 0 && (
                        <div className="d-flex flex-column gap-2">
                            {findResults.map((m) => (
                                <div key={m._id} className="d-flex justify-content-between align-items-center p-2 border rounded">
                                    <div>
                                        <strong>{m.name}</strong>
                                        {m.birthday?.solar && (
                                            <span className="text-muted ms-2 small">
                                                ({new Date(m.birthday.solar).getFullYear()})
                                            </span>
                                        )}
                                        <span className="ms-2 badge bg-light text-dark border">
                                            {m.gender === 'male' ? 'Nam' : 'Nữ'}
                                        </span>
                                        <div className="text-muted small mt-1">
                                            🌳 Cây: <strong>{m.treeName}</strong>
                                            {m.isMyTree && (
                                                <Badge bg="success" className="ms-2">Cây của bạn</Badge>
                                            )}
                                        </div>
                                    </div>
                                    {m.viewCode && (
                                        <a
                                            href={`/${m.viewCode}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-sm btn-outline-primary"
                                        >
                                            Xem cây ↗
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}