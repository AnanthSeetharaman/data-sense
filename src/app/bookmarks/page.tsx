
import type { DataAsset } from '@/lib/types';
import { getAllDataAssets } from '@/lib/csv-data-loader'; // Server-side fetch
import { BookmarkedAssetsListView } from '@/components/bookmarks/BookmarkedAssetsListView';
import { Bookmark } from 'lucide-react';

// This is now a Server Component
export default async function BookmarksPage() {
  const allAssets: DataAsset[] = await getAllDataAssets();

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <Bookmark className="mr-3 h-8 w-8 text-primary" />
          My Bookmarks
        </h1>
        <p className="text-muted-foreground">
          Your saved data assets for quick access.
        </p>
      </header>
      {/* Pass server-fetched data to the client component */}
      <BookmarkedAssetsListView allAssets={allAssets} />
    </div>
  );
}
