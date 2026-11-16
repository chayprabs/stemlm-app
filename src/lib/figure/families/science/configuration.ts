/**
 * Electron configurations: ground states by the Madelung order with the measured exceptions, textbook
 * ions, parsing and validation of a written configuration, and what follows from one (unpaired electrons,
 * shell populations, the noble-gas core).
 */
import { elementSymbol, MAX_Z } from './elements';
import { plainSuperscripts, refuse } from './shared';

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

const byMadelung = (a: { n: number; l: number }, b: { n: number; l: number }) => a.n + a.l - (b.n + b.l) || a.n - b.n;
const byShell = (a: { n: number; l: number }, b: { n: number; l: number }) => a.n - b.n || a.l - b.l;

/** Subshells in filling order (n + l, then n): 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p. */
const MADELUNG: ReadonlyArray<{ n: number; l: number }> = (() => {
  const all: { n: number; l: number }[] = [];
  for (let n = 1; n <= 7; n++) for (let l = 0; l < Math.min(n, 4); l++) all.push({ n, l });
  all.sort(byMadelung);
  let held = 0;
  return all.filter((subshell) => {
    const needed = held < MAX_Z;
    held += capacity(subshell.l);
    return needed;
  });
})();

export type ConfigOrder = 'filling' | 'shell';

export function ordered(config: Subshell[], order: ConfigOrder): Subshell[] {
  return [...config].sort(order === 'filling' ? byMadelung : byShell);
}

function madelungFill(electrons: number): Subshell[] {
  const config: Subshell[] = [];
  let left = electrons;
  for (const { n, l } of MADELUNG) {
    if (left <= 0) break;
    const held = Math.min(left, capacity(l));
    config.push({ n, l, electrons: held });
    left -= held;
  }
  return config;
}

const NOBLE: ReadonlyArray<{ symbol: string; z: number }> = [2, 10, 18, 36, 54, 86, 118].map((z) => ({ symbol: elementSymbol(z), z }));

/**
 * Measured ground states that depart from the Madelung order (NIST Atomic Spectra Database ground levels).
 * Beyond Lr the ground states are calculated, not measured; those follow the Madelung order here and the
 * figure marks them as predicted.
 */
const EXCEPTIONS: Readonly<Record<number, string>> = {
  24: '[Ar] 3d5 4s1',
  29: '[Ar] 3d10 4s1',
  41: '[Kr] 4d4 5s1',
  42: '[Kr] 4d5 5s1',
  44: '[Kr] 4d7 5s1',
  45: '[Kr] 4d8 5s1',
  46: '[Kr] 4d10',
  47: '[Kr] 4d10 5s1',
  57: '[Xe] 5d1 6s2',
  58: '[Xe] 4f1 5d1 6s2',
  64: '[Xe] 4f7 5d1 6s2',
  78: '[Xe] 4f14 5d9 6s1',
  79: '[Xe] 4f14 5d10 6s1',
  89: '[Rn] 6d1 7s2',
  90: '[Rn] 6d2 7s2',
  91: '[Rn] 5f2 6d1 7s2',
  92: '[Rn] 5f3 6d1 7s2',
  93: '[Rn] 5f4 6d1 7s2',
  96: '[Rn] 5f7 6d1 7s2',
  103: '[Rn] 5f14 7s2 7p1',
};

export const EXCEPTION_ZS: readonly number[] = Object.keys(EXCEPTIONS).map(Number);

/** First element whose ground state is a calculation rather than a measurement. */
export const FIRST_PREDICTED_Z = 104;

/** Ground-state configuration of the neutral atom, in filling order. */
export function groundState(z: number): Subshell[] {
  const exception = EXCEPTIONS[z];
  return exception ? ordered(parseConfiguration(exception).config, 'filling') : madelungFill(z);
}

/** What the Madelung order alone predicts; differs from `groundState` exactly for the exceptions. */
export function madelungState(z: number): Subshell[] {
  return madelungFill(z);
}

