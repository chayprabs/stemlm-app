/**
 * Tolerant readers: a bounded JSON-ish parser and a line reader that understands the ways a spec
 * drifts from `key: value` (bullets, emphasis, other separators, YAML-style nesting).
 *
 * Both are single-pass scanners with explicit size and depth limits; neither backtracks.
 */
import type { Item, Loose, Repair } from './types';

const MAX_LOOSE_DEPTH = 8;
const MAX_LOOSE_NODES = 4096;

class LooseError extends Error {}

/**
 * JSON as models write it: quoted or bare keys, single or double quotes, trailing commas, bare
 * scalars (`{from: A, to: B}`, `[a, b]`), and `(…)` tuples read as arrays. Undefined when the text
 * is not one complete value.
 */
export function parseLoose(source: string): Loose | undefined {
  const text = source.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  let i = 0;
  let nodes = 0;
  /** Arrays made by a repeated object key, as opposed to arrays the source wrote. */
  const repeated = new WeakSet<Loose[]>();
  const fail = (): never => { throw new LooseError(); };
  const skip = () => { while (i < text.length && /\s/.test(text[i]!)) i++; };
  const quoted = (): string => {
    const quote = text[i++]!;
    let out = '';
    while (i < text.length && text[i] !== quote) {
      if (text[i] === '\\' && i + 1 < text.length) {
        const next = text[i + 1]!;
        if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
          out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16));
          i += 6;
          continue;
        }
        // An unknown escape keeps its backslash: LaTeX in a JSON string is written `\frac`, not `\\frac`.
        out += next === 'n' ? '\n' : next === 't' ? '\t' : next === quote || next === '\\' || next === '/' ? next : `\\${next}`;
        i += 2;
        continue;
      }
      out += text[i++];
    }
    if (text[i] !== quote) fail();
    i++;
    return out;
  };
  const bare = (stops: string): Loose => {
    const start = i;
    let parens = 0;
    while (i < text.length) {
      const c = text[i]!;
      if (c === '(') parens++;
      else if (c === ')' && parens > 0) parens--;
      else if (c === '\n' || (parens === 0 && stops.includes(c))) break;
      i++;
    }
    const word = text.slice(start, i).trim();
    if (!word) fail();
    if (word === 'true') return true;
    if (word === 'false') return false;
    if (word === 'null') return null;
    return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(word) ? Number(word) : word;
  };
  const value = (depth: number, stops: string): Loose => {
    if (depth > MAX_LOOSE_DEPTH || ++nodes > MAX_LOOSE_NODES) fail();
    skip();
    const c = text[i];
    if (c === '{') {
      i++;
      const object: Record<string, Loose> = {};
      for (;;) {
        skip();
        if (text[i] === '}') { i++; break; }
        const key = text[i] === '"' || text[i] === "'" ? quoted() : String(bare(':=,}'));
        skip();
        if (text[i] !== ':' && text[i] !== '=') fail();
        i++;
        // A repeated key keeps every value: `{"edge": "A B", "edge": "B C"}` is two records.
        const entry = value(depth + 1, ',}');
        const held = Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
        // Defined, never assigned: a member named `__proto__` is data like any other.
        const set = (member: Loose) => Object.defineProperty(object, key, { value: member, enumerable: true, writable: true, configurable: true });
        if (held === undefined) set(entry);
        else if (Array.isArray(held) && repeated.has(held)) held.push(entry);
        else {
          const all = [held, entry];
          repeated.add(all);
          set(all);
        }
        skip();
        if (text[i] === ',' || text[i] === ';') i++;
        else if (text[i] !== '}') fail();
      }
      return object;
    }
    if (c === '[' || c === '(') {
      const close = c === '[' ? ']' : ')';
      i++;
      const array: Loose[] = [];
      for (;;) {
        skip();
        if (text[i] === close) { i++; break; }
        array.push(value(depth + 1, `,${close}`));
        skip();
        if (text[i] === ',' || text[i] === ';') i++;
        else if (text[i] !== close) fail();
      }
      return array;
    }
    if (c === '"' || c === "'") return quoted();
    return bare(stops);
  };
  try {
    const result = value(0, '');
    skip();
    while (text[i] === ',' || text[i] === ';') { i++; skip(); }
    return i >= text.length ? result : undefined;
  } catch (error) {
    if (error instanceof LooseError) return undefined;
    throw error;
  }
}

