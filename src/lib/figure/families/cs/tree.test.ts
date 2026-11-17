import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../geom';
import { TREE_MAX_NODES, buildBst, heapViolation, parseLevelOrder, traverse, type Tree } from './tree';
import { boxOf, compile, draw, expectCleanLabels, reason, type Drawn } from './testing';

const labels = (tree: Tree, ids: number[]) => ids.map((id) => tree.nodes[id]!.label);
/** A tree as nested text: label(left,right) with `-` for a missing side. */
function shape(tree: Tree, id: number | null = tree.root): string {
  if (id === null) return '-';
  const node = tree.nodes[id]!;
  const kids = node.children.map((child) => shape(tree, child));
  return kids.every((kid) => kid === '-') ? node.label : `${node.label}(${kids.join(',')})`;
}
const items = (text: string) => text.split(',').map((item) => item.trim());
const center = (drawn: Drawn, id: number) => {
  const box = boxOf(drawn.stroke(`node-${id}`)!);
  return { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };
};
const nodeCount = (drawn: Drawn) => drawn.scene.strokes.filter((stroke) => /^node-\d+$/.test(stroke.id)).length;

function expectTidy(drawn: Drawn, name: string): void {
  const count = nodeCount(drawn);
  const boxes = Array.from({ length: count }, (_, id) => (drawn.stroke(`node-${id}`)!.d ? drawn.placed.find((item) => item.label.id === `label-${id}`)!.box : boxOf(drawn.stroke(`node-${id}`)!)));
  boxes.forEach((a, i) => {
    expect(a.x1, `${name}: node ${i} leaves the frame`).toBeGreaterThanOrEqual(0);
    expect(a.x2, `${name}: node ${i} leaves the frame`).toBeLessThanOrEqual(drawn.scene.width);
    boxes.slice(i + 1).forEach((b, j) => {
      expect(a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2, `${name}: nodes ${i} and ${i + 1 + j} overlap`).toBe(false);
    });
  });
  expectCleanLabels(drawn);
}

