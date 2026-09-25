import { expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

it('keeps each tall two-column row beside its value without a duplicate key-only panel', async () => {
  const result = await compileDiagramSpec({ type: 'table', content: [
    'kind: matrix', 'headers: row,value',
    ...Array.from({ length: 20 }, (_, i) => `row: ${i + 1},$x_{${i + 1}}$`),
  ].join('\n') });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  for (let i = 0; i < 20; i++) {
    expect(result.scene.labels.filter(label => label.text === String(i + 1))).toHaveLength(1);
    expect(result.scene.labels.filter(label => label.katex === `$x_{${i + 1}}$`)).toHaveLength(1);
  }
  expect(result.scene.strokes.filter(stroke => stroke.kind === 'rect' && stroke.id.startsWith('frame'))).toHaveLength(1);
});
