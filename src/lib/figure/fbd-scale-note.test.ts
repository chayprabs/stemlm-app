import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import { layoutScene } from './slk';

const ctx = { profile: 'step' as const, family: 'scene' };

// Live Claude answer, 2026-09-28 (round 2 q01): two free-body panels (table block, hanging block). The
// "arrows not to scale" note found no free slot and the whole correct figure was hidden.
const LIVE = [
  'kind: fbd',
  'body: block_A panel=panel_A',
  'body: block_B panel=panel_B',
  'panel: panel_A 4 kg block on table',
  'panel: panel_B 2 kg hanging block',
  'incline_deg: 0',
  'force: N_1 39.2 N up on block_A',
  'force: W_1 39.2 N weight on block_A',
  'force: T_A right on block_A',
  'force: f_k 7.85 N left on block_A',
  'force: W_2 19.6 N weight on block_B',
  'force: T_B up on block_B',
  'axes: local',
].join('\n');

describe('the free-body "arrows not to scale" note', () => {
  it('sits in a footer under the drawing instead of hiding the figure', () => {
    const result = compileScene(parseSpec('scene', LIVE), ctx);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const laid = layoutScene(result.scene);
    if (!laid.ok) throw new Error(laid.reason);
    const notes = laid.placed.filter((p) => p.label.text === 'arrows not to scale');
    expect(notes).toHaveLength(1);
    const lowest = Math.max(...result.scene.strokes.flatMap((s) => s.points.filter((_, i) => i % 2 === 1)));
    expect(notes[0]!.box.y1).toBeGreaterThan(lowest);
  });
});
