
// No longer needs to be a Client Component or fetch initial data
import type { DataAsset } from '@/lib/types';
import { DataAssetFeed } from '@/components/data-asset/DataAssetFeed';
// Removed Alert related imports, as DataAssetFeed will handle its own states

// This is a Server Component. It no longer fetches data.
export default async function DiscoverPage() {
  // Data fetching will be handled by DataAssetFeed based on filters
  return (
    <div className="container mx-auto py-2">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Discover Data Assets</h1>
        <p className="text-muted-foreground">
          Explore, search, and filter your organization's data landscape.
        </p>
      </header>
      {/* Pass no initial assets. DataAssetFeed will fetch on filter apply. */}
      <DataAssetFeed initialAssets={[]} />
    </div>
  );
}
