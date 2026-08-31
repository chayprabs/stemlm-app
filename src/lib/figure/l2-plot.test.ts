import { describe, expect, it } from 'vitest';
import { buildPlotScene, compilePlot, evaluatePlotFn } from './engines/plot';
import { parseSpec } from './spec';
import { SceneBuilder } from './scene-build';
import { FONT_MIN, type Scene } from './types';
import { layoutScene } from './slk';
import { boxHitsAny, LABEL_GAP } from './geom';

const ctx = { profile: 'step' as const, family: 'plot' };
function compile(content: string) { return compilePlot(parseSpec('plot', content), ctx); }
function axis(scene: Scene, id: string) {
  const stroke = scene.strokes.find((candidate) => candidate.id === id);
  expect(stroke?.kind).toBe('line');
  expect(stroke?.points.length).toBe(4);
  return stroke!.points;
}

function assertFunctionCertificate(scene: Scene, domain: [number, number], id: string) {
  const xAxis = axis(scene, 'xaxis');
  const yAxis = axis(scene, 'yaxis');
  const x0 = xAxis[0]!;
  const x1 = xAxis[2]!;
  const curve = scene.strokes.find((stroke) => stroke.id === id);
  expect(curve?.kind).toBe('polyline');
  expect(curve!.points.length).toBeGreaterThan(12);
  const tickLabels = scene.labels.filter((label) => label.id.startsWith('ytickl'));
  expect(tickLabels.length).toBeGreaterThanOrEqual(2);
  const tickA = tickLabels[0]!;
  const tickB = tickLabels[tickLabels.length - 1]!;
  const yA = Number(tickA.text);
  const yB = Number(tickB.text);
  const valueAt = (y: number) => yA + ((y - tickA.y) / (tickB.y - tickA.y || 1)) * (yB - yA);
  for (const rawIndex of [2, Math.floor(curve!.points.length / 4), Math.floor(curve!.points.length / 2)]) {
    const index = rawIndex % 2 === 0 ? rawIndex : rawIndex - 1;
    const x = curve!.points[index]!;
    const y = curve!.points[index + 1]!;
    const value = domain[0] + ((x - x0) / (x1 - x0 || 1)) * (domain[1] - domain[0]);
    expect(valueAt(y)).toBeCloseTo(value * value, 0);
  }
  expect(yAxis[1]).toBeGreaterThan(yAxis[3]!);
}

