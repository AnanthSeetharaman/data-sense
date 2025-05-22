
import { NextResponse } from 'next/server';
import Snowflake from 'snowflake-sdk';
import type { ConnectionOptions, Statement } from 'snowflake-sdk';
import type { DataAsset } from '@/lib/types';

// Helper function to execute Snowflake queries
async function executeQuery(connection: Snowflake.Connection, sqlText: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error(`Failed to execute Snowflake query: ${sqlText}`, err);
          return reject(err);
        }
        if (!stmt) {
            return reject(new Error("Snowflake statement is undefined after execution."));
        }
        // For SELECT queries, rows are usually fetched via streamRows
        // However, for simple queries that return few rows (like COUNT(*)), 'rows' might be populated
        if (rows && rows.length > 0) {
          return resolve(rows);
        }
        
        // Stream rows for SELECT queries that return potentially many rows
        const data: any[] = [];
        const stream = stmt.streamRows();
        stream.on('error', (errStream) => {
          console.error('Snowflake stream error:', errStream);
          reject(errStream);
        });
        stream.on('data', (row) => {
          data.push(row);
        });
        stream.on('end', () => {
          resolve(data);
        });
      },
    });
  });
}

async function getColumnCount(connection: Snowflake.Connection, catalog: string, schema: string, tableName: string): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS column_count 
    FROM ${catalog}.INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_CATALOG = '${catalog}' 
      AND TABLE_SCHEMA = '${schema}' 
      AND TABLE_NAME = '${tableName}';`;
  try {
    const rows = await executeQuery(connection, sql);
    return rows[0] && rows[0].COLUMN_COUNT ? Number(rows[0].COLUMN_COUNT) : 0;
  } catch (error) {
    console.error(`Failed to get column count for ${catalog}.${schema}.${tableName}:`, error);
    return 0; // Default to 0 if count fails
  }
}

export async function GET() {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
  const database = process.env.SNOWFLAKE_DATABASE; // Used to filter in the query

  if (!account || !username || !password || !warehouse || !database) {
    return NextResponse.json(
      { error: 'Snowflake environment variables are not fully configured.' },
      { status: 500 }
    );
  }

  if (process.env.SNOWFLAKE_AUTHENTICATOR?.toUpperCase() === 'EXTERNALBROWSER') {
    return NextResponse.json(
      { error: 'EXTERNALBROWSER authenticator is not supported for API routes. Please use username/password or key-pair auth for server-side connections.' },
      { status: 501 } // Not Implemented
    );
  }

  const connectionOptions: ConnectionOptions = {
    account,
    username,
    password,
    warehouse,
    database, // Set database context for the connection
  };
  if (process.env.SNOWFLAKE_SCHEMA) {
    connectionOptions.schema = process.env.SNOWFLAKE_SCHEMA;
  }
  if (process.env.SNOWFLAKE_REGION && account && !account.includes('.')) {
      connectionOptions.region = process.env.SNOWFLAKE_REGION;
  }


  const connection = Snowflake.createConnection(connectionOptions);

  try {
    await new Promise<void>((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) {
          console.error('Snowflake connection error:', err);
          return reject(new Error(`Snowflake Connection Error: ${err.message}`));
        }
        resolve();
      });
    });

    const mainQuery = `
      SELECT 
          t.table_catalog,
          t.table_schema,
          t.table_name,
          t.table_type,
          t.comment AS description,
          t.created,
          t.last_altered AS last_modified,
          t.row_count,
          t.bytes,
          t.clustering_key,
          ar.role_name AS owner_role 
      FROM 
          ${database}.information_schema.tables t
      LEFT JOIN 
          ${database}.information_schema.applicable_roles ar 
          ON t.owner_role_type = 'ROLE' AND t.owner = ar.role_name 
          -- Simpler join for owner, might need adjustment based on actual Snowflake setup for ownership tracking
          -- Or use CURRENT_ROLE() logic if a single role perspective is sufficient
      WHERE 
          t.table_schema NOT IN ('INFORMATION_SCHEMA', 'PUBLIC') -- Exclude default/meta schemas
          AND t.table_catalog = '${database}' -- Filter by the database from .env
          AND t.table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY 
          t.table_schema, t.table_name;
    `;

    const tablesData = await executeQuery(connection, mainQuery);

    const dataAssets: DataAsset[] = [];

    for (const row of tablesData) {
      const catalog = row.TABLE_CATALOG;
      const schema = row.TABLE_SCHEMA;
      const tableName = row.TABLE_NAME;
      const fullLocation = `${catalog}.${schema}.${tableName}`;

      const columnCount = await getColumnCount(connection, catalog, schema, tableName);
      
      // Ensure dates are ISO strings
      const createdAt = row.CREATED ? new Date(row.CREATED).toISOString() : undefined;
      const lastModified = row.LAST_MODIFIED ? new Date(row.LAST_MODIFIED).toISOString() : undefined;

      dataAssets.push({
        id: fullLocation, // Use full path as ID
        source: 'Snowflake',
        name: tableName,
        location: fullLocation,
        columnCount: columnCount,
        sampleRecordCount: row.ROW_COUNT ? Number(row.ROW_COUNT) : undefined,
        description: row.DESCRIPTION || undefined,
        owner: row.OWNER_ROLE || undefined,
        isSensitive: false, // Default, as not available from this query
        lastModified: lastModified,
        created_at: createdAt,
        updated_at: lastModified, // Using last_modified for updated_at
        rawSchemaForAI: "Schema details not fetched in this overview.", // Placeholder
        rawQuery: `SELECT * FROM ${fullLocation} LIMIT 100;`, // Example query
        schema: [], // Placeholder
        tags: [],   // Placeholder
        businessGlossaryTerms: [], // Placeholder
        lineage: [], // Placeholder
      });
    }

    return NextResponse.json(dataAssets);

  } catch (error: any) {
    console.error('API error fetching Snowflake assets:', error);
    return NextResponse.json(
      { error: `Failed to fetch Snowflake assets: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    if (connection && connection.isUp()) {
      connection.destroy((err, conn) => {
        if (err) {
          console.error('Error destroying Snowflake connection:', err);
        }
      });
    }
  }
}
