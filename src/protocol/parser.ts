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
  type Archetype,
  type Capsule,
  type CapsuleMode,
  type Diagram,
  type DiagramType,
  type LevelBand,
  type ParseErrorCode,
  type ParseResult,
  type ParseWarningCode,
  type PatchOp,
  type Step,
  type Subject,
  type UncertaintyBlock,
  type VerificationBlock,
  type VerifyMethod,
  ARCHETYPES,
  SUBJECTS,
} from './types';
import { findResumeToken } from './apply';
import {
  CAPSULE_END_TOKEN,
  CAPSULE_FENCE_TAG,
  STEP_COUNT_MAX,
  STEP_COUNT_MIN,
} from './protocol';
import {
  ALT_END_MARKERS,
  normalizeCapsuleText,
  stripProtocolMarkers,
} from './strip-markers';
import { auditCapsuleDiagrams, diagramQualityMessage } from './diagram-quality';
import { injectStdIntoSpec } from './locale';
import {
  canonicalizeDiagramType,
  familyRequiredMissing,
  hasKeyValueLine,
  isKnownDiagramType,
  isRefuseType,
} from '@/src/lib/figure/catalog';
import { parseSpec } from '@/src/lib/figure/spec';
import {
  auditStepQuality,
  enrichStepBody,
  isDiagnosticBodyText,
  stepBodyWasSalvaged,
  stepQualityMessage,
} from './step-quality';
import {
  auditQuickCheck,
  isSubstantiveQuickCheck,
  quickCheckQualityMessage,
} from './quickcheck-quality';

/**
 * Count prose sentences in a step body without treating math decimals as boundaries.
 * Protects $...$ / $$...$$ blocks and numeric literals like 9.8 from `.` splits.
 */
export function countBodySentences(body: string): number {
  let masked = body
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => m.replace(/\./g, '\u0000'))
    .replace(/\$[^$\n]*?\$/g, (m) => m.replace(/\./g, '\u0000'));
  masked = masked.replace(/\d+\.\d+/g, (m) => m.replace(/\./g, '\u0000'));
  return masked.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
}

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
  CAPSULE_END_TOKEN,
]);

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
  if (STRUCTURAL_MARKERS.has(t)) return true;
  return /^@(diagram|step|formula|q|patch|verify|uncertainty|resume)\b/i.test(t);
}

/** `key=value` attrs on an open marker (`@step id=s1`, `@diagram id=f1 type=circuit`). */
export function parseMarkerAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /\b([A-Za-z][A-Za-z0-9_-]*)=([^\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1] && m[2]) attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
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

function endMarkersFor(canonical: string): string[] {
  const alts = Object.entries(ALT_END_MARKERS)
    .filter(([, v]) => v === canonical)
    .map(([k]) => k);
  return [canonical, ...alts];
}

/** Split a line when an end marker is glued to content on the same line. */
function splitInlineEndMarker(line: string, endMarker: string): { text: string; closed: boolean } {
  const markers = endMarkersFor(endMarker);
  let cut = -1;
  for (const marker of markers) {
    const idx = line.indexOf(marker);
    if (idx !== -1 && (cut === -1 || idx < cut)) cut = idx;
  }
  if (cut === -1) return { text: line, closed: false };
  return { text: line.slice(0, cut).trimEnd(), closed: true };
}

/** Read lines until `endMarker` or any structural marker (tolerant close). */
function readBlock(c: Cursor, endMarker: string): string {
  const out: string[] = [];
  const markers = endMarkersFor(endMarker);
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();
    if (markers.includes(t)) {
      c.i++; // consume terminator
      break;
    }
    if (isStructural(line)) break; // implicit close, leave marker for caller

    const inline = splitInlineEndMarker(line, endMarker);
    if (inline.text) out.push(inline.text);
    c.i++;
    if (inline.closed) break;
  }
  return stripProtocolMarkers(out.join('\n').trim());
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
  // Common aliases — check compound names before broad prefixes.
  const v = value.trim().toLowerCase();
  if (/comp|cs|algorithm|program|coding/.test(v)) return { subject: 'CS', recovered: false };
  if (/elec|circuit/.test(v)) return { subject: 'Electrical', recovered: false };
  if (/mech(?!.*chem)/.test(v)) return { subject: 'Mechanical', recovered: false };
  if (/civil|structur/.test(v)) return { subject: 'Civil', recovered: false };
  if (/chem.*eng|process eng/.test(v)) return { subject: 'Chemical', recovered: false };
  if (/physical chem|physicochem|phys\s*chem/.test(v)) return { subject: 'Chemistry', recovered: false };
  if (/biochem/.test(v)) return { subject: 'Chemistry', recovered: false };
  if (/phys/.test(v)) return { subject: 'Physics', recovered: false };
  if (/chem/.test(v)) return { subject: 'Chemistry', recovered: false };
  if (/bio/.test(v)) return { subject: 'Biology', recovered: false };
  if (/math|calc|algebra/.test(v)) return { subject: 'Math', recovered: false };
  return { subject: 'General', recovered: true };
}

