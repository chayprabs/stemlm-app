/**
 * Mermaid -> native specs. The source is parsed (header, then a grammar per diagram type), never
 * pattern-guessed: a statement the parser does not understand refuses the whole figure.
 *
 * This file holds the shared front end (fences, front matter, directives, comments, header) and the
 * flowchart grammar; the other diagram types live beside it.
 */
import { GraphDraft, LINE_BREAK_NOTE, Notes, applyDirection, refuse, type Translation } from './native';
import { mermaidLabel } from './text';
import { translateState } from './mermaid-state';
import { translateSequence } from './mermaid-sequence';
import { translateClass, translateGantt, translateMindmap, translatePie } from './mermaid-other';

/** Diagram types Mermaid knows, lowercased. A header outside this list is not Mermaid. */
const HEADERS = new Set([
  'graph', 'flowchart', 'flowchart-elk', 'statediagram', 'statediagram-v2', 'sequencediagram', 'pie', 'gantt',
  'classdiagram', 'classdiagram-v2', 'erdiagram', 'mindmap', 'gitgraph', 'journey', 'timeline', 'quadrantchart',
  'xychart-beta', 'sankey-beta', 'requirementdiagram', 'block-beta', 'packet-beta', 'kanban', 'architecture-beta',
  'zenuml', 'c4context', 'c4container', 'c4component', 'c4dynamic', 'c4deployment',
]);
/** One-word headers that are also ordinary words: Mermaid only when nothing else shares the line. */
const BARE_HEADERS = new Set(['gantt', 'mindmap', 'journey', 'timeline', 'kanban']);
const FLOW_DIRECTION = /^(TB|TD|BT|RL|LR|[v^<>])(?=\s|;|$)/i;
const ARROW_DIRECTION: Record<string, string> = { v: 'TB', '^': 'BT', '<': 'RL', '>': 'LR' };

interface Prepared {
  keyword: string;
  /** Rest of the header line. */
  rest: string;
  /** Lines after the header, comments removed. */
  lines: string[];
  caption?: string;
}

function stripFence(source: string): string {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  if (!text.startsWith('```')) return text;
  const firstBreak = text.indexOf('\n');
  if (firstBreak < 0) return '';
  const body = text.slice(firstBreak + 1);
  return body.endsWith('```') ? body.slice(0, -3) : body;
}

