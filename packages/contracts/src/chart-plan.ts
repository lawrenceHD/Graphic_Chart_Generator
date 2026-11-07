import { z } from 'zod';
import { PageTypeSchema } from './document-types.js';

export const MAX_CHART_SECTIONS = 40;
export const MAX_SECTION_EVIDENCE = 20;

const planText = z
  .string()
  .refine((value) => value === value.normalize('NFC'))
  .refine((value) => !/<[A-Za-z/!]/u.test(value));

// Identifier of a reference in the research corpus that backs a section (07_AI_COPILOT.md).
export const EvidenceRefSchema = planText.min(1).max(64);
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const ChartSectionSchema = z
  .object({
    type: PageTypeSchema,
    title: planText.min(1).max(80),
    evidence: z.array(EvidenceRefSchema).max(MAX_SECTION_EVIDENCE),
  })
  .strict();
export type ChartSection = z.infer<typeof ChartSectionSchema>;

// Ordered sections of a charter: the plan drives the number, the order and the titles of the pages.
export const ChartPlanSchema = z
  .object({ sections: z.array(ChartSectionSchema).min(1).max(MAX_CHART_SECTIONS) })
  .strict();
export type ChartPlan = z.infer<typeof ChartPlanSchema>;
