import type { ChartPlan, RasterError, RasterImage, Rasterizer } from '@app/contracts';
import type { Result } from '@app/kernel';
import {
  defaultResearch,
  planWithFallback,
  type ResearchInput,
  type ResearchPort,
  type ResearchWarning,
} from './research.js';

// The research stage of project.analyze (step 4, before the composition). It never fails the run: a
// degradation yields the standard plan and typed warnings, each one logged with its cause.

// Width of the render of the logo that Gemini reads.
export const LOGO_FOR_AI = 1024;

/** A warning of the research with the run it belongs to: no secret, no content of the brief. */
export interface ResearchLogEntry extends ResearchWarning {
  readonly analysisId: string;
  readonly projectId: string;
}

export interface ResearchStepDeps {
  readonly rasterizer: Rasterizer;
  readonly normalizeRaster: (bytes: Uint8Array) => Promise<Result<RasterImage, RasterError>>;
  /** Research of the chart plan (injected by the composition root); absent means `defaultResearch`. */
  readonly research?: ResearchPort;
  /** Receives every degradation of the research, for the logs of the worker. */
  readonly onResearchWarning?: (entry: ResearchLogEntry) => void;
}

export interface ResearchStepRun {
  readonly analysisId: string;
  readonly projectId: string;
  readonly isSvg: boolean;
  readonly logoBytes: Uint8Array;
}

export interface ResearchStepResult {
  readonly plan: ChartPlan;
  /** Codes of the warnings, most important first: they go to the events of the step. */
  readonly codes: readonly string[];
}

export async function researchStep(
  deps: ResearchStepDeps,
  run: ResearchStepRun,
  input: Omit<ResearchInput, 'logo'>,
): Promise<ResearchStepResult> {
  const report = (warning: ResearchWarning): void =>
    deps.onResearchWarning?.({ analysisId: run.analysisId, projectId: run.projectId, ...warning });
  const image = run.isSvg
    ? await deps.rasterizer.rasterize(new TextDecoder().decode(run.logoBytes), LOGO_FOR_AI)
    : await deps.normalizeRaster(run.logoBytes);
  if (!image.ok) report({ code: 'RESEARCH_LOGO_UNRENDERABLE', detail: image.error.code });
  const logo = image.ok ? { data: image.value.png, mimeType: 'image/png' as const } : undefined;
  const outcome = await planWithFallback(deps.research ?? defaultResearch, {
    ...input,
    ...(logo === undefined ? {} : { logo }),
  });
  for (const warning of outcome.warnings) report(warning);
  return { plan: outcome.plan, codes: outcome.warnings.map(({ code }) => code) };
}
