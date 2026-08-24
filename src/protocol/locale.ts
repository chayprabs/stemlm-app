/**
 * Structured fields parsed from the opaque `@meta locale:` string.
 * CapsuleMeta.locale stays the emitted string (v2); compilers read these fields.
 */
import { canonicalizeDiagramType, lookupFamily } from '@/src/lib/figure/catalog';

export interface LocaleFields {
  units?: 'SI' | 'imperial';
  decimal?: '.' | ',';
  circuit?: 'iec' | 'ieee';
}

/** Parse `SI|imperial`, `decimal=.|,`, `circuit=IEC|IEEE` from a locale line. */
export function parseLocaleFields(locale: string | undefined | null): LocaleFields {
  if (!locale) return {};
  const out: LocaleFields = {};
  if (/\bimperial\b/i.test(locale)) out.units = 'imperial';
  else if (/\bSI\b/i.test(locale) || /\bunits\s*=\s*SI\b/i.test(locale)) out.units = 'SI';

  const dec = /\bdecimal\s*=\s*(.)/i.exec(locale);
  if (dec?.[1] === '.' || dec?.[1] === ',') out.decimal = dec[1];

  const circ = /\b(?:circuit|std)\s*=\s*(IEEE|IEC)\b/i.exec(locale);
  if (circ?.[1]) {
    out.circuit = circ[1].toLowerCase() === 'ieee' ? 'ieee' : 'iec';
  }
  return out;
}

export function circuitStdFromLocale(locale: string | undefined | null): 'iec' | 'ieee' | undefined {
  return parseLocaleFields(locale).circuit;
}

export function familyUsesStd(type: string): boolean {
  const canon = canonicalizeDiagramType(type);
  if (canon === 'circuit') return true;
  const def = lookupFamily(canon);
  if (!def) return false;
  const keys = [...(def.required ?? []), ...(def.requiredAny ?? [])].map((k) => k.toLowerCase());
  return keys.includes('std');
}

/** Insert `std: iec|ieee` from locale when a std-bearing spec omitted it. */
export function injectStdIntoSpec(content: string, locale: string | undefined | null, type: string): string {
  const std = circuitStdFromLocale(locale);
  if (!std) return content;
  if (!familyUsesStd(type)) return content;
  if (/(^|\n)\s*std\s*:/i.test(content)) return content;
  const body = content.replace(/^\n+/, '');
  return body ? `std: ${std}\n${body}` : `std: ${std}`;
}
