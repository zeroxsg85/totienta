import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'Trang Chủ',
  description:
    'Chào mừng bạn đến với ứng dụng Cây Gia Phả ToTienTa.com - Lưu giữ và chia sẻ lịch sử gia đình',
};

export default function HomePage(): JSX.Element {
  return <HomeClient />;
}