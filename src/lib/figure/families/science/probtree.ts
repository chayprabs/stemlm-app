/**
 * Probability tree, drawn left to right.
 *
 *   branch: root R 3/10 Red     `<parent-id|root> <id> <probability> [label words]`; the label defaults to the id
 *   show:   products            multiply along every path and print the result at its leaf
 *
 * A probability is a decimal (0.3), a fraction (3/10) or a percent (30%), and is printed as written.
 * All arithmetic is exact (rationals): the branches leaving a node must sum to 1, and a leaf product is a
 * reduced fraction when every input was a fraction, otherwise a decimal (a percent when every input was one).
 * Decimals rounded to two or more places may miss 1 by their rounding (0.33 + 0.33 + 0.33).
 * A label too wide for its column takes two balanced lines, and only past that ends in an ellipsis;
 * probabilities and products are always printed whole.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { unquote, wrapText } from '../cs/common';
import { wrapText as wrapBalanced } from '../stats/shared';
import { EDGE, LINE, TEXT_H, canvasHeight, finish, fmtSig, guard, plain, putLeft, put, readAll, readShow, refuse, safeId, textW } from './shared';

export const PROBTREE_MAX_LEAVES = 16;
export const PROBTREE_MAX_STAGES = 4;

interface Probability {
  text: string;
  num: bigint;
  den: bigint;
  /** `whole` is 0 or 1: exact however it is written, so it leaves a tree of fractions (or of percents) what it was. */
  kind: 'fraction' | 'decimal' | 'percent' | 'whole';
  /** Decimal places of the value as a plain decimal; 0 for a fraction. */
  decimals: number;
}

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}

function parseProbability(raw: string): Probability | null {
  const text = raw.replace(/^\((.*)\)$/, '$1').replace(/^\\?[dt]?frac\{(\d+)\}\{(\d+)\}$/, '$1/$2');
  const fraction = /^(\d{1,9})\/(\d{1,9})$/.exec(text);
  if (fraction) {
    const [num, den] = [BigInt(fraction[1]!), BigInt(fraction[2]!)];
    return den === 0n || num > den ? null : { text, num, den, kind: 'fraction', decimals: 0 };
  }
  const decimal = /^(\d{0,9})(?:\.(\d{1,9}))?(%?)$/.exec(text);
  if (!decimal || (!decimal[1] && !decimal[2])) return null;
  const whole = decimal[1] || '0';
  const places = decimal[2] ?? '';
  const percent = decimal[3] === '%';
  const decimals = places.length + (percent ? 2 : 0);
  const num = BigInt(whole + places);
  const den = 10n ** BigInt(decimals);
  if (num > den) return null;
  const kind = percent ? 'percent' : places ? 'decimal' : 'whole';
  return { text: `${whole}${places ? `.${places}` : ''}${percent ? '%' : ''}`, num, den, kind, decimals };
}

interface TreeNode {
  id: string;
  label: string;
  parent: TreeNode | null;
  probability: Probability | null;
  children: TreeNode[];
  depth: number;
  y: number;
}

const ROOT_WORD = /^(?:root|start|origin|∅)$/i;

