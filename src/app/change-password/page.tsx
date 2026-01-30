'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPen, faLock } from '@fortawesome/free-solid-svg-icons';

import API from '@/lib/api';
import InputWithIcon from '@/components/InputWithIcon';

export default function ChangePasswordPage(): JSX.Element {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (): Promise<void> => {
        if (!oldPassword || !newPassword) {
            toast.error('Vui lòng nhập đầy đủ');
            return;
        }

        if (loading) return;
        setLoading(true);

        try {
            await API.post('/users/change-password', {
                oldPassword,
                newPassword,
            });

            toast.success('Đổi mật khẩu thành công');
            setOldPassword('');
            setNewPassword('');
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Không thể đổi mật khẩu'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <h4 className="text-center mb-4">
                    <FontAwesomeIcon icon={faUserPen} className="me-2" />
                    Đổi mật khẩu
                </h4>

                <InputWithIcon
                    type="password"
                    icon={faLock}
                    placeholder="Mật khẩu cũ"
                    name="oldPassword"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    disabled={loading}
                />

                <InputWithIcon
                    type="password"
                    icon={faLock}
                    placeholder="Mật khẩu mới"
                    name="newPassword"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
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
                        'Đổi mật khẩu'
                    )}
                </button>
            </div>
        </div>
    );
}
