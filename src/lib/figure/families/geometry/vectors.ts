/**
 * Vectors drawn to scale on a grid with one scale on both axes, and their resultant computed.
 *
 *   vec:  A 3 4                 components; repeatable. Also `A = (3, 4)`, `A = 3i + 4j`
 *   vec:  B 5∠30                magnitude and direction in degrees from +x; also `5 at 30 deg`, `5 @ 30`, `5 N ∠ π/6`
 *   mode: tip-to-tail | origin | components     tip-to-tail by default when there are two or more vectors
 *   sum:  R                     draw the resultant under this name and print its components, magnitude and direction
 *   unit: N                     printed after the computed values
 *
 * `origin` draws every vector from the origin (two vectors and a sum get the parallelogram);
 * `components` adds each vector's dashed projections onto the axes and prints its components.
 */
import type { CompileCtx, CompileResult } from '../../types';
import { specGet, specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { evaluateConstant } from '../../intel/expr-repair';
import { Placer, clip, drawReadout, malformed, readout, refused, ring, textSize, type Pt } from './canvas';
import { parseAngle, parseNamedPair, parseQuantity, type NamedPair } from './expr';
import { fmt, fmtDegrees } from './format';
import { Plane, windowAround } from './plane';

const VECTORS_MAX = 6;
type Mode = 'tip-to-tail' | 'origin' | 'components';

/** Rounding that removes the 1e-16 a sine or cosine leaves behind, so 5∠90 is (0, 5). */
const tidy = (value: number) => Number(value.toFixed(12)) + 0;

function coefficient(text: string): number | null {
  const bare = text.replace(/[\s*·]/g, '');
  if (bare === '' || bare === '+') return 1;
  if (bare === '-' || bare === '−') return -1;
  return evaluateConstant(bare);
}

/** One `vec:` record as a name (possibly empty) and components. */
export function parseVector(raw: string): NamedPair | null {
  const named = /^([^\s\d=:(<⟨[+\-−.][^\s=:(<⟨[]*)\s*[=:]?\s*(.+)$/.exec(raw.trim());
  const name = named ? named[1]! : '';
  const value = named ? named[2]! : raw.trim();
  if (name.length > 12) return null;
  const polar = /^(.+?)\s*(?:∠|@|\bat\b)\s*(.+)$/i.exec(value);
  if (polar) {
    const magnitude = parseQuantity(polar[1]!);
    const angle = parseAngle(polar[2]!);
    if (!magnitude || !angle) return null;
    return { name, x: tidy(magnitude.value * Math.cos((angle.degrees * Math.PI) / 180)), y: tidy(magnitude.value * Math.sin((angle.degrees * Math.PI) / 180)) };
  }
  const unitVectors = /^([^ij]*?)[iî]\s*([+\-−][^ij]*?)[jĵ]$/i.exec(value);
  if (unitVectors) {
    const x = coefficient(unitVectors[1]!);
    const y = coefficient(unitVectors[2]!);
    return x === null || y === null ? null : { name, x, y };
  }
  const pair = parseNamedPair(value);
  return pair && !pair.name ? { ...pair, name } : null;
}

/** Direction in degrees anticlockwise from +x, in (−180°, 180°]. */
export function direction(v: Pt): number {
  return (Math.atan2(v.y, v.x) * 180) / Math.PI + 0;
}

export function compileVectors(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const fail = (reason: string) => malformed(`vectors: ${reason}`);
  const records = specList(spec, 'vec');
  const modeRaw = specGet(spec, 'mode')?.trim().toLowerCase();
  const sumRaw = specGet(spec, 'sum');
  const unit = (specGet(spec, 'unit') ?? '').trim().slice(0, 12);
  if (!records.length) return fail('needs at least one vec line');
  if (records.length > VECTORS_MAX) return refused(`vectors: ${records.length} vectors cannot be told apart at this size; at most ${VECTORS_MAX} are drawn`);

  const vectors: NamedPair[] = [];
  for (const raw of records) {
    const vector = parseVector(raw);
    if (!vector || !Number.isFinite(vector.x) || !Number.isFinite(vector.y)) return fail(`vec: ${clip(raw)} is neither components (A 3 4) nor magnitude∠degrees (A 5∠30)`);
    if (Math.hypot(vector.x, vector.y) < 1e-12) return fail(`vec ${vector.name || clip(raw)} has zero length`);
    if (vector.name && vectors.some((other) => other.name === vector.name)) return fail(`vec ${vector.name} is given twice`);
    vectors.push(vector);
  }

  let mode: Mode = vectors.length > 1 ? 'tip-to-tail' : 'origin';
  if (modeRaw !== undefined) {
    if (/comp/.test(modeRaw)) mode = 'components';
    else if (/origin|parallelogram|tail-?to-?tail/.test(modeRaw)) mode = 'origin';
    else if (/tip|head|polygon/.test(modeRaw)) mode = 'tip-to-tail';
    else return fail(`mode: ${clip(modeRaw)} is not tip-to-tail, origin or components`);
  }
  const sumName = sumRaw === undefined ? null : (/[^\s=:]+/.exec(sumRaw)?.[0] ?? 'R').slice(0, 12);

  const origin = { x: 0, y: 0 };
  const total = vectors.reduce((sum, v) => ({ x: sum.x + v.x, y: sum.y + v.y }), origin);
  let tip = origin;
  const arrows = vectors.map((v) => {
    const from = mode === 'tip-to-tail' ? tip : origin;
    tip = { x: from.x + v.x, y: from.y + v.y };
    return { name: v.name, from, to: tip };
  });
  const magnitude = Math.hypot(total.x, total.y);
  // A resultant too short to carry an arrowhead (a closed polygon of forces) is reported, not drawn.
  const drawSum = sumName !== null && magnitude > 1e-9 * Math.max(...vectors.map((v) => Math.hypot(v.x, v.y)));
  const marks = [origin, ...arrows.flatMap((arrow) => [arrow.from, arrow.to]), ...(drawSum ? [total] : [])];
  if (marks.some((mark) => Math.abs(mark.x) > 1e9 || Math.abs(mark.y) > 1e9)) return fail('the vectors are too large to draw');

  const withUnit = (text: string) => (unit ? `${text} ${unit}` : text);
  const components = (v: Pt) => `(${fmt(v.x)}, ${fmt(v.y)})`;
  const results: string[] = [];
  if (mode === 'components') for (const v of vectors) if (v.name) results.push(withUnit(`${v.name} = ${components(v)}`));
  if (sumName !== null) {
    results.push(withUnit(`${sumName} = ${components(total)}`), withUnit(`|${sumName}| = ${fmt(magnitude)}`));
    if (drawSum) results.push(`θ = ${fmtDegrees(direction(total))}`);
  }

  const nominal = frameSize(ctx.profile);
  const computed = readout(results, nominal.w);
  const window = windowAround(marks);

  const render = (tall: boolean): CompileResult => {
    const plane = new Plane({ window, nominal, equal: true, numbers: 'axis', grid: true, fill: true, names: { x: 'x', y: 'y' }, footer: computed.height, ...(tall ? { tallAbove: 0 } : {}) });
    const b = new SceneBuilder('vectors', plane.width, plane.height);
    const placer = new Placer({ width: plane.width, height: plane.height });
    plane.drawGrid(b);
    plane.drawAxes(b, placer);
    drawReadout(b, placer, computed);

    const guide = (id: string, p: Pt, q: Pt) => {
      const [from, to] = [plane.at(p), plane.at(q)];
      if (Math.hypot(to.x - from.x, to.y - from.y) < 1) return;
      b.line(id, from.x, from.y, to.x, to.y, { color: 'guide', width: 1.1, role: 'guide' });
      placer.line(from.x, from.y, to.x, to.y);
    };
    if (mode === 'components') {
      arrows.forEach(({ to }, i) => {
        // A vector along an axis is its own component.
        if (!to.x || !to.y) return;
        guide(`component-${i}-x`, { x: to.x, y: 0 }, to);
        guide(`component-${i}-y`, { x: 0, y: to.y }, to);
      });
    }
    if (mode !== 'tip-to-tail' && drawSum && arrows.length === 2) arrows.forEach(({ to }, i) => guide(`parallelogram-${i}`, to, total));

    const drawn = [...arrows.map((arrow, i) => ({ ...arrow, id: `vec-${i}`, sum: false })), ...(drawSum ? [{ name: sumName!, from: origin, to: total, id: 'sum', sum: true }] : [])];
    for (const arrow of drawn) {
      const [from, to] = [plane.at(arrow.from), plane.at(arrow.to)];
      b.line(arrow.id, from.x, from.y, to.x, to.y, { markerEnd: true, width: arrow.sum ? 2 : 1.8, color: arrow.sum ? 'accent' : 'neutral', role: 'geometry' });
      placer.line(from.x, from.y, to.x, to.y);
    }
    plane.drawNames(b, placer);

    // A name sits beside the middle of its arrow, on the side facing away from the rest of the figure.
    const middle = plane.at({ x: marks.reduce((sum, p) => sum + p.x, 0) / marks.length, y: marks.reduce((sum, p) => sum + p.y, 0) / marks.length });
    for (const arrow of drawn) {
      if (!arrow.name) continue;
      const [from, to] = [plane.at(arrow.from), plane.at(arrow.to)];
      const size = textSize(arrow.name);
      const normal = Math.atan2(to.x - from.x, -(to.y - from.y));
      const centre = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      const outward = Math.cos(normal) * (centre.x - middle.x) + Math.sin(normal) * (centre.y - middle.y) >= 0 ? normal : normal + Math.PI;
      // Along an axis the far side belongs to the tick numbers: the name goes above or to the right.
      const sides = !arrow.from.y && !arrow.to.y ? [-Math.PI / 2] : !arrow.from.x && !arrow.to.x ? [0] : [outward, outward + Math.PI];
      const spots = function* (): Generator<Pt> {
        for (const part of [0.5, 0.36, 0.64, 0.22, 0.78]) yield* ring({ x: from.x + (to.x - from.x) * part, y: from.y + (to.y - from.y) * part }, size, sides, [3, 7, 12, 18]);
      };
      const spot = placer.claim(size, spots());
      if (!spot) return fail(`no room to label vector ${arrow.name}`);
      b.label(`${arrow.id}-name`, arrow.name, spot.x, spot.y, { protected: true });
    }
    plane.drawNumbers(b, placer);
    return layoutAndCompile(b.scene());
  };

  // The nominal canvas first; a figure too crowded to label there is drawn on the tall one.
  const compact = render(false);
  return compact.ok || !/no room/.test(compact.reason) ? compact : render(true);
}
