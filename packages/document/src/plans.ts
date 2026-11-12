import { DENSE_PAGES, type ChartPlan } from '@app/contracts';

// The standard charter, 15 pages: the 14 dense pages of the content study (ADR-035), each drawn by its
// section, then the tokens page. Used when no research plan is available; a research plan adds the sector
// pages between the two.
export const STANDARD_PAGE_COUNT = DENSE_PAGES.length + 1;

export function standardChartPlan(language: 'fr' | 'en'): ChartPlan {
  return {
    sections: [
      ...DENSE_PAGES.map(({ section, type, title }) => ({
        type,
        title: title[language],
        evidence: [],
        section,
      })),
      { type: 'tokens', title: 'Tokens', evidence: [] },
    ],
  };
}