export function isRecord(value: Loose | undefined): value is { [key: string]: Loose } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A scalar as spec text; undefined for structure and null. */
export function scalarText(value: Loose | undefined): string | undefined {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/** A field of a record under any of its usual names, case-insensitively. */
export function pick(record: { [key: string]: Loose }, names: readonly string[]): Loose | undefined {
  for (const [key, value] of Object.entries(record)) {
    if (names.includes(key.trim().toLowerCase().replace(/[\s_-]+/g, ''))) return value;
  }
  return undefined;
}

const KEY = String.raw`[A-Za-z][A-Za-z0-9_.-]*`;
const STRICT_DECLARATION = new RegExp(String.raw`^(\s*)(${KEY})\s*:(.*)$`);
/** `X Axis Label: t` and `f(x): x^2`: a key the strict reader rejects, kept only if the family knows it. */
const SPACED_DECLARATION = new RegExp(String.raw`^(\s*)(${KEY}(?: [A-Za-z0-9_.-]+){1,3}|${KEY}\(\w{1,12}\))\s*:(.*)$`);
const ASSIGNMENT = new RegExp(String.raw`^(\s*)(${KEY}(?:\(\w{1,12}\))?)\s*(=>|->|=)\s*(\S.*)$`);
const BARE_DECLARATION = new RegExp(String.raw`^(\s*)(${KEY})[ \t]+(\S.*)$`);
const BULLET = /^(\s*)(?:[-*•+]|\d{1,2}[.)])[ \t]+(\S.*)$/;
const STRICT_ITEM = /^ {2}- \S/;

const indentOf = (line: string) => /^\s*/.exec(line)![0].length;

/** `**key**:`, `**key:**`, `` `key`: ``, `"key":`, and a whole line in backticks. */
function stripEmphasis(line: string): string {
  const whole = /^(\s*)`([^`]+)`\s*$/.exec(line);
  const text = whole ? `${whole[1]}${whole[2]}` : line;
  return text
    .replace(/^(\s*)(\*\*|__)([^*_:]{1,40}?)\s*:\s*\2\s*/, '$1$3: ')
    .replace(/^(\s*)(\*\*|__|[*_`"'])([^*_`"':]{1,40}?)\2\s*:/, '$1$3:');
}

/**
 * Read `text` into items. Lines the strict parser already reads are kept verbatim; a line it
 * rejects is classified if one of the known drifts explains it and carried through untouched if not.
 */
