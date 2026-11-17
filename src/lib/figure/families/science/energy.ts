/**
 * Reaction energy profile: plateaus joined by smooth curves, energies to scale.
 *
 *   level:    reactants 0 A + B     `<id> <energy> [label words]`, repeated in reaction order
 *   unit:     kJ/mol                printed on the energy axis and after every computed value
 *   show:     ea, dh                Ea = first transition state − reactants; ΔH = products − reactants
 *   catalyst: ts1 55                a lower barrier for a named transition state, drawn dashed
 *
 * Nothing about the shape is declared: a level higher than both its neighbours is a transition state
 * (a peak), every other level is a plateau, so an intermediate is a well between two peaks. Ea, ΔH and
 * the words exothermic / endothermic are computed here, never read.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { SpecDoc } from '../../spec';
import { samplePathD, type Segment } from '../../geom';
import { chemicalNotation } from '../../label-format';
import { SceneBuilder, frameSize } from '../../scene-build';
import { isClipped, unquote, wrapText } from '../cs/common';
import {
  EDGE, LINE, Placer, TEXT_H, canvasHeight, finish, fmtFixed, guard, packRows, parseQuantity, plainSuperscripts, put,
  putLeft, putLines, putRows, readAll, readOne, readShow, refuse, safeId, textW, type Quantity,
} from './shared';

export const ENERGY_MAX_LEVELS = 9;

interface Level {
  id: string;
  label: string;
  energy: number;
  decimals: number;
  unit?: string;
}

const ENERGY_UNIT = /^(?:k?J|k?cal|eV)(?:[/·]?mol(?:\^\{?-1\}?)?)?$/i;
const PER_MOLE = /^mol\^\{?-1\}?$/i;

/** A trailing separator is punctuation between fields, never part of one. */
const bare = (token: string | undefined) => (token ?? '').replace(/[,;:=]+$/, '');

/** A token that is an energy: a bare number, or a number with an energy unit attached (`85kJ/mol`). */
function energyOf(token: string | undefined): Quantity | null {
  const quantity = parseQuantity(bare(token));
  return quantity && (!quantity.unit || ENERGY_UNIT.test(quantity.unit)) ? quantity : null;
}

function parseLevel(raw: string, index: number): Level {
  const tokens = plainSuperscripts(raw).split(/\s+/).filter((token, i) => token && !(i < 3 && /^[=:,;|]+$/.test(token)));
  const first = energyOf(tokens[0]);
  const second = energyOf(tokens[1]);
  const energy = second ?? first;
  if (!energy) refuse(`level "${raw.trim()}" has no energy; write level: <id> <energy> [label]`);
  // `level: 0 A + B` has no id; the grammar's id comes first whenever a number follows it.
  const id = second ? bare(tokens[0]) : undefined;
  let at = second ? 2 : 1;
  let unit = energy.unit;
  if (!unit && ENERGY_UNIT.test(bare(tokens[at]))) unit = bare(tokens[at++]);
  if (unit && PER_MOLE.test(bare(tokens[at]))) unit += ` ${bare(tokens[at++])}`;
  const label = unquote(tokens.slice(at).join(' ')) || id || '';
  return { id: id ?? `#${index + 1}`, label, energy: energy.value, decimals: energy.decimals, ...(unit ? { unit } : {}) };
}

/** Formula counts as subscripts and charges as superscripts, species by species: `2H2O + O2`, `OH-`. */
function chemistry(label: string): string {
  return label.split(/(\s+)/).map((word) => {
    const match = /^(\d*)(.*)$/.exec(word)!;
    return `${match[1]}${chemicalNotation(match[2]!)}`;
  }).join('');
}

const SHOW = {
  all: /\b(?:all|both)\b/g,
  ea: /\be_?\{?a\}?(?![a-z])|\bactivation(?:\s+energy)?\b/g,
  dh: /(?:[Δδ]|\bdelta[\s_]*|\bd)h\b|\benthalpy(?:\s+change)?\b/g,
};

