'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { faEnvelope, faLock, faUser, faUserPlus } from '@fortawesome/free-solid-svg-icons';

import InputWithIcon from '@/components/InputWithIcon';
import API from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, LoginResponse } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function RegisterPage(): JSX.Element {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!form.email || !form.password || !form.confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const { data } = await API.post<LoginResponse>('/users/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      // auto login sau khi đăng ký
      login(data.token);
      toast.success('Đăng ký thành công!');
      router.push('/members');
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h3 className="text-center mb-4">
          <FontAwesomeIcon icon={faUserPlus} /> Đăng ký
        </h3>

        <form onSubmit={handleSubmit}>
          <InputWithIcon
            icon={faUser}
            placeholder="Họ tên"
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={loading}
          />
          <InputWithIcon
            icon={faEnvelope}
            placeholder="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
          />

          <InputWithIcon
            type="password"
            icon={faLock}
            placeholder="Mật khẩu"
            name="password"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
          />

          <InputWithIcon
            type="password"
            icon={faLock}
            placeholder="Nhập lại mật khẩu"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={loading}
          />

          <button
            type="submit"
            className="btn btn-success w-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Đang đăng ký...
              </>
            ) : (
              'Đăng ký'
            )}
          </button>
        </form>

        <hr />

        <div className="d-flex justify-content-center mt-3">
          <a href="/login" className="text-decoration-none">
            Quay lại Đăng nhập
          </a>
        </div>
      </div>
    </div>
  );
}
