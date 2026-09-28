import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { boxHitsSegment, measureText, type Box } from './geom';
import type { Scene } from './types';

/** Molecules a chemistry course draws; atom order follows the SMILES. */
const MOLECULES: Record<string, string> = {
  ethanol: 'CCO',
  'acetic acid': 'CC(=O)O',
  'benzoic acid': 'OC(=O)c1ccccc1',
  phenol: 'Oc1ccccc1',
  aniline: 'Nc1ccccc1',
  pyridine: 'c1ccncc1',
  pyrrole: 'c1cc[nH]c1',
  furan: 'c1ccoc1',
  naphthalene: 'c1ccc2ccccc2c1',
  glucose: 'OCC1OC(O)C(O)C(O)C1O',
  ethylamine: 'CCN',
  acetonitrile: 'CC#N',
  acetate: 'CC(=O)[O-]',
  methylammonium: 'C[NH3+]',
  aspirin: 'CC(=O)Oc1ccccc1C(=O)O',
};

type Atom = { index: number; element: string; x: number; y: number };

async function compiled(smiles: string): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'chem.smiles', content: `smiles: ${smiles}` }, 'step');
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

function atoms(scene: Scene): Atom[] {
  return scene.nodes
    .filter((node) => /^atom-\d+$/.test(node.id))
    .map((node) => ({ index: Number(node.id.slice(5)), element: node.kind.replace(/^atom:/, ''), x: node.bbox.x + node.bbox.w / 2, y: node.bbox.y + node.bbox.h / 2 }))
    .sort((a, b) => a.index - b.index);
}

/** Bond order as drawn: the number of strokes `bond-a-b-k` for each atom pair. */
function bonds(scene: Scene): Map<string, number> {
  const orders = new Map<string, number>();
  for (const stroke of scene.strokes) {
    const match = /^bond-(\d+)-(\d+)-\d+$/.exec(stroke.id);
    if (match) orders.set(`${match[1]}-${match[2]}`, (orders.get(`${match[1]}-${match[2]}`) ?? 0) + 1);
  }
  return orders;
}

const plain = (text: string) => text.replace(/[_^{}]/g, '');

function labelBox(scene: Scene, id: string): Box | undefined {
  const label = scene.labels.find((entry) => entry.id === id);
  if (!label) return undefined;
  const size = measureText(label.text ?? '', 12);
  return { x1: label.x - size.w / 2, y1: label.y - size.h / 2, x2: label.x + size.w / 2, y2: label.y + size.h / 2 };
}

/** Atoms of the shortest ring through each bond (BFS avoiding that bond), or null when acyclic. */
function ringOf(pairs: string[], a: number, b: number): number[] | null {
  const adjacent = new Map<number, number[]>();
  for (const pair of pairs) {
    const [x, y] = pair.split('-').map(Number) as [number, number];
    if ((x === a && y === b) || (x === b && y === a)) continue;
    adjacent.set(x, [...(adjacent.get(x) ?? []), y]);
    adjacent.set(y, [...(adjacent.get(y) ?? []), x]);
  }
  const previous = new Map<number, number>([[a, -1]]);
  const queue = [a];
  while (queue.length) {
    const node = queue.shift()!;
    if (node === b) {
      const path = [];
      for (let at = b; at !== -1; at = previous.get(at)!) path.push(at);
      return path;
    }
    for (const next of adjacent.get(node) ?? []) if (!previous.has(next)) { previous.set(next, node); queue.push(next); }
  }
  return null;
}

