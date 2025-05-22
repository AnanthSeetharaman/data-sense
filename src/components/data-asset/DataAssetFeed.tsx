
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataAsset } from '@/lib/types';
import { DataAssetCard } from './DataAssetCard';
import { SearchInput } from '@/components/common/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2, Filter as FilterIcon } from "lucide-react";
import { useFilters, type FilterValues } from '@/contexts/FilterContext';

interface DataAssetFeedProps {
  initialAssets: DataAsset[];
}

export function DataAssetFeed({ initialAssets }: DataAssetFeedProps) {
  const { appliedFilters, filtersApplied } = useFilters();
  const [displayedAssets, setDisplayedAssets] = useState<DataAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  const fetchData = useCallback(async (currentFilters: FilterValues) => {
    setIsLoading(true);
    setError(null);
    setDisplayedAssets([]);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
    let fetchedData: DataAsset[] = [];

    try {
      if (currentFilters.sources.Snowflake) {
        const response = await fetch(`${apiUrl}/api/snowflake-assets`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch Snowflake assets: ${response.statusText}`);
        }
        fetchedData = await response.json();
      } else {
        let csvApiUrl = `${apiUrl}/api/csv-assets`;
        // This part could be enhanced to pass specific source filters to the API
        // For now, we fetch all CSV assets if Snowflake is not selected.
        const response = await fetch(csvApiUrl);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch CSV assets: ${response.statusText}`);
        }
        let csvAssets: DataAsset[] = await response.json();

        // Client-side filter by selected non-Snowflake sources if any are checked
        const activeNonSnowflakeSources = Object.entries(currentFilters.sources)
          .filter(([source, isActive]) => source !== 'Snowflake' && isActive)
          .map(([source]) => source);

        if (activeNonSnowflakeSources.length > 0) {
            csvAssets = csvAssets.filter(asset => 
                activeNonSnowflakeSources.includes(asset.source)
            );
        }
        fetchedData = csvAssets;
      }

      // Client-side tag filtering
      if (currentFilters.tags) {
        const filterTags = currentFilters.tags.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
        if (filterTags.length > 0) {
          fetchedData = fetchedData.filter(asset =>
            filterTags.some(ft =>
              asset.name.toLowerCase().includes(ft) ||
              (asset.description && asset.description.toLowerCase().includes(ft)) ||
              (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(ft))) ||
              (asset.location && asset.location.toLowerCase().includes(ft))
            )
          );
        }
      }
      setDisplayedAssets(fetchedData);

    } catch (e: any) {
      setError(e.message || "An error occurred while fetching data assets.");
      setDisplayedAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    if (filtersApplied && appliedFilters) {
      fetchData(appliedFilters);
    } else if (!filtersApplied) {
      setDisplayedAssets([]); 
      setError(null);
    }
  }, [appliedFilters, filtersApplied, fetchData]);


  const locallyFilteredAndSortedAssets = useMemo(() => {
    let assets = [...displayedAssets];

    if (searchTerm) {
      assets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
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
  }, [displayedAssets, searchTerm, sortBy]);


  if (!filtersApplied && !isLoading) {
    return (
      <Alert className="mt-6">
        <FilterIcon className="h-4 w-4" />
        <AlertTitle>No Filters Applied</AlertTitle>
        <AlertDescription>
          Please select filters from the sidebar and click "Apply Filters" to discover data assets.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading data assets...</p>
      </div>
    );
  }

  if (error) {
     return (
        <Alert variant="destructive" className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Loading Assets</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
     );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-grow w-full sm:w-auto">
          <SearchInput
            placeholder="Search within results by name, description, tags..."
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

      {locallyFilteredAndSortedAssets.length === 0 ? (
         <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Data Assets Found</AlertTitle>
            <AlertDescription>
              No assets match your current filter criteria. Try adjusting your filters or check if the selected data source is available.
            </AlertDescription>
          </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {locallyFilteredAndSortedAssets.map(asset => (
            <DataAssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
