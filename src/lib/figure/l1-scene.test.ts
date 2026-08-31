import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { compileDiagramSpec } from './compile';
import { compileScene } from './engines/scene';
import { layoutAndCompile } from './pipeline';
import { parseSpec } from './spec';
import { resolveDiagram } from '@/src/lib/resolve-diagram';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import type { CompileSuccess, Scene } from './types';
import { SceneBuilder } from './scene-build';

function forceCertificate(scene: Scene): Map<string, string> {
  return new Map(
    scene.strokes
      .filter((stroke) => stroke.id.startsWith('force-') && stroke.points.length >= 4)
      .map((stroke) => {
        const [x1, y1, x2, y2] = stroke.points;
        const angle = Math.atan2(y2! - y1!, x2! - x1!);
        return [stroke.id.slice('force-'.length), `${x1!.toFixed(3)},${y1!.toFixed(3)}:${angle.toFixed(6)}`];
      }),
  );
}

function requireSuccess(result: Awaited<ReturnType<typeof compileDiagramSpec>>): CompileSuccess {
  if (!result.ok) throw new Error(result.reason);
  expect(result.ok).toBe(true);
  return result;
}

describe('L1 scene semantic binding', () => {
  it('round-trips arbitrary force angles and rejects a deliberately wrong Scene', async () => {
    const content = [
      'kind: fbd',
      'body: cart',
      'force: W at 270deg from horizontal',
      'force: T at 35deg from horizontal',
      'force: N at 125deg from horizontal',
    ].join('\n');
    const compiled = requireSuccess(await compileDiagramSpec({ type: 'scene', content }, 'step'));
    const certificate = forceCertificate(compiled.scene);
    expect(certificate.size).toBe(3);

    const wrong = structuredClone(compiled.scene);
    const force = wrong.strokes.find((stroke) => stroke.id.toLowerCase() === 'force-t');
    expect(force).toBeTruthy();
    if (force) force.points[3] = force.points[1]!;
    expect(forceCertificate(wrong)).not.toEqual(certificate);

    const wrongLayout = layoutAndCompile(wrong);
    expect(wrongLayout.ok).toBe(true);
  });

  it('consumes repeated bodies and named members without inventing filler objects', async () => {
    const content = [
      'kind: fbd',
      'body: cart',
      'body: hanging-mass',
      'member: rope cart hanging-mass',
      'member: spring cart hanging-mass',
      'support: pin cart',
      'force: W on cart down',
      'force: T on cart at 35deg from vertical',
      'force: W on hanging-mass down',
    ].join('\n');
    const compiled = requireSuccess(await compileDiagramSpec({ type: 'scene', content }, 'step'));
    const ids = new Set([
      ...compiled.scene.nodes.map((node) => node.id),
      ...compiled.scene.strokes.map((stroke) => stroke.id),
      ...compiled.scene.labels.map((label) => label.id),
    ]);
    expect(ids.has('body-cart')).toBe(true);
    expect(ids.has('body-hanging-mass')).toBe(true);
    expect(ids.has('member-rope')).toBe(true);
    expect(ids.has('member-spring')).toBe(true);
    expect(ids.has('support-pin')).toBe(true);
    expect(compiled.scene.panels?.length ?? 0).toBe(0);
  });

  it('renders geometry from named elements and preserves relation annotations', async () => {
    const content = [
      'kind: geom',
      'point: O',
      'point: A',
      'point: B',
      'segment: OA O A',
      'segment: AB A B',
      'relation: tangent AB O',
      'relation: projects B O',
      'angle: OAB A 40deg',
      'dimension: OA O A 5 cm',
    ].join('\n');
    const compiled = requireSuccess(compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' }));
    const ids = new Set(compiled.scene.strokes.map((stroke) => stroke.id));
    expect(ids.has('point-o')).toBe(true);
    expect(ids.has('point-a')).toBe(true);
    expect(ids.has('point-b')).toBe(true);
    expect(ids.has('segment-oa')).toBe(true);
    expect(ids.has('segment-ab')).toBe(true);
    expect(ids.has('angle-oab')).toBe(true);
    expect(ids.has('dimension-oa')).toBe(true);
    expect(compiled.scene.dimensions).toEqual([
      expect.objectContaining({ id: 'dimension-oa', fromId: 'O', toId: 'A' }),
    ]);
  });

  it('normalizes arbitrary finite geometry coordinates into the scene frame', () => {
    const result = compileScene(parseSpec('scene', [
      'kind: geom',
      'point: A -1000.5 -2.25',
      'point: B 500.25 -2.25',
      'point: C 50.75 999.5',
      'segment: AB A B',
      'segment: BC B C',
    ].join('\n')), { profile: 'step', family: 'scene' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const points = result.scene.strokes
      .filter((stroke) => stroke.id.startsWith('point-'))
      .map((stroke) => ({ x: stroke.points[0]!, y: stroke.points[1]! }));
    expect(points).toHaveLength(3);
    expect(points.every(({ x, y }) => x >= 10 && x <= 290 && y >= 10 && y <= 155)).toBe(true);
    expect(points[0]!.x).toBeLessThan(points[1]!.x);
    expect(points[0]!.y).toBeLessThan(points[2]!.y);
    expect(result.scene.strokes.find((stroke) => stroke.id === 'segment-ab')?.points).toEqual([
      points[0]!.x, points[0]!.y, points[1]!.x, points[1]!.y,
    ]);
  });

  it('represents perpendicular and normal relations between named segments in Scene IR', () => {
    const cases = [
      ['altitude', 'baseline', 'perpendicular-to', '52 42', '52 122', '22 82', '114 82'],
      ['normal-drop', 'surface', 'normal', '198 42', '198 122', '162 82', '246 82'],
    ] as const;
    for (const [first, second, relation, firstStart, firstEnd, secondStart, secondEnd] of cases) {
      const [firstStartName, firstEndName, secondStartName, secondEndName] = [`${first}-start`, `${first}-end`, `${second}-start`, `${second}-end`];
      const content = [
        'kind: geom',
        `point: ${firstStartName} ${firstStart}`,
        `point: ${firstEndName} ${firstEnd}`,
        `point: ${secondStartName} ${secondStart}`,
        `point: ${secondEndName} ${secondEnd}`,
        `segment: ${first} ${firstStartName} ${firstEndName}`,
        `segment: ${second} ${secondStartName} ${secondEndName}`,
        `relation: ${relation === 'perpendicular-to' ? `${first} ${relation} ${second}` : `${relation} ${first} ${second}`}`,
      ].join('\n');
      const compiled = compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' });
      if (!compiled.ok) throw new Error(compiled.reason);
      const marker = compiled.scene.strokes.find((stroke) => stroke.id === `relation-${relation}`);
      expect(marker).toEqual(expect.objectContaining({
        kind: 'polyline',
        role: 'annotation',
        semanticColor: 'guide',
      }));
      expect(marker?.points).toHaveLength(6);
      const [x1, y1, x2, y2, x3, y3] = marker?.points ?? [];
      expect(Math.abs((x2! - x1!) * (x3! - x2!) + (y2! - y1!) * (y3! - y2!))).toBeLessThan(0.001);
    }
  });

  it('fails closed for an unsupported named-segment relation kind', () => {
    const result = compileScene(parseSpec('scene', [
      'kind: geom',
      'point: a0 40 50',
      'point: a1 40 110',
      'point: b0 20 80',
      'point: b1 100 80',
      'segment: drop a0 a1',
      'segment: rail b0 b1',
      'relation: drop skew-to rail',
    ].join('\n')), { profile: 'step', family: 'scene' });
    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: 'malformed',
    }));
  });

  it('orients a named angle arc from its first ray instead of a fixed horizontal baseline', () => {
    const content = [
      'kind: geom',
      'point: O',
      'point: A',
      'point: B',
      'segment: OA O A',
      'segment: AB A B',
      'angle: OAB A 40deg',
    ].join('\n');
    const compiled = requireSuccess(compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' }));
    const arc = compiled.scene.strokes.find((stroke) => stroke.id === 'angle-oab');
    const origin = compiled.scene.strokes.find((stroke) => stroke.id === 'point-o');
    const vertex = compiled.scene.strokes.find((stroke) => stroke.id === 'point-a');
    expect(arc?.kind).toBe('arc');
    expect(origin?.points.length).toBeGreaterThanOrEqual(2);
    expect(vertex?.points.length).toBeGreaterThanOrEqual(2);
    const expectedStart = (Math.atan2((origin?.points[1] ?? 0) - (vertex?.points[1] ?? 0), (origin?.points[0] ?? 0) - (vertex?.points[0] ?? 0)) * 180) / Math.PI;
    expect(arc?.points[4]).toBeCloseTo(expectedStart, 5);
    expect((arc?.points[5] ?? 0) - (arc?.points[4] ?? 0)).toBeCloseTo(40, 5);
  });

  it('renders apparatus parts and directed connections as semantic objects', async () => {
    const content = [
      'kind: apparatus',
      'part: transmitter apparatus',
      'part: receiver apparatus',
      'part: shaft mechanical',
      'part: pointer indicator',
      'relation: sends-to transmitter receiver',
      'relation: part-of shaft transmitter',
      'relation: indicates pointer receiver',
    ].join('\n');
    const compiled = requireSuccess(await compileDiagramSpec({ type: 'scene', content }, 'step'));
    const labels = new Set(compiled.scene.labels.map((label) => label.text));
    for (const label of ['transmitter', 'receiver', 'shaft', 'pointer']) expect(labels.has(label)).toBe(true);
    expect(compiled.scene.strokes.some((stroke) => stroke.id === 'relation-sends-to')).toBe(true);
    expect(compiled.scene.strokes.some((stroke) => stroke.id === 'relation-indicates')).toBe(true);
  });

  it('normalizes relation endpoint forms and names an unresolved endpoint', () => {
    const prefix = [
      'kind: apparatus',
      'panel: main apparatus',
      'part: transmitter apparatus',
      'part: receiver apparatus',
    ].join('\n');
    const forms = [
      `${prefix}\nrelation: transmitter receiver sends-to`,
      `${prefix}\nrelation: sends-to transmitter receiver`,
      `${prefix}\nrelation: sends-to transmitter-receiver`,
    ];
    const scenes = forms.map((content) => {
      const result = compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' });
      if (!result.ok) throw new Error(result.reason);
      return result.scene;
    });
    expect(scenes[1]).toEqual(scenes[0]);
    expect(scenes[2]).toEqual(scenes[0]);
    const baseline = scenes[0]!;
    const partLabels = baseline.labels.filter((label) => ['transmitter', 'receiver'].includes(label.text ?? ''));
    expect(partLabels).toHaveLength(2);
    expect(partLabels.every((label) => label.priority === 'preferred')).toBe(true);

    const annotation = compileScene(parseSpec('scene', `${prefix}\nrelation: transmitter receiver descriptive`), { profile: 'step', family: 'scene' });
    if (!annotation.ok) throw new Error(annotation.reason);
    expect(annotation.scene.strokes.find((stroke) => stroke.id === 'relation-descriptive')).toEqual(expect.objectContaining({ role: 'annotation' }));

    const unresolved = compileScene(parseSpec('scene', `${prefix}\nrelation: sends-to transmitter missing`), { profile: 'step', family: 'scene' });
    expect(unresolved).toEqual(expect.objectContaining({
      ok: false,
      code: 'malformed',
      reason: expect.stringContaining('missing'),
    }));
  });

  it('fails closed for explicitly non-vector scene artwork', () => {
    for (const [marker, role] of [
      ['portrait', 'photographic portrait'],
      ['decorative', 'decorative border'],
      ['raster', 'raster texture'],
    ] as const) {
      const result = compileScene(parseSpec('scene', `kind: apparatus\npart: artwork ${role}`), { profile: 'step', family: 'scene' });
      expect(result).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));
      if (!result.ok) expect(result.reason).toContain(marker);
    }
  });

  it('fails closed when a parallel-plate field declaration names equipotential planes', () => {
    const result = compileScene(parseSpec('scene', 'kind: field\ncatalog: plates multiple equipotential planes'), { profile: 'step', family: 'scene' });
    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: 'malformed',
      reason: expect.stringContaining('equipotential'),
    }));
  });

  it('preserves multi-panel roles and binds isolated bodies to their panel', () => {
    const content = [
      'kind: fbd',
      'panel: system system-view',
      'panel: isolated isolated-body',
      'body: whole panel=system',
      'body: block panel=isolated',
      'force: W on block down',
    ].join('\n');
    const compiled = requireSuccess(compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' }));
    expect(compiled.scene.panels).toEqual([
      expect.objectContaining({ id: 'system', role: 'system-view' }),
      expect.objectContaining({ id: 'isolated', role: 'isolated-body' }),
    ]);
    expect(compiled.scene.labels.find((label) => label.text === 'block')?.panelId).toBe('isolated');
  });

  it('certificate helper is not vacuous on an independently built wrong force scene', () => {
    const b = new SceneBuilder('scene', 300, 165);
    b.line('force-A', 150, 80, 150, 30, { markerEnd: true, color: 'accent' });
    const original = forceCertificate(b.scene());
    const wrong = structuredClone(b.scene());
    wrong.strokes[0]!.points[3] = 120;
    expect(forceCertificate(wrong)).not.toEqual(original);
  });

  it('fails closed for an ambiguous force direction instead of drawing a default arrow', async () => {
    const result = await compileDiagramSpec({
      type: 'scene',
      content: 'kind: fbd\nbody: cart\nforce: F diagonal',
    }, 'step');
    expect(result).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));
  });

  it('fails closed for unknown support and surface anchors instead of falling back silently', () => {
    const support = compileScene(parseSpec('scene', 'kind: fbd\nbody: cart\nsupport: pin missing-body'), { profile: 'step', family: 'scene' });
    const surface = compileScene(parseSpec('scene', 'kind: fbd\nbody: cart\nsurface: platform missing-body'), { profile: 'step', family: 'scene' });
    expect(support).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));
    expect(surface).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));
  });

  it('writes the declared L1 DEV render set for raster inspection', async () => {
    const renderDir = resolve('artifacts/figlab/renders/L1');
    await mkdir(renderDir, { recursive: true });
    const cases = [
      ['fbd-multi-body', 'kind: fbd\nbody: cart\nbody: mass\nmember: rope cart mass\nforce: W on cart down\nforce: T on cart at 35deg from horizontal'],
      ['geom-relations', 'kind: geom\npoint: O\npoint: A\npoint: B\nsegment: OA O A\nsegment: AB A B\nrelation: tangent AB O\nangle: OAB A 40deg\ndimension: OA O A 5 cm'],
      ['apparatus-relations', 'kind: apparatus\npart: transmitter apparatus\npart: receiver apparatus\nrelation: sends-to transmitter receiver'],
      ['field-solenoid', 'kind: field\ncatalog: solenoid\ncore: mu_r=400\nb: 1.0 T\nh: ?'],
      ['ray-construction', 'kind: ray\nf: 40\ndo: 80\nho: 24'],
    ] as const;
    for (const [id, content] of cases) {
      const result = compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' });
      const compiled = requireSuccess(result);
      await writeFile(join(renderDir, `${id}.svg`), compiled.svg, 'utf8');
    }
    expect(cases).toHaveLength(5);
  });

  it('keeps the public field route graphic when using the scene catalog vocabulary', async () => {
    const resolved = await resolveDiagram({ type: 'field', content: 'catalog: solenoid\ncore: mu_r=400\nB: 1.0 T\nH: ?' }, 'light', 'step');
    expect(resolved.svg).toMatch(/<svg\b/);
    expect(svgMarkupHasGraphicShapes(resolved.svg)).toBe(true);
  });
});