describe('L2 plot capability probes', () => {
  it('renders multiple labelled analytic series with stable identities and distinct styles', () => {
    const result = compile('kind: waveform\nfn: sin(x)\nfn: sin(x)^2\nvar: x\ndomain: 0 6.28\nlabel: curve=fn value=voltage\nlabel: curve=fn2 value=power');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const series = result.scene.strokes.filter((stroke) => stroke.id === 'fn' || stroke.id === 'fn2');
    expect(series).toHaveLength(2);
    expect(new Set(series.map((stroke) => stroke.semanticColor)).size).toBe(2);
    expect(result.scene.labels.some((label) => label.text === 'voltage' && label.anchorId === 'fn')).toBe(true);
    expect(result.scene.labels.some((label) => label.text === 'power' && label.anchorId === 'fn2')).toBe(true);
  });

  it('places the horizontal axis at mapped zero for a zero-crossing waveform', () => {
    const source = '1.7*sin(1.3*x)+0.2';
    const domain: [number, number] = [-3, 3];
    const result = compile(`kind: waveform\nfn: ${source}\ndomain: ${domain[0]} ${domain[1]}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const xAxis = axis(result.scene, 'xaxis');
    const curve = result.scene.strokes.find((stroke) => stroke.id === 'fn');
    expect(curve?.kind).toBe('polyline');
    const curvePoints = curve!.points;
    let expectedZeroY: number | undefined;
    for (let index = 0; index < curvePoints.length - 2; index += 2) {
      const xA = domain[0] + ((curvePoints[index]! - xAxis[0]!) / (xAxis[2]! - xAxis[0]!)) * (domain[1] - domain[0]);
      const xB = domain[0] + ((curvePoints[index + 2]! - xAxis[0]!) / (xAxis[2]! - xAxis[0]!)) * (domain[1] - domain[0]);
      const valueA = evaluatePlotFn(source, 'x', xA);
      const valueB = evaluatePlotFn(source, 'x', xB);
      if (valueA === 0) { expectedZeroY = curvePoints[index + 1]; break; }
      if (valueA * valueB < 0) {
        expectedZeroY = curvePoints[index + 1]! + (-valueA / (valueB - valueA)) * (curvePoints[index + 3]! - curvePoints[index + 1]!);
        break;
      }
    }
    expect(expectedZeroY).toBeDefined();
    expect(xAxis[1]).toBeCloseTo(expectedZeroY!, 6);
    expect(xAxis[1]).toBeLessThan(result.scene.height * 0.75);
  });

  it('preserves open and closed markers as distinct semantic objects', () => {
    const result = compile('kind: function\nfn: 1\nfn: 2\ndomain: -2 2\nmarker: closed=0,1\nmarker: open=0,2');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const closed = result.scene.strokes.find((stroke) => stroke.id === 'marker-closed0');
    const open = result.scene.strokes.find((stroke) => stroke.id === 'marker-open0');
    expect(closed?.fill).toBe('accent');
    expect(open?.fill).toBe('none');
    expect(closed?.points[0]).toBe(open?.points[0]);
    expect(closed?.points[1]).not.toBe(open?.points[1]);
  });

  it('keeps discrete observations as points and step observations as exact plateaus/transitions', () => {
    const discrete = compile('kind: discrete\ndata: 0,0;1,2;2,1;3,3\ndomain: 0 3');
    expect(discrete.ok).toBe(true);
    if (!discrete.ok) return;
    expect(discrete.scene.strokes.filter((stroke) => stroke.id.startsWith('data-point'))).toHaveLength(4);
    expect(discrete.scene.strokes.some((stroke) => stroke.id === 'data')).toBe(false);
    const step = compile('kind: step\ndata: 0,1;1,1;1,2;2,2;2,3;3,3\ndomain: 0 3');
    expect(step.ok).toBe(true);
    if (!step.ok) return;
    const curve = step.scene.strokes.find((stroke) => stroke.id === 'data');
    expect(curve?.kind).toBe('polyline');
    expect(curve?.points.length).toBe(12);
  });

  it('renders canonical guides, a bounded region, and a reference series', () => {
    const result = compile('kind: comparison\nfn: x^2\nfn: x^2+0.5*x\ndomain: 0 4\nguide: reference=fn\nguide: vertical=2\nregion: between=fn from=0 to=2\nlabel: region value=area');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.find((stroke) => stroke.id === 'fn')?.dash).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'guide-vertical0' && stroke.dash)).toBe(true);
    const region = result.scene.strokes.find((stroke) => stroke.id === 'region0');
    expect(region?.kind).toBe('polygon');
    expect(region?.points.every((point) => Number.isFinite(point))).toBe(true);
    expect(result.scene.labels.some((label) => label.text === 'area' && label.anchorId === 'region0')).toBe(true);
  });

  it('uses a positive logarithmic x-domain and names stacked panels', () => {
    const result = compile('kind: comparison\npanel: top role=continuous\npanel: bottom role=step\nfn: sin(x)\ndata: 1,0;10,1;100,0\nvar: x\ndomain: 1 100\nscale: x=log y=linear');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.panels).toHaveLength(2);
    expect(result.scene.panels?.map((panel) => panel.role)).toEqual(['continuous', 'step']);
    expect(result.scene.strokes.filter((stroke) => stroke.id.endsWith('xaxis')).length).toBe(2);
  });

  it('keeps at least two major ticks when the nice interval skips the domain end', () => {
    const result = compile('kind: function\nfn: x^2\ndomain: -2 4');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.labels.filter((label) => label.id.startsWith('xtickl'))).toHaveLength(2);
  });

  it('keeps required axis and equation annotations visible and detached from plot geometry', () => {
    const result = compile([
      'kind: waveform',
      'fn: 0.080*cos(4.00*x)',
      'domain: 0 1.57',
      'xlabel: t (s)',
      'ylabel: x (m)',
      'eq: x(t)=0.080\\cos(4.00t)',
      'point: 0.200 0.0557',
      'point_label: P',
    ].join('\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;

    const yAxis = axis(result.scene, 'yaxis');
    const ylabel = laid.placed.find((placed) => placed.label.id === 'ylabel');
    expect(ylabel).toBeTruthy();
    expect(ylabel!.box.x2).toBeLessThan(Math.min(yAxis[0]!, yAxis[2]!) - 1);
    const xAxis = axis(result.scene, 'xaxis');
    const xlabel = laid.placed.find((placed) => placed.label.id === 'xlabel');
    expect(xlabel).toBeTruthy();
    expect(xlabel!.box.y1).toBeGreaterThan(Math.max(xAxis[1]!, xAxis[3]!) + 1);

    const equation = laid.placed.find((placed) => placed.label.id === 'eq');
    expect(equation).toBeTruthy();
    expect(equation!.overlay).toBe(true);
    expect(equation!.box.x1).toBeGreaterThanOrEqual(4);
    expect(equation!.box.y1).toBeGreaterThanOrEqual(4);
    expect(equation!.box.x2).toBeLessThanOrEqual(result.scene.width - 4);
    expect(equation!.box.y2).toBeLessThanOrEqual(result.scene.height - 4);
    expect(boxHitsAny(equation!.box, laid.strokes, LABEL_GAP(FONT_MIN))).toBe(false);
    expect(result.overlays.some((overlay) => overlay.id === 'eq' && overlay.source.includes('0.080'))).toBe(true);
  });

  it('round-trip certificate rejects a deliberately shifted curve', () => {
    const spec = parseSpec('plot', 'kind: function\nfn: x^2\ndomain: 0 4');
    const scene = buildPlotScene(spec, ctx);
    assertFunctionCertificate(scene, [0, 4], 'fn');
    const wrong = new SceneBuilder('plot', scene.width, scene.height);
    for (const stroke of scene.strokes) wrong.strokes.push({ ...stroke, points: stroke.id === 'fn' ? stroke.points.map((point, index) => index % 2 ? point - 10 : point) : [...stroke.points] });
    for (const label of scene.labels) wrong.labels.push({ ...label });
    expect(() => assertFunctionCertificate(wrong.scene(), [0, 4], 'fn')).toThrow();
  });

  it('fails closed for malformed, reversed, and unsupported requests', () => {
    for (const [content, code] of [
      ['kind: function\nvar: x\ndomain: 0 1', 'malformed'],
      ['kind: function\nfn: sin(\ndomain: 0 1', 'expr'],
      ['kind: function\nfn: x^2\ndomain: 4 -2', 'malformed'],
      ['kind: pie\ndata: 45,30;30,20', 'malformed'],
      ['kind: graph\ndata: a,b;c,d', 'malformed'],
      ['kind: portrait\nlabel: title value=historical portrait', 'malformed'],
    ] as const) {
      expect(compile(content)).toMatchObject({ ok: false, code });
    }
  });

  it('does not connect finite samples across a pole', () => {
    const result = compile('kind: function\nfn: (x+1)/(x-1)\ndomain: -3 3\nmarker: pole=1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('fn')).length).toBeGreaterThan(1);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'marker-pole0')).toBe(true);
  });

});
