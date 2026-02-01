import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trang Chủ',
  description:
    'Chào mừng bạn đến với ứng dụng Cây Gia Phả ToTienTa.com - Lưu giữ và chia sẻ lịch sử gia đình',
};

export default function HomePage(): JSX.Element {
  return (
    <div className="container mt-5 pt-4">
      <h1 className="text-center">Trang Chủ</h1>
      <p className="text-center">Chào mừng bạn đến với ứng dụng Cây Gia Phả.</p>
    </div>
  );
}
