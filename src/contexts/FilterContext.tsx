
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { DataAsset } from '@/lib/types'; // Assuming DataAsset type is needed or can be generic

export interface FilterValues {
  sources: {
    Hive: boolean;
    ADLS: boolean;
    Snowflake: boolean;
  };
  tags: string; // Comma-separated string or implement more complex tag filtering
}

interface FilterContextType {
  appliedFilters: FilterValues | null;
  filtersApplied: boolean;
  applyFilters: (filters: FilterValues) => void;
  clearFilters: () => void; // Optional: for a reset functionality
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [appliedFilters, setAppliedFilters] = useState<FilterValues | null>(null);
  const [filtersApplied, setFiltersApplied] = useState<boolean>(false);

  const applyFilters = useCallback((filters: FilterValues) => {
    setAppliedFilters(filters);
    setFiltersApplied(true);
  }, []);

  const clearFilters = useCallback(() => {
    setAppliedFilters(null);
    setFiltersApplied(false);
    // Potentially reset UI filter selections in AppShell if needed via another callback
  }, []);

  const value = useMemo(() => ({
    appliedFilters,
    filtersApplied,
    applyFilters,
    clearFilters,
  }), [appliedFilters, filtersApplied, applyFilters, clearFilters]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
