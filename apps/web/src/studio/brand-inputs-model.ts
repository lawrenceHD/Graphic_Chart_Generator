import { MAX_LOGOS_PER_PROJECT, detectLogoRole, type LogoRole } from '@app/contracts';

// What the person gives at the start of a project: several logo files (exactly one primary, the others
// variants with a role detected from the name and changeable) and at most one manifest document. Pure
// state transitions: the components own the React state, the upload code reads `toUploads`.
export interface LogoEntry {
  readonly id: string;
  readonly file: File;
  readonly role: LogoRole;
  readonly primary: boolean;
}

export interface BrandInputs {
  readonly logos: readonly LogoEntry[];
  readonly document: File | null;
}

export const EMPTY_INPUTS: BrandInputs = { logos: [], document: null };

export type AddError = 'TOO_MANY_LOGOS';

/** Exactly one primary when there is a logo: the flagged one, else the first. The primary's role is fixed. */
function normalize(logos: readonly LogoEntry[]): readonly LogoEntry[] {
  const flagged = logos.find((logo) => logo.primary)?.id ?? logos[0]?.id;
  return logos.map((logo) =>
    logo.id === flagged
      ? { ...logo, primary: true, role: 'primary' }
      : { ...logo, primary: false },
  );
}

export function addLogo(
  inputs: BrandInputs,
  file: File,
  newId: () => string,
): { readonly state: BrandInputs; readonly error?: AddError } {
  if (inputs.logos.length >= MAX_LOGOS_PER_PROJECT) return { state: inputs, error: 'TOO_MANY_LOGOS' };
  const entry: LogoEntry = {
    id: newId(),
    file,
    role: detectLogoRole(file.name),
    primary: false,
  };
  return { state: { ...inputs, logos: normalize([...inputs.logos, entry]) } };
}

export function removeLogo(inputs: BrandInputs, id: string): BrandInputs {
  return { ...inputs, logos: normalize(inputs.logos.filter((logo) => logo.id !== id)) };
}

export function setPrimary(inputs: BrandInputs, id: string): BrandInputs {
  const logos = inputs.logos.map((logo) => {
    if (logo.id === id) return { ...logo, primary: true };
    // The former primary becomes a variant: its name tells which one.
    return logo.primary ? { ...logo, primary: false, role: detectLogoRole(logo.file.name) } : logo;
  });
  return { ...inputs, logos: normalize(logos) };
}

export function setRole(inputs: BrandInputs, id: string, role: LogoRole): BrandInputs {
  return {
    ...inputs,
    logos: inputs.logos.map((logo) => (logo.id === id && !logo.primary ? { ...logo, role } : logo)),
  };
}

export function setDocument(inputs: BrandInputs, file: File | null): BrandInputs {
  return { ...inputs, document: file };
}

export const primaryLogo = (inputs: BrandInputs): File | undefined =>
  inputs.logos.find((logo) => logo.primary)?.file;

export type UploadDeclaration =
  | { readonly kind: 'logo_original'; readonly role?: LogoRole; readonly primary?: boolean }
  | { readonly kind: 'brief_doc' };

export interface Upload {
  readonly file: File;
  readonly declaration: UploadDeclaration;
}

/** Files to send, in order: the primary first (it carries the analysis), variants, then the document. */
export function toUploads(inputs: BrandInputs): readonly Upload[] {
  const logos = [...inputs.logos].sort((a, b) => Number(b.primary) - Number(a.primary));
  const uploads: Upload[] = logos.map((logo) => ({
    file: logo.file,
    declaration: { kind: 'logo_original', role: logo.role, primary: logo.primary },
  }));
  if (inputs.document !== null)
    uploads.push({ file: inputs.document, declaration: { kind: 'brief_doc' } });
  return uploads;
}
