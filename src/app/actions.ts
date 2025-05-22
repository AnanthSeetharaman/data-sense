
'use server';

import { suggestTags as suggestTagsFlow, type SuggestTagsInput, type SuggestTagsOutput } from '@/ai/flows/suggest-tags';
import { z } from 'zod';
import * as Snowflake from 'snowflake-sdk';
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

export async function testDatabaseConnection(input: TestConnectionInput): Promise<TestConnectionOutput> {
  console.log("Attempting to test real connection with input:", input);

  if (input.sourceType === 'Snowflake') {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
    // const database = process.env.SNOWFLAKE_DATABASE; // Optional
    // const schema = process.env.SNOWFLAKE_SCHEMA; // Optional

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

    const connection = Snowflake.createConnection({
      account: account,
      username: username,
      password: password,
      warehouse: warehouse,
      // database: database, // Optional: can be specified here
      // schema: schema,     // Optional: can be specified here
      // region: input.region.toLowerCase() === 'global' ? undefined : input.region, // region from settings can be used if your account URL is generic
    });

    try {
      await new Promise<void>((resolve, reject) => {
        connection.connect((err, conn) => {
          if (err) {
            console.error('Snowflake connection error:', err);
            reject(new Error(`Snowflake Connection Error: ${err.message}`));
          } else {
            console.log('Successfully connected to Snowflake account ID:', conn.getId());
            resolve();
          }
        });
      });

      // Fetch current time
      const statement = await new Promise<Snowflake.Statement>((resolve, reject) => {
        connection.execute({
          sqlText: 'SELECT CURRENT_TIMESTAMP();',
          complete: (err, stmt, rows) => {
            if (err) {
              console.error('Failed to execute statement: ' + err.message);
              reject(new Error(`Snowflake Query Error: ${err.message}`));
            } else {
              console.log('Executed statement with ID: ' + stmt.getStatementId());
              resolve(stmt);
            }
          }
        });
      });
      
      const rows = await new Promise<any[]>((resolve, reject) => {
        const stream = statement.streamRows();
        const rowData: any[] = [];
        stream.on('error', (err) => {
          console.error('Unable to K_TIMESTAMP stream rows: ' + err.message);
          reject(new Error(`Snowflake Stream Error: ${err.message}`));
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

    } catch (err: any) {
      console.error("Snowflake operation error:", err);
      return { 
        success: false, 
        message: "Snowflake operation failed.", 
        details: err.message || "Check server logs." 
      };
    } finally {
      if (connection.isUp()) {
        connection.destroy((err, conn) => {
          if (err) {
            console.error('Failed to close Snowflake connection: ' + err.message);
          } else {
            console.log('Snowflake connection closed successfully.');
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
    
    const pgClient = new PgClient({
      host,
      user,
      password,
      database,
      port,
    });

    try {
      await pgClient.connect();
      console.log('Successfully connected to PostgreSQL.');
      
      const result = await pgClient.query('SELECT CURRENT_TIMESTAMP;');
      const currentTime = result.rows.length > 0 ? result.rows[0].current_timestamp : 'Not found';

      return { 
        success: true, 
        message: `PostgreSQL connection to ${host} successful.`,
        details: `Current PostgreSQL time: ${currentTime}`,
        data: { postgresTime: currentTime }
      };
    } catch (err: any) {
      console.error("PostgreSQL connection or query error:", err);
      return { 
        success: false, 
        message: "PostgreSQL connection test failed.", 
        details: err.message || "Check server logs." 
      };
    } finally {
      await pgClient.end();
      console.log('PostgreSQL connection closed.');
    }
  }

  return { success: false, message: `Unsupported source type: ${input.sourceType}` };
}
