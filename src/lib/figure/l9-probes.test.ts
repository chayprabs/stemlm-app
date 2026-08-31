import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compileDiagramSpec } from './compile';
import { compileHybridPi } from './leftovers/hybridpi';
import { compileTiming } from './leftovers/timing';
import { parseSpec } from './spec';
import { SceneBuilder } from './scene-build';
import type { Scene, SceneStroke } from './types';

const d = (type: string, content: string) => ({ type, content });

const RENDER_CASES: Array<[string, string, string]> = [
  ['hybridpi', 'rpi: 1.2k\ngm: 4mS\nre: 1k\nrc: 4.7k\nro: 50k', 'hybridpi-full'],
  ['mospi', 'gm: 2mS\ngmb: 0.5mS\ncgs: 10pF\nrd: 5k\nrs: 1k\nsupply: VDD\ngnd: 0', 'mospi-parameterized'],
  ['opamp', 'rf: 100k\nrg: 10k\nvin: sensor\nvout: filtered\ngnd: 0\nfeedback: inverting', 'opamp-feedback'],
  ['timing', 'signal: clk p.....\nsignal: data 0.1.0.', 'timing-rows'],
  ['tline', 'z0: 50\nload: 100\ndelay: 5ns', 'tline'],
  ['oneline', 'bus: A,B\nnode: source\nnode: load\nconnection: source load', 'oneline'],
  ['twoport', 'params: Z\ninput: p1\noutput: p2\nelement: series resistor\nelement: shunt capacitor', 'twoport'],
  ['pwm', 'kind: pwm\ncarrier: triangle\nduty: 0.35\nfrequency: 10kHz\nsignal: gate', 'pwm'],
  ['xfmr', 'kind: isolation\nprimary: input\nsecondary: output\nturns: 2:1\npolarity: dot', 'xfmr'],
  ['constel', 'm: 4\nsymbols: 00,01,11,10\nmapping: gray\nmodulation: QPSK\naxis: I,Q', 'constel'],
  ['eye', 'kind: eye\nsignal: data\nunit: UI\nmask: 0.2UI\nthreshold: 0V', 'eye'],
  ['cmos', 'kind: inverter\npmos: P1\nnmos: N1\ninput: A\noutput: Y\nsupply: VDD\ngnd: 0', 'cmos'],
  ['motor', 'kind: schematic\nstator: 3-phase\nrotor: squirrel-cage\nphases: A,B,C\ntorque: output\nfeedback: speed', 'motor'],
  ['dq', 'kind: transform\nreference: synchronous\naxes: d,q\nvector: current\ntransform: Park\nangle: electrical', 'dq'],
  ['seqnet', 'kind: state\nstate: idle\nstate: run\ntransition: idle -> run\ninitial: idle\nterminal: stop', 'seqnet'],
];

function endpoint(stroke: SceneStroke): [number, number, number, number] {
  const p = stroke.points;
  return [p[0] ?? NaN, p[1] ?? NaN, p[p.length - 2] ?? NaN, p[p.length - 1] ?? NaN];
}

function hybridPiCertificate(scene: Scene, expectedRo: boolean): boolean {
  const node = (id: string) => scene.strokes.find((s) => s.id === id && s.kind === 'circle');
  const b = node('B');
  const e = node('E');
  const c = node('C');
  const rpi = scene.strokes.find((s) => s.id === 'rpi');
  const required = ['gm', 'RE', 'RC', 'gm-c', 'gm-e', 'e-rail', 'gnd'];
  if (!b || !e || !c || !rpi || required.some((id) => !scene.strokes.some((s) => s.id === id))) return false;
  const [sx, sy, ex, ey] = endpoint(rpi);
  if (sx !== b.points[0] || sy !== b.points[1] || ex !== e.points[0] || ey !== e.points[1]) return false;
  return scene.strokes.some((s) => s.id === 'ro') === expectedRo;
}

