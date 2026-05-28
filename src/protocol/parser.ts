/**
 * Tolerant parser for the stemLM capsule format (see protocol.ts).
 *
 * Design goals:
 *  - Never throw. Always return a ParseResult with a status + warnings.
 *  - Recover gracefully from missing `@endX` terminators (a new structural
 *    marker implicitly closes the current block).
 *  - Work both on the extracted code-block text and on raw message text that
 *    still contains the ```stemlm fence.
 */
import {
  type Capsule,
  type Diagram,
  type DiagramType,
  type ParseResult,
  type Step,
  type Subject,
  SUBJECTS,
} from './types';
import { CAPSULE_END_TOKEN, CAPSULE_FENCE_TAG, PROTOCOL_VERSION } from './protocol';

const STRUCTURAL_MARKERS = new Set([
  '@meta',
  '@endmeta',
  '@step',
  '@endstep',
  '@formula',
  '@endformula',
  '@body',
  '@endbody',
  '@enddiagram',
  '@takeaway',
  '@endtakeaway',
  '@quickcheck',
  '@endquickcheck',
  '@followup',
  '@endfollowup',
  '@solution',
  '@endsolution',
  CAPSULE_END_TOKEN,
]);

function isStructural(line: string): boolean {
  const t = line.trim();
  return STRUCTURAL_MARKERS.has(t) || /^@diagram\b/.test(t);
}

/** Placeholder token used to keep diagram positions inside the solution text. */
export const SOLUTION_DIAGRAM_TOKEN = (i: number) => `{{stemlm-diagram:${i}}}`;
const SOLUTION_DIAGRAM_RE = /\{\{stemlm-diagram:(\d+)\}\}/;

export function solutionDiagramRegexGlobal(): RegExp {
  return /\{\{stemlm-diagram:(\d+)\}\}/g;
}

export { SOLUTION_DIAGRAM_RE };

/**
 * Locate the capsule body within arbitrary text. Tries (1) a ```stemlm fenced
 * block, (2) any fenced block that contains @meta, (3) a bare @meta..@end span.
 * Returns null if nothing capsule-like is present.
 */
export function findCapsuleRaw(text: string): string | null {
  if (!text) return null;

  // 1) Explicit ```stemlm fence.
  const tagged = new RegExp(
    '```+\\s*' + CAPSULE_FENCE_TAG + '\\b[^\\n]*\\n([\\s\\S]*?)\\n?```+',
    'i',
  ).exec(text);
  if (tagged && tagged[1] !== undefined) return tagged[1];

  // 2) Any fenced block containing @meta.
  const fenceRe = /```+[^\n]*\n([\s\S]*?)\n?```+/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    if (m[1] && m[1].includes('@meta')) return m[1];
  }

  // 3) Bare span from @meta to a standalone @end line (model dropped the fence).
  const start = text.indexOf('@meta');
  if (start !== -1) {
    const after = text.slice(start);
    const lines = after.split('\n');
    for (let k = 0; k < lines.length; k++) {
      if ((lines[k] ?? '').trim() === CAPSULE_END_TOKEN) {
        return lines.slice(0, k + 1).join('\n');
      }
    }
    return after;
  }

  return null;
}

/** Whether the text contains a (likely) complete capsule — used as a streaming-done signal. */
export function looksComplete(text: string): boolean {
  const raw = findCapsuleRaw(text);
  if (!raw) return false;
  // The end token must appear on its own line.
  return raw.split('\n').some((l) => l.trim() === CAPSULE_END_TOKEN);
}

interface Cursor {
  lines: string[];
  i: number;
}

/** Read lines until `endMarker` or any structural marker (tolerant close). */
function readBlock(c: Cursor, endMarker: string): string {
  const out: string[] = [];
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();
    if (t === endMarker) {
      c.i++; // consume terminator
      break;
    }
    if (isStructural(line)) break; // implicit close, leave marker for caller
    out.push(line);
    c.i++;
  }
  return out.join('\n').trim();
}

/**
 * Read the solution block. Unlike readBlock, this does NOT stop at @diagram/
 * @enddiagram markers (those legitimately appear inside the solution). It stops
 * only at @endsolution (consumed) or @end (left for the caller).
 */
function readSolutionBlock(c: Cursor): string {
  const out: string[] = [];
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();
    if (t === '@endsolution') {
      c.i++;
      break;
    }
    if (t === CAPSULE_END_TOKEN) break; // leave for outer loop
    out.push(line);
    c.i++;
  }
  return out.join('\n').trim();
}

/** Read a single `key: value` style line value (already positioned on it). */
function readInlineValue(line: string, key: string): string | null {
  const re = new RegExp('^\\s*' + key + '\\s*:\\s*(.*)$', 'i');
  const m = re.exec(line);
  return m ? (m[1] ?? '').trim() : null;
}

function normalizeSubject(value: string | undefined): Subject {
  if (!value) return 'General';
  const found = SUBJECTS.find((s) => s.toLowerCase() === value.trim().toLowerCase());
  if (found) return found;
  // Common aliases.
  const v = value.trim().toLowerCase();
  if (/comp|cs|algorithm|program|coding/.test(v)) return 'CS';
  if (/elec|circuit/.test(v)) return 'Electrical';
  if (/mech(?!.*chem)/.test(v)) return 'Mechanical';
  if (/civil|structur/.test(v)) return 'Civil';
  if (/chem.*eng|process eng/.test(v)) return 'Chemical';
  if (/phys/.test(v)) return 'Physics';
  if (/chem/.test(v)) return 'Chemistry';
  if (/bio/.test(v)) return 'Biology';
  if (/math|calc|algebra/.test(v)) return 'Math';
  return 'General';
}

