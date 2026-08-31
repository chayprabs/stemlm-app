import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import type { Scene, SceneStroke } from './types';

const ctx = { profile: 'step' as const, family: 'scene' };

function requireScene(content: string): Scene {
  const result = compileScene(parseSpec('scene', content), ctx);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

function stroke(scene: Scene, id: string): SceneStroke {
  const found = scene.strokes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing stroke ${id}`);
  return found;
}

function pointOnSegment(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-9) return Math.hypot(point.x - a.x, point.y - a.y) < 1e-6;
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  if (t < -1e-6 || t > 1 + 1e-6) return false;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy)) < 1e-6;
}

function polygonEdges(polygon: SceneStroke): Array<[{ x: number; y: number }, { x: number; y: number }]> {
  const points = polygon.points;
  return Array.from({ length: points.length / 2 }, (_, index) => {
    const next = (index + 1) % (points.length / 2);
    return [
      { x: points[index * 2]!, y: points[index * 2 + 1]! },
      { x: points[next * 2]!, y: points[next * 2 + 1]! },
    ];
  });
}

function hasEdgeAtAngle(polygon: SceneStroke, degrees: number): boolean {
  const expected = (degrees * Math.PI) / 180;
  return polygonEdges(polygon).some(([a, b]) => {
    const actual = Math.atan2(b.y - a.y, b.x - a.x);
    const difference = Math.abs(Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected)));
    const oppositeDifference = Math.abs(Math.atan2(Math.sin(actual - expected + Math.PI), Math.cos(actual - expected + Math.PI)));
    return Math.min(difference, oppositeDifference) < 1e-6;
  });
}

describe('L1 inclined rigid-body/contact geometry', () => {
  it('orients every body and its contact edge with arbitrary incline angles', () => {
    for (const incline of [17, 63]) {
      const scene = requireScene([
        'kind: fbd',
        'body: cart',
        `incline_deg: ${incline}`,
        'surface: track cart',
        'force: N on cart normal+',
        'force: f on cart up_incline',
        'force: W on cart down',
      ].join('\n'));
      const body = stroke(scene, 'body-cart');
      const contact = stroke(scene, 'contact-cart');
      const inclineStroke = stroke(scene, 'incline');

      expect(body.kind).toBe('polygon');
      expect(hasEdgeAtAngle(body, -incline)).toBe(true);
      expect(contact.points).toHaveLength(4);
      expect(hasEdgeAtAngle(contact, -incline)).toBe(true);
      expect(hasEdgeAtAngle(inclineStroke, -incline)).toBe(true);

      const bodyEdges = polygonEdges(body);
      for (const forceName of ['N', 'f', 'W']) {
        const force = stroke(scene, `force-${forceName.toLowerCase()}`);
        const start = { x: force.points[0]!, y: force.points[1]! };
        expect(bodyEdges.some(([a, b]) => pointOnSegment(start, a, b))).toBe(true);
      }
    }
  });

  it('keeps multiple force owners, members, and supports attached to the inclined basis', () => {
    const scene = requireScene([
      'kind: fbd',
      'body: upper',
      'body: lower',
      'incline_deg: 29',
      'member: rope upper lower',
      'support: roller lower',
      'force: N1 on upper normal+',
      'force: N2 on lower normal+',
    ].join('\n'));

    for (const bodyName of ['upper', 'lower']) {
      const body = stroke(scene, `body-${bodyName}`);
      expect(body.kind).toBe('polygon');
      expect(hasEdgeAtAngle(body, -29)).toBe(true);
      const force = stroke(scene, `force-n${bodyName === 'upper' ? '1' : '2'}`);
      const edges = polygonEdges(body);
      expect(edges.some(([a, b]) => pointOnSegment({ x: force.points[0]!, y: force.points[1]! }, a, b))).toBe(true);
    }

    expect(stroke(scene, 'member-rope').role).toBe('connector');
    const supportBase = stroke(scene, 'support-roller');
    expect(supportBase.kind).toBe('line');
    expect(hasEdgeAtAngle(supportBase, -29)).toBe(true);
  });
});
