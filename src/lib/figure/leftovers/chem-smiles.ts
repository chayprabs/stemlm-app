import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

interface Atom {
  label: string;
  aromatic: boolean;
}

interface Bond {
  a: number;
  b: number;
  order: number;
}

interface Molecule {
  atoms: Atom[];
  bonds: Bond[];
}

function malformed(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function parseAtom(source: string, start: number): { atom: Atom; next: number } | null {
  if (source[start] === '[') {
    const end = source.indexOf(']', start + 1);
    if (end < 0) return null;
    const content = source.slice(start + 1, end);
    const symbol = /^(?:\d+)?([A-Z][a-z]?|[a-z])/.exec(content)?.[1];
    if (!symbol) return null;
    return { atom: { label: `[${content}]`, aromatic: symbol === symbol.toLowerCase() }, next: end + 1 };
  }
  const two = source.slice(start, start + 2);
  if (/^(Cl|Br|Si|Na|Li|Mg|Ca|Fe|Zn|Cu|Ag|Au|Se|As|Al|Sn|Pb)$/.test(two)) return { atom: { label: two, aromatic: false }, next: start + 2 };
  const one = source[start];
  if (one && /^[BCNOPSFIbcnops]$/.test(one)) return { atom: { label: one, aromatic: one === one.toLowerCase() }, next: start + 1 };
  return null;
}

function parseSmiles(source: string): Molecule | null {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const branches: number[] = [];
  const rings = new Map<string, { atom: number; order: number }>();
  let current = -1;
  let pendingOrder = 1;
  let i = 0;
  while (i < source.length) {
    const token = source[i]!;
    if (/\s/.test(token)) return null;
    const parsed = parseAtom(source, i);
    if (parsed) {
      const index = atoms.push(parsed.atom) - 1;
      if (current >= 0) bonds.push({ a: current, b: index, order: pendingOrder });
      current = index;
      pendingOrder = 1;
      i = parsed.next;
      continue;
    }
    if (token === '(') {
      if (current < 0) return null;
      branches.push(current);
      i += 1;
      continue;
    }
    if (token === ')') {
      const previous = branches.pop();
      if (previous === undefined) return null;
      current = previous;
      i += 1;
      continue;
    }
    if (token === '-' || token === '=' || token === '#' || token === ':') {
      if (current < 0 || pendingOrder !== 1) return null;
      pendingOrder = token === '=' ? 2 : token === '#' ? 3 : token === ':' ? 1.5 : 1;
      i += 1;
      continue;
    }
    if (token === '/' || token === '\\') {
      return null;
    }
    if (token === '.') return null;
    const ringMatch = /^(\d|%\d{2})/.exec(source.slice(i));
    if (ringMatch) {
      if (current < 0) return null;
      const key = ringMatch[1]!;
      const prior = rings.get(key);
      if (prior) {
        bonds.push({ a: prior.atom, b: current, order: pendingOrder !== 1 ? pendingOrder : prior.order });
        rings.delete(key);
      } else {
        rings.set(key, { atom: current, order: pendingOrder });
      }
      pendingOrder = 1;
      i += key.length;
      continue;
    }
    return null;
  }
  if (!atoms.length || branches.length || rings.size || pendingOrder !== 1) return null;
  return { atoms, bonds };
}

function atomPositions(molecule: Molecule, width: number, height: number): Array<{ x: number; y: number }> {
  const degree = molecule.atoms.map((_, index) => molecule.bonds.filter((bond) => bond.a === index || bond.b === index).length);
  const linear = Math.max(...degree, 0) <= 2 && molecule.bonds.length === Math.max(0, molecule.atoms.length - 1);
  if (linear) {
    const left = 28;
    const right = width - 28;
    const step = molecule.atoms.length === 1 ? 0 : (right - left) / (molecule.atoms.length - 1);
    return molecule.atoms.map((_, index) => ({ x: molecule.atoms.length === 1 ? width / 2 : left + index * step, y: height / 2 + (index % 2 ? 10 : -10) }));
  }
  const radius = Math.min(62, Math.max(38, molecule.atoms.length * 4.5));
  return molecule.atoms.map((_, index) => {
    const angle = (-90 + index * 360 / molecule.atoms.length) * Math.PI / 180;
    return { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + 4 + Math.sin(angle) * radius };
  });
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
  const offsets = bond.order >= 3 ? [-3.5, 0, 3.5] : bond.order >= 2 ? [-2.8, 2.8] : [0];
  return offsets.map((offset, index) => {
    const id = `bond-${bond.a}-${bond.b}-${index}`;
    b.line(id, sx + nx * offset, sy + ny * offset, ex + nx * offset, ey + ny * offset, { width: 1.7, role: 'connector' });
    return id;
  });
}

export function compileChemSmiles(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const smiles = specGet(spec, 'smiles');
  if (!smiles?.trim()) return malformed('chem.smiles needs smiles:');
  const molecule = parseSmiles(smiles.trim());
  if (!molecule) return malformed('chem.smiles could not parse the supported atom/bond grammar');
  if (molecule.atoms.length > 14) return malformed('chem.smiles molecule is too dense for the fixed frame');
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('chem.smiles', w, h);
  const positions = atomPositions(molecule, w, h);
  const radii = molecule.atoms.map((atom) => Math.max(11, Math.min(18, atom.label.length * 3.4)));
  const strokeIds: string[] = [];
  molecule.bonds.forEach((bond) => strokeIds.push(...bondLines(b, bond, positions[bond.a]!, positions[bond.b]!, Math.max(radii[bond.a]!, radii[bond.b]!))));
  const highlightIds: string[] = [...spec.highlight];
  molecule.atoms.forEach((atom, index) => {
    const atomId = `atom-${index}`;
    const labelId = `atom-label-${index}`;
    b.circle(atomId, positions[index]!.x, positions[index]!.y, radii[index]!, { fill: 'none', role: 'geometry' });
    b.label(labelId, atom.label, positions[index]!.x, positions[index]!.y, { protected: true, priority: 'required', anchorId: atomId });
    if (spec.highlight.some((value) => value.toLowerCase() === atom.label.toLowerCase() || value.toLowerCase() === atomId)) highlightIds.push(atomId, labelId);
  });
  spec.highlight.forEach((value) => {
    const match = /^(?:bond-)?(\d+)-(\d+)/i.exec(value);
    if (match) strokeIds.forEach((id) => { if (id.startsWith(`bond-${match[1]}-${match[2]}-`)) highlightIds.push(id); });
  });
  b.hl([...highlightIds, ...strokeIds.filter((id) => spec.highlight.includes(id))]);
  const annotations = specGetAll(spec, 'annotate').filter((value) => value.trim());
  annotations.forEach((value, index) => {
    if (index < 3) b.label(`annotation-${index}`, value, w / 2, 14 + index * 14, { protected: true, priority: 'preferred', anchorId: `atom-${Math.min(index, molecule.atoms.length - 1)}` });
  });
  if (annotations.length > 3) return malformed('chem.smiles supports at most three annotations in the fixed frame');
  return layoutAndCompile(b.scene());
}
