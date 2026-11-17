/**
 * Sets of real numbers as unions of intervals, and the notations that state them: interval brackets
 * (`[-3, 2)`, `(-inf, 4]`, `]0, 1[`) and inequalities (`-3 <= x < 2`, `x <= -2 or x > 3`, `2x + 1 < 7`),
 * with exact quantities (`1/2`, `sqrt(2)`, `2pi`) at their ends. Read by `numberline`; `dist` reads
 * its numbers with `parseQuantity`.
 */
import { compileExpr } from '../../pratt';
import { fmt, parseNum, plain, refuse } from './shared';

/** A real value together with how to print it. */
export interface Quantity {
  value: number;
  text: string;
}

export interface Bound {
  at: Quantity;
  closed: boolean;
}

export interface Piece {
  lo: Bound;
  hi: Bound;
}

const MINUS = '−';
const INFINITY_WORD = /^([+-]?)\s*(?:inf(?:inity|ty)?|oo|∞)$/i;

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a);
}

function ratio(n: number, d: number): Quantity {
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d) || 1;
  const top = (sign * n) / divisor;
  const bottom = (sign * d) / divisor;
  if (bottom === 1) return { value: top, text: fmt(top) };
  return { value: top / bottom, text: `${top < 0 ? MINUS : ''}${Math.abs(top)}/${bottom}` };
}

/** A solved value printed exactly when it is a small ratio (1/3 rather than 0.3333). */
function rational(value: number): Quantity {
  for (let d = 1; d <= 12; d++) {
    const n = Math.round(value * d);
    if (Math.abs(value - n / d) < 1e-11 * Math.max(1, Math.abs(value))) return ratio(n, d);
  }
  return { value, text: fmt(value, 4) };
}

function toExpression(text: string): string {
  return text
    .replace(/π/g, ' pi ')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*(\d+(?:\.\d+)?|[A-Za-z]+)/g, 'sqrt($1)')
    .replace(/[×·⋅]/g, '*')
    .replace(/÷/g, '/');
}

