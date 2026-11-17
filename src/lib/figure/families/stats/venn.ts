/**
 * `venn`: a Venn diagram of two or three sets.
 *
 *   sets: A, B                   2 or 3 set names
 *   only: A=12, B=7, A&B=5       what is written in each region: the sets it lies in, joined by &; `none=3` is outside them all
 *   shade: A & B                 a set expression: & ∩ and, | ∪ or, - (difference), ' or not (complement), parentheses
 *   universe: U                  optional name; the bounding rectangle is drawn when the universe is named or needed
 *
 * The plane inside the circles falls into atomic regions (A only, A&B only, …), each drawn as its own
 * path of circle arcs. The shade expression is evaluated once per atomic region and exactly the regions
 * where it holds are tinted. Four sets cannot be drawn faithfully with circles and are refused.
 */
import { SceneBuilder, frameSize } from '../../scene-build';
import type { SpecDoc } from '../../spec';
import { EDGE, LINE, TEXT_H, finish, guard, plain, put, putLeft, putRight, readAll, readOne, refuse, splitNames, textW, wrapText } from './shared';

interface Circle {
  x: number;
  y: number;
  r: number;
}

const TAU = 2 * Math.PI;
const on = (circle: Circle, angle: number): [number, number] => [circle.x + circle.r * Math.cos(angle), circle.y + circle.r * Math.sin(angle)];

/** The atomic region of a point: one bit per circle that holds it. */
function regionAt(circles: Circle[], x: number, y: number): number {
  return circles.reduce((mask, circle, i) => (Math.hypot(x - circle.x, y - circle.y) < circle.r ? mask | (1 << i) : mask), 0);
}

interface Arc {
  circle: number;
  from: number;
  to: number;
  /** The other circles this arc lies inside. */
  within: number;
}

/** Every circle cut into arcs at its crossings with the others (the circles share one radius). */
function cutArcs(circles: Circle[]): Arc[] {
  return circles.flatMap((circle, i) => {
    const cuts = circles.flatMap((other, j) => {
      if (j === i) return [];
      const toward = Math.atan2(other.y - circle.y, other.x - circle.x);
      const half = Math.acos(Math.hypot(other.x - circle.x, other.y - circle.y) / (2 * circle.r));
      return [toward - half, toward + half];
    }).map((angle) => ((angle % TAU) + TAU) % TAU).sort((a, b) => a - b);
    return cuts.map((from, k) => {
      const to = k + 1 < cuts.length ? cuts[k + 1]! : cuts[0]! + TAU;
      return { circle: i, from, to, within: regionAt(circles, ...on(circle, (from + to) / 2)) & ~(1 << i) };
    });
  });
}

/**
 * The closed outline of one atomic region. An arc of a circle the region lies in is walked forward; an
 * arc it lies outside of is walked backward, so the region is always on the same side and the arcs join
 * end to start.
 */
function outline(circles: Circle[], arcs: Arc[], region: number): string {
  const edges = arcs.flatMap((arc) => {
    const bit = 1 << arc.circle;
    const forward = Boolean(region & bit);
    if (arc.within !== (region & ~bit)) return [];
    const circle = circles[arc.circle]!;
    return [{ start: on(circle, forward ? arc.from : arc.to), end: on(circle, forward ? arc.to : arc.from), r: circle.r, large: arc.to - arc.from > Math.PI ? 1 : 0, sweep: forward ? 1 : 0 }];
  });
  const first = edges[0]!;
  let d = `M ${first.start[0].toFixed(2)} ${first.start[1].toFixed(2)}`;
  let edge = first;
  for (let step = 0; step < edges.length; step++) {
    d += ` A ${edge.r} ${edge.r} 0 ${edge.large} ${edge.sweep} ${edge.end[0].toFixed(2)} ${edge.end[1].toFixed(2)}`;
    const at = edge.end;
    edge = edges.find((next) => Math.hypot(next.start[0] - at[0], next.start[1] - at[1]) < 1e-6) ?? first;
    if (edge === first) break;
  }
  return `${d} Z`;
}

type Membership = (region: number) => boolean;

/**
 * A set expression as a test on atomic regions. Complement binds tightest; a chain may repeat one
 * binary operator (A & B & C, A - B - C) but mixing them needs parentheses, because A ∪ B ∩ C has no
 * agreed reading and the wrong one would shade the wrong region.
 */
