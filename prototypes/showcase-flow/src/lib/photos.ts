const files = import.meta.glob('../data/mockups/*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const PHOTOS = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const match = /mockups\/([^/]+)\/([^/]+)\.webp$/.exec(path);
  if (match && typeof url === 'string') PHOTOS.set(`${match[1]}/${match[2]}`, url);
}

export const photoOf = (slug: string, scene: string): string | undefined =>
  PHOTOS.get(`${slug}/${scene}`);

export const hasPhotos = (slug: string): boolean =>
  ['cards', 'store', 'tote', 'tee', 'phone', 'billboard', 'office'].some((scene) =>
    PHOTOS.has(`${slug}/${scene}`)
  );