function applyLocaleStd(capsule: Capsule): void {
  const locale = capsule.meta.locale;
  if (!locale) return;
  const apply = (d: Diagram | undefined) => {
    if (!d) return;
    d.content = injectStdIntoSpec(d.content, locale, d.type);
  };
  for (const s of capsule.steps) apply(s.diagram);
  for (const d of capsule.solutionDiagrams) apply(d);
}

const DIAGRAM_TYPE_RE = /type\s*=\s*([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)/i;

export function parseDiagramOpen(line: string): DiagramType {
  const attrs = parseMarkerAttrs(line);
  if (attrs.type) return canonicalizeDiagramType(attrs.type);
  const m = DIAGRAM_TYPE_RE.exec(line);
  if (!m?.[1]) return 'svg';
  return canonicalizeDiagramType(m[1]);
}

function captionFromSpec(content: string, type: string): string | undefined {
  if (type === 'svg' || type === 'mermaid') return undefined;
  return parseSpec(type, content).caption;
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
      const dId = parseMarkerAttrs(line).id;
      i++;
      const content: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim() !== '@enddiagram') {
        content.push(lines[i] ?? '');
        i++;
      }
      if (i < lines.length) i++; // consume @enddiagram
      const idx = diagrams.length;
      const body = content.join('\n').trim();
      const caption = captionFromSpec(body, type);
      diagrams.push({
        type,
        content: body,
        ...(caption ? { caption } : {}),
        ...(dId ? { id: dId } : {}),
      });
      outLines.push(SOLUTION_DIAGRAM_TOKEN(idx));
      continue;
    }
    outLines.push(line);
    i++;
  }
  return { text: outLines.join('\n').trim(), diagrams };
}

function sanitizeStepFields(step: Step): void {
  step.title = stripProtocolMarkers(step.title);
  step.body = stripProtocolMarkers(step.body);
  if (step.formula) step.formula = stripProtocolMarkers(step.formula);
  if (step.takeaway) {
    step.takeaway = stripProtocolMarkers(step.takeaway);
    if (isDiagnosticBodyText(step.takeaway)) step.takeaway = undefined;
  }
  if (step.followup) {
    step.followup = stripProtocolMarkers(step.followup);
    if (isDiagnosticBodyText(step.followup)) step.followup = undefined;
  }
  if (step.quickCheck) {
    step.quickCheck = {
      question: stripProtocolMarkers(step.quickCheck.question),
      answer: stripProtocolMarkers(step.quickCheck.answer),
    };
  }
}

function isMalformedDiagram(diagram: Diagram): boolean {
  const type = canonicalizeDiagramType(diagram.type);
  if (type === 'svg') {
    return !/<svg\b/i.test(diagram.content);
  }
  if (type === 'mermaid') {
    const src = diagram.content.trim();
    return !/^(?:graph\s+(?:TB|BT|TD|DT|RL|LR)\b|flowchart\s+(?:TB|BT|TD|DT|RL|LR)\b|sequenceDiagram\b|stateDiagram(?:-v2)?\b|classDiagram\b|erDiagram\b)/i.test(
      src,
    );
  }
  if (isRefuseType(type)) return false;
  if (/<svg\b/i.test(diagram.content)) return true;
  if (!hasKeyValueLine(diagram.content)) return true;
  return familyRequiredMissing(type, diagram.content).length > 0;
}

