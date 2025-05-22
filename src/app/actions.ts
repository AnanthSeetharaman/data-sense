
'use server';

import { suggestTags as suggestTagsFlow, type SuggestTagsInput, type SuggestTagsOutput } from '@/ai/flows/suggest-tags';
import { z } from 'zod';
import * as Snowflake from 'snowflake-sdk';
import type { ConnectionOptions } from 'snowflake-sdk'; // Import ConnectionOptions type
import { Client as PgClient } from 'pg';

const SuggestTagsActionInputSchema = z.object({
  datasetName: z.string().min(1, "Dataset name cannot be empty."),
  schema: z.string().min(1, "Schema cannot be empty."),
});

export async function handleSuggestTags(input: SuggestTagsInput): Promise<{ success: boolean; data?: SuggestTagsOutput; error?: string }> {
  const validationResult = SuggestTagsActionInputSchema.safeParse(input);
  if (!validationResult.success) {
    const flatErrors = validationResult.error.flatten();
    let messages: string[] = [];
    if (flatErrors.formErrors.length > 0) {
      messages = messages.concat(flatErrors.formErrors);
    }
    for (const field in flatErrors.fieldErrors) {
      const fieldErrorList = (flatErrors.fieldErrors as Record<string, string[] | undefined>)[field];
      if (fieldErrorList && fieldErrorList.length > 0) {
        messages.push(`${field}: ${fieldErrorList.join(', ')}`);
      }
    }
    const fullErrorMessage = messages.join('; ') || "Input validation failed.";
    return { success: false, error: fullErrorMessage };
  }

  try {
    const result = await suggestTagsFlow(validationResult.data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in suggestTagsFlow:", error);
    let errorMessage = 'An unexpected error occurred while suggesting tags. Please try again.';
    if (error instanceof Error) {
      if (error.message && error.message.trim() !== "" && error.message.trim() !== ".") {
        errorMessage = error.message;
      } else {
        errorMessage = 'AI suggestion flow failed with an unspecified error.';
      }
    } else if (typeof error === 'string' && error.trim() !== "" && error.trim() !== ".") {
      errorMessage = error;
    }
    return { success: false, error: errorMessage };
  }
}

export interface TestConnectionInput {
  region: string;
  url?: string; // For Snowflake, the JDBC-like URL from settings page. Not directly used by snowflake-sdk.
  sourceType: 'Snowflake' | 'PostgreSQL';
}

export interface TestConnectionOutput {
  success: boolean;
  message: string;
  details?: string;
  data?: any;
}

function getErrorMessage(error: unknown): string {
  let message = 'An unknown error occurred. Check server logs for more details.';
  if (error === null || error === undefined) {
    return 'An unspecified null or undefined error occurred.';
  }
  try {
    if (error instanceof Error) {
      if (error.message && error.message.trim() !== "") {
        message = error.message.trim();
      } else if (error.name && error.name.trim() !== "" && error.name.trim() !== "Error") {
        message = `Error: ${error.name.trim()}`;
      }
    } else if (typeof error === 'string' && error.trim() !== "") {
      message = error.trim();
    } else if (typeof error === 'object') {
      const errObj = error as { message?: unknown, name?: unknown, code?: unknown, data?: unknown, stack?: unknown };
      if (errObj.message && typeof errObj.message === 'string' && errObj.message.trim() !== "") {
        message = errObj.message.trim();
      } else if (errObj.name && typeof errObj.name === 'string' && errObj.name.trim() !== "" && errObj.name.trim() !== "Error") {
         message = `Error: ${errObj.name.trim()}`;
      } else if (errObj.code && (typeof errObj.code === 'string' || typeof errObj.code === 'number')) {
        message = `Error code: ${errObj.code}`;
      }
      // Fallback to string conversion if other properties didn't yield a good message
      if (message === 'An unknown error occurred. Check server logs for more details.' && typeof (error as any).toString === 'function') {
        const errStr = (error as any).toString();
        if (errStr !== '[object Object]' && errStr.trim() !== "") {
          message = errStr.trim();
        }
      }
    }
  } catch (e) {
     // If getErrorMessage itself fails, provide a very generic message.
     console.error("CRITICAL: getErrorMessage itself threw an error:", e, "Original error was:", error);
     return "Failed to process the error message. Check server logs for a critical failure in error handling.";
  }
  // Ensure message is not just a period or empty.
  if (message.trim() === "" || message.trim() === ".") {
    message = 'An unspecified error occurred during the operation.';
  }
  return message;
}


export async function testDatabaseConnection(input: TestConnectionInput): Promise<TestConnectionOutput> {
  console.log(`[ACTION_LOG] Attempting to test connection for ${input.sourceType} with input:`, JSON.stringify(input, null, 2));

  if (input.sourceType === 'Snowflake') {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    const authenticatorEnv = process.env.SNOWFLAKE_AUTHENTICATOR?.toUpperCase();
    const db = process.env.SNOWFLAKE_DATABASE;
    const schema = process.env.SNOWFLAKE_SCHEMA;


    console.log("[SF_ACTION_LOG] Snowflake .env values:", {
        account: account ? "******" : "NOT SET",
        username: username ? "******" : "NOT SET",
        password: password ? "****** (present/empty)" : "NOT SET",
        warehouse: warehouse ? "******" : "NOT SET",
        authenticatorEnv,
        db: db ? db : "NOT SET (Optional for test)",
        schema: schema ? schema : "NOT SET (Optional for test)"
    });

    if (!account || !username) {
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: "Required Snowflake environment variables (SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME) are not set in .env file."
      };
    }

    if (authenticatorEnv === 'EXTERNALBROWSER') {
      console.warn("[SF_ACTION_LOG] Snowflake EXTERNALBROWSER authenticator is configured. This method is not supported for non-interactive server-side connections in this prototype.");
      return {
        success: false,
        message: "Snowflake connection configuration uses EXTERNALBROWSER.",
        details: "The 'externalbrowser' authenticator method is not supported for automated server-side connections in this test. Please use username/password or key-pair authentication for server-side tests, or adapt the connection logic if using a different server-compatible SSO method."
      };
    }

    // If not using EXTERNALBROWSER, password and warehouse are required for default username/password auth
    if (!password) { // Password can be an empty string if explicitly set that way, though unusual
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: "SNOWFLAKE_PASSWORD environment variable is not set. It is required for username/password authentication (when SNOWFLAKE_AUTHENTICATOR is not EXTERNALBROWSER)."
      };
    }
    if (!warehouse) {
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: "SNOWFLAKE_WAREHOUSE environment variable is not set. A warehouse is required to execute queries."
      };
    }

    const connectionOptions: ConnectionOptions = {
      account: account,
      username: username,
      password: password,
      warehouse: warehouse,
    };
    if (db) connectionOptions.database = db;
    if (schema) connectionOptions.schema = schema;
    
    if (authenticatorEnv && authenticatorEnv !== 'SNOWFLAKE') { // SNOWFLAKE is default for username/password
        connectionOptions.authenticator = authenticatorEnv;
    }

    if (input.region && input.region.toUpperCase() !== 'GLOBAL' && account && !account.includes('.')) {
      connectionOptions.region = input.region.toLowerCase();
      console.log(`[SF_ACTION_LOG] Using region: ${connectionOptions.region} for Snowflake connection`);
    } else if (account && account.includes('.')) {
      console.log(`[SF_ACTION_LOG] Snowflake account identifier '${account}' seems to include region information. Not explicitly setting region option.`);
    }
    
    console.log("[SF_ACTION_LOG] Attempting Snowflake connection with options:", JSON.stringify(connectionOptions, (key, value) => key === 'password' ? '********' : value));
    let connection: Snowflake.Connection | null = null;

    try {
      try {
        connection = Snowflake.createConnection(connectionOptions);
        console.log("[SF_ACTION_LOG] Snowflake.createConnection call successful.");
      } catch (createError: unknown) {
        console.error('[SF_ACTION_LOG] Snowflake.createConnection Error:', createError);
        const detailMessage = getErrorMessage(createError);
        return {
          success: false,
          message: "Snowflake connection failed during creation.",
          details: `Error creating connection object: ${detailMessage}`
        };
      }

      await new Promise<void>((resolve, reject) => {
        if (!connection) {
          console.error("[SF_ACTION_LOG] CRITICAL: Connection object is null before calling connection.connect.");
          reject(new Error("Snowflake connection object is null before connect."));
          return;
        }
        console.log("[SF_ACTION_LOG] Calling connection.connect()...");
        connection.connect((err, conn) => {
          if (err) {
            console.error('[SF_ACTION_LOG] Snowflake Connection Error (connect callback):', getErrorMessage(err), err);
            reject(err);
          } else {
            console.log('[SF_ACTION_LOG] Snowflake connect callback successful. Conn ID:', conn.getId());
            resolve();
          }
        });
      });

      console.log("[SF_ACTION_LOG] Connection.connect promise resolved. Preparing to execute query.");
      
      const statement = await new Promise<Snowflake.Statement>((resolve, reject) => {
        if (!connection) {
           console.error("[SF_ACTION_LOG] CRITICAL: Connection object is null before calling connection.execute.");
           reject(new Error("Snowflake connection object is null before execute."));
           return;
        }
        console.log("[SF_ACTION_LOG] Calling connection.execute({ sqlText: 'SELECT CURRENT_TIMESTAMP();' })");
        connection.execute({
          sqlText: 'SELECT CURRENT_TIMESTAMP();',
          complete: (err, stmt, rows_from_execute) => { // Renamed `rows` parameter
            if (err) {
              console.error('[SF_ACTION_LOG] Snowflake Query Error (execute complete callback):', getErrorMessage(err), err);
              reject(err);
            } else {
              if (!stmt) {
                console.error("[SF_ACTION_LOG] Snowflake execute callback: Statement object (stmt) is undefined/null.");
                reject(new Error("Snowflake statement is undefined after execution."));
                return;
              }
              console.log('[SF_ACTION_LOG] Snowflake execute callback successful. Statement ID:', stmt.getStatementId());
              console.log('[SF_ACTION_LOG] Rows returned directly by execute (if any, typically undefined/empty for SELECT):', rows_from_execute);
              resolve(stmt);
            }
          }
        });
      });

      console.log("[SF_ACTION_LOG] statement promise resolved. Statement object should be available.");
      if (!statement) {
          console.error("[SF_ACTION_LOG] CRITICAL: Statement object is null/undefined after execute promise.");
          // This path should ideally not be reached if the promise was rejected correctly above.
          return { success: false, message: "Snowflake operation failed.", details: "Failed to obtain statement object from Snowflake execute." };
      }

      const queryResultRows = await new Promise<any[]>((resolve, reject) => {
        console.log("[SF_ACTION_LOG] Calling statement.streamRows()...");
        try {
            const stream = statement.streamRows();
            const rowData: any[] = [];
            
            stream.on('error', (err_stream) => {
              console.error('[SF_ACTION_LOG] Snowflake Stream Error (stream.on("error")):', getErrorMessage(err_stream), err_stream);
              reject(err_stream);
            });
            
            stream.on('data', (row) => {
              console.log("[SF_ACTION_LOG] Snowflake stream.on('data'): received row:", JSON.stringify(row));
              rowData.push(row);
            });
            
            stream.on('end', () => {
              console.log('[SF_ACTION_LOG] Snowflake stream.on("end"): streamRows ended. Collected row count:', rowData.length);
              if (rowData.length === 0) {
                console.warn("[SF_ACTION_LOG] streamRows ended with 0 rows. Query might have returned no data or failed silently before/during streaming (e.g., warehouse issue).");
              }
              resolve(rowData);
            });
        } catch (streamSetupError) {
            console.error('[SF_ACTION_LOG] Error setting up statement.streamRows():', getErrorMessage(streamSetupError), streamSetupError);
            reject(streamSetupError);
        }
      });
      
      console.log("[SF_ACTION_LOG] queryResultRows promise resolved. Final row count:", queryResultRows.length);

      const currentTime = queryResultRows.length > 0 && queryResultRows[0] && typeof queryResultRows[0] === 'object' && 'CURRENT_TIMESTAMP()' in queryResultRows[0]
                          ? queryResultRows[0]['CURRENT_TIMESTAMP()']
                          : 'Current timestamp not found in query result';

      return {
        success: true,
        message: `Snowflake connection to account ${account} successful.`,
        details: `Current Snowflake time: ${currentTime instanceof Date ? currentTime.toISOString() : String(currentTime)}`,
        data: { snowflakeTime: currentTime instanceof Date ? currentTime.toISOString() : String(currentTime) }
      };

    } catch (error: unknown) {
      let detailMessage = 'Failed during Snowflake operation. Check server logs.';
      try {
        detailMessage = getErrorMessage(error);
      } catch (e_getMsg) {
        console.error("CRITICAL: getErrorMessage failed during Snowflake error handling:", e_getMsg, "Original error:", error);
      }
      console.error("[SF_ACTION_LOG] Snowflake operation error (outer catch):", detailMessage, error);
      return {
        success: false,
        message: "Snowflake operation failed.",
        details: detailMessage
      };
    } finally {
      if (connection && connection.isUp()) {
        console.log("[SF_ACTION_LOG] Attempting to destroy Snowflake connection.");
        try {
            await new Promise<void>((resolve, reject) => { 
                connection.destroy((err, conn) => {
                    if (err) {
                        console.error('[SF_ACTION_LOG] Error destroying Snowflake connection:', getErrorMessage(err), err);
                    } else {
                        console.log('[SF_ACTION_LOG] Snowflake connection destroyed successfully.');
                    }
                    resolve(); 
                });
            });
        } catch (destroyError) {
            console.error('[SF_ACTION_LOG] Error in Snowflake connection.destroy promise wrapper:', getErrorMessage(destroyError), destroyError);
        }
      } else if (connection) {
        console.log("[SF_ACTION_LOG] Snowflake connection was not up, no destroy needed or destroy failed prior.");
      } else {
        console.log("[SF_ACTION_LOG] No Snowflake connection object to destroy (was null).");
      }
    }

  } else if (input.sourceType === 'PostgreSQL') {
    const host = process.env.POSTGRES_HOST;
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const database = process.env.POSTGRES_DATABASE;
    const port = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432;

    if (!host || !user || !password || !database) {
       return {
        success: false,
        message: "PostgreSQL connection failed.",
        details: "Required PostgreSQL environment variables (POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE) are not set in .env file."
      };
    }
    
    const pgClient = new PgClient({ host, user, password, database, port });

    try {
      console.log("[PG_ACTION_LOG] Attempting PostgreSQL connection...");
      await pgClient.connect();
      console.log("[PG_ACTION_LOG] PostgreSQL connected. Executing query 'SELECT CURRENT_TIMESTAMP;'");
      const result = await pgClient.query('SELECT CURRENT_TIMESTAMP;');
      console.log("[PG_ACTION_LOG] PostgreSQL query successful.");
      const currentTime = result.rows.length > 0 && result.rows[0] && typeof result.rows[0] === 'object' && 'current_timestamp' in result.rows[0]
                          ? result.rows[0].current_timestamp
                          : 'Current timestamp not found';

      return {
        success: true,
        message: `PostgreSQL connection to ${host} successful.`,
        details: `Current PostgreSQL time: ${currentTime instanceof Date ? currentTime.toISOString() : String(currentTime)}`,
        data: { postgresTime: currentTime instanceof Date ? currentTime.toISOString() : String(currentTime) }
      };
    } catch (error: unknown) {
      let detailMessage = 'Failed during PostgreSQL operation. Check server logs.';
      try {
        detailMessage = getErrorMessage(error);
      } catch (e_getMsg) {
        console.error("CRITICAL: getErrorMessage failed during PostgreSQL error handling:", e_getMsg, "Original error:", error);
      }
      console.error("[PG_ACTION_LOG] PostgreSQL connection or query error (outer catch):", detailMessage, error);
      return {
        success: false,
        message: "PostgreSQL connection test failed.",
        details: detailMessage
      };
    } finally {
      if (pgClient) { 
        console.log("[PG_ACTION_LOG] Attempting to close PostgreSQL connection.");
        try {
            await pgClient.end();
            console.log("[PG_ACTION_LOG] PostgreSQL connection closed.");
        } catch (endError) {
            console.error('[PG_ACTION_LOG] Error closing PostgreSQL connection:', getErrorMessage(endError), endError);
        }
      }
    }
  }

  return { success: false, message: `Unsupported source type: ${input.sourceType}`, details: "This source type is not configured for connection testing." };
}
