
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
  console.log(`Attempting to test connection for ${input.sourceType} with input:`, JSON.stringify(input, null, 2));

  if (input.sourceType === 'Snowflake') {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    const authenticatorEnv = process.env.SNOWFLAKE_AUTHENTICATOR?.toUpperCase();

    console.log("Snowflake .env values:", {
        account: account ? "******" : "NOT SET",
        username: username ? "******" : "NOT SET",
        password: password ? "******" : "NOT SET (or empty)",
        warehouse: warehouse ? "******" : "NOT SET",
        authenticatorEnv
    });

    if (!account || !username) {
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: "Required Snowflake environment variables (SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME) are not set in .env file."
      };
    }

    if (authenticatorEnv === 'EXTERNALBROWSER') {
      console.warn("Snowflake EXTERNALBROWSER authenticator is configured. This method is not supported for non-interactive server-side connections in this prototype.");
      return {
        success: false,
        message: "Snowflake connection configuration uses EXTERNALBROWSER.",
        details: "The 'externalbrowser' authenticator method is not supported for automated server-side connections in this test. Please use username/password or key-pair authentication for server-side tests, or adapt the connection logic if using a different server-compatible SSO method."
      };
    }

    // If not using EXTERNALBROWSER, password and warehouse are required for default username/password auth
    if (!password) {
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: "SNOWFLAKE_PASSWORD environment variable is not set or is empty. It is required for username/password authentication (when SNOWFLAKE_AUTHENTICATOR is not EXTERNALBROWSER)."
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
    
    if (authenticatorEnv) { // For other authenticators that might still use username/password or different fields
        connectionOptions.authenticator = authenticatorEnv;
    }

    if (input.region && input.region.toUpperCase() !== 'GLOBAL' && account && !account.includes('.')) {
      connectionOptions.region = input.region.toLowerCase();
      console.log(`Using region: ${connectionOptions.region} for Snowflake connection`);
    } else if (account && account.includes('.')) {
      console.log(`Snowflake account identifier '${account}' seems to include region information. Not explicitly setting region option.`);
    }
    
    console.log("Attempting Snowflake connection with options:", JSON.stringify(connectionOptions, (key, value) => key === 'password' ? '********' : value));
    let connection: Snowflake.Connection | null = null;

    try {
      try {
        connection = Snowflake.createConnection(connectionOptions);
        console.log("Snowflake.createConnection successful.");
      } catch (createError: unknown) {
        console.error('Snowflake.createConnection Error:', createError);
        const detailMessage = getErrorMessage(createError);
        return {
          success: false,
          message: "Snowflake connection failed during creation.",
          details: `Error creating connection object: ${detailMessage}`
        };
      }

      await new Promise<void>((resolve, reject) => {
        if (!connection) {
          reject(new Error("Snowflake connection object is null before connect."));
          return;
        }
        console.log("Calling connection.connect()...");
        connection.connect((err, conn) => {
          if (err) {
            console.error('Snowflake Connection Error (connect callback):', err);
            reject(err);
          } else {
            console.log('Snowflake connect callback successful. Conn ID:', conn.getId());
            resolve();
          }
        });
      });

      console.log("Connection successful, preparing to execute query.");
      const statement = await new Promise<Snowflake.Statement>((resolve, reject) => {
        if (!connection) {
           reject(new Error("Snowflake connection object is null before execute."));
           return;
        }
        console.log("Calling connection.execute({ sqlText: 'SELECT CURRENT_TIMESTAMP();' })...");
        connection.execute({
          sqlText: 'SELECT CURRENT_TIMESTAMP();',
          complete: (err, stmt, rows) => {
            if (err) {
              console.error('Snowflake Query Error (execute callback):', err);
              reject(err);
            } else {
              if (!stmt) {
                reject(new Error("Snowflake statement is undefined after execution."));
                return;
              }
              console.log('Snowflake execute callback successful. Statement ID:', stmt.getStatementId());
              resolve(stmt);
            }
          }
        });
      });

      const rows = await new Promise<any[]>((resolve, reject) => {
        console.log("Calling statement.streamRows()...");
        const stream = statement.streamRows();
        const rowData: any[] = [];
        stream.on('error', (err_stream) => {
          console.error('Snowflake Stream Error (stream.on("error")):', err_stream);
          reject(err_stream);
        });
        stream.on('data', (row) => {
          rowData.push(row);
        });
        stream.on('end', () => {
          console.log('Snowflake streamRows ended. Row count:', rowData.length);
          resolve(rowData);
        });
      });

      const currentTime = rows.length > 0 && rows[0] && typeof rows[0] === 'object' && 'CURRENT_TIMESTAMP()' in rows[0]
                          ? rows[0]['CURRENT_TIMESTAMP()']
                          : 'Not found';

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
      console.error("Snowflake operation error (outer catch):", detailMessage, error);
      return {
        success: false,
        message: "Snowflake operation failed.",
        details: detailMessage
      };
    } finally {
      if (connection && connection.isUp()) {
        console.log("Attempting to destroy Snowflake connection.");
        try {
            await new Promise<void>((resolve, reject) => { 
                connection.destroy((err, conn) => {
                    if (err) {
                        console.error('Error destroying Snowflake connection:', getErrorMessage(err), err);
                    } else {
                        console.log('Snowflake connection destroyed successfully.');
                    }
                    resolve(); 
                });
            });
        } catch (destroyError) {
            console.error('Error in Snowflake connection.destroy promise wrapper:', getErrorMessage(destroyError), destroyError);
        }
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
      await pgClient.connect();
      const result = await pgClient.query('SELECT CURRENT_TIMESTAMP;');
      const currentTime = result.rows.length > 0 && result.rows[0] && typeof result.rows[0] === 'object' && 'current_timestamp' in result.rows[0]
                          ? result.rows[0].current_timestamp
                          : 'Not found';

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
      console.error("PostgreSQL connection or query error (outer catch):", detailMessage, error);
      return {
        success: false,
        message: "PostgreSQL connection test failed.",
        details: detailMessage
      };
    } finally {
      if (pgClient) { 
        try {
            await pgClient.end();
        } catch (endError) {
            console.error('Error closing PostgreSQL connection:', getErrorMessage(endError), endError);
        }
      }
    }
  }

  return { success: false, message: `Unsupported source type: ${input.sourceType}`, details: "This source type is not configured for connection testing." };
}

