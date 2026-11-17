/**
 * Graphviz DOT -> `type=graph`. A real tokenizer and recursive-descent parser for the DOT grammar
 * (ids, quoted and HTML strings, attribute lists, default-attribute scopes, subgraphs as edge
 * endpoints), then a mapping of the attributes that carry meaning: label, shape, direction.
 */
import { GraphDraft, LINE_BREAK_NOTE, Notes, applyDirection, labelText, refuse, type Translation } from './native';
import { decodeEntities, flattenHtml } from './text';

interface Token {
  kind: 'id' | 'op';
  text: string;
  quoted: boolean;
  html: boolean;
}

interface Value {
  text: string;
  html: boolean;
}

type Attrs = Map<string, Value>;

interface Scope {
  node: Attrs;
  edge: Attrs;
}

interface DotEdge {
  from: string;
  to: string;
  attrs: Attrs;
  directed: boolean;
}

const MAX_TOKENS = 30_000;
const MAX_DEPTH = 16;
const WORD = /-?(?:\.\d+|\d+(?:\.\d*)?)|[A-Za-z_\u0080-￿][\w\u0080-￿]*/y;

function stripFence(source: string): string {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  if (!text.startsWith('```')) return text;
  const firstBreak = text.indexOf('\n');
  const body = firstBreak < 0 ? '' : text.slice(firstBreak + 1);
  return body.endsWith('```') ? body.slice(0, -3) : body;
}