function parseTree(lines: string[]): TreeNode {
  const nodes = new Map<string, TreeNode>();
  const node = (id: string): TreeNode => {
    const known = nodes.get(id);
    if (known) return known;
    const made: TreeNode = { id, label: id, parent: null, probability: null, children: [], depth: 0, y: 0 };
    nodes.set(id, made);
    return made;
  };
  for (const raw of lines) {
    const tokens = plain(raw)
      .replace(/\b(?:p|prob|probability)\s*=\s*/gi, '')
      .replace(/-+>|→|⇒|=>/g, ' ')
      .split(/[\s,;]+/)
      .map((token) => token.replace(/:$/, ''))
      .filter(Boolean);
    const [parentId, second, third] = tokens;
    if (!parentId || !second || !third) refuse(`branch "${raw.trim()}" is incomplete; write branch: <parent|root> <id> <probability> [label]`);
    // The grammar puts the id before the probability; `root 0.3 R` is the same branch.
    const swapped = !parseProbability(third) && parseProbability(second) !== null;
    const id = swapped ? third : second;
    const probability = parseProbability(swapped ? second : third);
    if (!probability) refuse(`branch "${raw.trim()}" needs a probability from 0 to 1: a decimal, a fraction such as 3/10, or a percent`);
    const parent = node(ROOT_WORD.test(parentId) ? 'root' : parentId);
    const child = node(ROOT_WORD.test(id) ? 'root' : id);
    if (child === parent) refuse(`branch "${raw.trim()}" leads from ${id} back to itself`);
    if (child.parent) {
      refuse(`${id} is reached by two branches; give each outcome its own id and repeat the label: branch: ${parentId} ${parentId}-${id} ${probability.text} ${id}`);
    }
    child.parent = parent;
    child.probability = probability;
    child.label = unquote(tokens.slice(3).join(' ')) || id;
    parent.children.push(child);
  }
  const roots = [...nodes.values()].filter((entry) => !entry.parent);
  if (!nodes.size) refuse('probtree needs branch lines: branch: <parent|root> <id> <probability> [label]');
  if (roots.length > 1) refuse(`probtree has more than one starting point (${roots.map((entry) => entry.id).join(', ')}); every branch must lead back to one root`);
  const root = roots[0];
  let reached = 0;
  const walk = (entry: TreeNode, depth: number) => {
    reached += 1;
    entry.depth = depth;
    entry.children.forEach((child) => walk(child, depth + 1));
  };
  if (root) walk(root, 0);
  if (!root || reached < nodes.size) refuse('probtree branches form a loop; every branch must lead away from the root');
  return root;
}

/** Exact sum of the branches leaving a node, checked against 1. */
function checkSum(node: TreeNode): void {
  const branches = node.children.map((child) => child.probability!);
  const den = branches.reduce((product, branch) => product * branch.den, 1n);
  const num = branches.reduce((sum, branch) => sum + (branch.num * den) / branch.den, 0n);
  if (num === den) return;
  // A decimal quoted to d ≥ 2 places is within half a unit of its last place of the value it rounds.
  const slack = branches.reduce((sum, branch) => sum + (branch.decimals >= 2 ? 0.5 * 10 ** -branch.decimals : 0), 0);
  const total = Number(num) / Number(den);
  if (Math.abs(total - 1) <= slack + 1e-12) return;
  const divisor = gcd(num, den);
  const shown = branches.some((branch) => branch.kind === 'fraction') ? `${num / divisor}/${den / divisor}` : String(Number(total.toFixed(6)));
  refuse(`the branches from ${node.id} sum to ${shown}, not 1`);
}

