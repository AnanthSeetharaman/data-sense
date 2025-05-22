
import { NextResponse } from 'next/server';
import Snowflake from 'snowflake-sdk';
import type { ConnectionOptions } from 'snowflake-sdk';
import type { DataAsset, ColumnSchema } from '@/lib/types';

async function executeQuery(connection: Snowflake.Connection, sqlText: string, binds?: any[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!connection || !connection.execute) {
      console.error('Snowflake executeQuery: Connection object or execute method is undefined.');
      return reject(new Error('Snowflake connection object or execute method is undefined.'));
    }
    connection.execute({
      sqlText,
      binds,
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

interface AssetDetailParams {
  params: {
    db: string;
    schema: string;
    table: string;
  };
}

export async function GET(request: Request, { params }: AssetDetailParams) {
  const { db, schema, table } = params;
  const assetId = `${db}.${schema}.${table}`;

  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
  
  if (!account || !username || !password || !warehouse) {
    console.error("Snowflake API (Asset Detail): Environment variables not fully configured.");
    return NextResponse.json({ error: 'Snowflake environment variables missing.' }, { status: 500 });
  }
  if (process.env.SNOWFLAKE_AUTHENTICATOR?.toUpperCase() === 'EXTERNALBROWSER') {
    return NextResponse.json({ error: 'EXTERNALBROWSER authenticator not supported for API routes.' }, { status: 501 });
  }

  const connectionOptions: ConnectionOptions = { account, username, password, warehouse, database: db, schema };
   if (process.env.SNOWFLAKE_REGION && account && !account.includes('.')) {
      connectionOptions.region = process.env.SNOWFLAKE_REGION;
  }

  let connection: Snowflake.Connection | null = null;

  try {
    try {
      connection = Snowflake.createConnection(connectionOptions);
    } catch (createError: any) {
      console.error('Snowflake API (Asset Detail): Error creating connection object:', createError);
      return NextResponse.json({ error: `Failed to create Snowflake connection: ${createError.message}` }, { status: 500 });
    }
    if (!connection) throw new Error('Failed to initialize Snowflake connection object.');

    await new Promise<void>((resolve, reject) => {
      connection!.connect((err) => err ? reject(err) : resolve());
    });

    // 1. Fetch table details
    const tableDetailQuery = `
      SELECT 
        t.table_type,
        t.comment AS description,
        t.created,
        t.last_altered AS last_modified,
        t.row_count,
        t.bytes,
        t.table_owner AS owner
      FROM "${db}".INFORMATION_SCHEMA.TABLES t
      WHERE t.table_catalog = ? AND t.table_schema = ? AND t.table_name = ?;
    `;
    const tableDetailsRows = await executeQuery(connection, tableDetailQuery, [db, schema, table]);

    if (tableDetailsRows.length === 0) {
      return NextResponse.json({ error: `Asset ${assetId} not found.` }, { status: 404 });
    }
    const tableDetail = tableDetailsRows[0];

    // 2. Fetch column schemas
    const columnSchemaQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        comment AS description 
      FROM "${db}".INFORMATION_SCHEMA.COLUMNS
      WHERE table_catalog = ? AND table_schema = ? AND table_name = ?
      ORDER BY ordinal_position;
    `;
    const columnSchemaRows = await executeQuery(connection, columnSchemaQuery, [db, schema, table]);
    const columns: ColumnSchema[] = columnSchemaRows.map(row => ({
      data_asset_id: assetId,
      column_name: row.COLUMN_NAME,
      data_type: row.DATA_TYPE,
      is_nullable: row.IS_NULLABLE === 'YES',
      description: row.DESCRIPTION || undefined,
    }));
    
    const rawSchemaForAI = columns.map(c => `${c.column_name}:${c.data_type}`).join(', ');

    const assetData: DataAsset = {
      id: assetId,
      source: 'Snowflake',
      name: table,
      location: assetId,
      description: tableDetail.DESCRIPTION || undefined,
      columnCount: columns.length,
      sampleRecordCount: tableDetail.ROW_COUNT ? Number(tableDetail.ROW_COUNT) : undefined,
      owner: tableDetail.OWNER || undefined,
      lastModified: tableDetail.LAST_MODIFIED ? new Date(tableDetail.LAST_MODIFIED).toISOString() : undefined,
      created_at: tableDetail.CREATED ? new Date(tableDetail.CREATED).toISOString() : undefined,
      schema: columns,
      rawSchemaForAI: rawSchemaForAI,
      rawQuery: `SELECT * FROM "${db}"."${schema}"."${table}" LIMIT 100;`,
      tags: [], // Application-specific metadata, not from INFORMATION_SCHEMA
      businessGlossaryTerms: [], // Same as tags
      lineage: [], // To be fetched by a separate endpoint
      isSensitive: false, // This would require deeper analysis or manual tagging
    };

    return NextResponse.json(assetData);

  } catch (error: any) {
    console.error(`API error fetching details for ${assetId}:`, error);
    return NextResponse.json({ error: `Failed to fetch asset details: ${error.message}` }, { status: 500 });
  } finally {
    if (connection && connection.isUp()) {
      connection.destroy((err) => {
        if (err) console.error('Error destroying Snowflake connection:', err);
      });
    }
  }
}
