
import { DataAssetFeed } from '@/components/data-asset/DataAssetFeed';
import { getAllDataAssets } from '@/lib/csv-data-loader';
import type { DataAsset } from '@/lib/types';

export default async function DiscoverPage() {
  const assets: DataAsset[] = await getAllDataAssets();

  return (
    <div className="container mx-auto py-2">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Discover Data Assets</h1>
        <p className="text-muted-foreground">
          Explore, search, and filter your organization's data landscape.
        </p>
      </header>
      <DataAssetFeed initialAssets={assets} />
    </div>
  );
}
