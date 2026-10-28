// The logo chosen on "Démarrer" travels to /studio/[id] in memory (client navigation keeps the module):
// the studio sends it as soon as it subscribes to the project's events. Taken once.
const pending = new Map<string, File>();

export function holdLogo(projectId: string, file: File): void {
  pending.set(projectId, file);
}

export function takeLogo(projectId: string): File | undefined {
  const file = pending.get(projectId);
  pending.delete(projectId);
  return file;
}
