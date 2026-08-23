/**
 * Strip stemLM protocol markers from user-facing text.
 *
 * Models sometimes emit alternate end tokens (@formulaend vs @endformula) or
 * glue them onto the same line as content ("$$…$$ @formulaend"). These must
 * never reach the panel UI or PDF export.
 */

/** Canonical + alternate end markers (lowercase keys for lookup). */
export const ALT_END_MARKERS: Record<string, string> = {
  '@bodyend': '@endbody',
  '@formulaend': '@endformula',
  '@diagramend': '@enddiagram',
  '@takeawayend': '@endtakeaway',
  '@stepend': '@endstep',
  '@metaend': '@endmeta',
  '@solutionend': '@endsolution',
  '@quickcheckend': '@endquickcheck',
  '@followupend': '@endfollowup',
  '@qend': '@endq',
  '@patchend': '@endpatch',
  '@verifyend': '@endverify',
  '@uncertaintyend': '@enduncertainty',
};

/** Every standalone protocol line token. */
export const PROTOCOL_LINE_MARKERS = new Set([
  '@meta',
  '@endmeta',
  '@metaend',
  '@step',
  '@endstep',
  '@stepend',
  '@formula',
  '@endformula',
  '@formulaend',
  '@body',
  '@endbody',
  '@bodyend',
  '@enddiagram',
  '@diagramend',
  '@takeaway',
  '@endtakeaway',
  '@takeawayend',
  '@quickcheck',
  '@endquickcheck',
  '@quickcheckend',
  '@followup',
  '@endfollowup',
  '@followupend',
  '@solution',
  '@endsolution',
  '@solutionend',
  '@end',
  '@q',
  '@endq',
  '@qend',
  '@patch',
  '@endpatch',
  '@patchend',
  '@verify',
  '@endverify',
  '@verifyend',
  '@uncertainty',
  '@enduncertainty',
  '@uncertaintyend',
  '@resume',
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Inline or trailing protocol tokens glued to content (e.g. "$$…$$ @formulaend"). */
const INLINE_MARKER_RE =
  /[\t ]*@(?:end(?:meta|step|formula|body|diagram|takeaway|quickcheck|followup|solution)|(?:meta|step|formula|body|takeaway|quickcheck|followup|solution|diagram)end|diagram\s+type\s*=\s*[a-z]+|meta|step|formula|body|takeaway|quickcheck|followup|solution|end)(?=\s|$)/gi;

function isProtocolOnlyLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (PROTOCOL_LINE_MARKERS.has(t)) return true;
  if (/^@diagram\b/i.test(t)) return true;
  return false;
}

/**
 * Normalize capsule source before parsing — standalone alternate markers and
 * inline glued markers (e.g. "$$…$$ @formulaend") become proper line breaks.
 */
export function normalizeCapsuleText(text: string): string {
  let s = text.replace(/\r\n/g, '\n');

  s = s
    .split('\n')
    .map((line) => {
      const t = line.trim();
      const canonical = ALT_END_MARKERS[t];
      return canonical ? line.replace(t, canonical) : line;
    })
    .join('\n');

  for (const [alt, canon] of Object.entries(ALT_END_MARKERS)) {
    s = s.replace(new RegExp(`[\\t ]*${escapeRegExp(alt)}(?=\\s|$)`, 'gi'), `\n${canon}`);
  }

  return s;
}

/** Remove any protocol markers still present in rendered text fields. */
export function stripProtocolMarkers(text: string): string {
  if (!text) return '';

  const lines = text.split('\n').map((line) => {
    if (!line.trim()) return line;
    if (isProtocolOnlyLine(line)) return null;
    return line.replace(INLINE_MARKER_RE, '').trimEnd();
  });

  let out = lines.filter((line): line is string => line !== null).join('\n');
  out = out.replace(INLINE_MARKER_RE, '').trim();
  return out;
}