function pretty(expression: string): string {
  return expression
    .replace(/\s+/g, '')
    .replace(/sqrt\(([A-Za-z0-9.]+)\)/gi, '√$1')
    .replace(/sqrt\(/gi, '√(')
    .replace(/\bpi\b|(?<=\d)pi\b/gi, 'π')
    .replace(/\*\*/g, '^')
    .replace(/(\d)\*(?=[π√(])/g, '$1')
    .replace(/\*/g, '·')
    .replace(/-/g, MINUS);
}

/**
 * A finite or infinite quantity: a number, a ratio of integers, or a constant expression in the figure
 * expression grammar (`sqrt(2)`, `3pi/4`, `e^2`). Null when the text is not one value.
 */
export function parseQuantity(raw: string): Quantity | null {
  const text = plain(raw);
  if (!text) return null;
  const infinite = INFINITY_WORD.exec(text);
  if (infinite) return { value: infinite[1] === '-' ? -Infinity : Infinity, text: infinite[1] === '-' ? `${MINUS}∞` : '∞' };
  const number = parseNum(text);
  if (number !== null) return { value: number, text: fmt(number) };
  const fraction = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(text);
  if (fraction) return Number(fraction[2]) === 0 ? null : ratio(Number(fraction[1]), Number(fraction[2]));
  // The expression grammar ignores spaces, so "3 4" would read as 34: two numbers are never one value.
  if (/[\d.]\s+[\d.]/.test(text)) return null;
  const expression = toExpression(text);
  try {
    const value = compileExpr(expression)({});
    return Number.isFinite(value) ? { value, text: pretty(expression) } : null;
  } catch {
    return null;
  }
}

function isEmpty(piece: Piece): boolean {
  const lo = piece.lo.at.value;
  const hi = piece.hi.at.value;
  return lo > hi || (lo === hi && !(piece.lo.closed && piece.hi.closed));
}

/** Sorted, disjoint, non-empty pieces; pieces that overlap or share a covered endpoint are merged. */
function normalize(pieces: Piece[]): Piece[] {
  const sorted = pieces.filter((piece) => !isEmpty(piece))
    .sort((a, b) => a.lo.at.value - b.lo.at.value || Number(b.lo.closed) - Number(a.lo.closed));
  const merged: Piece[] = [];
  for (const piece of sorted) {
    const last = merged[merged.length - 1];
    const touches = last && (piece.lo.at.value < last.hi.at.value
      || (piece.lo.at.value === last.hi.at.value && (piece.lo.closed || last.hi.closed)));
    if (!last || !touches) {
      merged.push({ lo: piece.lo, hi: piece.hi });
    } else if (piece.hi.at.value > last.hi.at.value || (piece.hi.at.value === last.hi.at.value && piece.hi.closed)) {
      last.hi = piece.hi;
    }
  }
  return merged;
}

function intersect(a: Piece[], b: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const p of a) {
    for (const q of b) {
      const lo = p.lo.at.value > q.lo.at.value || (p.lo.at.value === q.lo.at.value && !p.lo.closed) ? p.lo : q.lo;
      const hi = p.hi.at.value < q.hi.at.value || (p.hi.at.value === q.hi.at.value && !p.hi.closed) ? p.hi : q.hi;
      out.push({ lo, hi });
    }
  }
  return normalize(out);
}

const NEGATIVE_INFINITY: Quantity = { value: -Infinity, text: `${MINUS}∞` };
const POSITIVE_INFINITY: Quantity = { value: Infinity, text: '∞' };
const ALL: Piece[] = [{ lo: { at: NEGATIVE_INFINITY, closed: false }, hi: { at: POSITIVE_INFINITY, closed: false } }];

function ray(direction: 'below' | 'above', at: Quantity, closed: boolean): Piece {
  return direction === 'below'
    ? { lo: { at: NEGATIVE_INFINITY, closed: false }, hi: { at, closed } }
    : { lo: { at, closed }, hi: { at: POSITIVE_INFINITY, closed: false } };
}

/** An end at infinity is never closed, whatever bracket was written beside it. */
function segment(lo: Quantity, loClosed: boolean, hi: Quantity, hiClosed: boolean): Piece {
  return { lo: { at: lo, closed: loClosed && Number.isFinite(lo.value) }, hi: { at: hi, closed: hiClosed && Number.isFinite(hi.value) } };
}

/**
 * Interval notation, possibly a union: `[-3, 2)`, `(-inf, 4] U (6, inf)`, `]0, 1[`.
 * Brackets decide which ends belong; an interval written without them is refused, not guessed.
 */
export function parseIntervals(raw: string): Piece[] {
  const pieces = plain(raw).split(/\s*(?:∪|\bor\b|\s[Uu]\s)\s*/).map((part) => {
    const source = part.trim();
    const match = /^([[(\]])\s*(.+?)\s*[,;]\s*(.+?)\s*([\])[])$/.exec(source);
    if (!match) refuse(`interval "${source}" needs brackets, e.g. [-3, 2) or (-inf, 4]`);
    const lo = parseQuantity(match[2]!);
    const hi = parseQuantity(match[3]!);
    if (!lo || !hi) refuse(`interval "${source}" has an end that is not a number`);
    if (lo.value > hi.value) refuse(`interval "${source}" has its ends in the wrong order`);
    const piece = segment(lo, match[1] === '[', hi, match[4] === ']');
    if (isEmpty(piece)) refuse(`interval "${source}" is empty`);
    return piece;
  });
  return normalize(pieces);
}

type Relation = '<' | '<=' | '>' | '>=' | '=' | '!=';

const FLIP: Record<Relation, Relation> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '=': '=', '!=': '!=' };
/** Names the expression grammar already gives a meaning; any other word in an inequality is its variable. */
const KNOWN_WORDS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'ln', 'log10', 'log2',
  'sqrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'sign', 'pi', 'e', 'tau', 'inf', 'infinity', 'oo', 'or', 'and',
]);

function solved(relation: Relation, at: Quantity): Piece[] {
  switch (relation) {
    case '<': return [ray('below', at, false)];
    case '<=': return [ray('below', at, true)];
    case '>': return [ray('above', at, false)];
    case '>=': return [ray('above', at, true)];
    case '=': return [segment(at, true, at, true)];
    default: return [ray('below', at, false), ray('above', at, false)];
  }
}

