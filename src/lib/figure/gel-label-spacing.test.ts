import { expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

it.each(['step', 'print'] as const)('keeps gel bands and labels readable in %s', async profile => {
  for (const content of [
    'lanes: 1,2,3\nbands: 1:100,2:80,3:60',
    'lanes: control,sample\nband: control 1000 bp\nband: sample 800 bp\nband: sample 400 bp',
  ]) {
    const result = await compileDiagramSpec({ type: 'gel', content }, profile);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) continue;
    expect(result.scene.strokes.filter(stroke => /^band-\d+$/.test(stroke.id))).toHaveLength(3);
    expect(result.scene.labels.filter(label => /^band-\d+-label$/.test(label.id))).toHaveLength(3);
  }
});
