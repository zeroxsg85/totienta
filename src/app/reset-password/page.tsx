'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { faLock, faUserInjured } from '@fortawesome/free-solid-svg-icons';

import InputWithIcon from '@/components/InputWithIcon';
import API from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function ResetPasswordForm(): JSX.Element {
    const searchParams = useSearchParams();
    const router = useRouter();

    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (): Promise<void> => {
        if (!token) {
            toast.error('Link không hợp lệ hoặc đã hết hạn');
            return;
        }

        if (!password) {
            toast.error('Vui lòng nhập mật khẩu mới');
            return;
        }

        if (loading) return;
        setLoading(true);

        try {
            await API.post('/users/reset-password', {
                token,
                password,
            });

            toast.success('Đổi mật khẩu thành công');
            router.push('/login');
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Không thể đặt lại mật khẩu'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card">
            <h4 className="text-center mb-4">
                <FontAwesomeIcon icon={faUserInjured} /> Đặt lại mật khẩu
            </h4>

            <InputWithIcon
                type="password"
                icon={faLock}
                placeholder="Mật khẩu mới"
                name="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
                        Đang xử lý...
                    </>
                ) : (
                    'Xác nhận'
                )}
            </button>
        </div>
    );
}

export default function ResetPasswordPage(): JSX.Element {
    return (
        <div className="auth-wrapper">
            <Suspense fallback={<div className="text-center">Đang tải...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}