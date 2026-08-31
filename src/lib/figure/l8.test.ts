import { afterAll, describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { compileDiagramSpec } from './compile';
import type { Diagram } from '@/src/protocol/types';
import type { Scene } from './types';

function diagram(type: string, content: string): Diagram {
  return { type, content };
}

function ids(scene: Scene): string[] {
  return [
    ...scene.nodes.map((item) => item.id),
    ...scene.strokes.map((item) => item.id),
    ...scene.labels.map((item) => item.id),
  ];
}

function frameCertificate(scene: Scene, expected: Array<{ id: string; role: string }>): boolean {
  const panels = scene.panels ?? [];
  return panels.length === expected.length && panels.every((panel, index) => {
    const want = expected[index];
    return panel.id === want?.id && panel.role === want.role && panel.order === index;
  });
}

const renderCases: Array<[string, string]> = [
  ['frame', 'members: none\npanels: a|case-a, b|case-b, c|case-c, d|case-d\nscaffold: grid_2x2\ndivider: shared'],
  ['sfd', 'L: 8\nsupports: pin@0, roller@8\nloads: point 10kN@2\nV: 0 8.5; 2 8.5; 2 -1.5; 8 -1.5\nM: 0 0; 2 17; 8 0\nsign: sagging+'],
  ['beam', 'L: 8\nsupports: pin@0, roller@8\nloads: point P down@4\nelastic_curve: reference undeformed; landmark delta_P\nreactions: P/2@0, P/2@8'],
  ['mccabe', 'alpha: 2.5\nzF: 0.4\nxD: 0.95\nxB: 0.05\nR: 1.5\nq: 1'],
  ['truss', 'members: A-B, B-C, C-D\njoints: A, B, C, D\nsupports: pin@A, roller@D\nloads: P@B'],
  ['linkage', 'links: ground, coupler, rocker\njoints: fixed, revolute, revolute\ninput: ground rotation\noutput: rocker angle'],
  ['soil', 'layers: phases\nphases: solid 0.5, liquid 0.25, gas 0.25\nvoids: liquid, gas'],
  ['pfd', 'units: feed, reactor, separator, product\nconnections: feed->reactor, reactor->separator, separator->product'],
  ['openchan', 'y1: 1\nchannel: trapezoidal\nsection: uniform\nflow: upstream_to_downstream\nwaterline: free_surface'],
];

afterAll(async () => {
  const directory = join(resolve(__dirname), '..', '..', '..', 'artifacts', 'figlab', 'renders', 'L8');
  await mkdir(directory, { recursive: true });
  for (const [family, content] of renderCases) {
    const result = await compileDiagramSpec(diagram(family, content), 'step');
    if (result.ok) await writeFile(join(directory, `${family}.svg`), result.svg, 'utf8');
  }
});

describe('L8 permanent probes', () => {
  it('frame round-trip certificate preserves panel order and roles', async () => {
    const expected = [
      { id: 'a', role: 'case-a' },
      { id: 'b', role: 'case-b' },
      { id: 'c', role: 'case-c' },
      { id: 'd', role: 'case-d' },
    ];
    const result = await compileDiagramSpec(diagram('frame', [
      'members: none',
      'panels: a|case-a, b|case-b, c|case-c, d|case-d',
      'scaffold: grid_2x2',
      'divider: shared',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(frameCertificate(result.scene, expected)).toBe(true);

    const wrong: Scene = { ...result.scene, panels: result.scene.panels?.slice(1) };
    expect(frameCertificate(wrong, expected)).toBe(false);
  });

  it('frame rejects duplicate panel IDs instead of silently compiling', async () => {
    const result = await compileDiagramSpec(diagram('frame', 'members: none\npanels: a|left, a|right'), 'step');
    expect(result.ok).toBe(false);
  });

  it('SFD consumes supports, loads, and both ordinate series', async () => {
    const result = await compileDiagramSpec(diagram('sfd', [
      'L: 8',
      'supports: pin@0, roller@8',
      'loads: point 10kN@2',
      'V: 0 8.5; 2 8.5; 2 -1.5; 8 -1.5',
      'M: 0 0; 2 17; 8 0',
      'sign: sagging+',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sceneIds = ids(result.scene).join(' ');
    expect(sceneIds).toMatch(/support-pin|support-roller/);
    expect(sceneIds).toMatch(/load-0/);
    const vPoints = result.scene.strokes.find((stroke) => stroke.id === 'V')?.points ?? [];
    const mPoints = result.scene.strokes.find((stroke) => stroke.id === 'M')?.points ?? [];
    expect(vPoints.length).toBeGreaterThan(4);
    expect(mPoints.length).toBeGreaterThan(4);
    expect(new Set(vPoints.filter((_, index) => index % 2 === 1)).size).toBeGreaterThan(1);
  });

  it('SFD refuses an incomplete shear-only request', async () => {
    const result = await compileDiagramSpec(diagram('sfd', 'L: 8\nsupports: pin@0, roller@8\nV: 0 8; 8 -2'), 'step');
    expect(result.ok).toBe(false);
  });

  it('SFD fails closed for an unsupported sign convention', async () => {
    const result = await compileDiagramSpec(diagram('sfd', [
      'L: 8',
      'supports: pin@0, roller@8',
      'V: 0 8; 8 -2',
      'M: 0 0; 8 0',
      'sign: hogging+',
    ].join('\n')), 'step');
    expect(result.ok).toBe(false);
  });

  it('beam binds a deformed curve, supports, central load, and reactions', async () => {
    const result = await compileDiagramSpec(diagram('beam', [
      'L: 8',
      'supports: pin@0, roller@8',
      'loads: point P down@4',
      'elastic_curve: reference undeformed; landmark delta_P',
      'reactions: P/2@0, P/2@8',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sceneIds = ids(result.scene).join(' ');
    expect(sceneIds).toMatch(/beam-reference|elastic-curve|load-0|reaction-0|reaction-1/);
  });

  it('beam derives the declared landmark and midpoint station label', async () => {
    const result = await compileDiagramSpec(diagram('beam', [
      'L: 8',
      'supports: pin@0, roller@8',
      'loads: point P down@4',
      'elastic_curve: reference undeformed; landmark delta_P',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const labels = result.scene.labels.map((label) => label.text ?? label.katex ?? '');
    expect(labels).toContain('delta_P');
    expect(labels).toContain('L/2');
    expect(labels).not.toContain('reference undeformed');
  });

  it('beam fails closed for an off-centre load that its fixed symmetric curve cannot represent', async () => {
    const result = await compileDiagramSpec(diagram('beam', [
      'L: 8',
      'supports: pin@0, roller@8',
      'loads: point P down@2',
      'elastic_curve: reference undeformed; landmark delta_P',
    ].join('\n')), 'step');
    expect(result.ok).toBe(false);
  });

  it('McCabe derives a q-dependent staircase and rejects supplied corners', async () => {
    const base = 'alpha: 2.5\nzF: 0.4\nxD: 0.95\nxB: 0.05\nR: 1.5\nq: ';
    const saturated = await compileDiagramSpec(diagram('mccabe', `${base}1`), 'step');
    const vapor = await compileDiagramSpec(diagram('mccabe', `${base}0`), 'step');
    expect(saturated.ok).toBe(true);
    expect(vapor.ok).toBe(true);
    if (!saturated.ok || !vapor.ok) return;
    expect(saturated.scene.strokes.find((stroke) => stroke.id === 'q-line')?.points)
      .not.toEqual(vapor.scene.strokes.find((stroke) => stroke.id === 'q-line')?.points);
    const invalid = await compileDiagramSpec(diagram('mccabe', `${base}1\nstaircase_corners: p1,p2,p3`), 'step');
    expect(invalid.ok).toBe(false);
  });

  it('McCabe places the feed intersection using the q-line equation', async () => {
    const result = await compileDiagramSpec(diagram('mccabe', [
      'alpha: 2.5',
      'zF: 0.4',
      'xD: 0.95',
      'xB: 0.05',
      'R: 1.5',
      'q: 0.5',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const span = Math.min(result.scene.width, result.scene.height) - 64;
    const qSlope = 0.5 / (0.5 - 1);
    const qIntercept = 0.4 - qSlope * 0.4;
    const expectedFeedX = (qIntercept - 0.95 / (1.5 + 1)) / (1.5 / (1.5 + 1) - qSlope);
    const stripping = result.scene.strokes.find((stroke) => stroke.id === 'stripping-line');
    expect(stripping?.points[2]).toBeCloseTo(32 + expectedFeedX * span, 6);
  });

  it('McCabe stage labels are anchored above their horizontal treads', async () => {
    const result = await compileDiagramSpec(diagram('mccabe', [
      'alpha: 10',
      'zF: 0.4',
      'xD: 0.8',
      'xB: 0.05',
      'R: 1.5',
      'q: 1',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stage = result.scene.labels.find((label) => /^st\d+$/.test(label.id));
    expect(stage).toBeTruthy();
    expect(stage?.slotHint).toBe('N');
    const stageNumber = Number(stage?.id.slice(2));
    const stairs = result.scene.strokes.find((stroke) => stroke.id === 'stairs')?.points ?? [];
    const start = (stageNumber - 1) * 2;
    const expectedMidpoint = ((stairs[start * 2] ?? 0) + (stairs[(start + 1) * 2] ?? 0)) / 2;
    expect(stage?.x).toBeCloseTo(expectedMidpoint, 4);
  });

  it('McCabe omits stage labels when a tread cannot hold them', async () => {
    const result = await compileDiagramSpec(diagram('mccabe', [
      'alpha: 2.5',
      'zF: 0.4',
      'xD: 0.95',
      'xB: 0.05',
      'R: 1.5',
      'q: 1',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stairs = result.scene.strokes.find((stroke) => stroke.id === 'stairs')?.points ?? [];
    const stageLabels = result.scene.labels.filter((label) => /^st\d+$/.test(label.id));
    for (const label of stageLabels) {
      const stageNumber = Number(label.id.slice(2));
      const start = (stageNumber - 1) * 2;
      const end = start + 1;
      const treadWidth = Math.abs((stairs[end * 2] ?? 0) - (stairs[start * 2] ?? 0));
      const minimumWidth = String(stageNumber).length * 12 * 0.58 + 2 * 6.6;
      expect(treadWidth, label.id).toBeGreaterThanOrEqual(minimumWidth);
    }
  });

  it('Ponchon does not silently masquerade as a McCabe chart', async () => {
    const result = await compileDiagramSpec(diagram('ponchon', [
      'zF: 0.4',
      'xD: 0.95',
      'enthalpy: unavailable',
    ].join('\n')), 'step');
    expect(result.ok).toBe(false);
  });

  it('truss and column consume graph members rather than a fixed triangle', async () => {
    for (const type of ['truss', 'column']) {
      const result = await compileDiagramSpec(diagram(type, [
        'L: 1',
        'members: A-B, B-C, C-D',
        'joints: A, B, C, D',
        'supports: pin@A, roller@D',
        'loads: P@B',
      ].join('\n')), 'step');
      expect(result.ok, type).toBe(true);
      if (!result.ok) continue;
      expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('member-'))).toHaveLength(3);
      expect(result.scene.strokes.some((stroke) => stroke.id.includes('A-B'))).toBe(true);
    }
  });

  it('linkage infers links from the joint graph and keeps input/output labels', async () => {
    const result = await compileDiagramSpec(diagram('linkage', [
      'links: ground, coupler, rocker',
      'joints: fixed, revolute, revolute',
      'input: ground rotation',
      'output: rocker angle',
      'motion: one degree of freedom',
    ].join('\n')), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('link-'))).toHaveLength(3);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/ground rotation|rocker angle/);
  });

  it('soil consumes phase fractions and refuses fractions over total volume', async () => {
    const valid = await compileDiagramSpec(diagram('soil', 'layers: phases\nphases: solid 0.5, liquid 0.25, gas 0.25\nvoids: liquid, gas\nbasis: total'), 'step');
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.scene.labels.map((label) => label.text).join(' ')).toMatch(/solid|liquid|gas/);
    const invalid = await compileDiagramSpec(diagram('soil', 'layers: phases\nphases: solid 0.6, liquid 0.3, gas 0.3\nvoids: liquid, gas'), 'step');
    expect(invalid.ok).toBe(false);
  });

  it('process families consume stream connectivity and reject unbound recycle', async () => {
    const valid = await compileDiagramSpec(diagram('pfd', [
      'units: feed, reactor, separator, product',
      'streams: feed to reactor, reactor to separator, separator to product',
      'connections: feed->reactor, reactor->separator, separator->product',
    ].join('\n')), 'step');
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.scene.strokes.filter((stroke) => stroke.id.startsWith('stream-')).length).toBe(3);
    const invalid = await compileDiagramSpec(diagram('reactor', 'type: cstr\nunits: reactor, separator\nstreams: separator->unknown\nrecycle: declared'), 'step');
    expect(invalid.ok).toBe(false);
  });

  it('PFD fails closed when declared units have no parseable stream edges', async () => {
    const result = await compileDiagramSpec(diagram('pfd', 'units: feed, reactor'), 'step');
    expect(result.ok).toBe(false);
  });

  it('ternary validates composition before drawing and open-channel binds free surface', async () => {
    const invalid = await compileDiagramSpec(diagram('ternary', 'points: A\ncomponents: A,B,C\ncomposition: A=0.7, B=0.4, C=0.2'), 'step');
    expect(invalid.ok).toBe(false);
    const channel = await compileDiagramSpec(diagram('openchan', [
      'y1: 1',
      'channel: trapezoidal',
      'section: uniform',
      'flow: upstream_to_downstream',
      'waterline: free_surface',
    ].join('\n')), 'step');
    expect(channel.ok).toBe(true);
    if (channel.ok) expect(ids(channel.scene).join(' ')).toMatch(/free-surface|flow/);
  });

  it('remaining L8 families consume their typed inputs', async () => {
    const cases: Array<[string, string, RegExp]> = [
      ['mohr', 'sigma: 40\nsy: 10\ntau: 8', /mohr-circle/],
      ['cam', 'profile: rise 2, dwell 1, fall 2\nfollower: roller\nmotion: periodic', /profile-curve/],
      ['gear', 'z1: 16\nz2: 32\ngears: input, output\nmesh: external', /gear-input|gear-output/],
      ['wall', 'h: 4\nwall: retaining\nsoil: backfill\nloads: water pressure', /wall-body|soil-wedge/],
      ['rc', 'b: 3\nh: 5\nreinforcement: 4\nsection: rectangular', /rc-section|rebar-0/],
      ['hx', 'th: 400\ntc: 300\nstreams: hot, cold\ndirection: countercurrent', /hot-stream|cold-stream/],
      ['psych', 'dbt: 25\nw: 0.01\naxes: dry-bulb temperature, humidity ratio\nstate_points: inlet, outlet\nprocess: heating', /state-inlet|state-outlet/],
    ];
    for (const [family, content, expected] of cases) {
      const result = await compileDiagramSpec(diagram(family, content), 'step');
      expect(result.ok, family).toBe(true);
      if (result.ok) expect(ids(result.scene).join(' ')).toMatch(expected);
    }
  });

  it('HX and open-channel refuse geometry modes they do not render', async () => {
    const exchanger = await compileDiagramSpec(diagram('hx', 'th: 400\ntc: 300\nstreams: hot, cold\ndirection: cocurrent'), 'step');
    const channel = await compileDiagramSpec(diagram('openchan', 'y1: 1\nchannel: rectangular\nflow: downstream_to_upstream\nwaterline: free_surface'), 'step');
    expect(exchanger.ok).toBe(false);
    expect(channel.ok).toBe(false);
  });
});
