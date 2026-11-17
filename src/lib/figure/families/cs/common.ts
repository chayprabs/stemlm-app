/** Helpers shared by the computer-science families (sequence, truth, logic, tree). */
import { FONT_MIN, type CompileResult } from '../../types';
import { measureText } from '../../geom';
import { specGetAll, specList, type SpecDoc } from '../../spec';

/** Height of one line of label text at the figure font. */
export const TEXT_H = measureText('0', FONT_MIN).h;

/** Stacked label lines closer than this are moved apart by the label kernel, so nothing is set tighter. */
export const LINE_PITCH = Math.ceil(TEXT_H) + 1;

export function textWidth(text: string): number {
  return measureText(text, FONT_MIN).w;
}

export function fail(reason: string, code: 'malformed' | 'refused' = 'malformed'): CompileResult {
  return { ok: false, code, reason };
}

/** One pair of wrapping quotes or backticks is notation, not content. */
export function unquote(text: string): string {
  const trimmed = text.trim();
  const match = /^(["'`“”‘’])([\s\S]*)(["'`“”‘’])$/.exec(trimmed);
  return match && match[2] !== undefined && !/["“”]/.test(match[2]) ? match[2].trim() : trimmed;
}

/**
 * A list value: commas (or semicolons) separate items, else whitespace does. Wrapping brackets, quotes and a
 * trailing separator are notation. An empty slot between two separators is kept as '' so a caller can decide
 * whether a hole means something.
 */
export function splitItems(value: string): string[] {
  const body = value.trim().replace(/^[[({]\s*/, '').replace(/\s*[\])}]$/, '');
  const parts = /[,;]/.test(body) ? body.split(/[,;]/) : body.split(/\s+/);
  const items = parts.map((part) => unquote(part));
  while (items.length && !items[items.length - 1]) items.pop();
  return items;
}

export interface SpecEntry {
  key: string;
  value: string;
}

/**
 * The declarations of `keys` in source order. `SpecDoc` groups values by key, which loses the order between
 * different keys; a sequence diagram's messages, replies and notes are one ordered story.
 */
export function orderedEntries(spec: SpecDoc, keys: readonly string[]): SpecEntry[] {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  // Reading through the spec API is what certifies the keys as consumed.
  for (const key of wanted) {
    specGetAll(spec, key);
    specList(spec, key);
  }
  const entries: SpecEntry[] = [];
  let listKey: string | null = null;
  for (const line of spec.raw.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim()) {
      listKey = null;
      continue;
    }
    if (listKey && /^ {2}- /.test(line)) {
      if (wanted.has(listKey)) entries.push({ key: listKey, value: line.slice(4).trim() });
      continue;
    }
    const match = /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:(.*)$/.exec(line);
    if (!match) {
      listKey = null;
      continue;
    }
    const key = match[1]!.toLowerCase();
    const rest = match[2]!.trim();
    if (!rest) {
      listKey = key;
      continue;
    }
    listKey = null;
    if (wanted.has(key)) entries.push({ key, value: rest });
  }
  return entries;
}

function clipLine(line: string, maxWidth: number): string {
  const width = textWidth(line);
  if (width <= maxWidth) return line;
  // Start near the answer: trimming one character at a time from a very long line is quadratic.
  let kept = line.slice(0, Math.ceil((line.length * maxWidth) / width) + 2);
  while (kept.length > 1 && textWidth(`${kept}…`) > maxWidth) kept = kept.slice(0, -1).trimEnd();
  return `${kept}…`;
}

/** Greedy word wrap to at most `maxLines` lines no wider than `maxWidth`; what does not fit ends in an ellipsis. */
export function wrapText(text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || textWidth(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  const kept = lines.length > maxLines ? [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')] : lines;
  return kept.map((line) => clipLine(line, maxWidth));
}

export function isClipped(lines: string[]): boolean {
  return lines.some((line) => line.endsWith('…'));
}
