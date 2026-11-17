/**
 * Projectile motion: the trajectory of an ideal projectile (no drag), computed and drawn to scale.
 *
 *   v0:    20            launch speed, m/s (or ft/s; lengths are then feet and g defaults to 32.2)
 *   angle: 35            degrees above the horizontal; negative, or "below", is a downward launch
 *   h0:    0             launch height above the ground the projectile lands on
 *   g:     9.81
 *   show:  range, hmax, time     dimension lines and values, all computed here
 *   mark:  1.2           instants in seconds: the point reached and the velocity vector there
 *
 * Both axes share one scale. When that would squash the arc to a sliver, one axis is stretched by a round
 * factor and the figure says so.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { SpecDoc } from '../../spec';
import { samplePathD, type Segment } from '../../geom';
import { SceneBuilder, frameSize } from '../../scene-build';
import {
  EDGE, LINE, Placer, TEXT_H, finish, fmtFixed, fmtSig, guard, packRows, parseQuantity, put, putRows, readAll, readOne, readShow,
  refuse, textW, type Quantity,
} from './shared';

export const PROJECTILE_MAX_MARKS = 4;

type LengthUnit = 'm' | 'ft';

const METRE = /^(?:m|met(?:er|re)s?)$/i;
const FOOT = /^(?:ft|feet|foot)$/i;
const PER_SECOND = /^(.*?)\s*(?:\/\s*s(?:ec(?:ond)?)?|\s*s\^-1|\s+per\s+second|ps)$/i;
const PER_SECOND_SQUARED = /^(.*?)\s*(?:\/\s*s(?:ec)?\^2|\s*s\^-2|\/s\/s|\s+per\s+second\s+squared)$/i;

/** `m` or `ft` named by a unit once `per` has stripped what follows the length; undefined when no unit was written. */
function lengthUnit(key: string, unit: string, per?: RegExp): LengthUnit | undefined {
  if (!unit) return undefined;
  const length = per ? per.exec(unit)?.[1] : unit;
  if (length !== undefined && METRE.test(length)) return 'm';
  if (length !== undefined && FOOT.test(length)) return 'ft';
  return refuse(`${key}: the unit "${unit}" is not understood; use metres or feet with seconds`);
}

function quantity(spec: SpecDoc, key: string): Quantity | undefined {
  const raw = readOne(spec, key);
  if (raw === undefined) return undefined;
  return parseQuantity(raw) ?? refuse(`${key}: "${raw}" is not a number`);
}

function angleDegrees(spec: SpecDoc): { degrees: number; text: string } {
  const raw = readOne(spec, 'angle');
  const written = raw === undefined ? null : parseQuantity(raw);
  if (!written) return refuse(raw === undefined ? 'projectile needs angle: the launch angle in degrees' : `angle: "${raw}" is not a number`);
  const unit = /^(°|deg(?:rees?)?|rad(?:ians?)?)?\s*(?:(above|below|from|to|with)\b.*)?$/i.exec(written.unit);
  if (!unit) refuse(`angle: the unit "${written.unit}" is not understood; give the angle in degrees`);
  const radians = /^rad/i.test(unit[1] ?? '');
  const sign = /^below/i.test(unit[2] ?? '') ? -1 : 1;
  const degrees = sign * (radians ? (written.value * 180) / Math.PI : written.value);
  return { degrees, text: `${radians ? fmtSig(degrees, 3) : fmtFixed(degrees, written.decimals)}°` };
}

const SHOW = {
  all: /\ball\b/g,
  hmax: /\b(?:h_?\{?max\}?|(?:max(?:imum)?|peak)[\s-]*height|apex|height)\b/g,
  range: /\b(?:(?:horizontal\s+)?range|r)\b/g,
  time: /\b(?:time(?:\s+of\s+flight)?|flight(?:\s+time)?|tof|t)\b/g,
};

const ROUND_FACTORS = [1.5, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000];
/** The arc is legible when both its width and its height reach this many units. */
const LEGIBLE = 30;
const ARROW = 42;
const round = (value: number) => Math.round(value * 100) / 100;

