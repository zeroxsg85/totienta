import type { Metadata } from 'next';
import ViewAccessClient from './ViewAccessClient';

interface PageProps {
  params: Promise<{ viewCode: string }>;
}

// Generate metadata dynamically for SEO
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
      index: false, // Don't index shared family trees for privacy
      follow: false,
    },
  };
}

export default async function ViewAccessPage({ params }: PageProps): Promise<JSX.Element> {
  const { viewCode } = await params;

  return <ViewAccessClient viewCode={viewCode} />;
}