describe('chem.smiles skeletal formula (D22)', () => {
  it.each(Object.entries(MOLECULES))('%s: carbons are bare vertices, heteroatoms are labelled, no atom circles', async (_name, smiles) => {
    const scene = await compiled(smiles);
    const list = atoms(scene);
    expect(list.length).toBeGreaterThan(0);
    for (const atom of list) {
      const label = scene.labels.find((entry) => entry.id === `atom-label-${atom.index}`);
      if (atom.element === 'C') expect(label, `C${atom.index} unlabelled`).toBeUndefined();
      else expect(plain(label?.text ?? ''), `${atom.element}${atom.index} labelled`).toContain(atom.element);
    }
    expect(scene.strokes.some((stroke) => stroke.kind === 'circle'), 'no circled atoms').toBe(false);
  });

  it.each([
    ['ethanol', 'CCO', { 2: ['OH', 'HO'] }],
    ['acetic acid', 'CC(=O)O', { 2: ['O'], 3: ['OH', 'HO'] }],
    ['ethylamine', 'CCN', { 2: ['NH2', 'H2N'] }],
    ['pyridine', 'c1ccncc1', { 3: ['N'] }],
    ['pyrrole', 'c1cc[nH]c1', { 3: ['NH', 'HN'] }],
    ['acetonitrile', 'CC#N', { 2: ['N'] }],
    ['acetate', 'CC(=O)[O-]', { 2: ['O'], 3: ['O−'] }],
    ['methylammonium', 'C[NH3+]', { 1: ['NH3+', 'H3N+'] }],
  ] as const)('%s: each heteroatom shows its hydrogens and charge', async (_name, smiles, expected) => {
    const scene = await compiled(smiles);
    for (const [index, options] of Object.entries(expected)) {
      const label = scene.labels.find((entry) => entry.id === `atom-label-${index}`);
      expect(options, `atom ${index}: ${label?.text}`).toContain(plain(label?.text ?? ''));
    }
  });

  it.each(['CCO', 'Oc1ccccc1', 'OC(=O)c1ccccc1', 'Nc1ccccc1', 'CCN'])('%s: hydrogens sit on the side away from the bond', async (smiles) => {
    const scene = await compiled(smiles);
    const list = atoms(scene);
    const pairs = [...bonds(scene).keys()];
    for (const atom of list) {
      const label = scene.labels.find((entry) => entry.id === `atom-label-${atom.index}`);
      if (!label || !/H/.test(label.text ?? '')) continue;
      const neighbours = pairs.map((pair) => pair.split('-').map(Number)).filter((pair) => pair.includes(atom.index)).map((pair) => list[pair[0] === atom.index ? pair[1]! : pair[0]!]!);
      const dx = neighbours.reduce((sum, n) => sum + (n.x - atom.x), 0) / neighbours.length;
      if (dx > 8) expect(label.text, `${label.text}: bond goes right, H on the left`).toMatch(/^H/);
      if (dx < -8) expect(label.text, `${label.text}: bond goes left, H on the right`).toMatch(new RegExp(`^${atom.element}`));
    }
  });

  it.each(['c1ccccc1', 'c1ccncc1', 'c1cc[nH]c1', 'c1ccoc1', 'c1ccc2ccccc2c1', 'OC(=O)c1ccccc1', 'CC(=O)Oc1ccccc1C(=O)O'])('%s: aromatic rings are Kekulé, second line inside the ring', async (smiles) => {
    const scene = await compiled(smiles);
    const list = atoms(scene);
    const orders = bonds(scene);
    const pairs = [...orders.keys()];
    const aromatic = new Set<number>();
    // Aromatic atoms in the SMILES are the lowercase ones, in order of appearance.
    let index = 0;
    for (const token of smiles.match(/\[[^\]]+\]|Br|Cl|[A-Za-z]/g)!) {
      if (/^\[?[a-z]/.test(token)) aromatic.add(index);
      index += 1;
    }
    for (const atom of aromatic) {
      const ringBonds = pairs.filter((pair) => pair.split('-').map(Number).includes(atom) && pair.split('-').map(Number).every((i) => aromatic.has(i)));
      const doubles = ringBonds.filter((pair) => orders.get(pair) === 2).length;
      const pi = list[atom]!.element === 'C' || (list[atom]!.element === 'N' && !/H/.test(scene.labels.find((l) => l.id === `atom-label-${atom}`)?.text ?? ''));
      expect(doubles, `${list[atom]!.element}${atom} ring double bonds`).toBe(pi ? 1 : 0);
    }
    for (const [pair, order] of orders) {
      if (order !== 2) continue;
      const [a, b] = pair.split('-').map(Number) as [number, number];
      const ring = ringOf(pairs, a, b);
      if (!ring) continue;
      const cx = ring.reduce((sum, i) => sum + list[i]!.x, 0) / ring.length;
      const cy = ring.reduce((sum, i) => sum + list[i]!.y, 0) / ring.length;
      const [outer, inner] = [0, 1].map((k) => scene.strokes.find((stroke) => stroke.id === `bond-${pair}-${k}`)!);
      const mid = (s: typeof outer) => ({ x: (s!.points[0]! + s!.points[2]!) / 2, y: (s!.points[1]! + s!.points[3]!) / 2 });
      expect(Math.hypot(mid(inner).x - cx, mid(inner).y - cy), `bond ${pair} inner line inside the ring`).toBeLessThan(Math.hypot(mid(outer).x - cx, mid(outer).y - cy));
      expect(Math.hypot(inner!.points[2]! - inner!.points[0]!, inner!.points[3]! - inner!.points[1]!)).toBeLessThan(Math.hypot(outer!.points[2]! - outer!.points[0]!, outer!.points[3]! - outer!.points[1]!));
    }
  });

  it.each(Object.entries(MOLECULES))('%s: bonds meet at carbons, stop short of labels, and keep their order', async (_name, smiles) => {
    const scene = await compiled(smiles);
    const list = atoms(scene);
    const orders = bonds(scene);
    const outside = smiles.replace(/\[[^\]]+\]/g, 'X');
    expect(orders.size, 'one drawn bond per SMILES bond').toBe(list.length - 1 + (outside.match(/\d/g) ?? []).length / 2);
    expect([...orders.values()].filter((order) => order === 2).length, 'every = is a double bond').toBeGreaterThanOrEqual((outside.match(/=/g) ?? []).length);
    expect([...orders.values()].filter((order) => order === 3).length, 'every # is a triple bond').toBe((outside.match(/#/g) ?? []).length);
    for (const [pair] of orders) {
      const [a, b] = pair.split('-').map(Number) as [number, number];
      const lines = scene.strokes.filter((stroke) => stroke.id.startsWith(`bond-${pair}-`));
      for (const [atom, side] of [[list[a]!, 0], [list[b]!, 2]] as const) {
        const ends = lines.map((line) => ({ x: line.points[side]!, y: line.points[side + 1]! }));
        const box = labelBox(scene, `atom-label-${atom.index}`);
        if (box) {
          for (const end of ends) expect(end.x < box.x1 - 1 || end.x > box.x2 + 1 || end.y < box.y1 - 1 || end.y > box.y2 + 1, `bond ${pair} stops short of ${atom.element}${atom.index}`).toBe(true);
          continue;
        }
        // At a bare carbon the lines that reach it (a ring double's inner line stops early) centre on the vertex.
        const reaching = ends.filter((end) => Math.hypot(end.x - atom.x, end.y - atom.y) < 5);
        expect(reaching.length, `bond ${pair} reaches C${atom.index}`).toBeGreaterThan(0);
        const mx = reaching.reduce((sum, end) => sum + end.x, 0) / reaching.length;
        const my = reaching.reduce((sum, end) => sum + end.y, 0) / reaching.length;
        expect(Math.hypot(mx - atom.x, my - atom.y), `bond ${pair} meets C${atom.index}`).toBeLessThan(0.5);
      }
    }
    for (const label of scene.labels.filter((entry) => /^atom-label-/.test(entry.id))) {
      const box = labelBox(scene, label.id)!;
      for (const stroke of scene.strokes.filter((s) => s.kind === 'line')) {
        const seg = { x1: stroke.points[0]!, y1: stroke.points[1]!, x2: stroke.points[2]!, y2: stroke.points[3]! };
        expect(boxHitsSegment(box, seg, 0), `${label.text} clear of ${stroke.id}`).toBe(false);
      }
    }
  });

  it.each([
    ['pyrrole without its NH', 'c1ccnc1'],
    ['an odd aromatic carbon ring', 'c1cccc1'],
  ])('refuses %s instead of guessing the double bonds', async (_name, smiles) => {
    const result = await compileDiagramSpec({ type: 'chem.smiles', content: `smiles: ${smiles}` }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/kekul/i);
  });

  it.each(['[NH4+]', '[O-]', 'O'])('refuses a lone atom or ion %s (text, not a structure)', async (smiles) => {
    const result = await compileDiagramSpec({ type: 'chem.smiles', content: `smiles: ${smiles}` }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/at least one bond/);
  });

  it.each(Object.entries(MOLECULES))('%s: survives sanitizing and admission (the panel shows it)', async (_name, smiles) => {
    const result = await compileDiagram({ type: 'chem.smiles', content: `smiles: ${smiles}` }, 'step');
    expect(result.ok, JSON.stringify((result as { diagnostic?: unknown }).diagnostic)).toBe(true);
  });
});
