import type { BrandInputs } from './brand-inputs-model';

// The files chosen on "Démarrer" (logos and document) travel to /studio/[id] in memory (client navigation
// keeps the module): the studio sends them as soon as it subscribes to the project's events. Taken once.
const pending = new Map<string, BrandInputs>();

export function holdInputs(projectId: string, inputs: BrandInputs): void {
  pending.set(projectId, inputs);
}

export function takeInputs(projectId: string): BrandInputs | undefined {
  const inputs = pending.get(projectId);
  pending.delete(projectId);
  return inputs;
}
