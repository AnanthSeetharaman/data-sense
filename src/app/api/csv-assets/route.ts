
import { NextResponse } from 'next/server';
import { getAllDataAssets } from '@/lib/csv-data-loader'; // Ensure this path is correct
import type { DataAsset, DataSource } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceFilter = searchParams.get('source') as DataSource | null;

    let assets: DataAsset[] = await getAllDataAssets(); // Fetches all assets from CSVs

    if (sourceFilter) {
      assets = assets.filter(asset => asset.source.toLowerCase() === sourceFilter.toLowerCase());
    }
    
    // Potentially add other query param filters here if needed in the future (e.g., tags)

    return NextResponse.json(assets);
  } catch (error: any) {
    console.error('API error fetching CSV assets:', error);
    return NextResponse.json(
      { error: `Failed to fetch CSV assets: ${error.message || 'Unknown server error.'}` },
      { status: 500 }
    );
  }
}
