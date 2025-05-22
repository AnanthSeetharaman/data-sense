
import { NextResponse } from 'next/server';
import Snowflake from 'snowflake-sdk';
import type { ConnectionOptions } from 'snowflake-sdk';
import type { RawLineageEntry } from '@/lib/types';

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

interface LineageParams {
  params: {
    db: string;
    schema: string;
    table: string;
  };
}

export async function GET(request: Request, { params }: LineageParams) {
  const { db, schema, table } = params;
  const targetObjectName = table.toUpperCase();
  const targetSchemaName = schema.toUpperCase();
  const targetDatabaseName = db.toUpperCase();

  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE;

  if (!account || !username || !password || !warehouse) {
    console.error("Snowflake API (Lineage): Environment variables not fully configured.");
    return NextResponse.json({ error: 'Snowflake environment variables missing.' }, { status: 500 });
  }
  if (process.env.SNOWFLAKE_AUTHENTICATOR?.toUpperCase() === 'EXTERNALBROWSER') {
    return NextResponse.json({ error: 'EXTERNALBROWSER authenticator not supported for API routes.' }, { status: 501 });
  }
  
  const connectionOptions: ConnectionOptions = { account, username, password, warehouse };
   if (process.env.SNOWFLAKE_REGION && account && !account.includes('.')) {
      connectionOptions.region = process.env.SNOWFLAKE_REGION;
  }
  
  let connection: Snowflake.Connection | null = null;

  try {
    try {
      connection = Snowflake.createConnection(connectionOptions);
    } catch (createError: any) {
      console.error('Snowflake API (Lineage): Error creating connection object:', createError);
      return NextResponse.json({ error: `Failed to create Snowflake connection: ${createError.message}` }, { status: 500 });
    }
    if (!connection) throw new Error('Failed to initialize Snowflake connection object.');
    
    await new Promise<void>((resolve, reject) => {
      connection!.connect((err) => err ? reject(err) : resolve());
    });

    // Query SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES
    // Note: Access to SNOWFLAKE.ACCOUNT_USAGE might require special permissions.
    // This query looks for direct dependencies to and from the specified table.
    const lineageQuery = `
      SELECT 
        REFERENCED_DATABASE,
        REFERENCED_SCHEMA_NAME AS REFERENCED_SCHEMA,
        REFERENCED_OBJECT_NAME,
        REFERENCED_OBJECT_ID, -- This is Snowflake's internal ID
        REFERENCED_OBJECT_DOMAIN,
        REFERENCING_DATABASE,
        REFERENCING_SCHEMA_NAME AS REFERENCING_SCHEMA,
        REFERENCING_OBJECT_NAME,
        REFERENCING_OBJECT_ID, -- This is Snowflake's internal ID
        REFERENCING_OBJECT_DOMAIN,
        DEPENDENCY_TYPE
      FROM SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES
      WHERE 
        (
          REFERENCED_DATABASE = ? AND REFERENCED_SCHEMA_NAME = ? AND REFERENCED_OBJECT_NAME = ? AND REFERENCED_OBJECT_DOMAIN IN ('TABLE', 'VIEW')
        ) OR (
          REFERENCING_DATABASE = ? AND REFERENCING_SCHEMA_NAME = ? AND REFERENCING_OBJECT_NAME = ? AND REFERENCING_OBJECT_DOMAIN IN ('TABLE', 'VIEW')
        )
      LIMIT 20; -- Limiting results for performance
    `;
    
    const lineageRows = await executeQuery(connection, lineageQuery, [
      targetDatabaseName, targetSchemaName, targetObjectName,
      targetDatabaseName, targetSchemaName, targetObjectName
    ]);

    const lineageData: RawLineageEntry[] = lineageRows.map(row => ({
      REFERENCED_DATABASE: row.REFERENCED_DATABASE,
      REFERENCED_SCHEMA: row.REFERENCED_SCHEMA,
      REFERENCED_OBJECT_NAME: row.REFERENCED_OBJECT_NAME,
      REFERENCED_OBJECT_ID: `${row.REFERENCED_DATABASE}.${row.REFERENCED_SCHEMA}.${row.REFERENCED_OBJECT_NAME}`, // Construct FQN
      REFERENCED_OBJECT_DOMAIN: row.REFERENCED_OBJECT_DOMAIN,
      REFERENCING_DATABASE: row.REFERENCING_DATABASE,
      REFERENCING_SCHEMA: row.REFERENCING_SCHEMA,
      REFERENCING_OBJECT_NAME: row.REFERENCING_OBJECT_NAME,
      REFERENCING_OBJECT_ID: `${row.REFERENCING_DATABASE}.${row.REFERENCING_SCHEMA}.${row.REFERENCING_OBJECT_NAME}`, // Construct FQN
      REFERENCING_OBJECT_DOMAIN: row.REFERENCING_OBJECT_DOMAIN,
      DEPENDENCY_TYPE: row.DEPENDENCY_TYPE,
    }));
    
    return NextResponse.json(lineageData);

  } catch (error: any) {
    console.error(`API error fetching lineage for ${targetDatabaseName}.${targetSchemaName}.${targetObjectName}:`, error);
    // Check for specific Snowflake error codes, e.g., permission errors for ACCOUNT_USAGE
    if (error.message && error.message.includes("does not exist or not authorized")) {
        return NextResponse.json({ 
            error: `Failed to fetch lineage: Access to SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES might be missing. Details: ${error.message}` 
        }, { status: 403 }); // Forbidden
    }
    return NextResponse.json({ error: `Failed to fetch lineage: ${error.message}` }, { status: 500 });
  } finally {
    if (connection && connection.isUp()) {
      connection.destroy((err) => {
        if (err) console.error('Error destroying Snowflake connection:', err);
      });
    }
  }
}
