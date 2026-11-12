import { SceneCategory } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import {
  photoQueries,
  rankPhotos,
  type Orientation,
  type Photo,
  type PhotoSearch,
} from './providers';

// The six candidate photos of an application (U-03): the sector's subjects, the person's own word first, the
// two providers whose key is set, ranked by closeness to the brand's primary. An hour of memory per search; the
// Unsplash download is reported only for a photo this server itself returned (never a URL sent by the client).
type Search = (search: PhotoSearch) => Promise<Result<readonly Photo[], 'PHOTOS_UNAVAILABLE'>>;
export type PhotoFailure = 'PHOTOS_NOT_CONFIGURED' | 'PHOTOS_UNAVAILABLE';

const TTL_MS = 60 * 60 * 1000;
const QUERIES = 2;

export function createPhotoService(deps: {
  /** The providers whose key is set, in order of preference. */
  readonly providers: readonly Search[];
  readonly now: () => number;
  /** Reports a chosen Unsplash photo to its download endpoint (Unsplash API guidelines). */
  readonly reportDownload: (location: string) => Promise<void>;
}) {
  const cache = new Map<string, { readonly at: number; readonly photos: readonly Photo[] }>();
  const known = new Map<string, Photo>();

  const search = async (key: string, query: PhotoSearch): Promise<readonly Photo[] | null> => {
    const kept = cache.get(key);
    if (kept !== undefined && deps.now() - kept.at < TTL_MS) return kept.photos;
    const answers = await Promise.all(deps.providers.map((provider) => provider(query)));
    if (answers.every((answer) => !answer.ok)) return null; // never kept: the next ask tries again
    const photos = answers.flatMap((answer) => (answer.ok ? answer.value : []));
    if (answers.every((answer) => answer.ok)) cache.set(key, { at: deps.now(), photos });
    return photos;
  };

  return {
    async candidates(input: {
      readonly category: SceneCategory;
      readonly word: string | null;
      readonly orientation: Orientation;
      readonly primary: string;
    }): Promise<Result<readonly Photo[], PhotoFailure>> {
      if (deps.providers.length === 0) return err('PHOTOS_NOT_CONFIGURED');
      const queries = photoQueries(input.category, input.word).slice(0, QUERIES);
      const lists = await Promise.all(
        queries.map((query) =>
          search(`${query}|${input.orientation}|${input.primary}`, {
            query,
            orientation: input.orientation,
            color: input.primary,
          }),
        ),
      );
      if (lists.every((list) => list === null)) return err('PHOTOS_UNAVAILABLE');
      const ranked = rankPhotos(
        lists.flatMap((list) => list ?? []),
        input.primary,
      );
      for (const photo of ranked) known.set(photo.id, photo);
      return ok(ranked);
    },

    /** The person picked this photo: Unsplash is told, as its guidelines require; false if unknown. */
    async chosen(photoId: string): Promise<boolean> {
      const photo = known.get(photoId);
      if (photo === undefined) return false;
      if (photo.downloadLocation !== null) await deps.reportDownload(photo.downloadLocation);
      return true;
    },
  };
}

const DocumentPrimary = z.object({
  tokens: z
    .object({
      colors: z
        .object({ primary: z.object({ hex: z.string().regex(/^#[0-9A-F]{6}$/u) }).loose() })
        .loose(),
    })
    .loose(),
});

/** The brand's primary colour from its document; a neutral warm grey before the analysis. */
export function primaryOf(document: unknown): string {
  const read = DocumentPrimary.safeParse(document);
  return read.success ? read.data.tokens.colors.primary.hex : '#8A8178';
}

export const categoryOf = (value: string | null): SceneCategory => {
  const read = SceneCategory.safeParse(value);
  return read.success ? read.data : 'generic';
};
