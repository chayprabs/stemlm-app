/**
 * Foreign-notation ingest: diagram notations chat models already know (Mermaid, Graphviz DOT,
 * Markdown pipe tables, arrow lists) translated into native figure specs, so they are drawn by the
 * deterministic figure compiler rather than by a renderer of their own.
 *
 * Faithful or nothing: a construct whose meaning the native grammar cannot say refuses the whole
 * figure (null); only presentational constructs are dropped, and each is recorded in `notes`.
 */
import type { Diagram } from '@/src/protocol/types';
import { MAX_FOREIGN_CHARS, Refusal, type Translation } from './native';
import { mermaidHeader, translateMermaid } from './mermaid';
import { isDot, translateDot } from './dot';
import { isPipeTable, translateMarkdownTable } from './mdtable';
import { looksLikeArrows, translateArrows } from './arrows';

export type ForeignNotation = 'mermaid' | 'dot' | 'markdown-table' | 'arrows';

export interface ForeignResult {
  diagram: Diagram;
  notation: ForeignNotation;
  notes: string[];
}

/** A translation attempt: the result, or why the source was not translated. */
export interface ForeignOutcome {
  result: ForeignResult | null;
  /** Set when a notation was recognised but refused; absent when the source is simply not foreign. */
  refusal?: { notation: ForeignNotation; reason: string };
}

const MERMAID_NAMES = new Set(['mermaid', 'mmd']);
const DOT_NAMES = new Set(['dot', 'graphviz', 'gv', 'digraph']);
const TABLE_NAMES = new Set(['markdown', 'md', 'table', 'markdown-table']);
/** Fence languages that say nothing about the content. */
const PLAIN_FENCES = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'ascii', 'diagram', 'graph', 'flowchart', 'flow']);
/** Diagram types under which a model writes bare arrow lines. */
const GRAPH_TYPES = new Set(['graph', 'flowchart', 'flow', 'diagram', 'tree', 'network', 'dag', 'state', 'statemachine', 'state-machine', 'fsm', 'automaton', 'arrows', 'text']);
const TABLE_TYPES = new Set(['table', 'matrix', 'grid']);

function usable(source: unknown): source is string {
  return typeof source === 'string' && source.trim() !== '' && source.length <= MAX_FOREIGN_CHARS;
}

function attempt(notation: ForeignNotation, translate: () => Translation, base: Partial<Diagram>): ForeignOutcome {
  try {
    const { type, content, caption, notes } = translate();
    const shown = base.caption ?? caption;
    return {
      result: {
        diagram: { type, content, ...(shown ? { caption: shown } : {}), ...(base.id ? { id: base.id } : {}) },
        notation,
        notes,
      },
    };
  } catch (error) {
    // A Refusal is the translator's verdict; anything else is a defect that must still never escape.
    return { result: null, refusal: { notation, reason: error instanceof Refusal ? error.reason : 'the source could not be parsed' } };
  }
}

const NOT_FOREIGN: ForeignOutcome = { result: null };

/** Notation named by the content alone, for sources nobody labelled. */
function sniff(source: string): ForeignNotation | null {
  if (mermaidHeader(source)) return 'mermaid';
  if (isDot(source)) return 'dot';
  if (isPipeTable(source)) return 'markdown-table';
  return looksLikeArrows(source) ? 'arrows' : null;
}

/** `translateForeignDiagram` with the reason for a refusal, for diagnostics and tests. Never throws. */
export function explainForeignDiagram(diagram: Diagram): ForeignOutcome {
  if (!diagram || !usable(diagram.content)) return NOT_FOREIGN;
  const type = typeof diagram.type === 'string' ? diagram.type.trim().toLowerCase() : '';
  const source = diagram.content;
  if (type === 'svg') return NOT_FOREIGN;
  if (MERMAID_NAMES.has(type)) return attempt('mermaid', () => translateMermaid(source, true), diagram);
  if (DOT_NAMES.has(type)) return attempt('dot', () => translateDot(source), diagram);
  if (mermaidHeader(source)) return attempt('mermaid', () => translateMermaid(source), diagram);
  if (isDot(source)) return attempt('dot', () => translateDot(source), diagram);
  if ((TABLE_NAMES.has(type) || TABLE_TYPES.has(type)) && isPipeTable(source)) return attempt('markdown-table', () => translateMarkdownTable(source), diagram);
  if (GRAPH_TYPES.has(type) && looksLikeArrows(source)) return attempt('arrows', () => translateArrows(source, false), diagram);
  return NOT_FOREIGN;
}

/**
 * A diagram whose declared type or content is a foreign notation -> a native stemLM diagram, or
 * null when it is not foreign or cannot be translated faithfully. Pure, sync, never throws, no DOM.
 */
export function translateForeignDiagram(diagram: Diagram): ForeignResult | null {
  return explainForeignDiagram(diagram).result;
}

function fenceLanguage(info: unknown): string {
  return typeof info === 'string' ? (info.trim().split(/[\s,{}]+/).find(Boolean) ?? '').replace(/^\./, '').toLowerCase() : '';
}

/** `diagramFromFence` with the reason for a refusal. Never throws. */
export function explainFence(lang: string, code: string): ForeignOutcome {
  if (!usable(code)) return NOT_FOREIGN;
  const language = fenceLanguage(lang);
  if (MERMAID_NAMES.has(language)) return attempt('mermaid', () => translateMermaid(code, true), {});
  if (DOT_NAMES.has(language)) return attempt('dot', () => translateDot(code), {});
  if (TABLE_NAMES.has(language)) return isPipeTable(code) ? attempt('markdown-table', () => translateMarkdownTable(code), {}) : NOT_FOREIGN;
  if (!PLAIN_FENCES.has(language)) return NOT_FOREIGN;
  const notation = sniff(code);
  if (notation === 'mermaid') return attempt(notation, () => translateMermaid(code), {});
  if (notation === 'dot') return attempt(notation, () => translateDot(code), {});
  if (notation === 'markdown-table') return attempt(notation, () => translateMarkdownTable(code), {});
  return notation === 'arrows' ? attempt(notation, () => translateArrows(code, true), {}) : NOT_FOREIGN;
}

/**
 * A fenced code block from a plain chat answer (```mermaid, ```dot, ```graphviz, ```text with
 * arrows…) -> a native diagram, or null. `lang` is the fence info string (may be empty).
 */
export function diagramFromFence(lang: string, code: string): ForeignResult | null {
  return explainFence(lang, code).result;
}

/** True when a fenced block is a figure candidate at all (cheap check used while scanning answers). Never throws. */
export function isFigureFence(lang: string, code: string): boolean {
  if (!usable(code)) return false;
  const language = fenceLanguage(lang);
  if (MERMAID_NAMES.has(language) || DOT_NAMES.has(language)) return true;
  if (TABLE_NAMES.has(language)) return isPipeTable(code);
  return PLAIN_FENCES.has(language) && sniff(code) !== null;
}
