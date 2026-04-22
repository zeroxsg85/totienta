'use client';
// src/app/login/page.tsx

import { useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { faEnvelope, faLock, faUserShield, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useAuth } from '@/contexts/AuthContext';
import API from '@/lib/api';
import InputWithIcon from '@/components/InputWithIcon';
import { LoginFormData, LoginResponse, ApiError } from '@/types';

export default function LoginPage(): JSX.Element {
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [loading, setLoading] = useState<boolean>(false);

  // 2FA state
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const otpRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, string> = { ...formData };
      if (requiresTwoFactor) payload.twoFactorToken = otpValue.replace(/\s/g, '');

      const { data } = await API.post<LoginResponse & { requiresTwoFactor?: boolean }>(
        '/users/login', payload
      );

      // Bước 1 xong, cần nhập mã 2FA
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setOtpValue('');
        toast.info('Nhập mã từ ứng dụng Authenticator của bạn');
        setTimeout(() => otpRef.current?.focus(), 100);
        return;
      }

      // Đăng nhập hoàn tất
      login(data.token);
      toast.success('Đăng nhập thành công!');
      router.push('/members');
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại!');
      // Nếu sai OTP, giữ nguyên màn hình 2FA để thử lại
      if (!requiresTwoFactor) setRequiresTwoFactor(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {!requiresTwoFactor ? (
          <>
            <h3 className="text-center mb-4">
              <FontAwesomeIcon icon={faUserShield} /> Đăng nhập
            </h3>

            <form onSubmit={handleSubmit}>
              <InputWithIcon icon={faEnvelope} type="email" name="email"
                placeholder="Email" value={formData.email} onChange={handleChange} />
              <InputWithIcon icon={faLock} type="password" name="password"
                placeholder="Mật khẩu" value={formData.password} onChange={handleChange} />

              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <hr />
            <div className="d-flex justify-content-between mt-3">
              <a href="https://app.totienta.com/forgot-password" className="text-decoration-none">
                Quên mật khẩu?
              </a>
              <a href="https://app.totienta.com/register" className="text-decoration-none">
                Đăng ký
              </a>
            </div>
          </>
        ) : (
          /* ── Bước 2: Nhập mã 2FA ── */
          <>
            <h3 className="text-center mb-2">
              <FontAwesomeIcon icon={faShieldAlt} /> Xác thực 2 bước
            </h3>
            <p className="text-center text-muted small mb-4">
              Mở ứng dụng <strong>Google/Microsoft Authenticator</strong> và nhập mã 6 chữ số.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3 text-center">
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="form-control form-control-lg text-center"
                  style={{ fontSize: '2rem', letterSpacing: '0.5rem', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 mb-2"
                disabled={loading || otpValue.length < 6}
              >
                {loading ? 'Đang xác thực...' : 'Xác nhận'}
              </button>

              <button
                type="button"
                className="btn btn-link w-100 text-muted"
                onClick={() => { setRequiresTwoFactor(false); setOtpValue(''); }}
              >
                ← Quay lại đăng nhập
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