/** Tick values at 1, 2 or 5 × 10^k inside [lo, hi], no closer together than a line of text. */
function ticksWithin(lo: number, hi: number, perUnit: number): Array<{ value: number; text: string }> {
  const least = (LINE + 2) / perUnit;
  for (let exponent = Math.floor(Math.log10(least)); ; exponent++) {
    for (const mantissa of [1, 2, 5]) {
      const step = mantissa * 10 ** exponent;
      if (step < least) continue;
      const from = Math.ceil(lo / step - 1e-9);
      const to = Math.floor(hi / step + 1e-9);
      return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => {
        const value = (from + i) * step;
        return { value, text: fmtFixed(value, Math.max(0, -exponent)) };
      });
    }
  }
}

const round = (value: number) => Math.round(value * 100) / 100;
/** How far a joining curve leaves each end horizontally, as a share of its run. */
const BEND = 0.42;
const PLATEAU = 48;
const LABEL_W = 110;

function compile(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const levels = readAll(spec, 'level').map(parseLevel);
  const n = levels.length;
  if (n < 2) refuse('energy needs at least two level lines: level: <id> <energy> [label]');
  if (n > ENERGY_MAX_LEVELS) refuse(`energy draws at most ${ENERGY_MAX_LEVELS} levels legibly; this one has ${n}`, 'refused');
  const find = (id: string) => levels.findIndex((level) => level.id.toLowerCase() === id.toLowerCase());
  const repeated = levels.find((level, i) => find(level.id) !== i);
  if (repeated) refuse(`level ${repeated.id} is declared twice; each level needs its own id`);
  const unit = unquote(readOne(spec, 'unit') ?? levels.find((level) => level.unit)?.unit ?? '').replace(/^\((.*)\)$/, '$1').trim();
  const show = readShow(spec, 'show', SHOW);
  const wantEa = show.has('ea') || show.has('all');
  const wantDh = show.has('dh') || show.has('all');

  const energies = levels.map((level) => level.energy);
  const lo = Math.min(...energies);
  const hi = Math.max(...energies);
  if (hi === lo) refuse('every level has the same energy; there is no profile to draw');
  const isPeak = (i: number) => i > 0 && i < n - 1 && energies[i]! > energies[i - 1]! && energies[i]! > energies[i + 1]!;
  const peaks = levels.flatMap((_, i) => (isPeak(i) ? [i] : []));
  const reactants = levels[0]!;
  const products = levels[n - 1]!;
  const firstPeak = peaks[0];
  if (wantEa && firstPeak === undefined) refuse('show: ea needs a transition state, a level higher than both its neighbours');
  if (wantEa && energies[firstPeak!]! <= reactants.energy) refuse('the first transition state lies below the reactants, so E_a from the reactants is not defined');

  const catalysed = new Map<number, Quantity>();
  for (const raw of readAll(spec, 'catalyst')) {
    const tokens = plainSuperscripts(raw).split(/[\s,;:=]+/).filter(Boolean);
    const named = tokens.length > 1;
    const energy = energyOf(tokens[named ? 1 : 0]);
    if (!energy) refuse(`catalyst "${raw.trim()}" has no energy; write catalyst: <transition-state id> <energy>`);
    if (!named && peaks.length !== 1) refuse('catalyst must name the transition state it lowers: catalyst: <id> <energy>');
    const at = named ? find(tokens[0]!) : peaks[0]!;
    if (at < 0) refuse(`catalyst names ${tokens[0]}, which no level line declares`);
    if (!isPeak(at)) refuse(`catalyst names ${levels[at]!.id}, which is not a transition state (a level higher than both its neighbours)`);
    if (energy.value >= energies[at]! || energy.value <= Math.max(energies[at - 1]!, energies[at + 1]!)) {
      refuse(`the catalysed barrier of ${levels[at]!.id} must lie below ${fmtFixed(energies[at]!, levels[at]!.decimals)} and above both neighbouring levels`);
    }
    catalysed.set(at, energy);
  }

  const amount = (value: number, decimals: number) => `${fmtFixed(value, decimals)}${unit ? ` ${unit}` : ''}`;
  const dh = products.energy - reactants.energy;
  const notes: string[] = [];
  if (wantEa) {
    const peak = levels[firstPeak!]!;
    notes.push(`E_a = ${amount(peak.energy - reactants.energy, Math.max(peak.decimals, reactants.decimals))}`);
    const lowered = catalysed.get(firstPeak!);
    if (lowered) notes.push(`with catalyst (dashed): E_a = ${amount(lowered.value - reactants.energy, Math.max(lowered.decimals, reactants.decimals))}`);
  }
  if (catalysed.size && notes.length < 2) notes.push('dashed: with catalyst');
  if (wantDh) {
    const value = amount(dh, Math.max(products.decimals, reactants.decimals));
    notes.push(`ΔH = ${dh > 0 ? '+' : ''}${value}${dh ? ` (${dh < 0 ? 'exothermic' : 'endothermic'})` : ''}`);
  }

  const nominal = frameSize(ctx.profile);
  const width = nominal.w;
  const title = `Energy${unit ? ` (${unit})` : ''}`;
  if (Math.max(textW(title), ...notes.map(textW)) > width - 2 * EDGE) refuse('the unit is too long to print', 'refused');
  const rows = packRows(notes, width - 2 * EDGE);
  const footerH = rows.length ? 6 + (rows.length - 1) * LINE + TEXT_H : 0;
  const height = canvasHeight(nominal.h + footerH, nominal.h);
  const axisTop = EDGE + TEXT_H + 4;
  const axisY = height - EDGE - footerH - TEXT_H - 4;
  const dhGutter = wantDh && dh ? 14 + textW('ΔH') + EDGE : 9;

  // Label room above the highest level and below the lowest depends on how the labels wrap, which depends
  // on the plateau width, which depends on the tick labels: plan for one line, and again if a label needs two.
  const plan = (lines: number) => {
    const room = lines * LINE + 3;
    const yTop = axisTop + 6 + room;
    const yBottom = axisY - 4 - room;
    const perUnit = (yBottom - yTop) / (hi - lo);
    const ticks = ticksWithin(lo, hi, perUnit);
    const axisX = EDGE + Math.max(0, ...ticks.map((tick) => textW(tick.text))) + 6;
    const xStart = axisX + 7;
    const xEnd = width - EDGE - dhGutter;
    const plateau = Math.min(PLATEAU, (xEnd - xStart) / (2 * n - 1 - peaks.length));
    const run = (xEnd - xStart - (n - peaks.length) * plateau) / (n - 1);
    let x = xStart;
    const spans = levels.map((_, i) => {
      const span: [number, number] = [x, x + (isPeak(i) ? 0 : plateau)];
      x = span[1] + run;
      return span;
    });
    const texts = levels.map((level) => {
      if (!level.label) return [];
      // A long word sets the width: under a well or over a peak there is more room than one plateau.
      const text = chemistry(level.label);
      const wrapped = wrapText(text, Math.min(LABEL_W, Math.max(plateau + run, ...text.split(/\s+/).map(textW))), 2);
      if (isClipped(wrapped)) refuse(`the label of level ${level.id} is too long to print beside the curve`, 'refused');
      return wrapped;
    });
    return { y: (energy: number) => yBottom - (energy - lo) * perUnit, ticks, axisX, xEnd, spans, texts };
  };
  let { y, ticks, axisX, xEnd, spans, texts } = plan(1);
  if (texts.some((lines) => lines.length > 1)) ({ y, ticks, axisX, xEnd, spans, texts } = plan(2));

  const b = new SceneBuilder('energy', width, height);
  const through = (from: [number, number], to: [number, number]) => {
    const bend = (to[0] - from[0]) * BEND;
    return ` C ${round(from[0] + bend)} ${round(from[1])} ${round(to[0] - bend)} ${round(to[1])} ${round(to[0])} ${round(to[1])}`;
  };
  const ys = energies.map(y);
  let profile = `M ${round(spans[0]![0])} ${round(ys[0]!)} H ${round(spans[0]![1])}`;
  for (let i = 1; i < n; i++) {
    profile += through([spans[i - 1]![1], ys[i - 1]!], [spans[i]![0], ys[i]!]);
    if (!isPeak(i)) profile += ` H ${round(spans[i]![1])}`;
  }
  const lowered = [...catalysed].map(([i, energy]) => {
    const peak: [number, number] = [spans[i]![0], y(energy.value)];
    const d = `M ${round(spans[i - 1]![1])} ${round(ys[i - 1]!)}${through([spans[i - 1]![1], ys[i - 1]!], peak)}${through(peak, [spans[i + 1]![0], ys[i + 1]!])}`;
    return { id: `catalyst-${safeId(levels[i]!.id)}`, d };
  });

  const right = width - EDGE - 1;
  const eaX = wantEa ? spans[firstPeak!]![0] : 0;
  const dhX = xEnd + 8;
  const guides: Array<{ id: string; segment: Segment }> = [];
  if (wantEa || (wantDh && dh)) {
    guides.push({ id: 'reference', segment: { x1: spans[0]![1], y1: ys[0]!, x2: wantDh && dh ? dhX + 4 : eaX + 8, y2: ys[0]! } });
  }
  if (wantDh && dh) guides.push({ id: 'reference-products', segment: { x1: spans[n - 1]![1], y1: ys[n - 1]!, x2: dhX + 4, y2: ys[n - 1]! } });
  const arrows: Array<{ id: string; segment: Segment; both: boolean }> = [];
  if (wantEa) arrows.push({ id: 'ea', segment: { x1: eaX, y1: ys[0]!, x2: eaX, y2: ys[firstPeak!]! + 1.5 }, both: true });
  if (wantDh && dh) arrows.push({ id: 'dh', segment: { x1: dhX, y1: ys[0]!, x2: dhX, y2: ys[n - 1]! }, both: false });

  const placer = new Placer(width, height, [
    ...samplePathD(profile, 16),
    ...lowered.flatMap((curve) => samplePathD(curve.d, 16)),
    { x1: axisX, y1: axisTop, x2: axisX, y2: axisY },
    { x1: axisX, y1: axisY, x2: right, y2: axisY },
    ...guides.map((guide) => guide.segment),
    ...arrows.map((arrow) => arrow.segment),
  ]);
  placer.taken.push(placer.box([title], EDGE + textW(title) / 2, EDGE + TEXT_H / 2));

  b.line('energy-axis', axisX, axisY, axisX, axisTop, { color: 'muted', role: 'axis', width: 1.2, markerEnd: true });
  b.line('reaction-axis', axisX, axisY, right, axisY, { color: 'muted', role: 'axis', width: 1.2, markerEnd: true });
  putLeft(b, 'energy-title', title, EDGE, EDGE + TEXT_H / 2);
  put(b, 'reaction-title', 'Reaction coordinate', (axisX + right) / 2, axisY + 4 + TEXT_H / 2);
  ticks.forEach((tick, i) => {
    b.line(`tick-${i}`, axisX - 3, y(tick.value), axisX, y(tick.value), { color: 'muted', role: 'guide', width: 1 });
    put(b, `tick-label-${i}`, tick.text, axisX - 5 - textW(tick.text) / 2, y(tick.value));
  });
  for (const guide of guides) {
    const { x1, y1, x2, y2 } = guide.segment;
    b.line(guide.id, x1, y1, x2, y2, { color: 'muted', role: 'guide', width: 1, dash: true });
  }
  for (const curve of lowered) b.path(curve.id, curve.d, { color: 'accent', role: 'geometry', width: 1.4, dash: true });
  b.path('profile', profile, { role: 'geometry', width: 1.8 });
  const wanted = new Set(spec.highlight.map((id) => id.toLowerCase()));
  levels.forEach((level, i) => {
    if (!wanted.has(level.id.toLowerCase())) return;
    if (isPeak(i)) b.circle(`mark-${safeId(level.id)}`, spans[i]![0], ys[i]!, 2.6, { color: 'accent', fill: 'ink', role: 'annotation' });
    else b.line(`mark-${safeId(level.id)}`, spans[i]![0], ys[i]!, spans[i]![1], ys[i]!, { color: 'accent', role: 'annotation', width: 2.6 });
  });
  for (const arrow of arrows) {
    const { x1, y1, x2, y2 } = arrow.segment;
    // An arrowhead needs a shaft longer than itself; a shorter difference is drawn as a plain bar.
    const long = Math.abs(y2 - y1) >= (arrow.both ? 16 : 9);
    b.line(arrow.id, x1, y1, x2, y2, { color: 'accent', role: 'dimension', width: 1.2, markerEnd: long, markerStart: long && arrow.both });
  }

  const noRoom = (what: string): never => refuse(`there is no room to label ${what} clear of the curve`, 'refused');
  if (wantDh && dh) {
    const at = placer.place(['ΔH'], [[dhX + 5 + textW('ΔH') / 2, (ys[0]! + ys[n - 1]!) / 2]]) ?? noRoom('ΔH');
    put(b, 'dh-label', 'ΔH', at[0], at[1]);
  }
  // Peaks first: a transition state's label has one place, above it; a plateau's label has several.
  const order = [...peaks, ...levels.flatMap((_, i) => (isPeak(i) ? [] : [i]))];
  for (const i of order) {
    const lines = texts[i]!;
    if (!lines.length) continue;
    const half = Math.max(...lines.map(textW)) / 2;
    const blockH = TEXT_H + (lines.length - 1) * LINE;
    const inside = (cx: number) => Math.min(Math.max(cx, axisX + 4 + half), width - EDGE - half);
    const [from, to] = spans[i]!;
    const above = ys[i]! - 4 - blockH / 2;
    const below = ys[i]! + 4 + blockH / 2;
    const xs = [inside((from + to) / 2), inside(from + half), inside(to - half)];
    const falls = energies[i - 1]! < energies[i]! || energies[i + 1]! < energies[i]!;
    const candidates: Array<[number, number]> = isPeak(i)
      ? [[xs[0]!, above]]
      : (falls ? [above, below] : [below, above]).flatMap((cy) => xs.map((cx): [number, number] => [cx, cy]));
    const at = placer.place(lines, candidates) ?? noRoom(`level ${levels[i]!.id}`);
    putLines(b, `level-label-${i}`, lines, at[0], at[1]);
  }
  // E_a goes last: beside its arrow where the hump leaves room, otherwise under the arrow's foot.
  if (wantEa) {
    const w = textW('E_a');
    const [top, base] = [ys[firstPeak!]!, ys[0]!];
    const beside = [0.5, 0.3, 0.7, 0.15].flatMap((share): Array<[number, number]> => {
      const cy = base + (top - base) * share;
      return [[eaX + 5 + w / 2, cy], [eaX - 5 - w / 2, cy]];
    });
    const under = [0, 10, -10, 20, -20].map((dx): [number, number] => [eaX + dx, base + 4 + TEXT_H / 2]);
    const at = placer.place(['E_a'], [...beside, ...under]) ?? noRoom('E_a');
    put(b, 'ea-label', 'E_a', at[0], at[1]);
  }
  if (rows.length) putRows(b, 'note', rows, width / 2, height - EDGE - footerH + 6);
  return finish(b.scene());
}

export const compileEnergy = guard(compile);
