
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
  data?: any; // To return Snowflake current time
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  // Check for common error-like object structure
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'An unknown error occurred. Check server logs for more details.';
}


export async function testDatabaseConnection(input: TestConnectionInput): Promise<TestConnectionOutput> {
  console.log("Attempting to test real connection with input:", input);

  if (input.sourceType === 'Snowflake') {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    // const database = process.env.SNOWFLAKE_DATABASE; 
    // const schema_name = process.env.SNOWFLAKE_SCHEMA; // Renamed to avoid conflict 

    if (!account || !username || !password) {
      return {
        success: false,
        message: "Snowflake connection failed.",
        details: "Required Snowflake environment variables (SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD) are not set in .env file."
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
    // if (database) connectionOptions.database = database;
    // if (schema_name) connectionOptions.schema = schema_name;

    // Heuristic: only set region if input.region is specific (not GLOBAL)
    // AND the account identifier doesn't already look like it contains a region.
    if (input.region && input.region.toUpperCase() !== 'GLOBAL' && !account.includes('.')) {
      connectionOptions.region = input.region.toLowerCase();
      console.log(`Using region: ${connectionOptions.region} for Snowflake connection`);
    } else if (account.includes('.')) {
      console.log(`Snowflake account identifier '${account}' seems to include region information. Not explicitly setting region option.`);
    }


    const connection = Snowflake.createConnection(connectionOptions);

    try {
      await new Promise<void>((resolve, reject) => {
        connection.connect((err, conn) => {
          if (err) {
            console.error('Snowflake Connection Error (connect callback):', getErrorMessage(err), err);
            reject(new Error(`Snowflake Connection Error: ${getErrorMessage(err)}`));
          } else {
            // console.log('Successfully connected to Snowflake account ID:', conn.getId());
            resolve();
          }
        });
      });

      const statement = await new Promise<Snowflake.Statement>((resolve, reject) => {
        connection.execute({
          sqlText: 'SELECT CURRENT_TIMESTAMP();',
          complete: (err, stmt, rows) => {
            if (err) {
              console.error('Snowflake Query Error (execute callback):', getErrorMessage(err), err);
              reject(new Error(`Snowflake Query Error: ${getErrorMessage(err)}`));
            } else {
              // console.log('Executed statement with ID: ' + stmt.getStatementId());
              resolve(stmt);
            }
          }
        });
      });
      
      const rows = await new Promise<any[]>((resolve, reject) => {
        const stream = statement.streamRows();
        const rowData: any[] = [];
        stream.on('error', (err_stream) => { 
          console.error('Snowflake Stream Error (stream.on("error")):', getErrorMessage(err_stream), err_stream);
          reject(new Error(`Snowflake Stream Error: ${getErrorMessage(err_stream)}`));
        });
        stream.on('data', (row) => {
          rowData.push(row);
        });
        stream.on('end', () => {
          resolve(rowData);
        });
      });

      const currentTime = rows.length > 0 ? rows[0]['CURRENT_TIMESTAMP()'] : 'Not found';

      return { 
        success: true, 
        message: `Snowflake connection to account ${account} successful.`,
        details: `Current Snowflake time: ${currentTime}`,
        data: { snowflakeTime: currentTime }
      };

    } catch (error: unknown) { 
      const errorMessage = getErrorMessage(error);
      console.error("Snowflake operation error (outer catch):", errorMessage, error); 
      return { 
        success: false, 
        message: "Snowflake operation failed.", 
        details: errorMessage
      };
    } finally {
      if (connection && connection.isUp()) {
        connection.destroy((err, conn) => {
          if (err) {
            console.error('Failed to close Snowflake connection:', getErrorMessage(err), err);
          } else {
            // console.log('Snowflake connection closed successfully.');
          }
        });
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
      // console.log('Successfully connected to PostgreSQL.');
      
      const result = await pgClient.query('SELECT CURRENT_TIMESTAMP;');
      const currentTime = result.rows.length > 0 ? result.rows[0].current_timestamp : 'Not found';

      return { 
        success: true, 
        message: `PostgreSQL connection to ${host} successful.`,
        details: `Current PostgreSQL time: ${currentTime}`,
        data: { postgresTime: currentTime }
      };
    } catch (error: unknown) { 
      const errorMessage = getErrorMessage(error);
      console.error("PostgreSQL connection or query error (outer catch):", errorMessage, error); 
      return { 
        success: false, 
        message: "PostgreSQL connection test failed.", 
        details: errorMessage
      };
    } finally {
      if (pgClient) {
        await pgClient.end().catch(err_end => {
             console.error('Failed to close PostgreSQL connection:', getErrorMessage(err_end), err_end);
        });
      }
      // console.log('PostgreSQL connection closed.');
    }
  }

  return { success: false, message: `Unsupported source type: ${input.sourceType}` };
}
