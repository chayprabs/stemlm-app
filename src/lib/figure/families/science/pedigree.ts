/**
 * Pedigree chart with the standard symbols.
 *
 *   person: I-1 male affected       `<id> male|female|unknown [affected|carrier|unaffected] [deceased]`
 *   couple: I-1 I-2                 a mating line; implied by a child line
 *   child:  I-1 I-2 II-1 II-2       `<parentA> <parentB> <child ids…>`, children left to right
 *
 * Square, circle and diamond; filled = affected, half-filled = carrier, slash = deceased. Generations are
 * computed from parentage (partners share one) and numbered I, II, III down the left.
 *
 * The layout is a tidy tree, so it never crosses lines, and it draws what a tree can hold: one partner per
 * person, and a partner who marries in either has no parents in the chart or is a child of a second
 * founding couple (the two families then stand side by side). Anything else is refused, with the reason.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { EDGE, LINE, TEXT_H, canvasHeight, finish, guard, plain, put, putLeft, readAll, refuse, safeId, textW } from './shared';

export const PEDIGREE_MAX_PEOPLE = 40;
export const PEDIGREE_MAX_GENERATIONS = 6;

type Sex = 'male' | 'female' | 'unknown';
type Status = 'affected' | 'carrier' | 'unaffected';

interface Person {
  id: string;
  sex: Sex;
  status: Status;
  deceased: boolean;
  parents: Couple | null;
  couple: Couple | null;
  generation: number;
  /** Centre, in slots. */
  x: number;
}

interface Couple {
  a: Person;
  b: Person;
  children: Person[];
}

const WORDS: Array<[RegExp, Partial<Pick<Person, 'sex' | 'status' | 'deceased'>>]> = [
  [/^(?:m|male|man|boy|♂|square)$/, { sex: 'male' }],
  [/^(?:f|female|woman|girl|♀|circle)$/, { sex: 'female' }],
  [/^(?:u|unknown|\?|diamond|unspecified)$/, { sex: 'unknown' }],
  [/^(?:affected|filled|shaded)$/, { status: 'affected' }],
  [/^(?:carrier|heterozygous|het)$/, { status: 'carrier' }],
  [/^(?:unaffected|normal|healthy|clear)$/, { status: 'unaffected' }],
  [/^(?:deceased|dead|died)$/, { deceased: true }],
];

/** Words and marks written between ids. Lower case only: `X` is a fair id, `x` between two ids is a cross. */
const SEPARATOR = /^(?:x|×|&|\+|and|with|to|-+>?|—|→|=+|:)$/;
const idsOf = (raw: string) => plain(raw).split(/[\s,;]+/).map((token) => token.replace(/[:,]$/, '')).filter((token) => token && !SEPARATOR.test(token));

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const SYMBOL = 16;
const HALF = SYMBOL / 2;
const BLOCK_GAP = 0.6;
/** From the bottom of one row's labels to the top of the next row's symbols: the descent lines. */
const DESCENT = 16;
/** A symbol with its id under it. */
const PERSON_H = SYMBOL + 3 + TEXT_H;
const ROW = PERSON_H + DESCENT;

function parse(spec: SpecDoc): Person[] {
  const people = new Map<string, Person>();
  for (const raw of readAll(spec, 'person')) {
    const [id, ...words] = idsOf(raw);
    if (!id) refuse('person needs an id: person: <id> male|female|unknown [affected|carrier] [deceased]');
    if (people.has(id.toLowerCase())) refuse(`person ${id} is declared twice`);
    const person: Person = { id, sex: 'unknown', status: 'unaffected', deceased: false, parents: null, couple: null, generation: 0, x: 0 };
    let sexed = false;
    for (const word of words) {
      const meaning = WORDS.find(([pattern]) => pattern.test(word.toLowerCase().replace(/^[a-z]+=/, '')));
      if (!meaning) refuse(`person ${id}: "${word}" is not a sex (male, female, unknown) or a status (affected, carrier, unaffected, deceased)`);
      sexed ||= meaning[1].sex !== undefined;
      Object.assign(person, meaning[1]);
    }
    if (!sexed) refuse(`person ${id} needs a sex: male, female or unknown`);
    people.set(id.toLowerCase(), person);
  }
  const known = (id: string, line: string): Person => people.get(id.toLowerCase()) ?? refuse(`${line} names ${id}, which no person line declares`);
  const pair = (a: Person, b: Person): Couple => {
    if (a === b) refuse(`${a.id} cannot be a couple with themselves`);
    for (const [one, other] of [[a, b], [b, a]] as const) {
      const partner = one.couple && (one.couple.a === one ? one.couple.b : one.couple.a);
      if (partner && partner !== other) refuse(`${one.id} has two partners (${partner.id} and ${other.id}); this chart draws one partner per person`, 'refused');
    }
    const couple = a.couple ?? { a, b, children: [] };
    a.couple = couple;
    b.couple = couple;
    return couple;
  };
  for (const raw of readAll(spec, 'couple')) {
    const ids = idsOf(raw);
    if (ids.length !== 2) refuse(`couple "${raw.trim()}" needs exactly two ids`);
    pair(known(ids[0]!, 'couple'), known(ids[1]!, 'couple'));
  }
  for (const raw of readAll(spec, 'child')) {
    const ids = idsOf(raw);
    if (ids.length < 3) refuse(`child "${raw.trim()}" needs two parents and at least one child: child: <parentA> <parentB> <child ids…>`);
    const couple = pair(known(ids[0]!, 'child'), known(ids[1]!, 'child'));
    for (const id of ids.slice(2)) {
      const child = known(id, 'child');
      if (child === couple.a || child === couple.b) refuse(`${child.id} is listed as their own child`);
      if (child.parents && child.parents !== couple) refuse(`${child.id} has more than two parents`);
      if (!child.parents) couple.children.push(child);
      child.parents = couple;
    }
  }
  return [...people.values()];
}

