
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataAsset } from '@/lib/types';
import { DataAssetCard } from './DataAssetCard';
import { SearchInput } from '@/components/common/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2, Filter as FilterIcon } from "lucide-react";
import { useFilters, type FilterValues, type DataSourceType } from '@/contexts/FilterContext';
import { useRegion } from '@/contexts/RegionContext';

interface DataAssetFeedProps {
  initialAssets: DataAsset[]; // Will be empty
}

export function DataAssetFeed({ initialAssets }: DataAssetFeedProps) {
  const { appliedFilters, filtersApplied } = useFilters();
  const { currentRegion } = useRegion();
  const [displayedAssets, setDisplayedAssets] = useState<DataAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  const fetchData = useCallback(async (currentFilters: FilterValues) => {
    setIsLoading(true);
    setError(null);
    setDisplayedAssets([]);

    if (!currentFilters.source) {
      setError("No data source selected. Please select a source and apply filters.");
      setIsLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
    let fetchedData: DataAsset[] = [];
    let fetchUrl = '';

    try {
      console.log(`DataAssetFeed: Fetching data for source: ${currentFilters.source}, region: ${currentRegion}`);
      if (currentFilters.source === 'Snowflake') {
        fetchUrl = `${apiUrl}/api/snowflake-assets`;
        console.log(`DataAssetFeed: Using Snowflake API URL: ${fetchUrl}`);
      } else if (currentFilters.source === 'MetaStore') {
        fetchUrl = `${apiUrl}/api/csv-assets`;
        console.log(`DataAssetFeed: Using MetaStore (CSV) API URL: ${fetchUrl}`);
      } else {
        const unsupportedSourceError = `Unsupported data source: ${currentFilters.source}`;
        console.error("DataAssetFeed: " + unsupportedSourceError);
        setError(unsupportedSourceError);
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        let errData: { error?: string } = { error: `HTTP error ${response.status}` };
        try {
          errData = await response.json();
        } catch (parseError) {
          console.error("DataAssetFeed: Failed to parse JSON error response from API", { fetchUrl, status: response.status, parseError });
          // errData remains as the default HTTP error
        }
        const apiErrorMessage = errData?.error || `Failed to fetch ${currentFilters.source} assets: ${response.statusText || response.status}`;
        console.error("DataAssetFeed: API request failed", { fetchUrl, status: response.status, statusText: response.statusText, responseBody: errData });
        throw new Error(apiErrorMessage);
      }

      fetchedData = await response.json();
      console.log(`DataAssetFeed: Successfully fetched ${fetchedData.length} assets from ${fetchUrl}`);

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
      console.error("DataAssetFeed fetchData error:", e);
      console.error("DataAssetFeed e.message:", e.message);
      const errorMessage = e.message || `An error occurred while fetching ${currentFilters.source || 'assets'}. Check console for details.`;
      setError(errorMessage);
      setDisplayedAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentRegion]);


  useEffect(() => {
    if (filtersApplied && appliedFilters) {
      if (appliedFilters.source) {
        fetchData(appliedFilters);
      } else {
        setDisplayedAssets([]);
        setError(null);
      }
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
          Please select a data source and any desired tags from the sidebar, then click "Apply Filters" to discover data assets.
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

  if (error) { // This 'error' is the state variable
     return (
        <Alert variant="destructive" className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Loading Assets</AlertTitle> {/* This is the title */}
            <AlertDescription>{error}</AlertDescription> {/* This is the 'error' state content */}
        </Alert>
     );
  }
  
  if (filtersApplied && (!appliedFilters?.source && !isLoading && !error)) {
     return (
      <Alert className="mt-6">
        <FilterIcon className="h-4 w-4" />
        <AlertTitle>Select a Data Source</AlertTitle>
        <AlertDescription>
          Please select a data source (MetaStore or Snowflake [ LIVE ]) and click "Apply Filters" to view assets.
        </AlertDescription>
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
              No assets match your current filter criteria for the selected source ({appliedFilters?.source || 'N/A'}). Try adjusting your filters or ensuring the source is available.
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

