'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignInAlt, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/AuthContext';
import useDeviceType from '@/hooks/useDeviceType';
import API from '@/lib/api';
import './Navbar.css';

export default function Navbar(): JSX.Element {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const { isMobile } = useDeviceType();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const handleLogout = (): void => {
    logout();
    setIsOpen(false);
  };

  const closeMenu = (): void => {
    setIsOpen(false);
  };

  // Lấy số đề xuất pending
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!isAuthenticated) return;

      try {
        const { data } = await API.get<{ count: number }>('/suggestions/count');
        setPendingCount(data.count);
      } catch (error) {
        // Bỏ qua lỗi
      }
    };

    fetchPendingCount();

    // Refresh mỗi 30 giây
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-top">
      <div className="container-fluid navbar-container">
        {/* Mobile: Logo bên trái */}
        {isMobile && (
          <Link href="/" className="navbar-logo-mobile" onClick={closeMenu}>
            <Image src="/totienta.logo.png" alt="Logo" width={32} height={32} />
          </Link>
        )}

        {/* Brand - căn giữa trên mobile */}
        <Link href="/" className="navbar-brand" onClick={closeMenu}>
          {!isMobile && (
            <Image src="/totienta.logo.png" alt="Logo" width={36} height={36} />
          )}
          <span className="brand-text">ToTienTa.com</span>
        </Link>

        {/* Toggle button */}
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Menu */}
        <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''}`}>
          <ul className="navbar-nav">
            <li className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
              <Link className="nav-link" href="/" onClick={closeMenu}>
                Trang Chủ
              </Link>
            </li>
            {isAuthenticated && (
              <>
                <li className={`nav-item ${pathname === '/members' ? 'active' : ''}`}>
                  <Link className="nav-link" href="/members" onClick={closeMenu}>
                    Cây Của Bạn
                  </Link>
                </li>
                <li className={`nav-item ${pathname === '/suggestions' ? 'active' : ''}`}>
                  <Link className="nav-link position-relative" href="/suggestions" onClick={closeMenu}>
                    Đề xuất
                    {pendingCount > 0 && (
                      <span className="notification-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
                    )}
                  </Link>
                </li>
              </>
            )}
          </ul>

          <ul className="navbar-nav ms-auto">
            {isAuthenticated ? (
              <>
                <li className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}>
                  <Link className="nav-link" href="/profile" onClick={closeMenu}>
                    <FontAwesomeIcon icon={faUser} /> Tài khoản
                  </Link>
                </li>
                <li className="nav-item">
                  <button className="btn btn-link nav-link" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faSignOutAlt} /> Đăng Xuất
                  </button>
                </li>
              </>
            ) : (
              <li className={`nav-item ${pathname === '/login' ? 'active' : ''}`}>
                <Link className="nav-link" href="/login" onClick={closeMenu}>
                  <FontAwesomeIcon icon={faSignInAlt} /> Đăng Nhập
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}