describe('L9 permanent semantic probes', () => {
  it('hybrid-π round-trip certificate preserves terminals and branch membership', async () => {
    const result = await compileDiagramSpec(
      d('hybridpi', 'rpi: 1.2k\ngm: 4mS\nre: 1k\nrc: 4.7k\nro: 50k'),
      'step',
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (result.ok) expect(hybridPiCertificate(result.scene, true)).toBe(true);
  });

  it('hybrid-π certificate rejects a deliberately wrong B–C rπ Scene', () => {
    const b = new SceneBuilder('hybridpi', 300, 165);
    b.circle('B', 40, 30, 3).circle('C', 80, 30, 3).circle('E', 40, 130, 3);
    b.polyline('rpi', [40, 30, 80, 30]);
    for (const id of ['gm', 'RE', 'RC', 'gm-c', 'gm-e', 'e-rail', 'gnd']) b.line(id, 0, 0, 1, 1);
    expect(hybridPiCertificate(b.scene(), false)).toBe(false);
  });

  it('hybrid-π missing rc fails closed', async () => {
    const result = await compileDiagramSpec(d('hybridpi', 'rpi: 1k\ngm: 4mS\nre: 1k'), 'step');
    expect(result.ok).toBe(false);
  });

  it('MOS π consumes device parameters and optional rails', async () => {
    const result = await compileDiagramSpec(
      d('mospi', 'gm: 2mS\ngmb: 0.5mS\ncgs: 10pF\nrd: 5k\nrs: 1k\nsupply: VDD\ngnd: 0'),
      'step',
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const text = result.scene.labels.map((l) => l.text ?? l.katex ?? '').join('|');
    expect(text).toContain('0.5mS');
    expect(text).toContain('10pF');
    expect(text).toContain('5k');
    expect(text).toContain('1k');
    expect(result.scene.strokes.some((s) => s.id === 'gate')).toBe(true);
    expect(result.scene.strokes.some((s) => s.id === 'drain')).toBe(true);
    expect(result.scene.strokes.some((s) => s.id === 'source')).toBe(true);
  });

  it('op-amp consumes feedback topology and endpoint labels', async () => {
    const result = await compileDiagramSpec(
      d('opamp', 'rf: 100k\nrg: 10k\nvin: sensor\nvout: filtered\ngnd: 0\nfeedback: inverting'),
      'step',
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const text = result.scene.labels.map((l) => l.text ?? l.katex ?? '').join('|');
    expect(text).toContain('sensor');
    expect(text).toContain('filtered');
    expect(text).toContain('inverting');
    expect(result.scene.strokes.some((s) => s.id === 'feedback')).toBe(true);
  });

  it('timing preserves repeated row order and rejects malformed wave symbols', async () => {
    const good = await compileTiming(
      parseSpec('timing', 'signal: clk p.....\nsignal: data 0.1.0.'),
      { profile: 'step', family: 'timing' },
    );
    expect(good.ok, good.ok ? '' : good.reason).toBe(true);
    if (good.ok) {
      expect(good.scene.labels.map((l) => l.text ?? '')).toEqual(['clk', 'data']);
      expect(good.scene.strokes.some((s) => s.id === 'clk0r')).toBe(true);
    }

    const bad = await compileTiming(
      parseSpec('timing', 'signal: clk ???'),
      { profile: 'step', family: 'timing' },
    );
    expect(bad.ok).toBe(false);
  });

  it('WaveJSON subset preserves signal names and row order', async () => {
    const result = await compileTiming(
      parseSpec('timing', 'wave: {"signal":[{"name":"clk","wave":"p..."},{"name":"q","wave":"0.1."}]}'),
      { profile: 'step', family: 'timing' },
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (result.ok) expect(result.scene.labels.map((l) => l.text ?? '')).toEqual(['clk', 'q']);
  });

  it('electrical leftovers consume their asserted structures', async () => {
    const cases: Array<[string, string, string[]]> = [
      ['tline', 'z0: 50\nload: 100\ndelay: 5ns', ['Z0=50', 'ZL=100', 'td=5ns']],
      ['oneline', 'bus: A,B\nnode: source\nnode: load\nconnection: source load', ['source', 'load']],
      ['twoport', 'params: Z\ninput: p1\noutput: p2\nelement: series resistor\nelement: shunt capacitor', ['series resistor', 'shunt capacitor']],
      ['pwm', 'kind: pwm\ncarrier: triangle\nduty: 0.35\nfrequency: 10kHz\nsignal: gate', ['D=0.35', '10kHz']],
      ['xfmr', 'kind: isolation\nprimary: input\nsecondary: output\nturns: 2:1\npolarity: dot', ['input', 'output', '2:1', 'dot']],
      ['constel', 'm: 4\nsymbols: 00,01,11,10\nmapping: gray\nmodulation: QPSK\naxis: I,Q', ['00', '01', '11', '10', 'gray']],
      ['eye', 'kind: eye\nsignal: data\nunit: UI\nmask: 0.2UI\nthreshold: 0V', ['data', '0.2UI', '0V']],
      ['cmos', 'kind: inverter\npmos: P1\nnmos: N1\ninput: A\noutput: Y\nsupply: VDD\ngnd: 0', ['P1', 'N1', 'A', 'Y']],
      ['motor', 'kind: schematic\nstator: 3-phase\nrotor: squirrel-cage\nphases: A,B,C\ntorque: output\nfeedback: speed', ['3-phase', 'squirrel-cage', 'speed']],
      ['dq', 'kind: transform\nreference: synchronous\naxes: d,q\nvector: current\ntransform: Park\nangle: electrical', ['synchronous', 'current', 'Park', 'electrical']],
      ['seqnet', 'kind: state\nstate: idle\nstate: run\ntransition: idle -> run\ninitial: idle\nterminal: stop', ['idle', 'run', 'stop']],
    ];
    for (const [type, content, expected] of cases) {
      const result = await compileDiagramSpec(d(type, content), 'step');
      expect(result.ok, result.ok ? type : `${type}: ${result.reason}`).toBe(true);
      if (!result.ok) continue;
      const labels = result.scene.labels.map((l) => l.text ?? l.katex ?? '').join('|');
      for (const value of expected) expect(labels, `${type} missing ${value}`).toContain(value);
    }
  });

  it('motor refuses an asserted photorealistic 3D demand', async () => {
    const result = await compileDiagramSpec(
      d('motor', 'kind: schematic\nrender: photorealistic 3D cross-section\nhidden-lines: arbitrary'),
      'step',
    );
    expect(result.ok).toBe(false);
  });

  it('op-amp feedback originates at the output node', async () => {
    const result = await compileDiagramSpec(
      d('opamp', 'rf: 100k\nrg: 10k\nvin: sensor\nvout: filtered\ngnd: 0\nfeedback: inverting'),
      'step',
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const out = result.scene.strokes.find((s) => s.id === 'out');
    const feedback = result.scene.strokes.find((s) => s.id === 'feedback');
    const input = result.scene.strokes.find((s) => s.id === 'in');
    const amplifier = result.scene.strokes.find((s) => s.id === 'oa');
    expect(out).toBeDefined();
    expect(feedback).toBeDefined();
    expect(input).toBeDefined();
    expect(amplifier).toBeDefined();
    expect(feedback!.points.slice(0, 2)).toEqual(out!.points.slice(0, 2));
    expect(input!.points.slice(2)).toEqual([amplifier!.points[0], out!.points[1]! + 14]);
    expect(result.scene.strokes.some((s) => s.id === 'plus-ground')).toBe(true);
  });

  it('two-port series elements are connected into the internal path', async () => {
    const result = await compileDiagramSpec(
      d('twoport', 'params: Z\ninput: p1\noutput: p2\nelement: series resistor\nelement: shunt capacitor'),
      'step',
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.some((s) => s.id === 'element-0-left')).toBe(true);
    expect(result.scene.strokes.some((s) => s.id === 'element-0-right')).toBe(true);
    expect(result.scene.strokes.some((s) => s.id === 'element-1-top')).toBe(true);
    expect(result.scene.strokes.some((s) => s.id === 'element-1-bottom')).toBe(true);
  });

  it('sequence networks materialize a declared terminal state', async () => {
    const result = await compileDiagramSpec(
      d('seqnet', 'kind: state\nstate: idle\nstate: run\ntransition: idle -> run\ninitial: idle\nterminal: stop'),
      'step',
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(result.scene.labels.some((label) => label.text === 'stop')).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'state-2')).toBe(true);
  });

  it('sequence networks reject transitions to undeclared states', async () => {
    const result = await compileDiagramSpec(
      d('seqnet', 'kind: state\nstate: idle\nstate: run\ntransition: idle -> missing'),
      'step',
    );
    expect(result.ok).toBe(false);
  });

  it('CMOS complementary pair exposes a shared output junction', async () => {
    const result = await compileDiagramSpec(
      d('cmos', 'kind: inverter\npmos: P1\nnmos: N1\ninput: A\noutput: Y\nsupply: VDD\ngnd: 0'),
      'step',
    );
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.some((stroke) => stroke.id === 'output-junction')).toBe(true);
  });

  it('writes the positive DEV probe render set when explicitly requested', async () => {
    if (process.env.L9_RENDER !== '1') return;
    const dir = join(process.cwd(), 'artifacts', 'figlab', 'renders', 'L9');
    await mkdir(dir, { recursive: true });
    for (const [type, content, file] of RENDER_CASES) {
      const result = await compileDiagramSpec(d(type, content), 'step');
      expect(result.ok, result.ok ? '' : `${type}: ${result.reason}`).toBe(true);
      if (result.ok) await writeFile(join(dir, `${file}.svg`), result.svg, 'utf8');
    }
  });
});
