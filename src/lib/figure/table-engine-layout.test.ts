import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { boxHitsAny, rectSegments, type Segment } from './geom';
import { layoutScene } from './slk';

const LONG_COMPARISON = [
  'kind: matrix',
  'headers: tissue, structure, primary function',
  'row: epithelial; tightly packed cells; covers and lines surfaces',
  'row: connective; cells in an extracellular matrix; supports and binds',
  'row: muscular; elongated contractile cells; produces movement',
  'row: nervous; specialized conducting cells; transmits signals',
].join('\n');

function tableStrokeSegments(scene: Parameters<typeof layoutScene>[0]): Segment[] {
  return scene.strokes.flatMap((stroke) => {
    if (stroke.kind === 'line' && stroke.points.length >= 4) {
      return [{ x1: stroke.points[0]!, y1: stroke.points[1]!, x2: stroke.points[2]!, y2: stroke.points[3]! }];
    }
    if (stroke.kind === 'rect' && stroke.points.length >= 4) {
      return rectSegments(stroke.points[0]!, stroke.points[1]!, stroke.points[2]!, stroke.points[3]!);
    }
    return [];
  });
}

describe('table engine layout', () => {
  it('fits a long four-row comparison in the fixed step card without dropping cells', async () => {
    const result = await compileDiagramSpec({
      type: 'table',
      content: LONG_COMPARISON,
    }, 'step');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.labels.filter((label) => /^table-header-\d+(?:-panel-\d+-\d+)?$/.test(label.id))).toHaveLength(3);
    expect(result.scene.labels.filter((label) => /^table-cell-\d+-\d+$/.test(label.id))).toHaveLength(12);
    for (const value of [
      'epithelial',
      'tightly packed cells',
      'covers and lines surfaces',
      'connective',
      'cells in an extracellular matrix',
      'supports and binds',
      'muscular',
      'elongated contractile cells',
      'produces movement',
      'nervous',
      'specialized conducting cells',
      'transmits signals',
    ]) {
      expect(result.scene.labels.some((label) => label.text === value)).toBe(true);
    }
  });

  it('keeps every placed label inside the card and clear of the exact 008 table grid', async () => {
    const result = await compileDiagramSpec({ type: 'table', content: LONG_COMPARISON }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    const strokes = tableStrokeSegments(result.scene);
    for (const placed of laid.placed) {
      expect(placed.box.x1).toBeGreaterThanOrEqual(0);
      expect(placed.box.y1).toBeGreaterThanOrEqual(0);
      expect(placed.box.x2).toBeLessThanOrEqual(result.scene.width);
      expect(placed.box.y2).toBeLessThanOrEqual(result.scene.height);
      expect(boxHitsAny(placed.box, strokes, 0)).toBe(false);
    }
  });
});
