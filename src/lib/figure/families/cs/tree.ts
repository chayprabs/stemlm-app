/**
 * Rooted trees: binary tree, binary search tree, binary heap, general (n-ary) tree.
 *
 *   kind:      binary | bst | heap | nary      inferred when absent: the type alias (heap, bst), else heap: -> heap, insert: -> bst, node: -> nary
 *   values:    8, 3, 10, 1, 6, null, 14        level order; null, None, nil, -, # or an empty slot is a hole
 *   insert:    8, 3, 10, 1, 6, 14              bst: built here by inserting in this order
 *   heap:      min | max                       the array is checked against the heap property and drawn under the tree
 *   node:      A B C                           `<parent> <child> …`, repeatable; the first line's parent is the root
 *   highlight: 6, 3                            nodes to accent
 *   path:      8, 3, 6                         a downward path whose edges are accented
 *   traversal: inorder | preorder | postorder | level     computed here and printed under the tree
 *
 * Level order has two conventions: a hole has no children listed after it (LeetCode, most textbooks), or the
 * list is a full array in which a hole keeps its children's slots. Each list is read both ways. Nearly every
 * list is valid in only one or gives the same tree in both; the rare list that gives two different trees is
 * refused rather than guessed.
 *
 * BST duplicates: a key equal to a node goes to that node's right subtree (the CLRS insertion rule), so every
 * inserted key is drawn. Keys compare as numbers when all are numbers, otherwise as text in natural order.
 */
