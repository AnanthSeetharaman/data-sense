
export type DataSource = 'Hive' | 'ADLS' | 'Snowflake';

export interface ColumnSchema {
  // id?: number; // CSV row number or generated if needed
  data_asset_id: string; 
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  description?: string;
}

export interface RawLineageEntry {
  REFERENCED_DATABASE?: string;
  REFERENCED_SCHEMA?: string;
  REFERENCED_OBJECT_NAME?: string;
  REFERENCED_OBJECT_ID: string;
  REFERENCED_OBJECT_DOMAIN?: string;
  REFERENCING_DATABASE?: string;
  REFERENCING_SCHEMA?: string;
  REFERENCING_OBJECT_NAME?: string;
  REFERENCING_OBJECT_ID: string;
  REFERENCING_OBJECT_DOMAIN?: string;
  DEPENDENCY_TYPE?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface TagCsv {
  id: string; // Changed to string to match typical CSV parsing
  name: string;
}

export interface DataAssetTagCsv {
  data_asset_id: string;
  tag_id: string; // Changed to string
}

export interface BusinessGlossaryTermCsv {
  id: string; // Changed to string
  name: string;
}

export interface DataAssetBusinessGlossaryTermCsv {
  data_asset_id: string;
  term_id: string; // Changed to string
}

export interface BookmarkedDataAssetCsv {
  user_id: string;
  data_asset_id: string;
  bookmarked_at: string;
}

// Base DataAsset structure from CSV
export interface DataAssetCsv {
  id: string;
  source: DataSource;
  name: string;
  location: string;
  column_count: string; // CSVs often read numbers as strings initially
  sample_record_count?: string;
  description: string;
  owner?: string;
  is_sensitive?: string; // boolean as string
  last_modified?: string; 
  raw_schema_for_ai: string;
  raw_query?: string;
  csv_path?: string; 
  pg_mocked_sample_data?: string; // JSON string
  created_at?: string;
  updated_at?: string;
}


// Final DataAsset type for the application
export interface DataAsset {
  id: string;
  source: DataSource;
  name:string;
  location: string;
  columnCount: number;
  sampleRecordCount?: number;
  description: string;
  owner?: string;
  isSensitive?: boolean;
  lastModified?: string; 
  rawSchemaForAI: string;
  rawQuery?: string;
  csvPath?: string; 
  
  schema: ColumnSchema[];
  tags: string[]; 
  businessGlossaryTerms?: string[];
  lineage?: RawLineageEntry[]; 
  pgMockedSampleData?: Record<string, any>[];

  created_at?: string;
  updated_at?: string;
}