/** `--- … ---` YAML front matter: only its title is content. */
function stripFrontMatter(text: string, notes: Notes): { text: string; caption?: string } {
  const lines = text.split('\n');
  const first = lines.findIndex((line) => line.trim() !== '');
  if (first < 0 || lines[first]!.trim() !== '---') return { text };
  const close = lines.findIndex((line, index) => index > first && line.trim() === '---');
  if (close < 0) refuse('front matter is not closed');
  let caption: string | undefined;
  for (const line of lines.slice(first + 1, close)) {
    const title = /^title\s*:\s*(.*)$/.exec(line.trim());
    if (title) caption = mermaidLabel(title[1]!.replace(/^(["'])(.*)\1$/, '$2')) || undefined;
    else if (line.trim()) notes.add('front-matter configuration ignored');
  }
  return { text: lines.slice(close + 1).join('\n'), caption };
}

/** `%%{init: …}%%` directives configure the renderer only. */
function stripDirectives(text: string, notes: Notes): string {
  const kept: string[] = [];
  let from = 0;
  for (let at = text.indexOf('%%{'); at >= 0; at = text.indexOf('%%{', from)) {
    const end = text.indexOf('}%%', at);
    if (end < 0) refuse('a directive is not closed');
    kept.push(text.slice(from, at));
    from = end + 3;
    notes.add('renderer directive ignored');
  }
  kept.push(text.slice(from));
  return kept.join('');
}

function prepare(source: string, notes: Notes): Prepared | null {
  const matter = stripFrontMatter(stripFence(source), notes);
  const lines = stripDirectives(matter.text, notes).split('\n').filter((line) => !line.trim().startsWith('%%'));
  const at = lines.findIndex((line) => line.trim() !== '');
  if (at < 0) return null;
  const header = /^\s*([A-Za-z][A-Za-z0-9-]*)?(.*)$/.exec(lines[at]!)!;
  return { keyword: (header[1] ?? '').toLowerCase(), rest: header[2]!.trim(), lines: lines.slice(at + 1), caption: matter.caption };
}

function isHeader(prepared: Prepared): boolean {
  const { keyword, rest, lines } = prepared;
  if (!HEADERS.has(keyword)) return false;
  if (BARE_HEADERS.has(keyword)) return rest === '';
  if (keyword === 'pie') return rest === '' || /^(showData\b|title\b)/i.test(rest);
  if (keyword !== 'graph') return true;
  // `graph G {` and `graph {` are Graphviz, not Mermaid.
  if (rest.includes('{')) return false;
  if (rest === '') return !lines.find((line) => line.trim() !== '')?.trim().startsWith('{');
  return FLOW_DIRECTION.test(rest) || rest.startsWith(';');
}

/** The Mermaid diagram keyword (lowercased) when the source opens with a Mermaid header, else null. Never throws. */
export function mermaidHeader(source: string): string | null {
  try {
    const prepared = prepare(source, new Notes());
    return prepared && isHeader(prepared) ? prepared.keyword : null;
  } catch {
    return null;
  }
}

class Cursor {
  i = 0;
  private lineFrom = 0;
  private lineTo = -1;

  constructor(readonly s: string) {}

  get done(): boolean {
    return this.i >= this.s.length;
  }

  peek(offset = 0): string {
    return this.s[this.i + offset] ?? '';
  }

  at(text: string): boolean {
    return this.s.startsWith(text, this.i);
  }

  /** Skip spaces and tabs: a statement never continues past its line. */
  blanks(): void {
    while (this.peek() === ' ' || this.peek() === '\t') this.i++;
  }

  /** End of the current line. Cached: a long one-line source asks for it once per statement. */
  lineEnd(): number {
    if (this.i < this.lineFrom || this.i > this.lineTo) {
      const end = this.s.indexOf('\n', this.i);
      this.lineFrom = this.i;
      this.lineTo = end < 0 ? this.s.length : end;
    }
    return this.lineTo;
  }
}

interface ShapeDef {
  open: string;
  close: string[];
  /** Bracket pair that may nest inside the text without closing the shape. */
  nest: [string, string];
  name: string;
}

/** Longest opener first. */
const SHAPES: ShapeDef[] = [
  { open: '(((', close: [')))'], nest: ['(', ')'], name: 'double circle' },
  { open: '((', close: ['))'], nest: ['(', ')'], name: 'circle' },
  { open: '([', close: ['])'], nest: ['[', ']'], name: 'stadium' },
  { open: '[[', close: [']]'], nest: ['[', ']'], name: 'subroutine' },
  { open: '[(', close: [')]'], nest: ['(', ')'], name: 'cylinder' },
  { open: '[/', close: ['/]', '\\]'], nest: ['[', ']'], name: 'parallelogram' },
  { open: '[\\', close: ['\\]', '/]'], nest: ['[', ']'], name: 'parallelogram' },
  { open: '{{', close: ['}}'], nest: ['{', '}'], name: 'hexagon' },
  { open: '[', close: [']'], nest: ['[', ']'], name: 'box' },
  { open: '(', close: [')'], nest: ['(', ')'], name: 'box' },
  { open: '{', close: ['}'], nest: ['{', '}'], name: 'diamond' },
  { open: '>', close: [']'], nest: ['[', ']'], name: 'flag' },
];

const ID_CHAR = /[\p{L}\p{N}_]/u;
const SKIPPED_STATEMENTS = new Set(['classDef', 'class', 'style', 'linkStyle', 'click', 'accTitle', 'accDescr']);

interface Link {
  left: string;
  right: string;
  label: string;
  line: 'solid' | 'dotted' | 'thick' | 'invisible';
}

/** The flowchart grammar over the text after the header. */
class FlowParser {
  private readonly c: Cursor;
  private readonly draft = new GraphDraft();
  private readonly shapes = new Map<string, string>();
  private readonly subgraphs = new Set<string>();
  private depth = 0;

  constructor(body: string, direction: string, private readonly notes: Notes) {
    this.c = new Cursor(body);
    applyDirection(this.draft, direction, notes);
  }

  parse(): string {
    const c = this.c;
    for (;;) {
      while (!c.done && /[\s;]/.test(c.peek())) c.i++;
      if (c.done) break;
      if (c.at('%%')) {
        c.i = c.lineEnd();
        continue;
      }
      if (!this.keywordStatement()) this.chain();
      c.blanks();
      if (c.at('%%')) c.i = c.lineEnd();
      else if (!c.done && c.peek() !== '\n' && c.peek() !== ';') refuse('a flowchart statement has text the parser cannot read');
    }
    if (this.depth) refuse('a subgraph is not closed');
    // A link to a subgraph addresses the whole group, which a flat graph cannot show.
    for (const id of this.subgraphs) if (this.draft.has(id)) refuse('a link to a whole subgraph cannot be drawn');
    this.applyShapes();
    return this.draft.toSpec(this.notes);
  }

  private applyShapes(): void {
    const names = [...this.shapes.values()];
    // Circles with at least one double circle are a state machine drawn as a flowchart.
    const automaton = names.length === this.draft.nodeCount && names.includes('double circle')
      && names.every((name) => name === 'circle' || name === 'double circle');
    for (const [key, name] of this.shapes) {
      const node = this.draft.node(key);
      if (name === 'diamond') node.shape = 'decision';
      else if (name === 'stadium') node.shape = 'terminal';
      else if (name === 'double circle' && automaton) node.accept = true;
      else if (name !== 'box' && !(automaton && name === 'circle')) this.notes.add(`${name} outline drawn as a box`);
    }
  }

  /** A keyword followed by a link or `&` is a node that happens to be named like one. */
  private keywordStatement(): boolean {
    const c = this.c;
    const word = /^[A-Za-z]+/.exec(c.s.slice(c.i, c.i + 12))?.[0] ?? '';
    const after = c.s.slice(c.i + word.length, c.i + word.length + 12);
    if (/^[ \t]*(?:[xo<]?(?:--|==|-\.)|~~~|&)/.test(after)) return false;
    const ends = /^[ \t]*(?:[\n;]|%%|$)/.test(after);
    if (word === 'end' && ends) {
      if (!this.depth) refuse('end without a subgraph');
      this.depth--;
      c.i += word.length;
      return true;
    }
    if (!/^[ \t]/.test(after) && !(ends && word === 'subgraph')) return false;
    if (word === 'subgraph') {
      const rest = c.s.slice(c.i + word.length, c.lineEnd()).replace(/;\s*$/, '').trim();
      const titled = /^([^\s[\]"]+)\s*\[(.*)\]$/.exec(rest);
      const title = mermaidLabel(titled ? titled[2]! : rest);
      this.subgraphs.add(titled ? titled[1]! : rest.replace(/^"(.*)"$/, '$1'));
      this.notes.add(title ? `subgraph "${title}" flattened: its nodes are drawn without the group box` : 'subgraph flattened: its nodes are drawn without the group box');
      this.depth++;
      c.i = c.lineEnd();
      return true;
    }
    if (word === 'direction') {
      const direction = c.s.slice(c.i + word.length, c.lineEnd()).replace(/;\s*$/, '').trim();
      if (this.depth) this.notes.add('subgraph direction ignored');
      else applyDirection(this.draft, direction, this.notes);
      c.i = c.lineEnd();
      return true;
    }
    if (!SKIPPED_STATEMENTS.has(word)) return false;
    this.notes.add(word.startsWith('acc') ? 'accessibility text ignored' : word === 'click' ? 'click handler ignored' : 'styling ignored');
    this.skipStatement();
    return true;
  }

  /** To the end of the line, or to a `;` outside quotes. A braced `accDescr { … }` block ends at its brace. */
  private skipStatement(): void {
    const c = this.c;
    if (/^accDescr\s*\{/.test(c.s.slice(c.i, c.i + 24))) {
      const close = c.s.indexOf('}', c.i);
      if (close < 0) refuse('an accessibility block is not closed');
      c.i = close + 1;
      return;
    }
    let quoted = false;
    for (; !c.done && c.peek() !== '\n'; c.i++) {
      if (c.peek() === '"') quoted = !quoted;
      else if (c.peek() === ';' && !quoted) return;
    }
  }

  private chain(): void {
    let from = this.group();
    for (;;) {
      const link = this.link();
      if (!link) return;
      const to = this.group();
      this.connect(from, to, link);
      from = to;
    }
  }

  private connect(from: string[], to: string[], link: Link): void {
    if (link.line === 'invisible') {
      this.notes.add('invisible layout link ignored');
      return;
    }
    if (/[xo]/.test(link.left + link.right)) refuse('circle- and cross-ended links carry a meaning the graph cannot draw');
    if (link.line !== 'solid') this.notes.add(`${link.line} line drawn as a regular arrow`);
    const forward = link.right === '>';
    const backward = link.left === '<';
    for (const a of from) {
      for (const b of to) {
        if (forward) this.draft.edge(a, b, link.label);
        if (backward) this.draft.edge(b, a, link.label);
        if (!forward && !backward) this.draft.edge(a, b, link.label, false);
      }
    }
  }

  private group(): string[] {
    const keys = [this.node()];
    for (;;) {
      this.c.blanks();
      if (this.c.peek() !== '&') return keys;
      this.c.i++;
      keys.push(this.node());
    }
  }

  private node(): string {
    const c = this.c;
    c.blanks();
    let key = '';
    if (c.peek() === '"') {
      // Not Mermaid, but a quoted name in place of an id can only mean one thing.
      const end = c.s.indexOf('"', c.i + 1);
      if (end < 0 || end > c.lineEnd()) refuse('a quoted node name is not closed');
      key = mermaidLabel(c.s.slice(c.i + 1, end));
      c.i = end + 1;
    } else {
      const start = c.i;
      while (!c.done && (ID_CHAR.test(c.peek()) || (c.i > start && /[.\-/]/.test(c.peek()) && ID_CHAR.test(c.peek(1))))) c.i++;
      key = c.s.slice(start, c.i);
    }
    if (!key) refuse('a flowchart statement has text the parser cannot read');
    const node = this.draft.node(key);
    this.styleClass();
    const adjacent = c.i;
    c.blanks();
    if (c.at('@{')) refuse('the @{ } shape syntax is not supported');
    const shape = SHAPES.find((def) => c.at(def.open) && (def.open !== '>' || c.i === adjacent));
    if (shape) {
      c.i += shape.open.length;
      const label = mermaidLabel(this.shapeText(shape));
      if (!label) refuse('a node has an empty label');
      node.label = label;
      this.shapes.set(key, shape.name);
    } else {
      c.i = adjacent;
    }
    this.styleClass();
    return key;
  }

  private styleClass(): void {
    const c = this.c;
    if (!c.at(':::')) return;
    c.i += 3;
    while (!c.done && /[\w-]/.test(c.peek())) c.i++;
    this.notes.add('styling ignored');
  }

  private shapeText(shape: ShapeDef): string {
    const c = this.c;
    const lineEnd = c.lineEnd();
    const closerAt = (at: number) => shape.close.find((close) => c.s.startsWith(close, at));
    const open = c.i;
    c.blanks();
    if (c.peek() === '"') {
      const quoteEnd = c.s.indexOf('"', c.i + 1);
      if (quoteEnd > 0 && quoteEnd < lineEnd) {
        let after = quoteEnd + 1;
        while (c.s[after] === ' ' || c.s[after] === '\t') after++;
        const close = closerAt(after);
        if (close) {
          const text = c.s.slice(c.i + 1, quoteEnd);
          c.i = after + close.length;
          return text;
        }
      }
    }
    let depth = 0;
    for (let at = open; at < lineEnd; at++) {
      const close = depth === 0 ? closerAt(at) : undefined;
      if (close) {
        c.i = at + close.length;
        return c.s.slice(open, at);
      }
      if (c.s[at] === shape.nest[0]) depth++;
      else if (c.s[at] === shape.nest[1] && depth > 0) depth--;
    }
    return refuse('a node label is not closed');
  }

  private link(): Link | null {
    const c = this.c;
    c.blanks();
    const invisible = /^~{3,}/.exec(c.s.slice(c.i, c.i + 64));
    if (invisible) {
      c.i += invisible[0].length;
      return { left: '', right: '', label: '', line: 'invisible' };
    }
    const start = c.i;
    const left = /[xo<]/.test(c.peek()) && /[-=]/.test(c.peek(1)) ? c.s[c.i++]! : '';
    const body = c.at('-.') ? this.dottedLink() : c.at('--') || c.at('==') ? this.straightLink() : null;
    if (!body) {
      c.i = start;
      return null;
    }
    const piped = this.pipedText();
    if (piped && body.label) refuse('a link has two labels');
    return { left, right: body.right, line: body.line, label: mermaidLabel(piped || body.label) };
  }

  /** `-->`, `---`, `--x`, `==>` of any length, or the text form `-- text -->`. */
  private straightLink(): { right: string; label: string; line: Link['line'] } {
    const c = this.c;
    const ch = c.peek();
    const line = ch === '=' ? 'thick' : 'solid';
    const run = this.run(ch);
    const head = this.head();
    if (head !== null) return { right: head, label: '', line };
    if (run >= 3) return { right: '', label: '', line };
    // Two strokes and no head: the text form. Its text ends at the next run of two strokes.
    const lineEnd = c.lineEnd();
    const close = c.s.indexOf(ch + ch, c.i);
    if (close < 0 || close >= lineEnd) refuse('a link label is not closed');
    const label = c.s.slice(c.i, close);
    c.i = close;
    const closing = this.run(ch);
    const closingHead = this.head();
    if (closingHead === null && closing < 3) refuse('a link label is not closed');
    return { right: closingHead ?? '', label, line };
  }

  /** `-.->`, `-.-`, or the text form `-. text .->`. */
  private dottedLink(): { right: string; label: string; line: Link['line'] } {
    const c = this.c;
    c.i++;
    const dots = this.run('.');
    if (c.peek() === '-') {
      c.i++;
      return { right: this.head() ?? '', label: '', line: 'dotted' };
    }
    if (dots !== 1) refuse('a dotted link is malformed');
    const close = c.s.indexOf('.-', c.i);
    if (close < 0 || close >= c.lineEnd()) refuse('a link label is not closed');
    let labelEnd = close;
    while (labelEnd > c.i && c.s[labelEnd - 1] === '.') labelEnd--;
    const label = c.s.slice(c.i, labelEnd);
    c.i = close + 2;
    return { right: this.head() ?? '', label, line: 'dotted' };
  }

  private run(ch: string): number {
    const start = this.c.i;
    while (this.c.peek() === ch) this.c.i++;
    return this.c.i - start;
  }

  /**
   * The head after a link's strokes: `>`, or `x` / `o` when it stands alone. `--ok-->` is a link
   * labelled "ok", not a circle-ended link to a node named k.
   */
  private head(): string | null {
    const c = this.c;
    if (c.peek() === '>') {
      c.i++;
      return '>';
    }
    if ((c.peek() === 'x' || c.peek() === 'o') && /^(?:\s|$)/.test(c.peek(1))) return c.s[c.i++]!;
    return null;
  }

  private pipedText(): string {
    const c = this.c;
    c.blanks();
    if (c.peek() !== '|') return '';
    const end = c.s.indexOf('|', c.i + 1);
    if (end < 0 || end > c.lineEnd()) refuse('a link label is not closed');
    const text = c.s.slice(c.i + 1, end);
    c.i = end + 1;
    return text;
  }
}

function translateFlow(prepared: Prepared, notes: Notes): string {
  const direction = FLOW_DIRECTION.exec(prepared.rest)?.[1] ?? '';
  const rest = prepared.rest.slice(direction.length);
  const body = [rest, ...prepared.lines].join('\n');
  return new FlowParser(body, ARROW_DIRECTION[direction] ?? (direction || 'TB'), notes).parse();
}

/** Diagram types with no faithful native form, and why. */
const UNSUPPORTED: Record<string, string> = {
  erdiagram: 'entity attributes and crow-foot cardinalities have no native form',
  gitgraph: 'branch lanes and merges have no native form',
  journey: 'scored journey steps have no native form',
  timeline: 'a period-and-events timeline has no native form',
};

/**
 * Translate Mermaid source. `declared` means the caller knows the source is Mermaid (a `mermaid`
 * fence or diagram type); then statements without a header are read as a top-down flowchart.
 * Throws `Refusal`.
 */
export function translateMermaid(source: string, declared = false): Translation {
  const notes = new Notes();
  const prepared = prepare(source, notes);
  if (!prepared) refuse('the Mermaid source is empty');
  if (/<\/?br\s*\/?>|\\n(?![a-z])/i.test(source)) notes.add(LINE_BREAK_NOTE);
  const finish = (type: string, content: string, caption = prepared.caption): Translation => ({
    type,
    content,
    ...(caption ? { caption } : {}),
    notes: notes.list(),
  });
  if (!isHeader(prepared)) {
    if (!declared) refuse('the source does not open with a Mermaid diagram type');
    notes.add('no diagram type given: read as a top-down flowchart');
    const body = stripDirectives(stripFrontMatter(stripFence(source), new Notes()).text, new Notes());
    return finish('graph', new FlowParser(body, 'TB', notes).parse());
  }
  const { keyword, lines } = prepared;
  if (keyword === 'graph' || keyword === 'flowchart' || keyword === 'flowchart-elk') return finish('graph', translateFlow(prepared, notes));
  if (prepared.rest && keyword !== 'pie') refuse('the diagram header has unexpected text');
  if (keyword === 'statediagram' || keyword === 'statediagram-v2') return finish('graph', translateState(lines, notes));
  if (keyword === 'sequencediagram') {
    const sequence = translateSequence(lines, notes);
    return finish('sequence', sequence.content, sequence.caption ?? prepared.caption);
  }
  if (keyword === 'pie') return finish('chart', translatePie(prepared.rest, lines, prepared.caption, notes));
  if (keyword === 'gantt') return finish('gantt', translateGantt(lines, prepared.caption, notes));
  if (keyword === 'classdiagram' || keyword === 'classdiagram-v2') return finish('graph', translateClass(lines, notes));
  if (keyword === 'mindmap') return finish('graph', translateMindmap(lines, notes));
  return refuse(UNSUPPORTED[keyword] ?? `Mermaid ${keyword} diagrams have no native form`);
}
