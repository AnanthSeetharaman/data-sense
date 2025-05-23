
'use server';

import { suggestTags as suggestTagsFlow, type SuggestTagsInput, type SuggestTagsOutput } from '@/ai/flows/suggest-tags';
import { queryToFilters as queryToFiltersFlow, type QueryToFiltersInput, type QueryToFiltersOutput } from '@/ai/flows/query-to-filters-flow';
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

const QueryToFiltersActionInputSchema = z.object({
  userQuery: z.string().min(1, "User query cannot be empty."),
});

export async function handleQueryToFilters(
  input: QueryToFiltersInput
): Promise<{ success: boolean; data?: QueryToFiltersOutput; error?: string }> {
  const validationResult = QueryToFiltersActionInputSchema.safeParse(input);
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
    const fullErrorMessage = messages.join('; ') || "Input validation failed for AI query.";
    return { success: false, error: fullErrorMessage };
  }

  try {
    const result = await queryToFiltersFlow(validationResult.data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in queryToFiltersFlow:", error);
    let errorMessage = 'An unexpected error occurred while processing your query with AI. Please try again.';
     if (error instanceof Error) {
      if (error.message && error.message.trim() !== "" && error.message.trim() !== ".") {
        errorMessage = error.message;
      } else {
        errorMessage = 'AI query processing failed with an unspecified error.';
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
  logs?: string[]; // Added to capture action-specific logs
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
  const capturedLogs: string[] = [];
  const log = (message: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    capturedLogs.push(logEntry);
    switch (type) {
        case 'info': console.log(message); break;
        case 'warn': console.warn(message); break;
        case 'error': console.error(message); break;
    }
  };

  log(`[ACTION_LOG] Attempting to test connection for ${input.sourceType} with input: ${JSON.stringify(input, null, 2)}`);

  if (input.sourceType === 'Snowflake') {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    const authenticatorEnv = process.env.SNOWFLAKE_AUTHENTICATOR?.toUpperCase();
    const db = process.env.SNOWFLAKE_DATABASE;
    const schema = process.env.SNOWFLAKE_SCHEMA;

    log(`[SF_ACTION_LOG] Snowflake .env values check: account=${account ? "present" : "NOT SET"}, username=${username ? "present" : "NOT SET"}, password=${password ? "present/empty" : "NOT SET"}, warehouse=${warehouse ? "present" : "NOT SET"}, authenticator=${authenticatorEnv || "NOT SET"}, db=${db || "NOT SET"}, schema=${schema || "NOT SET"}`);

    if (!account || !username) {
      const msg = "Required Snowflake environment variables (SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME) are not set in .env file.";
      log(msg, 'error');
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: msg,
        logs: capturedLogs
      };
    }

    if (authenticatorEnv === 'EXTERNALBROWSER') {
      const msg = "The 'externalbrowser' authenticator method is not supported for automated server-side connections in this test. Please use username/password or key-pair authentication for server-side tests, or adapt the connection logic if using a different server-compatible SSO method.";
      log(`[SF_ACTION_LOG] Snowflake EXTERNALBROWSER authenticator is configured. ${msg}`, 'warn');
      return {
        success: false,
        message: "Snowflake connection configuration uses EXTERNALBROWSER.",
        details: msg,
        logs: capturedLogs
      };
    }

    if (!password) { 
      const msg = "SNOWFLAKE_PASSWORD environment variable is not set. It is required for username/password authentication (when SNOWFLAKE_AUTHENTICATOR is not EXTERNALBROWSER).";
      log(msg, 'error');
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: msg,
        logs: capturedLogs
      };
    }
    if (!warehouse) {
      const msg = "SNOWFLAKE_WAREHOUSE environment variable is not set. A warehouse is required to execute queries.";
      log(msg, 'error');
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: msg,
        logs: capturedLogs
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
    
    if (authenticatorEnv && authenticatorEnv !== 'SNOWFLAKE') { 
        connectionOptions.authenticator = authenticatorEnv;
    }

    if (input.region && input.region.toUpperCase() !== 'GLOBAL' && account && !account.includes('.')) {
      connectionOptions.region = input.region.toLowerCase();
      log(`[SF_ACTION_LOG] Using region: ${connectionOptions.region} for Snowflake connection`);
    } else if (account && account.includes('.')) {
      log(`[SF_ACTION_LOG] Snowflake account identifier '${account}' seems to include region information. Not explicitly setting region option.`);
    }
    
    log(`[SF_ACTION_LOG] Attempting Snowflake connection with options: ${JSON.stringify(connectionOptions, (key, value) => key === 'password' ? '********' : value)}`);
    let connection: Snowflake.Connection | null = null;

    try {
      try {
        connection = Snowflake.createConnection(connectionOptions);
        log("[SF_ACTION_LOG] Snowflake.createConnection call successful.");
      } catch (createError: unknown) {
        const detailMessage = getErrorMessage(createError);
        log(`[SF_ACTION_LOG] Snowflake.createConnection Error: ${detailMessage}`, 'error');
        return {
          success: false,
          message: "Snowflake connection failed during creation.",
          details: `Error creating connection object: ${detailMessage}`,
          logs: capturedLogs
        };
      }

      await new Promise<void>((resolve, reject) => {
        if (!connection) {
           const errMsg = "[SF_ACTION_LOG] CRITICAL: Connection object is null before calling connection.connect.";
           log(errMsg, 'error');
           reject(new Error("Snowflake connection object is null before connect."));
           return;
        }
        log("[SF_ACTION_LOG] Calling connection.connect()...");
        connection.connect((err, conn) => {
          if (err) {
            const errMsg = getErrorMessage(err);
            log(`[SF_ACTION_LOG] Snowflake Connection Error (connect callback): ${errMsg}`, 'error');
            console.error(err); // Also log full error object to server console
            reject(err);
          } else {
            log(`[SF_ACTION_LOG] Snowflake connect callback successful. Conn ID: ${conn.getId()}`);
            resolve();
          }
        });
      });

      log("[SF_ACTION_LOG] Connection.connect promise resolved. Preparing to execute query.");
      
      const statement = await new Promise<Snowflake.Statement>((resolve, reject) => {
        if (!connection) {
           const errMsg = "[SF_ACTION_LOG] CRITICAL: Connection object is null before calling connection.execute.";
           log(errMsg, 'error');
           reject(new Error("Snowflake connection object is null before execute."));
           return;
        }
        log("[SF_ACTION_LOG] Calling connection.execute({ sqlText: 'SELECT CURRENT_TIMESTAMP();' })");
        connection.execute({
          sqlText: 'SELECT CURRENT_TIMESTAMP();',
          complete: (err, stmt, rows_from_execute) => { 
            if (err) {
              const errMsg = getErrorMessage(err);
              log(`[SF_ACTION_LOG] Snowflake Query Error (execute complete callback): ${errMsg}`, 'error');
              console.error(err); // Also log full error object to server console
              reject(err);
            } else {
              if (!stmt) {
                const errMsg = "[SF_ACTION_LOG] Snowflake execute callback: Statement object (stmt) is undefined/null.";
                log(errMsg, 'error');
                reject(new Error("Snowflake statement is undefined after execution."));
                return;
              }
              log(`[SF_ACTION_LOG] Snowflake execute callback successful. Statement ID: ${stmt.getStatementId()}`);
              log(`[SF_ACTION_LOG] Rows returned directly by execute (if any, typically undefined/empty for SELECT): ${JSON.stringify(rows_from_execute)}`);
              resolve(stmt);
            }
          }
        });
      });

      log("[SF_ACTION_LOG] statement promise resolved. Statement object should be available.");
      if (!statement) {
          const errMsg = "[SF_ACTION_LOG] CRITICAL: Statement object is null/undefined after execute promise.";
          log(errMsg, 'error');
          return { success: false, message: "Snowflake operation failed.", details: "Failed to obtain statement object from Snowflake execute.", logs: capturedLogs };
      }

      const queryResultRows = await new Promise<any[]>((resolve, reject) => {
        log("[SF_ACTION_LOG] Calling statement.streamRows()...");
        try {
            const stream = statement.streamRows();
            const rowData: any[] = [];
            
            stream.on('error', (err_stream) => {
              const errMsg = getErrorMessage(err_stream);
              log(`[SF_ACTION_LOG] Snowflake Stream Error (stream.on("error")): ${errMsg}`, 'error');
              console.error(err_stream);
              reject(err_stream);
            });
            
            stream.on('data', (row) => {
              log(`[SF_ACTION_LOG] Snowflake stream.on('data'): received row: ${JSON.stringify(row)}`);
              rowData.push(row);
            });
            
            stream.on('end', () => {
              log(`[SF_ACTION_LOG] Snowflake stream.on("end"): streamRows ended. Collected row count: ${rowData.length}`);
              if (rowData.length === 0) {
                log("[SF_ACTION_LOG] streamRows ended with 0 rows. Query might have returned no data or failed silently before/during streaming (e.g., warehouse issue).", 'warn');
              }
              resolve(rowData);
            });
        } catch (streamSetupError) {
            const errMsg = getErrorMessage(streamSetupError);
            log(`[SF_ACTION_LOG] Error setting up statement.streamRows(): ${errMsg}`, 'error');
            console.error(streamSetupError);
            reject(streamSetupError);
        }
      });
      
      log(`[SF_ACTION_LOG] queryResultRows promise resolved. Final row count: ${queryResultRows.length}`);

      const currentTime = queryResultRows.length > 0 && queryResultRows[0] && typeof queryResultRows[0] === 'object' && 'CURRENT_TIMESTAMP()' in queryResultRows[0]
                          ? queryResultRows[0]['CURRENT_TIMESTAMP()']
                          : 'Current timestamp not found in query result';

      const successMsg = `Snowflake connection to account ${account} successful.`;
      log(successMsg);
      return {
        success: true,
        message: successMsg,
        details: `Current Snowflake time: ${currentTime instanceof Date ? currentTime.toISOString() : String(currentTime)}`,
        data: { snowflakeTime: currentTime instanceof Date ? currentTime.toISOString() : String(currentTime) },
        logs: capturedLogs
      };

    } catch (error: unknown) {
      let detailMessage = 'Failed during Snowflake operation. Check server logs.';
      try {
        detailMessage = getErrorMessage(error);
      } catch (e_getMsg) {
        log(`CRITICAL: getErrorMessage failed during Snowflake error handling: ${e_getMsg}. Original error: ${error}`, 'error');
      }
      log(`[SF_ACTION_LOG] Snowflake operation error (outer catch): ${detailMessage}`, 'error');
      console.error(error); // Also log full error object
      return {
        success: false,
        message: "Snowflake operation failed.",
        details: detailMessage,
        logs: capturedLogs
      };
    } finally {
      if (connection && connection.isUp()) {
        log("[SF_ACTION_LOG] Attempting to destroy Snowflake connection.");
        try {
            await new Promise<void>((resolve, reject) => { 
                connection.destroy((err, conn) => {
                    if (err) {
                        const errMsg = getErrorMessage(err);
                        log(`[SF_ACTION_LOG] Error destroying Snowflake connection: ${errMsg}`, 'error');
                        console.error(err);
                    } else {
                        log('[SF_ACTION_LOG] Snowflake connection destroyed successfully.');
                    }
                    resolve(); 
                });
            });
        } catch (destroyError) {
            const errMsg = getErrorMessage(destroyError);
            log(`[SF_ACTION_LOG] Error in Snowflake connection.destroy promise wrapper: ${errMsg}`, 'error');
            console.error(destroyError);
        }
      } else if (connection) {
        log("[SF_ACTION_LOG] Snowflake connection was not up, no destroy needed or destroy failed prior.");
      } else {
        log("[SF_ACTION_LOG] No Snowflake connection object to destroy (was null).");
      }
    }

  } else if (input.sourceType === 'PostgreSQL') {
    const host = process.env.POSTGRES_HOST;
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const database = process.env.POSTGRES_DATABASE;
    const port = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432;

    log(`[PG_ACTION_LOG] PostgreSQL .env values check: host=${host ? "present" : "NOT SET"}, user=${user ? "present" : "NOT SET"}, password=${password ? "present/empty" : "NOT SET"}, database=${database ? "present" : "NOT SET"}, port=${port}`);

    if (!host || !user || !password || !database) {
       const msg = "Required PostgreSQL environment variables (POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE) are not set in .env file.";
       log(msg, 'error');
       return {
        success: false,
        message: "PostgreSQL connection failed.",
        details: msg,
        logs: capturedLogs
      };
    }
    
    const pgClient = new PgClient({ host, user, password, database, port });

    try {
      log("[PG_ACTION_LOG] Attempting PostgreSQL connection...");
      await pgClient.connect();
      log("[PG_ACTION_LOG] PostgreSQL connected. Executing query 'SELECT CURRENT_TIMESTAMP;'");
      const result = await pgClient.query('SELECT CURRENT_TIMESTAMP;');
      log("[PG_ACTION_LOG] PostgreSQL query successful.");
      const currentTime = result.rows.length > 0 && result.rows[0] && typeof result.rows[0] === 'object' && 'current_timestamp' in result.rows[0]
                          ? result.rows[0].current_timestamp
                          : 'Current timestamp not found';
      
      const successMsg = `PostgreSQL connection to ${host} successful.`;
      log(successMsg);
      return {
        success: true,
        message: successMsg,
        details: `Current PostgreSQL time: ${currentTime instanceof Date ? currentTime.toISOString() : String(currentTime)}`,
        data: { postgresTime: currentTime instanceof Date ? currentTime.toISOString() : String(currentTime) },
        logs: capturedLogs
      };
    } catch (error: unknown) {
      let detailMessage = 'Failed during PostgreSQL operation. Check server logs.';
      try {
        detailMessage = getErrorMessage(error);
      } catch (e_getMsg) {
        log(`CRITICAL: getErrorMessage failed during PostgreSQL error handling: ${e_getMsg}. Original error: ${error}`, 'error');
      }
      log(`[PG_ACTION_LOG] PostgreSQL connection or query error (outer catch): ${detailMessage}`, 'error');
      console.error(error);
      return {
        success: false,
        message: "PostgreSQL connection test failed.",
        details: detailMessage,
        logs: capturedLogs
      };
    } finally {
      if (pgClient) { 
        log("[PG_ACTION_LOG] Attempting to close PostgreSQL connection.");
        try {
            await pgClient.end();
            log("[PG_ACTION_LOG] PostgreSQL connection closed.");
        } catch (endError) {
            const errMsg = getErrorMessage(endError);
            log(`[PG_ACTION_LOG] Error closing PostgreSQL connection: ${errMsg}`, 'error');
            console.error(endError);
        }
      }
    }
  }
  const unsupportedMsg = `Unsupported source type: ${input.sourceType}`;
  log(unsupportedMsg, 'error');
  return { success: false, message: unsupportedMsg, details: "This source type is not configured for connection testing.", logs: capturedLogs };
}
    
