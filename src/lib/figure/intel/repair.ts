/**
 * Figure spec repair: rewrite the notation of a `@diagram` spec into the exact grammar the strict
 * compiler reads, without changing what the figure says.
 *
 * The caller compiles the original spec first and asks for a repair only when that fails; the
 * repaired spec must then pass the same strict compiler, so a wrong guess here hides a figure, it
 * never draws one. Even so, every step is meaning-preserving on its own: a key is renamed only to
 * the one key it can mean, a value is rewritten only when its notation has one reading, and a line
 * is dropped only when it restates the family, repeats the previous scalar line, or styles the
 * drawing. Anything else is carried through untouched.
 *
 * Pure, synchronous, deterministic, DOM-free. `repairDiagram` iterates single passes to a fixed
 * point, so its result is idempotent by construction.
 */
import type { Diagram } from '@/src/protocol/types';
import { canonicalizeDiagramType, lookupFamily } from '../catalog';
import { MAX_SPEC_CHARS } from '../spec';
import { closestTarget, foldKey } from './fuzzy';
import { evaluateConstant, formatNumber, freeVariables, inferVariable, isUsableExpression, repairExpression, repairNumber, repairRange } from './expr-repair';
import {
  COMPONENT_LETTERS, parseArrows, parsePipeTable, repairCells, repairDevice, repairEdge, repairForce, repairNode,
  repairPoint, repairProbe, repairRows, repairSegment, repairWire,
} from './records';
import { isRecord, parseLoose, pick, readItems, scalarText } from './structure';
import { MAX_REPAIR_PASSES, type Item, type Loose, type Repair, type RepairCode, type RepairResult } from './types';
import {
  canonicalEnum, compilableFamilies, isDecoration, isEnumScope, isKnownWord, resolveVariant, typeCandidates,
  variantsOf, vocabularyOf, type FamilyVocabulary, type TypeCandidate,
} from './vocabulary';

export type { Repair, RepairCode, RepairResult } from './types';

/** Raised when a structured (JSON/YAML) value has no faithful spelling: the whole repair is abandoned. */
class Unrepairable extends Error {}

type Shape =
  | 'expr' | 'range' | 'pairs' | 'pair' | 'numbers' | 'number' | 'enum' | 'cells' | 'rows' | 'ids' | 'word'
  | 'node' | 'edge' | 'force' | 'point' | 'segment' | 'probe' | 'wire';

/**
 * Value grammar by `family[.variant]` and key, from the SCHEMA lines of core-protocol.md. A key
 * that is not listed is free text or a grammar this layer does not know: its value is left alone.
 */
const SHAPES: Readonly<Record<string, Readonly<Record<string, Shape>>>> = {
  plot: {
    fn: 'expr', fn2: 'expr', domain: 'range', shade: 'range', data: 'pairs', point: 'pair', poles: 'numbers',
    zeros: 'numbers', peaks: 'numbers', kind: 'enum', eq_slot: 'enum', drop: 'enum', highlight: 'ids', var: 'word',
  },
  graph: { node: 'node', edge: 'edge', rankdir: 'enum', highlight: 'ids', start: 'ids', accept: 'ids', decision: 'ids', terminal: 'ids' },
  circuit: { std: 'enum', probe: 'probe', wire: 'wire', highlight: 'ids' },
  'table.matrix': { headers: 'cells', header: 'cells', row: 'cells', rows: 'rows' },
  'table.ice': { species: 'cells', i: 'cells', c: 'cells', e: 'cells' },
  'table.punnett': { cols: 'cells', columns: 'cells', rows: 'cells', cells: 'rows' },
  'scene.fbd': { force: 'force', incline_deg: 'number' },
  'scene.geom': { point: 'point', segment: 'segment' },
  'scene.ray': { f: 'number', do: 'number', ho: 'number' },
  scene: { highlight: 'ids' },
};

/** Keys whose value is prose in every family: never rewritten. */
const TEXT_KEYS = new Set(['caption', 'title', 'label', 'annotate', 'note', 'name', 'text', 'xlabel', 'ylabel', 'eq', 'point_label', 'highlight_row', 'panel']);
/** Keys that name the family rather than declare content (unless the family reads one of them). */
const TYPE_KEYS = new Set(['type', 'diagramtype', 'family', 'figuretype', 'charttype', 'diagram', 'figure']);
/** JSON members that only wrap the spec. */
const WRAPPER_KEYS = new Set(['spec', 'diagram', 'figure', 'content', 'body', 'params', 'parameters', 'props', 'properties', 'attributes', 'config']);

const VALUE_CODES: Readonly<Record<Shape, RepairCode>> = {
  expr: 'value.expr', range: 'value.range', number: 'value.number', numbers: 'value.number', enum: 'value.enum',
  pairs: 'value.list', pair: 'value.list', cells: 'value.list', rows: 'value.list', ids: 'value.list', word: 'value.list',
  node: 'value.record', edge: 'value.record', force: 'value.record', point: 'value.record', segment: 'value.record',
  probe: 'value.record', wire: 'value.record',
};

/** The strict parser's own budgets (spec.ts): a spec beyond them is refused there, so it is not read here. */
const MAX_LINES = 4_096;
const MAX_LINE_CHARS = 8_192;
const MAX_ITEMS = 1_024;
/** Variable inference re-parses each function per candidate letter; real plots hold a handful of curves. */
const MAX_INFERRED_FUNCTIONS = 8;

const DESIGNATOR = /^[RCLVIDMSAQ][A-Za-z0-9_]*$/;
const NETLIST_STOPWORDS = /^(?:is|the|a|an|of|and|are|was|with|for|this|that|has|have)$/i;

/** `R1 in out 1k` without a colon: nodes then at most a short value, never a sentence that starts with a designator. */
function isNetlistLine(key: string, text: string): boolean {
  const words = text.split(/[\s,]+/).filter(Boolean);
  const terminals = /^[AQ]/i.test(key) ? 3 : 2;
  if (words.length < terminals || words.length > terminals + 3) return false;
  if (words.slice(0, terminals).some((word) => NETLIST_STOPWORDS.test(word) || !/^[A-Za-z0-9_+.-]+$/.test(word))) return false;
  return words.slice(terminals).every((word) => /^[\d.+-]/.test(word) || /^(?:dc|ac|npn|pnp|nmos|pmos|open|closed|[a-zµμΩ]{1,3})$/i.test(word));
}
const LOWER_DESIGNATOR = /^[rclvidmsaq](?:\d|_)[A-Za-z0-9_]*$/;
const clip = (text: string) => (text.length > 80 ? `${text.slice(0, 77)}...` : text);

const ENTITIES: Readonly<Record<string, string>> = {
  lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ', minus: '-', times: '×', deg: '°', pi: 'π', middot: '·', le: '≤', ge: '≥', rarr: '→',
};