function compile(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const speed = quantity(spec, 'v0') ?? refuse('projectile needs v0: the launch speed');
  const angle = angleDegrees(spec);
  const height0 = quantity(spec, 'h0');
  const gravity = quantity(spec, 'g');
  const show = readShow(spec, 'show', SHOW);
  const want = (name: 'hmax' | 'range' | 'time') => show.has(name) || show.has('all');
  const markTimes = readAll(spec, 'mark').flatMap((value) => value.split(/[,;]/)).filter((item) => item.trim()).map((item) => {
    const time = parseQuantity(item);
    if (!time || !/^(?:s|sec|seconds?)?$/i.test(time.unit)) refuse(`mark: "${item.trim()}" is not a time in seconds`);
    return time;
  });

  const units = [lengthUnit('v0', speed.unit, PER_SECOND), lengthUnit('h0', height0?.unit ?? ''), lengthUnit('g', gravity?.unit ?? '', PER_SECOND_SQUARED)]
    .filter((unit) => unit !== undefined);
  if (new Set(units).size > 1) refuse('projectile mixes metres and feet; give v0, h0 and g in one system');
  const L: LengthUnit = units[0] ?? 'm';
  const v0 = speed.value;
  const h0 = height0?.value ?? 0;
  const g = gravity?.value ?? (L === 'm' ? 9.81 : 32.2);
  if (!(v0 > 0)) refuse('v0 must be a positive speed');
  if (!(g > 0)) refuse('g must be positive');
  if (h0 < 0) refuse('h0 is the launch height above the landing ground and cannot be negative');
  if (!(Math.abs(angle.degrees) < 90)) refuse('the launch angle must lie between −90° and 90°: a vertical launch has no range to draw', 'refused');
  if (h0 === 0 && angle.degrees <= 0) refuse('a launch at or below the horizontal from ground level never leaves the ground');

  const theta = (angle.degrees * Math.PI) / 180;
  const vx = v0 * Math.cos(theta);
  const vy = v0 * Math.sin(theta);
  const flight = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
  const range = vx * flight;
  const rises = vy > 0;
  const apexTime = rises ? vy / g : 0;
  const hmax = h0 + (rises ? (vy * vy) / (2 * g) : 0);
  if (markTimes.length > PROJECTILE_MAX_MARKS) refuse(`projectile marks at most ${PROJECTILE_MAX_MARKS} instants legibly`, 'refused');
  for (const time of markTimes) {
    if (!(time.value > 0 && time.value < flight)) refuse(`mark ${fmtFixed(time.value, time.decimals)} s is not during the flight, which lasts ${fmtSig(flight)} s`);
  }

  const notes = [
    `v_0 = ${fmtFixed(v0, speed.decimals)} ${L}/s at ${angle.text}`,
    `g = ${gravity ? fmtFixed(g, gravity.decimals) : g} ${L}/s^2`,
    ...(h0 ? [`h_0 = ${fmtFixed(h0, height0!.decimals)} ${L}`] : []),
    ...(vy ? [`v_0x = ${fmtSig(vx)} ${L}/s`, `v_0y = ${fmtSig(vy)} ${L}/s`] : []),
  ];
  const nominal = frameSize(ctx.profile);
  const width = nominal.w;
  const rows = packRows(notes, width - 2 * EDGE);
  if (notes.some((note) => textW(note) > width - 2 * EDGE)) refuse('the launch values are too long to print', 'refused');

  // Vertical budget around the arc: room above for the apex label, below for the ground, labels and notes.
  const above = EDGE + TEXT_H + 6;
  const below = 4 + LINE + (want('range') ? LINE + 4 : 0) + 6 + (rows.length - 1) * LINE + TEXT_H + EDGE;
  const x0 = EDGE + textW('v_0y') + 8;
  const plotW = width - x0 - EDGE - 16;
  // The launch arrow may stand taller than the arc; its length does not scale.
  const fit = (canvas: number) => {
    const room = canvas - above - below;
    return Math.min(plotW / range, room / hmax, h0 && rises ? (room - ARROW) / h0 : Infinity);
  };
  const heights = [nominal.h, Math.floor(1.5 * nominal.h) + 1, 2 * nominal.h];
  const fitted = heights.find((canvas) => fit(canvas) * range >= 0.6 * plotW) ?? heights.at(-1)!;
  let sx = fit(fitted);
  let sy = sx;
  let stretched = '';
  const factor = (short: number) => ROUND_FACTORS.find((k) => short * k >= LEGIBLE);
  if (sy * hmax < LEGIBLE) {
    const k = factor(sy * hmax) ?? refuse('the trajectory is too flat to draw legibly', 'refused');
    sy *= k;
    stretched = `vertical scale ×${k}`;
  } else if (sx * range < LEGIBLE) {
    const k = factor(sx * range) ?? refuse('the trajectory is too steep to draw legibly', 'refused');
    sx *= k;
    stretched = `horizontal scale ×${k}`;
  }

  // The launch vector follows the drawn tangent, so it stays tangent to the arc on a stretched axis too.
  const tangent = Math.hypot(sx * vx, sy * vy);
  const dx = (sx * vx) / tangent;
  const dy = (-sy * vy) / tangent;
  const rise = Math.max(sy * hmax, sy * h0 + (rises ? -ARROW * dy : 0));
  // A flat arc does not need the whole nominal frame.
  const height = fitted === nominal.h ? Math.max(96, Math.min(fitted, Math.ceil(above + rise + below))) : fitted;
  const ground = above + rise + (height - above - below - rise) / 2;
  const X = (x: number) => x0 + sx * x;
  const Y = (y: number) => ground - sy * y;
  const launch: [number, number] = [x0, Y(h0)];
  const landing: [number, number] = [X(range), ground];
  const tip: [number, number] = [x0 + ARROW * dx, launch[1] + ARROW * dy];
  const right = width - EDGE - 2;
  const trajectory = `M ${round(launch[0])} ${round(launch[1])} Q ${round(X((vx * flight) / 2))} ${round(Y(h0 + (vy * flight) / 2))} ${round(landing[0])} ${round(landing[1])}`;

  const b = new SceneBuilder('projectile', width, height);
  const arrows: Segment[] = [{ x1: launch[0], y1: launch[1], x2: tip[0], y2: tip[1] }];
  const hasX = Math.abs(ARROW * dx) >= 10 && vy !== 0;
  const hasY = Math.abs(ARROW * dy) >= 10;
  if (hasX) arrows.push({ x1: launch[0], y1: launch[1], x2: tip[0], y2: launch[1] });
  if (hasY) arrows.push({ x1: launch[0], y1: launch[1], x2: launch[0], y2: tip[1] });
  const marks = markTimes.map((time) => {
    const at: [number, number] = [X(vx * time.value), Y(h0 + vy * time.value - (g * time.value ** 2) / 2)];
    const drawn = Math.hypot(sx * vx, sy * (vy - g * time.value));
    const unit: [number, number] = [(sx * vx) / drawn, (-sy * (vy - g * time.value)) / drawn];
    // To the scale of the launch arrow, but never through the ground.
    const reach = unit[1] > 0 ? (ground - 3 - at[1]) / unit[1] : Infinity;
    if (reach < 12) refuse(`mark ${fmtFixed(time.value, time.decimals)} s is too close to the landing to draw its velocity`, 'refused');
    const length = Math.min(reach, Math.max(14, (ARROW * Math.hypot(vx, vy - g * time.value)) / v0));
    return { time, at, unit, segment: { x1: at[0], y1: at[1], x2: at[0] + unit[0] * length, y2: at[1] + unit[1] * length } };
  });
  const apex: [number, number] = [X(vx * apexTime), Y(hmax)];
  const rangeY = ground + 4 + LINE + 4 + TEXT_H / 2;
  const dimensions: Segment[] = [];
  if (want('range')) {
    dimensions.push({ x1: launch[0], y1: rangeY, x2: landing[0], y2: rangeY });
    dimensions.push({ x1: launch[0], y1: ground + 6, x2: launch[0], y2: rangeY + 4 }, { x1: landing[0], y1: ground + 6, x2: landing[0], y2: rangeY + 4 });
  }
  if (want('hmax') && rises) dimensions.push({ x1: apex[0], y1: ground, x2: apex[0], y2: apex[1] + 3 });

  const surface: Segment[] = [
    { x1: EDGE, y1: launch[1], x2: launch[0], y2: launch[1] },
    { x1: launch[0], y1: launch[1], x2: launch[0], y2: ground },
    { x1: launch[0], y1: ground, x2: right, y2: ground },
  ];
  // Dashed projections from the tip of v0 onto its two components.
  const guides: Segment[] = hasX || hasY
    ? [{ x1: tip[0], y1: tip[1], x2: tip[0], y2: launch[1] }, { x1: tip[0], y1: tip[1], x2: launch[0], y2: tip[1] }]
    : [];
  const placer = new Placer(width, height, [
    ...samplePathD(trajectory, 24), ...surface, ...arrows, ...guides, ...marks.map((mark) => mark.segment), ...dimensions,
  ]);

  // The ground, with the launch ledge when the launch is raised, over a wash of earth.
  b.polygon('earth', [EDGE, launch[1], launch[0], launch[1], launch[0], ground, right, ground, right, ground + 4, EDGE, ground + 4], { color: 'muted', fill: 'tint', width: 0, role: 'boundary' });
  b.polyline('ground', [EDGE, launch[1], launch[0], launch[1], launch[0], ground, right, ground], { role: 'boundary', width: 1.4 });
  if (stretched) {
    const cx = width - EDGE - textW(stretched) / 2;
    // Held with air on its left, so no value is set beside it and read as part of it.
    const box = placer.box([stretched], cx, EDGE + TEXT_H / 2);
    placer.taken.push({ ...box, x1: box.x1 - 16 });
    put(b, 'scale-note', stretched, cx, EDGE + TEXT_H / 2);
  }
  const [rangeLine, ...ticks] = want('range') ? dimensions : [];
  if (rangeLine) {
    ticks.slice(0, 2).forEach((tick, i) => b.line(`range-tick-${i}`, tick.x1, tick.y1, tick.x2, tick.y2, { color: 'muted', role: 'dimension', width: 1 }));
    b.line('range', rangeLine.x1, rangeLine.y1, rangeLine.x2, rangeLine.y2, { color: 'muted', role: 'dimension', width: 1, markerStart: true, markerEnd: true });
  }
  if (want('hmax') && rises) b.line('hmax', apex[0], ground, apex[0], apex[1] + 3, { color: 'muted', role: 'dimension', width: 1, markerStart: true, markerEnd: true });
  b.path('trajectory', trajectory, { role: 'geometry', width: 1.6 });

  guides.forEach((guide, i) => b.line(`v0-guide-${i}`, guide.x1, guide.y1, guide.x2, guide.y2, { color: 'muted', role: 'guide', width: 1, dash: true }));
  if (hasX) b.line('v0x', launch[0], launch[1], tip[0], launch[1], { color: 'accent', role: 'annotation', width: 1.2, markerEnd: true });
  if (hasY) b.line('v0y', launch[0], launch[1], launch[0], tip[1], { color: 'accent', role: 'annotation', width: 1.2, markerEnd: true });
  b.line('v0', launch[0], launch[1], tip[0], tip[1], { color: 'accent', role: 'annotation', width: 1.6, markerEnd: true });
  const screenAngle = (Math.atan2(-dy, dx) * 180) / Math.PI;
  if (Math.abs(screenAngle) >= 6) b.arc('angle', launch[0], launch[1], 20, 20, 0, -screenAngle, { color: 'muted', role: 'annotation', width: 1 });
  marks.forEach((mark, i) => {
    b.line(`mark-velocity-${i}`, mark.segment.x1, mark.segment.y1, mark.segment.x2, mark.segment.y2, { color: 'accent', role: 'annotation', width: 1.4, markerEnd: true });
    b.circle(`mark-${i}`, mark.at[0], mark.at[1], 2.2, { color: 'accent', fill: 'ink', role: 'geometry' });
  });
  b.circle('launch', launch[0], launch[1], 2.2, { fill: 'ink', role: 'geometry' });
  if (rises) b.circle('apex', apex[0], apex[1], 2.2, { fill: 'ink', role: 'geometry' });
  b.circle('landing', landing[0], landing[1], 2.2, { fill: 'ink', role: 'geometry' });

  const label = (id: string, text: string, candidates: Array<[number, number]>, optional = false) => {
    const at = placer.place([text], candidates);
    if (at) put(b, id, text, at[0], at[1]);
    else if (!optional) refuse(`there is no room to print "${text}" clear of the trajectory`, 'refused');
  };
  const half = (text: string) => textW(text) / 2;
  const up = dy <= 0 ? -1 : 1;
  // Launch labels: each beside its own arrow, on the side away from the arc.
  if (hasY) label('v0y-label', 'v_0y', [[x0 - 4 - half('v_0y'), (launch[1] + tip[1]) / 2], [x0 - 4 - half('v_0y'), tip[1]]]);
  if (hasX) {
    const cx = (launch[0] + tip[0]) / 2;
    // Under its arrow; past the arrowhead when a low ledge leaves no room between the arrow and the ground.
    label('v0x-label', 'v_0x', [
      [cx, launch[1] - up * (6 + TEXT_H / 2)], [cx + 8, launch[1] - up * (6 + TEXT_H / 2)], [cx, launch[1] + up * (6 + TEXT_H / 2)],
      [tip[0] + 5 + half('v_0x'), launch[1]],
    ]);
  }
  // Above and behind the tip: the arc leaves the tip forwards and below, so that corner is always clear of it.
  label('v0-label', 'v_0', [
    [tip[0] - half('v_0') - 1, tip[1] - 4 - TEXT_H / 2],
    [tip[0] - half('v_0') - 6, tip[1] - 4 - TEXT_H / 2],
    [tip[0], tip[1] + up * (5 + TEXT_H / 2)],
    [tip[0] + 6 + half('v_0'), tip[1] + up * (5 + TEXT_H / 2)],
    [tip[0] + 5 + half('v_0'), tip[1]],
  ]);
  if (Math.abs(screenAngle) >= 6) {
    const bisector = (screenAngle * Math.PI) / 360;
    const spots = [0.5, 0.3].flatMap((share) => [34, 46, 58, 70].map((radius): [number, number] => {
      const turn = bisector * 2 * share;
      return [launch[0] + radius * Math.cos(turn), launch[1] - radius * Math.sin(turn)];
    }));
    label('angle-label', angle.text.replace('−', ''), spots, true);
  }
  marks.forEach((mark, i) => {
    const text = `t = ${fmtFixed(mark.time.value, mark.time.decimals)} s`;
    // Off the tangent on the side the arc curves away from, then further out, then inside the arc.
    const [nx, ny] = [mark.unit[1], -mark.unit[0]];
    const reach = half(text) * Math.abs(nx) + (TEXT_H / 2) * Math.abs(ny);
    label(`mark-label-${i}`, text, [5, 13, -8, -16].map((gap): [number, number] => {
      const out = Math.sign(gap) * (Math.abs(gap) + reach);
      return [mark.at[0] + nx * out, mark.at[1] + ny * out];
    }));
  });
  if (rangeLine) {
    const text = `R = ${fmtSig(range)} ${L}`;
    const onLine: [number, number] = [(rangeLine.x1 + rangeLine.x2) / 2, rangeY];
    // On the line when the line is long enough to show on both sides of the text, otherwise beside it.
    const fits = rangeLine.x2 - rangeLine.x1 >= textW(text) + 24;
    const before = placer.segments.indexOf(rangeLine);
    if (fits) placer.segments.splice(before, 1);
    const at = placer.place([text], fits ? [onLine] : [[rangeLine.x2 + 8 + half(text), rangeY], [rangeLine.x1 - 8 - half(text), rangeY]])
      ?? refuse('there is no room to label the range', 'refused');
    if (fits) b.rect('range-plate', at[0] - half(text) - 3, at[1] - TEXT_H / 2, textW(text) + 6, TEXT_H, { color: 'muted', fill: 'paper', width: 0, role: 'annotation' });
    put(b, 'range-label', text, at[0], at[1]);
  }
  if (want('hmax')) {
    const text = `h_max = ${fmtSig(hmax)} ${L}`;
    const mid = (ground + apex[1]) / 2;
    const over = apex[1] - 6 - TEXT_H / 2;
    const foot = ground - 4 - TEXT_H / 2;
    // Beside its dimension line inside the arc, else over the apex, else at the foot of the line where the arc is widest.
    label('hmax-label', text, rises
      ? [
        [apex[0] + 5 + half(text), mid], [apex[0] - 5 - half(text), mid], [apex[0], over],
        [Math.min(apex[0] + half(text), width - EDGE - half(text)), over], [Math.max(apex[0] - half(text), EDGE + half(text)), over],
        [apex[0] + 5 + half(text), foot], [apex[0] - 5 - half(text), foot],
      ]
      // No rise: the launch height is the maximum, and the label stands beside the drop.
      : [[x0 + 6 + half(text), mid], [x0 + 6 + half(text), ground - 4 - TEXT_H / 2], [landing[0] + 8 + half(text), mid]]);
  }
  if (want('time')) {
    const text = `t = ${fmtSig(flight)} s`;
    const row = ground + 5 + TEXT_H / 2;
    // Under the landing point, on whichever side of it has the room.
    label('time-label', text, [[landing[0] - 4 - half(text), row], [landing[0] + 4 + half(text), row], [landing[0] + 6 + half(text), ground - 5 - TEXT_H / 2]]);
  }
  putRows(b, 'note', rows, width / 2, height - EDGE - (rows.length - 1) * LINE - TEXT_H);
  return finish(b.scene());
}

export const compileProjectile = guard(compile);
