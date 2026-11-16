/**
 * Native spec emission shared by the foreign-notation translators.
 *
 * A translator parses its notation into a draft, and the draft writes the `key: value` spec the
 * figure compiler reads. Everything the native grammar cannot say is refused here, in one place,
 * so no translator can emit a spec that draws something its source did not state.
 */

/** Same budget as a native spec (`MAX_SPEC_CHARS`): a foreign source is never larger than what it becomes. */
export const MAX_FOREIGN_CHARS = 64_000;
/** `parseSpec` refuses more than 1024 declarations; stay under it with room for marker lines. */
const MAX_SPEC_ENTRIES = 1_000;
const MAX_SPEC_LINE_CHARS = 8_000;
/** A label longer than this cannot be set in any native figure; refusing early also bounds the text passes. */
export const MAX_LABEL_CHARS = 300;

/** Thrown inside a translator when the source cannot be translated faithfully. Never leaves the module entry points. */
export class Refusal extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

export function refuse(reason: string): never {
  throw new Refusal(reason);
}

export interface Translation {
  /** Native `type=` token. */
  type: string;
  /** Native spec body. */
  content: string;
  /** A title the source carried that the native spec has no key for. */
  caption?: string;
  /** Everything presentational that was dropped or adjusted, in source order. */
  notes: string[];
}

/** Ordered, de-duplicated translation notes. */
export class Notes {
  private readonly seen = new Set<string>();

  add(note: string): void {
    this.seen.add(note);
  }

  list(): string[] {
    return [...this.seen];
  }
}

/** Whitespace of every kind (the spec is line-oriented) and control characters become single spaces. */
export function oneLine(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim();
}

/** A label as native spec text: one line, bounded. */
export function labelText(text: string): string {
  const label = oneLine(text);
  if (label.length > MAX_LABEL_CHARS) refuse('a label is too long to draw');
  return label;
}

/**
 * The graph engine reads an id as the first whitespace-delimited token of a `node:` line and splits
 * marker lists on commas and whitespace, so an id is any token free of those. Stay well inside that:
 * a word of letters, digits, `_`, `.` and `-`.
 */
const LEGAL_ID = /^[\p{L}\p{N}_][\p{L}\p{N}_.-]{0,39}$/u;

export function isLegalId(text: string): boolean {
  return LEGAL_ID.test(text);
}

/**
 * Native ids for source names, in order. A legal name is its own id; any other name gets the next
 * free `<prefix><n>`, so the same source always yields the same ids.
 */
export function nativeIds(keys: readonly string[], prefix: string): Map<string, string> {
  const taken = new Set(keys.filter(isLegalId).map((key) => key.toLowerCase()));
  const ids = new Map<string, string>();
  let next = 1;
  for (const key of keys) {
    if (ids.has(key)) continue;
    if (isLegalId(key)) {
      ids.set(key, key);
      continue;
    }
    let id = `${prefix}${next++}`;
    while (taken.has(id)) id = `${prefix}${next++}`;
    taken.add(id);
    ids.set(key, id);
  }
  return ids;
}

/**
 * The graph engine strips one pair of matching quotes around a label. A label that is itself quoted
 * ('a', "yes" or "no") is wrapped in the other quote so the strip removes the wrapper, not the label.
 */
