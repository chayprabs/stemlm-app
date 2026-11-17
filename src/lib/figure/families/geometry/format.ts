/** Number and exact-value text for geometry labels. Plain text uses a true minus sign, as print does. */
import type { Angle } from './expr';

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

/** sin of the first-quadrant multiples of 15°, as written when positive and when negative. */
const SIN: Record<number, readonly [string, string]> = {
  0: ['0', '0'],
  15: ['(√6−√2)/4', '(√2−√6)/4'],
  30: ['1/2', '−1/2'],
  45: ['√2/2', '−√2/2'],
  60: ['√3/2', '−√3/2'],
  75: ['(√6+√2)/4', '−(√6+√2)/4'],
  90: ['1', '−1'],
};

/**
 * Exact cos and sin for a multiple of 15°, from the first-quadrant table and the quadrant's signs.
 * Null for any other angle: a decimal is then the honest answer.
 */
export function exactPoint(degrees: number): { cos: string; sin: string } | null {
  const steps = degrees / 15;
  if (!Number.isFinite(steps) || Math.abs(steps - Math.round(steps)) > 1e-9) return null;
  const d = (((Math.round(steps) * 15) % 360) + 360) % 360;
  const reference = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
  return {
    cos: SIN[90 - reference]![d > 90 && d < 270 ? 1 : 0],
    sin: SIN[reference]![d > 180 ? 1 : 0],
  };
}

/** How the source wrote a value, tidied for print: `5*sqrt(3)` → `5√3`, `2 pi/3` → `2π/3`, `-4` → `−4`. */
function prettySource(source: string): string {
  return source.trim()
    .replace(/\\?sqrt\s*[({]\s*([^(){}]+?)\s*[)}]/gi, '√$1')
    .replace(/\\?pi\b/gi, 'π')
    .replace(/(\d)\s*\*\s*(\d)/g, '$1·$2')
    .replace(/\s*\*\s*/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/-/g, MINUS)
    .replace(/\s+/g, ' ');
}

/** The value as the problem wrote it when that is plain arithmetic text, otherwise the number. */
export function asWritten(text: string, value: number): string {
  const pretty = prettySource(text);
  return pretty.length <= 9 && /^[\d.√π/·−+() ]+$/.test(pretty) ? pretty : fmt(value, 4);
}

/** An angle in the unit the problem used: `150°`, `5π/6`, `2.618 rad`. */
export function angleLabel(angle: Angle): string {
  if (angle.unit === 'deg') return `${asWritten(angle.text, angle.degrees)}°`;
  const written = asWritten(angle.text, (angle.degrees * Math.PI) / 180);
  return /π/.test(written) ? written : `${written} rad`;
}