/** Partners share a generation and a child stands one below its parents; a chart that cannot satisfy both is refused. */
function assignGenerations(people: Person[]): number {
  for (const person of people) {
    const seen = new Set<Person>();
    const climb = (at: Person) => {
      for (const parent of at.parents ? [at.parents.a, at.parents.b] : []) {
        if (parent === person) refuse(`${person.id} is their own ancestor`);
        if (!seen.has(parent)) {
          seen.add(parent);
          climb(parent);
        }
      }
    };
    climb(person);
  }
  const level = new Map<Person, number>();
  for (const start of people) {
    if (level.has(start)) continue;
    const family = [start];
    level.set(start, 0);
    for (let i = 0; i < family.length; i++) {
      const at = family[i]!;
      const links: Array<[Person, number]> = [
        ...(at.couple ? [[at.couple.a === at ? at.couple.b : at.couple.a, 0] as [Person, number]] : []),
        ...(at.couple?.children.map((child): [Person, number] => [child, 1]) ?? []),
        ...(at.parents ? [[at.parents.a, -1], [at.parents.b, -1]] as Array<[Person, number]> : []),
      ];
      for (const [other, step] of links) {
        const expected = level.get(at)! + step;
        if (!level.has(other)) {
          level.set(other, expected);
          family.push(other);
        } else if (level.get(other) !== expected) {
          refuse(`${at.id} and ${other.id} cannot be placed: partners must belong to the same generation, and this chart puts them in different ones`, 'refused');
        }
      }
    }
    const top = Math.min(...family.map((person) => level.get(person)!));
    for (const person of family) person.generation = level.get(person)! - top;
  }
  return Math.max(...people.map((person) => person.generation)) + 1;
}

/** Slots a person's branch needs: the person, a partner, and everything below them. */
function branchWidth(person: Person): number {
  const below = (person.couple?.children ?? []).reduce((sum, child) => sum + branchWidth(child), 0);
  return Math.max(person.couple ? 2 : 1, below);
}

/** Tidy tree: a couple is centred over the block of its children's branches. */
function place(person: Person, left: number, placed: Person[]): void {
  const width = branchWidth(person);
  const pair = person.couple ? [person.couple.a, person.couple.b] : [person];
  pair.forEach((mate, i) => {
    mate.x = left + width / 2 + i - (pair.length - 1) / 2;
    placed.push(mate);
  });
  placeRow(person.couple?.children ?? [], left + (width - (person.couple?.children ?? []).reduce((sum, child) => sum + branchWidth(child), 0)) / 2, placed);
}

function placeRow(children: Person[], left: number, placed: Person[]): number {
  let at = left;
  for (const child of children) {
    place(child, at, placed);
    at += branchWidth(child);
  }
  return at;
}

/**
 * Two founding families joined by a marriage between their children: the marrying child stands last among
 * the left family's children and first among the right family's, with the new couple between the two.
 */
