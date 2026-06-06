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
  type ParseErrorCode,
  type ParseResult,
  type ParseWarningCode,
  type Step,
  type Subject,
  SUBJECTS,
} from './types';
import {
  CAPSULE_END_TOKEN,
  CAPSULE_FENCE_TAG,
  PROTOCOL_VERSION,
  STEP_COUNT_MAX,
  STEP_COUNT_MIN,
} from './protocol';

const STRUCTURAL_MARKERS = new Set([
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
  CAPSULE_END_TOKEN,
]);

/** Models sometimes emit @bodyend instead of @endbody — normalize before parsing. */
const ALT_END_MARKERS: Record<string, string> = {
  '@bodyend': '@endbody',
  '@formulaend': '@endformula',
  '@diagramend': '@enddiagram',
  '@takeawayend': '@endtakeaway',
  '@stepend': '@endstep',
  '@metaend': '@endmeta',
  '@solutionend': '@endsolution',
  '@quickcheckend': '@endquickcheck',
  '@followupend': '@endfollowup',
};

function normalizeCapsuleText(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      const canonical = ALT_END_MARKERS[t];
      return canonical ? line.replace(t, canonical) : line;
    })
    .join('\n');
}

function addWarning(
  warnings: string[],
  warningCodes: ParseWarningCode[],
  code: ParseWarningCode,
  message: string,
): void {
  warnings.push(message);
  warningCodes.push(code);
}

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

  // 1) Explicit ```stemlm fence. Prefer the span through a standalone @end so
  // a stray inner code fence does not truncate the capsule before validation.
  const taggedOpen = new RegExp('^```+\\s*' + CAPSULE_FENCE_TAG + '\\b[^\\n]*$', 'im').exec(text);
  if (taggedOpen) {
    const afterOpen = text.slice(taggedOpen.index + taggedOpen[0].length).replace(/^\r?\n/, '');
    const lines = afterOpen.split('\n');
    for (let k = 0; k < lines.length; k++) {
      if ((lines[k] ?? '').trim() === CAPSULE_END_TOKEN) {
        return lines.slice(0, k + 1).join('\n');
      }
    }
    const tagged = new RegExp(
      '```+\\s*' + CAPSULE_FENCE_TAG + '\\b[^\\n]*\\n([\\s\\S]*?)\\n?```+',
      'i',
    ).exec(text);
    if (tagged && tagged[1] !== undefined) return tagged[1];
    return afterOpen;
  }

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

function normalizeSubject(value: string | undefined): { subject: Subject; recovered: boolean } {
  if (!value) return { subject: 'General', recovered: false };
  const found = SUBJECTS.find((s) => s.toLowerCase() === value.trim().toLowerCase());
  if (found) return { subject: found, recovered: false };
  // Common aliases.
  const v = value.trim().toLowerCase();
  if (/comp|cs|algorithm|program|coding/.test(v)) return { subject: 'CS', recovered: false };
  if (/elec|circuit/.test(v)) return { subject: 'Electrical', recovered: false };
  if (/mech(?!.*chem)/.test(v)) return { subject: 'Mechanical', recovered: false };
  if (/civil|structur/.test(v)) return { subject: 'Civil', recovered: false };
  if (/chem.*eng|process eng/.test(v)) return { subject: 'Chemical', recovered: false };
  if (/phys/.test(v)) return { subject: 'Physics', recovered: false };
  if (/chem/.test(v)) return { subject: 'Chemistry', recovered: false };
  if (/bio/.test(v)) return { subject: 'Biology', recovered: false };
  if (/math|calc|algebra/.test(v)) return { subject: 'Math', recovered: false };
  return { subject: 'General', recovered: true };
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

function isMalformedDiagram(diagram: Diagram): boolean {
  if (diagram.type === 'svg') {
    return !/<svg\b/i.test(diagram.content);
  }
  const src = diagram.content.trim();
  return !/^(graph\s+(TD|LR)\b|sequenceDiagram\b|stateDiagram(?:-v2)?\b)/i.test(src);
}

function parseStep(
  c: Cursor,
  index: number,
  warnings: string[],
  warningCodes: ParseWarningCode[],
): Step {
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
      if (content) {
        step.diagram = { type, content };
        if (isMalformedDiagram(step.diagram)) {
          addWarning(
            warnings,
            warningCodes,
            'malformed_diagram',
            `Step ${index} had a malformed ${type} diagram.`,
          );
        }
      }
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
    addWarning(warnings, warningCodes, 'missing_step_title', `Step ${index} had no title.`);
  }
  return step;
}

