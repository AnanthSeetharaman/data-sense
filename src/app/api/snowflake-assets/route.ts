
import { NextResponse } from 'next/server';
import Snowflake from 'snowflake-sdk';
import type { ConnectionOptions, Statement } from 'snowflake-sdk';
import type { DataAsset } from '@/lib/types';

// Helper function to execute Snowflake queries
async function executeQuery(connection: Snowflake.Connection, sqlText: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!connection || !connection.execute) {
      console.error('Snowflake executeQuery: Connection object or execute method is undefined.');
      return reject(new Error('Snowflake connection object or execute method is undefined.'));
    }
    connection.execute({
      sqlText,
      complete: (err, stmt, rows_from_execute) => { 
        if (err) {
          console.error(`Failed to execute Snowflake query: ${sqlText}`, err);
          return reject(err);
        }
        if (!stmt) {
            console.error("Snowflake execute callback: Statement object (stmt) is undefined/null.");
            return reject(new Error("Snowflake statement is undefined after execution."));
        }
        
        const data: any[] = [];
        try {
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
        } catch (streamError) {
            console.error('Error setting up or during Snowflake streamRows:', streamError);
            reject(streamError);
        }
      },
    });
  });
}

async function getColumnCount(connection: Snowflake.Connection, catalog: string, schema: string, tableName: string): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS column_count
    FROM "${catalog.replace(/"/g, '""')}".INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_CATALOG = '${catalog.replace(/'/g, "''")}'
      AND TABLE_SCHEMA = '${schema.replace(/'/g, "''")}'
      AND TABLE_NAME = '${tableName.replace(/'/g, "''")}';`;
  try {
    const rows = await executeQuery(connection, sql);
    return rows[0] && rows[0].COLUMN_COUNT ? Number(rows[0].COLUMN_COUNT) : 0;
  } catch (error) {
    console.error(`Failed to get column count for ${catalog}.${schema}.${tableName}:`, error);
    return 0; 
  }
}

export async function GET() {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
  const database = process.env.SNOWFLAKE_DATABASE; 

  if (!account || !username || !password || !warehouse || !database) {
    console.error("Snowflake API: Environment variables not fully configured.");
    return NextResponse.json(
      { error: 'Snowflake environment variables are not fully configured. Ensure SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD, SNOWFLAKE_WAREHOUSE, and SNOWFLAKE_DATABASE are set.' },
      { status: 500 }
    );
  }

  if (process.env.SNOWFLAKE_AUTHENTICATOR?.toUpperCase() === 'EXTERNALBROWSER') {
    console.warn("Snowflake API: EXTERNALBROWSER authenticator is not supported for this API route.");
    return NextResponse.json(
      { error: 'EXTERNALBROWSER authenticator is not supported for API routes. Please use username/password or key-pair auth for server-side connections.' },
      { status: 501 } 
    );
  }

  const connectionOptions: ConnectionOptions = {
    account,
    username,
    password,
    warehouse,
    database, // Set default database for the connection
  };
  if (process.env.SNOWFLAKE_SCHEMA) {
    connectionOptions.schema = process.env.SNOWFLAKE_SCHEMA;
  }
  if (process.env.SNOWFLAKE_REGION && account && !account.includes('.')) {
      connectionOptions.region = process.env.SNOWFLAKE_REGION;
  }

  let connection: Snowflake.Connection | null = null;
  try {
    connection = Snowflake.createConnection(connectionOptions);
  } catch (createError: any) {
    console.error('Snowflake API: Error creating connection object:', createError);
    return NextResponse.json(
      { error: `Failed to create Snowflake connection object: ${createError.message || 'Unknown error during connection object creation.'}` },
      { status: 500 }
    );
  }

  if (!connection) {
    console.error('Snowflake API: Connection object is null after creation attempt.');
     return NextResponse.json(
      { error: 'Failed to initialize Snowflake connection object.' },
      { status: 500 }
    );
  }

  try {
    await new Promise<void>((resolve, reject) => {
      if (!connection) { 
          console.error('Snowflake API: Connection is null before connect call.');
          return reject(new Error('Snowflake connection is null before connect.'));
      }
      connection.connect((err, conn) => {
        if (err) {
          console.error('Snowflake API: Connection error:', err);
          return reject(new Error(`Snowflake Connection Error: ${err.message}`));
        }
        resolve();
      });
    });

    const dbFilter = database.replace(/'/g, "''"); 

    const mainQuery = `
      SELECT
          t.table_catalog,
          t.table_schema,
          t.table_name,
          t.table_type,
          t.comment AS description,
          t.created,
          t.last_altered AS last_modified,
          t.TABLE_OWNER AS owner_role, -- Corrected to TABLE_OWNER
          t.clustering_key,
          t.row_count,
          t.bytes
      FROM
          "${dbFilter}".information_schema.tables t
      WHERE
          t.table_schema NOT IN ('INFORMATION_SCHEMA', 'PUBLIC')
          AND t.table_catalog = '${dbFilter}' 
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

      const createdAt = row.CREATED ? new Date(row.CREATED).toISOString() : undefined;
      const lastModified = row.LAST_MODIFIED ? new Date(row.LAST_MODIFIED).toISOString() : undefined;

      dataAssets.push({
        id: fullLocation,
        source: 'Snowflake',
        name: tableName,
        location: fullLocation,
        columnCount: columnCount,
        sampleRecordCount: row.ROW_COUNT ? Number(row.ROW_COUNT) : undefined,
        description: row.DESCRIPTION || undefined,
        owner: row.OWNER_ROLE || undefined,
        isSensitive: false, 
        lastModified: lastModified,
        created_at: createdAt,
        updated_at: lastModified, // Using lastModified for updated_at as well
        rawSchemaForAI: "Schema details not fetched in this overview.", // Placeholder
        rawQuery: `SELECT * FROM "${fullLocation.replace(/"/g, '""')}" LIMIT 100;`,
        schema: [], 
        tags: [], 
        businessGlossaryTerms: [], 
        lineage: [], 
      });
    }

    return NextResponse.json(dataAssets);

  } catch (error: any) {
    console.error('API error fetching Snowflake assets:', error);
    const errorMessage = error.message || 'An unknown error occurred while fetching Snowflake assets.';
    return NextResponse.json(
      { error: `Failed to fetch Snowflake assets: ${errorMessage}` },
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
