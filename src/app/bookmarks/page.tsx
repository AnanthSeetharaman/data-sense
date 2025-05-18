
"use client"; // This page needs to be client-side to use the useBookmarks hook

import { useState, useEffect, useMemo } from 'react';
import { mockDataAssets } from '@/lib/mock-data';
import { DataAssetCard } from '@/components/data-asset/DataAssetCard';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { DataAsset } from '@/lib/types';
import { Bookmark, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

export default function BookmarksPage() {
  const { bookmarkedIds, isInitialized } = useBookmarks();
  const [bookmarkedAssets, setBookmarkedAssets] = useState<DataAsset[]>([]);

  useEffect(() => {
    if (isInitialized) {
      const filteredAssets = mockDataAssets.filter(asset => bookmarkedIds.has(asset.id));
      setBookmarkedAssets(filteredAssets);
    }
  }, [bookmarkedIds, isInitialized]);

  if (!isInitialized) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }


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

      {bookmarkedAssets.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Bookmarks Yet</AlertTitle>
          <AlertDescription>
            You haven't bookmarked any data assets. Explore the Discover page to find and save assets.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedAssets.map(asset => (
            <DataAssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}


function CardSkeleton() {
  return (
    <div className="bg-card p-4 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-3 w-24 rounded mb-4" />
      <Skeleton className="h-12 w-full rounded mb-3" />
      <div className="flex flex-wrap gap-1 mb-3">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-32 w-full rounded mb-3" />
       <div className="space-y-1 text-xs mb-3">
         <Skeleton className="h-3 w-20 rounded" />
         <Skeleton className="h-3 w-24 rounded" />
         <Skeleton className="h-3 w-28 rounded" />
       </div>
      <div className="flex justify-between gap-2 border-t pt-3">
        <Skeleton className="h-8 w-2/3 rounded" />
        <Skeleton className="h-8 w-1/3 rounded" />
      </div>
    </div>
  );
}

