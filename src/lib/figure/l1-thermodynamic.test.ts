import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import type { CompileSuccess, Scene } from './types';

const ctx = { profile: 'step' as const, family: 'scene' };

function requireSuccess(result: Awaited<ReturnType<typeof compileDiagramSpec>>): CompileSuccess {
  if (!result.ok) throw new Error(result.reason);
  return result;
}

function requireScene(raw: string): Scene {
  const result = compileScene(parseSpec('scene', raw), ctx);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

describe('L1 gas-state and thermodynamic scene vocabulary', () => {
  it('draws a bounded gas container with particles, collision motion, and a piston', async () => {
    const compiled = requireSuccess(await compileDiagramSpec({
      type: 'scene',
      content: [
        'kind: gas',
        'part: chamber gas-container',
        'container: chamber closed cylinder',
        'boundary: chamber walls',
        'particle: molecule-a chamber 0.22 0.34 right collision=wall',
        'particle: molecule-b chamber 0.74 0.68 up',
        'piston: chamber 0.62 movable',
        'state: chamber P=101 kPa V=2 L T=300 K',
      ].join('\n'),
    }, 'step'));

    const strokeIds = new Set(compiled.scene.strokes.map((stroke) => stroke.id));
    expect(compiled.scene.nodes.some((node) => node.kind === 'gas-container')).toBe(true);
    expect(strokeIds.has('container-chamber')).toBe(true);
    expect(strokeIds.has('boundary-chamber-left')).toBe(true);
    expect(strokeIds.has('particle-molecule-a')).toBe(true);
    expect(strokeIds.has('particle-molecule-a-velocity')).toBe(true);
    expect(strokeIds.has('piston-chamber')).toBe(true);
    expect(compiled.scene.labels.some((label) => label.text?.includes('P=101'))).toBe(true);
    expect(compiled.scene.strokes.every((stroke) => ['neutral', 'accent', 'muted', 'danger', 'guide'].includes(stroke.semanticColor))).toBe(true);
  });

  it('draws declared thermodynamic axes, state points, and a directed cycle path', () => {
    const scene = requireScene([
      'kind: thermodynamic-graph',
      'point: origin 0 0',
      'axis: x Volume (L)',
      'axis: y Pressure (kPa)',
      'state: 1 1 4 (P1,V1)',
      'state: 2 4 4 (P2,V2)',
      'state: 3 4 1 (P3,V3)',
      'path: 1 2 isobaric',
      'path: 2 3 isochoric',
      'path: 3 1 compression',
      'cycle: clockwise',
    ].join('\n'));

    const strokeIds = new Set(scene.strokes.map((stroke) => stroke.id));
    expect(strokeIds.has('axis-x')).toBe(true);
    expect(strokeIds.has('axis-y')).toBe(true);
    expect(strokeIds.has('state-1')).toBe(true);
    expect(strokeIds.has('state-2')).toBe(true);
    expect(strokeIds.has('state-3')).toBe(true);
    expect(scene.strokes.filter((stroke) => stroke.id.startsWith('path-')).every((stroke) => stroke.markerEnd)).toBe(true);
    expect(scene.labels.some((label) => label.text === 'Volume (L)')).toBe(true);
    expect(scene.labels.some((label) => label.text === 'Pressure (kPa)')).toBe(true);
    expect(scene.labels.some((label) => label.text === 'isobaric')).toBe(true);
  });

  it('fails closed for incomplete or unsupported gas and graph declarations', () => {
    const incompleteGas = compileScene(parseSpec('scene', [
      'kind: gas',
      'container: chamber closed',
      'boundary: chamber walls',
    ].join('\n')), ctx);
    expect(incompleteGas).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));

    const incompleteGraph = compileScene(parseSpec('scene', [
      'kind: thermodynamic-graph',
      'axis: x Volume',
      'state: 1 1 1',
      'path: 1 2 process',
    ].join('\n')), ctx);
    expect(incompleteGraph).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));

    const unsupported = compileScene(parseSpec('scene', [
      'kind: gas',
      'container: chamber closed',
      'boundary: chamber walls',
      'particle: p chamber 0.5 0.5',
      'unmodeled: thing',
    ].join('\n')), ctx);
    expect(unsupported).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));
  });
});