function placeJoined(left: Couple, right: Couple, placed: Person[]): void {
  const joint = left.children.find((child) => child.couple && right.children.includes(child.couple.a === child ? child.couple.b : child.couple.a))!;
  const mate = joint.couple!.a === joint ? joint.couple!.b : joint.couple!.a;
  const start = placeRow(left.children.filter((child) => child !== joint), 0, placed);
  const below = joint.couple!.children;
  const width = Math.max(2, below.reduce((sum, child) => sum + branchWidth(child), 0));
  joint.x = start + width / 2 - 0.5;
  mate.x = start + width / 2 + 0.5;
  placeRow(below, start + (width - below.reduce((sum, child) => sum + branchWidth(child), 0)) / 2, placed);
  const end = placeRow(right.children.filter((child) => child !== mate), start + width, placed);
  // Each founding couple over its own children, and clear of the other couple.
  const centreLeft = Math.min((joint.x + 0.5) / 2, joint.x - 0.75);
  const centreRight = Math.max((mate.x - 0.5 + end) / 2, mate.x + 0.75);
  [left.a.x, left.b.x, right.a.x, right.b.x] = [centreLeft - 0.5, centreLeft + 0.5, centreRight - 0.5, centreRight + 0.5];
  placed.push(joint, mate, left.a, left.b, right.a, right.b);
}

function layout(people: Person[]): number {
  const founding = (couple: Couple) => !couple.a.parents && !couple.b.parents;
  const joins = new Map<Couple, Couple>();
  for (const person of people) {
    const couple = person.couple;
    if (!couple || couple.a !== person || !couple.a.parents || !couple.b.parents) continue;
    const [one, other] = [couple.a.parents, couple.b.parents];
    if (one === other) refuse(`${couple.a.id} and ${couple.b.id} have the same parents; a couple of siblings is not drawn`, 'refused');
    if (!founding(one) || !founding(other)) {
      refuse(`${couple.a.id} and ${couple.b.id} both descend from couples in the chart; such a couple is drawn only between children of two founding couples`, 'refused');
    }
    if (joins.has(one) || joins.has(other)) {
      refuse(`${couple.a.id} and ${couple.b.id} would join a family that is already joined to another by marriage; one such join per family is drawn`, 'refused');
    }
    joins.set(one, other);
    joins.set(other, one);
  }
  let cursor = 0;
  const done = new Set<Couple>();
  for (const person of people) {
    if (person.parents || (person.couple && (!founding(person.couple) || done.has(person.couple)))) continue;
    const placed: Person[] = [];
    const partner = person.couple && joins.get(person.couple);
    if (person.couple && partner) {
      placeJoined(person.couple, partner, placed);
      done.add(partner);
    } else {
      place(person, 0, placed);
    }
    if (person.couple) done.add(person.couple);
    const xs = placed.map((entry) => entry.x);
    const shift = cursor - (Math.min(...xs) - 0.5);
    for (const entry of new Set(placed)) entry.x += shift;
    cursor += Math.max(...xs) - Math.min(...xs) + 1 + BLOCK_GAP;
  }
  return cursor - BLOCK_GAP;
}

