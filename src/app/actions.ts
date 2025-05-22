
'use server';

import { suggestTags as suggestTagsFlow, type SuggestTagsInput, type SuggestTagsOutput } from '@/ai/flows/suggest-tags';
import { z } from 'zod';
import { Snowflake } from 'snowflake-sdk';
import { Client } from 'pg';

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
  region: string; // e.g., 'EU', 'NA', or 'GLOBAL' for PG
  url?: string; // JDBC-like URL for Snowflake, potentially PG connection string
  sourceType: 'Snowflake' | 'PostgreSQL'; // To know which logic to attempt
}

export interface TestConnectionOutput {
  success: boolean;
  message: string;
  details?: string;
}

export async function testDatabaseConnection(input: TestConnectionInput): Promise<TestConnectionOutput> {
  console.log("Attempting to test connection with input:", input);

  if (input.sourceType === 'Snowflake') {
    if (!input.url) {
      return { success: false, message: "Snowflake URL is missing for the selected region." };
    }
    // Placeholder for Snowflake connection test
    // You would implement the actual Snowflake connection logic here
    // using the snowflake-sdk and environment variables for credentials.
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    // const warehouse = process.env.SNOWFLAKE_WAREHOUSE; // etc.

    if (!account || !username || !password) {
      return {
        success: false,
        message: "Snowflake connection failed (Simulated).",
        details: "Required Snowflake environment variables (SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD) are not set in .env file. Please configure them and implement the connection logic in src/app/actions.ts."
      };
    }

    // TODO: Implement actual Snowflake connection test using 'snowflake-sdk'
    // Example structure (this is a STUB and won't actually connect):
    try {
      // const connection = Snowflake.createConnection({
      //   account: account,
      //   username: username,
      //   password: password,
      //   url: input.url // The JDBC-like URL might need parsing for the SDK
      //   // ... other necessary parameters like warehouse, role, database, schema
      // });
      // await new Promise((resolve, reject) => {
      //   connection.connect((err, conn) => {
      //     if (err) {
      //       console.error('Snowflake connection error:', err);
      //       reject(new Error(`Snowflake Connection Error: ${err.message}`));
      //     } else {
      //       console.log('Successfully connected to Snowflake account:', conn.getSfqid());
      //       conn.destroy(() => console.log('Snowflake connection closed.'));
      //       resolve(true);
      //     }
      //   });
      // });
      console.log(`[SIMULATED] Would attempt Snowflake connection to URL: ${input.url} for region ${input.region} with user ${username}`);
      return { success: true, message: `Snowflake connection test to ${input.url} successful (Simulated). Implement actual logic in actions.ts.` };
    } catch (err: any) {
      console.error("Snowflake connection test error (Simulated):", err);
      return { success: false, message: "Snowflake connection test failed (Simulated).", details: err.message || "Check server logs." };
    }

  } else if (input.sourceType === 'PostgreSQL') {
    // Placeholder for PostgreSQL connection test
    const host = process.env.POSTGRES_HOST;
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const database = process.env.POSTGRES_DATABASE;
    const port = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432;

    if (!host || !user || !password || !database) {
       return {
        success: false,
        message: "PostgreSQL connection failed (Simulated).",
        details: "Required PostgreSQL environment variables (POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE) are not set in .env file. Please configure them and implement the connection logic in src/app/actions.ts."
      };
    }
    // TODO: Implement actual PostgreSQL connection test using 'pg' client
    // Example structure (this is a STUB and won't actually connect):
    try {
      // const client = new Client({
      //   host,
      //   user,
      //   password,
      //   database,
      //   port,
      // });
      // await client.connect();
      // console.log('Successfully connected to PostgreSQL.');
      // await client.end();
      console.log(`[SIMULATED] Would attempt PostgreSQL connection to host: ${host}, database: ${database}`);
      return { success: true, message: "PostgreSQL connection test successful (Simulated). Implement actual logic in actions.ts." };
    } catch (err: any) {
      console.error("PostgreSQL connection test error (Simulated):", err);
      return { success: false, message: "PostgreSQL connection test failed (Simulated).", details: err.message || "Check server logs." };
    }
  }

  return { success: false, message: `Unsupported source type: ${input.sourceType}` };
}
