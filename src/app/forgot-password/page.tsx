'use client';

import { useState } from 'react';
import { faEnvelope, faUserLock } from '@fortawesome/free-solid-svg-icons';
import InputWithIcon from '@/components/InputWithIcon';
import { toast } from 'react-toastify';
import API from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (): Promise<void> => {
        if (!email) {
            toast.error('Vui lòng nhập email');
            return;
        }

        if (loading) return; // chặn bấm nhiều lần

        setLoading(true);

        try {
            await API.post('/users/forgot-password', { email });
            toast.success('Đã gửi email đặt lại mật khẩu');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể gửi email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <h4 className="text-center mb-4"><FontAwesomeIcon icon={faUserLock} /> Quên mật khẩu</h4>

                <InputWithIcon
                    icon={faEnvelope}
                    placeholder="Email"
                    name="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                />

                <button
                    className="btn btn-primary w-100"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                            />
                            Đang gửi...
                        </>
                    ) : (
                        'Gửi email'
                    )}
                </button>
                <hr />
                <div className="d-flex justify-content-between mt-3">
                    <a href="/register" className="text-decoration-none">
                        Đăng ký
                    </a>

                    <a href="/login" className="text-decoration-none">
                        Đăng nhập
                    </a>
                </div>
            </div>
        </div>
    );
}
