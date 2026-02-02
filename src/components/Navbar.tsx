'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudSun, faSignInAlt, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar(): JSX.Element {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleLogout = (): void => {
    logout();
    setIsOpen(false);
  };

  const closeMenu = (): void => {
    setIsOpen(false);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-top">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse ms-2 navbar-collapse ${isOpen ? 'show' : ''}`}>
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link className="navbar-brand" href="/" onClick={closeMenu}>
                <FontAwesomeIcon icon={faCloudSun} className="text-warning" />
              </Link>
            </li>
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
                  <Link className="nav-link" href="/suggestions" onClick={closeMenu}>
                    Đề xuất
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
