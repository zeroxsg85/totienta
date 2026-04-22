import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ShrinePageContent from './ShrinePageContent';

interface PageProps {
  params: Promise<{ viewCode: string; memberId: string }>;
}

const BASE_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

async function fetchMemberShrine(memberId: string) {
  try {
    const res = await fetch(`${BASE_API}/members/${memberId}/shrine-public`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { memberId } = await params;
  const member = await fetchMemberShrine(memberId);

  const name = member?.name || 'Bàn Thờ Số';
  return {
    title: `🏮 Bàn Thờ – ${name}`,
    description: `Thắp nhang và dâng lễ vật tưởng nhớ ${name} trên ToTienTa.com`,
    openGraph: {
      title: `🏮 Bàn Thờ Số – ${name}`,
      description: `Thắp nhang và dâng lễ vật tưởng nhớ ${name}`,
      type: 'website',
    },
  };
}

export default async function ShrinePage({ params }: PageProps): Promise<JSX.Element> {
  const { viewCode, memberId } = await params;

  const member = await fetchMemberShrine(memberId);
  if (!member) notFound();

  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>Đang tải bàn thờ...</span>
      </div>
    }>
      <ShrinePageContent member={member} viewCode={viewCode} baseUrl={BASE_API} />
    </Suspense>
  );
}
