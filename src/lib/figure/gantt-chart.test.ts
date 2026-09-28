import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';

// A Gantt chart of CPU slices (no two overlap) is one lane: slices side by side at one time scale, each process name
// inside its slice, a time written under every boundary, repeated processes (round robin) allowed, idle gaps shown.
// Overlapping tasks (a project plan) get one row per task on a time axis.
type Rect = { x: number; y: number; w: number; h: number };
type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;
const rect = (scene: Scene, id: string): Rect => {
  const [x, y, w, h] = scene.strokes.find((s) => s.id === id && s.kind === 'rect')!.points as [number, number, number, number];
  return { x, y, w, h };
};

function jobs(spec: string): Array<{ name: string; start: number; duration: number }> {
  return /jobs:\s*(.+)/.exec(spec)![1]!.split(';').map((part) => {
    const [name, start, duration] = part.trim().split(/\s+/);
    return { name: name!, start: Number(start), duration: Number(duration) };
  });
}

const LANES: Record<string, { spec: string; times: number[] }> = {
  FCFS: { spec: 'jobs: P1 0 5; P2 5 3; P3 8 2', times: [0, 5, 8, 10] },
  'round robin (q = 2)': { spec: 'jobs: P1 0 2; P2 2 2; P3 4 1; P1 5 2; P2 7 1; P1 9 1', times: [0, 2, 4, 5, 7, 8, 9, 10] },
  'idle gap': { spec: 'jobs: P1 0 3; P2 5 2', times: [0, 3, 5, 7] },
  'SJF with a current time': { spec: 'jobs: P4 0 3; P1 3 6; P3 9 7; P2 16 8\ntnow: 9', times: [0, 3, 9, 16, 24] },
};

describe('Gantt chart', () => {
  it.each(Object.entries(LANES))('%s: one lane, names inside slices, a time at every boundary', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'gantt', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const list = jobs(c.spec);
    const bars = list.map((_, i) => rect(result.scene, `job-bar-${i}`));
    const scale = bars[0]!.w / list[0]!.duration;
    const origin = bars[0]!.x - list[0]!.start * scale;
    list.forEach((job, i) => {
      expect(bars[i]!.y, `${job.name} in the one lane`).toBeCloseTo(bars[0]!.y, 5);
      expect(bars[i]!.x, `${job.name} starts at ${job.start}`).toBeCloseTo(origin + job.start * scale, 3);
      expect(bars[i]!.w, `${job.name} lasts ${job.duration}`).toBeCloseTo(job.duration * scale, 3);
      const label = layout.placed.find((p) => p.label.id === `job-label-${i}`)!;
      expect(label.label.text).toBe(job.name);
      const b = bars[i]!;
      expect(label.box.x1 >= b.x && label.box.x2 <= b.x + b.w && label.box.y1 >= b.y && label.box.y2 <= b.y + b.h, `${job.name} inside its slice`).toBe(true);
    });
    const times = layout.placed.filter((p) => p.label.id.startsWith('time-'));
    expect(times.map((t) => Number(t.label.text)).sort((a, b) => a - b)).toEqual(c.times);
    for (const t of times) {
      expect(Math.abs((t.box.x1 + t.box.x2) / 2 - (origin + Number(t.label.text) * scale)), `time ${t.label.text} under its boundary`).toBeLessThan(1);
      expect(t.box.y1, `time ${t.label.text} below the lane`).toBeGreaterThanOrEqual(bars[0]!.y + bars[0]!.h);
    }
    if (/tnow/.test(c.spec)) {
      const now = result.scene.strokes.find((s) => s.id === 'gantt-now')!;
      expect(now.points[0]).toBeCloseTo(origin + 9 * scale, 3);
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it('overlapping tasks: one row per task on a common time axis', async () => {
    const spec = 'jobs: design 0 3; build 2 5; test 6 2; design 8 1';
    const result = await compileDiagramSpec({ type: 'gantt', content: spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    const list = jobs(spec);
    const bars = list.map((_, i) => rect(result.scene, `job-bar-${i}`));
    const scale = bars[0]!.w / list[0]!.duration;
    const origin = bars[0]!.x - list[0]!.start * scale;
    list.forEach((job, i) => expect(bars[i]!.x, `${job.name} starts at ${job.start}`).toBeCloseTo(origin + job.start * scale, 3));
    expect(bars[3]!.y, 'a task keeps its row').toBeCloseTo(bars[0]!.y, 5);
    expect(new Set(bars.map((b) => b.y.toFixed(3))).size, 'one row per task').toBe(3);
    for (const name of ['design', 'build', 'test']) {
      const label = layout.placed.find((p) => p.label.text === name)!;
      const row = bars[list.findIndex((j) => j.name === name)]!;
      expect(label.box.x2, `${name} left of its bars`).toBeLessThanOrEqual(Math.min(...bars.filter((b) => b.y === row.y).map((b) => b.x)));
      expect((label.box.y1 + label.box.y2) / 2).toBeCloseTo(row.y + row.h / 2, 0);
    }
    expect(layout.placed.filter((p) => p.label.id.startsWith('time-')).length, 'time axis ticks').toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['a process running twice at once', 'jobs: P1 0 4; P1 2 2'],
    ['a duplicate slice', 'jobs: task 0 2; task 0 2'],
    ['more slices than fit legibly', `jobs: ${Array.from({ length: 40 }, (_, i) => `Process${i} ${i} 1`).join('; ')}`],
  ])('refuses %s', async (_name, content) => {
    expect((await compileDiagramSpec({ type: 'gantt', content }, 'step')).ok).toBe(false);
  });
});
