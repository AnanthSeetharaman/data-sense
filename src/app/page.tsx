
import type { DataAsset } from '@/lib/types';
import { DataAssetFeed } from '@/components/data-asset/DataAssetFeed';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

async function getSnowflakeAssets(): Promise<{ assets: DataAsset[], error: string | null }> {
  try {
    // Fetch from the API route. Ensure the full URL if deployed or if running in a context where localhost isn't implicit.
    // For local dev, '/api/snowflake-assets' should work.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'; // Adjust port if necessary
    const response = await fetch(`${apiUrl}/api/snowflake-assets`, {
      cache: 'no-store', // Ensure fresh data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
      console.error("Error fetching Snowflake assets:", response.status, errorData);
      return { assets: [], error: errorData.error || `Failed to fetch data assets: ${response.statusText}` };
    }
    const assets = await response.json();
    return { assets, error: null };
  } catch (e: any) {
    console.error("Failed to load assets from API for DiscoverPage:", e);
    return { assets: [], error: e.message || "Failed to load data assets due to a network or server error." };
  }
}


// This is now a Server Component again, fetching from its own API route.
export default async function DiscoverPage() {
  const { assets, error } = await getSnowflakeAssets();

  // Note: The isLoading state is now primarily handled within DataAssetFeed
  // based on the presence of initialAssets.

  if (error && assets.length === 0) { // Only show page-level error if no assets could be loaded at all
    return (
      <div className="container mx-auto py-2">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Discover Data Assets</h1>
          <p className="text-muted-foreground">
            Explore, search, and filter your organization's data landscape. (Source: Snowflake)
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
          Explore, search, and filter your organization's data landscape. (Source: Snowflake)
        </p>
      </header>
      {/* Pass server-fetched data to the client component */}
      <DataAssetFeed initialAssets={assets} />
    </div>
  );
}
