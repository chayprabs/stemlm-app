/**
 * Values as people write them, for the geometry pack: numbers with units, angles, and expressions in
 * one or two variables. All notation repair is expr-repair's; nothing here guesses a meaning, and a
 * value that cannot be read is null so the figure stays hidden.
 */
import { compileExpr } from '../../pratt';
import { evaluateConstant, repairExpression } from '../../intel/expr-repair';

/** An expression in one variable (`cos 2t`, `1 + cos θ`, `r = 2sin(3θ)`), or null. */
export function compileIn(source: string, variable: string): ((value: number) => number) | null {
  const repaired = repairExpression(source, variable);
  if (repaired === null) return null;
  const fn = compileExpr(repaired);
  return (value) => fn({ [variable]: value });
}

/**
 * An expression in x and y (`x - y`, `2xy`, `y(1−y)`), or null. expr-repair reads one variable, so y
 * rides through it as the constant name `tau`, which it treats as an atom, and is renamed back in the
 * repaired text. An expression that really uses tau is refused rather than misread.
 */
export function compileXY(source: string): ((x: number, y: number) => number) | null {
  if (/tau|τ/i.test(source)) return null;
  const repaired = repairExpression(source.replace(/\\displaystyle|numpy\./g, '').replace(/y/gi, ' tau '), 'x');
  if (repaired === null) return null;
  const fn = compileExpr(repaired.replace(/\btau\b/g, 'y'));
  return (x, y) => fn({ x, y });
}

export interface NamedPair { name: string; x: number; y: number }

/** `A 1 2`, `A(1, 2)`, `A = (1, 2)`, `A = ⟨1, 2⟩`, `(1, 2)`: an optional name and two numbers. */
export function parseNamedPair(raw: string): NamedPair | null {
  const flat = raw.replace(/[()[\]⟨⟩<>]/g, ' ').replace(/[=:]/g, ' ').trim();
  let name = '';
  let xText: string;
  let yText: string | undefined;
  if (flat.includes(',')) {
    const parts = flat.split(',');
    if (parts.length !== 2) return null;
    const head = parts[0]!.trim().split(/\s+/);
    if (head.length > 1) name = head.shift()!;
    xText = head.join(' ');
    yText = parts[1];
  } else {
    const tokens = flat.split(/\s+/);
    if (tokens.length === 3) name = tokens.shift()!;
    [xText = '', yText] = tokens;
    if (tokens.length !== 2) return null;
  }
  const x = evaluateConstant(xText);
  const y = evaluateConstant(yText ?? '');
  return x === null || y === null || name.length > 12 ? null : { name, x, y };
}

export interface Quantity {
  value: number;
  /** The number as written, without its unit. */
  text: string;
  /** Trailing unit as written (`cm`, `m/s`), or '' when the value is bare. */
  unit: string;
}

const UNIT_TAIL = /\s*([A-Za-zµμΩ%][A-Za-z0-9µμΩ%/^·.²³-]*)\s*$/;

/** A number with an optional trailing unit: `3`, `3 cm`, `2.5m`, `5√3 cm`, `10/3`. */
export function parseQuantity(source: string): Quantity | null {
  const text = source.trim();
  const bare = evaluateConstant(text);
  if (bare !== null) return { value: bare, text, unit: '' };
  const tail = UNIT_TAIL.exec(text);
  if (!tail) return null;
  const number = text.slice(0, tail.index).trim();
  const value = evaluateConstant(number);
  return value === null ? null : { value, text: number, unit: tail[1]! };
}

export interface Angle {
  degrees: number;
  /** The unit the source used; a figure labels the angle the way the problem states it. */
  unit: 'deg' | 'rad';
  /** The number as written, without its unit. */
  text: string;
}

/**
 * An angle in degrees unless the text says otherwise: `150`, `150°`, `150 deg`, `5pi/6`, `5π/6`,
 * `2.618 rad`. A bare multiple of π is radians, which is how every textbook writes one.
 */
export function parseAngle(source: string): Angle | null {
  let text = source.trim();
  let unit: Angle['unit'] | null = null;
  const suffix = /\s*(°|º|degrees?|degs?|radians?|rads?)\s*$/i.exec(text);
  if (suffix) {
    unit = /^r/i.test(suffix[1]!) ? 'rad' : 'deg';
    text = text.slice(0, suffix.index).trim();
  }
  const value = evaluateConstant(text);
  if (value === null) return null;
  unit ??= /π|pi/i.test(text) ? 'rad' : 'deg';
  return { degrees: unit === 'rad' ? (value * 180) / Math.PI : value, unit, text };
}