function protectQuotes(label: string): string {
  if (!/^(["'])(.*)\1$/.test(label)) return label;
  return label.startsWith('"') ? `'${label}'` : `"${label}"`;
}

/** Join spec lines, refusing a spec the native parser would reject for size. */
export function specText(lines: string[]): string {
  if (lines.length > MAX_SPEC_ENTRIES) refuse('too many declarations for one figure');
  if (lines.some((line) => line.length > MAX_SPEC_LINE_CHARS)) refuse('a declaration is too long');
  const content = lines.join('\n');
  if (content.length > MAX_FOREIGN_CHARS) refuse('the translated spec is too large');
  return content;
}

export type NodeShape = 'plain' | 'decision' | 'terminal';

export interface DraftNode {
  /** The source's name for the node; the native id is derived from it on emission. */
  key: string;
  /** Text the source gave the node; absent means the node is labelled by its own name. */
  label?: string;
  shape: NodeShape;
  start: boolean;
  accept: boolean;
}

interface DraftEdge {
  from: string;
  to: string;
  label: string;
  directed: boolean;
}

const MAX_NODES = 400;
const MAX_EDGES = 600;

/** A directed, labelled graph on its way to a `type=graph` spec. */
export class GraphDraft {
  rankdir: 'LR' | 'TB' = 'TB';
  private readonly nodes = new Map<string, DraftNode>();
  private readonly edges: DraftEdge[] = [];

  node(key: string): DraftNode {
    const existing = this.nodes.get(key);
    if (existing) return existing;
    if (this.nodes.size >= MAX_NODES) refuse('too many nodes for one figure');
    const node: DraftNode = { key, shape: 'plain', start: false, accept: false };
    this.nodes.set(key, node);
    return node;
  }

  has(key: string): boolean {
    return this.nodes.has(key);
  }

  edge(from: string, to: string, label = '', directed = true): void {
    if (this.edges.length >= MAX_EDGES) refuse('too many edges for one figure');
    this.node(from);
    this.node(to);
    this.edges.push({ from, to, label, directed });
  }

  get nodeCount(): number {
    return this.nodes.size;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  /** Every node an edge touches, with its degree. */
  degrees(): Map<string, number> {
    const degree = new Map<string, number>();
    for (const edge of this.edges) {
      degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
    }
    return degree;
  }

  toSpec(): string {
    if (!this.nodes.size) refuse('the graph has no nodes');
    // The graph engine draws an arrowhead on every edge, so a link the source left undirected has no native form.
    if (this.edges.some((edge) => !edge.directed)) refuse('undirected links cannot be drawn without inventing a direction');
    const nodes = [...this.nodes.values()];
    const ids = nativeIds(nodes.map((node) => node.key), 'n');
    const idOf = (key: string) => ids.get(key)!;
    const lines = [`rankdir: ${this.rankdir}`];
    for (const node of nodes) {
      const id = idOf(node.key);
      const label = labelText(node.label ?? node.key);
      if (!label) refuse('a node has no label');
      lines.push(label === id ? `node: ${id}` : `node: ${id} ${protectQuotes(label)}`);
    }
    for (const edge of this.edges) {
      const label = labelText(edge.label);
      // The engine reserves the bare word for "unlabelled" and would silently drop it.
      if (label === 'flow') refuse('the edge label "flow" cannot be drawn');
      lines.push(`edge: ${idOf(edge.from)} ${idOf(edge.to)}${label ? ` ${protectQuotes(label)}` : ''}`);
    }
    const marker = (key: string, pick: (node: DraftNode) => boolean) => {
      const marked = nodes.filter(pick).map((node) => idOf(node.key));
      if (marked.length) lines.push(`${key}: ${marked.join(', ')}`);
    };
    marker('decision', (node) => node.shape === 'decision');
    marker('terminal', (node) => node.shape === 'terminal');
    marker('start', (node) => node.start);
    marker('accept', (node) => node.accept);
    return specText(lines);
  }
}

/** The four layout directions foreign notations share; the graph engine lays out left-to-right or top-to-bottom only. */
export function applyDirection(draft: GraphDraft, direction: string, notes: Notes): void {
  const dir = direction.toUpperCase();
  if (dir === 'LR' || dir === 'TB') draft.rankdir = dir;
  else if (dir === 'TD') draft.rankdir = 'TB';
  else if (dir === 'RL') {
    draft.rankdir = 'LR';
    notes.add('right-to-left layout drawn left-to-right; every arrow keeps its source and target');
  } else if (dir === 'BT') {
    draft.rankdir = 'TB';
    notes.add('bottom-to-top layout drawn top-to-bottom; every arrow keeps its source and target');
  } else refuse(`unknown layout direction ${direction}`);
}