function holds(relation: Relation, left: number, right: number): boolean {
  switch (relation) {
    case '<': return left < right;
    case '<=': return left <= right;
    case '>': return left > right;
    case '>=': return left >= right;
    case '=': return left === right;
    default: return left !== right;
  }
}

/** `a x + b` when `source` is linear in the variable; null otherwise (including a source that does not parse). */
function linear(source: string, variable: string): { a: number; b: number } | null {
  try {
    const compiled = compileExpr(toExpression(source).replace(/\binf(?:inity)?\b|\boo\b/gi, '(1/0)'));
    const evaluate = (x: number) => compiled({ [variable.toLowerCase()]: x });
    const b = evaluate(0);
    const a = evaluate(1) - b;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return b === Infinity || b === -Infinity ? { a: 0, b } : null;
    const tolerance = 1e-9 * (1 + Math.abs(a) + Math.abs(b));
    const straight = [2, -1.5, 7.25].every((x) => Math.abs(evaluate(x) - (a * x + b)) <= tolerance * (1 + Math.abs(x)));
    return straight ? { a: Math.abs(a) < 1e-14 * (1 + Math.abs(b)) ? 0 : a, b } : null;
  } catch {
    return null;
  }
}

function compare(left: string, relation: Relation, right: string, variable: string, whole: string): Piece[] {
  const isVariable = (side: string) => side.trim().toLowerCase() === variable.toLowerCase();
  // The variable against a number keeps the number as written (1/2, √2).
  if (isVariable(right) && !isVariable(left)) return compare(right, FLIP[relation], left, variable, whole);
  const written = isVariable(left) ? parseQuantity(right) : null;
  if (written) return Number.isFinite(written.value) ? solved(relation, written) : holds(relation, 0, written.value) ? ALL : [];
  const l = linear(left, variable);
  const r = linear(right, variable);
  if (!l || !r) refuse(`"${whole}" cannot be solved here: only linear inequalities in one variable`);
  const a = l.a - r.a;
  const b = l.b - r.b;
  if (a === 0 || !Number.isFinite(b)) return holds(relation, l.b, r.b) ? ALL : [];
  return solved(a > 0 ? relation : FLIP[relation], rational(-b / a));
}

/**
 * The solution set of an inequality statement in one variable. `and` binds tighter than `or`; a chain
 * (`-3 <= x < 2`) is the conjunction of its comparisons.
 */
export function parseInequality(raw: string): Piece[] {
  const whole = plain(raw);
  const text = whole
    .replace(/∞/g, 'inf')
    .replace(/\|\|/g, ' or ')
    .replace(/&&/g, ' and ')
    .replace(/≤|⩽|<=|=</g, '≤')
    .replace(/≥|⩾|>=|=>/g, '≥')
    .replace(/≠|!=|<>/g, '≠');
  const words = (toExpression(text).match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).filter((word) => !KNOWN_WORDS.has(word.toLowerCase()));
  const names = [...new Map(words.map((word) => [word.toLowerCase(), word])).values()];
  if (names.length !== 1) refuse(names.length ? `"${whole}" has more than one variable (${names.join(', ')})` : `"${whole}" names no variable`);
  const relationOf: Record<string, Relation> = { '<': '<', '>': '>', '=': '=', '≤': '<=', '≥': '>=', '≠': '!=' };
  let set: Piece[] = [];
  for (const disjunct of text.split(/\s+or\s+|∪/i)) {
    let all = ALL;
    for (const chain of disjunct.split(/\s+and\s+|∩|&/i)) {
      const parts = chain.split(/([<>=≤≥≠])/).map((part) => part.trim());
      if (parts.length < 3 || parts.length > 5 || parts.some((part) => !part)) {
        refuse(`"${chain.trim() || whole}" is not an inequality (expected e.g. x > 1 or -3 <= x < 2)`);
      }
      for (let i = 1; i < parts.length; i += 2) {
        all = intersect(all, normalize(compare(parts[i - 1]!, relationOf[parts[i]!]!, parts[i + 1]!, names[0]!, whole)));
      }
    }
    set = normalize([...set, ...all]);
  }
  return set;
}
