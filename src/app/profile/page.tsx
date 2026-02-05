'use client';

import { useState, useEffect, FormEvent } from 'react';
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
import Loading from '@/components/Loading';

export default function ProfilePage(): JSX.Element | null {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

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
                                onClick={() => router.push('/change-password')}
                            >
                                <FontAwesomeIcon icon={faKey} className="me-2" />
                                Đổi mật khẩu
                            </Button>
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
        </div>
    );
}