export function readItems(text: string): Item[] {
  const lines = text.split('\n');
  const items: Item[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i]!;
    i++;
    if (!raw.trim() || /^\s*(?:#|\/\/)/.test(raw)) {
      items.push({ form: 'inline', lines: [raw], raw: [raw] });
      continue;
    }
    const pending: Repair[] = [];
    let line = raw;
    let bulletIndent: number | undefined;
    const bullet = BULLET.exec(line);
    if (bullet) {
      bulletIndent = bullet[1]!.length;
      line = `${bullet[1]}${bullet[2]}`;
      pending.push({ code: 'envelope.bullet', from: raw.trim(), to: line.trim() });
    }
    const plain = stripEmphasis(line);
    if (plain !== line) {
      pending.push({ code: 'envelope.emphasis', from: line.trim(), to: plain.trim() });
      line = plain;
    }

    let key: string | undefined;
    let rest = '';
    let sep: Item['sep'];
    let tentative = false;
    const strict = STRICT_DECLARATION.exec(line);
    const spaced = strict ? null : SPACED_DECLARATION.exec(line);
    const assigned = strict || spaced ? null : ASSIGNMENT.exec(line);
    const bareKey = strict || spaced || assigned ? null : BARE_DECLARATION.exec(line);
    if (strict) { key = strict[2]!; rest = strict[3]!.trim(); sep = ':'; }
    else if (spaced) { key = spaced[2]!; rest = spaced[3]!.trim(); sep = ':'; tentative = true; }
    else if (assigned) { key = assigned[2]!; rest = assigned[4]!.trim(); sep = assigned[3] === '=' ? '=' : '->'; tentative = true; }
    else if (bareKey) { key = bareKey[2]!; rest = bareKey[3]!.trim(); sep = ' '; tentative = true; }
    if (!key) {
      // Not a declaration in any notation: the bullet or emphasis reading does not hold either.
      items.push({ form: 'inline', lines: [raw], raw: [raw] });
      continue;
    }
    if (sep !== ':') pending.push({ code: 'envelope.separator', from: line.trim(), to: `${key}: ${rest}` });

    if (rest || tentative) {
      const clean = pending.length === 0;
      items.push({ key, sep, value: rest, form: 'inline', lines: [clean ? raw : `${key}: ${rest}`], raw: [raw], pending, tentative });
      continue;
    }

    // `key:` with nothing after it opens a list or a nested block.
    const base = bulletIndent ?? indentOf(line);
    const block: string[] = [];
    while (i < lines.length) {
      const next = lines[i]!;
      if (!next.trim()) break;
      const nextBullet = BULLET.exec(next);
      const inside = nextBullet
        ? (bulletIndent === undefined ? nextBullet[1]!.length >= base : nextBullet[1]!.length > base)
        : indentOf(next) > base && (bulletIndent !== undefined || STRICT_DECLARATION.test(next) || block.length > 0);
      if (!inside) break;
      block.push(next);
      i++;
    }
    const value = readBlock(block);
    const strictList = block.length > 0 && block.every((entry) => STRICT_ITEM.test(entry)) && Array.isArray(value) && value.every((entry) => typeof entry === 'string');
    const clean = pending.length === 0;
    items.push({
      key,
      sep,
      value: value ?? '',
      form: Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? 'list' : value === undefined ? 'inline' : 'block',
      lines: [clean ? raw : `${key}:`, ...block],
      raw: [raw, ...block],
      pending,
      strictList,
    });
  }
  return items;
}

/** The lines under an empty declaration as a list of strings, a list of maps, or a map. */
function readBlock(block: string[]): Loose | undefined {
  if (!block.length) return undefined;
  const entries: Loose[] = [];
  const map: Record<string, Loose> = {};
  let current: Record<string, Loose> | undefined;
  let listed = false;
  for (const line of block) {
    const bullet = BULLET.exec(line);
    const body = stripEmphasis(bullet ? bullet[2]! : line.trim());
    const pair = STRICT_DECLARATION.exec(body);
    // `- A B: label` is an item whose text contains a colon; `- id: A` followed by `label: …` is a map.
    const mapLike = pair && /^[A-Za-z][A-Za-z0-9_-]*$/.test(pair[2]!) && pair[3]!.trim() !== '';
    if (bullet) {
      listed = true;
      current = undefined;
      if (mapLike && block.some((other) => !BULLET.test(other))) {
        current = { [pair![2]!]: pair![3]!.trim() };
        entries.push(current);
      } else {
        entries.push(body.trim());
      }
    } else if (mapLike) {
      if (current) current[pair![2]!] = pair![3]!.trim();
      else map[pair![2]!] = pair![3]!.trim();
    } else {
      return undefined;
    }
  }
  if (listed) return entries;
  return Object.keys(map).length ? map : undefined;
}
