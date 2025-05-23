import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-tags.ts';
import '@/ai/flows/query-to-filters-flow.ts'; // Added import for the new flow
