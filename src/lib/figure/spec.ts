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
  caption?: string;
  highlight: string[];
}

function isListItem(line: string): boolean {
  return /^ {2}- /.test(line);
}

export function parseSpec(type: string, raw: string): SpecDoc {
  const values = new Map<string, string[]>();
  const originals = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let currentListKey: string | null = null;

  const pushVal = (key: string, value: string) => {
    const k = key.toLowerCase();
    originals.set(k, key);
    const list = values.get(k) ?? [];
    list.push(value);
    values.set(k, list);
  };

  for (const line of lines) {
    if (!line.trim()) {
      currentListKey = null;
      continue;
    }
    if (currentListKey && isListItem(line)) {
      const item = line.slice(4).trim();
      if (item) {
        const list = lists.get(currentListKey) ?? [];
        list.push(item);
        lists.set(currentListKey, list);
      }
      continue;
    }
    const m = /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:(.*)$/.exec(line);
    if (!m) {
      currentListKey = null;
      continue;
    }
    const key = m[1]!;
    const rest = (m[2] ?? '').trim();
    if (!rest) {
      currentListKey = key.toLowerCase();
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

  return { raw, type, values, originals, lists, caption, highlight };
}

export function specGet(spec: SpecDoc, key: string): string | undefined {
  return spec.values.get(key.toLowerCase())?.[0];
}

export function specGetAll(spec: SpecDoc, key: string): string[] {
  return spec.values.get(key.toLowerCase()) ?? [];
}

export function specList(spec: SpecDoc, key: string): string[] {
  const fromList = spec.lists.get(key.toLowerCase()) ?? [];
  if (fromList.length) return fromList;
  return specGetAll(spec, key);
}

export function specHas(spec: SpecDoc, key: string): boolean {
  return spec.values.has(key.toLowerCase()) || spec.lists.has(key.toLowerCase());
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
