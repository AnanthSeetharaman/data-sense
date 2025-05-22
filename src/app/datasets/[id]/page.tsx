
import { DatasetDetailView } from '@/components/data-asset/DatasetDetailView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { DataAsset } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DatasetPageProps {
  params: {
    id: string; // Expected format: "database.schema.table"
  };
}

async function getAssetDetails(assetId: string): Promise<DataAsset | null> {
  const parts = assetId.split('.');
  if (parts.length < 3) { // Basic validation for "db.schema.table"
    console.error("Invalid asset ID format for API call:", assetId);
    return null; 
  }
  // Take all parts before the last two as DB, then schema, then table.
  // This handles DB names with periods, though generally not recommended.
  const table = parts.pop()!;
  const schema = parts.pop()!;
  const db = parts.join('.');


  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'; // Adjust port if necessary
  try {
    const response = await fetch(`${apiUrl}/api/snowflake-assets/detail/${db}/${schema}/${table}`, {
      cache: 'no-store', // Ensure fresh data
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
      console.error(`Error fetching asset details for ${assetId} from API: ${response.status}`, errorData);
      // For now, we'll let DatasetDetailView handle a null asset, which shows a not found message.
      // Consider throwing an error here to trigger Next.js error boundary or notFound()
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Exception fetching asset details for ${assetId} from API:`, error);
    return null;
  }
}

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export default async function DatasetPage({ params }: DatasetPageProps) {
  const asset: DataAsset | null = await getAssetDetails(params.id);

  if (!asset) {
    // Optionally, you could use notFound() from 'next/navigation' here
    // to render the nearest not-found.js file.
    // For now, DatasetDetailView handles the null case.
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
      {/* DatasetDetailView will show its own "not found" or error state if asset is null */}
      <DatasetDetailView initialAsset={asset} assetId={params.id} />
    </div>
  );
}
