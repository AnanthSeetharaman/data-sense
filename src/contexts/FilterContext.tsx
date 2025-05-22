
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

// Define the types for the data sources
export type DataSourceType = 'MetaStore' | 'Snowflake';

export interface FilterValues {
  source: DataSourceType | null; // A single source or null if none selected
  tags: string; 
}

interface FilterContextType {
  appliedFilters: FilterValues | null;
  filtersApplied: boolean;
  applyFilters: (filters: FilterValues) => void;
  clearFilters: () => void;
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
    setAppliedFilters({ source: null, tags: '' }); // Reset to a defined state
    setFiltersApplied(false);
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