describe('tree: structure', () => {
  const level = (text: string | string[]) => {
    const parsed = parseLevelOrder(Array.isArray(text) ? text : items(text));
    return parsed === null || parsed === 'ambiguous' ? parsed : shape(parsed);
  };

  it('reads level order with holes, in either convention', () => {
    expect(level('8, 3, 10, 1, 6, null, 14')).toBe('8(3(1,6),10(-,14))');
    // A hole has no children listed after it (LeetCode order)…
    expect(level('1, null, 2, 3, 4')).toBe('1(-,2(3,4))');
    // …or it keeps their slots (array order).
    expect(level('1, null, 2, null, null, 3, 4')).toBe('1(-,2(3,4))');
    expect(level('1, None, 2, NIL, -, #, 3')).toBe('1(-,2(-,3))');
    expect(level(['A', 'B', '', '', 'C'])).toBe('A(B(-,C),-)');
    expect(level('null, 1')).toBeNull();
    expect(level('1, null, null, 2')).toBeNull();
    expect(level([])).toBeNull();
  });

  it('refuses the rare list whose two readings are different trees, and only that', () => {
    // LeetCode order hangs 7 under 4; array order hangs it under 3.
    expect(level('0, 1, null, 3, 4, null, null, 7')).toBe('ambiguous');
    const random = mulberry32(7);
    const counts = { same: 0, ambiguous: 0, one: 0 };
    for (let trial = 0; trial < 4000; trial++) {
      const list = Array.from({ length: 1 + Math.floor(random() * 9) }, (_, i) => (i === 0 || random() < 0.6 ? String(i) : 'null'));
      const parsed = parseLevelOrder(list);
      if (parsed === null) continue;
      // Array order is valid when no node sits under a hole; a node's label is its slot, so its parent is known.
      const arrayValid = list.every((item, slot) => slot === 0 || item === 'null' || list[(slot - 1) >> 1] !== 'null');
      if (parsed === 'ambiguous') {
        expect(arrayValid, list.join(',')).toBe(true);
        counts.ambiguous++;
        continue;
      }
      const agreesWithArray = parsed.nodes.every((node) => node.children.every((child, side) => child === null || Number(parsed.nodes[child]!.label) === 2 * Number(node.label) + 1 + side));
      if (arrayValid) expect(agreesWithArray, list.join(',')).toBe(true);
      counts[arrayValid ? 'same' : 'one']++;
    }
    expect(counts.same).toBeGreaterThan(200);
    expect(counts.one).toBeGreaterThan(200);
    expect(counts.ambiguous).toBeGreaterThan(0);
    expect(counts.ambiguous).toBeLessThan(counts.same / 4);
  });

  it('builds a BST by insertion; an equal key goes right', () => {
    expect(shape(buildBst(items('8, 3, 10, 1, 6, 14, 4, 7, 13')))).toBe('8(3(1,6(4,7)),10(-,14(13,-)))');
    expect(shape(buildBst(items('5, 3, 5, 3')))).toBe('5(3(-,3),5)');
    // Numbers compare as numbers, words in natural order.
    expect(shape(buildBst(items('10, 9, 100')))).toBe('10(9,100)');
    expect(shape(buildBst(items('m, b, x, a10, a9')))).toBe('m(b(a10(a9,-),-),x)');
    // Inserting a BST's level order rebuilds it.
    const built = buildBst(items('8, 3, 10, 1, 6, 14'));
    expect(shape(buildBst(labels(built, traverse(built, 'level'))))).toBe(shape(built));
  });

  it('computes the four traversals', () => {
    const tree = parseLevelOrder(items('8, 3, 10, 1, 6, null, 14')) as Tree;
    expect(labels(tree, traverse(tree, 'inorder'))).toEqual(items('1, 3, 6, 8, 10, 14'));
    expect(labels(tree, traverse(tree, 'preorder'))).toEqual(items('8, 3, 1, 6, 10, 14'));
    expect(labels(tree, traverse(tree, 'postorder'))).toEqual(items('1, 6, 3, 14, 10, 8'));
    expect(labels(tree, traverse(tree, 'level'))).toEqual(items('8, 3, 10, 1, 6, 14'));
    // The in-order walk of any BST is sorted.
    const random = mulberry32(11);
    const keys = Array.from({ length: 40 }, () => String(Math.floor(random() * 100)));
    const bst = buildBst(keys);
    expect(labels(bst, traverse(bst, 'inorder')).map(Number)).toEqual(keys.map(Number).sort((a, b) => a - b));
  });

  it('names the first parent and child that break a heap', () => {
    expect(heapViolation(items('90, 70, 80, 30, 60, 50, 40'), 'max')).toBeNull();
    expect(heapViolation(items('1, 3, 2, 7, 4'), 'min')).toBeNull();
    expect(heapViolation(items('1, 5, 3, 4, 9'), 'min')).toBe('not a min-heap: parent 5 (index 1) is greater than its child 4 (index 3)');
    expect(heapViolation(items('9, 5, 10'), 'max')).toBe('not a max-heap: parent 9 (index 0) is smaller than its child 10 (index 2)');
    expect(heapViolation(items('5, 5, 5'), 'max')).toBeNull();
  });
});

