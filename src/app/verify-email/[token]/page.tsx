'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from 'react-bootstrap';
import Link from 'next/link';
import API from '@/lib/api';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();
    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) return;
        API.get(`/users/verify-email/${token}`)
            .then(({ data }) => {
                setMessage(data.message);
                setStatus('success');
                // Chuyển về login sau 3 giây
                setTimeout(() => router.push('/login'), 3000);
            })
            .catch((err) => {
                setMessage(err.response?.data?.message || 'Link không hợp lệ hoặc đã hết hạn.');
                setStatus('error');
            });
    }, [token, router]);

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
            <div className="text-center" style={{ maxWidth: 420 }}>
                {status === 'loading' && (
                    <>
                        <Spinner animation="border" className="mb-3" />
                        <p className="text-muted">Đang xác thực tài khoản...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '4rem' }}>✅</div>
                        <h4 className="mt-3 text-success">Kích hoạt thành công!</h4>
                        <p className="text-muted">{message}</p>
                        <p className="text-muted small">Đang chuyển đến trang đăng nhập...</p>
                        <Link href="/login" className="btn btn-primary mt-2">
                            Đăng nhập ngay
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '4rem' }}>❌</div>
                        <h4 className="mt-3 text-danger">Kích hoạt thất bại</h4>
                        <p className="text-muted">{message}</p>
                        <p className="text-muted small">
                            Link có thể đã hết hạn (24h). Đăng nhập rồi vào Tài khoản để gửi lại email.
                        </p>
                        <Link href="/login" className="btn btn-outline-primary mt-2">
                            Đến trang đăng nhập
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
