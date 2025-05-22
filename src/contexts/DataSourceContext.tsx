
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';

export type SampleDataSourceType = 'pg' | 'local_csv';

interface DataSourceContextType {
  preferredSampleSource: SampleDataSourceType;
  setPreferredSampleSource: (source: SampleDataSourceType) => void;
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [preferredSampleSource, setPreferredSampleSource] = useState<SampleDataSourceType>('pg');

  const value = useMemo(() => ({
    preferredSampleSource,
    setPreferredSampleSource,
  }), [preferredSampleSource]);

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
}