function parseStep(
  c: Cursor,
  index: number,
  warnings: string[],
  warningCodes: ParseWarningCode[],
  openAttrs?: Record<string, string>,
): Step {
  let emittedId = Boolean(openAttrs?.id);
  const step: Step = { id: openAttrs?.id || `step-${index}`, index, title: '', body: '' };
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();

    if (t === '@endstep' || t === '@stepend') {
      c.i++;
      break;
    }
    if (
      t === '@step' ||
      /^@step\b/.test(t) ||
      t === '@solution' ||
      t === CAPSULE_END_TOKEN ||
      t === '@endq' ||
      t === '@qend' ||
      t === '@endpatch' ||
      t === '@patchend' ||
      /^@q\b/.test(t) ||
      /^@patch\b/.test(t)
    ) {
      // Implicit close of this step.
      break;
    }

    const title = readInlineValue(line, 'title');
    if (title !== null) {
      step.title = title;
      c.i++;
      continue;
    }
    const stepId = readInlineValue(line, 'id');
    if (stepId !== null && !step.formulaId && !t.startsWith('@')) {
      step.id = stepId;
      emittedId = true;
      c.i++;
      continue;
    }

    if (t === '@formula' || /^@formula\b/.test(t)) {
      const fAttrs = parseMarkerAttrs(t);
      if (fAttrs.id) step.formulaId = fAttrs.id;
      c.i++;
      step.formula = readBlock(c, '@endformula') || undefined;
      continue;
    }
    const bodyInline = /^@body\s+(.+)/i.exec(t);
    if (bodyInline) {
      step.body = bodyInline[1] ?? '';
      c.i++;
      continue;
    }
    if (t === '@body') {
      c.i++;
      step.body = readBlock(c, '@endbody');
      continue;
    }
    if (/^@diagram\b/.test(t)) {
      const type = parseDiagramOpen(t);
      const dAttrs = parseMarkerAttrs(t);
      c.i++;
      const content = readBlock(c, '@enddiagram');
      if (content) {
        const caption = captionFromSpec(content, type);
        step.diagram = {
          type,
          content,
          ...(caption ? { caption } : {}),
          ...(dAttrs.id ? { id: dAttrs.id } : {}),
        };
        if (!isKnownDiagramType(type)) {
          addWarning(
            warnings,
            warningCodes,
            'unknown_diagram_type',
            `Step ${index} had unknown diagram type "${type}".`,
          );
        }
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
      if (q || a) {
        step.quickCheck = { question: q, answer: a };
      } else {
        addWarning(
          warnings,
          warningCodes,
          'quickcheck_missing_question',
          `Step ${index} had an empty @quickcheck block.`,
        );
      }
      continue;
    }
    if (t === '@followup') {
      c.i++;
      step.followup = readBlock(c, '@endfollowup') || undefined;
      continue;
    }

    // Prose without @body wrapper — salvage into body (common model mistake).
    if (t && !t.startsWith('@')) {
      step.body = step.body ? `${step.body}\n${line.trim()}` : line.trim();
      c.i++;
      continue;
    }

    // Unknown marker line inside a step: skip it.
    c.i++;
  }

  if (!step.title) {
    step.title = `Step ${index}`;
    addWarning(warnings, warningCodes, 'missing_step_title', `Step ${index} had no title.`);
  }
  if (!emittedId) {
    addWarning(
      warnings,
      warningCodes,
      'missing_step_id',
      `Step ${index} had no id=; salvaged as ${step.id}.`,
    );
  }
  if (step.formula && !step.formulaId) {
    addWarning(
      warnings,
      warningCodes,
      'missing_formula_id',
      `Step ${index} had @formula without id=.`,
    );
  }
  if (step.diagram && !step.diagram.id) {
    addWarning(
      warnings,
      warningCodes,
      'missing_diagram_id',
      `Step ${index} had @diagram without id=.`,
    );
  }
  sanitizeStepFields(step);
  enrichStepBody(step);
  return step;
}

const LEVEL_BANDS: LevelBand[] = ['intro', 'undergrad', 'advanced', 'research'];
const CAPSULE_MODES: CapsuleMode[] = ['full', 'patch', 'resolve', 'new'];
const VERIFY_METHOD_TOKENS: VerifyMethod[] = [
  'dimensional',
  'units',
  'limit',
  'oom',
  'backsub',
  'conservation',
  'alt',
];

function normalizeArchetype(value: string | undefined): Archetype | undefined {
  if (!value) return undefined;
  const t = value.trim().toLowerCase() as Archetype;
  return (ARCHETYPES as string[]).includes(t) ? t : undefined;
}

