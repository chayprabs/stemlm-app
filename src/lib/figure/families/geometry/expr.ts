/**
 * Liberal front end for the Pratt evaluator. Models write maths the way people do (`2xy`, `sin 2θ`,
 * `x(y−1)`, `\frac{1}{2}`, `√3`, `|x|`, `sin^2(t)`); this module rewrites that into the strict grammar
 * `compileExpr` accepts. It never guesses a meaning: a name it cannot resolve is left in place so the
 * evaluator reports it and the figure stays hidden.
 */
import { ExprError, compileExpr } from '../../pratt';

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'ln', 'log10', 'log2',
  'sqrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'sign',
]);
const CONSTANTS = new Set(['pi', 'e', 'tau']);
const FUNCTION_ALIASES: Record<string, string> = { arcsin: 'asin', arccos: 'acos', arctan: 'atan' };
/** Functions the evaluator lacks, written as the reciprocal of one it has. */
const RECIPROCALS: Record<string, string> = { sec: 'cos', csc: 'sin', cosec: 'sin', cot: 'tan' };
const INVERSES: Record<string, string> = { sin: 'asin', cos: 'acos', tan: 'atan' };

const isCallable = (name: string) => FUNCTIONS.has(name) || name in FUNCTION_ALIASES || name in RECIPROCALS;

/** Index just past the bracket that closes the one at `open`, or -1 when it never closes. */
function closing(src: string, open: number, left: string, right: string): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === left) depth++;
    else if (src[i] === right && --depth === 0) return i + 1;
  }
  return -1;
}

