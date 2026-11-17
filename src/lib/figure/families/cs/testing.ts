/** Test support for the computer-science families: compile a spec and read the laid-out scene. */
import { expect } from 'vitest';
import { compileDiagramSpec } from '../../compile';
import { boxesOverlap, type Box } from '../../geom';
import { layoutScene, type PlacedLabel } from '../../slk';
import { FONT_MIN, type CompileResult, type Scene, type SceneStroke } from '../../types';

export async function compile(type: string, content: string): Promise<CompileResult> {
  return compileDiagramSpec({ type, content }, 'step');
}

export interface Drawn {
  scene: Scene;
  placed: PlacedLabel[];
  text: (id: string) => string | undefined;
  texts: () => string[];
  stroke: (id: string) => SceneStroke | undefined;
}

/** Compile, require success, and return the scene with its labels as the kernel placed them. */
export async function draw(type: string, content: string): Promise<Drawn> {
  const result = await compile(type, content);
  expect(result.ok ? 'drawn' : result.reason).toBe('drawn');
  if (!result.ok) throw new Error(result.reason);
  const layout = layoutScene(result.scene);
  if (!layout.ok) throw new Error(layout.reason);
  expect(layout.fontSize, 'labels keep the minimum font size').toBe(FONT_MIN);
  const { scene } = result;
  return {
    scene,
    placed: layout.placed,
    text: (id) => scene.labels.find((label) => label.id === id)?.text,
    texts: () => scene.labels.map((label) => label.text ?? ''),
    stroke: (id) => scene.strokes.find((stroke) => stroke.id === id),
  };
}

export async function reason(type: string, content: string): Promise<string> {
  const result = await compile(type, content);
  expect(result.ok, 'expected the figure to be refused').toBe(false);
  return result.ok ? '' : result.reason;
}

/** Every label sits exactly where its family put it, inside the frame, clear of every other label. */
export function expectCleanLabels(drawn: Drawn): void {
  const { scene, placed } = drawn;
  expect(placed.length).toBe(scene.labels.length);
  placed.forEach((item, i) => {
    expect(item.x, `${item.label.id} was moved`).toBeCloseTo(item.label.x, 5);
    expect(item.y, `${item.label.id} was moved`).toBeCloseTo(item.label.y, 5);
    expect(item.leader, `${item.label.id} has a leader`).toBeUndefined();
    expect(item.box.x1, `${item.label.id} left of the frame`).toBeGreaterThanOrEqual(0);
    expect(item.box.x2, `${item.label.id} right of the frame`).toBeLessThanOrEqual(scene.width);
    expect(item.box.y1, `${item.label.id} above the frame`).toBeGreaterThanOrEqual(0);
    expect(item.box.y2, `${item.label.id} below the frame`).toBeLessThanOrEqual(scene.height);
    placed.slice(i + 1).forEach((other) => {
      expect(boxesOverlap(item.box, other.box, 0), `${item.label.id} overlaps ${other.label.id}`).toBe(false);
    });
  });
}

export function boxOf(stroke: SceneStroke): Box {
  if (stroke.kind === 'rect') {
    const [x, y, w, h] = stroke.points as [number, number, number, number];
    return { x1: x, y1: y, x2: x + w, y2: y + h };
  }
  if (stroke.kind === 'circle') {
    const [cx, cy, r] = stroke.points as [number, number, number];
    return { x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r };
  }
  const xs = stroke.points.filter((_, i) => i % 2 === 0);
  const ys = stroke.points.filter((_, i) => i % 2 === 1);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}
