import SmilesDrawer from 'smiles-drawer';
import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specHasEmptyDeclaration, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

interface Atom {
  element: string;
  label: string;
  aromatic: boolean;
  charge: number;
  hydrogens: number;
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
    return { atom: { element, aromatic: token === token.toLowerCase(), label: `[${isotope}${token}${hRaw}${match[4] ?? ''}]`, charge: chargeValue(match[4]), hydrogens }, next: end + 1 };
  }
  const two = source.slice(start, start + 2);
  if (ELEMENTS.has(two)) return { atom: { element: two, label: two, aromatic: false, charge: 0, hydrogens: 0 }, next: start + 2 };
  const one = source[start];
  if (one && /^[BCNOPSFIbcnopsH]$/.test(one)) {
    const aromatic = one === one.toLowerCase();
    return { atom: { element: aromatic ? one.toUpperCase() : one, label: one, aromatic, charge: 0, hydrogens: 0 }, next: start + 1 };
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

function maxValence(atom: Atom): number {
  if (atom.aromatic) return atom.element === 'C' ? 4 : 3;
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

function validateValence(molecule: Molecule): string | null {
  const order = molecule.atoms.map((atom) => atom.hydrogens);
  for (const bond of molecule.bonds) {
    order[bond.a] = (order[bond.a] ?? 0) + bond.order;
    order[bond.b] = (order[bond.b] ?? 0) + bond.order;
  }
  for (let index = 0; index < molecule.atoms.length; index++) {
    const atom = molecule.atoms[index]!;
    if ((order[index] ?? 0) > maxValence(atom)) return `atom ${index + 1} (${atom.label}) exceeds supported valence (${order[index]})`;
  }
  return null;
}

function atomPositions(smiles: string, molecule: Molecule, width: number, height: number): Array<{ x: number; y: number }> | null {
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
  const minX = Math.min(...points.map(point => point.x));
  const minY = Math.min(...points.map(point => point.y));
  const dx = Math.max(...points.map(point => point.x)) - minX;
  const dy = Math.max(...points.map(point => point.y)) - minY;
  const scale = Math.min(1.4, (width - 48) / Math.max(1, dx), (height - 48) / Math.max(1, dy));
  return points.map(point => ({ x: (width - dx * scale) / 2 + (point.x - minX) * scale,
    y: (height - dy * scale) / 2 + (point.y - minY) * scale }));
}

function bondLines(b: SceneBuilder, bond: Bond, start: { x: number; y: number }, end: { x: number; y: number }, radius: number): string[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const sx = start.x + ux * radius;
  const sy = start.y + uy * radius;
  const ex = end.x - ux * radius;
  const ey = end.y - uy * radius;
  const nx = -uy;
  const ny = ux;
  const offsets = bond.order >= 3 ? [-3.5, 0, 3.5] : bond.order >= 2 || bond.aromatic ? [-2.8, 2.8] : [0];
  return offsets.map((offset, index) => {
    const id = `bond-${bond.a}-${bond.b}-${index}`;
    b.line(id, sx + nx * offset, sy + ny * offset, ex + nx * offset, ey + ny * offset, { width: 1.7, role: 'connector', dash: bond.aromatic && index === 1 });
    return id;
  });
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
  const valenceError = validateValence(molecule);
  if (valenceError) return malformed(`chem.smiles ${valenceError}`);
  if (molecule.atoms.length > 14) return malformed('chem.smiles molecule is too dense for the fixed frame');
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('chem.smiles', w, h);
  const positions = atomPositions(smiles.trim(), molecule, w, h);
  if (!positions) return malformed('chem.smiles layout could not preserve molecular connectivity');
  const radii = molecule.atoms.map((atom) => Math.max(11, Math.min(18, atom.label.length * 3.4)));
  const strokeIds: string[] = [];
  molecule.bonds.forEach((bond) => strokeIds.push(...bondLines(b, bond, positions[bond.a]!, positions[bond.b]!, Math.max(radii[bond.a]!, radii[bond.b]!))));
  const atomIds = molecule.atoms.map((_, index) => `atom-${index}`);
  const acceptedHighlights = new Set<string>([...atomIds, ...molecule.atoms.map((atom) => atom.label.toLowerCase()), ...strokeIds]);
  const requestedHighlights = spec.highlight.map((value) => value.toLowerCase());
  const unknownHighlight = requestedHighlights.find((value) => !acceptedHighlights.has(value) && !/^bond-\d+-\d+$/.test(value));
  if (unknownHighlight) return malformed(`chem.smiles highlight references unknown atom or bond ${unknownHighlight}`);
  const highlightIds: string[] = [...spec.highlight];
  molecule.atoms.forEach((atom, index) => {
    const atomId = `atom-${index}`;
    const labelId = `atom-label-${index}`;
    b.circle(atomId, positions[index]!.x, positions[index]!.y, radii[index]!, { fill: 'none', role: 'geometry' });
    b.label(labelId, atom.label, positions[index]!.x, positions[index]!.y, { protected: true, priority: 'required', anchorId: atomId });
    if (requestedHighlights.includes(atom.label.toLowerCase()) || requestedHighlights.includes(atomId)) highlightIds.push(atomId, labelId);
  });
  spec.highlight.forEach((value) => {
    const match = /^(?:bond-)?(\d+)-(\d+)/i.exec(value);
    if (match) strokeIds.forEach((id) => { if (id.startsWith(`bond-${match[1]}-${match[2]}-`)) highlightIds.push(id); });
  });
  b.hl([...highlightIds, ...strokeIds.filter((id) => spec.highlight.includes(id))]);
  const annotations = specGetAll(spec, 'annotate').filter((value) => value.trim());
  if (specHasEmptyDeclaration(spec, 'annotate')) return malformed('chem.smiles annotate cannot be empty');
  annotations.forEach((value, index) => {
    if (index < 3) b.label(`annotation-${index}`, value, w / 2, 14 + index * 14, { protected: true, priority: 'preferred', anchorId: `atom-${Math.min(index, molecule.atoms.length - 1)}` });
  });
  if (annotations.length > 3) return malformed('chem.smiles supports at most three annotations in the fixed frame');
  return layoutAndCompile(b.scene());
}