/* ─────────────────────────────── envelope ─────────────────────────────── */

/** Strip what surrounds a spec rather than belongs to it. Returns the text and any type the wrapper named. */
function cleanEnvelope(content: string, repairs: Repair[]): { text: string; typeHint?: string } {
  let text = content;
  let typeHint: string | undefined;
  const characters = text
    .replace(/\r\n?/g, '\n')
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/[  -   　]/g, ' ')
    .replace(/^[ \t]*\t[ \t]*/gm, (indent) => indent.replace(/\t/g, '  '))
    .replace(/&(#\d{1,6}|#x[0-9a-f]{1,5}|[a-z]{2,6});/gi, (whole, name: string) => {
      const lower = name.toLowerCase();
      if (lower.startsWith('#x')) return String.fromCodePoint(Math.min(0x10ffff, parseInt(lower.slice(2), 16)));
      if (lower.startsWith('#')) return String.fromCodePoint(Math.min(0x10ffff, Number(lower.slice(1))));
      return Object.prototype.hasOwnProperty.call(ENTITIES, lower) ? ENTITIES[lower]! : whole;
    });
  if (characters !== text) {
    repairs.push({ code: 'envelope.characters', from: 'entities or invisible characters', to: 'plain text' });
    text = characters;
  }
  const lines = text.split('\n');
  const isWrapper = (line: string) => /^\s*(?:```|~~~)[\w.+-]*\s*$/.test(line) || /^\s*-{3,}\s*$/.test(line);
  const first = () => lines.findIndex((line) => line.trim());
  const dropped: string[] = [];
  for (let guard = 0; guard < 4; guard++) {
    const at = first();
    if (at < 0) break;
    const opener = /^\s*@diagram\b(.*)$/i.exec(lines[at]!);
    if (opener) typeHint = /\btype\s*[=:]\s*["']?([A-Za-z][\w.-]*)/i.exec(opener[1]!)?.[1] ?? typeHint;
    if (!opener && !isWrapper(lines[at]!)) break;
    dropped.push(...lines.splice(at, 1));
  }
  for (let guard = 0; guard < 4; guard++) {
    let at = lines.length - 1;
    while (at >= 0 && !lines[at]!.trim()) at--;
    if (at < 0 || !(isWrapper(lines[at]!) || /^\s*@(?:enddiagram|diagramend)\s*$/i.test(lines[at]!))) break;
    dropped.push(...lines.splice(at, 1));
  }
  if (dropped.length) {
    repairs.push({ code: 'envelope.wrapper', from: clip(dropped.map((line) => line.trim()).join(' ')), to: '' });
    text = lines.join('\n');
  }
  // `key: value,` on every line (or every line but the last) is object-literal habit, not content.
  const body = text.split('\n');
  const declared = body.map((line, index) => ({ line, index })).filter(({ line }) => line.trim() && !/^\s*(?:#|\/\/|[{}[\]])/.test(line));
  for (const mark of [',', ';']) {
    const trailing = declared.filter(({ line }) => line.trimEnd().endsWith(mark));
    if (declared.length >= 2 && trailing.length >= declared.length - 1 && (trailing.length === declared.length || !declared[declared.length - 1]!.line.trimEnd().endsWith(mark)) && !/^\s*[{[]/.test(text)) {
      for (const { index } of trailing) body[index] = body[index]!.trimEnd().slice(0, -1);
      repairs.push({ code: 'envelope.trailing', from: `trailing "${mark}"`, to: '' });
      text = body.join('\n');
      break;
    }
  }
  return { text, typeHint };
}

/* ─────────────────────────────── document ─────────────────────────────── */

interface Doc {
  items: Item[];
  typeHint?: string;
  /** The source was one JSON value: a value with no faithful spelling abandons the repair. */
  json: boolean;
}

function jsonItems(object: { [key: string]: Loose }, out: Item[] = []): Item[] {
  for (const [key, value] of Object.entries(object)) {
    const inner = typeof value === 'string' && /[\n]|^\s*[{[]/.test(value) ? parseLoose(value.trim()) : value;
    if (WRAPPER_KEYS.has(foldKey(key)) && isRecord(inner)) jsonItems(inner, out);
    else if (WRAPPER_KEYS.has(foldKey(key)) && typeof value === 'string' && /:/.test(value)) out.push(...readItems(value));
    else out.push({ key, sep: ':', value, form: 'json', lines: [], raw: [] });
  }
  return out;
}

function readDocument(text: string, repairs: Repair[]): Doc {
  const trimmed = text.trim();
  if (/^[{[]/.test(trimmed)) {
    const parsed = parseLoose(trimmed);
    const object = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
    if (isRecord(object) && Object.keys(object).length) {
      repairs.push({ code: 'structure.json', from: clip(trimmed), to: 'key: value lines' });
      return { items: jsonItems(object), json: true };
    }
  }
  return { items: readItems(text), json: false };
}

/* ─────────────────────────────── keys ─────────────────────────────── */

interface KeyMatch {
  key: string;
  code?: 'key.alias' | 'key.format' | 'key.fuzzy';
  /** Written as a plural of a repeatable key: the value lists several records. */
  plural: boolean;
}

/** A plural can stand for a key that is read repeatedly, or whose reader is not known (a manifest key). */
function takesPlural(vocab: FamilyVocabulary, key: string): boolean {
  return vocab.keys.get(key) !== 'one';
}

/** The one canonical key `written` can mean for this family, or undefined. */
function resolveKey(vocab: FamilyVocabulary, written: string, fuzzy: boolean): KeyMatch | undefined {
  const lower = written.trim().toLowerCase();
  if (vocab.keys.has(lower)) return { key: lower, plural: false };
  const folded = foldKey(written);
  if (!folded) return undefined;
  const direct = vocab.spellings.get(folded);
  if (direct) {
    const plural = /s$/.test(folded) && !/s$/.test(direct) && takesPlural(vocab, direct);
    return { key: direct, code: foldKey(direct) === folded ? 'key.format' : 'key.alias', plural };
  }
  for (const singular of [folded.replace(/ies$/, 'y'), folded.replace(/es$/, ''), folded.replace(/s$/, '')]) {
    const target = singular !== folded ? vocab.spellings.get(singular) : undefined;
    if (target && takesPlural(vocab, target)) return { key: target, code: 'key.alias', plural: true };
  }
  if (!fuzzy || isKnownWord(folded) || /[\s(]/.test(written.trim())) return undefined;
  const guess = closestTarget(folded, vocab.spellings);
  return guess ? { key: guess, code: 'key.fuzzy', plural: false } : undefined;
}

function shapeOf(vocab: FamilyVocabulary, key: string): Shape | undefined {
  return (vocab.kind ? SHAPES[`${vocab.family}.${vocab.kind}`]?.[key] : undefined) ?? SHAPES[vocab.family]?.[key];
}

/* ─────────────────────────────── values ─────────────────────────────── */

const STRICT_PAIR = /^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*[,;\s]\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/;
const asciiMinus = (text: string) => text.replace(/(^|[\s([,;:=∠@<>])[−–‒](?=\.?\d)/g, '$1-');
const unquote = (text: string) => /^(["'`])(.*)\1$/.exec(text.trim())?.[2]?.trim() ?? text.trim();