function normalizeLevel(value: string | undefined): LevelBand | undefined {
  if (!value) return undefined;
  const t = value.trim().toLowerCase() as LevelBand;
  return (LEVEL_BANDS as string[]).includes(t) ? t : undefined;
}

function normalizeMode(value: string | undefined): CapsuleMode | undefined {
  if (!value) return undefined;
  const t = value.trim().toLowerCase() as CapsuleMode;
  return (CAPSULE_MODES as string[]).includes(t) ? t : undefined;
}

function parseMethodList(value: string): VerifyMethod[] {
  const out: VerifyMethod[] = [];
  for (const part of value.split(/[,;]/)) {
    const t = part.trim().toLowerCase();
    const token = (t === 'alternate' || t === 'alt-method' ? 'alt' : t) as VerifyMethod;
    if ((VERIFY_METHOD_TOKENS as string[]).includes(token) && !out.includes(token)) out.push(token);
  }
  return out;
}

function parseVerifyBlock(c: Cursor): VerificationBlock {
  const block: VerificationBlock = { methods: [], status: 'pass', notes: '' };
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();
    if (t === '@endverify' || t === '@verifyend') {
      c.i++;
      break;
    }
    if (isStructural(line) && t !== '@verify') break;
    const methods = readInlineValue(line, 'methods');
    const status = readInlineValue(line, 'status');
    const notes = readInlineValue(line, 'notes');
    const correction = readInlineValue(line, 'correction');
    if (methods !== null) block.methods = parseMethodList(methods);
    else if (status !== null) block.status = status.toLowerCase() === 'fail' ? 'fail' : 'pass';
    else if (notes !== null) block.notes = notes;
    else if (correction !== null) block.correction = correction;
    c.i++;
  }
  return block;
}

