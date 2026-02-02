import type { Metadata } from 'next';
import { Suspense } from 'react';
import ViewAccessClient from './ViewAccessClient';
import Loading from '@/components/Loading';

interface PageProps {
  params: Promise<{ viewCode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { viewCode } = await params;

  return {
    title: `Cây Gia Phả - ${viewCode}`,
    description: `Xem cây gia phả được chia sẻ với mã ${viewCode}`,
    openGraph: {
      title: `Cây Gia Phả - ${viewCode}`,
      description: 'Xem cây gia phả được chia sẻ trên Totienta',
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