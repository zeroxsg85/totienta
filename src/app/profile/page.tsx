'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Card, Row, Col, Badge } from 'react-bootstrap';
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
    });

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    // Fetch profile
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
                <FontAwesomeIcon icon={faUser} /> Thông tin tài khoản
            </h2>

            <Row>
                {/* Thông tin cơ bản */}
                <Col md={8}>
                    <Card className="mb-4">
                        <Card.Header>
                            <strong>Thông tin cá nhân</strong>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                                        Email
                                    </Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={profile.email}
                                        disabled
                                        className="bg-light"
                                    />
                                    <Form.Text className="text-muted">
                                        Email không thể thay đổi
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon={faUser} className="me-2" />
                                        Họ tên
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Nhập họ tên"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon={faPhone} className="me-2" />
                                        Số điện thoại
                                    </Form.Label>
                                    <Form.Control
                                        type="tel"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="Nhập số điện thoại"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                                        Địa chỉ
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="Nhập địa chỉ"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FontAwesomeIcon icon={faBirthdayCake} className="me-2" />
                                        Ngày sinh
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="birthday"
                                        value={form.birthday}
                                        onChange={handleChange}
                                    />
                                </Form.Group>

                                <Button type="submit" variant="primary" disabled={saving}>
                                    <FontAwesomeIcon icon={faSave} className="me-2" />
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>

                    {/* Đổi mật khẩu */}
                    <Card className="mb-4">
                        <Card.Header>
                            <strong>Bảo mật</strong>
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

                {/* Sidebar - Gói dịch vụ */}
                <Col md={4}>
                    <Card className="mb-4">
                        <Card.Header>
                            <strong>Gói dịch vụ</strong>
                        </Card.Header>
                        <Card.Body>
                            <p className="mb-2">
                                Gói hiện tại: {getPlanBadge(profile.plan)}
                            </p>
                            {profile.planExpiry && (
                                <p className="text-muted small">
                                    Hết hạn: {formatDate(profile.planExpiry)}
                                </p>
                            )}
                            <hr />
                            <Button variant="outline-warning" size="sm" disabled>
                                <FontAwesomeIcon icon={faCrown} className="me-2" />
                                Nâng cấp (Sắp ra mắt)
                            </Button>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header>
                            <strong>Thống kê</strong>
                        </Card.Header>
                        <Card.Body>
                            <p className="mb-1">
                                <small className="text-muted">Ngày tham gia:</small>
                                <br />
                                {formatDate(profile.createdAt)}
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}