function latexToPlain(source: string): string {
  let s = source.replace(/\$/g, '').replace(/\\(?:left|right|displaystyle)\b/g, '');
  // \frac{a}{b} → ((a)/(b)); the loop also unwinds nested fractions, innermost last.
  for (let guard = 0; guard < 24; guard++) {
    const at = s.search(/\\[dt]?frac\s*\{/);
    if (at < 0) break;
    const open = s.indexOf('{', at);
    const mid = closing(s, open, '{', '}');
    const next = mid < 0 ? -1 : s.slice(mid).search(/\S/);
    const end = next < 0 || s[mid + next] !== '{' ? -1 : closing(s, mid + next, '{', '}');
    if (end < 0) break;
    s = `${s.slice(0, at)}((${s.slice(open + 1, mid - 1)})/(${s.slice(mid + next + 1, end - 1)}))${s.slice(end)}`;
  }
  return s
    .replace(/\\sqrt\s*\{/g, 'sqrt{')
    .replace(/\\(?:cdot|times)\b/g, '*')
    .replace(/\\div\b/g, '/')
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
}

function unicodeToPlain(source: string): string {
  return source
    .replace(/[−–—‒]/g, '-')
    .replace(/[×·⋅∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, ' pi ')
    .replace(/[θϑ]/g, ' theta ')
    .replace(/[φϕ]/g, ' phi ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/½/g, '(1/2)')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*(\d+(?:\.\d+)?|[A-Za-z]+)/g, 'sqrt($1)');
}

/** `|u|` → `abs(u)` for bars that pair up left to right; an odd count is left for the evaluator to reject. */
function barsToAbs(source: string): string {
  const count = (source.match(/\|/g) ?? []).length;
  if (!count || count % 2) return source;
  let open = false;
  return source.replace(/\|/g, () => {
    open = !open;
    return open ? 'abs(' : ')';
  });
}

/** Split a run of letters into known names (`xy` → x, y; `xcos` → x, cos), a callable allowed only last. */
function segment(word: string, names: readonly string[], callLast: boolean): string[] | null {
  if (!word) return [];
  for (const name of names) {
    if (!word.startsWith(name)) continue;
    const last = name.length === word.length;
    if (isCallable(name) && !(last && callLast)) continue;
    const rest = segment(word.slice(name.length), names, callLast);
    if (rest) return [name, ...rest];
  }
  return null;
}

/**
 * Resolve every run of letters against the known names and make each product explicit. Function
 * application without brackets takes one term (`sin 2x` → `sin(2*x)`), and `sin^2(x)` is `(sin(x))^2`.
 */
function resolveNames(source: string, variables: ReadonlySet<string>, depth = 0): string {
  if (depth > 12) return source;
  const names = [...variables, ...CONSTANTS, ...FUNCTIONS, ...Object.keys(FUNCTION_ALIASES), ...Object.keys(RECIPROCALS)]
    .sort((a, b) => b.length - a.length);
  const again = (inner: string) => resolveNames(inner, variables, depth + 1);
  let out = '';
  let i = 0;
  const glue = () => {
    // A product the evaluator cannot see once it strips the spaces: `x y`, `x2`, `x(…)`.
    if (/[A-Za-z0-9_(]/.test(source.slice(i).trimStart()[0] ?? '')) out += '*';
  };
  while (i < source.length) {
    const ch = source[i]!;
    if (/[0-9.]/.test(ch)) {
      const number = /^(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i))?.[0] ?? ch;
      out += number;
      i += number.length;
      continue;
    }
    if (!/[A-Za-z_]/.test(ch)) {
      out += ch;
      i++;
      continue;
    }
    let word = /^[A-Za-z_]+/.exec(source.slice(i))![0].toLowerCase();
    i += word.length;
    const after = source.slice(i).trimStart()[0] ?? '';
    let parts = segment(word, names, after !== '');
    if (!parts) {
      // `sinx`, `cost`: a function run straight into its one-name argument.
      const fn = names.find((name) => isCallable(name) && word.startsWith(name) && segment(word.slice(name.length), names, false));
      if (fn) {
        i -= word.length - fn.length;
        word = fn;
        parts = [fn];
      }
    }
    parts ??= [word];
    const last = parts.at(-1)!;
    if (!isCallable(last)) {
      out += parts.join('*');
      glue();
      continue;
    }
    out += parts.slice(0, -1).map((part) => `${part}*`).join('');
    i += source.length - i - source.slice(i).trimStart().length;
    let power = '';
    const exponent = /^\^\s*(\(\s*-?\s*\d+\s*\)|-?\d+)\s*/.exec(source.slice(i));
    if (exponent) {
      power = exponent[1]!.replace(/[()\s]/g, '');
      i += exponent[0].length;
    }
    let argument: string;
    if (source[i] === '(') {
      const end = closing(source, i, '(', ')');
      if (end < 0) return `${out}${last}${source.slice(i)}`;
      argument = again(source.slice(i + 1, end - 1));
      i = end;
    } else {
      // One bare term: an optional coefficient, one name, and its own power (`sin 2x`, `cos x^2`).
      const term = /^(?:\d+(?:\.\d+)?\s*)?[A-Za-z]*(?:\s*\^\s*\d+)?/.exec(source.slice(i))?.[0] ?? '';
      if (!term.trim()) return `${out}${last}${source.slice(i)}`;
      argument = again(term);
      i += term.length;
    }
    const inverse = power === '-1' ? INVERSES[last] : undefined;
    // f^-1 is the inverse function, never a reciprocal; without one to call, the name stays unresolved.
    if (power === '-1' && !inverse) return `${out}${last}_inverse(${argument})${source.slice(i)}`;
    const fn = inverse ?? FUNCTION_ALIASES[last] ?? last;
    const call = fn in RECIPROCALS ? `(1/${RECIPROCALS[fn]}(${argument}))` : `${fn}(${argument})`;
    out += power && !inverse ? `(${call})^(${power})` : call;
  }
  return out;
}

/** Rewrite human maths into the evaluator's grammar. `variables` are the names the expression may use. */
export function normalizeExpr(source: string, variables: readonly string[] = []): string {
  const plain = barsToAbs(unicodeToPlain(latexToPlain(source))).replace(/\*\*/g, '^');
  return resolveNames(plain, new Set(variables.map((name) => name.toLowerCase()))).replace(/\s+/g, ' ').trim();
}

export type Formula = (values: Record<string, number>) => number;
export type FormulaResult = { ok: true; fn: Formula } | { ok: false; reason: string };

/**
 * Compile an expression in the given variables. Unknown names are reported here, once, rather than
 * surfacing as an exception at some later sample point.
 */
export function compileFormula(source: string, variables: readonly string[]): FormulaResult {
  const text = source.trim();
  if (!text) return { ok: false, reason: 'expression is empty' };
  if (text.length > 400) return { ok: false, reason: 'expression is too long' };
  try {
    const fn = compileExpr(normalizeExpr(text, variables));
    fn(Object.fromEntries(variables.map((name, index) => [name.toLowerCase(), 0.37 + 0.11 * index])));
    return { ok: true, fn };
  } catch (error) {
    return { ok: false, reason: error instanceof ExprError ? error.message : 'expression cannot be evaluated' };
  }
}

/** A constant expression (`2*pi`, `√3/2`, `-1.5`), or null when it is not a finite number. */
export function evalNumber(source: string): number | null {
  const compiled = compileFormula(source, []);
  if (!compiled.ok) return null;
  const value = compiled.fn({});
  return Number.isFinite(value) ? value : null;
}

/** The right-hand side of `lhs = rhs`; the text itself when it holds no equals sign. */
export function rightHandSide(source: string): string {
  const at = source.indexOf('=');
  return at < 0 ? source.trim() : source.slice(at + 1).trim();
}

export interface Quantity {
  value: number;
  /** Trailing unit as written (`cm`, `m/s`), or '' when the value is bare. */
  unit: string;
}

const UNIT_TAIL = /\s*([A-Za-zµμΩ°%][A-Za-z0-9µμΩ°%/^·.²³-]*)\s*$/;

/** A number with an optional trailing unit: `3`, `3 cm`, `2.5m`, `5√3 cm`, `10/3`. */
export function parseQuantity(source: string): Quantity | null {
  const text = source.trim();
  if (!text) return null;
  const bare = evalNumber(text);
  if (bare !== null) return { value: bare, unit: '' };
  const tail = UNIT_TAIL.exec(text);
  if (!tail) return null;
  const value = evalNumber(text.slice(0, tail.index));
  return value === null ? null : { value, unit: tail[1]! };
}

export interface Angle {
  degrees: number;
  /** The unit the source used; a figure labels the angle the way the problem states it. */
  unit: 'deg' | 'rad';
}

/**
 * An angle in degrees unless the text says otherwise: `150`, `150°`, `150 deg`, `5pi/6`, `5π/6`,
 * `2.618 rad`. A bare multiple of π is radians, which is how every textbook writes one.
 */
export function parseAngle(source: string): Angle | null {
  let text = source.trim();
  if (!text) return null;
  let unit: Angle['unit'] | null = null;
  const suffix = /\s*(°|º|degrees?|degs?|radians?|rads?)\s*$/i.exec(text);
  if (suffix) {
    unit = /^r/i.test(suffix[1]!) ? 'rad' : 'deg';
    text = text.slice(0, suffix.index);
  }
  const value = evalNumber(text);
  if (value === null) return null;
  unit ??= /π|pi/i.test(text) ? 'rad' : 'deg';
  return { degrees: unit === 'rad' ? (value * 180) / Math.PI : value, unit };
}
