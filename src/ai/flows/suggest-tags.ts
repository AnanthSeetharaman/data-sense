// src/ai/flows/suggest-tags.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting relevant tags for datasets.
 *
 * The flow takes a dataset name and schema as input and uses a language model to suggest relevant tags.
 * It exports the SuggestTagsInput and SuggestTagsOutput types, as well as the suggestTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTagsInputSchema = z.object({
  datasetName: z.string().describe('The name of the dataset.'),
  schema: z.string().describe('The schema of the dataset.'),
});

export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

const SuggestTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested tags for the dataset.'),
});

export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const suggestTagsPrompt = ai.definePrompt({
  name: 'suggestTagsPrompt',
  input: {schema: SuggestTagsInputSchema},
  output: {schema: SuggestTagsOutputSchema},
  prompt: `You are an expert data cataloguer. Given the name and schema of a dataset, you will suggest relevant tags to improve its discoverability.

Dataset Name: {{{datasetName}}}
Schema: {{{schema}}}

Suggest at least 3 relevant tags:`,
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: 'suggestTagsFlow',
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async input => {
    const {output} = await suggestTagsPrompt(input);
    return output!;
  }
);
