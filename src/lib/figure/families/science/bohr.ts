/**
 * Bohr (shell) model of an atom or monatomic ion.
 *
 *   element: Na        symbol, name or Z=11; a charge or a mass number may be written with it (Na+, C-14)
 *   charge:  1+        optional ion charge
 *   mass:    23        optional mass number A; the nucleus then also shows A − Z neutrons
 *
 * The shell populations are not read: they are the computed electron configuration (configuration.ts)
 * grouped by principal quantum number, so K is 2, 8, 8, 1 and Fe is 2, 8, 14, 2. Electrons are spaced
 * evenly round each shell.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { FIRST_PREDICTED_Z, electronCount, ionState, shellPopulations, speciesText } from './configuration';
import { elementName, readAtom } from './elements';
import { EDGE, LINE, TEXT_H, finish, guard, packRows, parseQuantity, putLines, putRows, readOne, refuse, textW } from './shared';

/** Shells stand this far apart when the frame has the room, and never closer than the floor. */
const EASY_GAP = 13;
const MIN_GAP = 9;
const FIRST_GAP = 10;
const DOT = 2.3;

function massNumber(spec: SpecDoc, z: number, withElement: number | undefined): number | undefined {
  const raw = readOne(spec, 'mass');
  if (raw === undefined) return withElement;
  const mass = parseQuantity(raw.replace(/^\s*A\s*=\s*/i, ''));
  if (!mass || !Number.isInteger(mass.value) || !/^(?:u|amu|da)?$/i.test(mass.unit)) {
    return refuse(`mass: "${raw}" is not a mass number; give the whole number of protons plus neutrons`);
  }
  if (withElement !== undefined && withElement !== mass.value) refuse(`element and mass state two different mass numbers (${withElement}, ${mass.value})`);
  if (mass.value < z || mass.value > 300) refuse(`mass number ${mass.value} is impossible for Z = ${z}`);
  return mass.value;
}

function compile(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const atom = readAtom(spec);
  const mass = massNumber(spec, atom.z, atom.mass);
  const config = ionState(atom.z, atom.charge);
  const shells = shellPopulations(config);

  const nucleus = [`${atom.z}p^{+}`, ...(mass !== undefined ? [`${mass - atom.z}n^{0}`] : [])];
  const core = Math.max(15, Math.hypot(Math.max(...nucleus.map(textW)) / 2, (TEXT_H + (nucleus.length - 1) * LINE) / 2) + 1.5);
  const title = [
    speciesText(atom.z, atom.charge),
    `${elementName(atom.z)}, Z = ${atom.z}`,
    ...(mass !== undefined ? [`A = ${mass}`] : []),
  ];
  const nominal = frameSize(ctx.profile);
  const width = nominal.w;
  const facts = packRows([
    `${electronCount(config)} electron${electronCount(config) === 1 ? '' : 's'}: ${shells.join(', ')}`,
    ...(atom.z >= FIRST_PREDICTED_Z ? ['predicted, not measured'] : []),
  ], width - 2 * EDGE, 14);
  const around = 2 * EDGE + TEXT_H + 6 + 6 + (facts.length - 1) * LINE + TEXT_H;
  // Outer radius at a given shell spacing, electrons included.
  const reach = (gap: number) => core + FIRST_GAP + (shells.length - 1) * gap + DOT + 1;
  const tall = Math.floor(1.5 * nominal.h) + 1;
  const fits = (canvas: number) => 2 * reach(MIN_GAP) + around <= canvas;
  const limit = fits(nominal.h) ? nominal.h : tall;
  const gap = shells.length > 1 ? Math.min(EASY_GAP, (((limit - around) / 2 - core - FIRST_GAP - DOT - 1) / (shells.length - 1))) : 0;
  const outer = reach(gap);
  const height = Math.max(limit === tall ? tall : 72, Math.ceil(2 * outer + around));
  if (2 * outer > width - 2 * EDGE) refuse('the atom has too many shells to draw legibly', 'refused');

  const b = new SceneBuilder('bohr', width, height);
  const cx = width / 2;
  const top = (height - (2 * outer + around)) / 2 + EDGE;
  const cy = top + TEXT_H + 6 + outer;
  putRows(b, 'title', [title], cx, top, 12);
  shells.forEach((count, k) => {
    const r = core + FIRST_GAP + k * gap;
    b.circle(`shell-${k + 1}`, cx, cy, r, { color: 'muted', role: 'guide', width: 1 });
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
      b.circle(`electron-${k + 1}-${i + 1}`, cx + r * Math.cos(angle), cy + r * Math.sin(angle), DOT, { color: 'accent', fill: 'ink', role: 'geometry', width: 1 });
    }
  });
  b.circle('nucleus', cx, cy, core, { fill: 'tint', role: 'geometry', width: 1.4 });
  putLines(b, 'nucleus-label', nucleus, cx, cy);
  putRows(b, 'fact', facts, cx, cy + outer + 6, 14);
  return finish(b.scene());
}

export const compileBohr = guard(compile);
