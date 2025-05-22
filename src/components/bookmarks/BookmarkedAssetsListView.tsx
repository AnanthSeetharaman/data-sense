
"use client"; 

import { useState, useEffect } from 'react';
import { DataAssetCard } from '@/components/data-asset/DataAssetCard';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { DataAsset } from '@/lib/types';
import { Bookmark, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

interface BookmarkedAssetsListViewProps {
  allAssets: DataAsset[];
}

export function BookmarkedAssetsListView({ allAssets }: BookmarkedAssetsListViewProps) {
  const { bookmarkedIds, isInitialized: bookmarksInitialized } = useBookmarks();
  const [bookmarkedAssets, setBookmarkedAssets] = useState<DataAsset[]>([]);
  // isLoading now primarily depends on bookmarks initialization, 
  // as allAssets are pre-fetched by the server component.
  const [isLoading, setIsLoading] = useState(!bookmarksInitialized); 

  useEffect(() => {
    if (bookmarksInitialized) {
      if (allAssets && allAssets.length > 0) {
        const filteredAssets = allAssets.filter(asset => bookmarkedIds.has(asset.id));
        setBookmarkedAssets(filteredAssets);
      } else {
        setBookmarkedAssets([]); // Handle case where allAssets might be empty
      }
      setIsLoading(false); 
    }
  }, [bookmarkedIds, bookmarksInitialized, allAssets]);


  if (isLoading) { // Simplified loading condition
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
    );
  }

  return (
    <>
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
    </>
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
