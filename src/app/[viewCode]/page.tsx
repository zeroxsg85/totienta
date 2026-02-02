import type { Metadata } from 'next';
import { Suspense } from 'react';
import ViewAccessClient from './ViewAccessClient';
import Loading from '@/components/Loading';

interface PageProps {
  params: Promise<{ viewCode: string }>;
}

// Lấy thông tin cây
async function getTreeInfo(viewCode: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const res = await fetch(`${baseUrl}/members/tree-info/${viewCode}`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { viewCode } = await params;
  const treeInfo = await getTreeInfo(viewCode);

  const title = treeInfo?.treeName
    ? `Cây Gia Phả - ${treeInfo.treeName}`
    : `Cây Gia Phả - ${viewCode}`;

  const description = treeInfo?.treeName
    ? `Xem cây gia phả ${treeInfo.treeName} trên ToTienTa.com`
    : `Xem cây gia phả được chia sẻ trên ToTienTa.com`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ViewAccessPage({ params }: PageProps): Promise<JSX.Element> {
  const { viewCode } = await params;

  return (
    <Suspense fallback={<Loading text="Đang tải..." />}>
      <ViewAccessClient viewCode={viewCode} />
    </Suspense>
  );
}