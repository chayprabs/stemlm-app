import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import type { Scene } from './types';

const ctx = { profile: 'step' as const, family: 'scene' };

const PHYSICAL_SCENE = [
  'kind: apparatus',
  'part: source magnetic-source',
  'part: receiver conducting-loop',
  'part: channel variable-width-channel',
  'part: anchor fixed-support',
  'part: member elastic-member deformed',
  'part: load suspended-load',
  'part: zone transfer-region',
  'relation: source moves-toward receiver',
  'relation: channel flows-to load',
  'relation: anchor supports member',
  'relation: load loads member',
].join('\n');

function requireScene(raw: string): Scene {
  const result = compileScene(parseSpec('scene', raw), ctx);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

function physicalCertificate(scene: Scene): { parts: Array<{ id: string; kind: string }>; interactions: string[] } {
  return {
    parts: scene.nodes
      .filter((node) => node.id.startsWith('part-'))
      .map((node) => ({ id: node.id, kind: node.kind }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    interactions: scene.strokes
      .filter((stroke) => stroke.id.startsWith('relation-') && stroke.markerEnd)
      .map((stroke) => stroke.id)
      .sort(),
  };
}

describe('L1 generalized physical scene capability', () => {
  it('renders named component glyphs, constrained/deformed members, regions, and directed marks', () => {
    const scene = requireScene(PHYSICAL_SCENE);
    const kinds = new Set(scene.nodes.filter((node) => node.id.startsWith('part-')).map((node) => node.kind));
    expect(kinds).toEqual(new Set(['magnet', 'coil', 'vessel', 'support', 'member', 'load', 'region']));

    const member = scene.strokes.find((stroke) => stroke.id === 'part-member');
    expect(member?.kind).toBe('polyline');
    expect(member?.role).toBe('connector');
    expect(scene.strokes.some((stroke) => stroke.id === 'relation-moves-toward' && stroke.markerEnd)).toBe(true);
    expect(scene.strokes.some((stroke) => stroke.id === 'relation-flows-to' && stroke.markerEnd)).toBe(true);
    expect(scene.strokes.some((stroke) => stroke.id === 'relation-supports' && stroke.markerEnd)).toBe(true);
    expect(scene.strokes.some((stroke) => stroke.id === 'relation-loads' && stroke.markerEnd)).toBe(true);
    expect(scene.strokes.filter((stroke) => stroke.semanticColor === 'neutral' || stroke.semanticColor === 'accent' || stroke.semanticColor === 'muted' || stroke.semanticColor === 'danger' || stroke.semanticColor === 'guide')).toHaveLength(scene.strokes.length);
  });

  it('round-trips physical part identities and interaction marks, and rejects a deliberately incomplete scene', () => {
    const scene = requireScene(PHYSICAL_SCENE);
    const certificate = physicalCertificate(scene);
    expect(certificate.parts).toHaveLength(7);
    expect(certificate.interactions).toEqual([
      'relation-flows-to',
      'relation-loads',
      'relation-moves-toward',
      'relation-supports',
    ]);

    const wrong = structuredClone(scene);
    wrong.strokes = wrong.strokes.filter((stroke) => stroke.id !== 'relation-flows-to');
    expect(physicalCertificate(wrong)).not.toEqual(certificate);
  });
});
