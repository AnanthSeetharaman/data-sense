
export type DataSource = 'Hive' | 'ADLS' | 'Snowflake';

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface DataAsset {
  id: string;
  source: DataSource;
  name: string;
  location: string; // e.g., DB.Schema.Table or path for ADLS
  columnCount: number;
  sampleRecordCount?: number; // Optional as not all sources might provide this easily
  description: string;
  tags: string[];
  schema: ColumnSchema[];
  owner?: string;
  businessGlossaryTerms?: string[];
  isSensitive?: boolean; // For PII or sensitive data marking
  lastModified?: string; // ISO date string
  bookmarked?: boolean; // Client-side state, might not be part of core backend data initially
  rawSchemaForAI: string; // String representation of schema for AI model
  lineage?: {
    upstream: string[];
    downstream: string[];
  }; // Placeholder for lineage
  sampleData?: Record<string, any>[]; // Placeholder for sample data from "PG (Mocked)"
  csvPath?: string; // Path to the CSV file in /public for sample data
  rawQuery?: string; // Example query to get this data asset
}
