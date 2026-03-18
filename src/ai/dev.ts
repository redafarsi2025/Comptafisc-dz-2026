import { config } from 'dotenv';
config();

import '@/ai/flows/invoice-ocr-extraction.ts';
import '@/ai/flows/fiscal-compliance-alerts.ts';
import '@/ai/flows/ai-fiscal-assistant.ts';
import '@/ai/flows/fiscal-update-parsing.ts';