describe('tree: the drawing', () => {
  it('draws a binary tree level by level with parents over their children', async () => {
    const drawn = await draw('tree', 'values: 8, 3, 10, 1, 6, null, 14\nhighlight: 6, 3');
    expect([0, 1, 2, 3, 4, 5].map((id) => drawn.text(`label-${id}`))).toEqual(['8', '3', '10', '1', '6', '14']);
    const [root, three, ten, one, six, fourteen] = [0, 1, 2, 3, 4, 5].map((id) => center(drawn, id));
    expect(three!.y).toBe(ten!.y);
    expect(three!.y).toBeGreaterThan(root!.y);
    expect(root!.x).toBeCloseTo((three!.x + ten!.x) / 2, 5);
    expect(three!.x).toBeCloseTo((one!.x + six!.x) / 2, 5);
    // An only child hangs on its own side: 14 is the right child of 10.
    expect(fourteen!.x).toBeGreaterThan(ten!.x);
    expect([1, 4].map((id) => [drawn.stroke(`node-${id}`)!.semanticColor, drawn.stroke(`node-${id}`)!.fill])).toEqual([['accent', 'tint'], ['accent', 'tint']]);
    expect(drawn.stroke('node-0')!.semanticColor).toBe('neutral');
    expect(drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('edge-'))).toHaveLength(5);
    expectTidy(drawn, 'binary');
  });

  it('builds the BST, accents the path and prints the traversal it computed', async () => {
    const drawn = await draw('bst', 'insert: 8, 3, 10, 1, 6, 14, 4, 7, 13\npath: 8 -> 3 -> 6 -> 4\ntraversal: in-order');
    expect(drawn.text('traversal-0')).toBe('in-order: 1, 3, 4, 6, 7, 8, 10, 13, 14');
    const accent = drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('edge-') && stroke.semanticColor === 'accent').map((stroke) => stroke.id);
    // Insertion order numbers the nodes: 3 is node 1, 6 is node 4, 4 is node 6.
    expect(accent.sort()).toEqual(['edge-1', 'edge-4', 'edge-6']);
    // values: with kind bst is the same insertion.
    const viaValues = await draw('tree', 'kind: bst\nvalues: 8, 3, 10, 1, 6, 14, 4, 7, 13');
    expect(nodeCount(viaValues)).toBe(9);
    expect(center(viaValues, 5).x).toBeGreaterThan(center(viaValues, 2).x);
    expectTidy(drawn, 'bst');
  });

  it('checks a heap and draws its array with indices under the tree', async () => {
    const drawn = await draw('heap', 'heap: max\nvalues: 90, 70, 80, 30, 60, 50, 40, 10, 20\nhighlight: 80');
    expect([0, 1, 2, 8].map((id) => drawn.text(`cell-label-${id}`))).toEqual(['90', '70', '80', '20']);
    expect([0, 1, 2, 8].map((id) => drawn.text(`index-${id}`))).toEqual(['0', '1', '2', '8']);
    const lowest = Math.max(...Array.from({ length: 9 }, (_, id) => boxOf(drawn.stroke(`node-${id}`)!).y2));
    expect(boxOf(drawn.stroke('cell-0')!).y1).toBeGreaterThan(lowest);
    expect(drawn.stroke('cell-2')!.fill).toBe('tint');
    expectTidy(drawn, 'heap');
    // Without heap: either order is accepted, and neither is refused with the evidence.
    expect(nodeCount(await draw('tree', 'kind: heap\nvalues: 1, 3, 2'))).toBe(3);
    expect(nodeCount(await draw('tree', 'kind: min-heap\nvalues: 1, 3, 2'))).toBe(3);
    expect(await reason('tree', 'kind: heap\nvalues: 5, 9, 1')).toBe('tree: neither a min-heap nor a max-heap (parent 5 (index 0) is greater than its child 1 (index 2))');
    expect(await reason('tree', 'heap: min\nvalues: 1, 5, 3, 4, 9')).toBe('tree: not a min-heap: parent 5 (index 1) is greater than its child 4 (index 3)');
    expect(await reason('tree', 'heap: max\nvalues: 9, null, 3')).toBe('a heap is a complete tree: position 1 of the array is empty');
  });

  it('draws a general tree from node lines, in pills when labels are words', async () => {
    const drawn = await draw('tree', 'node: Animal Mammal Bird Fish\nnode: Mammal Dog Cat\nnode: Bird "Bald Eagle"\ntraversal: level');
    expect(drawn.texts().filter((text) => text.startsWith('level-order')).length + drawn.scene.labels.filter((label) => label.id.startsWith('traversal-')).length).toBeGreaterThan(1);
    expect(drawn.scene.labels.filter((label) => label.id.startsWith('traversal-')).map((label) => label.text).join(' ')).toBe('level-order: Animal, Mammal, Bird, Fish, Dog, Cat, Bald Eagle');
    expect(drawn.stroke('node-0')!.kind).toBe('path');
    expect(drawn.text('label-6')).toBe('Bald Eagle');
    // Children keep their listed order left to right.
    const xs = [1, 2, 3].map((id) => drawn.placed.find((item) => item.label.id === `label-${id}`)!.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expectTidy(drawn, 'nary');

    const letters = await draw('tree', 'node: A -> B, C, D\nnode: B: E F\nnode: D G\npath: A, D, G');
    expect(nodeCount(letters)).toBe(7);
    expect(letters.stroke('node-0')!.kind).toBe('circle');
    expect(letters.scene.strokes.filter((stroke) => stroke.id.startsWith('edge-') && stroke.semanticColor === 'accent')).toHaveLength(2);
    // Node lines with kind binary keep left and right.
    const binary = await draw('tree', 'kind: binary\nnode: + * 3\nnode: * null 2');
    expect(center(binary, 3).x).toBeGreaterThan(center(binary, 1).x);
  });

  it('accepts sloppy notation', async () => {
    const drawn = await draw('binary-tree', 'kind: Binary Tree\nvalues: ["A", \'B\', None, NULL, C, ]\ntraversal: Pre-Order');
    expect(drawn.text('traversal-0')).toBe('pre-order: A, B, C');
    expect(center(drawn, 2).x).toBeGreaterThan(center(drawn, 1).x);
    expect(nodeCount(await draw('tree', 'values: 8 3 10 1 6'))).toBe(5);
    expect(nodeCount(await draw('tree', 'insert: [5, 3, 8,]'))).toBe(3);
    expect((await draw('tree', 'values: 1, 2, 3\ntraversal: BFS')).text('traversal-0')).toBe('level-order: 1, 2, 3');
  });

  it('never overlaps nodes, from a single node to a full five-level tree', async () => {
    const random = mulberry32(3);
    const specs = [
      'values: 1',
      `values: ${Array.from({ length: 31 }, (_, i) => i + 1).join(',')}`,
      'kind: bst\ninsert: 1, 2, 3, 4, 5, 6, 7, 8',
      'kind: bst\ninsert: 50, 20, 80, 10, 30, 70, 90, 25, 35, 65, 75, 22, 27',
      'node: r a b c d e f g h',
      'node: root alpha beta\nnode: alpha gamma delta epsilon\nnode: beta zeta',
      ...Array.from({ length: 12 }, () => `kind: bst\ninsert: ${Array.from({ length: 4 + Math.floor(random() * 14) }, () => Math.floor(random() * 200)).join(', ')}`),
    ];
    for (const content of specs) expectTidy(await draw('tree', content), content);
  });

  it('refuses what is not a tree or cannot be drawn legibly, with the reason', async () => {
    expect(await reason('tree', 'values: 8, 3, 10, 1, 6\npath: 8, 10, 6')).toBe('tree path: 8 → 10 → 6 is not a path in the tree: 6 is not a child of 10');
    expect(await reason('tree', 'values: 8, 3\npath: 9')).toBe('tree path: 9 is not a path in the tree: 9 is not a node of the tree');
    expect(await reason('tree', 'values: 1, null, null, 2')).toMatch(/not a level order/);
    expect(await reason('tree', 'values: 0, 1, null, 3, 4, null, null, 7')).toMatch(/describe two different trees/);
    expect(await reason('tree', 'node: A B\nnode: C B')).toBe('tree: B has two parents');
    expect(await reason('tree', 'node: A B\nnode: C D')).toBe('tree: C is not connected to the root A');
    expect(await reason('tree', 'node: A B\nnode: B A')).toBe('tree: A is the root and cannot be a child');
    expect(await reason('tree', 'kind: binary\nnode: A B C D')).toMatch(/at most two/);
    expect(await reason('tree', 'node: A B C\ntraversal: inorder')).toBe('tree traversal: inorder is defined for binary trees only');
    expect(await reason('tree', 'values: 1, 2\ntraversal: zigzag')).toMatch(/is not inorder, preorder, postorder or level/);
    expect(await reason('tree', 'kind: trie\nvalues: 1')).toMatch(/kind: trie is not binary, bst, heap or nary/);
    expect(await reason('tree', 'values: 1, 2\nheap: big')).toBe('tree heap: big is not min or max');
    expect(await reason('tree', 'kind: binary')).toBe('missing values|insert|node');
    expect(await reason('tree', `values: ${Array.from({ length: 63 }, (_, i) => i + 1).join(',')}`)).toMatch(/too wide to draw legibly: it needs \d+ units across and the frame allows 434/);
    expect(await reason('tree', `kind: bst\ninsert: ${Array.from({ length: TREE_MAX_NODES + 1 }, (_, i) => i).join(',')}`)).toMatch(/at most 63 nodes/);
    expect(await reason('tree', `kind: bst\ninsert: ${Array.from({ length: 20 }, (_, i) => i).join(',')}`)).toMatch(/too deep to draw legibly: 20 levels/);
    expect(await reason('tree', 'values: 1, 2\ncolor: red')).toMatch(/unconsumed declaration: color/);
  });
});

describe('tree: the type alias names the kind', () => {
  it('checks the heap property for type=heap without a kind line', async () => {
    const broken = await compile('heap', 'values: 1, 5, 3, 2');
    expect(broken.ok).toBe(false);
    if (!broken.ok) expect(broken.reason).toMatch(/heap/);
    const heap = await draw('heap', 'values: 1, 3, 5, 4');
    // The backing array with its indices is drawn only for a heap.
    expect(heap.texts()).toEqual(expect.arrayContaining(['0', '1', '2', '3']));
  });

  it('builds a search tree for type=bst from values alone', async () => {
    const bst = await draw('bst', 'values: 8, 3, 10, 1\ntraversal: inorder');
    expect(bst.texts().join(' ')).toContain('1, 3, 8, 10');
  });

  it('lets an explicit kind line win over the alias', async () => {
    const plain = await draw('heap', 'kind: binary\nvalues: 1, 5, 3, 2');
    expect(plain.texts()).not.toContain('0');
  });
});