function productText(path: Probability[], exact: boolean, percent: boolean): string {
  const num = path.reduce((product, branch) => product * branch.num, 1n);
  const den = path.reduce((product, branch) => product * branch.den, 1n);
  if (exact) {
    const divisor = gcd(num, den);
    return den === divisor ? String(num / divisor) : `${num / divisor}/${den / divisor}`;
  }
  const scale = percent ? 100 : 1;
  const value = (Number(num) / Number(den)) * scale;
  // A product of decimals is itself a short decimal; print it whole when it is, to three figures otherwise.
  const places = path.some((branch) => branch.kind === 'fraction') ? Infinity : path.reduce((sum, branch) => sum + branch.decimals, 0) - (percent ? 2 : 0);
  const body = places <= 6 ? value.toFixed(Math.max(0, places)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : fmtSig(value, 3);
  return `${body}${percent ? '%' : ''}`;
}

const SHOW = { products: /\b(?:all|products?|leaf|leaves|joint|outcomes?|paths?|probabilit(?:y|ies))\b/g };

const MIN_RUN = 44;
const MAX_RUN = 78;
const MIN_PITCH = 24;
const EASY_PITCH = 34;
const MAX_PITCH = 40;
const MAX_ALONG = 0.62;
/** Room between the widest leaf label and the products, bridged by a dotted leader. */
const PRODUCT_GAP = 26;
const MAX_LABEL_W = 96;
/** Clear space between two labels stacked in one column, as between one-line labels at the closest pitch. */
const STACK_GAP = 10;

/** One line, else two balanced lines, else two full lines whose cut falls between words where it can. */
const labelLines = (label: string): string[] =>
  wrapBalanced(label, MAX_LABEL_W) ?? wrapText(label, MAX_LABEL_W, 2).map((line) => line.replace(/\s+\S+…$/, '…'));

function compile(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const root = parseTree(readAll(spec, 'branch'));
  const wantProducts = readShow(spec, 'show', SHOW).has('products');

  const all: TreeNode[] = [];
  const collect = (node: TreeNode) => {
    all.push(node);
    node.children.forEach(collect);
  };
  collect(root);
  const ends = all.filter((node) => !node.children.length);
  const stages = Math.max(...all.map((node) => node.depth));
  if (ends.length > PROBTREE_MAX_LEAVES) refuse(`probtree draws at most ${PROBTREE_MAX_LEAVES} outcomes legibly; this tree ends in ${ends.length}`, 'refused');
  if (stages > PROBTREE_MAX_STAGES) refuse(`probtree draws at most ${PROBTREE_MAX_STAGES} stages legibly; this tree has ${stages}`, 'refused');
  all.filter((node) => node.children.length).forEach(checkSum);
  const branches = all.flatMap((node) => (node.probability ? [node.probability] : []));
  const exact = branches.every((branch) => branch.kind === 'fraction' || branch.kind === 'whole');
  const percent = !exact && branches.every((branch) => branch.kind === 'percent' || branch.kind === 'whole');
  const leaves = ends.map((node) => {
    const path: Probability[] = [];
    for (let at: TreeNode | null = node; at?.probability; at = at.parent) path.push(at.probability);
    return { node, product: productText(path, exact, percent) };
  });
  const lines = new Map(all.map((node) => [node, labelLines(node.label)]));
  const labelH = (node: TreeNode) => TEXT_H + (lines.get(node)!.length - 1) * LINE;

  // Rows first, in leaf pitches: leaf i on row i, a parent midway between its first and last child.
  leaves.forEach((leaf, i) => { leaf.node.y = i; });
  const settle = (node: TreeNode): number => {
    const ys = node.children.map(settle);
    if (ys.length) node.y = (ys[0]! + ys.at(-1)!) / 2;
    return node.y;
  };
  settle(root);
  // The closest two labels in a column (in preorder, a column runs top to bottom) set the least pitch.
  let least = MIN_PITCH;
  for (let depth = 0; depth <= stages; depth++) {
    const column = all.filter((node) => node.depth === depth);
    column.slice(1).forEach((node, i) => {
      const above = column[i]!;
      least = Math.max(least, ((labelH(node) + labelH(above)) / 2 + STACK_GAP) / (node.y - above.y));
    });
  }
  // A two-line label on the first or last row reaches further past it.
  const [reachTop, reachBottom] = [0, leaves.length - 1].map((row) => Math.max(...all.filter((node) => node.y === row).map(labelH)) / 2) as [number, number];

  const nominal = frameSize(ctx.profile);
  const rowsH = (pitch: number) => 2 * EDGE + 4 + reachTop + reachBottom + (leaves.length - 1) * pitch;
  const easy = Math.max(EASY_PITCH, least);
  // A small tree takes a comfortable pitch and only the height it needs; a big one closes up before it grows.
  const height = rowsH(easy) <= nominal.h ? Math.max(72, Math.ceil(rowsH(easy))) : canvasHeight(rowsH(least), nominal.h);
  const pitch = leaves.length > 1 ? Math.min(Math.max(MAX_PITCH, least), (height - rowsH(0)) / (leaves.length - 1)) : 0;
  const top = (height - rowsH(pitch)) / 2 + EDGE + 2 + reachTop;
  all.forEach((node) => { node.y = top + node.y * pitch; });
  // A probability sits on its branch at the middle, or further out where close siblings have fanned a line apart.
  const along = new Map<TreeNode, number>();
  for (const node of all) {
    const gaps = node.children.slice(1).map((child, i) => child.y - node.children[i]!.y);
    const share = Math.min(MAX_ALONG, Math.max(0.5, (TEXT_H + 1) / Math.min(Infinity, ...gaps)));
    node.children.forEach((child) => along.set(child, share));
  }

  // Columns: each stage's labels start at one x; a branch runs from its parent's label to the next column.
  const showRoot = root.id !== 'root';
  // An unnamed root is a dot.
  const labelW = (node: TreeNode) => (node === root && !showRoot ? 2 : Math.max(...lines.get(node)!.map(textW)));
  const widest = Array.from({ length: stages + 1 }, (_, depth) => Math.max(...all.filter((node) => node.depth === depth).map(labelW)));
  // Long enough that a stub of the branch shows on both sides of its probability.
  const runs = widest.map((_, depth) => (depth
    ? Math.max(MIN_RUN, ...all.filter((node) => node.depth === depth).map((node) => (textW(node.probability!.text) / 2 + 7) / (1 - along.get(node)!)))
    : 0));
  const productW = wantProducts ? PRODUCT_GAP + Math.max(...leaves.map((leaf) => textW(leaf.product))) : 0;
  const fixed = 2 * EDGE + widest.reduce((sum, w) => sum + w, 0) + 8 * stages + productW;
  const needed = fixed + runs.reduce((sum, run) => sum + run, 0);
  if (needed > nominal.w * 1.5) refuse('the probability tree is too wide to draw legibly; shorten the labels or split the tree', 'refused');
  const width = Math.max(nominal.w, needed);
  const stretch = Math.max(0, Math.min((width - needed) / stages, MAX_RUN - Math.max(...runs)));
  const used = needed + stretch * stages;
  const columns: number[] = [];
  let x = (width - used) / 2 + EDGE;
  for (let depth = 0; depth <= stages; depth++) {
    x += depth ? runs[depth]! + stretch + 4 : 0;
    columns.push(x);
    x += widest[depth]! + 4;
  }

  const b = new SceneBuilder('probtree', width, height);
  const accented = new Set<TreeNode>();
  for (const id of spec.highlight) {
    for (let at: TreeNode | null | undefined = all.find((node) => node.id.toLowerCase() === id.toLowerCase()); at; at = at.parent) accented.add(at);
  }
  const plates: Array<() => void> = [];
  for (const node of all) {
    const key = safeId(node.id);
    const left = columns[node.depth]!;
    if (node === root && !showRoot) b.circle('root', left, node.y, 2.2, { fill: 'ink', role: 'geometry' });
    else {
      const rows = lines.get(node)!;
      rows.forEach((line, i) => putLeft(b, i ? `node2-${key}` : `node-${key}`, line, left, node.y + (i - (rows.length - 1) / 2) * LINE));
    }
    if (!node.parent || !node.probability) continue;
    const parent = node.parent;
    const from = columns[parent.depth]! + labelW(parent) + 4;
    const to = left - 4;
    b.line(`branch-${key}`, from, parent.y, to, node.y, { color: accented.has(node) ? 'accent' : 'neutral', role: 'connector', width: 1.4 });
    const share = along.get(node)!;
    const cx = from + (to - from) * share;
    const cy = parent.y + (node.y - parent.y) * share;
    const w = textW(node.probability.text);
    // The probability interrupts its branch: a patch of paper under the text, drawn after every branch.
    plates.push(() => b.rect(`plate-${key}`, cx - w / 2 - 2, cy - TEXT_H / 2, w + 4, TEXT_H, { color: 'muted', fill: 'paper', width: 0, role: 'annotation' }));
    put(b, `probability-${key}`, node.probability.text, cx, cy);
  }
  plates.forEach((draw) => draw());
  if (wantProducts) {
    const right = (width + used) / 2 - EDGE;
    for (const leaf of leaves) {
      const key = safeId(leaf.node.id);
      const from = columns[leaf.node.depth]! + labelW(leaf.node) + 5;
      const to = right - textW(leaf.product) - 5;
      b.line(`leader-${key}`, from, leaf.node.y, to, leaf.node.y, { color: 'muted', role: 'guide', width: 1, dash: true });
      put(b, `product-${key}`, leaf.product, right - textW(leaf.product) / 2, leaf.node.y);
    }
  }
  return finish(b.scene());
}

export const compileProbtree = guard(compile);
