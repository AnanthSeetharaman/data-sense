
import { mockDataAssets } from '@/lib/mock-data';
import { DataAssetFeed } from '@/components/data-asset/DataAssetFeed';

export default async function DiscoverPage() {
  // In a real app, this would be an API call or database query
  const assets = mockDataAssets;

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
