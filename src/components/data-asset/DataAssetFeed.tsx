
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { DataAsset } from '@/lib/types';
import { DataAssetCard } from './DataAssetCard';
import { SearchInput } from '@/components/common/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface DataAssetFeedProps {
  initialAssets: DataAsset[];
}

export function DataAssetFeed({ initialAssets }: DataAssetFeedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  // Filters would be managed here, e.g. selected sources, tags from AppShell context or props

  // Simulate loading state
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500); // Simulate network delay
    return () => clearTimeout(timer);
  }, []);


  const filteredAndSortedAssets = useMemo(() => {
    let assets = [...initialAssets];

    // Search functionality
    if (searchTerm) {
      assets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        asset.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting functionality
    assets.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'lastModified-desc':
          return new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime();
        case 'lastModified-asc':
          return new Date(a.lastModified || 0).getTime() - new Date(b.lastModified || 0).getTime();
        default:
          return 0;
      }
    });

    return assets;
  }, [initialAssets, searchTerm, sortBy]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-card p-4 rounded-lg shadow-md animate-pulse">
            <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-16 bg-muted rounded mb-4"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-grow w-full sm:w-auto">
          <SearchInput
            placeholder="Search by name, description, tags, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="lastModified-desc">Last Modified (Newest)</SelectItem>
              <SelectItem value="lastModified-asc">Last Modified (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAndSortedAssets.length === 0 ? (
         <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Data Assets Found</AlertTitle>
            <AlertDescription>
              Try adjusting your search or filter criteria.
            </AlertDescription>
          </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredAndSortedAssets.map(asset => (
            <DataAssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