/** Parse the capsule body (already-extracted text) into a Capsule. */
export function parseCapsule(capsuleText: string): ParseResult {
  const warnings: string[] = [];
  const warningCodes: ParseWarningCode[] = [];
  const raw = capsuleText;
  const normalizedText = normalizeCapsuleText(capsuleText.replace(/\r\n/g, '\n'));
  const lines = normalizedText.split('\n');
  const c: Cursor = { lines, i: 0 };

  let subject: Subject = 'General';
  let topic = '';
  let version = PROTOCOL_VERSION;
  let sawMeta = false;
  let sawEnd = false;
  const steps: Step[] = [];
  let solution = '';
  let solutionDiagrams: Diagram[] = [];

  if (capsuleText.includes('```')) {
    addWarning(
      warnings,
      warningCodes,
      'inner_triple_backticks',
      'Capsule contained triple backticks inside its body.',
    );
  }

  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();

    if (t === CAPSULE_END_TOKEN) {
      sawEnd = true;
      c.i++;
      break;
    }
    if (t === '@meta') {
      sawMeta = true;
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
        else if (s !== null) {
          const normalized = normalizeSubject(s);
          subject = normalized.subject;
          if (normalized.recovered) {
            addWarning(
              warnings,
              warningCodes,
              'invalid_subject',
              `Invalid subject "${s}" was normalized to General.`,
            );
          }
        }
        else if (tp !== null) topic = tp;
        c.i++;
      }
      continue;
    }
    if (t === '@step') {
      c.i++;
      steps.push(parseStep(c, steps.length + 1, warnings, warningCodes));
      continue;
    }
    if (t === '@solution') {
      c.i++;
      const body = readSolutionBlock(c);
      const extracted = extractSolutionDiagrams(body);
      solution = extracted.text;
      solutionDiagrams = extracted.diagrams;
      for (const diagram of solutionDiagrams) {
        if (isMalformedDiagram(diagram)) {
          addWarning(
            warnings,
            warningCodes,
            'malformed_diagram',
            `Solution had a malformed ${diagram.type} diagram.`,
          );
        }
      }
      continue;
    }

    // Unknown top-level line: skip.
    c.i++;
  }

  if (!topic) {
    topic = steps[0]?.title || 'Study capsule';
    addWarning(
      warnings,
      warningCodes,
      'missing_topic',
      'Capsule had no topic; inferred from first step.',
    );
  }

  if (!sawMeta) {
    addWarning(warnings, warningCodes, 'missing_meta', 'Capsule had no @meta block.');
  }
  if (!sawEnd) {
    addWarning(warnings, warningCodes, 'missing_end', 'Capsule had no final @end token.');
  }
  if (steps.length > 0 && (steps.length < STEP_COUNT_MIN || steps.length > STEP_COUNT_MAX)) {
    addWarning(
      warnings,
      warningCodes,
      'invalid_step_count',
      `Capsule had ${steps.length} step(s); expected ${STEP_COUNT_MIN}-${STEP_COUNT_MAX}.`,
    );
  }
  for (const step of steps) {
    const sentences = step.body.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (step.body.length > 420 || sentences.length > 4) {
      addWarning(
        warnings,
        warningCodes,
        'step_body_too_long',
        `Step ${step.index} ("${step.title}") packs multiple moves; split into smaller steps.`,
      );
    }
  }
  if (!solution) {
    addWarning(warnings, warningCodes, 'missing_solution', 'Capsule had no solution block.');
  }

  const capsule: Capsule = {
    meta: { version, subject, topic },
    steps,
    solution,
    solutionDiagrams,
  };

  if (steps.length === 0 && !solution) {
    const errorCode: ParseErrorCode = sawMeta ? 'no_usable_content' : 'missing_meta';
    return { status: 'empty', warnings, warningCodes, errorCode, raw };
  }

  const status = steps.length > 0 ? 'ok' : 'partial';
  return { status, capsule, warnings, warningCodes, raw };
}

/** Top-level: find + parse a capsule from arbitrary message text. */
export function parse(text: string): ParseResult {
  const capsuleText = findCapsuleRaw(text);
  if (capsuleText === null) {
    return {
      status: 'empty',
      warnings: ['No stemLM capsule found in text.'],
      warningCodes: ['no_capsule'],
      errorCode: 'no_capsule',
      raw: text,
    };
  }
  const result = parseCapsule(capsuleText);
  if (!/```+\s*stemlm\b/i.test(text) && text.includes('@meta')) {
    return {
      ...result,
      warnings: ['Capsule was parsed without an explicit stemlm fence.', ...result.warnings],
      warningCodes: ['missing_fence', ...result.warningCodes],
    };
  }
  return result;
}
