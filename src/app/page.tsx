
import { getAllDataAssets } from '@/lib/csv-data-loader';
import type { DataAsset } from '@/lib/types';
import { DataAssetFeed } from '@/components/data-asset/DataAssetFeed';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

// This is now a Server Component
export default async function DiscoverPage() {
  let assets: DataAsset[] = [];
  let error: string | null = null;

  try {
    assets = await getAllDataAssets();
  } catch (e: any) {
    console.error("Failed to load initial assets for DiscoverPage:", e);
    error = e.message || "Failed to load data assets.";
  }

  // Note: The isLoading state is now primarily handled within DataAssetFeed
  // based on the presence of initialAssets.

  if (error && assets.length === 0) { // Only show page-level error if no assets could be loaded at all
    return (
      <div className="container mx-auto py-2">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Discover Data Assets</h1>
          <p className="text-muted-foreground">
            Explore, search, and filter your organization's data landscape.
          </p>
        </header>
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error Loading Assets</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Discover Data Assets</h1>
        <p className="text-muted-foreground">
          Explore, search, and filter your organization's data landscape.
        </p>
      </header>
      {/* Pass server-fetched data to the client component */}
      <DataAssetFeed initialAssets={assets} />
    </div>
  );
}
