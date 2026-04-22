'use client';

/**
 * TwoFactorSetup – Component quản lý 2FA trong trang Profile > Bảo mật
 * Trạng thái: disabled → setup (hiện QR) → verify (nhập OTP) → enabled
 */

import { useState, useEffect } from 'react';
import { Button, Form, InputGroup, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Image from 'next/image';
import API from '@/lib/api';

type Step = 'loading' | 'disabled' | 'setup' | 'verify' | 'enabled' | 'disabling';

export default function TwoFactorSetup() {
    const [step, setStep] = useState<Step>('loading');
    const [qrCode, setQrCode] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [otp, setOtp] = useState('');
    const [working, setWorking] = useState(false);
    const [showManual, setShowManual] = useState(false);

    // Lấy trạng thái 2FA hiện tại
    useEffect(() => {
        API.get<{ enabled: boolean }>('/users/2fa/status')
            .then(({ data }) => setStep(data.enabled ? 'enabled' : 'disabled'))
            .catch(() => setStep('disabled'));
    }, []);

    // ── Bắt đầu setup: lấy QR code từ server ────────────────────────────────────
    const handleStartSetup = async () => {
        setWorking(true);
        try {
            const { data } = await API.post<{ qrCode: string; manualCode: string }>('/users/2fa/setup');
            setQrCode(data.qrCode);
            setManualCode(data.manualCode);
            setStep('setup');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể khởi tạo 2FA');
        } finally {
            setWorking(false);
        }
    };

    // ── Xác nhận OTP để bật 2FA ──────────────────────────────────────────────────
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
        } finally {
            setWorking(false);
        }
    };

    // ── Tắt 2FA ──────────────────────────────────────────────────────────────────
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
        } finally {
            setWorking(false);
        }
    };

    // ── OTP input chung ──────────────────────────────────────────────────────────
    const OtpInput = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
        <div>
            <p className="text-muted small mb-2">
                Nhập mã 6 chữ số từ ứng dụng Authenticator:
            </p>
            <InputGroup className="mb-2" style={{ maxWidth: 260 }}>
                <Form.Control
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    style={{ fontSize: '1.4rem', letterSpacing: '0.4rem', fontFamily: 'monospace', textAlign: 'center' }}
                />
            </InputGroup>
            <div className="d-flex gap-2">
                <Button
                    variant="primary"
                    size="sm"
                    disabled={working || otp.length < 6}
                    onClick={onSubmit}
                >
                    {working ? <Spinner size="sm" /> : submitLabel}
                </Button>
                <Button variant="outline-secondary" size="sm"
                    onClick={() => { setStep('disabled'); setOtp(''); }}>
                    Hủy
                </Button>
            </div>
        </div>
    );

    // ── Render theo từng step ─────────────────────────────────────────────────────
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
            <OtpInput onSubmit={handleDisable} submitLabel="Xác nhận tắt" />
        </div>
    );

    if (step === 'setup') return (
        <div>
            <p className="small mb-2">
                <strong>Bước 1:</strong> Mở <strong>Google Authenticator</strong> hoặc{' '}
                <strong>Microsoft Authenticator</strong> → nhấn <strong>+</strong> → quét mã QR bên dưới:
            </p>
            <div className="mb-3">
                {qrCode && (
                    <Image src={qrCode} alt="QR Code 2FA" width={200} height={200}
                        style={{ border: '4px solid #dee2e6', borderRadius: 8 }} />
                )}
            </div>
            <p className="small text-muted mb-1">
                Không quét được?{' '}
                <button className="btn btn-link btn-sm p-0"
                    onClick={() => setShowManual(!showManual)}>
                    Nhập mã thủ công
                </button>
            </p>
            {showManual && (
                <div className="mb-3 p-2 bg-light rounded" style={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {manualCode}
                </div>
            )}
            <p className="small mb-2">
                <strong>Bước 2:</strong> Nhập mã 6 chữ số từ app để xác nhận:
            </p>
            <OtpInput onSubmit={handleVerify} submitLabel="Bật 2FA" />
        </div>
    );

    if (step === 'verify') return (
        <OtpInput onSubmit={handleVerify} submitLabel="Xác nhận" />
    );

    // disabled
    return (
        <div>
            <div className="d-flex align-items-center gap-2 mb-2">
                <Badge bg="secondary">Chưa bật</Badge>
                <span className="text-muted small">Tài khoản chưa có xác thực 2 bước.</span>
            </div>
            <Button variant="outline-success" size="sm" onClick={handleStartSetup} disabled={working}>
                {working ? <Spinner size="sm" /> : '🔒 Bật 2FA'}
            </Button>
        </div>
    );
}
