
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';

export type Region = 'EU' | 'NA' | 'APAC' | 'CALATAM' | 'GLOBAL';

export const REGIONS: Region[] = ['GLOBAL', 'EU', 'NA', 'APAC', 'CALATAM'];

interface RegionContextType {
  currentRegion: Region;
  setCurrentRegion: (region: Region) => void;
  // For this prototype, URLs are managed visually in settings, not in context for global state
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [currentRegion, setCurrentRegion] = useState<Region>('GLOBAL');

  const value = useMemo(() => ({
    currentRegion,
    setCurrentRegion,
  }), [currentRegion]);

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}
