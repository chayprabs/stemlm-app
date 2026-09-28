import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';

// FIG-FISCHER-01: in a Fischer projection each crossing IS a stereocentre; its carbon is not written, and the two
// horizontal substituents sit left and right of it.
const CASES: Array<[string, string]> = [
  ['one centre', 'backbone: CHO,C,CH2OH\nleft: H\nright: OH'],
  ['four centres', 'backbone: CHO,C,C,C,C,CH2OH\nleft: H,OH,H,H\nright: OH,H,OH,OH'],
  ['amino acid', 'backbone: COOH,C,CH3\nleft: H2N\nright: H'],
  ['numbered centres', 'backbone: CHO,C2,C3,CH2OH\nleft: OH,H\nright: H,OH'],
];

function overlaps(a: { x1: number; y1: number; x2: number; y2: number }, b: typeof a): boolean {
  return a.x1 < b.x2 - 0.5 && b.x1 < a.x2 - 0.5 && a.y1 < b.y2 - 0.5 && b.y1 < a.y2 - 0.5;
}

describe('Fischer projection', () => {
  it.each(CASES)('%s: crossings carry no carbon letters and substituents sit clear on their own side', async (_name, content) => {
    const result = await compileDiagramSpec({ type: 'fischer', content }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    const backbone = /backbone:\s*(.+)/.exec(content)![1]!.split(',').map((item) => item.trim());
    const left = /left:\s*(.+)/.exec(content)![1]!.split(',').map((item) => item.trim());
    const right = /right:\s*(.+)/.exec(content)![1]!.split(',').map((item) => item.trim());
    const centerX = result.scene.strokes.find((stroke) => stroke.id === 'backbone-0')!.points[0]!;

    for (let i = 1; i < backbone.length - 1; i++) {
      expect(layout.placed.some((item) => item.label.id === `center-label-${i}`), `centre ${i} is written as "${backbone[i]}"`).toBe(false);
      const l = layout.placed.find((item) => item.label.id === `fischer-left-label-${i}`)!;
      const r = layout.placed.find((item) => item.label.id === `fischer-right-label-${i}`)!;
      expect(l.label.text).toBe(left[i - 1]);
      expect(r.label.text).toBe(right[i - 1]);
      expect(l.box.x2, `left substituent ${i}`).toBeLessThanOrEqual(centerX);
      expect(r.box.x1, `right substituent ${i}`).toBeGreaterThanOrEqual(centerX);
    }
    for (const end of [0, backbone.length - 1]) {
      expect(layout.placed.find((item) => item.label.id === `center-label-${end}`)?.label.text).toBe(backbone[end]);
    }
    for (let i = 0; i < layout.placed.length; i++) {
      for (let j = i + 1; j < layout.placed.length; j++) {
        const a = layout.placed[i]!;
        const b = layout.placed[j]!;
        expect(overlaps(a.box, b.box), `${a.label.text} × ${b.label.text}`).toBe(false);
      }
    }
  });
});
