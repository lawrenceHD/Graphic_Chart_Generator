import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PsdSceneSchema } from '@app/contracts';
import { parseScene } from '@app/mockup-engine';
import { describe, expect, it } from 'vitest';
import { SCENE_INDEX, SceneIndexEntrySchema, sceneIndexEntry } from './scene-index';

const SCENES = join(import.meta.dirname, '../../public/scenes');
const read = (id: string, file: string): unknown =>
  JSON.parse(readFileSync(join(SCENES, id, file), 'utf8'));

describe('scene index', () => {
  it('lists exactly the scene folders of /public/scenes', () => {
    const folders = readdirSync(SCENES, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(SCENE_INDEX.map((entry) => entry.id).sort()).toEqual(folders);
  });

  it('refuses an unknown category or a missing subject', () => {
    const [first] = SCENE_INDEX;
    expect(SceneIndexEntrySchema.safeParse({ ...first, category: 'bottles' }).success).toBe(false);
    expect(SceneIndexEntrySchema.safeParse({ ...first, subject: '' }).success).toBe(false);
    expect(sceneIndexEntry('nope')).toBeUndefined();
  });

  describe.each(SCENE_INDEX)('$id', (entry) => {
    it('ships a valid scene file, its photograph and its masks', () => {
      const json = read(entry.id, 'scene.json');
      expect(existsSync(join(SCENES, entry.id, 'LICENSE.md'))).toBe(true);
      if (entry.kind === 'psd') {
        expect(PsdSceneSchema.safeParse(json).success).toBe(true);
        return;
      }
      const parsed = parseScene(json);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const { scene } = parsed.value;
      expect(scene.id).toBe(entry.id);
      expect(scene.category).toBe(entry.category);
      expect(scene.surfaces).toHaveLength(entry.surfaces);
      expect(existsSync(join(SCENES, entry.id, 'base.webp'))).toBe(true);
      for (const surface of scene.surfaces)
        expect(existsSync(join(SCENES, entry.id, surface.mask ?? 'missing')), surface.id).toBe(
          true,
        );
    });
  });
});
