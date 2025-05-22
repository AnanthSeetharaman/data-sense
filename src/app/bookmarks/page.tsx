
"use client"; 

import { useState, useEffect } from 'react';
import { DataAssetCard } from '@/components/data-asset/DataAssetCard';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { DataAsset } from '@/lib/types';
import { Bookmark, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { getAllDataAssets } from '@/lib/csv-data-loader'; // To get all assets for filtering

export default function BookmarksPage() {
  const { bookmarkedIds, isInitialized: bookmarksInitialized } = useBookmarks();
  const [allAssets, setAllAssets] = useState<DataAsset[]>([]);
  const [bookmarkedAssets, setBookmarkedAssets] = useState<DataAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const fetchedAssets = await getAllDataAssets();
        setAllAssets(fetchedAssets);
      } catch (error) {
        console.error("Failed to load all assets for bookmarks:", error);
        setAllAssets([]); // Set to empty on error
      }
      // setIsLoading(false); // Loading state will be managed by combination with bookmarksInitialized
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (bookmarksInitialized && allAssets.length > 0) {
      const filteredAssets = allAssets.filter(asset => bookmarkedIds.has(asset.id));
      setBookmarkedAssets(filteredAssets);
      setIsLoading(false); 
    } else if (bookmarksInitialized && allAssets.length === 0 && !isLoading) {
      // Handles case where allAssets might be empty due to fetch error, but bookmarks are initialized
      setIsLoading(false);
    }
     // If bookmarks are initialized but allAssets haven't loaded yet, keep isLoading true.
  }, [bookmarkedIds, bookmarksInitialized, allAssets, isLoading]);


  if (isLoading || !bookmarksInitialized) {
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
