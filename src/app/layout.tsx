import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/globals.css';

// FontAwesome config
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

export const metadata: Metadata = {
  title: {
    default: 'Cây Gia Phả - Totienta',
    template: '%s | Totienta',
  },
  description:
    'Ứng dụng quản lý cây gia phả trực tuyến - Lưu giữ và chia sẻ lịch sử gia đình',
  keywords: ['gia phả', 'cây gia đình', 'phả hệ', 'tộc phả', 'family tree'],
  authors: [{ name: 'ToTienTa.com' }],
  creator: 'Totienta',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://totienta.com',
    siteName: 'ToTienTa.com',
    title: 'Cây Gia Phả - ToTienTa.com',
    description:
      'Ứng dụng quản lý cây gia phả trực tuyến - Lưu giữ và chia sẻ lịch sử gia đình',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'android-chrome', url: '/android-chrome-192x192.png', sizes: '192x192' },
      { rel: 'android-chrome', url: '/android-chrome-512x512.png', sizes: '512x512' },
    ],
  },
  manifest: '/site.webmanifest',
  twitter: {
    card: 'summary_large_image',
    title: 'Cây Gia Phả - ToTienTa.com',
    description: 'Ứng dụng quản lý cây gia phả trực tuyến',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </AuthProvider>
      </body>
    </html>
  );
}
