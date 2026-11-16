/** Number and exact-value text for geometry labels. Plain text uses a true minus sign, as print does. */

export const MINUS = '−';

/**
 * A value to `digits` significant figures without trailing zeros. Integer digits are never rounded
 * away (1234.5 prints 1235, not 1230); magnitudes outside 10^-4..10^6 use m×10^k, which the label
 * notation prints with a superscript.
 */
export function fmt(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs < 1e-12) return '0';
  const sign = value < 0 ? MINUS : '';
  if (abs >= 1e6 || abs < 1e-4) {
    const exponent = Math.floor(Math.log10(abs) + 1e-12);
    const mantissa = Number((abs / 10 ** exponent).toPrecision(digits));
    return `${sign}${mantissa === 1 ? '' : `${mantissa}×`}10^${exponent}`.replace('^-', `^${MINUS}`);
  }
  const rounded = abs >= 10 ** digits ? Math.round(abs) : Number(abs.toPrecision(digits));
  return rounded === 0 ? '0' : `${sign}${rounded}`;
}

/** Degrees to one decimal, the precision triangle and vector answers are quoted to. */
export function fmtDegrees(degrees: number): string {
  const rounded = Math.round(degrees * 10) / 10;
  return `${rounded < 0 ? MINUS : ''}${Math.abs(rounded)}°`;
}

/** True when a rounded label still states the value exactly (so it may be written with `=`). */
export function isExactAt(value: number, text: string): boolean {
  const shown = Number(text.replace(MINUS, '-').replace('°', ''));
  return Number.isFinite(shown) && Math.abs(shown - value) <= 1e-9 * Math.max(1, Math.abs(value));
}

export interface Exact {
  /** Plain text: `−√3/2`. */
  text: string;
  /** KaTeX source: `-\frac{\sqrt{3}}{2}`. */
  tex: string;
}

interface Surd { plus: Exact; minus: Exact }

const surd = (text: string, tex: string, negText = `${MINUS}${text}`, negTex = `-${tex}`): Surd => ({
  plus: { text, tex },
  minus: { text: negText, tex: negTex },
});

const ZERO: Surd = { plus: { text: '0', tex: '0' }, minus: { text: '0', tex: '0' } };

/** sin of the first-quadrant multiples of 15°. */
const SIN: Record<number, Surd> = {
  0: ZERO,
  15: surd('(√6−√2)/4', '\\frac{\\sqrt{6}-\\sqrt{2}}{4}', '(√2−√6)/4', '\\frac{\\sqrt{2}-\\sqrt{6}}{4}'),
  30: surd('1/2', '\\frac{1}{2}'),
  45: surd('√2/2', '\\frac{\\sqrt{2}}{2}'),
  60: surd('√3/2', '\\frac{\\sqrt{3}}{2}'),
  75: surd('(√6+√2)/4', '\\frac{\\sqrt{6}+\\sqrt{2}}{4}', '−(√6+√2)/4', '-\\frac{\\sqrt{6}+\\sqrt{2}}{4}'),
  90: surd('1', '1'),
};

/** tan of the first-quadrant multiples of 15°; tan 90° is undefined. */
const TAN: Record<number, Surd> = {
  0: ZERO,
  15: surd('2−√3', '2-\\sqrt{3}', '√3−2', '\\sqrt{3}-2'),
  30: surd('√3/3', '\\frac{\\sqrt{3}}{3}'),
  45: surd('1', '1'),
  60: surd('√3', '\\sqrt{3}'),
  75: surd('2+√3', '2+\\sqrt{3}', '−2−√3', '-2-\\sqrt{3}'),
};

export interface ExactTrig { sin: Exact; cos: Exact; tan: Exact | null }

/**
 * Exact sin, cos and tan for a multiple of 15°, from the first-quadrant table and the quadrant's
 * signs. Null for any other angle: a decimal is then the honest answer.
 */
export function exactTrig(degrees: number): ExactTrig | null {
  const steps = degrees / 15;
  if (!Number.isFinite(steps) || Math.abs(steps - Math.round(steps)) > 1e-9) return null;
  const d = (((Math.round(steps) * 15) % 360) + 360) % 360;
  const reference = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
  const sinSign = d > 180 ? -1 : 1;
  const cosSign = d > 90 && d < 270 ? -1 : 1;
  const pick = (entry: Surd, sign: number) => (sign < 0 ? entry.minus : entry.plus);
  const tangent = TAN[reference];
  return {
    sin: pick(SIN[reference]!, sinSign),
    cos: pick(SIN[90 - reference]!, cosSign),
    tan: tangent ? pick(tangent, sinSign * cosSign) : null,
  };
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a);
}

/** Degrees as a multiple of π when it is one with a small denominator (150 → 5π/6); null otherwise. */
export function piMultiple(degrees: number): Exact | null {
  const twelfths = degrees / 15;
  if (!Number.isFinite(twelfths) || Math.abs(twelfths - Math.round(twelfths)) > 1e-9) return null;
  const n = Math.round(twelfths);
  if (n === 0) return { text: '0', tex: '0' };
  const divisor = gcd(n, 12);
  const top = Math.abs(n) / divisor;
  const bottom = 12 / divisor;
  const sign = n < 0;
  const numerator = top === 1 ? 'π' : `${top}π`;
  const numeratorTex = top === 1 ? '\\pi' : `${top}\\pi`;
  return bottom === 1
    ? { text: `${sign ? MINUS : ''}${numerator}`, tex: `${sign ? '-' : ''}${numeratorTex}` }
    : { text: `${sign ? MINUS : ''}${numerator}/${bottom}`, tex: `${sign ? '-' : ''}\\frac{${numeratorTex}}{${bottom}}` };
}

/** How the source wrote a value, tidied for print: `5*sqrt(3)` → `5√3`, `2 pi/3` → `2π/3`, `-4` → `−4`. */
export function prettySource(source: string): string {
  return source.trim()
    .replace(/\\?sqrt\s*[({]\s*([^(){}]+?)\s*[)}]/gi, '√$1')
    .replace(/\\?pi\b/gi, 'π')
    .replace(/(\d)\s*\*\s*(\d)/g, '$1·$2')
    .replace(/\s*\*\s*/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/-/g, MINUS)
    .replace(/\s+/g, ' ');
}
