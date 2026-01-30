'use client';
// src/app/login/page.tsx

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { faEnvelope, faLock, faUserShield } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';
import API from '@/lib/api';
import InputWithIcon from '@/components/InputWithIcon';
import { LoginFormData, LoginResponse, ApiError } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function LoginPage(): JSX.Element {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState<boolean>(false);

  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await API.post<LoginResponse>(
        '/users/login',
        formData
      );

      login(data.token);
      toast.success('Đăng nhập thành công!');
      router.push('/members');
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h3 className="text-center mb-4"><FontAwesomeIcon icon={faUserShield} /> Đăng nhập</h3>

        <form onSubmit={handleSubmit}>
          <InputWithIcon
            icon={faEnvelope}
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />

          <InputWithIcon
            icon={faLock}
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={formData.password}
            onChange={handleChange}
          />

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <hr />
        <div className="d-flex justify-content-between mt-3">
          <a href="/forgot-password" className="text-decoration-none">
            Quên mật khẩu?
          </a>

          <a href="/register" className="text-decoration-none">
            Đăng ký
          </a>
        </div>

      </div>
    </div>
  );
}
