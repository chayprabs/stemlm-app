/**
 * Electron configurations: ground states by the Madelung order with the measured exceptions, the
 * textbook rule for monatomic ions, and what follows from a configuration (unpaired electrons, shell
 * populations, the noble-gas core). Subshells are always listed by shell: n, then s p d f.
 */
import { elementSymbol, MAX_Z } from './elements';
import { refuse } from './shared';

export interface Subshell {
  n: number;
  /** 0..3 for s, p, d, f. */
  l: number;
  electrons: number;
}

const LETTERS = 'spdf';

export const capacity = (l: number) => 4 * l + 2;
export const orbitals = (l: number) => 2 * l + 1;
export const subshellName = (subshell: { n: number; l: number }) => `${subshell.n}${LETTERS[subshell.l]}`;
export const electronCount = (config: Subshell[]) => config.reduce((sum, subshell) => sum + subshell.electrons, 0);

const byShell = (a: Subshell, b: Subshell) => a.n - b.n || a.l - b.l;
const outermostFirst = (a: Subshell, b: Subshell) => b.n - a.n || b.l - a.l;

/** Subshells in filling order (n + l, then n): 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p. */
const MADELUNG: ReadonlyArray<{ n: number; l: number }> = (() => {
  const all: { n: number; l: number }[] = [];
  for (let n = 1; n <= 7; n++) for (let l = 0; l < Math.min(n, 4); l++) all.push({ n, l });
  all.sort((a, b) => a.n + a.l - (b.n + b.l) || a.n - b.n);
  let held = 0;
  return all.filter((subshell) => {
    const needed = held < MAX_Z;
    held += capacity(subshell.l);
    return needed;
  });
})();

function madelungFill(electrons: number): Subshell[] {
  const config: Subshell[] = [];
  let left = electrons;
  for (const { n, l } of MADELUNG) {
    if (left <= 0) break;
    const held = Math.min(left, capacity(l));
    config.push({ n, l, electrons: held });
    left -= held;
  }
  return config.sort(byShell);
}

const NOBLE = [2, 10, 18, 36, 54, 86, 118];

/**
 * Measured ground states that depart from the Madelung order (NIST Atomic Spectra Database ground
 * levels), as the subshells outside the preceding noble-gas core. Beyond Lr the ground states are
 * calculated, not measured; those follow the Madelung order here and the figure marks them as predicted.
 */
const EXCEPTIONS: Readonly<Record<number, string>> = {
  24: '3d5 4s1', // Cr
  29: '3d10 4s1', // Cu
  41: '4d4 5s1', // Nb
  42: '4d5 5s1', // Mo
  44: '4d7 5s1', // Ru
  45: '4d8 5s1', // Rh
  46: '4d10', // Pd
  47: '4d10 5s1', // Ag
  57: '5d1 6s2', // La
  58: '4f1 5d1 6s2', // Ce
  64: '4f7 5d1 6s2', // Gd
  78: '4f14 5d9 6s1', // Pt
  79: '4f14 5d10 6s1', // Au
  89: '6d1 7s2', // Ac
  90: '6d2 7s2', // Th
  91: '5f2 6d1 7s2', // Pa
  92: '5f3 6d1 7s2', // U
  93: '5f4 6d1 7s2', // Np
  96: '5f7 6d1 7s2', // Cm
  103: '5f14 7s2 7p1', // Lr
};

export const EXCEPTION_ZS: readonly number[] = Object.keys(EXCEPTIONS).map(Number);

/** First element whose ground state is a calculation rather than a measurement. */
export const FIRST_PREDICTED_Z = 104;

/** Ground-state configuration of the neutral atom. */
export function groundState(z: number): Subshell[] {
  const exception = EXCEPTIONS[z];
  if (!exception) return madelungFill(z);
  const core = madelungFill(Math.max(...NOBLE.filter((noble) => noble < z)));
  const outer = exception.split(' ').map((term) => ({ n: Number(term[0]), l: LETTERS.indexOf(term[1]!), electrons: Number(term.slice(2)) }));
  return [...core, ...outer].sort(byShell);
}

export interface NobleCore {
  symbol: string;
  /** The subshells of `config` outside the core. */
  valence: Subshell[];
}

