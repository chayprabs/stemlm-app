/**
 * The unit circle with angles in standard position.
 *
 *   angle: 150                 repeatable (or a comma list); degrees unless written otherwise: `5pi/6`, `5π/6`, `2.618 rad`, `150°`
 *   show:  coords, triangle    coords: the point (cos θ, sin θ) at each angle; triangle: its reference triangle
 *
 * Coordinates are exact for multiples of 15° (from a table of the special angles) and decimal for
 * every other angle; nothing the spec says can supply them.
 */
import type { CompileCtx, CompileResult } from '../../types';
import { specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { Placer, beyond, canvasHeight, fan, malformed, refused, rightAngleMark, ring, textSize, type Pt } from './canvas';
import { parseAngle } from './expr';
import { angleLabel, exactPoint, fmt } from './format';

const UNITCIRCLE_MAX = 8;
const RAD = Math.PI / 180;
/** The circle as large as the canvas allows, then smaller to leave room for many coordinate labels. */
const RADII = [84, 62];

/** The point's coordinates as printed: exact surds at the special angles, three significant figures elsewhere. */
export function pointText(degrees: number): string {
  const exact = exactPoint(degrees);
  return exact ? `(${exact.cos}, ${exact.sin})` : `(${fmt(Math.cos(degrees * RAD))}, ${fmt(Math.sin(degrees * RAD))})`;
}

export function compileUnitCircle(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const fail = (reason: string) => malformed(`unitcircle: ${reason}`);
  const angleRaw = specList(spec, 'angle').flatMap((line) => line.split(/[,;]/)).map((item) => item.trim()).filter(Boolean);
  const show = specList(spec, 'show').flatMap((line) => line.toLowerCase().split(/[,;\s]+/)).filter(Boolean);
  const stray = show.find((word) => !/^(?:coord|point|triangle|reference|ref$|and$)/.test(word));
  if (stray) return fail(`show: ${stray.slice(0, 20)} is not coords or triangle`);
  const wantCoords = show.some((word) => /^(?:coord|point)/.test(word));
  const wantTriangle = show.some((word) => /^(?:triangle|ref)/.test(word));
  if (!angleRaw.length) return fail('needs at least one angle');
  if (angleRaw.length > UNITCIRCLE_MAX) return refused(`unitcircle: ${angleRaw.length} angles cannot be labelled legibly; at most ${UNITCIRCLE_MAX} are drawn`);

  const angles: Array<{ degrees: number; label: string }> = [];
  for (const raw of angleRaw) {
    const angle = parseAngle(raw.replace(/^(?:θ|theta)\s*=\s*/i, ''));
    if (!angle || Math.abs(angle.degrees) > 1e6) return fail(`angle: ${raw.slice(0, 20)} is not an angle`);
    angles.push({ degrees: angle.degrees, label: angleLabel(angle) });
  }

  // A circle is as tall as it is wide: it always takes the tall canvas.
  const nominal = frameSize(ctx.profile);
  const height = canvasHeight(nominal.h + 1, nominal.h);
  const c = { x: nominal.w / 2, y: height / 2 };

  const render = (radius: number): SceneBuilder | string => {
    const b = new SceneBuilder('unitcircle', nominal.w, height);
    const placer = new Placer({ width: nominal.w, height });
    const reach = radius + 15;
    b.line('x-axis', c.x - reach, c.y, c.x + reach, c.y, { width: 1.2, role: 'axis', markerEnd: true, protected: true });
    b.line('y-axis', c.x, c.y + reach, c.x, c.y - reach, { width: 1.2, role: 'axis', markerEnd: true, protected: true });
    placer.line(c.x - reach, c.y, c.x + reach, c.y).line(c.x, c.y + reach, c.x, c.y - reach);
    for (const [id, text, at] of [['x-name', 'x', { x: c.x + reach + 9, y: c.y }], ['y-name', 'y', { x: c.x + 9, y: c.y - reach + 3 }]] as const) {
      b.label(id, text, at.x, at.y, { protected: true });
      placer.dot(at.x, at.y, 6);
    }
    b.circle('circle', c.x, c.y, radius, { role: 'geometry' });
    placer.circle(c.x, c.y, radius);

    const points = angles.map(({ degrees }, i) => {
      const at = { x: c.x + radius * Math.cos(degrees * RAD), y: c.y - radius * Math.sin(degrees * RAD) };
      // On an axis the reference triangle has no area: there is nothing to draw.
      if (wantTriangle && Math.abs(at.x - c.x) > 0.5 && Math.abs(at.y - c.y) > 0.5) {
        b.polygon(`triangle-${i}`, [c.x, c.y, at.x, c.y, at.x, at.y], { color: 'accent', fill: 'tint', width: 0, role: 'annotation' });
        b.line(`triangle-${i}-height`, at.x, at.y, at.x, c.y, { color: 'guide', width: 1.2, role: 'guide' });
        b.line(`triangle-${i}-base`, c.x, c.y, at.x, c.y, { color: 'accent', width: 2, role: 'geometry' });
        placer.line(at.x, at.y, at.x, c.y);
        placer.path(rightAngleMark(b, `triangle-${i}-corner`, { x: at.x, y: c.y }, { x: Math.sign(c.x - at.x), y: 0 }, { x: 0, y: Math.sign(at.y - c.y) }, 5));
      }
      b.line(`ray-${i}`, c.x, c.y, at.x, at.y, { color: 'accent', role: 'geometry' });
      placer.line(c.x, c.y, at.x, at.y);
      return at;
    });

    // The sweep from the positive x-axis: anticlockwise for a positive angle, at most one full turn drawn.
    // Four or more sweeps would bury the centre, so many angles are named along their rays instead.
    const swept = angles.length <= 3;
    const sweeps = angles.map(({ degrees }, i) => {
      const turn = degrees % 360 || (degrees ? Math.sign(degrees) * 360 : 0);
      const r = Math.min(14 + 6 * i, radius * 0.62);
      const steps = Math.max(2, Math.ceil(Math.abs(turn) / 6));
      const arc: number[] = [];
      for (let k = 0; k <= steps; k++) arc.push(c.x + r * Math.cos(((turn * k) / steps) * RAD), c.y - r * Math.sin(((turn * k) / steps) * RAD));
      if (turn && swept) {
        b.polyline(`sweep-${i}`, arc, { width: 1.1, role: 'annotation', fill: 'none', markerEnd: Math.abs(turn) >= 20 });
        placer.path(arc);
      }
      return { turn, r };
    });
    points.forEach((at, i) => {
      b.circle(`point-${i}`, at.x, at.y, 2.4, { fill: 'ink', role: 'geometry' });
      placer.dot(at.x, at.y, 2.4);
    });

    // Angle names first: their places are few, while coordinates have the whole outside of the circle.
    for (const [i, { label }] of angles.entries()) {
      const { turn, r } = sweeps[i]!;
      const size = textSize(label);
      const spots = function* (): Generator<Pt> {
        if (swept) {
          // Beside the arc inside the angle; a narrow angle is labelled past the arc's start, across the x-axis.
          for (const gap of [3, 8, 14, 21]) {
            for (const part of [0.5, 0.3, 0.7, 0.15, 0.85]) {
              const ray = -turn * part * RAD;
              yield beyond({ x: c.x + r * Math.cos(ray), y: c.y + r * Math.sin(ray) }, ray, gap, size);
            }
          }
          for (const along of [r + 4, r + 16, r + 30]) yield beyond({ x: c.x + along + size.w / 2, y: c.y }, turn >= 0 ? Math.PI / 2 : -Math.PI / 2, 3, size);
        }
        // Many bare angles are named like a protractor, outside the circle at their points.
        const ray = -angles[i]!.degrees * RAD;
        if (!swept && !wantCoords) yield* ring(points[i]!, size, fan(ray), [4, 8]);
        // Otherwise against its own ray towards the rim, and outside only when that is taken too.
        for (const [part, gap] of [[0.72, 3], [0.86, 3], [0.58, 3], [0.44, 3], [0.72, 8], [0.86, 8]] as const) {
          for (const side of [-Math.PI / 2, Math.PI / 2]) {
            yield beyond({ x: c.x + radius * part * Math.cos(ray), y: c.y + radius * part * Math.sin(ray) }, ray + side, gap, size);
          }
        }
        yield* ring(points[i]!, size, fan(ray), [4, 8]);
      };
      const spot = placer.claim(size, spots());
      if (!spot) return `no room to label the angle ${label}`;
      b.label(`angle-${i}`, label, spot.x, spot.y, { protected: true });
    }
    if (wantCoords) {
      for (const [i, at] of points.entries()) {
        const text = pointText(angles[i]!.degrees);
        const size = textSize(text);
        const spots = function* (): Generator<Pt> {
          yield* ring(at, size, fan(Math.atan2(at.y - c.y, at.x - c.x)), [4, 8, 13]);
          // A wide label that fits nowhere around its point slides along above or below it.
          const outward = at.y <= c.y ? -1 : 1;
          for (const gap of [5, 11, 18]) {
            for (const side of [outward, -outward]) {
              for (const slide of [0.25, -0.25, 0.5, -0.5]) yield { x: at.x + slide * size.w, y: at.y + side * (gap + size.h / 2) };
            }
          }
        };
        const spot = placer.claim(size, spots());
        if (!spot) return `no room to label the point at ${angles[i]!.label}`;
        b.label(`point-${i}-coords`, text, spot.x, spot.y, { protected: true });
      }
    }

    // Unit marks last: they give way to everything the figure says.
    for (const [id, at, side] of [['one-x', { x: c.x + radius, y: c.y }, Math.PI / 4], ['one-y', { x: c.x, y: c.y - radius }, -Math.PI / 4]] as const) {
      const size = textSize('1');
      const spot = placer.claim(size, [beyond(at, side, 3, size)], 1);
      if (spot) b.label(id, '1', spot.x, spot.y, { protected: true });
    }
    return b;
  };

  let reason = '';
  for (const radius of RADII) {
    const drawn = render(radius);
    if (typeof drawn !== 'string') return layoutAndCompile(drawn.scene());
    reason = drawn;
  }
  return refused(`unitcircle: ${reason}`);
}
