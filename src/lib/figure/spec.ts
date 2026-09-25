/**
 * Line-oriented Declarative Scene Spec parser.
 * key: value (value = rest of line); 2-space "- item" lists; repeated keys collected.
 */
export interface SpecDoc {
  raw: string;
  type: string;
  /** Lowercased key → values in appearance order. */
  values: Map<string, string[]>;
  /** Lowercased key → original key spelling. */
  originals: Map<string, string>;
  lists: Map<string, string[]>;
  /** Key declarations with no inline value and no non-empty list item. */
  emptyDeclarations: Map<string, number>;
  /** Non-comment source lines that could not be parsed as declarations. */
  invalidDeclarations: string[];
  caption?: string;
  highlight: string[];
  /** Optional per-compilation read certificate: scalar reads consume one value. */
  consumed?: Map<string, number>;
}

/** Bound attacker-controlled spec work before any repeated-key or list allocation. */
export const MAX_SPEC_CHARS = 64_000;
const MAX_SPEC_LINES = 4_096;
const MAX_SPEC_LINE_CHARS = 8_192;
const MAX_SPEC_ENTRIES = 1_024;

function assertSpecBudget(raw: string): void {
  if (typeof raw !== 'string' || raw.length > MAX_SPEC_CHARS) {
    throw new Error('spec input exceeds the maximum size');
  }
}

function isListItem(line: string): boolean {
  return /^ {2}- /.test(line);
}

export function parseSpec(type: string, raw: string): SpecDoc {
  assertSpecBudget(raw);
  const values = new Map<string, string[]>();
  const originals = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const emptyDeclarations = new Map<string, number>();
  const invalidDeclarations: string[] = [];
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > MAX_SPEC_LINES) {
    throw new Error('spec input exceeds the maximum line count');
  }
  let currentListKey: string | null = null;
  let currentListPopulated = false;
  let entryCount = 0;

  const pushVal = (key: string, value: string) => {
    const k = key.toLowerCase();
    originals.set(k, key);
    const list = values.get(k) ?? [];
    list.push(value);
    values.set(k, list);
  };

  for (const line of lines) {
    if (line.length > MAX_SPEC_LINE_CHARS) {
      throw new Error('spec line exceeds the maximum size');
    }
    if (!line.trim()) {
      currentListKey = null;
      continue;
    }
    if (currentListKey && isListItem(line)) {
      const item = line.slice(4).trim();
      if (!item) throw new Error('spec list item must not be empty');
      if (item) {
        if (!currentListPopulated) {
          const emptyCount = emptyDeclarations.get(currentListKey) ?? 0;
          if (emptyCount <= 1) emptyDeclarations.delete(currentListKey);
          else emptyDeclarations.set(currentListKey, emptyCount - 1);
          currentListPopulated = true;
        }
        const list = lists.get(currentListKey) ?? [];
        list.push(item);
        lists.set(currentListKey, list);
      }
      continue;
    }
    const m = /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:(.*)$/.exec(line);
    if (!m) {
      if (/^\s*(?:#|\/\/)/.test(line)) continue;
      invalidDeclarations.push(line);
      currentListKey = null;
      continue;
    }
    const key = m[1]!;
    const rest = (m[2] ?? '').trim();
    entryCount += 1;
    if (entryCount > MAX_SPEC_ENTRIES) {
      throw new Error('spec input exceeds the maximum entry count');
    }
    if (!rest) {
      currentListKey = key.toLowerCase();
      currentListPopulated = false;
      emptyDeclarations.set(currentListKey, (emptyDeclarations.get(currentListKey) ?? 0) + 1);
      continue;
    }
    currentListKey = null;
    pushVal(key, rest);
  }

  const caption = values.get('caption')?.[0];
  const highlightRaw = values.get('highlight')?.[0] ?? '';
  const highlight = highlightRaw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { raw, type, values, originals, lists, emptyDeclarations, invalidDeclarations, caption, highlight };
}

export function specGet(spec: SpecDoc, key: string): string | undefined {
  if (spec.values.has(key.toLowerCase())) consume(spec, key, 1);
  return spec.values.get(key.toLowerCase())?.[0];
}

export function specGetAll(spec: SpecDoc, key: string): string[] {
  if (spec.values.has(key.toLowerCase())) consume(spec, key, spec.values.get(key.toLowerCase())!.length);
  return spec.values.get(key.toLowerCase()) ?? [];
}

export function specList(spec: SpecDoc, key: string): string[] {
  const fromList = spec.lists.get(key.toLowerCase()) ?? [];
  if (fromList.length) {
    consume(spec, key, fromList.length);
    return fromList;
  }
  return specGetAll(spec, key);
}

function consume(spec: SpecDoc, key: string, count: number): void {
  const k = key.toLowerCase();
  spec.consumed?.set(k, Math.max(count, spec.consumed.get(k) ?? 0));
}

/** Reject data that the selected compiler did not read, including repeated scalars. */
export function unconsumedDeclarations(spec: SpecDoc): string[] {
  if (!spec.consumed) return [];
  const keys = new Set([...spec.values.keys(), ...spec.lists.keys(), ...spec.emptyDeclarations.keys()]);
  return [...keys].filter(key => {
    const count = (spec.values.get(key)?.length ?? 0) + (spec.lists.get(key)?.length ?? 0);
    return spec.emptyDeclarations.has(key) || count > (spec.consumed!.get(key) ?? 0);
  });
}

export function specHas(spec: SpecDoc, key: string): boolean {
  return spec.values.has(key.toLowerCase()) || spec.lists.has(key.toLowerCase());
}

export function specHasEmptyDeclaration(spec: SpecDoc, key: string): boolean {
  return (spec.emptyDeclarations.get(key.toLowerCase()) ?? 0) > 0;
}

export function specHasEmptyDelimitedValue(spec: SpecDoc, key: string, separators = /[,;]/): boolean {
  if (specHasEmptyDeclaration(spec, key)) return true;
  const values = [...specGetAll(spec, key), ...(spec.lists.get(key.toLowerCase()) ?? [])];
  return values.some((value) => value.split(separators).some((part) => !part.trim()));
}

export function specNumber(spec: SpecDoc, key: string, fallback?: number): number | undefined {
  const raw = specGet(spec, key);
  if (raw === undefined) return fallback;
  const n = Number(String(raw).replace(/[^0-9eE.+-].*$/, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function specIds(spec: SpecDoc): string[] {
  const ids = new Set<string>();
  for (const key of spec.values.keys()) ids.add(key);
  for (const key of spec.lists.keys()) ids.add(key);
  for (const h of spec.highlight) ids.add(h.toLowerCase());
  for (const nodes of specGetAll(spec, 'node')) {
    const id = nodes.trim().split(/\s+/)[0];
    if (id) ids.add(id.toLowerCase());
  }
  return [...ids];
}

export function parseCsv(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function parsePair(value: string): { x: number; y: number } | null {
  const m = /(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/.exec(value);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]) };
}