/** The largest noble-gas configuration strictly inside `config`, every one of its subshells full. */
export function nobleCore(config: Subshell[]): NobleCore | null {
  const total = electronCount(config);
  for (const z of [...NOBLE].reverse()) {
    if (z >= total) continue;
    const core = madelungFill(z);
    const inCore = (held: Subshell) => core.some((shell) => shell.n === held.n && shell.l === held.l);
    const full = core.every((shell) => config.some((held) => held.n === shell.n && held.l === shell.l && held.electrons === shell.electrons));
    if (full) return { symbol: elementSymbol(z), valence: config.filter((held) => !inCore(held)) };
  }
  return null;
}

/** Hund's rule in a subshell: one electron in every orbital before any pairs. */
export function unpairedElectrons(config: Subshell[]): number {
  return config.reduce((sum, { l, electrons }) => sum + Math.min(electrons, 2 * orbitals(l) - electrons), 0);
}

/** Electrons per principal shell, n = 1 first, through the outermost occupied shell. */
export function shellPopulations(config: Subshell[]): number[] {
  const shells: number[] = [];
  for (const subshell of config) {
    while (shells.length < subshell.n) shells.push(0);
    shells[subshell.n - 1]! += subshell.electrons;
  }
  return shells;
}

/**
 * Cations whose measured gas-phase ground state is not what the removal rule below gives (V+ is 3d4, not
 * 3d3 4s1; Ce2+ is 4f2; Th3+ is 5f1). Low-charge actinide ions are too irregular to derive at all.
 */
const RULE_BREAKING_CATIONS: Readonly<Record<number, readonly number[]>> = {
  23: [1], 27: [1], 28: [1], 39: [1], 57: [1], 58: [1, 2], 71: [1, 2], 72: [1], 90: [3],
};

const COINAGE = new Set([29, 47, 79]);

export function speciesText(z: number, charge: number): string {
  if (!charge) return elementSymbol(z);
  return `${elementSymbol(z)}^{${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '−'}}`;
}

/**
 * Configuration of the atom or monatomic ion.
 *
 * Cations lose electrons from the subshells outside the noble-gas core, highest n first and highest l
 * within a shell: np, then ns, then (n-1)d, then (n-2)f. This is the textbook rule that a transition
 * metal loses its ns electrons before its (n-1)d electrons (Fe 3d6 4s2 gives Fe2+ 3d6 and Fe3+ 3d5;
 * Cu 3d10 4s1 gives Cu+ 3d10 and Cu2+ 3d9). Ions known to break the rule are refused rather than drawn wrong.
 *
 * Anions gain electrons in the outermost subshell, up to filling it, for the s- and p-block and the
 * coinage metals (Cl-, O2-, N3-, H-, Au-); other anions are not derived.
 */
export function ionState(z: number, charge: number): Subshell[] {
  const neutral = groundState(z);
  if (charge === 0) return neutral;
  const species = speciesText(z, charge).replace(/[\^{}]/g, '');
  if (z >= FIRST_PREDICTED_Z) refuse(`${species}: no ion of an element beyond Lr has a measured configuration`, 'refused');
  if (charge > 0) {
    if (charge >= z) refuse(`${species} would have no electrons left`);
    if (RULE_BREAKING_CATIONS[z]?.includes(charge) || (z >= 89 && z <= 103 && charge <= 2)) {
      refuse(`${species} does not follow the rule that the outermost s electrons leave first, so its configuration is not derived here`, 'refused');
    }
    const valence = nobleCore(neutral)?.valence ?? neutral;
    const order = [...valence].sort(outermostFirst).concat(neutral.filter((held) => !valence.includes(held)).sort(outermostFirst));
    let toRemove = charge;
    for (const subshell of order) {
      const taken = Math.min(toRemove, subshell.electrons);
      subshell.electrons -= taken;
      toRemove -= taken;
    }
    return neutral.filter((subshell) => subshell.electrons > 0);
  }
  const outer = [...neutral].sort(outermostFirst)[0]!;
  let filled = 0;
  const block = MADELUNG.find((shell) => (filled += capacity(shell.l)) >= z)!.l;
  if (block >= 2 && !COINAGE.has(z)) refuse(`${species}: anions of d- and f-block elements are not derived here`, 'refused');
  const room = capacity(outer.l) - outer.electrons;
  if (-charge > room) refuse(`${species}: the ${subshellName(outer)} subshell has room for only ${room} more electron${room === 1 ? '' : 's'}`);
  outer.electrons -= charge;
  return neutral;
}

/** `1s^2 2s^2 2p^6` terms; figure labels print the counts as superscripts. */
export function notationTerms(config: Subshell[]): string[] {
  return config.map((subshell) => `${subshellName(subshell)}^{${subshell.electrons}}`);
}
