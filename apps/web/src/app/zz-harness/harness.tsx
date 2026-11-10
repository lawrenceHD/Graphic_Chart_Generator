'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_EXAMPLE_ID } from '../../landing/examples';
import { builtExample } from '../../landing/examples/build';
import { MockupStage, type SceneId } from '../../studio/mockups/mockup-stage';
import { useDirecting } from '../../studio/mockups/use-directing';
import { Inspector } from '../../studio/workspace/inspector';
import type { Selection } from '../../studio/workspace/page-canvas';

// TEMPORARY capture harness, not committed.
const SCENE_IDS: readonly SceneId[] = ['place-cards', 'mug-white'];

export function Harness() {
  const built = useMemo(() => builtExample(DEFAULT_EXAMPLE_ID), []);
  const { directing, onDirected } = useDirecting();
  const [selection, setSelection] = useState<Selection | null>(null);
  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>
        {SCENE_IDS.map((scene) => (
          <MockupStage
            key={scene}
            scene={scene}
            view={built.view}
            label={scene}
            failedLabel="failed"
            retryLabel="retry"
            choices={directing.choices(scene)}
            onDirected={onDirected}
            pick={{
              selected: selection?.kind === 'mockup' && selection.id === scene ? (selection.object ?? null) : null,
              onSelect: (object) => {
                setSelection(object === null ? { kind: 'mockup', id: scene } : { kind: 'mockup', id: scene, object });
              },
              labelOf: (kind, index) => `${kind} ${String(index + 1)}`,
              groupLabel: `Objets ${scene}`,
            }}
          />
        ))}
      </div>
      <aside style={{ width: 312 }}>
        <Inspector
          brand={built.view.name}
          colors={built.view.colors}
          directing={directing}
          document={built.document}
          selection={selection}
          onPreview={() => undefined}
          onRun={() => undefined}
        />
      </aside>
    </div>
  );
}