/** True when the source opens like a DOT graph: `[strict] (graph|digraph) [name] {`. Never throws. */
export function isDot(source: string): boolean {
  const head = stripFence(source.slice(0, 2_000)).replace(/^(?:\s*(?:\/\/|#)[^\n]*\n)+/, '').trimStart();
  return /^(?:strict\s+)?(?:digraph|graph)\b[^{}\n;]{0,200}(?:\n\s*)?\{/i.test(head);
}

function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  const push = (kind: Token['kind'], text: string, quoted = false, html = false) => {
    if (tokens.length >= MAX_TOKENS) refuse('the DOT source is too large');
    tokens.push({ kind, text, quoted, html });
  };
  let i = 0;
  let lineStart = true;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === '\n') {
      lineStart = true;
      i++;
    } else if (/\s/.test(ch)) {
      i++;
    } else if (s.startsWith('//', i) || (ch === '#' && lineStart)) {
      const end = s.indexOf('\n', i);
      i = end < 0 ? s.length : end;
    } else if (s.startsWith('/*', i)) {
      const end = s.indexOf('*/', i + 2);
      if (end < 0) refuse('a comment is not closed');
      i = end + 2;
    } else if (ch === '"') {
      let text = '';
      let j = i + 1;
      for (; j < s.length && s[j] !== '"'; j++) {
        if (s[j] === '\\' && s[j + 1] === '\n') j++;
        else if (s[j] === '\\' && j + 1 < s.length) text += s[j]! + s[++j]!;
        else text += s[j]!;
      }
      if (j >= s.length) refuse('a string is not closed');
      push('id', text, true);
      i = j + 1;
      lineStart = false;
    } else if (ch === '<') {
      let depth = 1;
      let j = i + 1;
      for (; j < s.length && depth > 0; j++) {
        if (s[j] === '<') depth++;
        else if (s[j] === '>') depth--;
      }
      if (depth) refuse('an HTML label is not closed');
      push('id', s.slice(i + 1, j - 1), false, true);
      i = j;
      lineStart = false;
    } else if (s.startsWith('->', i) || s.startsWith('--', i)) {
      push('op', s.slice(i, i + 2));
      i += 2;
      lineStart = false;
    } else if ('{}[];,=:+'.includes(ch)) {
      push('op', ch);
      i++;
      lineStart = false;
    } else {
      WORD.lastIndex = i;
      const word = WORD.exec(s);
      if (!word) refuse('the DOT source has a character the grammar does not allow');
      push('id', word[0]);
      i = WORD.lastIndex;
      lineStart = false;
    }
  }
  return tokens;
}

/** A quoted DOT string as label text: `\n`, `\l`, `\r` break the line; `\N`, `\G`, `\T`, `\H`, `\E` name things. */
function unescape(text: string, names: Record<string, string>): string {
  return text.replace(/\\([\s\S])/g, (whole, ch: string) => {
    if (ch === 'n' || ch === 'l' || ch === 'r') return '\n';
    if (ch === '"' || ch === '\\') return ch;
    return Object.prototype.hasOwnProperty.call(names, ch) ? names[ch]! : whole;
  });
}

function valueText(value: Value, names: Record<string, string>): string {
  return labelText(value.html ? decodeEntities(flattenHtml(value.text)) : decodeEntities(unescape(value.text, names)));
}

const BOX_SHAPES = new Set(['box', 'rect', 'rectangle', 'square']);
const ROUND_SHAPES = new Set(['ellipse', 'oval', 'circle']);
const BARE_SHAPES = new Set(['none', 'plaintext', 'plain']);
const PLAIN_HEADS = new Set(['normal', 'vee', 'open', 'lnormal', 'rnormal']);
/** Attributes that put text or a picture on the drawing; the graph engine has no place for them. */
const DATA_ATTRS = ['xlabel', 'headlabel', 'taillabel', 'image', 'lhead', 'ltail'];

class DotParser {
  private at = 0;
  private depth = 0;
  private readonly nodes = new Map<string, Attrs>();
  private readonly edges: DotEdge[] = [];
  private readonly graph: Attrs = new Map();
  private readonly notes = new Notes();
  private readonly tokens: Token[];

  constructor(source: string) {
    this.tokens = tokenize(stripFence(source));
  }

  translate(): Translation {
    const strict = this.keyword('strict');
    if (!this.keyword('digraph') && !this.keyword('graph')) refuse('the source is not a DOT graph');
    const name = this.peek()?.kind === 'id' ? this.id().text : '';
    this.expect('{');
    this.statements({ node: new Map(), edge: new Map() }, true);
    this.expect('}');
    while (this.isOp(';')) this.at++;
    if (this.at < this.tokens.length) refuse('text follows the closing brace');
    return this.build(strict, name);
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.at + offset];
  }

  private isOp(text: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.kind === 'op' && token.text === text;
  }

  private isKeyword(word: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.kind === 'id' && !token.quoted && !token.html && token.text.toLowerCase() === word;
  }

  private keyword(word: string): boolean {
    if (!this.isKeyword(word)) return false;
    this.at++;
    return true;
  }

  private expect(op: string): void {
    if (!this.isOp(op)) refuse(`the DOT source is missing ${op}`);
    this.at++;
  }

  /** An id, with `"a" + "b"` string concatenation. */
  private id(): Value {
    const token = this.peek();
    if (token?.kind !== 'id') refuse('the DOT source has a statement the grammar does not allow');
    this.at++;
    let text = token.text;
    while (token.quoted && this.isOp('+') && this.peek(1)?.quoted) {
      text += this.peek(1)!.text;
      this.at += 2;
    }
    return { text, html: token.html };
  }

  private attrList(): Attrs {
    const attrs: Attrs = new Map();
    while (this.isOp('[')) {
      this.at++;
      while (!this.isOp(']')) {
        const key = this.id().text.toLowerCase();
        this.expect('=');
        attrs.set(key, this.id());
        if (this.isOp(',') || this.isOp(';')) this.at++;
      }
      this.at++;
    }
    return attrs;
  }

  private statements(scope: Scope, root: boolean): Set<string> {
    const members = new Set<string>();
    while (!this.isOp('}')) {
      if (!this.peek()) refuse('the DOT source is missing }');
      if (this.isOp(';')) this.at++;
      else this.statement(scope, root, members);
    }
    return members;
  }

  private graphAttr(key: string, value: Value, root: boolean): void {
    if (root) this.graph.set(key, value);
    else if (key === 'label') this.notes.add(`cluster "${valueText(value, {})}" flattened: its nodes are drawn without the group box`);
    else this.notes.add('subgraph layout hint ignored');
  }

  private statement(scope: Scope, root: boolean, members: Set<string>): void {
    for (const target of ['graph', 'node', 'edge'] as const) {
      if (!this.isKeyword(target) || !this.isOp('[', 1)) continue;
      this.at++;
      for (const [key, value] of this.attrList()) {
        if (target === 'graph') this.graphAttr(key, value, root);
        else scope[target].set(key, value);
      }
      return;
    }
    if (this.peek()?.kind === 'id' && this.isOp('=', 1)) {
      const key = this.id().text.toLowerCase();
      this.at++;
      this.graphAttr(key, this.id(), root);
      return;
    }
    const chain: string[][] = [this.endpoint(scope, members)];
    const plainNode = chain[0]!.length === 1 && !this.isOp('}', -1);
    const directed: boolean[] = [];
    while (this.isOp('->') || this.isOp('--')) {
      directed.push(this.peek()!.text === '->');
      this.at++;
      chain.push(this.endpoint(scope, members));
    }
    const attrs = this.attrList();
    if (!directed.length) {
      if (plainNode) for (const [key, value] of attrs) this.nodes.get(chain[0]![0]!)!.set(key, value);
      else if (attrs.size) refuse('a subgraph cannot take attributes');
      return;
    }
    directed.forEach((isDirected, index) => {
      for (const from of chain[index]!) {
        for (const to of chain[index + 1]!) {
          if (this.edges.length >= 2_000) refuse('too many edges for one figure');
          this.edges.push({ from, to, attrs: new Map([...scope.edge, ...attrs]), directed: isDirected });
        }
      }
    });
  }

  /** A node (ports dropped) or a subgraph; a subgraph endpoint stands for every node inside it. */
  private endpoint(scope: Scope, members: Set<string>): string[] {
    if (this.isKeyword('subgraph') || this.isOp('{')) {
      if (this.keyword('subgraph') && this.peek()?.kind === 'id') this.at++;
      this.expect('{');
      if (++this.depth > MAX_DEPTH) refuse('subgraphs are nested too deeply');
      const inner = this.statements({ node: new Map(scope.node), edge: new Map(scope.edge) }, false);
      this.depth--;
      this.expect('}');
      for (const key of inner) members.add(key);
      return [...inner];
    }
    const key = unescape(this.id().text, {});
    while (this.isOp(':')) {
      this.at++;
      this.id();
    }
    if (!this.nodes.has(key)) {
      if (this.nodes.size >= 2_000) refuse('too many nodes for one figure');
      this.nodes.set(key, new Map(scope.node));
    }
    members.add(key);
    return [key];
  }

  private build(strict: boolean, graphName: string): Translation {
    const draft = new GraphDraft();
    if (this.tokens.some((token) => (token.quoted && /\\[nlr]/.test(token.text)) || (token.html && /<br/i.test(token.text)))) this.notes.add(LINE_BREAK_NOTE);
    const direction = this.graph.get('rankdir');
    if (direction) applyDirection(draft, direction.text.trim(), this.notes);
    const title = this.graph.get('label');
    const caption = title ? valueText(title, { G: graphName }) : '';

    const labels = new Map<string, string>();
    const pseudo = new Set<string>();
    const accepting = new Set<string>();
    const decisions = new Set<string>();
    const explicitRound: string[] = [];
    for (const [key, attrs] of this.nodes) {
      if (DATA_ATTRS.some((name) => attrs.has(name))) refuse('external labels and images have no native form');
      const shape = (attrs.get('shape')?.text ?? 'ellipse').trim().toLowerCase();
      if (shape === 'record' || shape === 'mrecord') refuse('record nodes have no native form');
      const labelValue = attrs.get('label');
      const label = labelValue ? valueText(labelValue, { N: key, G: graphName }) : labelText(key);
      const invisible = /\binvis/i.test(attrs.get('style')?.text ?? '');
      if (shape === 'point' || invisible || (!label && BARE_SHAPES.has(shape))) {
        pseudo.add(key);
        continue;
      }
      if (!label) refuse('a node has no label');
      labels.set(key, label);
      if (shape === 'diamond') decisions.add(key);
      else if (shape === 'doublecircle' || attrs.get('peripheries')?.text.trim() === '2') accepting.add(key);
      else if (ROUND_SHAPES.has(shape)) {
        if (attrs.has('shape')) explicitRound.push(shape);
      } else if (!BOX_SHAPES.has(shape)) this.notes.add(`${shape} outline drawn as a box`);
      if ([...attrs.keys()].some((name) => name !== 'label' && name !== 'shape' && name !== 'peripheries')) this.notes.add('styling attributes ignored');
    }

    const starts = new Set<string>();
    const edges: Array<{ from: string; to: string; label: string; directed: boolean }> = [];
    for (const edge of this.edges) {
      const { attrs } = edge;
      if (DATA_ATTRS.some((name) => attrs.has(name))) refuse('edge end labels and cluster edges have no native form');
      const style = (attrs.get('style')?.text ?? '').toLowerCase();
      const labelValue = attrs.get('label');
      const label = labelValue ? valueText(labelValue, { G: graphName, T: edge.from, H: edge.to, E: `${edge.from}->${edge.to}` }) : '';
      if (pseudo.has(edge.to)) refuse('an invisible or point node inside the graph cannot be drawn');
      if (pseudo.has(edge.from)) {
        // The usual automaton idiom: an unseen node whose arrow marks the start state.
        if (!edge.directed || (label && !/^start$/i.test(label))) refuse('a labelled arrow from an invisible node has no native form');
        if (label) this.notes.add('the word on the start arrow is dropped: the entry arrow itself marks the start');
        starts.add(edge.to);
        continue;
      }
      if (/\binvis/.test(style)) {
        this.notes.add('invisible layout edge ignored');
        continue;
      }
      if (/\b(dashed|dotted|bold)\b/.test(style)) this.notes.add(`${/\b(dashed|dotted|bold)\b/.exec(style)![1]!} line drawn as a regular arrow`);
      const dir = (attrs.get('dir')?.text ?? (edge.directed ? 'forward' : 'none')).trim().toLowerCase();
      const head = (attrs.get('arrowhead')?.text ?? 'normal').trim().toLowerCase();
      const tail = (attrs.get('arrowtail')?.text ?? 'normal').trim().toLowerCase();
      const forward = dir === 'forward' || dir === 'both';
      const backward = dir === 'back' || dir === 'both';
      if (!forward && !backward && dir !== 'none') refuse('an edge direction cannot be read');
      const headless = forward && head === 'none';
      const tailless = backward && tail === 'none';
      if ((forward && !headless && !PLAIN_HEADS.has(head)) || (backward && !tailless && !PLAIN_HEADS.has(tail))) refuse('special arrowheads carry a meaning the graph cannot draw');
      const drawForward = forward && !headless;
      const drawBackward = backward && !tailless;
      if (drawForward) edges.push({ from: edge.from, to: edge.to, label, directed: true });
      if (drawBackward) edges.push({ from: edge.to, to: edge.from, label, directed: true });
      if (!drawForward && !drawBackward) edges.push({ from: edge.from, to: edge.to, label, directed: false });
      if ([...attrs.keys()].some((name) => !['label', 'dir', 'arrowhead', 'arrowtail'].includes(name))) this.notes.add('styling attributes ignored');
    }
    if (pseudo.size && !starts.size) this.notes.add('invisible node ignored');
    const automaton = starts.size > 0 || accepting.size > 0;
    if (!automaton) for (const shape of new Set(explicitRound)) this.notes.add(`${shape} outline drawn as a box`);

    for (const [key, label] of labels) {
      const node = draft.node(key);
      if (label !== key) node.label = label;
      if (decisions.has(key)) node.shape = 'decision';
      node.accept = accepting.has(key);
      node.start = starts.has(key);
    }
    const seen = new Map<string, number>();
    const kept: typeof edges = [];
    for (const edge of edges) {
      const pair = `${edge.from}\u0000${edge.to}`;
      const earlier = strict ? seen.get(pair) : undefined;
      // `strict` keeps one edge per ordered pair; a later statement only updates its attributes.
      if (earlier !== undefined) {
        if (edge.label) kept[earlier]!.label = edge.label;
        continue;
      }
      seen.set(pair, kept.length);
      kept.push(edge);
    }
    for (const edge of kept) draft.edge(edge.from, edge.to, edge.label, edge.directed);
    return { type: 'graph', content: draft.toSpec(this.notes), ...(caption ? { caption } : {}), notes: this.notes.list() };
  }
}

/** Translate DOT source. Throws `Refusal`. */
export function translateDot(source: string): Translation {
  return new DotParser(source).translate();
}