function parseShade(source: string, names: string[], universe: string | undefined): Membership {
  const text = plain(source).replace(/[’′]/g, "'");
  const operands = [...names.map((name, i) => ({ name, test: ((region) => Boolean(region & (1 << i))) as Membership })),
    ...(universe && !names.includes(universe) ? [{ name: universe, test: (() => true) as Membership }] : [])]
    .sort((a, b) => b.name.length - a.name.length);
  type Token = { kind: 'set'; test: Membership } | { kind: 'and' | 'or' | 'minus' | 'not' | 'prime' | '(' | ')' };
  const tokens: Token[] = [];
  const words: [RegExp, Token['kind']][] = [
    [/^(?:&&?|∩|and\b|\*|·)/i, 'and'], [/^(?:\|\|?|∪|or\b|\+)/i, 'or'], [/^(?:-|\\|∖)/, 'minus'],
    [/^(?:not\b|~|¬|!)/i, 'not'], [/^(?:'|ᶜ)/, 'prime'], [/^\(/, '('], [/^\)/, ')'],
  ];
  for (let i = 0; i < text.length;) {
    const rest = text.slice(i);
    const space = /^\s+/.exec(rest);
    if (space) {
      i += space[0].length;
      continue;
    }
    const operand = operands.find((entry) => rest.toLowerCase().startsWith(entry.name.toLowerCase()) && !/^[A-Za-z0-9_]/.test(rest.slice(entry.name.length)));
    const word = operand ? undefined : words.find(([pattern]) => pattern.test(rest));
    if (operand) tokens.push({ kind: 'set', test: operand.test });
    else if (word) tokens.push({ kind: word[1] } as Token);
    else refuse(`shade "${text}" has "${rest.split(/\s+/)[0]}", which is not one of the sets (${names.join(', ')}) or an operator`);
    i += operand ? operand.name.length : word![0].exec(rest)![0].length;
  }

  let at = 0;
  const unit = (): Membership => {
    const token = tokens[at++];
    let test: Membership;
    if (token?.kind === 'not') {
      const inner = unit();
      return (region) => !inner(region);
    }
    if (token?.kind === 'set') test = token.test;
    else if (token?.kind === '(') {
      test = chain();
      if (tokens[at++]?.kind !== ')') refuse(`shade "${text}" has an unclosed parenthesis`);
    } else return refuse(`shade "${text}" is not a complete set expression`);
    while (tokens[at]?.kind === 'prime') {
      at += 1;
      const inner = test;
      test = (region) => !inner(region);
    }
    return test;
  };
  const chain = (): Membership => {
    let left = unit();
    let used: Token['kind'] | undefined;
    for (let token = tokens[at]; token && (token.kind === 'and' || token.kind === 'or' || token.kind === 'minus'); token = tokens[at]) {
      if (used && used !== token.kind) refuse(`shade "${text}" mixes operators: add parentheses to say which is done first`);
      used = token.kind;
      at += 1;
      const [a, b] = [left, unit()];
      left = token.kind === 'and' ? (region) => a(region) && b(region) : token.kind === 'or' ? (region) => a(region) || b(region) : (region) => a(region) && !b(region);
    }
    return left;
  };
  const test = chain();
  if (at < tokens.length) refuse(`shade "${text}" is not a complete set expression`);
  return test;
}

/** `only: A=12, A&B=5, none=3` as region -> text. */
function readRegions(spec: SpecDoc, names: string[]): Map<number, string> {
  const regions = new Map<number, string>();
  for (const item of readAll(spec, 'only').flatMap((raw) => plain(raw).split(/\s*[,;]\s*/)).filter(Boolean)) {
    const match = /^(.+?)\s*[=:]\s*(.+)$/.exec(item);
    if (!match) refuse(`only "${item}" needs a region and what to write in it (only: A=12, A&B=5, none=3)`);
    const key = match[1]!.trim();
    let region = 0;
    if (!/^(?:none|neither|outside)$/i.test(key)) {
      for (const part of key.split(/\s*(?:&|∩|\band\b)\s*/i)) {
        const index = names.findIndex((name) => name.toLowerCase() === part.replace(/^only\s+|\s+only$/i, '').toLowerCase());
        if (index < 0) refuse(`only "${item}" names "${part}", which is not one of the sets (${names.join(', ')})`);
        region |= 1 << index;
      }
    }
    if (regions.has(region)) refuse(`only states the region ${key} twice`);
    regions.set(region, match[2]!.trim());
  }
  return regions;
}

export const compileVenn = guard((spec, ctx) => {
  const names = readAll(spec, 'sets').flatMap(splitNames);
  if (names.some((name) => !name)) refuse('sets has an empty name');
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) refuse('sets names the same set twice');
  if (names.length > 3) refuse(`a Venn diagram of ${names.length} sets cannot be drawn faithfully with circles; at most 3 sets are drawn`);
  if (names.length < 2) refuse('a Venn diagram needs 2 or 3 sets (sets: A, B)');
  const universe = readOne(spec, 'universe')?.trim();
  const texts = readRegions(spec, names);
  const shadeRaw = readOne(spec, 'shade');
  const shaded = shadeRaw === undefined ? undefined : parseShade(shadeRaw, names, universe);
  // The complement of the sets has to be somewhere: the rectangle is drawn whenever the outside is used.
  const boxed = universe !== undefined || texts.has(0) || Boolean(shaded?.(0));

  const { w } = frameSize(ctx.profile);
  const three = names.length === 3;
  // As large as the step frame allows; the centres are a little over a radius apart, so every region can hold a number.
  const r = three ? 42 : 50;
  const apart = three ? 44 : 56;
  // Set names sit off the upper-left and upper-right of the top circles, and under the third.
  const reach = (r + 3) * Math.SQRT1_2;
  const titles = names.map((name) => wrapText(name, w / 2 - apart / 2 - reach - EDGE - 8) ?? refuse(`set name "${name}" is too long to print`));
  const lift = Math.max(0, reach + Math.max(titles[0]!.length, titles[1]!.length) * LINE - r);
  const top = EDGE + (boxed ? 5 : 0) + lift;
  const circles: Circle[] = [{ x: w / 2 - apart / 2, y: top + r, r }, { x: w / 2 + apart / 2, y: top + r, r }];
  if (three) circles.push({ x: w / 2, y: top + r + apart * Math.sin(Math.PI / 3), r });
  const floor = Math.max(...circles.map((circle) => circle.y + r));
  // Under the circles: the third set's name, and in the corners of the rectangle the universe's name and the outside's value.
  const under = three ? titles[2]!.length : universe || texts.has(0) ? 1 : 0;
  const stripY = floor + 4 + TEXT_H / 2;
  const b = new SceneBuilder('venn', w, floor + (under ? 4 + under * LINE : 0) + (boxed ? 5 : 0) + EDGE);

  const arcs = cutArcs(circles);
  const widest = Math.max(...titles.slice(0, 2).flat().map((text) => textW(text)));
  const corner = Math.max(universe ? textW(universe) : 0, texts.has(0) ? textW(texts.get(0)!) : 0);
  const middle = three ? Math.max(...titles[2]!.map((text) => textW(text))) / 2 : 4;
  const half = Math.max(apart / 2 + reach + widest, apart / 2 + r, corner ? corner + 8 + middle : 0) + 7;
  if (half > w / 2 - 2) refuse('the names are too long to print beside the circles');
  const box = { x: w / 2 - half, y: 3, w: 2 * half, h: b.height - 6 };

  if (shaded) {
    for (let region = boxed ? 0 : 1; region < 1 << names.length; region++) {
      if (!shaded(region)) continue;
      // The outside is the rectangle with the circles cut out: the cut runs against the rectangle's direction.
      const d = region ? outline(circles, arcs, region) : `M ${box.x} ${box.y} H ${box.x + box.w} V ${box.y + box.h} H ${box.x} Z ${outline(circles, arcs, 0)}`;
      b.path(`region-${region}`, d, { color: 'accent', fill: 'tint', width: 0, role: 'geometry' });
    }
  }
  if (boxed) b.rect('universe', box.x, box.y, box.w, box.h, { width: 1.2, role: 'boundary' });
  circles.forEach((circle, i) => b.circle(`set-${i}`, circle.x, circle.y, r, { width: 1.6, role: 'geometry' }));

  titles.slice(0, 2).forEach((lines, i) => lines.forEach((text, j) => {
    const y = circles[i]!.y - reach - (lines.length - 1 - j) * LINE - TEXT_H / 2;
    if (i === 0) putRight(b, j ? `name-0-${j + 1}` : 'name-0', text, circles[0]!.x - reach, y);
    else putLeft(b, j ? `name-1-${j + 1}` : 'name-1', text, circles[1]!.x + reach, y);
  }));
  if (three) titles[2]!.forEach((text, j) => put(b, j ? `name-2-${j + 1}` : 'name-2', text, w / 2, stripY + j * LINE));
  if (universe) putLeft(b, 'universe-name', universe, box.x + 5, stripY);
  if (texts.has(0)) putRight(b, 'value-0', texts.get(0)!, box.x + box.w - 5, stripY);

  // Each value goes where its region has the most room; a region too small for its text is refused.
  for (const [region, text] of texts) {
    if (!region) continue;
    const halfW = textW(text) / 2 + 1.5;
    const halfH = TEXT_H / 2;
    let best: { x: number; y: number; room: number } | undefined;
    for (let x = circles[0]!.x - r; x <= circles[1]!.x + r; x += 1) {
      for (let y = top; y <= floor; y += 1) {
        const fits = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]].every(([dx, dy]) => regionAt(circles, x + dx! * halfW, y + dy! * halfH) === region);
        if (!fits) continue;
        const room = Math.min(...circles.map((circle) => Math.abs(Math.hypot(x - circle.x, y - circle.y) - r)));
        if (!best || room > best.room + 1e-9) best = { x, y, room };
      }
    }
    const label = names.filter((_, i) => region & (1 << i)).join('&');
    if (!best) refuse(`"${text}" does not fit in the region ${label}`);
    put(b, `value-${region}`, text, best.x, best.y);
  }
  return finish(b.scene());
});
