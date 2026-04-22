'use client';

/**
 * TwoFactorSetup – Component quản lý 2FA trong trang Profile > Bảo mật
 * Fix: OtpInput không dùng nested component (gây mất focus mỗi keystroke)
 */

import { useState, useEffect, useRef } from 'react';
import { Button, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Image from 'next/image';
import API from '@/lib/api';

type Step = 'loading' | 'disabled' | 'setup' | 'enabled' | 'disabling';

// Link tải app xác thực
const AUTH_APPS = [
    {
        name: 'Google Authenticator',
        ios: 'https://apps.apple.com/app/google-authenticator/id388497605',
        android: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
    },
    {
        name: 'Microsoft Authenticator',
        ios: 'https://apps.apple.com/app/microsoft-authenticator/id983156458',
        android: 'https://play.google.com/store/apps/details?id=com.azure.authenticator',
    },
];

export default function TwoFactorSetup() {
    const [step, setStep]           = useState<Step>('loading');
    const [qrCode, setQrCode]       = useState('');
    const [manualCode, setManualCode] = useState('');
    const [otp, setOtp]             = useState('');
    const [working, setWorking]     = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [showApps, setShowApps]   = useState(false);
    const otpRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        API.get<{ enabled: boolean }>('/users/2fa/status')
            .then(({ data }) => setStep(data.enabled ? 'enabled' : 'disabled'))
            .catch(() => setStep('disabled'));
    }, []);

    // Focus input khi chuyển sang bước nhập OTP
    useEffect(() => {
        if (step === 'setup' || step === 'disabling') {
            setTimeout(() => otpRef.current?.focus(), 100);
        }
    }, [step]);

    const handleStartSetup = async () => {
        setWorking(true);
        try {
            const { data } = await API.post<{ qrCode: string; manualCode: string }>('/users/2fa/setup');
            setQrCode(data.qrCode);
            setManualCode(data.manualCode);
            setOtp('');
            setStep('setup');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể khởi tạo 2FA');
        } finally {
            setWorking(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length < 6) return;
        setWorking(true);
        try {
            await API.post('/users/2fa/verify', { token: otp });
            toast.success('🔒 2FA đã được bật thành công!');
            setStep('enabled');
            setOtp('');
            setQrCode('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Mã không đúng, thử lại');
            setOtp('');
            otpRef.current?.focus();
        } finally {
            setWorking(false);
        }
    };

    const handleDisable = async () => {
        if (otp.length < 6) return;
        setWorking(true);
        try {
            await API.post('/users/2fa/disable', { token: otp });
            toast.success('2FA đã được tắt');
            setStep('disabled');
            setOtp('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Mã không đúng, thử lại');
            setOtp('');
            otpRef.current?.focus();
        } finally {
            setWorking(false);
        }
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        setOtp(val);
    };

    // ── OTP input JSX (inline, không phải nested component) ──────────────────────
    const otpInput = (onSubmit: () => void, submitLabel: string, cancelStep: Step = 'disabled') => (
        <div>
            <p className="text-muted small mb-2">Nhập mã 6 chữ số từ ứng dụng Authenticator:</p>
            <div className="mb-2" style={{ maxWidth: 220 }}>
                <input
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={handleOtpChange}
                    onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                    placeholder="000000"
                    className="form-control"
                    style={{
                        fontSize: '1.6rem',
                        letterSpacing: '0.5rem',
                        fontFamily: 'monospace',
                        textAlign: 'center',
                    }}
                />
            </div>
            <div className="d-flex gap-2">
                <Button variant="primary" size="sm"
                    disabled={working || otp.length < 6} onClick={onSubmit}>
                    {working ? <Spinner size="sm" /> : submitLabel}
                </Button>
                <Button variant="outline-secondary" size="sm"
                    onClick={() => { setStep(cancelStep); setOtp(''); }}>
                    Hủy
                </Button>
            </div>
        </div>
    );

    // ── App download links ────────────────────────────────────────────────────────
    const appLinks = (
        <div className="mt-3">
            <button className="btn btn-link btn-sm p-0 text-muted"
                onClick={() => setShowApps(!showApps)}>
                📱 Chưa có app xác thực? Tải tại đây
            </button>
            {showApps && (
                <div className="mt-2 d-flex flex-column gap-2">
                    {AUTH_APPS.map((app) => (
                        <div key={app.name} className="d-flex align-items-center gap-2">
                            <span className="small fw-semibold" style={{ minWidth: 180 }}>{app.name}</span>
                            <a href={app.ios} target="_blank" rel="noreferrer"
                                className="btn btn-outline-secondary btn-sm py-0">🍎 iOS</a>
                            <a href={app.android} target="_blank" rel="noreferrer"
                                className="btn btn-outline-secondary btn-sm py-0">🤖 Android</a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────────
    if (step === 'loading') return <Spinner size="sm" />;

    if (step === 'enabled') return (
        <div>
            <div className="d-flex align-items-center gap-2 mb-2">
                <Badge bg="success">✅ Đang bật</Badge>
                <span className="text-muted small">Tài khoản được bảo vệ bằng xác thực 2 bước.</span>
            </div>
            <Button variant="outline-danger" size="sm"
                onClick={() => { setStep('disabling'); setOtp(''); }}>
                Tắt 2FA
            </Button>
        </div>
    );

    if (step === 'disabling') return (
        <div>
            <p className="text-warning small mb-2">
                ⚠️ Nhập mã từ Authenticator để xác nhận tắt 2FA:
            </p>
            {otpInput(handleDisable, 'Xác nhận tắt', 'enabled')}
        </div>
    );

    if (step === 'setup') return (
        <div>
            {/* Bước 1: QR */}
            <p className="small fw-semibold mb-1">Bước 1 — Quét mã QR bằng app Authenticator</p>
            <p className="text-muted small mb-2">
                Mở app → nhấn <strong>+</strong> → chọn <em>Quét mã QR</em>
            </p>

            {qrCode && (
                <div className="mb-2">
                    <Image src={qrCode} alt="QR Code 2FA" width={200} height={200}
                        style={{ border: '4px solid #dee2e6', borderRadius: 8 }} />
                </div>
            )}

            <p className="small text-muted mb-1">
                Không quét được?{' '}
                <button className="btn btn-link btn-sm p-0"
                    onClick={() => setShowManual(!showManual)}>
                    Nhập mã thủ công
                </button>
            </p>
            {showManual && (
                <div className="mb-3 p-2 bg-light rounded"
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', maxWidth: 320 }}>
                    {manualCode}
                </div>
            )}

            {appLinks}

            {/* Bước 2: OTP */}
            <p className="small fw-semibold mt-3 mb-1">Bước 2 — Nhập mã để xác nhận</p>
            {otpInput(handleVerify, 'Bật 2FA')}
        </div>
    );

    // disabled
    return (
        <div>
            <div className="d-flex align-items-center gap-2 mb-3">
                <Badge bg="secondary">Chưa bật</Badge>
                <span className="text-muted small">Tài khoản chưa có xác thực 2 bước.</span>
            </div>
            <Button variant="outline-success" size="sm" onClick={handleStartSetup} disabled={working}>
                {working ? <Spinner size="sm" /> : '🔒 Bật 2FA'}
            </Button>
            {appLinks}
        </div>
    );
}