function toNumber(value: Loose | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const number = Number(asciiMinus(value.trim()));
  return Number.isFinite(number) ? number : evaluateConstant(value) ?? undefined;
}

function pairText(value: Loose | undefined): string | null {
  const [x, y] = Array.isArray(value) && value.length === 2 ? value.map(toNumber) : isRecord(value) ? [toNumber(pick(value, ['x'])), toNumber(pick(value, ['y']))] : [];
  return x !== undefined && y !== undefined ? `${formatNumber(x)},${formatNumber(y)}` : null;
}

/** `x,y` from `(1, 2)`, `[1, 2]`, `x=1, y=2`, `{x: 1, y: 2}`. */
function repairPair(value: Loose): string | null {
  if (typeof value !== 'string') return pairText(value);
  const text = asciiMinus(value.trim());
  if (STRICT_PAIR.test(text)) return text;
  const bracketed = text.replace(/\(/g, '[').replace(/\)/g, ']');
  return pairText(parseLoose(/^[[{]/.test(bracketed) ? bracketed : /=|:/.test(bracketed) ? `{${bracketed}}` : `[${bracketed}]`));
}

/** `x,y; x,y` from tuples, nested arrays, objects, or `x y, x y`. */
function repairPairs(value: Loose): string | null {
  let parsed: Loose | undefined = value;
  if (typeof value === 'string') {
    const text = asciiMinus(value.trim());
    if (text.split(';').every((pair) => STRICT_PAIR.test(pair))) return text;
    const bracketed = text.replace(/\(/g, '[').replace(/\)/g, ']').replace(/;/g, ',');
    parsed = parseLoose(/^\[\s*[[{]/.test(bracketed) ? bracketed : `[${bracketed}]`);
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) {
      parsed = (parsed as string[]).map((entry) => entry.trim().split(/\s+/));
    }
  }
  if (!Array.isArray(parsed) || !parsed.length) return null;
  const pairs = parsed.map(pairText);
  return pairs.every((pair) => pair !== null) ? pairs.join('; ') : null;
}

function splitTopLevel(text: string): string[] {
  const cut = (delimiters: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let quote = '';
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i]!;
      if (quote) { if (c === quote) quote = ''; continue; }
      if (c === '"') quote = c;
      else if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
      else if (depth === 0 && delimiters.includes(c)) { parts.push(text.slice(start, i)); start = i + 1; }
    }
    parts.push(text.slice(start));
    return parts.map((part) => part.trim()).filter(Boolean);
  };
  const bySemicolon = cut(';');
  return bySemicolon.length > 1 ? bySemicolon : cut(',');
}

interface Env {
  vocab: FamilyVocabulary;
  /** The plot variable in force while expressions are repaired. */
  variable: string;
}

/**
 * One value in the grammar of `shape`. Returns the text unchanged when it is already in that
 * grammar or cannot be read, and null when a structured value has no spelling in it.
 */
function renderRecord(shape: Shape | undefined, key: string, value: Loose, env: Env, listed = false): string[] | null {
  const text = scalarText(value);
  // One piece of a split list must read as a record, or the split itself is in doubt.
  const keep = (repaired: string | null | undefined): string[] | null => (repaired ? [repaired] : !listed && text !== undefined && text !== '' ? [text] : null);
  // Quotes and a trailing comma around a shaped value are object-literal habit; cells and prose keep theirs.
  const bare = text?.replace(/\s*[,;]+$/, '');
  const stripped = bare === undefined || shape === undefined || shape === 'cells' || shape === 'node' || shape === 'edge' ? bare : unquote(bare);
  switch (shape) {
    case 'expr': return keep(stripped === undefined ? null : repairExpression(stripped, env.variable) ?? text);
    case 'range': {
      const source = Array.isArray(value) ? value.map(scalarText).join(', ') : isRecord(value)
        ? [pick(value, ['min', 'from', 'start', 'lo', 'lower', 'xmin']), pick(value, ['max', 'to', 'end', 'hi', 'upper', 'xmax'])].map(scalarText).join(' to ')
        : stripped ?? '';
      const parts = source.replace(/\b[xy]\s*=/gi, ' ').split(/[,;\s]+/).filter(Boolean);
      const native = parts.length === 2 && parts.every((part) => Number.isFinite(Number(part))) && Number(parts[1]) > Number(parts[0]);
      return keep(native && text !== undefined ? stripped : repairRange(source));
    }
    case 'pairs': return keep(repairPairs(stripped ?? value));
    case 'pair': return keep(repairPair(stripped ?? value));
    case 'number': return keep(stripped === undefined ? null : repairNumber(stripped) ?? stripped);
    case 'numbers': {
      const parts = Array.isArray(value) ? value.map(scalarText) : (stripped ?? '').replace(/^[[(]\s*|\s*[\])]$/g, '').split(/[,;\s]+/).filter(Boolean);
      const numbers = parts.map((part) => (part === undefined ? undefined : toNumber(part)));
      if (!numbers.length || numbers.some((number) => number === undefined)) return keep(null);
      return parts.map((part, index) => (Number.isFinite(Number(asciiMinus(part!))) ? asciiMinus(part!) : formatNumber(numbers[index]!)));
    }
    case 'enum': return keep(stripped === undefined ? null : canonicalEnum(`${env.vocab.family}.${key}`, unquote(stripped)) ?? stripped);
    case 'word': return keep(stripped === undefined ? null : unquote(stripped));
    case 'cells': return keep(repairCells(value));
    case 'ids': {
      const list = Array.isArray(value) ? value : /^\[.*\]$/.test(stripped ?? '') ? parseLoose(stripped!) : undefined;
      if (!Array.isArray(list)) return keep(stripped);
      const ids = list.map(scalarText);
      return ids.every((id) => id) ? [ids.join(', ')] : null;
    }
    case 'node': return keep(repairNode(stripped ?? value));
    case 'edge': return repairEdge(stripped ?? value) ?? keep(null);
    case 'force': return keep(repairForce(stripped ?? value));
    case 'point': return keep(repairPoint(stripped ?? value));
    case 'segment': return keep(repairSegment(stripped ?? value));
    case 'probe': return keep(repairProbe(stripped ?? value));
    case 'wire': return keep(repairWire(stripped ?? value));
    default: return keep(text === undefined || TEXT_KEYS.has(key) ? text : asciiMinus(text));
  }
}

/** The records a declaration lists: the elements of an array, the pieces of a plural inline list, or the value itself. */
function recordsOf(item: Item, shape: Shape | undefined, repeatable: boolean, plural: boolean): Loose[] {
  const value = item.value ?? '';
  const whole = shape === 'cells' || shape === 'range' || shape === 'pair' || shape === 'pairs' || shape === 'ids' || shape === 'numbers' || shape === 'rows';
  if (Array.isArray(value)) {
    if (shape === 'cells' && value.length > 0 && value.every(Array.isArray)) return value;
    if (shape === 'pair' && value.every((entry) => Array.isArray(entry) || isRecord(entry))) return value;
    return whole ? [value] : value;
  }
  if (isRecord(value)) {
    // `nodes: {A: Start, B: Stop}` maps ids to labels.
    if (shape === 'node' && Object.values(value).every((entry) => scalarText(entry) !== undefined) && !('id' in value)) {
      return Object.entries(value).map(([id, label]) => ({ id, label }));
    }
    return [value];
  }
  const text = String(value).trim();
  if (!whole && /^\[[\s\S]*\]$/.test(text) && !TEXT_KEYS.has(item.key?.toLowerCase() ?? '')) {
    const parsed = parseLoose(text);
    // A bracketed list of records, or of two or more plain values. One bracketed token is content (`[NH4+]`).
    const listed = Array.isArray(parsed) && parsed.length > 0 && (parsed.every((entry) => typeof entry === 'object' && entry !== null) ? repeatable : shape !== undefined || plural || parsed.length > 1);
    if (listed) return parsed as Loose[];
  }
  if (shape === 'pair' && plural) {
    const tuples = parseLoose(`[${text.replace(/\(/g, '[').replace(/\)/g, ']').replace(/;/g, ',')}]`);
    return Array.isArray(tuples) && tuples.length && tuples.every(Array.isArray) ? tuples : text.split(';').map((part) => part.trim()).filter(Boolean);
  }
  if (plural && !whole) {
    const pieces = splitTopLevel(text);
    // Without a known record grammar, only split when every piece starts like a record (an identifier).
    if (pieces.length > 1 && (shape !== undefined || pieces.every((piece) => /^["'(]?[A-Za-z]/.test(piece)))) return pieces;
  }
  return [text];
}

/* ─────────────────────────────── family structure ─────────────────────────────── */

const decl = (key: string, value: string, raw: string[] = []): Item => ({ key, sep: ':', value, form: 'inline', lines: [`${key}: ${value}`], raw });
const sourceLine = (item: Item) => (item.key === undefined || item.tentative ? item.raw[0] : undefined);

/** Arrow and Mermaid flowchart lines as node / edge / marker records. */
function structureGraph(items: Item[], vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  const out: Item[] = [];
  const labelled = new Set<string>();
  const endpoints = new Set<string>();
  for (const item of items) {
    const line = sourceLine(item)?.trim();
    const known = item.key !== undefined && resolveKey(vocab, item.key, false) !== undefined;
    if (line === undefined || known || !line) { out.push(item); continue; }
    const header = /^(?:graph|flowchart|digraph)\s+(LR|TB|TD)\s*;?$/i.exec(line);
    if (header) {
      out.push(decl('rankdir', header[1]!.toUpperCase(), item.raw));
      repairs.push({ code: 'structure.arrows', from: line, to: `rankdir: ${header[1]!.toUpperCase()}` });
      continue;
    }
    const arrows = parseArrows(line);
    if (!arrows) { out.push(item); continue; }
    const made: Item[] = [];
    for (const node of arrows.nodes) {
      if (node.label !== undefined && !labelled.has(node.id)) made.push(decl('node', node.label && node.label !== node.id ? `${node.id} ${node.label}` : node.id));
      if (node.marker && !labelled.has(node.id)) made.push(decl(node.marker, node.id));
      labelled.add(node.id);
    }
    for (const edge of arrows.edges) {
      made.push(decl('edge', [edge.from, edge.to, edge.label].filter(Boolean).join(' ')));
      endpoints.add(edge.from).add(edge.to);
    }
    repairs.push({ code: 'structure.arrows', from: clip(line), to: clip(made.map((entry) => entry.lines[0]).join(' | ')) });
    out.push(...made);
  }
  for (const item of out) {
    if (item.key === undefined || resolveKey(vocab, item.key, false)?.key !== 'edge') continue;
    for (const record of recordsOf(item, 'edge', true, true)) {
      for (const edge of repairEdge(record) ?? []) edge.split(/\s+/).slice(0, 2).forEach((id) => endpoints.add(id));
    }
  }
  return out.flatMap((item) => {
    const text = scalarText(item.value);
    if (item.key === undefined || item.tentative || text === undefined || resolveKey(vocab, item.key, true)) return [item];
    // `A: Start` beside edges that use A declares the node A.
    if (item.form === 'inline' && endpoints.has(item.key) && text) {
      repairs.push({ code: 'value.record', from: clip(`${item.key}: ${text}`), to: clip(`node: ${item.key} ${text}`) });
      return [decl('node', `${item.key} ${unquote(text)}`, item.raw)];
    }
    // Every edge is drawn as an arrow, so `directed: true` only restates the family.
    if (foldKey(item.key) === 'directed' && /^(?:true|yes|1)$/i.test(text)) {
      repairs.push({ code: 'envelope.redundant', from: `${item.key}: ${text}`, to: '' });
      return [];
    }
    return [item];
  });
}

/** SPICE-style lines, lowercase designators, `resistor: R1 a b 1k`, and component arrays. */
function structureCircuit(items: Item[], _vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  return items.flatMap((item): Item[] => {
    if (item.key === undefined) return [item];
    const text = scalarText(item.value);
    if (Array.isArray(item.value) && ['components', 'devices', 'elements', 'parts', 'netlist'].includes(foldKey(item.key))) {
      const made = item.value.map((entry) => {
        const id = isRecord(entry) ? scalarText(pick(entry, ['id', 'name', 'ref', 'designator', 'label'])) : undefined;
        const body = id && DESIGNATOR.test(id) ? repairDevice(id, entry) : null;
        return body ? decl(id!, body) : null;
      });
      if (made.every((entry): entry is Item => entry !== null) && made.length) {
        repairs.push({ code: 'value.record', from: `${item.key}: [${made.length} records]`, to: 'device lines' });
        return made;
      }
      return [item];
    }
    if (text === undefined) return [item];
    if (DESIGNATOR.test(item.key) || LOWER_DESIGNATOR.test(item.key)) {
      const key = item.key[0]!.toUpperCase() + item.key.slice(1);
      if (item.tentative && !isNetlistLine(key, text)) return [item];
      if (!item.tentative && key === item.key) return [item];
      if (key !== item.key) repairs.push({ code: 'key.format', from: item.key, to: key });
      repairs.push(...(item.pending ?? []));
      return [decl(key, text, item.raw)];
    }
    const letter = Object.prototype.hasOwnProperty.call(COMPONENT_LETTERS, foldKey(item.key)) ? COMPONENT_LETTERS[foldKey(item.key)] : undefined;
    const named = letter ? new RegExp(`^(${letter}[A-Za-z0-9_]*)\\s+(\\S.*)$`).exec(text) : null;
    if (named && !item.tentative) {
      repairs.push({ code: 'value.record', from: clip(`${item.key}: ${text}`), to: clip(`${named[1]}: ${named[2]}`) });
      return [decl(named[1]!, named[2]!, item.raw)];
    }
    return [item];
  });
}

/** Markdown pipe tables and numbered row keys. */
function structureTable(items: Item[], _vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.key !== undefined && /^row[\s_-]?\d{1,3}$/i.test(item.key) && item.form === 'inline') {
      repairs.push({ code: 'key.format', from: item.key, to: 'row' });
      out.push(decl('row', scalarText(item.value) ?? '', item.raw));
      continue;
    }
    const isPipe = (candidate: Item | undefined) => candidate !== undefined && /^\s*\|/.test(sourceLine(candidate) ?? '');
    if (!isPipe(item)) { out.push(item); continue; }
    let end = i;
    while (isPipe(items[end + 1])) end++;
    const table = parsePipeTable(items.slice(i, end + 1).map((entry) => entry.raw[0]!));
    if (!table) { out.push(item); continue; }
    if (table.headers) out.push(decl('headers', table.headers));
    for (const row of table.rows) out.push(decl('row', row));
    repairs.push({ code: 'structure.table', from: clip(item.raw[0]!.trim()), to: `${table.rows.length} rows` });
    i = end;
  }
  return out;
}

/** `clk: p......` (a signal written as its own key) as `signal: clk p......`. */
function structureTiming(items: Item[], vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  return items.map((item) => {
    const text = scalarText(item.value);
    if (item.key === undefined || item.form !== 'inline' || text === undefined || resolveKey(vocab, item.key, false)) return item;
    if (!/^[01hlpxnz.]{2,}$/i.test(text) || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(item.key)) return item;
    repairs.push({ code: 'value.record', from: `${item.key}: ${text}`, to: `signal: ${item.key} ${text}` });
    return decl('signal', `${item.key} ${text}`, item.raw);
  });
}

const STRUCTURES: Readonly<Record<string, (items: Item[], vocab: FamilyVocabulary, repairs: Repair[]) => Item[]>> = {
  graph: structureGraph, circuit: structureCircuit, table: structureTable, timing: structureTiming,
};

function structure(items: Item[], vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  return STRUCTURES[vocab.family]?.(items, vocab, repairs) ?? items;
}

/* ─────────────────────────────── family resolution ─────────────────────────────── */

interface Evidence {
  ok: boolean;
  explained: number;
  unexplained: number;
  hits: number;
}

/** How well a family's vocabulary accounts for the declared keys (no fuzzy matching: evidence must be exact). */
function explain(vocab: FamilyVocabulary, source: Item[], complete = false): Evidence {
  const items = structure(source, vocab, []);
  const present = new Set<string>();
  let explained = 0;
  let unexplained = 0;
  for (const item of items) {
    if (item.key === undefined) continue;
    const folded = foldKey(item.key);
    const match = resolveKey(vocab, item.key, false);
    if (item.tentative && item.sep !== ':' && !(match && (item.sep !== ' ' || vocab.keys.has(item.key.toLowerCase())))) continue;
    if (match) { explained++; present.add(match.key); }
    else if (vocab.family === 'circuit' && DESIGNATOR.test(item.key)) { explained++; present.add('device'); }
    else if (TYPE_KEYS.has(folded) || isDecoration(vocab, item.key, scalarText(item.value) ?? '')) continue;
    else if (complete) return { ok: false, explained, unexplained: 1, hits: 0 };
    else unexplained++;
  }
  const required = vocab.required.filter((key) => key !== 'kind' || !variantsOf(vocab.family));
  const ok = required.every((key) => present.has(key)) && (!vocab.requiredAny.length || vocab.requiredAny.some((key) => present.has(key)));
  const hits = [...new Set([...required, ...vocab.requiredAny])].filter((key) => present.has(key)).length;
  return { ok, explained, unexplained, hits };
}

type KindSource = 'present' | 'alias' | 'type-item' | 'implied' | 'inferred';

interface Resolution {
  vocab: FamilyVocabulary;
  kindSource?: KindSource;
}

const typeItems = (items: Item[], vocab?: FamilyVocabulary) => items.filter((item) => item.key !== undefined && TYPE_KEYS.has(foldKey(item.key)) && scalarText(item.value) !== undefined && !vocab?.spellings.has(foldKey(item.key)));

/** The variant of an engine with variants: declared, implied by the type token, or the only one the keys fit. */
function resolveKind(family: string, items: Item[], implied?: string): { kind: string; source: KindSource } | undefined {
  const variants = variantsOf(family);
  if (!variants) return undefined;
  const declared = items.find((item) => item.key?.toLowerCase() === 'kind' && scalarText(item.value) !== undefined);
  const named = declared ? resolveVariant(family, scalarText(declared.value)!) : undefined;
  if (named) return { kind: named.kind, source: named.exact ? 'present' : 'alias' };
  if (!declared) {
    for (const item of typeItems(items)) {
      const viaType = resolveVariant(family, scalarText(item.value)!);
      if (viaType) return { kind: viaType.kind, source: 'type-item' };
    }
    if (implied && variants[implied]) return { kind: implied, source: 'implied' };
  }
  const fitting = Object.keys(variants).filter((kind) => {
    const evidence = explain(vocabularyOf(family, kind)!, items.filter((item) => item !== declared), true);
    return evidence.ok && evidence.unexplained === 0 && evidence.explained > 0;
  });
  return fitting.length === 1 ? { kind: fitting[0]!, source: 'inferred' } : undefined;
}

function candidateVocabulary(candidate: TypeCandidate, items: Item[]): Resolution | undefined {
  if (!variantsOf(candidate.family)) {
    const vocab = vocabularyOf(candidate.family);
    return vocab ? { vocab } : undefined;
  }
  const kind = resolveKind(candidate.family, items, candidate.kind);
  const vocab = vocabularyOf(candidate.family, kind?.kind);
  return vocab ? { vocab, kindSource: kind?.source } : undefined;
}

/** The family this spec is written for, from its type token and declared keys. Undefined: leave the spec alone. */
function resolveFamily(diagram: Diagram, doc: Doc, repairs: Repair[]): { resolution: Resolution; implied?: string } | undefined {
  const written = typeof diagram.type === 'string' ? diagram.type : '';
  const canonical = canonicalizeDiagramType(written);
  const hatch = canonical === '' || canonical === 'svg' || canonical === 'mermaid';
  if (!hatch && vocabularyOf(canonical)) {
    const resolution = candidateVocabulary({ family: canonical, via: 'alias' }, doc.items);
    return resolution ? { resolution } : undefined;
  }
  // A family the catalog knows but refuses is never turned into another one.
  if (!hatch && lookupFamily(canonical)) return undefined;

  const tokens = [hatch ? '' : written, doc.typeHint ?? '', ...typeItems(doc.items).map((item) => scalarText(item.value)!)].filter(Boolean);
  let candidates: TypeCandidate[] = [];
  let token = written;
  for (const entry of tokens) {
    candidates = typeCandidates(entry);
    if (candidates.length) { token = entry; break; }
  }
  const inferring = candidates.length === 0;
  if (inferring) {
    if (canonical === 'mermaid' && /^\s*(?:graph|flowchart)\b/i.test(doc.items.find((item) => item.raw[0]?.trim())?.raw[0] ?? '')) candidates = [{ family: 'graph', via: 'alias' }];
    else candidates = compilableFamilies().map((family) => ({ family, via: 'alias' as const }));
  }
  let best: { resolution: Resolution; candidate: TypeCandidate; evidence: Evidence } | undefined;
  let tied = false;
  for (const candidate of candidates) {
    const resolution = candidateVocabulary(candidate, doc.items);
    if (!resolution) continue;
    const evidence = explain(resolution.vocab, doc.items, inferring);
    if (!evidence.ok || evidence.explained === 0) continue;
    // With no type token to go on, the family must account for every declared key.
    if (inferring && (evidence.unexplained > 0 || (variantsOf(candidate.family) && !resolution.vocab.kind))) continue;
    const order = best ? (evidence.explained - best.evidence.explained || evidence.hits - best.evidence.hits) : 1;
    if (order > 0) { best = { resolution, candidate, evidence }; tied = false; }
    else if (order === 0 && candidate.family !== best!.candidate.family) tied = true;
  }
  if (!best || tied) return undefined;
  const code: RepairCode = inferring && canonical !== 'mermaid' ? 'type.inferred' : best.candidate.via === 'fuzzy' ? 'type.fuzzy' : 'type.alias';
  repairs.push({ code, from: inferring ? written : token, to: best.resolution.vocab.family });
  return { resolution: best.resolution, implied: best.candidate.kind };
}

/* ─────────────────────────────── per-family repair ─────────────────────────────── */

/** Write the resolved variant as the spec's `kind:` line. */
function applyKind(items: Item[], resolution: Resolution, repairs: Repair[]): Item[] {
  const { vocab, kindSource } = resolution;
  if (!vocab.kind || !kindSource || kindSource === 'present') return items;
  const line = decl('kind', vocab.kind);
  const declared = items.find((item) => item.key?.toLowerCase() === 'kind');
  const viaType = kindSource === 'type-item' ? typeItems(items).find((item) => resolveVariant(vocab.family, scalarText(item.value)!)) : undefined;
  const target = declared ?? viaType;
  const code: RepairCode = kindSource === 'inferred' ? 'kind.inferred' : kindSource === 'implied' ? 'kind.added' : 'kind.alias';
  repairs.push({ code, from: target ? clip(target.lines[0] ?? `${target.key}: ${scalarText(target.value)}`) : '', to: line.lines[0]! });
  if (target) return items.map((item) => (item === target ? { ...line, raw: item.raw } : item));
  return [line, ...items];
}

/** Keys that only make sense together, folded into the one key the plot engine reads. */
function mergePlot(items: Item[], vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  const find = (...names: string[]) => items.find((item) => item.key !== undefined && names.includes(foldKey(item.key)) && item.form !== 'list' && item.form !== 'block');
  const has = (key: string) => items.some((item) => item.key !== undefined && resolveKey(vocab, item.key, false)?.key === key);
  let out = items;
  const replace = (first: Item, second: Item | undefined, made: Item[], code: RepairCode) => {
    repairs.push({ code, from: clip([first, second].filter(Boolean).map((item) => item!.key).join(' + ')), to: clip(made.map((item) => item.lines[0]).join(' | ')) });
    out = out.flatMap((item) => (item === first ? made : item === second ? [] : [item]));
  };
  for (const [low, high] of [['xmin', 'xmax'], ['from', 'to'], ['start', 'end'], ['xstart', 'xend']] as const) {
    const a = find(low);
    const b = find(high);
    const range = a && b && !has('domain') ? repairRange(`${scalarText(a.value) ?? ''} to ${scalarText(b.value) ?? ''}`) : null;
    if (a && b && range) { replace(a, b, [decl('domain', range)], 'key.merged'); break; }
  }
  const column = (item: Item | undefined): Loose[] | undefined => {
    const value = typeof item?.value === 'string' ? parseLoose(/^\[/.test(item.value.trim()) ? item.value.trim() : `[${item.value}]`) : item?.value;
    return Array.isArray(value) && value.length >= 2 && value.every((entry) => toNumber(entry) !== undefined) ? value : undefined;
  };
  const xs = find('x', 'xs', 'xvalues', 'xdata');
  const ys = find('y', 'ys', 'yvalues', 'ydata');
  const [xColumn, yColumn] = [column(xs), column(ys)];
  if (xs && ys && xColumn && yColumn && xColumn.length === yColumn.length && !has('data')) {
    const pairs = xColumn.map((x, index) => `${formatNumber(toNumber(x)!)},${formatNumber(toNumber(yColumn[index])!)}`).join('; ');
    replace(xs, ys, [decl('data', pairs)], 'key.merged');
  }
  const numbers = (item: Item): string[] | undefined => {
    const parts = Array.isArray(item.value) ? item.value.map(scalarText) : (scalarText(item.value) ?? '').replace(/^[[(]\s*|\s*[\])]$/g, '').replace(/\b[xy]\s*=\s*/gi, '').split(/[,;\s]+/).filter(Boolean);
    const values = parts.map((part) => (part === undefined ? undefined : toNumber(part)));
    return values.length && values.every((value) => value !== undefined) ? values.map((value) => formatNumber(value!)) : undefined;
  };
  const rewrites: Array<[RegExp, string, (value: string) => string | undefined]> = [
    [/^(?:verticalasymptotes?|va)$/, 'asymptote', (value) => `x=${value}`],
    [/^(?:horizontalasymptotes?|ha)$/, 'asymptote', (value) => `y=${value}`],
    [/^(?:vlines?|verticallines?|axvline)$/, 'guide', (value) => `vertical=${value}`],
    [/^(?:hlines?|horizontallines?|axhline)$/, 'guide', (value) => `horizontal=${value}`],
  ];
  for (const item of [...out]) {
    if (item.key === undefined || vocab.spellings.has(foldKey(item.key))) continue;
    const folded = foldKey(item.key);
    const rule = rewrites.find(([pattern]) => pattern.test(folded));
    const values = rule ? numbers(item) : undefined;
    if (rule && values) { replace(item, undefined, values.map((value) => decl(rule[1], rule[2](value)!)), 'key.alias'); continue; }
    const axis = /^([xy])scale$/.exec(folded)?.[1];
    const text = (scalarText(item.value) ?? '').toLowerCase();
    const scale = /^(?:log|log10|logarithmic)$/.test(text) ? 'log' : /^(?:linear|lin)$/.test(text) ? 'linear' : undefined;
    if (axis && scale) replace(item, undefined, [decl('scale', `${axis}=${scale}`)], 'key.alias');
  }
  return out;
}

/** Declare the variable the functions are written in, when it is one letter other than x for all of them. */
function declareVariable(items: Item[], vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  const keyOf = (item: Item) => (item.key === undefined ? undefined : resolveKey(vocab, item.key, false)?.key);
  if (items.some((item) => keyOf(item) === 'var')) return items;
  const functions = items.filter((item) => (keyOf(item) === 'fn' || keyOf(item) === 'fn2') && item.lines.length === 1);
  if (functions.length > MAX_INFERRED_FUNCTIONS) return items;
  let variable: string | undefined;
  for (const item of functions) {
    const source = item.lines[0]!.replace(/^[^:]*:\s*/, '');
    const free = isUsableExpression(source) ? freeVariables(source) : null;
    if (free?.has('x')) return items;
    if (free) continue;
    const inferred = inferVariable(source);
    if (!inferred || (variable && variable !== inferred)) return items;
    variable = inferred;
  }
  if (!variable) return items;
  const out: Item[] = [];
  for (const item of items) {
    if (!functions.includes(item)) { out.push(item); continue; }
    const key = item.lines[0]!.slice(0, item.lines[0]!.indexOf(':'));
    const source = item.lines[0]!.replace(/^[^:]*:\s*/, '');
    const repaired = repairExpression(source, variable);
    if (repaired === null) return items;
    if (repaired !== source) repairs.push({ code: 'value.expr', from: clip(source), to: clip(repaired) });
    out.push({ ...item, lines: [`${key}: ${repaired}`] });
    if (item === functions[functions.length - 1]) out.push(decl('var', variable));
  }
  repairs.push({ code: 'value.var', from: '', to: `var: ${variable}` });
  return out;
}

/** One declaration in the family's grammar: canonical key, value in the key's shape, list form the key reads. */
function repairItem(source: Item, env: Env, doc: Doc, repairs: Repair[]): Item[] {
  const { vocab } = env;
  if (source.key === undefined) return [source];
  const written = source.key.trim();
  const folded = foldKey(written);
  const text = scalarText(source.value);
  const circuitDevice = vocab.family === 'circuit' && DESIGNATOR.test(written);
  let match = circuitDevice ? undefined : resolveKey(vocab, written, !source.tentative);
  // `equation:` beside an `fn:` is the curve's label or a second curve; only alone is it the function.
  if (match?.key === 'fn' && /^(?:equation|formula|expression|expr|curve)$/.test(folded) && doc.items.some((other) => other !== source && other.key !== undefined && /^(?:fn|function|func|f|y)$/.test(foldKey(other.key)))) match = undefined;
  if (source.tentative) {
    // `key value` with no separator is only trusted for a key written exactly as the family spells it.
    // (A netlist line was already confirmed, or refused, by structureCircuit.)
    const holds = !circuitDevice && match && (source.sep !== ' ' || (written === match.key && !TEXT_KEYS.has(match.key)));
    if (!holds) return [{ form: 'inline', lines: [...source.raw], raw: source.raw }];
  }
  if (source.pending?.length) repairs.push(...source.pending);
  const item: Item = { ...source, pending: [], tentative: false };

  if (!match && !circuitDevice) {
    if (text !== undefined && TYPE_KEYS.has(folded)) {
      // `type: scatter` in a plot names the plot kind; `type: plot` only restates the family.
      const kind = vocab.keys.has('kind') && isEnumScope(`${vocab.family}.kind`) ? canonicalEnum(`${vocab.family}.kind`, text) : undefined;
      if (kind && !doc.items.some((other) => other.key?.toLowerCase() === 'kind')) {
        repairs.push({ code: 'key.alias', from: clip(`${written}: ${text}`), to: `kind: ${kind}` });
        return [decl('kind', kind, item.raw)];
      }
      if (typeCandidates(text).some((candidate) => candidate.family === vocab.family)) {
        repairs.push({ code: 'envelope.redundant', from: clip(`${written}: ${text}`), to: '' });
        return [];
      }
    }
    // A JSON `id` restates the id of the `@diagram` marker; presentation keys say nothing the compiler draws.
    if (text !== undefined && (isDecoration(vocab, written, text) || (doc.json && folded === 'id'))) {
      repairs.push({ code: 'envelope.redundant', from: clip(`${written}: ${text}`), to: '' });
      return [];
    }
    if (doc.json) throw new Unrepairable();
    return [item];
  }

  const key = match?.key ?? written;
  // An unchanged key keeps its own spelling (`L: 6` stays `L: 6`; the strict reader ignores case).
  const outKey = match?.code ? key : written;
  const shape = circuitDevice ? undefined : shapeOf(vocab, key);
  const arity = vocab.keys.get(key);
  const repeatable = arity === 'many' || arity === 'list' || Boolean(match?.plural);
  let lines: string[];
  let count = 1;
  if (shape === 'rows') {
    const rows = item.strictList ? null : repairRows(item.value ?? '');
    if (rows) lines = [`${outKey}:`, ...rows.map((row) => `  - ${row}`)];
    else if (item.form === 'json' || item.form === 'block') throw new Unrepairable();
    else lines = [item.form === 'inline' ? `${outKey}: ${text ?? ''}` : `${outKey}:`, ...item.lines.slice(1)];
  } else {
    const records = circuitDevice ? [item.value ?? ''] : recordsOf(item, shape, repeatable, match?.plural ?? false);
    const rendered: string[] = [];
    for (const record of records) {
      const body = circuitDevice ? repairDevice(written, record) : null;
      const listed = records.length > 1 && shape !== undefined && VALUE_CODES[shape] === 'value.record';
      const made = circuitDevice ? (body ? [body] : text ? [text] : null) : renderRecord(shape, key, record, env, listed);
      if (!made) {
        if (item.form !== 'inline') throw new Unrepairable();
        return [source.pending?.length ? item : source];
      }
      rendered.push(...made);
    }
    count = records.length;
    if (item.form === 'inline' && !match?.code && !source.tentative && !source.pending?.length && rendered.length === 1 && rendered[0] === text) return [source];
    if (item.form === 'list' && arity === 'list' && shape === undefined) lines = [`${outKey}:`, ...rendered.map((entry) => `  - ${entry}`)];
    // Several values under a key the family reads once: its comma list.
    else if (rendered.length > 1 && !repeatable && shape !== 'numbers') lines = [`${outKey}: ${rendered.join(', ')}`];
    else lines = rendered.map((entry) => `${outKey}: ${entry}`);
  }
  if (lines.join('\n') === source.lines.join('\n')) return [item];

  if (match?.code) repairs.push({ code: match.code, from: written, to: key });
  const before = item.form === 'inline' ? text ?? '' : item.lines.slice(1).map((line) => line.trim()).join(' ');
  const after = lines.map((line) => line.replace(/^[^:]*:\s?/, '')).join(' | ');
  if (item.form === 'list' || item.form === 'block') repairs.push({ code: item.form === 'list' ? 'structure.list' : 'structure.yaml', from: clip(item.raw.map((line) => line.trim()).join(' ')), to: clip(lines.join(' | ')) });
  else if (item.form === 'inline' && before !== after) repairs.push({ code: shape ? VALUE_CODES[shape] : circuitDevice ? 'value.record' : count > 1 || lines.length > 1 ? 'value.list' : 'value.number', from: clip(before), to: clip(after) });
  return [{ ...item, key, sep: ':', lines }];
}

/** Repeating a scalar declaration word for word says nothing new; the strict reader rejects the repeat. */
function dropRepeats(items: Item[], vocab: FamilyVocabulary, repairs: Repair[]): Item[] {
  const out: Item[] = [];
  for (const item of items) {
    const previous = out[out.length - 1];
    const scalar = item.key !== undefined && (vocab.keys.get(item.key.toLowerCase()) === 'one' || (vocab.family === 'circuit' && DESIGNATOR.test(item.key)));
    if (previous && scalar && item.lines.length === 1 && previous.lines.length === 1 && previous.lines[0]!.trim() === item.lines[0]!.trim()) {
      repairs.push({ code: 'envelope.redundant', from: clip(item.lines[0]!.trim()), to: '' });
      continue;
    }
    out.push(item);
  }
  return out;
}

function applyFamily(resolution: Resolution, implied: string | undefined, doc: Doc, repairs: Repair[]): Item[] {
  const { vocab } = resolution;
  let items = structure(doc.items, vocab, repairs);
  items = applyKind(items, resolution, repairs);
  if (vocab.family === 'plot') {
    items = mergePlot(items, vocab, repairs);
    if (implied && isEnumScope('plot.kind') && !items.some((item) => item.key?.toLowerCase() === 'kind')) {
      items = [decl('kind', implied), ...items];
      repairs.push({ code: 'kind.added', from: '', to: `kind: ${implied}` });
    }
  }
  const declaredVariable = vocab.family === 'plot' ? items.find((item) => item.key !== undefined && resolveKey(vocab, item.key, false)?.key === 'var') : undefined;
  const env: Env = { vocab, variable: unquote(scalarText(declaredVariable?.value) ?? 'x').toLowerCase() || 'x' };
  const scoped: Doc = { ...doc, items };
  items = items.flatMap((item) => repairItem(item, env, scoped, repairs));
  if (vocab.family === 'plot') items = declareVariable(items, vocab, repairs);
  return dropRepeats(items, vocab, repairs);
}

/* ─────────────────────────────── entry ─────────────────────────────── */

function repairOnce(diagram: Diagram): RepairResult {
  const unchanged: RepairResult = { diagram, repairs: [] };
  if (!diagram || typeof diagram.content !== 'string' || diagram.content.length > MAX_SPEC_CHARS) return unchanged;
  const type = canonicalizeDiagramType(diagram.type);
  if (/<svg\b/i.test(diagram.content) || (type === 'svg' && !/[:=]/.test(diagram.content))) return unchanged;
  const repairs: Repair[] = [];
  try {
    const envelope = cleanEnvelope(diagram.content, repairs);
    const lines = envelope.text.split('\n');
    if (lines.length > MAX_LINES || lines.some((line) => line.length > MAX_LINE_CHARS)) return unchanged;
    const doc = readDocument(envelope.text, repairs);
    if (doc.items.filter((item) => item.key !== undefined).length > MAX_ITEMS) return unchanged;
    doc.typeHint = envelope.typeHint;
    const resolved = resolveFamily(diagram, doc, repairs);
    // Without a family there is no grammar to repair toward; a JSON body stays as it was written.
    if (!resolved && doc.json) return unchanged;
    const items = resolved ? applyFamily(resolved.resolution, resolved.implied, doc, repairs) : doc.items.map((item): Item => {
      if (item.tentative) return { form: 'inline', lines: [...item.raw], raw: item.raw };
      repairs.push(...(item.pending ?? []));
      return item;
    });
    const content = items.flatMap((item) => item.lines).join('\n');
    const family = resolved?.resolution.vocab.family ?? diagram.type;
    if ((content === diagram.content && family === diagram.type) || !repairs.length) return unchanged;
    if (content.length > MAX_SPEC_CHARS) return unchanged;
    return { diagram: { ...diagram, type: family, content }, repairs };
  } catch {
    // Unrepairable structure, or anything unforeseen in hostile input: the spec goes back as it came.
    return unchanged;
  }
}

/**
 * The spec in the strict compiler's notation, with the list of what was normalised.
 * Pure, synchronous, deterministic and idempotent: repairing a repaired diagram returns it with no repairs.
 * Never throws; input it cannot read is returned as it came.
 */
export function repairDiagram(diagram: Diagram): RepairResult {
  let current = diagram;
  const repairs: Repair[] = [];
  for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
    const step = repairOnce(current);
    if (!step.repairs.length) {
      if (!repairs.length) return { diagram, repairs };
      const caption = /^\s*caption\s*:\s*(\S.*)$/im.exec(current.content)?.[1]?.trim();
      return { diagram: current.caption === undefined && caption ? { ...current, caption } : current, repairs };
    }
    repairs.push(...step.repairs);
    current = step.diagram;
  }
  // A spec that keeps changing is not understood: hand back the original rather than a half-normalised one.
  return { diagram, repairs: [] };
}