/** The largest noble-gas configuration strictly inside `config`, with every one of its subshells full. */
export function nobleCore(config: Subshell[]): { symbol: string; z: number; core: Subshell[]; valence: Subshell[] } | null {
  const total = electronCount(config);
  for (const noble of [...NOBLE].reverse()) {
    if (noble.z >= total) continue;
    const core = madelungFill(noble.z);
    const full = core.every((shell) => config.some((held) => held.n === shell.n && held.l === shell.l && held.electrons === shell.electrons));
    if (!full) continue;
    const valence = config.filter((held) => !core.some((shell) => shell.n === held.n && shell.l === held.l));
    const inCore = config.filter((held) => core.some((shell) => shell.n === held.n && shell.l === held.l));
    return { symbol: noble.symbol, z: noble.z, core: inCore, valence };
  }
  return null;
}

/** Hund's rule in a subshell: one electron in every orbital before any pairs. */
export function unpairedIn(subshell: Subshell): number {
  const count = orbitals(subshell.l);
  return subshell.electrons <= count ? subshell.electrons : 2 * count - subshell.electrons;
}

export function unpairedElectrons(config: Subshell[]): number {
  return config.reduce((sum, subshell) => sum + unpairedIn(subshell), 0);
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

const isActinide = (z: number) => z >= 89 && z <= 103;

/**
 * Cations whose measured gas-phase ground state is not what the removal rule below gives (V+ is 3d4, not
 * 3d3 4s1; Ce2+ is 4f2; Th3+ is 5f1). Low-charge actinide ions are too irregular to derive at all.
 */
const RULE_BREAKING_CATIONS: Readonly<Record<number, readonly number[]>> = {
  23: [1], 27: [1], 28: [1], 39: [1], 57: [1], 58: [1, 2], 71: [1, 2], 72: [1], 90: [3],
};

const COINAGE = new Set([29, 47, 79]);

/**
 * Configuration of the atom or monatomic ion.
 *
 * Cations lose electrons from the valence subshells (those outside the noble-gas core) in order of highest
 * n first, and highest l within a shell: np, then ns, then (n-1)d, then (n-2)f. This is the textbook rule
 * that a transition metal loses its ns electrons before its (n-1)d electrons (Fe 3d6 4s2 gives Fe2+ 3d6
 * and Fe3+ 3d5; Cu 3d10 4s1 gives Cu+ 3d10 and Cu2+ 3d9). Ions known to break the rule are refused rather
 * than drawn wrong; `config:` states them explicitly.
 *
 * Anions gain electrons in the outermost subshell, up to filling it, for the s- and p-block and the
 * coinage metals (Cl-, O2-, N3-, H-, Au-); other anions are not derived.
 */
export function ionState(z: number, charge: number): Subshell[] {
  const neutral = groundState(z);
  if (charge === 0) return neutral;
  const species = `${elementSymbol(z)}${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}`;
  if (z >= FIRST_PREDICTED_Z) refuse(`${species}: no measured configuration for ions of Z ≥ ${FIRST_PREDICTED_Z}; give config explicitly`, 'refused');
  if (charge > 0) {
    if (charge >= z) refuse(`${species} has no electrons`);
    if (RULE_BREAKING_CATIONS[z]?.includes(charge) || (isActinide(z) && charge <= 2)) {
      refuse(`${species} does not follow the ns-before-(n-1)d removal rule; give config explicitly`, 'refused');
    }
    const core = nobleCore(neutral);
    const highestFirst = (a: Subshell, b: Subshell) => b.n - a.n || b.l - a.l;
    const order = [...(core?.valence ?? neutral)].sort(highestFirst).concat([...(core?.core ?? [])].sort(highestFirst));
    const left = new Map(neutral.map((subshell) => [subshellName(subshell), subshell.electrons]));
    let toRemove = charge;
    for (const subshell of order) {
      const taken = Math.min(toRemove, subshell.electrons);
      left.set(subshellName(subshell), subshell.electrons - taken);
      toRemove -= taken;
    }
    return neutral.map((subshell) => ({ ...subshell, electrons: left.get(subshellName(subshell))! })).filter((subshell) => subshell.electrons > 0);
  }
  const outer = [...neutral].sort((a, b) => b.n - a.n || b.l - a.l)[0]!;
  const block = MADELUNG.find((_, index) => MADELUNG.slice(0, index + 1).reduce((sum, shell) => sum + capacity(shell.l), 0) >= z)!.l;
  if (block >= 2 && !COINAGE.has(z)) refuse(`${species}: anions of d- and f-block elements are not derived; give config explicitly`, 'refused');
  if (-charge > capacity(outer.l) - outer.electrons) refuse(`${species}: the ${subshellName(outer)} subshell has room for only ${capacity(outer.l) - outer.electrons} more electron(s)`);
  return neutral.map((subshell) => (subshell === outer ? { ...subshell, electrons: subshell.electrons - charge } : subshell));
}

export interface WrittenConfiguration {
  /** Subshells in the order they were written, the core (if any) expanded first in filling order. */
  config: Subshell[];
  /** Noble-gas core the author wrote, if any. */
  core?: string;
}

/**
 * Terms of a run written without spaces (`1s22s22p6`, `3d104s2`): a count takes two digits only when that
 * fits the subshell and leaves a readable remainder.
 */
function splitRun(run: string): { n: number; l: number; electrons: number }[] | null {
  if (!run) return [];
  const head = /^([1-9])([spdf])\^?\{?/i.exec(run);
  if (!head) return null;
  const n = Number(head[1]);
  const l = LETTERS.indexOf(head[2]!.toLowerCase());
  const rest = run.slice(head[0].length);
  for (const width of [2, 1]) {
    const digits = rest.slice(0, width);
    if (digits.length !== width || !/^\d+$/.test(digits)) continue;
    const electrons = Number(digits);
    if (width === 2 && (digits[0] === '0' || electrons > capacity(l))) continue;
    const tail = splitRun(rest.slice(width).replace(/^\}/, ''));
    if (tail) return [{ n, l, electrons }, ...tail];
  }
  return null;
}

/** A configuration as written: `[Ar] 4s2 3d6`, `1s² 2s² 2p⁶`, `1s2,2s2,2p6`, `1s22s22p63s1`, `[Kr]5s^{2}4d^{10}`. */
export function parseConfiguration(raw: string): WrittenConfiguration {
  let text = plainSuperscripts(raw).replace(/\\?(?:mathrm|text)\b/g, '').replace(/[$\\]/g, '').trim();
  let core: string | undefined;
  const config: Subshell[] = [];
  const bracket = /^\[\s*([A-Za-z]{2})\s*\]/.exec(text);
  if (bracket) {
    const noble = NOBLE.find((entry) => entry.symbol.toLowerCase() === bracket[1]!.toLowerCase());
    if (!noble) refuse(`config: [${bracket[1]}] is not a noble-gas core`);
    core = noble.symbol;
    config.push(...madelungFill(noble.z));
    text = text.slice(bracket[0].length);
  }
  const runs = text.split(/[\s,;·.]+/).filter(Boolean);
  if (!runs.length && !core) refuse('config is empty');
  for (const run of runs) {
    const terms = splitRun(run);
    if (!terms) refuse(`config: "${run}" is not a subshell term such as 3d6`);
    for (const term of terms) {
      const name = subshellName(term);
      if (term.n > 7) refuse(`config: ${name} is beyond the seventh shell`);
      if (term.l >= term.n) refuse(`config: there is no ${name} subshell (l must be below n)`);
      if (term.electrons > capacity(term.l)) refuse(`config: ${name} holds at most ${capacity(term.l)} electrons, not ${term.electrons}`);
      if (config.some((held) => held.n === term.n && held.l === term.l)) refuse(`config: ${name} is written twice`);
      // `4s0` stresses an empty subshell; it holds nothing to draw.
      if (term.electrons > 0) config.push(term);
    }
  }
  if (!config.length) refuse('config holds no electrons');
  if (electronCount(config) > MAX_Z) refuse('config holds more electrons than any known element');
  return { config, core };
}

/** `1s^2 2s^2 2p^6` terms; the label notation prints the counts as superscripts. */
export function notationTerms(config: Subshell[]): string[] {
  return config.map((subshell) => `${subshellName(subshell)}^${subshell.electrons}`);
}
