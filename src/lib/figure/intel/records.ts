/**
 * Record notation -> the record grammar of the five engines.
 *
 * Each function takes a record as written (text, or a JSON/YAML object) and returns it in the
 * grammar its engine reads, the same text when it is already in that grammar, or null when the
 * notation has more than one reading. Nothing is added: a missing field stays missing.
 */
import type { Loose } from './types';
import { isRecord, parseLoose, pick, scalarText } from './structure';

const ID = String.raw`[A-Za-z0-9_][A-Za-z0-9_.'’]*`;
const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`;
const unquote = (text: string) => /^(["'])(.*)\1$/.exec(text.trim())?.[2]?.trim() ?? text.trim();
const minus = (text: string) => text.replace(/[−‒﹣－]/g, '-').replace(/(^|[\s(,;=])–(?=[\d.])/g, '$1-');

/* ───────────────────────── graph: SCHEMA graph key=node / key=edge ───────────────────────── */

export interface ArrowLine {
  nodes: Array<{ id: string; label?: string; marker?: 'decision' | 'terminal' }>;
  edges: Array<{ from: string; to: string; label?: string }>;
}

const NODE_SEGMENT = new RegExp(String.raw`^(${ID})(?:\(\[(.+)\]\)|\(\((.+)\)\)|\{\{?(.+?)\}?\}|\[(.+)\]|\((.+)\))?$`);
const PLAIN_ARROW = /\s*(<-{1,2}|-{1,2}>|={1,2}>|→|⟶|⇒|➜)\s*(?:\|([^|]{0,80})\|)?\s*/;

/** `weight=4`, `label="x"`, `[4]`, `(4)`, `"x"` -> the label text. */
function edgeLabel(written: string): string {
  let text = written.trim().replace(/^[[(]\s*(.*?)\s*[\])]$/, '$1');
  text = text.replace(/^(?:label|weight|w|cost|text|name)\s*[=:]\s*/i, '');
  return unquote(text);
}

/**
 * Arrow notation: `A -> B`, `A --> B: label`, `A -- label --> B`, `A -[4]-> B`, `A ->|yes| B`,
 * chains `A -> B -> C`, and Mermaid node shapes `A[Start]`, `B{Test?}`, `C([Stop])`. Undirected
 * (`A -- B`) and two-way (`A <-> B`) links are refused: the engine draws every edge as one arrow.
 */
export function parseArrows(line: string): ArrowLine | null {
  let text = line.trim().replace(/;$/, '').trim();
  if (text.length > 400 || /<-+>|<=+>|↔|⇔/.test(text)) return null;
  text = text
    .replace(/(?<=\s)[-=]{2,3}\s*([^\s\-=<>|][^\-=<>|]{0,60}?)\s*[-=]{1,3}>/g, ' ->|$1| ')
    .replace(/(?<=\s)-[[(]([^\])\-<>|]{1,60})[\])]-{1,2}>/g, ' ->|$1| ')
    .replace(/(?<=\s)-([^\s\-=<>|[\]()]{1,24})-{1,2}>/g, ' ->|$1| ');
  const parts = text.split(new RegExp(PLAIN_ARROW.source, 'g'));
  if (parts.length < 4) return null;
  const result: ArrowLine = { nodes: [], edges: [] };
  const segments: string[] = [];
  const arrows: Array<{ reverse: boolean; label?: string }> = [];
  for (let k = 0; k < parts.length; k += 3) {
    segments.push((parts[k] ?? '').trim());
    if (k + 1 < parts.length) arrows.push({ reverse: parts[k + 1]!.startsWith('<'), label: parts[k + 2]?.trim() || undefined });
  }
  // The last segment may carry the edge label: `B: label`, `B (4)`, `B, label`, `B label words`.
  let trailing: string | undefined;
  const last = segments[segments.length - 1]!;
  const tail = new RegExp(String.raw`^(${ID}(?:[[({]\S*[\])}])?)\s*(?::|,|\||\s)\s*(\S.*)$`).exec(last);
  if (tail && !NODE_SEGMENT.test(last)) {
    segments[segments.length - 1] = tail[1]!;
    trailing = edgeLabel(tail[2]!);
    if (arrows.length !== 1 || arrows[0]!.label || !trailing) return null;
  }
  const ids: string[] = [];
  for (const segment of segments) {
    const match = NODE_SEGMENT.exec(segment);
    if (!match) return null;
    const label = match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6];
    const marker = match[2] !== undefined ? 'terminal' as const : match[4] !== undefined ? 'decision' as const : undefined;
    ids.push(match[1]!);
    if (label !== undefined) result.nodes.push({ id: match[1]!, label: unquote(label), marker });
  }
  arrows.forEach((arrow, k) => {
    const [from, to] = arrow.reverse ? [ids[k + 1]!, ids[k]!] : [ids[k]!, ids[k + 1]!];
    result.edges.push({ from, to, label: arrow.label ? edgeLabel(arrow.label) : trailing });
  });
  return result;
}

const edgeText = (from: string, to: string, label?: string) => [from, to, ...(label ? [label] : [])].join(' ');
const isId = (text: string | undefined): text is string => Boolean(text && new RegExp(`^${ID}$`).test(text));

/** One `edge:` value as the engine's `from to [label]` records (a chain yields several). */
export function repairEdge(value: Loose): string[] | null {
  if (isRecord(value)) {
    const from = scalarText(pick(value, ['from', 'source', 'src', 'start', 'u', 'tail']));
    const to = scalarText(pick(value, ['to', 'target', 'dst', 'dest', 'end', 'v', 'head']));
    const label = scalarText(pick(value, ['label', 'weight', 'w', 'text', 'name', 'cost', 'relation']));
    return isId(from) && isId(to) ? [edgeText(from, to, label)] : null;
  }
  if (Array.isArray(value)) {
    const [from, to, label, ...extra] = value.map(scalarText);
    return isId(from) && isId(to) && !extra.length ? [edgeText(from, to, label)] : null;
  }
  const text = scalarText(value);
  if (!text) return null;
  const arrows = parseArrows(text);
  if (arrows) return arrows.nodes.length ? null : arrows.edges.map((edge) => edgeText(edge.from, edge.to, edge.label));
  // An arrow this reader cannot take apart (a labelled chain, an undirected link) has no single reading.
  if (/->|=>|→|⟶|⇒|<-|--/.test(text)) return null;
  if (/^[[({]/.test(text) || /^from\s*[=:]/i.test(text)) {
    const parsed = parseLoose(/^from\s*[=:]/i.test(text) ? `{${text.replace(/\s+(?=(?:to|label|weight)\s*[=:])/gi, ', ')}}` : text);
    return parsed !== undefined && typeof parsed === 'object' && parsed !== null ? repairEdge(parsed) : null;
  }
  const words = text.split(/\s+/);
  if (words.length === 3 && /^to$/i.test(words[1]!) && isId(words[0]) && isId(words[2])) return [edgeText(words[0], words[2])];
  if (text.includes(',')) {
    const [from, to, ...label] = text.split(',').map((part) => part.trim());
    return isId(from) && isId(to) && label.length <= 1 ? [edgeText(from, to, label[0] ? edgeLabel(label[0]) : undefined)] : null;
  }
  return words.length >= 2 ? [text] : null;
}

/** One `node:` value as the engine's `id [label]`. */
export function repairNode(value: Loose): string | null {
  if (isRecord(value)) {
    const id = scalarText(pick(value, ['id', 'key', 'name']));
    const label = scalarText(pick(value, ['label', 'text', 'title'])) ?? (pick(value, ['id', 'key']) !== undefined ? scalarText(pick(value, ['name'])) : undefined);
    // A shape or role is content this record grammar cannot carry.
    const known = Object.keys(value).every((key) => ['id', 'key', 'name', 'label', 'text', 'title'].includes(key.toLowerCase()));
    return isId(id) && known ? (label && label !== id ? `${id} ${label}` : id) : null;
  }
  const text = scalarText(value);
  if (!text) return null;
  const forms = [
    new RegExp(String.raw`^id\s*[=:]\s*(${ID})\s*[, ]\s*label\s*[=:]\s*(.+)$`, 'i'),
    new RegExp(String.raw`^(${ID})\s*[[({]\s*(?:label\s*=\s*)?(.+?)\s*[\])}]$`),
    new RegExp(String.raw`^(${ID})\s+label\s*[=:]\s*(.+)$`, 'i'),
    new RegExp(String.raw`^(${ID})\s*(?::|=|,|\||\s--?\s)\s*(.+)$`),
  ];
  for (const form of forms) {
    const match = form.exec(text);
    if (match) return `${match[1]} ${unquote(match[2]!)}`;
  }
  return text;
}

/* ───────────────────────── scene.fbd: SCHEMA scene.fbd key=force ───────────────────────── */

const DIRECTIONS: Readonly<Record<string, readonly string[]>> = {
  up: ['up', 'upward', 'upwards', '+y'],
  down: ['down', 'downward', 'downwards', '-y'],
  left: ['left', 'leftward', 'leftwards', '-x'],
  right: ['right', 'rightward', 'rightwards', '+x'],
  up_left: ['up left', 'up-left', 'up_left', 'upper left'],
  up_right: ['up right', 'up-right', 'up_right', 'upper right'],
  down_left: ['down left', 'down-left', 'down_left', 'lower left'],
  down_right: ['down right', 'down-right', 'down_right', 'lower right'],
  up_incline: ['up incline', 'up-incline', 'up_incline', 'up the incline', 'up the slope', 'up slope', 'upslope', 'up the ramp'],
  down_incline: ['down incline', 'down-incline', 'down_incline', 'down the incline', 'down the slope', 'down slope', 'downslope', 'down the ramp'],
  'normal+': ['normal+', 'normal'],
  weight: ['weight'],
};
const ANGLE = /^(?:at\s+)?(-?\d+(?:\.\d+)?)\s*(?:deg(?:rees?)?|°)\s+(?:from|to|with|relative to)\s+(?:the\s+)?(?:\+?(x|y)(?:[- ]axis)?|(horizontal|vertical|incline|surface))$/;
const QUANTITY = new RegExp(String.raw`^(${NUMBER})([a-zµμΩ%][a-z0-9µμΩ%/^._-]*)$`, 'i');
const UNIT = /^[a-zµμΩ%][a-z0-9µμΩ%/^._-]*$/i;

/** A direction phrase in the engine's vocabulary; the left/right sense of "above the horizontal" is not guessed. */
function direction(written: string): string | null {
  const text = written.toLowerCase().replace(/^(?:direction|dir)\s*[=:]?\s*/, '').replace(/^(?:pointing|acting|directed)\s+/, '').replace(/^(?:towards?|to)\s+(?:the\s+)?/, '').trim();
  for (const [canonical, phrases] of Object.entries(DIRECTIONS)) if (phrases.includes(text)) return canonical;
  const angle = ANGLE.exec(text);
  return angle ? `at ${angle[1]} deg from ${angle[2] ?? angle[3]}` : null;
}

/** One `force:` value as `<id> [magnitude unit] <direction> [on <body>]`. */
export function repairForce(value: Loose): string | null {
  let text: string | undefined;
  if (isRecord(value)) {
    const name = scalarText(pick(value, ['name', 'id', 'label', 'force']));
    const magnitude = scalarText(pick(value, ['magnitude', 'mag', 'value', 'size']));
    const unit = scalarText(pick(value, ['unit', 'units']));
    const dir = scalarText(pick(value, ['direction', 'dir']));
    const on = scalarText(pick(value, ['on', 'body', 'object', 'appliedto']));
    if (!name || !dir) return null;
    text = [name, magnitude, unit, dir, on ? `on ${on}` : ''].filter(Boolean).join(' ');
  } else {
    text = scalarText(value);
  }
  if (!text) return null;
  const words = minus(text).replace(/[,;]/g, ' ').replace(/\(([^()]*)\)/g, ' $1 ').replace(/\s*=\s*/g, ' ').split(/\s+/).filter(Boolean);
  const name = words.shift()?.replace(/:$/, '');
  if (!name || !/^[A-Za-z][\w.'-]*$/.test(name)) return null;
  let owner: string | undefined;
  const on = words.findIndex((word) => word.toLowerCase() === 'on');
  if (on >= 0) {
    owner = words[on + 1];
    if (!owner || !/^[a-z][a-z0-9_.-]*$/i.test(owner) || words.indexOf('on', on + 1) >= 0) return null;
    words.splice(on, 2);
  }
  let magnitude: string | undefined;
  const filtered = words.filter((word) => !/^(?:magnitude|mag|of)$/i.test(word));
  const at = filtered.findIndex((word, index) => QUANTITY.test(word) || (new RegExp(`^${NUMBER}$`).test(word) && UNIT.test(filtered[index + 1] ?? '') && !/^deg(?:rees?)?$/i.test(filtered[index + 1]!)));
  if (at >= 0 && !/^at$/i.test(filtered[at - 1] ?? '')) {
    const attached = QUANTITY.exec(filtered[at]!);
    magnitude = attached ? `${attached[1]} ${attached[2]}` : `${filtered[at]} ${filtered[at + 1]}`;
    filtered.splice(at, attached ? 1 : 2);
  }
  const dir = direction(filtered.join(' '));
  if (!dir) return null;
  return [name, magnitude, dir, owner ? `on ${owner}` : ''].filter(Boolean).join(' ');
}

/* ───────────────────────── scene.geom: SCHEMA scene.geom key=point / key=segment ───────────────────────── */

/** One `point:` value as `<id> [x y]`. */
export function repairPoint(value: Loose): string | null {
  let text: string | undefined;
  if (isRecord(value)) {
    const id = scalarText(pick(value, ['id', 'name', 'label']));
    const x = scalarText(pick(value, ['x']));
    const y = scalarText(pick(value, ['y']));
    if (!id || (x === undefined) !== (y === undefined)) return null;
    text = [id, x, y].filter((part) => part !== undefined).join(' ');
  } else {
    text = Array.isArray(value) ? value.map(scalarText).join(' ') : scalarText(value);
  }
  if (!text) return null;
  const words = minus(text).replace(/[()[\],;:=]/g, ' ').replace(/\b(?:at|x|y)\b(?=\s*[-+.\d])/gi, ' ').split(/\s+/).filter(Boolean);
  const number = new RegExp(`^${NUMBER}$`);
  if (words.length === 1 && isId(words[0])) return words[0]!;
  if (words.length === 3 && isId(words[0]) && number.test(words[1]!) && number.test(words[2]!)) return words.join(' ');
  return null;
}

/** One `segment:` value as `<id> <from> <to>`. */
export function repairSegment(value: Loose): string | null {
  let text: string | undefined;
  if (isRecord(value)) {
    text = [pick(value, ['id', 'name', 'label']), pick(value, ['from', 'start', 'a', 'p1']), pick(value, ['to', 'end', 'b', 'p2'])].map(scalarText).join(' ');
  } else {
    text = Array.isArray(value) ? value.map(scalarText).join(' ') : scalarText(value);
  }
  if (!text) return null;
  const words = text.replace(/[()[\],;:=]/g, ' ').replace(/->|→|—|–|\s-\s/g, ' ').replace(/\b(?:from|to)\b/gi, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 2 && /^[^-]+-[^-]+$/.test(words[1]!)) words.splice(1, 1, ...words[1]!.split('-'));
  return words.length === 3 && words.every(isId) ? words.join(' ') : null;
}

/* ───────────────────────── circuit: SCHEMA circuit device-key / probe / wire ───────────────────────── */

/** Component words -> the designator letter parseDevice() in engines/circuit.ts expects. */
export const COMPONENT_LETTERS: Readonly<Record<string, string>> = {
  resistor: 'R', capacitor: 'C', inductor: 'L', voltagesource: 'V', vsource: 'V', battery: 'V', source: 'V',
  currentsource: 'I', isource: 'I', diode: 'D', switch: 'S', opamp: 'A', amplifier: 'A', bjt: 'Q', transistor: 'Q',
  mosfet: 'M', ammeter: 'M', voltmeter: 'M', meter: 'M',
};
const THREE_TERMINAL = /^[AQ]/i;

/** The terminals and value of a device as `<n1> <n2> [n3] [value]`; the designator stays the key. */
export function repairDevice(designator: string, value: Loose): string | null {
  const terminals = THREE_TERMINAL.test(designator) || (/^M/i.test(designator) && /\b[np]mos\b/i.test(JSON.stringify(value))) ? 3 : 2;
  let text: string | undefined;
  if (isRecord(value)) {
    const listed = pick(value, ['nodes', 'pins', 'terminals', 'connections']);
    const nodes = Array.isArray(listed)
      ? listed.map(scalarText)
      : [['n1', 'from', 'pos', 'positive', 'a', 'node1'], ['n2', 'to', 'neg', 'negative', 'b', 'node2'], ['n3', 'node3']].map((names) => scalarText(pick(value, names))).filter((node) => node !== undefined);
    const model = scalarText(pick(value, ['model', 'polarity', 'channel']));
    const rating = scalarText(pick(value, ['value', 'val', 'resistance', 'capacitance', 'inductance', 'voltage', 'current', 'rating', 'state']));
    if (nodes.length < terminals || nodes.some((node) => !node || /\s/.test(node))) return null;
    return [...nodes, model, rating].filter(Boolean).join(' ');
  }
  text = Array.isArray(value) ? value.map(scalarText).join(' ') : scalarText(value);
  if (!text) return null;
  const words = text
    .replace(/\b(?:nodes?|n[123]|value|val)\s*[=:]\s*/gi, ' ')
    .replace(/[()[\],;]/g, ' ')
    .replace(/\bbetween\s+(\S+)\s+and\s+/i, '$1 ')
    .replace(/\bfrom\s+(\S+)\s+to\s+/i, '$1 ')
    .replace(/\s(?:->|→|—|–|-|to)\s/g, ' ')
    .split(/\s+/).filter(Boolean);
  return words.length >= terminals ? words.join(' ') : null;
}

/** One `probe:` value as `<label>=<node>`. */
export function repairProbe(value: Loose): string | null {
  if (isRecord(value)) {
    const name = scalarText(pick(value, ['name', 'label', 'id']));
    const node = scalarText(pick(value, ['node', 'at', 'on']));
    return name && node && !/\s/.test(name + node) ? `${name}=${node}` : null;
  }
  const match = /^([A-Za-z0-9_-]+)\s*(?:=|:|->|→|@|\bat\b|\bon\b|\s)\s*([A-Za-z0-9_+-]+)$/.exec(scalarText(value) ?? '');
  return match ? `${match[1]}=${match[2]}` : null;
}

/** One `wire:` value as `<node> <node>`. */
export function repairWire(value: Loose): string | null {
  const text = Array.isArray(value) ? value.map(scalarText).join(' ') : scalarText(value);
  const words = (text ?? '').replace(/[()[\],;]/g, ' ').replace(/\s(?:->|→|—|–|--?|to)\s|->|→/g, ' ').split(/\s+/).filter(Boolean);
  return words.length === 2 ? words.join(' ') : null;
}

/* ───────────────────────── table: SCHEMA table.* ───────────────────────── */

/** One row of cells as `a, b, c`; a cell that itself holds the delimiter has no faithful spelling here. */
export function repairCells(value: Loose): string | null {
  let cells: Array<string | undefined>;
  if (Array.isArray(value)) cells = value.map((cell) => (cell === null ? '' : scalarText(cell)));
  else {
    const text = scalarText(value);
    if (text === undefined) return null;
    if (/^\[.*\]$/.test(text)) {
      const parsed = parseLoose(text);
      return Array.isArray(parsed) ? repairCells(parsed) : null;
    }
    if (!text.includes('|')) return text;
    cells = text.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((cell) => cell.trim());
  }
  return cells.every((cell) => cell !== undefined && !/[,;|]/.test(cell)) ? cells.join(', ') : null;
}

/** A block of rows as one cell row per entry: nested arrays, `a,b; c,d`, or a list of rows. */
export function repairRows(value: Loose): string[] | null {
  let rows: Loose[];
  if (Array.isArray(value)) rows = value;
  else {
    const text = scalarText(value);
    if (!text) return null;
    if (/^\[\s*\[/.test(text)) {
      const parsed = parseLoose(text);
      if (!Array.isArray(parsed)) return null;
      rows = parsed;
    } else if (text.includes(';') && text.includes(',')) rows = text.split(';').map((row) => row.trim());
    else return null;
  }
  const out = rows.map(repairCells);
  return out.length && out.every((row): row is string => row !== null && row !== '') ? out : null;
}

/** A Markdown pipe table as a header row (when a rule line follows the first row) and body rows. */
export function parsePipeTable(lines: readonly string[]): { headers?: string; rows: string[] } | null {
  const isRule = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
  if (lines.length < 2 || !lines.every((line) => /^\s*\|.*\|\s*$/.test(line))) return null;
  const body = lines.filter((line) => !isRule(line)).map(repairCells);
  if (body.some((row) => row === null) || lines.slice(2).some(isRule)) return null;
  const rows = body as string[];
  return isRule(lines[1]!) ? { headers: rows[0], rows: rows.slice(1) } : { rows };
}