function parseUncertaintyBlock(c: Cursor): UncertaintyBlock {
  const block: UncertaintyBlock = { assumptions: [], lowConfidenceSteps: [], studentChecks: [] };
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();
    if (t === '@enduncertainty' || t === '@uncertaintyend') {
      c.i++;
      break;
    }
    if (isStructural(line) && t !== '@uncertainty') break;
    const assumption = readInlineValue(line, 'assumption');
    const low = readInlineValue(line, 'low_confidence');
    const check = readInlineValue(line, 'check');
    if (assumption !== null) block.assumptions.push(assumption);
    else if (low !== null) {
      block.lowConfidenceSteps.push(
        ...low
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else if (check !== null) block.studentChecks.push(check);
    c.i++;
  }
  return block;
}

function parsePatchBlock(
  c: Cursor,
  attrs: Record<string, string>,
  warnings: string[],
  warningCodes: ParseWarningCode[],
): PatchOp {
  const opRaw = (attrs.op || 'replace').toLowerCase();
  const op: PatchOp['op'] =
    opRaw === 'insert' ? 'insert' : opRaw === 'delete' ? 'delete' : 'replace';
  const patch: PatchOp = { op, id: attrs.id, after: attrs.after };
  while (c.i < c.lines.length) {
    const line = c.lines[c.i] ?? '';
    const t = line.trim();
    if (t === '@endpatch' || t === '@patchend') {
      c.i++;
      break;
    }
    if (t === '@step' || /^@step\b/.test(t)) {
      const stepAttrs = parseMarkerAttrs(t);
      c.i++;
      patch.step = parseStep(c, 1, warnings, warningCodes, stepAttrs);
      if (!patch.id && patch.step.id) patch.id = patch.step.id;
      continue;
    }
    if (t === '@solution') {
      c.i++;
      patch.solution = readSolutionBlock(c);
      continue;
    }
    if (t === '@verify' || /^@verify\b/.test(t)) {
      c.i++;
      patch.verification = parseVerifyBlock(c);
      continue;
    }
    if (t === '@uncertainty' || /^@uncertainty\b/.test(t)) {
      c.i++;
      patch.uncertainty = parseUncertaintyBlock(c);
      continue;
    }
    if (isStructural(line) && !/^@step\b/.test(t)) break;
    c.i++;
  }
  return patch;
}

function warnSolutionDiagrams(
  diagrams: Diagram[],
  warnings: string[],
  warningCodes: ParseWarningCode[],
): void {
  for (const diagram of diagrams) {
    if (!isKnownDiagramType(diagram.type)) {
      addWarning(
        warnings,
        warningCodes,
        'unknown_diagram_type',
        `Solution had unknown diagram type "${diagram.type}".`,
      );
    }
    if (isMalformedDiagram(diagram)) {
      addWarning(
        warnings,
        warningCodes,
        'malformed_diagram',
        `Solution had a malformed ${diagram.type} diagram.`,
      );
    }
  }
}

const META_KEY_LINE = /^(version|subject|topic|question|qid|archetype|level|locale|mode)\s*:/i;

function readQuestionContinuations(c: Cursor, first: string): string {
  let value = first;
  while (c.i < c.lines.length) {
    const ml = c.lines[c.i] ?? '';
    const mt = ml.trim();
    if (mt === '@endmeta' || mt === '@metaend') break;
    if (isStructural(ml)) break;
    if (META_KEY_LINE.test(mt)) break;
    if (mt) value = value ? `${value} ${mt}` : mt;
    c.i++;
  }
  return value;
}

/**
 * Count substitution moves. Two "With givens:" plug-ins (or two law=expr=number
 * chains) are the split signal — not raw character count.
 */
export function countBodySubstitutions(body: string): number {
  const withGivens = body.match(/\bWith\b[^:]{0,120}:/gi)?.length ?? 0;
  const plug = body.match(/\$[^$\n]{1,48}\$\s*=\s*[^.=\n]{1,80}=\s*[^.=\n]{0,48}/g)?.length ?? 0;
  return Math.max(withGivens, plug);
}

function bodyPacksMultipleMoves(body: string): boolean {
  const subs = countBodySubstitutions(body);
  if (subs >= 2) return true;
  const sentences = countBodySentences(body);
  if (sentences >= 5 && subs === 0 && body.trim().length > 120) return true;
  return false;
}

/** Parse the capsule body (already-extracted text) into a Capsule. */
export function parseCapsule(
  capsuleText: string,
  opt?: { nestedQuestion?: boolean },
): ParseResult {
  const warnings: string[] = [];
  const warningCodes: ParseWarningCode[] = [];
  const raw = capsuleText;
  const normalizedText = normalizeCapsuleText(capsuleText.replace(/\r\n/g, '\n'));
  const lines = normalizedText.split('\n');
  const c: Cursor = { lines, i: 0 };

  let subject: Subject = 'General';
  let topic = '';
  let metaQuestion = '';
  let version = 1;
  let qid: string | undefined;
  let archetype: Archetype | undefined;
  let level: LevelBand | undefined;
  let locale: string | undefined;
  let mode: CapsuleMode | undefined;
  let sawMeta = false;
  let sawEnd = false;
  const steps: Step[] = [];
  let solution = '';
  let solutionDiagrams: Diagram[] = [];
  const questions: Capsule[] = [];
  const patch: PatchOp[] = [];
  let verification: VerificationBlock | undefined;
  let uncertainty: UncertaintyBlock | undefined;
  let resumeToken: string | undefined;

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
        const q = readInlineValue(ml, 'question');
        const qidV = readInlineValue(ml, 'qid');
        const archV = readInlineValue(ml, 'archetype');
        const levelV = readInlineValue(ml, 'level');
        const localeV = readInlineValue(ml, 'locale');
        const modeV = readInlineValue(ml, 'mode');
        if (v !== null) version = Number(v) || 1;
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
        else if (q !== null) {
          c.i++;
          metaQuestion = readQuestionContinuations(c, q);
          continue;
        }
        else if (qidV !== null) qid = qidV;
        else if (archV !== null) archetype = normalizeArchetype(archV);
        else if (levelV !== null) level = normalizeLevel(levelV);
        else if (localeV !== null) locale = localeV;
        else if (modeV !== null) mode = normalizeMode(modeV);
        c.i++;
      }
      continue;
    }
    if (t === '@step' || /^@step\b/.test(t)) {
      const attrs = parseMarkerAttrs(t);
      c.i++;
      steps.push(parseStep(c, steps.length + 1, warnings, warningCodes, attrs));
      continue;
    }
    if (t === '@solution') {
      c.i++;
      const body = readSolutionBlock(c);
      const extracted = extractSolutionDiagrams(body);
      solution = extracted.text;
      solutionDiagrams = extracted.diagrams;
      warnSolutionDiagrams(solutionDiagrams, warnings, warningCodes);
      continue;
    }
    if (t === '@q' || /^@q\b/.test(t)) {
      const attrs = parseMarkerAttrs(t);
      c.i++;
      const inner: string[] = [];
      while (c.i < c.lines.length) {
        const ql = c.lines[c.i] ?? '';
        const qt = ql.trim();
        if (qt === '@endq' || qt === '@qend') {
          c.i++;
          break;
        }
        if (qt === CAPSULE_END_TOKEN) break;
        inner.push(ql);
        c.i++;
      }
      const innerText = inner.join('\n');
      let wrapped = innerText;
      if (!innerText.includes('@meta')) {
        const headers = [
          `version: ${version}`,
          `subject: ${subject}`,
          `qid: ${attrs.id || qid || `q${questions.length + 1}`}`,
        ];
        const rest: string[] = [];
        for (const il of inner) {
          const it = il.trim();
          if (
            rest.length === 0 &&
            /^(topic|question|archetype|level|locale|mode)\s*:/i.test(it)
          ) {
            headers.push(it);
          } else {
            rest.push(il);
          }
        }
        wrapped = ['@meta', ...headers, '@endmeta', ...rest].join('\n');
      }
      const innerParsed = parseCapsule(
        wrapped.endsWith(CAPSULE_END_TOKEN) ? wrapped : `${wrapped}\n${CAPSULE_END_TOKEN}`,
        { nestedQuestion: true },
      );
      if (innerParsed.capsule) {
        innerParsed.capsule.meta.qid =
          attrs.id || innerParsed.capsule.meta.qid || `q${questions.length + 1}`;
        if (!innerParsed.capsule.meta.subject || innerParsed.capsule.meta.subject === 'General') {
          innerParsed.capsule.meta.subject = subject;
        }
        if (!innerParsed.capsule.meta.locale && locale) {
          innerParsed.capsule.meta.locale = locale;
          applyLocaleStd(innerParsed.capsule);
        }
        questions.push(innerParsed.capsule);
      }
      innerParsed.warningCodes.forEach((code, i) => {
        addWarning(warnings, warningCodes, code, innerParsed.warnings[i] ?? code);
      });
      continue;
    }
    if (t === '@patch' || /^@patch\b/.test(t)) {
      const attrs = parseMarkerAttrs(t);
      c.i++;
      patch.push(parsePatchBlock(c, attrs, warnings, warningCodes));
      continue;
    }
    if (t === '@verify' || /^@verify\b/.test(t)) {
      c.i++;
      verification = parseVerifyBlock(c);
      continue;
    }
    if (t === '@uncertainty' || /^@uncertainty\b/.test(t)) {
      c.i++;
      uncertainty = parseUncertaintyBlock(c);
      continue;
    }
    if (t === '@resume' || /^@resume\b/.test(t)) {
      resumeToken = findResumeToken(t) ?? resumeToken;
      c.i++;
      continue;
    }

    // Unknown top-level line: skip.
    c.i++;
  }

  if (!topic) {
    topic = questions[0]?.meta.topic || steps[0]?.title || 'Study capsule';
    if (!questions.length) {
      addWarning(
        warnings,
        warningCodes,
        'missing_topic',
        'Capsule had no topic; inferred from first step.',
      );
    }
  }

  if (!sawMeta) {
    addWarning(warnings, warningCodes, 'missing_meta', 'Capsule had no @meta block.');
  }
  if (!sawEnd) {
    addWarning(warnings, warningCodes, 'missing_end', 'Capsule had no final @end token.');
  }
  const isPatchOnly = patch.length > 0 && steps.length === 0;
  const isQuestionWrapper = questions.length > 0 && steps.length === 0;
  if (
    !opt?.nestedQuestion &&
    !isPatchOnly &&
    steps.length > 0 &&
    (steps.length < STEP_COUNT_MIN || steps.length > STEP_COUNT_MAX)
  ) {
    addWarning(
      warnings,
      warningCodes,
      'invalid_step_count',
      `Capsule had ${steps.length} step(s); expected ${STEP_COUNT_MIN}-${STEP_COUNT_MAX}.`,
    );
  }
  if (!isPatchOnly && !isQuestionWrapper) {
    if (!verification) {
      addWarning(
        warnings,
        warningCodes,
        'missing_verify',
        'Capsule had no @verify block.',
      );
    }
    if (!uncertainty) {
      addWarning(
        warnings,
        warningCodes,
        'missing_uncertainty',
        'Capsule had no @uncertainty block.',
      );
    }
  }
  const warnedQuality = new Set<string>();
  for (const step of steps) {
    if (bodyPacksMultipleMoves(step.body)) {
      const key = `step_body_too_long:${step.index}`;
      if (!warnedQuality.has(key)) {
        warnedQuality.add(key);
        addWarning(
          warnings,
          warningCodes,
          'step_body_too_long',
          `Step ${step.index} ("${step.title}") packs multiple moves; split into smaller steps.`,
        );
      }
    }
    const qualityCodes = auditStepQuality(step, {
      archetype,
      subject,
      question: metaQuestion,
    });
    if (stepBodyWasSalvaged(step) && !qualityCodes.includes('missing_step_body')) {
      qualityCodes.unshift('missing_step_body');
    }
    for (const code of qualityCodes) {
      const key = `${code}:${step.index}`;
      if (!warnedQuality.has(key)) {
        warnedQuality.add(key);
        addWarning(warnings, warningCodes, code, stepQualityMessage(code, step));
      }
    }
    if (step.quickCheck) {
      for (const code of auditQuickCheck(step.quickCheck, step)) {
        const key = `${code}:${step.index}`;
        if (!warnedQuality.has(key)) {
          warnedQuality.add(key);
          addWarning(warnings, warningCodes, code, quickCheckQualityMessage(code, step));
        }
      }
      if (!isSubstantiveQuickCheck(step.quickCheck)) {
        step.quickCheck = undefined;
      }
    }
  }
  if (!solution && patch.length === 0 && questions.length === 0) {
    addWarning(warnings, warningCodes, 'missing_solution', 'Capsule had no solution block.');
  }

  if (questions.length > 0 && !topic) {
    topic = questions[0]!.meta.topic;
  }

  const capsule: Capsule = {
    meta: {
      version,
      subject,
      topic: stripProtocolMarkers(topic),
      ...(metaQuestion.trim() ? { question: stripProtocolMarkers(metaQuestion) } : {}),
      ...(qid ? { qid } : {}),
      ...(archetype ? { archetype } : {}),
      ...(level ? { level } : {}),
      ...(locale ? { locale } : {}),
      ...(mode ? { mode } : patch.length ? { mode: 'patch' as const } : {}),
    },
    steps: questions[0]?.steps?.length && steps.length === 0 ? questions[0].steps : steps,
    solution:
      questions[0] && !solution
        ? questions[0].solution
        : stripProtocolMarkers(solution),
    solutionDiagrams:
      questions[0] && solutionDiagrams.length === 0
        ? questions[0].solutionDiagrams
        : solutionDiagrams,
    ...(uncertainty ? { uncertainty } : questions[0]?.uncertainty ? { uncertainty: questions[0].uncertainty } : {}),
    ...(verification ? { verification } : questions[0]?.verification ? { verification: questions[0].verification } : {}),
  };

  if (questions.length > 0 && !capsule.meta.qid) {
    capsule.meta.qid = questions[0]!.meta.qid;
  }
  if (questions.length === 1 && !metaQuestion && questions[0]!.meta.question) {
    capsule.meta.question = questions[0]!.meta.question;
  }

  applyLocaleStd(capsule);

  for (const code of auditCapsuleDiagrams(capsule)) {
    const key = `diagram:${code}`;
    if (!warnedQuality.has(key)) {
      warnedQuality.add(key);
      addWarning(warnings, warningCodes, code, diagramQualityMessage(code, capsule));
    }
  }

  const hasQuestions = questions.length > 0 && questions.some((q) => q.steps.length > 0);
  const hasPatch = patch.length > 0;
  if (steps.length === 0 && !solution && !hasQuestions && !hasPatch) {
    const errorCode: ParseErrorCode = sawMeta ? 'no_usable_content' : 'missing_meta';
    return { status: 'empty', warnings, warningCodes, errorCode, raw, resumeToken };
  }

  const usableSteps = capsule.steps.length > 0 || hasPatch;
  const status = usableSteps ? 'ok' : 'partial';
  return {
    status,
    capsule,
    warnings,
    warningCodes,
    raw,
    ...(questions.length > 0 ? { questions } : {}),
    ...(hasPatch ? { patch } : {}),
    ...(resumeToken ? { resumeToken } : {}),
  };
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
