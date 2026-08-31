import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { layoutScene } from './slk';
import { parseSpec } from './spec';
import type { Scene } from './types';

const ctx = { profile: 'step' as const, family: 'scene' };

const DIRECTED_SEQUENCE = [
  'kind: apparatus',
  'part: destination_wide pipe broad outlet',
  'part: source_wide pipe broad inlet',
  'part: constriction_narrow pipe narrow throat',
  'relation: source_wide sends-to constriction_narrow flow_right',
  'relation: constriction_narrow sends-to destination_wide flow_right',
].join('\n');

type Role = 'wide' | 'narrow';

function requireScene(content: string): Scene {
  const result = compileScene(parseSpec('scene', content), ctx);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

function partId(name: string): string {
  return name.toLowerCase().replace(/_/g, '-');
}

function center(scene: Scene, id: string): { x: number; y: number } {
  const node = scene.nodes.find((candidate) => candidate.id === `part-${partId(id)}`);
  if (!node) throw new Error(`missing part node ${id}`);
  return { x: node.bbox.x + node.bbox.w / 2, y: node.bbox.y + node.bbox.h / 2 };
}

function glyphHeight(scene: Scene, id: string): number {
  const glyph = scene.strokes.find((stroke) => stroke.id === `part-${partId(id)}`);
  if (!glyph || glyph.kind !== 'polygon') throw new Error(`missing polygon glyph ${id}`);
  const ys = glyph.points.filter((_, index) => index % 2 === 1);
  return Math.max(...ys) - Math.min(...ys);
}

function connectorSegmentsAvoidNodeInteriors(scene: Scene): boolean {
  return scene.strokes
    .filter((stroke) => stroke.role === 'connector' && stroke.id.startsWith('relation-'))
    .every((stroke) => {
      for (let index = 0; index + 3 < stroke.points.length; index += 2) {
        const x1 = stroke.points[index]!;
        const y1 = stroke.points[index + 1]!;
        const x2 = stroke.points[index + 2]!;
        const y2 = stroke.points[index + 3]!;
        const samples = [0.25, 0.5, 0.75];
        for (const t of samples) {
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          const hit = scene.nodes.find((node) => {
            const { x: nx, y: ny, w, h } = node.bbox;
            return x > nx + 0.5 && x < nx + w - 0.5 && y > ny + 0.5 && y < ny + h - 0.5;
          });
          if (hit) return false;
        }
      }
      return true;
    });
}

const FEEDBACK_NETWORK = [
  'kind: network',
  'part: controller',
  'element: signal_a',
  'part: processor',
  'element: signal_b',
  'part: actuator',
  'element: output',
  'element: observation',
  'relation: controller sends-to signal_a',
  'relation: signal_a sends-to processor',
  'relation: processor sends-to signal_b',
  'relation: signal_b sends-to actuator',
  'relation: actuator sends-to output',
  'relation: output sends-to observation',
  'relation: observation inhibits controller',
  'relation: observation inhibits processor',
].join('\n');

function layoutCertificate(scene: Scene, sequence: readonly string[], roles: Readonly<Record<string, Role>>): boolean {
  const layout = layoutScene(scene);
  if (!layout.ok) return false;

  const placedById = new Map(layout.placed.map((placed) => [placed.label.id, placed]));
  const centers = sequence.map((id) => center(scene, id));
  const labelsAttached = sequence.every((id) => {
    const normalizedId = partId(id);
    const label = scene.labels.find((candidate) => candidate.id === `part-${normalizedId}-label`);
    const placed = placedById.get(`part-${normalizedId}-label`);
    return label?.anchorId === `part-${normalizedId}` && placed !== undefined &&
      Math.hypot(placed.x - centers[sequence.indexOf(id)]!.x, placed.y - centers[sequence.indexOf(id)]!.y) < 80;
  });
  if (!labelsAttached) return false;

  for (let i = 1; i < centers.length; i++) {
    if (centers[i - 1]!.x >= centers[i]!.x) return false;
  }

  const wideHeights = sequence.filter((id) => roles[id] === 'wide').map((id) => glyphHeight(scene, id));
  const narrowHeights = sequence.filter((id) => roles[id] === 'narrow').map((id) => glyphHeight(scene, id));
  if (!wideHeights.length || !narrowHeights.length || Math.min(...wideHeights) <= Math.max(...narrowHeights)) return false;

  const directed = scene.strokes.filter((stroke) => stroke.id.startsWith('relation-') && stroke.markerEnd && stroke.points.length >= 4);
  return directed.length === sequence.length - 1 && directed.every((stroke) => stroke.points[0]! < stroke.points[2]!);
}

describe('L1 relation-aware physical scene layout', () => {
  it('keeps directed part sequences ordered, labels attached, and role geometry distinct', () => {
    const scene = requireScene(DIRECTED_SEQUENCE);
    expect(layoutCertificate(scene, ['source_wide', 'constriction_narrow', 'destination_wide'], {
      source_wide: 'wide',
      constriction_narrow: 'narrow',
      destination_wide: 'wide',
    })).toBe(true);
  });

  it('rejects a deliberately altered glyph in the Scene IR certificate', () => {
    const scene = requireScene(DIRECTED_SEQUENCE);
    const wrong = structuredClone(scene);
    const narrow = wrong.strokes.find((stroke) => stroke.id === 'part-constriction-narrow');
    const wide = wrong.strokes.find((stroke) => stroke.id === 'part-source-wide');
    expect(narrow?.kind).toBe('polygon');
    expect(wide?.kind).toBe('polygon');
    if (narrow && wide && narrow.kind === 'polygon' && wide.kind === 'polygon') narrow.points = [...wide.points];
    expect(layoutCertificate(wrong, ['source_wide', 'constriction_narrow', 'destination_wide'], {
      source_wide: 'wide',
      constriction_narrow: 'narrow',
      destination_wide: 'wide',
    })).toBe(false);
  });

  it('keeps arbitrary directed feedback networks readable and directional', () => {
    const scene = requireScene(FEEDBACK_NETWORK);
    const layout = layoutScene(scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;

    const declaredNames = ['controller', 'signal_a', 'processor', 'signal_b', 'actuator', 'output', 'observation'];
    const placedIds = new Set(layout.placed.map((placed) => placed.label.id));
    expect(declaredNames.every((name) => placedIds.has(`part-${partId(name)}-label`))).toBe(true);
    expect(connectorSegmentsAvoidNodeInteriors(scene)).toBe(true);

    const feedback = scene.strokes.filter((stroke) => stroke.id.startsWith('relation-inhibits'));
    expect(feedback).toHaveLength(2);
    expect(feedback.every((stroke) => stroke.markerEnd && stroke.dash)).toBe(true);
    expect(feedback.every((stroke) => stroke.points.length >= 6)).toBe(true);
  });
});
