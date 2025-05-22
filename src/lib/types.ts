
export type DataSource = 'Hive' | 'ADLS' | 'Snowflake';

export interface ColumnSchema {
  // id?: number; // From CSV, or generated
  data_asset_id: string; // Foreign key
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  description?: string;
}

// For the new lineage CSV structure
export interface RawLineageEntry {
  REFERENCED_DATABASE?: string;
  REFERENCED_SCHEMA?: string;
  REFERENCED_OBJECT_NAME?: string;
  REFERENCED_OBJECT_ID: string; // Key for linking, maps to DataAsset.id
  REFERENCED_OBJECT_DOMAIN?: string;
  REFERENCING_DATABASE?: string;
  REFERENCING_SCHEMA?: string;
  REFERENCING_OBJECT_NAME?: string;
  REFERENCING_OBJECT_ID: string; // Key for linking, maps to DataAsset.id
  REFERENCING_OBJECT_DOMAIN?: string;
  DEPENDENCY_TYPE?: string; // e.g., 'DIRECT', 'VIEW_ON_TABLE'
}

export interface User {
  id: string;
  username: string;
  email: string;
  // other user-specific fields
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface Tag {
  id: number;
  name: string;
}

export interface BusinessGlossaryTerm {
  id: number;
  name: string;
}


// Main DataAsset type for the application
export interface DataAsset {
  id: string;
  source: DataSource;
  name:string;
  location: string;
  columnCount: number;
  sampleRecordCount?: number;
  description?: string; // Made optional as it might be null from DB
  owner?: string;
  isSensitive?: boolean;
  lastModified?: string;
  rawSchemaForAI?: string; // Made optional
  rawQuery?: string;
  csvPath?: string;

  schema: ColumnSchema[]; // Will be empty array from this API
  tags: string[]; // Will be empty array from this API
  businessGlossaryTerms?: string[];
  lineage?: RawLineageEntry[];
  pgMockedSampleData?: Record<string, any>[];

  created_at?: string;
  updated_at?: string; // Already optional
}

// For direct CSV parsing, if needed elsewhere
export interface DataAssetCsv {
  id: string;
  source: DataSource;
  name: string;
  location: string;
  column_count: string;
  sample_record_count?: string;
  description: string;
  owner?: string;
  is_sensitive?: string;
  last_modified?: string;
  raw_schema_for_ai: string;
  raw_query?: string;
  csv_path?: string;
  pg_mocked_sample_data?: string;
  created_at?: string;
  updated_at?: string;
}
