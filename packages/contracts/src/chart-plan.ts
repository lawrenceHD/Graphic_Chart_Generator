import { z } from 'zod';
import { PAGE_CAPACITY, PageTypeSchema, type PageType } from './document-types.js';
import { GuidelineSectionSchema } from './reference.js';

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
    // The guideline section the page shows (ADR-035): the studio draws a page by its section, not its rank.
    section: GuidelineSectionSchema.optional(),
  })
  .strict();
export type ChartSection = z.infer<typeof ChartSectionSchema>;

// Ordered sections of a charter: the plan drives the number, the order and the titles of the pages.
export const ChartPlanSchema = z
  .object({ sections: z.array(ChartSectionSchema).min(1).max(MAX_CHART_SECTIONS) })
  .strict()
  .superRefine((plan, context) => {
    const counts = new Map<PageType, number>();
    for (const { type } of plan.sections) counts.set(type, (counts.get(type) ?? 0) + 1);
    for (const [type, count] of counts) {
      if (count > PAGE_CAPACITY[type]) {
        context.addIssue({
          code: 'custom',
          path: ['sections'],
          message: `Too many sections of type ${type} (capacity ${String(PAGE_CAPACITY[type])}).`,
        });
      }
    }
  });
export type ChartPlan = z.infer<typeof ChartPlanSchema>;