function parseDiagramOpen(line: string): DiagramType {
  const m = /type\s*=\s*([a-z]+)/i.exec(line);
  const t = (m?.[1] ?? 'svg').toLowerCase();
  return t === 'mermaid' ? 'mermaid' : 'svg';
}

/** Extract inline @diagram..@enddiagram blocks from a solution body. */
function extractSolutionDiagrams(body: string): { text: string; diagrams: Diagram[] } {
  const lines = body.split('\n');
  const diagrams: Diagram[] = [];
  const outLines: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (/^\s*@diagram\b/.test(line)) {
      const type = parseDiagramOpen(line);
      i++;
      const content: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim() !== '@enddiagram') {
        content.push(lines[i] ?? '');
        i++;
      }
      if (i < lines.length) i++; // consume @enddiagram
      const idx = diagrams.length;
      diagrams.push({ type, content: content.join('\n').trim() });
      outLines.push(SOLUTION_DIAGRAM_TOKEN(idx));
      continue;
    }
    outLines.push(line);
    i++;
  }
  return { text: outLines.join('\n').trim(), diagrams };
}

function parseStep(c: Cursor, index: number, warnings: string[]): Step {
  const step: Step = { id: `step-${index}`, index, title: '', body: '' };
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();

    if (t === '@endstep') {
      c.i++;
      break;
    }
    if (t === '@step' || t === '@solution' || t === CAPSULE_END_TOKEN) {
      // Implicit close of this step.
      break;
    }

    const title = readInlineValue(line, 'title');
    if (title !== null) {
      step.title = title;
      c.i++;
      continue;
    }

    if (t === '@formula') {
      c.i++;
      step.formula = readBlock(c, '@endformula') || undefined;
      continue;
    }
    if (t === '@body') {
      c.i++;
      step.body = readBlock(c, '@endbody');
      continue;
    }
    if (/^@diagram\b/.test(t)) {
      const type = parseDiagramOpen(t);
      c.i++;
      const content = readBlock(c, '@enddiagram');
      if (content) step.diagram = { type, content };
      continue;
    }
    if (t === '@takeaway') {
      c.i++;
      step.takeaway = readBlock(c, '@endtakeaway') || undefined;
      continue;
    }
    if (t === '@quickcheck') {
      c.i++;
      let q = '';
      let a = '';
      while (c.i < c.lines.length) {
        const ql = c.lines[c.i] ?? '';
        const qt = ql.trim();
        if (qt === '@endquickcheck') {
          c.i++;
          break;
        }
        if (isStructural(ql)) break;
        const qv = readInlineValue(ql, 'q');
        const av = readInlineValue(ql, 'a');
        if (qv !== null) q = qv;
        else if (av !== null) a = av;
        else if (qt) {
          // continuation of whichever was last set
          if (a) a += ' ' + qt;
          else if (q) q += ' ' + qt;
        }
        c.i++;
      }
      if (q || a) step.quickCheck = { question: q, answer: a };
      continue;
    }
    if (t === '@followup') {
      c.i++;
      step.followup = readBlock(c, '@endfollowup') || undefined;
      continue;
    }

    // Unknown line inside a step: skip it.
    c.i++;
  }

  if (!step.title) {
    step.title = `Step ${index}`;
    warnings.push(`Step ${index} had no title.`);
  }
  return step;
}

/** Parse the capsule body (already-extracted text) into a Capsule. */
export function parseCapsule(capsuleText: string): ParseResult {
  const warnings: string[] = [];
  const raw = capsuleText;
  const lines = capsuleText.replace(/\r\n/g, '\n').split('\n');
  const c: Cursor = { lines, i: 0 };

  let subject: Subject = 'General';
  let topic = '';
  let version = PROTOCOL_VERSION;
  const steps: Step[] = [];
  let solution = '';
  let solutionDiagrams: Diagram[] = [];

  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();

    if (t === CAPSULE_END_TOKEN) {
      c.i++;
      break;
    }
    if (t === '@meta') {
      c.i++;
      while (c.i < c.lines.length) {
        const ml = c.lines[c.i] ?? '';
        const mt = ml.trim();
        if (mt === '@endmeta') {
          c.i++;
          break;
        }
        if (isStructural(ml)) break;
        const v = readInlineValue(ml, 'version');
        const s = readInlineValue(ml, 'subject');
        const tp = readInlineValue(ml, 'topic');
        if (v !== null) version = Number(v) || PROTOCOL_VERSION;
        else if (s !== null) subject = normalizeSubject(s);
        else if (tp !== null) topic = tp;
        c.i++;
      }
      continue;
    }
    if (t === '@step') {
      c.i++;
      steps.push(parseStep(c, steps.length + 1, warnings));
      continue;
    }
    if (t === '@solution') {
      c.i++;
      const body = readSolutionBlock(c);
      const extracted = extractSolutionDiagrams(body);
      solution = extracted.text;
      solutionDiagrams = extracted.diagrams;
      continue;
    }

    // Unknown top-level line: skip.
    c.i++;
  }

  if (!topic) {
    topic = steps[0]?.title || 'Study capsule';
    warnings.push('Capsule had no topic; inferred from first step.');
  }

  const capsule: Capsule = {
    meta: { version, subject, topic },
    steps,
    solution,
    solutionDiagrams,
  };

  if (steps.length === 0 && !solution) {
    return { status: 'empty', warnings, raw };
  }

  const status = steps.length > 0 ? 'ok' : 'partial';
  return { status, capsule, warnings, raw };
}

/** Top-level: find + parse a capsule from arbitrary message text. */
export function parse(text: string): ParseResult {
  const capsuleText = findCapsuleRaw(text);
  if (capsuleText === null) {
    return { status: 'empty', warnings: ['No stemLM capsule found in text.'], raw: text };
  }
  return parseCapsule(capsuleText);
}
