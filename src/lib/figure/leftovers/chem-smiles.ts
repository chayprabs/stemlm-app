import SmilesDrawer from 'smiles-drawer';
import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specHasEmptyDeclaration, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { measureText } from '../geom';

interface Atom {
  element: string;
  label: string;
  aromatic: boolean;
  charge: number;
  hydrogens: number;
  bracket: boolean;
  isotope?: string;
}

interface Bond {
  a: number;
  b: number;
  order: number;
  aromatic: boolean;
}

interface Molecule {
  atoms: Atom[];
  bonds: Bond[];
}

const ELEMENTS = new Set(['H', 'B', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I', 'Si', 'Na', 'Li', 'Mg', 'Ca', 'K']);
const ORGANIC_SUBSET = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I']);
/** SMILES default valences for unbracketed atoms; implicit hydrogens fill up to the smallest that fits. */
const VALENCES: Record<string, number[]> = { B: [3], C: [4], N: [3, 5], O: [2], P: [3, 5], S: [2, 4, 6], F: [1], Cl: [1], Br: [1], I: [1] };
const BOND = 36;
const MAX_ATOMS = 30;
const MAX_W = 560;
const MAX_H = 380;

function malformed(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function chargeValue(raw: string | undefined): number {
  if (!raw) return 0;
  if (raw[0] === '+') return raw.length === 1 ? 1 : raw[1] === '+' ? raw.length : Number(raw.slice(1));
  return raw.length === 1 ? -1 : raw[1] === '-' ? -raw.length : -Number(raw.slice(1));
}

function parseAtom(source: string, start: number): { atom: Atom; next: number } | null {
  if (source[start] === '[') {
    const end = source.indexOf(']', start + 1);
    if (end < 0) return null;
    const content = source.slice(start + 1, end);
    const match = /^(?:(\d+))?([A-Z][a-z]?|[bcnops])((?:H\d*)?)(?:(\+{1,3}|-{1,3}|\+\d+|-\d+))?$/.exec(content);
    if (!match) return null;
    const isotope = match[1] ?? '';
    const token = match[2]!;
    const element = token[0] === token[0]!.toLowerCase() ? token[0]!.toUpperCase() : token;
    if (!ORGANIC_SUBSET.has(element)) return null;
    const hRaw = match[3] ?? '';
    const hydrogens = hRaw ? Number(hRaw.slice(1) || '1') : 0;
    return {
      atom: { element, aromatic: token === token.toLowerCase(), label: `[${isotope}${token}${hRaw}${match[4] ?? ''}]`, charge: chargeValue(match[4]), hydrogens, bracket: true, isotope: isotope || undefined },
      next: end + 1,
    };
  }
  const two = source.slice(start, start + 2);
  if (ELEMENTS.has(two)) return { atom: { element: two, label: two, aromatic: false, charge: 0, hydrogens: 0, bracket: false }, next: start + 2 };
  const one = source[start];
  if (one && /^[BCNOPSFIbcnopsH]$/.test(one)) {
    const aromatic = one === one.toLowerCase();
    return { atom: { element: aromatic ? one.toUpperCase() : one, label: one, aromatic, charge: 0, hydrogens: 0, bracket: false }, next: start + 1 };
  }
  return null;
}

function parseSmiles(source: string): Molecule | null {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const branches: number[] = [];
  const rings = new Map<string, { atom: number; order: number; aromatic: boolean }>();
  let current = -1;
  let pendingOrder = 1;
  let pendingAromatic = false;
  let i = 0;
  while (i < source.length) {
    const token = source[i]!;
    if (/\s/.test(token)) return null;
    const parsed = parseAtom(source, i);
    if (parsed) {
      const index = atoms.push(parsed.atom) - 1;
      if (current >= 0) {
        const aromatic = pendingAromatic || (atoms[current]!.aromatic && parsed.atom.aromatic && pendingOrder === 1);
        bonds.push({ a: current, b: index, order: aromatic ? 1.5 : pendingOrder, aromatic });
      }
      current = index;
      pendingOrder = 1;
      pendingAromatic = false;
      i = parsed.next;
      continue;
    }
    if (token === '(') {
      if (current < 0 || pendingOrder !== 1 || pendingAromatic) return null;
      branches.push(current);
      i += 1;
      continue;
    }
    if (token === ')') {
      const previous = branches.pop();
      if (previous === undefined || pendingOrder !== 1 || pendingAromatic) return null;
      current = previous;
      i += 1;
      continue;
    }
    if (token === '-' || token === '=' || token === '#' || token === ':') {
      if (current < 0 || pendingOrder !== 1 || pendingAromatic) return null;
      pendingOrder = token === '=' ? 2 : token === '#' ? 3 : token === ':' ? 1.5 : 1;
      pendingAromatic = token === ':';
      i += 1;
      continue;
    }
    if (token === '/' || token === '\\' || token === '.') return null;
    const ringMatch = /^(\d|%\d{2})/.exec(source.slice(i));
    if (ringMatch) {
      if (current < 0) return null;
      const key = ringMatch[1]!;
      const prior = rings.get(key);
      const aromatic = pendingAromatic || (prior?.aromatic ?? false) || (atoms[current]!.aromatic && prior ? atoms[prior.atom]!.aromatic && pendingOrder === 1 : false);
      if (prior) {
        bonds.push({ a: prior.atom, b: current, order: aromatic ? 1.5 : pendingOrder !== 1 ? pendingOrder : prior.order, aromatic });
        rings.delete(key);
      } else {
        rings.set(key, { atom: current, order: pendingOrder, aromatic });
      }
      pendingOrder = 1;
      pendingAromatic = false;
      i += key.length;
      continue;
    }
    return null;
  }
  if (!atoms.length || branches.length || rings.size || pendingOrder !== 1 || pendingAromatic) return null;
  return { atoms, bonds };
}

/** Does this aromatic atom contribute a ring double bond (pyridine N yes, pyrrole NH / furan O no)? */
function takesRingDouble(atom: Atom, degree: number): boolean {
  if (!atom.aromatic) return false;
  if (atom.element === 'C') return atom.charge === 0;
  if (atom.element === 'N' || atom.element === 'P') return atom.charge > 0 || (atom.charge === 0 && atom.hydrogens === 0 && degree <= 2);
  if (atom.element === 'O' || atom.element === 'S') return atom.charge > 0;
  return false;
}

/**
 * Kekulé structure: every aromatic atom that takes a ring double bond gets exactly one, from its
 * aromatic bonds (a perfect matching, found by trying the most constrained atom first). Returns the
 * integer order of every bond, or null when no such assignment exists.
 */
function kekulize(molecule: Molecule): number[] | null {
  const orders = molecule.bonds.map((bond) => (bond.aromatic ? 1 : bond.order));
  const degree = molecule.atoms.map((_, i) => molecule.bonds.filter((bond) => bond.a === i || bond.b === i).length);
  const needs = molecule.atoms.map((atom, i) => takesRingDouble(atom, degree[i]!) &&
    !molecule.bonds.some((bond) => !bond.aromatic && bond.order === 2 && (bond.a === i || bond.b === i)));
  const aromaticBonds = molecule.bonds.map((bond, k) => (bond.aromatic ? k : -1)).filter((k) => k >= 0);
  const matched = molecule.atoms.map(() => false);
  const other = (k: number, i: number) => (molecule.bonds[k]!.a === i ? molecule.bonds[k]!.b : molecule.bonds[k]!.a);
  const solve = (): boolean => {
    let atom = -1;
    let options: number[] = [];
    for (let i = 0; i < needs.length; i++) {
      if (!needs[i] || matched[i]) continue;
      const open = aromaticBonds.filter((k) => (molecule.bonds[k]!.a === i || molecule.bonds[k]!.b === i) && needs[other(k, i)] && !matched[other(k, i)]);
      if (!open.length) return false;
      if (atom < 0 || open.length < options.length) { atom = i; options = open; }
    }
    if (atom < 0) return true;
    for (const k of options) {
      const partner = other(k, atom);
      matched[atom] = matched[partner] = true;
      orders[k] = 2;
      if (solve()) return true;
      matched[atom] = matched[partner] = false;
      orders[k] = 1;
    }
    return false;
  };
  return solve() ? orders : null;
}

function maxValence(atom: Atom): number {
  switch (atom.element) {
    case 'H': case 'F': case 'Cl': case 'Br': case 'I': return 1;
    case 'B': return atom.charge > 0 ? 4 : 3;
    case 'C': case 'Si': return 4;
    case 'N': return atom.charge > 0 ? 4 : atom.charge < 0 ? 2 : 3;
    case 'O': return atom.charge > 0 ? 3 : atom.charge < 0 ? 1 : 2;
    case 'P': return 5;
    case 'S': return 6;
    case 'Na': case 'Li': case 'K': return 1;
    case 'Mg': case 'Ca': return 2;
    default: return 0;
  }
}

function implicitHydrogens(atom: Atom, bondSum: number): number {
  if (atom.bracket || !VALENCES[atom.element]) return atom.hydrogens;
  const valence = VALENCES[atom.element]!.find((v) => v >= bondSum);
  return valence === undefined ? 0 : valence - bondSum;
}

function atomPositions(smiles: string, molecule: Molecule): Array<{ x: number; y: number }> | null {
  // Use only the installed library's layout graph. Our parser retains semantics,
  // and Scene IR remains the sole source of rendered strokes and labels.
  const layout = new SmilesDrawer.SvgDrawer({ bondLength: 40, explicitHydrogens: false }).preprocessor;
  try {
    layout.initDraw(SmilesDrawer.Parser.parse(smiles), 'light', false, []);
    layout.processGraph();
  } catch {
    return null;
  }
  const vertices = layout.graph.vertices;
  if (vertices.length !== molecule.atoms.length || vertices.some((vertex, i) =>
    vertex.value.element.toUpperCase() !== molecule.atoms[i]!.element.toUpperCase())) return null;
  const key = (a: number, b: number) => [Math.min(a, b), Math.max(a, b)].join('-');
  const expected = new Set(molecule.bonds.map(bond => key(bond.a, bond.b)));
  if (layout.graph.edges.length !== expected.size || layout.graph.edges.some(edge => !expected.has(key(edge.sourceId, edge.targetId)))) return null;
  const points = vertices.map(vertex => ({ x: vertex.position.x, y: vertex.position.y }));
  if (points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  // One drawing scale for every molecule: the median bond is BOND units long.
  const lengths = molecule.bonds.map((bond) => Math.hypot(points[bond.a]!.x - points[bond.b]!.x, points[bond.a]!.y - points[bond.b]!.y)).sort((a, c) => a - c);
  const scale = lengths.length ? BOND / Math.max(1e-6, lengths[Math.floor(lengths.length / 2)]!) : 1;
  return points.map((point) => ({ x: point.x * scale, y: point.y * scale }));
}

/** Shortest ring through a bond (breadth-first, not using that bond), or null when the bond is acyclic. */
function ringThrough(molecule: Molecule, a: number, b: number): number[] | null {
  const previous = new Map<number, number>([[a, -1]]);
  const queue = [a];
  while (queue.length) {
    const node = queue.shift()!;
    if (node === b) {
      const ring: number[] = [];
      for (let at = b; at !== -1; at = previous.get(at)!) ring.push(at);
      return ring;
    }
    for (const bond of molecule.bonds) {
      if ((bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)) continue;
      const next = bond.a === node ? bond.b : bond.b === node ? bond.a : -1;
      if (next >= 0 && !previous.has(next)) {
        previous.set(next, node);
        queue.push(next);
      }
    }
  }
  return null;
}

/**
 * Skeletal label: element, then its hydrogens and charge in label notation (NH_{2}, NH_{3}^{+}, O^{−}).
 * Hydrogens go on the side away from the bonds, so a bond arriving from the right reads HO, H_{2}N.
 */
function atomLabel(atom: Atom, hydrogens: number, bondsGoRight: boolean): string {
  const h = hydrogens ? (hydrogens === 1 ? 'H' : `H_{${hydrogens}}`) : '';
  const magnitude = Math.abs(atom.charge);
  const charge = atom.charge ? `^{${magnitude > 1 ? magnitude : ''}${atom.charge > 0 ? '+' : '−'}}` : '';
  const isotope = atom.isotope ? `^{${atom.isotope}}` : '';
  return bondsGoRight && h ? `${h}${isotope}${atom.element}${charge}` : `${isotope}${atom.element}${h}${charge}`;
}

function unknownSpecKey(spec: SpecDoc): string | null {
  const allowed = new Set(['smiles', 'annotate', 'highlight', 'caption']);
  return [...spec.values.keys(), ...spec.lists.keys(), ...spec.emptyDeclarations.keys()].find((key) => !allowed.has(key)) ?? null;
}

export function compileChemSmiles(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unknown = unknownSpecKey(spec);
  if (unknown) return malformed(`chem.smiles does not support key ${unknown}; no data was rendered`);
  if (specHasEmptyDeclaration(spec, 'smiles')) return malformed('chem.smiles smiles cannot be empty');
  const smiles = specGet(spec, 'smiles');
  if (!smiles?.trim()) return malformed('chem.smiles needs smiles:');
  const molecule = parseSmiles(smiles.trim());
  if (!molecule) return malformed('chem.smiles could not parse the supported atom/bond grammar');
  if (!molecule.bonds.length) return malformed('chem.smiles needs at least one bond; write a lone atom or ion in the text');
  if (molecule.atoms.length > MAX_ATOMS) return malformed(`chem.smiles draws at most ${MAX_ATOMS} heavy atoms`);
  const orders = kekulize(molecule);
  if (!orders) return malformed('chem.smiles aromatic ring cannot be kekulized; write pyrrole-type nitrogen as [nH]');
  const bondSum = molecule.atoms.map((_, i) => molecule.bonds.reduce((sum, bond, k) => sum + (bond.a === i || bond.b === i ? orders[k]! : 0), 0));
  const hydrogens = molecule.atoms.map((atom, i) => implicitHydrogens(atom, bondSum[i]!));
  for (const [i, atom] of molecule.atoms.entries()) {
    const used = bondSum[i]! + hydrogens[i]!;
    if (used > maxValence(atom)) return malformed(`chem.smiles atom ${i + 1} (${atom.label}) exceeds supported valence (${used})`);
  }
  const raw = atomPositions(smiles.trim(), molecule);
  if (!raw) return malformed('chem.smiles layout could not preserve molecular connectivity');

  // Carbons are bare vertices unless charged or isotopic; every other atom is written out.
  const neighbours = molecule.atoms.map((_, i) => molecule.bonds.filter((bond) => bond.a === i || bond.b === i).map((bond) => (bond.a === i ? bond.b : bond.a)));
  const labels = molecule.atoms.map((atom, i) => {
    const shown = atom.element !== 'C' || atom.charge !== 0 || Boolean(atom.isotope);
    if (!shown) return null;
    const drift = neighbours[i]!.reduce((sum, n) => sum + (raw[n]!.x - raw[i]!.x), 0) / Math.max(1, neighbours[i]!.length);
    const text = atomLabel(atom, hydrogens[i]!, drift > BOND * 0.25);
    return { text, size: measureText(text, 12) };
  });

  // Frame: the molecule plus its labels, centred, never smaller than the profile frame.
  const annotations = specGetAll(spec, 'annotate').filter((value) => value.trim());
  if (specHasEmptyDeclaration(spec, 'annotate')) return malformed('chem.smiles annotate cannot be empty');
  if (annotations.length > 3) return malformed('chem.smiles supports at most three annotations in the fixed frame');
  const extent = (sign: 1 | -1, axis: 'x' | 'y') => Math.max(...raw.map((p, i) => sign * p[axis] + (labels[i] ? (axis === 'x' ? labels[i]!.size.w : labels[i]!.size.h) / 2 : 0)));
  const [minX, maxX, minY, maxY] = [-extent(-1, 'x'), extent(1, 'x'), -extent(-1, 'y'), extent(1, 'y')];
  const band = annotations.length * 14;
  const frame = frameSize(ctx.profile);
  const w = Math.max(frame.w, Math.ceil(maxX - minX + 40));
  const h = Math.max(frame.h, Math.ceil(maxY - minY + 40 + band));
  if (w > MAX_W || h > MAX_H) return malformed('chem.smiles molecule is too large for a readable figure');
  const dx = (w - (maxX - minX)) / 2 - minX;
  const dy = band + (h - band - (maxY - minY)) / 2 - minY;
  const positions = raw.map((p) => ({ x: p.x + dx, y: p.y + dy }));

  const b = new SceneBuilder('chem.smiles', w, h);
  molecule.atoms.forEach((atom, i) => b.node(`atom-${i}`, positions[i]!.x - 1, positions[i]!.y - 1, 2, 2, `atom:${atom.element}`));

  // A bond runs vertex to vertex; each of its lines stops 2 units outside a written atom's label box.
  const exit = (i: number, ox: number, oy: number, ux: number, uy: number) => {
    const label = labels[i];
    if (!label) return 0;
    const hx = label.size.w / 2 + 2;
    const hy = label.size.h / 2 + 2;
    if (Math.abs(ox) >= hx || Math.abs(oy) >= hy) return 0;
    const along = (half: number, o: number, d: number) => (d > 1e-9 ? (half - o) / d : d < -1e-9 ? (-half - o) / d : Infinity);
    return Math.min(along(hx, ox, ux), along(hy, oy, uy));
  };
  const strokeIds: string[] = [];
  molecule.bonds.forEach((bond, k) => {
    const start = positions[bond.a]!;
    const end = positions[bond.b]!;
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    const s = exit(bond.a, 0, 0, ux, uy);
    const e = length - exit(bond.b, 0, 0, -ux, -uy);
    const at = (t: number, offset: number) => ({ x: start.x + ux * t - uy * offset, y: start.y + uy * t + ux * offset });
    const line = (index: number, from: number, to: number, offset: number) => {
      const t1 = Math.max(from, exit(bond.a, -uy * offset, ux * offset, ux, uy));
      const t2 = Math.min(to, length - exit(bond.b, -uy * offset, ux * offset, -ux, -uy));
      const p = at(t1, offset);
      const q = at(t2, offset);
      const id = `bond-${bond.a}-${bond.b}-${index}`;
      b.line(id, p.x, p.y, q.x, q.y, { width: 1.7, role: 'connector' });
      strokeIds.push(id);
    };
    const order = orders[k]!;
    const ring = order === 2 ? ringThrough(molecule, bond.a, bond.b) : null;
    if (order === 2 && ring) {
      // Ring double bond: the edge itself, plus a shorter line on the ring's inner side.
      const cx = ring.reduce((sum, i) => sum + positions[i]!.x, 0) / ring.length;
      const cy = ring.reduce((sum, i) => sum + positions[i]!.y, 0) / ring.length;
      const side = Math.sign((cx - start.x) * -uy + (cy - start.y) * ux) || 1;
      line(0, s, e, 0);
      line(1, Math.max(s, length * 0.16), Math.min(e, length * 0.84), side * 5);
    } else if (order === 3) {
      [0, -3.6, 3.6].forEach((offset, index) => line(index, s, e, offset));
    } else if (order === 2) {
      line(0, s, e, -2.6);
      line(1, s, e, 2.6);
    } else {
      line(0, s, e, 0);
    }
  });

  molecule.atoms.forEach((atom, i) => {
    if (labels[i]) b.label(`atom-label-${i}`, labels[i]!.text, positions[i]!.x, positions[i]!.y, { protected: true, priority: 'required', anchorId: `atom-${i}` });
  });

  // Highlights: an atom (by id or element) gets an accent ring; a bond (bond-a-b or a-b) its lines.
  const requested = spec.highlight.map((value) => value.toLowerCase());
  const highlightIds: string[] = [];
  for (const value of requested) {
    const bond = /^(?:bond-)?(\d+)-(\d+)(?:-\d+)?$/.exec(value);
    const atoms = molecule.atoms.map((atom, i) => i).filter((i) => value === `atom-${i}` || value === molecule.atoms[i]!.label.toLowerCase() || value === molecule.atoms[i]!.element.toLowerCase());
    const lines = bond ? strokeIds.filter((id) => id.startsWith(`bond-${bond[1]}-${bond[2]}-`)) : [];
    if (!atoms.length && !lines.length) return malformed(`chem.smiles highlight references unknown atom or bond ${value}`);
    highlightIds.push(...lines);
    for (const i of atoms) {
      const radius = labels[i] ? Math.max(labels[i]!.size.w, labels[i]!.size.h) / 2 + 3 : 7;
      b.circle(`atom-${i}`, positions[i]!.x, positions[i]!.y, radius, { color: 'accent', role: 'annotation', width: 1.4 });
      highlightIds.push(`atom-${i}`);
    }
  }
  b.hl(highlightIds);
  annotations.forEach((value, index) => {
    b.label(`annotation-${index}`, value, w / 2, 14 + index * 14, { protected: true, priority: 'preferred', anchorId: `atom-${Math.min(index, molecule.atoms.length - 1)}` });
  });
  return layoutAndCompile(b.scene());
}
