
import type { 
  DataAsset, 
  DataAssetCsv, 
  ColumnSchema, 
  TagCsv, 
  DataAssetTagCsv,
  BusinessGlossaryTermCsv,
  DataAssetBusinessGlossaryTermCsv,
  RawLineageEntry,
  User,
  BookmarkedDataAssetCsv
} from './types';
import { fetchAndParseCsv, type ParseCsvResult } from './csv-utils';

const DB_MOCK_DATA_PATH = '/db_mock_data';

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
  tagsCsv?: TagCsv[];
  dataAssetTagsCsv?: DataAssetTagCsv[];
  businessGlossaryTermsCsv?: BusinessGlossaryTermCsv[];
  dataAssetBusinessGlossaryTermsCsv?: DataAssetBusinessGlossaryTermCsv[];
  lineageEntries?: RawLineageEntry[];
  users?: User[];
  bookmarks?: BookmarkedDataAssetCsv[];
} | null = null;

async function loadAllCsvData() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const [
      dataAssetsResult,
      columnSchemasResult,
      tagsResult,
      dataAssetTagsResult,
      glossaryTermsResult,
      dataAssetGlossaryTermsResult,
      lineageResult,
      usersResult,
      bookmarksResult,
    ] = await Promise.all([
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/data_assets.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/column_schemas.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/tags.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/data_asset_tags.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/business_glossary_terms.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/data_asset_business_glossary_terms.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/data_asset_lineage_raw.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/users.csv`),
      fetchAndParseCsv(`${DB_MOCK_DATA_PATH}/bookmarked_data_assets.csv`),
    ]);

    cachedDb = {
      dataAssetsCsv: dataAssetsResult.data as DataAssetCsv[],
      columnSchemas: columnSchemasResult.data as ColumnSchema[],
      tagsCsv: tagsResult.data as TagCsv[],
      dataAssetTagsCsv: dataAssetTagsResult.data as DataAssetTagCsv[],
      businessGlossaryTermsCsv: glossaryTermsResult.data as BusinessGlossaryTermCsv[],
      dataAssetBusinessGlossaryTermsCsv: dataAssetGlossaryTermsResult.data as DataAssetBusinessGlossaryTermCsv[],
      lineageEntries: lineageResult.data as RawLineageEntry[],
      users: usersResult.data as User[],
      bookmarks: bookmarksResult.data as BookmarkedDataAssetCsv[],
    };
    return cachedDb;
  } catch (error) {
    console.error("Error loading one or more CSV data files:", error);
    cachedDb = {}; // Set to empty to avoid retrying indefinitely on partial success / error
    return cachedDb; // Return empty object or throw? For now, return empty.
  }
}


export async function getAllDataAssets(): Promise<DataAsset[]> {
  const db = await loadAllCsvData();
  if (!db || !db.dataAssetsCsv) return [];

  return db.dataAssetsCsv.map(assetCsv => {
    const schema = db.columnSchemas?.filter(cs => cs.data_asset_id === assetCsv.id) || [];
    
    const assetTagIds = db.dataAssetTagsCsv
      ?.filter(dat => dat.data_asset_id === assetCsv.id)
      .map(dat => dat.tag_id) || [];
    const tags = db.tagsCsv
      ?.filter(tag => assetTagIds.includes(tag.id))
      .map(tag => tag.name) || [];

    const assetTermIds = db.dataAssetBusinessGlossaryTermsCsv
      ?.filter(dabt => dabt.data_asset_id === assetCsv.id)
      .map(dabt => dabt.term_id) || [];
    const businessGlossaryTerms = db.businessGlossaryTermsCsv
      ?.filter(term => assetTermIds.includes(term.id))
      .map(term => term.name) || [];

    const lineage = db.lineageEntries
      ?.filter(le => le.REFERENCED_OBJECT_ID === assetCsv.id || le.REFERENCING_OBJECT_ID === assetCsv.id) || [];

    return {
      ...assetCsv,
      columnCount: parseInt(assetCsv.column_count, 10) || 0,
      sampleRecordCount: assetCsv.sample_record_count ? parseInt(assetCsv.sample_record_count, 10) : undefined,
      isSensitive: assetCsv.is_sensitive?.toLowerCase() === 'true',
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

// Note: Bookmarking functionality still primarily uses localStorage via useBookmarks hook.
// This function is for potentially displaying 'DB-backed' bookmarks if needed elsewhere.
export async function getBookmarkedAssetIdsByUserId(userId: string): Promise<string[]> {
  const db = await loadAllCsvData();
  if (!db || !db.bookmarks) return [];
  return db.bookmarks.filter(b => b.user_id === userId).map(b => b.data_asset_id);
}

export async function getAllUsers(): Promise<User[]> {
  const db = await loadAllCsvData();
  return db?.users || [];
}

// Function to clear the cache, useful for development or if data needs to be reloaded
export function clearCsvCache() {
  cachedDb = null;
}
