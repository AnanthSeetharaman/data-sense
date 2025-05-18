
import { findDataAssetById } from '@/lib/mock-data';
import { DatasetDetailView } from '@/components/data-asset/DatasetDetailView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';


interface DatasetPageProps {
  params: {
    id: string;
  };
}

// Opt out of static generation for this dynamic page if needed, or implement generateStaticParams
export const dynamic = 'force-dynamic';


export default async function DatasetPage({ params }: DatasetPageProps) {
  const asset = findDataAssetById(params.id);

  if (!asset) {
    // If you have a custom notFound component or want to use Next.js default
    // For now, DatasetDetailView handles null asset by showing a message.
    // Alternatively, use Next.js notFound():
    // notFound();
  }

  return (
    <div className="container mx-auto py-2">
      <div className="mb-6">
        <Link href="/" passHref legacyBehavior>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discover
          </Button>
        </Link>
      </div>
      <DatasetDetailView asset={asset ?? null} />
    </div>
  );
}

// If you want to statically generate paths for known assets:
// export async function generateStaticParams() {
//   const { mockDataAssets } = await import('@/lib/mock-data');
//   return mockDataAssets.map((asset) => ({
//     id: asset.id,
//   }));
// }

