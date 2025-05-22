
import { NextResponse } from 'next/server';
import Snowflake from 'snowflake-sdk';
import type { ConnectionOptions } from 'snowflake-sdk';

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

interface SampleDataParams {
  params: {
    db: string;
    schema: string;
    table: string;
  };
}

export async function GET(request: Request, { params }: SampleDataParams) {
  const { db, schema, table } = params;
  const fullyQualifiedTableName = `"${db}"."${schema}"."${table}"`;

  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const password = process.env.SNOWFLAKE_PASSWORD;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE;

  if (!account || !username || !password || !warehouse) {
    console.error("Snowflake API (Sample Data): Environment variables not fully configured.");
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
      console.error('Snowflake API (Sample Data): Error creating connection object:', createError);
      return NextResponse.json({ error: `Failed to create Snowflake connection: ${createError.message}` }, { status: 500 });
    }
    if (!connection) throw new Error('Failed to initialize Snowflake connection object.');
    
    await new Promise<void>((resolve, reject) => {
      connection!.connect((err) => err ? reject(err) : resolve());
    });

    const sampleQuery = `SELECT * FROM ${fullyQualifiedTableName} LIMIT 5;`;
    const sampleDataRows = await executeQuery(connection, sampleQuery);

    return NextResponse.json(sampleDataRows);

  } catch (error: any) {
    console.error(`API error fetching sample data for ${fullyQualifiedTableName}:`, error);
    return NextResponse.json({ error: `Failed to fetch sample data: ${error.message}` }, { status: 500 });
  } finally {
    if (connection && connection.isUp()) {
      connection.destroy((err) => {
        if (err) console.error('Error destroying Snowflake connection:', err);
      });
    }
  }
}
