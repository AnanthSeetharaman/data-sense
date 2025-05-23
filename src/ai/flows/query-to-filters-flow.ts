'use server';
/**
 * @fileOverview This file defines a Genkit flow for converting natural language user queries into structured filter parameters.
 *
 * The flow takes a user query as input and uses a language model to extract
 * the intended data source (Snowflake or MetaStore) and relevant tags.
 * It exports the QueryToFiltersInput and QueryToFiltersOutput types,
 * as well as the queryToFilters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QueryToFiltersInputSchema = z.object({
  userQuery: z.string().describe('The natural language query from the user.'),
});

export type QueryToFiltersInput = z.infer<typeof QueryToFiltersInputSchema>;

const QueryToFiltersOutputSchema = z.object({
  source: z.enum(['Snowflake', 'MetaStore']).nullable().describe('The data source extracted from the query. Can be "Snowflake", "MetaStore", or null if not specified or ambiguous.'),
  tags: z.string().nullable().describe('A comma-separated string of tags or keywords extracted from the query. Can be null if no specific tags are mentioned.'),
});

export type QueryToFiltersOutput = z.infer<typeof QueryToFiltersOutputSchema>;

export async function queryToFilters(input: QueryToFiltersInput): Promise<QueryToFiltersOutput> {
  return queryToFiltersFlow(input);
}

const queryToFiltersPrompt = ai.definePrompt({
  name: 'queryToFiltersPrompt',
  input: {schema: QueryToFiltersInputSchema},
  output: {schema: QueryToFiltersOutputSchema},
  prompt: `You are an AI assistant helping users find data assets. The user will provide a natural language query.
Your task is to extract the following from the query:
1.  **source**: The data source the user is interested in. This must be one of "Snowflake" or "MetaStore". If not specified or ambiguous, output null for the source.
2.  **tags**: A comma-separated string of tags or keywords that describe the data (e.g., "customer, pii, finance"). If no specific tags are mentioned, output null for tags.

User Query: {{{userQuery}}}

Provide the output in the specified JSON format. For example, if the user asks for "Snowflake tables about customer data", the output should be:
{
  "source": "Snowflake",
  "tags": "customer"
}
If the user says "find metastore assets related to sales and marketing", output:
{
  "source": "MetaStore",
  "tags": "sales, marketing"
}
If the user says "show me everything", output:
{
  "source": null,
  "tags": null
}`,
});

const queryToFiltersFlow = ai.defineFlow(
  {
    name: 'queryToFiltersFlow',
    inputSchema: QueryToFiltersInputSchema,
    outputSchema: QueryToFiltersOutputSchema,
  },
  async input => {
    const {output} = await queryToFiltersPrompt(input);
    return output!;
  }
);