function drawSymbol(b: SceneBuilder, id: string, person: { sex: Sex; status: Status; deceased: boolean }, cx: number, cy: number, r: number): void {
  const fill = person.status === 'affected' ? 'ink' : 'paper';
  const style = { fill, role: 'geometry', width: 1.4 } as const;
  if (person.sex === 'male') b.rect(id, cx - r, cy - r, 2 * r, 2 * r, style);
  else if (person.sex === 'female') b.circle(id, cx, cy, r, style);
  else b.polygon(id, [cx, cy - r - 1, cx + r + 1, cy, cx, cy + r + 1, cx - r - 1, cy], style);
  if (person.status === 'carrier') {
    // The right half of the same outline, filled.
    const half = person.sex === 'male'
      ? `M ${cx} ${cy - r} H ${cx + r} V ${cy + r} H ${cx} Z`
      : person.sex === 'female'
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`
        : `M ${cx} ${cy - r - 1} L ${cx + r + 1} ${cy} L ${cx} ${cy + r + 1} Z`;
    b.path(`${id}-half`, half, { fill: 'ink', role: 'geometry', width: 1.4 });
  }
  if (person.deceased) b.line(`${id}-slash`, cx - r - 2.5, cy + r + 2.5, cx + r + 2.5, cy - r - 2.5, { role: 'geometry', width: 1.4 });
}

function compile(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const people = parse(spec);
  if (!people.length) refuse('pedigree needs person lines: person: <id> male|female|unknown [affected|carrier] [deceased]');
  if (people.length > PEDIGREE_MAX_PEOPLE) refuse(`pedigree draws at most ${PEDIGREE_MAX_PEOPLE} people legibly; this one has ${people.length}`, 'refused');
  const generations = assignGenerations(people);
  if (generations > PEDIGREE_MAX_GENERATIONS) refuse(`pedigree draws at most ${PEDIGREE_MAX_GENERATIONS} generations; this one has ${generations}`, 'refused');
  const slots = layout(people);

  const nominal = frameSize(ctx.profile);
  const gutter = EDGE + textW(ROMAN[generations - 1]!) + 8;
  const narrowest = Math.max(24, ...people.map((person) => textW(person.id) + 9));
  if (narrowest > 60) refuse('a person id is too long to print under its symbol', 'refused');
  const slot = Math.max(narrowest, Math.min(34, (nominal.w - gutter - EDGE) / slots));
  const needed = gutter + slots * slot + EDGE;
  if (needed > nominal.w * 1.5) refuse('the pedigree is too wide to draw legibly; it has too many people in one generation', 'refused');
  const width = Math.max(nominal.w, needed);

  const used = (['affected', 'carrier'] as const).filter((status) => people.some((person) => person.status === status));
  const key: Array<{ text: string; person: { sex: Sex; status: Status; deceased: boolean } }> = [
    ...used.map((status) => ({ text: status, person: { sex: 'male' as const, status, deceased: false } })),
    ...(people.some((person) => person.deceased) ? [{ text: 'deceased', person: { sex: 'male' as const, status: 'unaffected' as const, deceased: true } }] : []),
  ];
  const keyH = key.length ? 5 + LINE : 0;
  const rowsH = generations * PERSON_H + (generations - 1) * DESCENT;
  const contentH = rowsH + keyH + 2 * EDGE + 2;
  const height = contentH <= nominal.h ? Math.max(72, Math.ceil(contentH)) : canvasHeight(contentH, nominal.h);
  // A taller canvas gives the extra room to the descent lines.
  const pitch = ROW + (generations > 1 ? Math.min(14, (height - contentH) / (generations - 1)) : 0);
  const drawnH = rowsH + (generations - 1) * (pitch - ROW) + keyH;
  const top = (height - drawnH) / 2;
  const left = (width - needed) / 2 + gutter;
  const X = (person: Person) => left + person.x * slot;
  const Y = (generation: number) => top + generation * pitch + HALF;

  const b = new SceneBuilder('pedigree', width, height);
  const couples = [...new Set(people.flatMap((person) => (person.couple ? [person.couple] : [])))];
  couples.forEach((couple, i) => {
    const [first, second] = X(couple.a) < X(couple.b) ? [couple.a, couple.b] : [couple.b, couple.a];
    const y = Y(first.generation);
    b.line(`couple-${i}`, X(first) + HALF, y, X(second) - HALF, y, { role: 'connector', width: 1.4 });
    if (!couple.children.length) return;
    const mid = (X(first) + X(second)) / 2;
    const xs = couple.children.map(X);
    const childTop = Y(first.generation + 1) - HALF - 1;
    const bar = childTop - 6;
    b.line(`descent-${i}`, mid, y, mid, bar, { role: 'connector', width: 1.2 });
    if (Math.max(mid, ...xs) - Math.min(mid, ...xs) > 0.01) b.line(`sibship-${i}`, Math.min(mid, ...xs), bar, Math.max(mid, ...xs), bar, { role: 'connector', width: 1.2 });
    couple.children.forEach((child, k) => b.line(`descent-${i}-${k}`, X(child), bar, X(child), childTop, { role: 'connector', width: 1.2 }));
  });
  for (const person of people) {
    const [cx, cy] = [X(person), Y(person.generation)];
    drawSymbol(b, safeId(person.id), person, cx, cy, HALF);
    put(b, `label-${safeId(person.id)}`, person.id, cx, cy + HALF + 3 + TEXT_H / 2);
  }
  for (let generation = 0; generation < generations; generation++) putLeft(b, `generation-${generation + 1}`, ROMAN[generation]!, left - gutter + EDGE, Y(generation));
  if (key.length) {
    const widths = key.map((entry) => 12 + 5 + textW(entry.text));
    let x = (width - widths.reduce((sum, w) => sum + w, 0) - 16 * (key.length - 1)) / 2;
    const y = top + drawnH - TEXT_H / 2;
    key.forEach((entry, i) => {
      drawSymbol(b, `key-${entry.text}`, entry.person, x + 6, y, 5);
      putLeft(b, `key-label-${i}`, entry.text, x + 17, y);
      x += widths[i]! + 16;
    });
  }
  b.hl(spec.highlight);
  return finish(b.scene());
}

export const compilePedigree = guard(compile);
