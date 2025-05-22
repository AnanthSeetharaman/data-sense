
import type {
  DataAsset,
  DataAssetCsv,
  ColumnSchema,
  // TagCsv, // Changed to Tag
  // DataAssetTagCsv, // No longer directly used here, joined in map
  // BusinessGlossaryTermCsv, // Changed to BusinessGlossaryTerm
  // DataAssetBusinessGlossaryTermCsv, // No longer directly used here
  RawLineageEntry,
  User,
  BookmarkedDataAssetCsv,
  Tag, // Updated type
  BusinessGlossaryTerm // Updated type
} from './types';
// Removed fetchAndParseCsv import, ParseCsvResult is now defined locally for this context
// import { fetchAndParseCsv, type ParseCsvResult } from './csv-utils';

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const DB_MOCK_DATA_PATH = '/db_mock_data'; // Relative to /public directory

// Local ParseCsvResult type for this server-side loader
interface ParseCsvResult {
  data: Record<string, any>[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

// Helper to read file from /public directory and parse it
function readAndParseCsv(filePathInPublic: string): ParseCsvResult {
  const fullPath = path.join(process.cwd(), 'public', filePathInPublic);
  try {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    return {
      data: results.data as Record<string, any>[],
      errors: results.errors,
      meta: results.meta,
    };
  } catch (error) {
    console.error(`Failed to read or parse CSV file at ${fullPath}:`, error);
    // Return an empty structure or throw, depending on desired error handling
    // For now, returning empty to allow partial loading if some files are problematic
    return { data: [], errors: [error as Papa.ParseError], meta: {} as Papa.ParseMeta };
  }
}


// Helper to safely parse JSON from a string, returning null on error
function safeJsonParse<T>(jsonString: string | undefined | null): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error("Failed to parse JSON string:", jsonString, e);
    return null;
  }
}

// Cache for CSV data to avoid re-fetching and re-parsing on every call
let cachedDb: {
  dataAssetsCsv?: DataAssetCsv[];
  columnSchemas?: ColumnSchema[];
  tags?: Tag[]; // Changed from TagCsv
  dataAssetTagsCsv?: { data_asset_id: string; tag_id: number }[]; // Type for join table
  businessGlossaryTerms?: BusinessGlossaryTerm[]; // Changed from BusinessGlossaryTermCsv
  dataAssetBusinessGlossaryTermsCsv?: { data_asset_id: string; term_id: number }[]; // Type for join table
  lineageEntries?: RawLineageEntry[];
  users?: User[];
  bookmarks?: BookmarkedDataAssetCsv[];
} | null = null;

async function loadAllCsvData() {
  if (cachedDb) {
    return cachedDb;
  }

  // Use a try-catch block for the overall loading process
  try {
    const dataAssetsResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/data_assets.csv`);
    const columnSchemasResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/column_schemas.csv`);
    const tagsResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/tags.csv`);
    const dataAssetTagsResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/data_asset_tags.csv`);
    const glossaryTermsResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/business_glossary_terms.csv`);
    const dataAssetGlossaryTermsResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/data_asset_business_glossary_terms.csv`);
    const lineageResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/data_asset_lineage_raw.csv`);
    const usersResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/users.csv`);
    const bookmarksResult = readAndParseCsv(`${DB_MOCK_DATA_PATH}/bookmarked_data_assets.csv`);

    // Basic error check for each parsed file
    const results = {
        dataAssetsCsv: dataAssetsResult.data as DataAssetCsv[],
        columnSchemas: columnSchemasResult.data as ColumnSchema[],
        tags: tagsResult.data as Tag[],
        dataAssetTagsCsv: dataAssetTagsResult.data as { data_asset_id: string; tag_id: number }[],
        businessGlossaryTerms: glossaryTermsResult.data as BusinessGlossaryTerm[],
        dataAssetBusinessGlossaryTermsCsv: dataAssetGlossaryTermsResult.data as { data_asset_id: string; term_id: number }[],
        lineageEntries: lineageResult.data as RawLineageEntry[],
        users: usersResult.data as User[],
        bookmarks: bookmarksResult.data as BookmarkedDataAssetCsv[],
    };
    
    // Check for major parsing errors (e.g., file not found, completely malformed)
    if (dataAssetsResult.errors.some(e => e.code !== 'TooFewFields' && e.code !== 'TooManyFields' && e.code !== 'UndetectableDelimiter')) { // Allow minor structural issues
        throw new Error(`Critical error parsing data_assets.csv: ${JSON.stringify(dataAssetsResult.errors)}`);
    }
    // Add similar checks for other critical CSVs if necessary

    cachedDb = results;
    return cachedDb;

  } catch (error) {
    console.error("Error loading one or more CSV data files:", error);
    cachedDb = {}; 
    return cachedDb; 
  }
}


export async function getAllDataAssets(): Promise<DataAsset[]> {
  const db = await loadAllCsvData();
  if (!db || !db.dataAssetsCsv || db.dataAssetsCsv.length === 0) {
    console.warn("No data assets loaded or dataAssetsCsv is empty.");
    return [];
  }

  return db.dataAssetsCsv.map(assetCsv => {
    const schema = db.columnSchemas?.filter(cs => cs.data_asset_id === assetCsv.id) || [];
    
    const assetTagIds = db.dataAssetTagsCsv
      ?.filter(dat => dat.data_asset_id === assetCsv.id)
      .map(dat => dat.tag_id) || [];
    const tags = db.tags
      ?.filter(tag => assetTagIds.includes(tag.id))
      .map(tag => tag.name) || [];

    const assetTermIds = db.dataAssetBusinessGlossaryTermsCsv
      ?.filter(dabt => dabt.data_asset_id === assetCsv.id)
      .map(dabt => dabt.term_id) || [];
    const businessGlossaryTerms = db.businessGlossaryTerms
      ?.filter(term => assetTermIds.includes(term.id))
      .map(term => term.name) || [];

    const lineage = db.lineageEntries
      ?.filter(le => le.REFERENCED_OBJECT_ID === assetCsv.id || le.REFERENCING_OBJECT_ID === assetCsv.id) || [];

    let isSensitiveValue = false;
    if (typeof assetCsv.is_sensitive === 'string') {
      isSensitiveValue = assetCsv.is_sensitive.toLowerCase() === 'true';
    } else if (typeof assetCsv.is_sensitive === 'boolean') {
      isSensitiveValue = assetCsv.is_sensitive;
    }

    return {
      ...assetCsv,
      columnCount: parseInt(String(assetCsv.column_count), 10) || 0, // Ensure string conversion
      sampleRecordCount: assetCsv.sample_record_count ? parseInt(String(assetCsv.sample_record_count), 10) : undefined,
      isSensitive: isSensitiveValue,
      schema,
      tags,
      businessGlossaryTerms,
      lineage,
      pgMockedSampleData: safeJsonParse<Record<string, any>[]>(assetCsv.pg_mocked_sample_data),
    };
  });
}

export async function getDataAssetById(id: string): Promise<DataAsset | undefined> {
  const assets = await getAllDataAssets();
  return assets.find(asset => asset.id === id);
}

export async function getBookmarkedAssetIdsByUserId(userId: string): Promise<string[]> {
  const db = await loadAllCsvData();
  if (!db || !db.bookmarks) return [];
  return db.bookmarks.filter(b => b.user_id === userId).map(b => b.data_asset_id);
}

export async function getAllUsers(): Promise<User[]> {
  const db = await loadAllCsvData();
  return db?.users || [];
}

export function clearCsvCache() {
  cachedDb = null;
}