import type { CompileCtx, CompileResult } from '../../types';
import { specGet, specGetAll, specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { LINE_PITCH, TEXT_H, fail, isClipped, splitItems, textWidth, unquote, wrapText } from './common';

export const TREE_MAX_NODES = 63;
/** Canvas limits as multiples of the nominal frame: beyond them node labels fall under the legible size. */
const MAX_WIDTH_FACTOR = 1.5;
const MAX_HEIGHT_FACTOR = 3;

type Kind = 'binary' | 'bst' | 'heap' | 'nary';

export interface TreeNode {
  label: string;
  /** Binary kinds: exactly [left, right] with null for a missing side. General trees: the children in order. */
  children: Array<number | null>;
}

export interface Tree {
  nodes: TreeNode[];
  root: number;
  binary: boolean;
}

const NULL_TOKEN = /^(?:null|none|nil|nul|n\/a|na|-|–|—|#|_|∅)?$/i;
const isHole = (item: string) => NULL_TOKEN.test(item.trim());

/** Level order as LeetCode and most textbooks write it: only real nodes have their two children listed. */
function fromQueueOrder(items: string[]): Tree | null {
  if (!items.length || isHole(items[0]!)) return null;
  const nodes: TreeNode[] = [{ label: items[0]!, children: [null, null] }];
  const queue = [0];
  let at = 1;
  while (at < items.length) {
    const parent = queue.shift();
    if (parent === undefined) return items.slice(at).every(isHole) ? { nodes, root: 0, binary: true } : null;
    for (const side of [0, 1]) {
      const item = items[at++];
      if (item === undefined || isHole(item)) continue;
      nodes.push({ label: item, children: [null, null] });
      nodes[parent]!.children[side] = nodes.length - 1;
      queue.push(nodes.length - 1);
    }
  }
  return { nodes, root: 0, binary: true };
}

/** Level order as a full array: the children of slot i are slots 2i+1 and 2i+2, whether or not slot i is a hole. */
function fromArrayOrder(items: string[]): Tree | null {
  if (!items.length || isHole(items[0]!)) return null;
  const index = new Map<number, number>();
  const nodes: TreeNode[] = [];
  for (let slot = 0; slot < items.length; slot++) {
    if (isHole(items[slot]!)) continue;
    nodes.push({ label: items[slot]!, children: [null, null] });
    index.set(slot, nodes.length - 1);
    if (slot === 0) continue;
    const parent = index.get((slot - 1) >> 1);
    if (parent === undefined) return null;
    nodes[parent]!.children[(slot - 1) % 2] = nodes.length - 1;
  }
  return { nodes, root: 0, binary: true };
}

function sameShape(a: Tree, b: Tree, x: number | null = a.root, y: number | null = b.root): boolean {
  if (x === null || y === null) return x === y;
  const [p, q] = [a.nodes[x]!, b.nodes[y]!];
  return p.label === q.label && sameShape(a, b, p.children[0]!, q.children[0]!) && sameShape(a, b, p.children[1]!, q.children[1]!);
}

/** The tree a level-order list describes; null when it describes none, 'ambiguous' when its two readings differ. */
export function parseLevelOrder(items: string[]): Tree | 'ambiguous' | null {
  const queue = fromQueueOrder(items);
  const array = fromArrayOrder(items);
  if (queue && array && !sameShape(queue, array)) return 'ambiguous';
  return queue ?? array;
}

function comparator(keys: string[]): (a: string, b: string) => number {
  const numeric = keys.every((key) => key.trim() !== '' && Number.isFinite(Number(key)));
  return numeric ? (a, b) => Number(a) - Number(b) : (a, b) => a.localeCompare(b, 'en', { numeric: true });
}

export function buildBst(keys: string[]): Tree {
  const less = comparator(keys);
  const nodes: TreeNode[] = [];
  for (const key of keys) {
    nodes.push({ label: key, children: [null, null] });
    const added = nodes.length - 1;
    if (!added) continue;
    let at = 0;
    for (;;) {
      const side = less(key, nodes[at]!.label) < 0 ? 0 : 1;
      const next = nodes[at]!.children[side];
      if (next === null || next === undefined) { nodes[at]!.children[side] = added; break; }
      at = next;
    }
  }
  return { nodes, root: 0, binary: true };
}

/** The first parent and child that break the heap order, as a sentence; null for a valid heap. */
export function heapViolation(values: string[], order: 'min' | 'max'): string | null {
  const compare = comparator(values);
  for (let child = 1; child < values.length; child++) {
    const parent = (child - 1) >> 1;
    const delta = compare(values[parent]!, values[child]!);
    if (order === 'min' ? delta > 0 : delta < 0) {
      return `not a ${order}-heap: parent ${values[parent]} (index ${parent}) is ${order === 'min' ? 'greater' : 'smaller'} than its child ${values[child]} (index ${child})`;
    }
  }
  return null;
}

function parseNodeLines(lines: string[], binary: boolean): Tree | string {
  const ids = new Map<string, number>();
  const nodes: TreeNode[] = [];
  const parentOf = new Map<number, number>();
  const idOf = (label: string) => {
    if (!ids.has(label)) {
      nodes.push({ label, children: binary ? [null, null] : [] });
      ids.set(label, nodes.length - 1);
    }
    return ids.get(label)!;
  };
  for (const line of lines) {
    const words = (line.match(/"[^"]*"|'[^']*'|[^\s,]+/g) ?? []).map((word) => unquote(word.replace(/:$/, ''))).filter((word) => word && !/^(?:->|→|=>|:)$/.test(word));
    if (!words.length) return 'a node line is empty';
    if (isHole(words[0]!)) return 'a node line needs a parent';
    const parent = idOf(words[0]!);
    const listed = words.slice(1);
    if (binary && listed.length > 2) return `${words[0]} has ${listed.length} children; a binary tree node has at most two`;
    for (const [slot, word] of listed.entries()) {
      if (isHole(word)) {
        if (!binary) return `${words[0]} lists an empty child; only a binary tree has left and right slots`;
        continue;
      }
      const child = idOf(word);
      if (child === 0 || parentOf.has(child)) return child === 0 ? `${word} is the root and cannot be a child` : `${word} has two parents`;
      if (child === parent) return `${word} cannot be its own child`;
      parentOf.set(child, parent);
      if (binary) {
        if (nodes[parent]!.children[slot] !== null) return `${words[0]} lists its children on more than one line`;
        nodes[parent]!.children[slot] = child;
      } else nodes[parent]!.children.push(child);
    }
  }
  // Every node hangs from the root; a second parentless node or a cycle is not a tree.
  const seen = new Set<number>();
  const visit = (id: number): void => {
    if (seen.has(id)) return;
    seen.add(id);
    nodes[id]!.children.forEach((child) => { if (child !== null) visit(child); });
  };
  visit(0);
  const stray = nodes.findIndex((_, id) => !seen.has(id));
  if (stray >= 0) return `${nodes[stray]!.label} is not connected to the root ${nodes[0]!.label}`;
  return { nodes, root: 0, binary };
}

const kidsOf = (tree: Tree, id: number) => tree.nodes[id]!.children.filter((child): child is number => child !== null);

export type Traversal = 'inorder' | 'preorder' | 'postorder' | 'level';

export function traverse(tree: Tree, order: Traversal): number[] {
  const out: number[] = [];
  if (order === 'level') {
    const queue = [tree.root];
    for (let i = 0; i < queue.length; i++) {
      out.push(queue[i]!);
      queue.push(...kidsOf(tree, queue[i]!));
    }
    return out;
  }
  const walk = (id: number | null | undefined): void => {
    if (id === null || id === undefined) return;
    const [left, right] = tree.nodes[id]!.children;
    if (order === 'preorder') out.push(id);
    if (order === 'inorder') {
      walk(left);
      out.push(id);
      walk(right);
      return;
    }
    kidsOf(tree, id).forEach(walk);
    if (order === 'postorder') out.push(id);
  };
  walk(tree.root);
  return out;
}

const KINDS: Array<[RegExp, Kind]> = [
  [/^(?:bst|binary[- _]?search([- _]?tree)?|search([- _]?tree)?)$/, 'bst'],
  [/^(?:(?:min|max|binary)?[- _]?heap)$/, 'heap'],
  [/^(?:binary([- _]?tree)?|bt|btree)$/, 'binary'],
  [/^(?:n[- _]?ary|general|generic|rooted|tree|multiway|k[- _]?ary)([- _]?tree)?$/, 'nary'],
];
const TRAVERSALS: Array<[RegExp, Traversal, string]> = [
  [/^in[- _]?(order)?$/, 'inorder', 'in-order'],
  [/^(pre[- _]?(order)?|dfs|depth[- _]?first)$/, 'preorder', 'pre-order'],
  [/^post[- _]?(order)?$/, 'postorder', 'post-order'],
  [/^(level([- _]?order)?|bfs|breadth[- _]?first)$/, 'level', 'level-order'],
];

interface Placed {
  x: number;
  y: number;
  w: number;
}

/**
 * Tidy layout: each subtree is laid out on its own, then siblings are pushed apart just far enough that their
 * outlines (per level) keep `gap` between them, and a parent is centred over its children. An only child of a
 * binary node is offset to its own side so left and right stay readable.
 */
function layout(tree: Tree, widths: number[], gap: number, levelGap: number): Placed[] {
  const placed: Placed[] = tree.nodes.map((_, id) => ({ x: 0, y: 0, w: widths[id]! }));
  type Outline = Array<[number, number]>;
  const offsets = new Map<number, number>();
  const outline = (id: number): Outline => {
    const half = widths[id]! / 2;
    const slots = tree.nodes[id]!.children;
    const kids = kidsOf(tree, id);
    if (!kids.length) return [[-half, half]];
    const merged: Outline = [];
    const xs: number[] = [];
    kids.forEach((kid, i) => {
      const shape = outline(kid);
      let x = 0;
      if (i > 0) x = Math.max(...shape.map(([left], level) => (merged[level] ? merged[level]![1] - left + gap : -Infinity)));
      xs.push(x);
      shape.forEach(([left, right], level) => { merged[level] = [Math.min(merged[level]?.[0] ?? Infinity, x + left), x + right]; });
    });
    const lean = Math.max(half, widths[kids[0]!]! / 2) / 2 + gap / 2;
    const centre = kids.length > 1 ? (xs[0]! + xs[xs.length - 1]!) / 2 : tree.binary ? (slots[0] !== null ? lean : -lean) : 0;
    kids.forEach((kid, i) => offsets.set(kid, xs[i]! - centre));
    return [[-half, half], ...merged.map(([left, right]): [number, number] => [left - centre, right - centre])];
  };
  outline(tree.root);
  const place = (id: number, x: number, depth: number): void => {
    placed[id]!.x = x;
    placed[id]!.y = depth * levelGap;
    kidsOf(tree, id).forEach((kid) => place(kid, x + offsets.get(kid)!, depth + 1));
  };
  place(tree.root, 0, 0);
  return placed;
}

function findPath(tree: Tree, labels: string[]): number[] | string {
  const starts = tree.nodes.flatMap((node, id) => (node.label === labels[0] ? [id] : []));
  if (!starts.length) return `${labels[0]} is not a node of the tree`;
  let failure = '';
  // The root first: a path is normally given from the root, and a repeated label lower down must not win.
  for (const start of starts.sort((a, b) => Number(b === tree.root) - Number(a === tree.root))) {
    const chain = [start];
    for (const label of labels.slice(1)) {
      const next = kidsOf(tree, chain[chain.length - 1]!).find((kid) => tree.nodes[kid]!.label === label);
      if (next === undefined) {
        failure ||= `${label} is not a child of ${tree.nodes[chain[chain.length - 1]!]!.label}`;
        break;
      }
      chain.push(next);
    }
    if (chain.length === labels.length) return chain;
  }
  return failure;
}

export function compileTree(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kindRaw = specGet(spec, 'kind')?.trim().toLowerCase();
  const valuesRaw = specGetAll(spec, 'values');
  const insertRaw = specGetAll(spec, 'insert');
  const heapRaw = specGet(spec, 'heap')?.trim().toLowerCase();
  const nodeLines = specList(spec, 'node');
  const pathRaw = specGet(spec, 'path');
  const traversalRaw = specGet(spec, 'traversal')?.trim().toLowerCase();

  // Without `kind:`, a type alias that names a kind (`type=heap`, `type=bst`) is that kind: drawing
  // it as a plain binary tree would skip the heap check or the insertion the model asked for.
  const named = KINDS.find(([pattern]) => pattern.test(kindRaw ?? ctx.alias ?? ''))?.[1];
  if (kindRaw !== undefined && !named) return fail(`tree kind: ${kindRaw} is not binary, bst, heap or nary`);
  const kind: Kind = named ?? (heapRaw !== undefined ? 'heap' : insertRaw.length ? 'bst' : nodeLines.length && !valuesRaw.length ? 'nary' : 'binary');
  const heapOrder = /min/.test(heapRaw ?? kindRaw ?? '') ? 'min' : /max/.test(heapRaw ?? kindRaw ?? '') ? 'max' : null;
  if (heapRaw !== undefined && !heapOrder) return fail(`tree heap: ${heapRaw} is not min or max`);
  if (heapRaw !== undefined && kind !== 'heap') return fail(`tree heap: applies to kind heap, not ${kind}`);

  const values = valuesRaw.flatMap(splitItems);
  const inserts = insertRaw.flatMap(splitItems);
  let tree: Tree;
  if (kind === 'bst') {
    if (nodeLines.length) return fail('tree kind bst is built from insert: (or values:), not node: lines');
    // A BST's level order, inserted in that order, rebuilds the same tree, so values: needs no holes here.
    const keys = [...values, ...inserts].filter((item) => !isHole(item));
    if (!keys.length) return fail('tree kind bst needs keys to insert');
    tree = buildBst(keys);
  } else if (kind === 'heap') {
    if (inserts.length || nodeLines.length) return fail('tree kind heap is drawn from its array in values:');
    if (!values.length) return fail('tree kind heap needs its array in values:');
    const hole = values.findIndex(isHole);
    if (hole >= 0) return fail(`a heap is a complete tree: position ${hole} of the array is empty`);
    const violations = (['min', 'max'] as const).filter((order) => !heapOrder || heapOrder === order).map((order) => heapViolation(values, order));
    if (violations.every((violation) => violation !== null)) return fail(`tree: ${heapOrder ? violations[0]! : `neither a min-heap nor a max-heap (${violations[0]!.replace(/^not a min-heap: /, '')})`}`);
    tree = fromArrayOrder(values)!;
  } else if (nodeLines.length) {
    if (values.length || inserts.length) return fail('tree takes node: lines or values:, not both');
    const parsed = parseNodeLines(nodeLines, kind === 'binary');
    if (typeof parsed === 'string') return fail(`tree: ${parsed}`);
    tree = parsed;
  } else {
    if (kind === 'nary') return fail('tree kind nary needs node: <parent> <child> … lines');
    if (inserts.length) return fail('tree insert: builds a bst; a binary tree is given by values: in level order');
    const parsed = parseLevelOrder(values);
    if (!parsed) return fail(values.length && !isHole(values[0]!) ? 'tree values: are not a level order: a node is listed under a hole' : 'tree values: must start with the root');
    if (parsed === 'ambiguous') return fail('tree values: describe two different trees depending on whether a hole keeps slots for its children; give the tree as node: <parent> <left> <right> lines with kind: binary', 'refused');
    tree = parsed;
  }
  if (tree.nodes.length > TREE_MAX_NODES) return fail(`tree draws at most ${TREE_MAX_NODES} nodes legibly; this one has ${tree.nodes.length}`, 'refused');

  let pathNodes: number[] = [];
  if (pathRaw !== undefined) {
    const labels = pathRaw.split(/\s*(?:,|;|->|→|=>)\s*|\s+/).map(unquote).filter(Boolean);
    if (!labels.length) return fail('tree path: is empty');
    const found = findPath(tree, labels);
    if (typeof found === 'string') return fail(`tree path: ${labels.join(' → ')} is not a path in the tree: ${found}`);
    pathNodes = found;
  }
  let traversalLine: string | null = null;
  if (traversalRaw !== undefined) {
    const entry = TRAVERSALS.find(([pattern]) => pattern.test(traversalRaw));
    if (!entry) return fail(`tree traversal: ${traversalRaw} is not inorder, preorder, postorder or level`);
    if (entry[1] === 'inorder' && !tree.binary) return fail('tree traversal: inorder is defined for binary trees only');
    traversalLine = `${entry[2]}: ${traverse(tree, entry[1]).map((id) => tree.nodes[id]!.label).join(', ')}`;
  }

  // Circles while every label fits one; otherwise pills as wide as their text.
  const labelW = tree.nodes.map((node) => textWidth(node.label));
  const widest = Math.max(...labelW);
  const circles = widest <= 26;
  const radius = circles ? Math.max(11, Math.ceil(widest / 2) + 4) : 11;
  const widths = labelW.map((w) => (circles ? 2 * radius : Math.max(2 * radius, w + 14)));
  const levelGap = 2 * radius + 16;
  const nominal = frameSize(ctx.profile);
  const margin = 8;
  const span = (nodes: Placed[]) => Math.max(...nodes.map((node) => node.x + node.w / 2)) - Math.min(...nodes.map((node) => node.x - node.w / 2));
  // A small tree gets room; one that would overflow the frame is drawn at the tightest spacing that stays clear.
  let placed = layout(tree, widths, 24, levelGap);
  for (const gap of [16, 5]) if (span(placed) > nominal.w - 2 * margin) placed = layout(tree, widths, gap, levelGap);
  const treeW = span(placed);
  const levels = Math.max(...placed.map((node) => node.y)) / levelGap + 1;
  if (treeW + 2 * margin > nominal.w * MAX_WIDTH_FACTOR) {
    return fail(`tree is too wide to draw legibly: it needs ${Math.round(treeW)} units across and the frame allows ${Math.round(nominal.w * MAX_WIDTH_FACTOR - 2 * margin)}`, 'refused');
  }

  const isHeap = kind === 'heap';
  const cellW = isHeap ? Math.max(22, widest + 10, textWidth(String(tree.nodes.length - 1)) + 6) : 0;
  const cellH = 20;
  const arrayW = cellW * tree.nodes.length;
  if (arrayW + 2 * margin > nominal.w * MAX_WIDTH_FACTOR) {
    return fail(`heap array of ${tree.nodes.length} elements is too wide to draw legibly (about ${Math.floor((nominal.w * MAX_WIDTH_FACTOR - 2 * margin) / cellW)} fit)`, 'refused');
  }
  const width = Math.max(nominal.w, treeW + 2 * margin, arrayW + 2 * margin);
  const traversalLines = traversalLine ? wrapText(traversalLine, width - 2 * margin, 5) : [];
  if (isClipped(traversalLines)) return fail('tree traversal is too long to print legibly under the tree', 'refused');
  const treeH = (levels - 1) * levelGap + 2 * radius;
  const arrayH = isHeap ? 10 + cellH + 2 + TEXT_H : 0;
  const notesH = traversalLines.length ? 8 + traversalLines.length * LINE_PITCH : 0;
  const contentH = treeH + arrayH + notesH;
  if (contentH + 2 * margin > nominal.h * MAX_HEIGHT_FACTOR) {
    return fail(`tree is too deep to draw legibly: ${levels} levels (about ${Math.floor((nominal.h * MAX_HEIGHT_FACTOR - 2 * margin - arrayH - notesH - 2 * radius) / levelGap) + 1} fit)`, 'refused');
  }

  const b = new SceneBuilder('tree', width, Math.max(contentH + 2 * margin, Math.min(nominal.h, 96)));
  const left = Math.min(...placed.map((node) => node.x - node.w / 2));
  const dx = (width - treeW) / 2 - left;
  const dy = (b.height - contentH) / 2 + radius;
  const at = (id: number) => ({ x: Number((placed[id]!.x + dx).toFixed(2)), y: Number((placed[id]!.y + dy).toFixed(2)), w: placed[id]!.w });

  const marked = new Set(spec.highlight.map((label) => label.toLowerCase()));
  const isMarked = (id: number) => marked.has(tree.nodes[id]!.label.toLowerCase());
  const onPath = new Set(pathNodes);
  const pathEdges = new Set(pathNodes.slice(1));

  /** Where the line from a node's centre toward `to` leaves the node's outline (a circle, or a pill of straight sides and round ends). */
  const rim = (id: number, to: { x: number; y: number }) => {
    const node = at(id);
    const flat = node.w / 2 - radius;
    const inside = (x: number, y: number) => Math.hypot(Math.max(0, Math.abs(x - node.x) - flat), y - node.y) <= radius;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inside(node.x + (to.x - node.x) * mid, node.y + (to.y - node.y) * mid)) lo = mid;
      else hi = mid;
    }
    return { x: Number((node.x + (to.x - node.x) * lo).toFixed(2)), y: Number((node.y + (to.y - node.y) * lo).toFixed(2)) };
  };

  tree.nodes.forEach((_, id) => {
    for (const kid of kidsOf(tree, id)) {
      const from = rim(id, at(kid));
      const to = rim(kid, at(id));
      const accent = pathEdges.has(kid) && onPath.has(id);
      b.line(`edge-${kid}`, from.x, from.y, to.x, to.y, { color: accent ? 'accent' : 'neutral', role: 'connector', width: accent ? 2.2 : 1.3 });
    }
  });
  tree.nodes.forEach((node, id) => {
    const { x, y, w } = at(id);
    const style = { color: isMarked(id) || onPath.has(id) ? 'accent' as const : 'neutral' as const, fill: isMarked(id) ? 'tint' as const : 'none' as const, role: 'geometry' as const, width: 1.6 };
    if (circles) b.circle(`node-${id}`, x, y, radius, style);
    else b.path(`node-${id}`, `M ${x - w / 2 + radius} ${y - radius} H ${x + w / 2 - radius} A ${radius} ${radius} 0 0 1 ${x + w / 2 - radius} ${y + radius} H ${x - w / 2 + radius} A ${radius} ${radius} 0 0 1 ${x - w / 2 + radius} ${y - radius} Z`, style);
    b.label(`label-${id}`, node.label, x, y, { protected: true });
  });

  let cursor = (b.height - contentH) / 2 + treeH;
  if (isHeap) {
    const x0 = (width - arrayW) / 2;
    const y0 = cursor + 10;
    tree.nodes.forEach((node, id) => {
      b.rect(`cell-${id}`, x0 + id * cellW, y0, cellW, cellH, { color: isMarked(id) ? 'accent' : 'neutral', fill: isMarked(id) ? 'tint' : 'none', role: 'boundary', width: 1.3 });
      b.label(`cell-label-${id}`, node.label, x0 + (id + 0.5) * cellW, y0 + cellH / 2, { protected: true });
      b.label(`index-${id}`, String(id), x0 + (id + 0.5) * cellW, y0 + cellH + 2 + TEXT_H / 2, { protected: true });
    });
    cursor += arrayH;
  }
  traversalLines.forEach((line, i) => b.label(`traversal-${i}`, line, width / 2, cursor + 8 + (i + 0.5) * LINE_PITCH, { protected: true }));
  return layoutAndCompile(b.scene());
}
