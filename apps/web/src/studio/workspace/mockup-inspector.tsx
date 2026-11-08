'use client';

import type { BrandDocument } from '@app/document';
import { useTranslations } from 'next-intl';
import { availableLogos } from '../mockups/objects';
import { objectsOfScene } from '../mockups/scene-hits';

// Settings of the object selected in a mockup scene (06_MOCKUP_ENGINE.md §4.3): what the scene lets this
// object take, and only that. An object a scene fixes says so rather than offering a control that does nothing.
export function MockupObjectPanel({
  scene,
  objectId,
  document,
}: {
  readonly scene: string;
  readonly objectId: string | undefined;
  readonly document: BrandDocument;
}) {
  const t = useTranslations('workspace.mockup');
  const tf = useTranslations('workspace.proof.finish');
  const tl = useTranslations('workspace.proof.logo');
  const objects = objectsOfScene(scene);
  const index = objects.findIndex((entry) => entry.id === objectId);
  const object = objects[index];
  if (object === undefined) return <p className="m-0 text-sm text-ink-3">{t('pickHint')}</p>;
  const has = (kind: 'mono-black' | 'mono-white'): string | null =>
    document.assets.variants.some((variant) => variant.kind === kind) ? kind : null;
  const logos = availableLogos({
    'mono-black': has('mono-black'),
    'mono-white': has('mono-white'),
  });
  return (
    <section aria-label={t('inspectorTitle')} className="flex flex-col gap-2">
      <p className="m-0 text-sm font-medium text-ink">
        {t(`object.${object.kind}`, { n: index + 1 })}
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ink-2">
        <li>{object.paints.length > 0 ? t('available.paint') : t('available.paintFixed')}</li>
        <li>
          {object.finishes.length > 1
            ? t('available.finish', { list: object.finishes.map((entry) => tf(entry)).join(', ') })
            : t('available.finishFixed')}
        </li>
        <li>
          {object.kind === 'surface'
            ? t('available.logo', { list: logos.map((entry) => tl(entry)).join(', ') })
            : t('available.logoFixed')}
        </li>
      </ul>
    </section>
  );
}
