
import { getDataAssetById } from '@/lib/csv-data-loader';
import { DatasetDetailView } from '@/components/data-asset/DatasetDetailView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { DataAsset } from '@/lib/types';

interface DatasetPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export default async function DatasetPage({ params }: DatasetPageProps) {
  const asset: DataAsset | undefined = await getDataAssetById(params.id);

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
