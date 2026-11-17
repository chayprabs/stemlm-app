/**
 * Electron configuration of an atom or monatomic ion, computed from the element.
 *
 *   element: Fe        symbol, name or Z=26; a charge may be written with it (Fe3+, Fe(III), iron(III) ion)
 *   charge:  3+        optional ion charge (3+, +3, 2-)
 *   show:    both      boxes (orbital box diagram) | notation (the 1s² 2s² … line) | both
 *   core:    noble     abbreviate with the noble-gas core
 *
 * The configuration, the arrows (Hund's rule, Pauli) and the unpaired-electron count are all derived in
 * configuration.ts; the spec cannot supply them. Subshells are listed by shell (3d before 4s), the order in
 * which a cation gives its electrons up from the right.
 */
import type { CompileCtx, CompileResult } from '../../types';
import type { SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import {
  FIRST_PREDICTED_Z, electronCount, ionState, nobleCore, notationTerms, orbitals, speciesText, subshellName, unpairedElectrons,
  type Subshell,
} from './configuration';
import { elementName, readAtom } from './elements';
import { EDGE, LINE, TEXT_H, canvasHeight, finish, guard, packRows, put, putLeft, putRows, readOne, readShow, refuse, textW } from './shared';

const SHOW = {
  both: /\b(?:both|all)\b/g,
  boxes: /\b(?:box(?:es)?|orbitals?(?:[\s-]*(?:box|diagram))?|arrows?|diagram)\b/g,
  notation: /\b(?:notation|configuration|config|spdf)\b/g,
};

const BOX = 15;
const GROUP_GAP = 8;
const ROW_H = BOX + 3 + TEXT_H;
const ROW_GAP = 7;
const TERM_GAP = 6;

/** Whether `core:` asks for the noble-gas abbreviation. */
function wantsCore(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  if (/noble|abbrev|short|condensed|^(?:yes|true|on)$|^\[/i.test(raw)) return true;
  if (/^(?:full|none|no|false|off|long|expanded|complete)$/i.test(raw.trim())) return false;
  return refuse(`core: "${raw}" is not noble or full`);
}

/** One electron as an open-headed arrow from (x, tail) to (x, head). */
function arrowPath(x: number, tail: number, head: number): string {
  const barb = head < tail ? 3 : -3;
  return `M ${x} ${tail} L ${x} ${head} M ${x - 2.3} ${head + barb} L ${x} ${head} L ${x + 2.3} ${head + barb}`;
}

function compile(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const atom = readAtom(spec);
  const show = readShow(spec, 'show', SHOW);
  const abbreviate = wantsCore(readOne(spec, 'core'));
  // With no `show:`, the type the model wrote says which view it meant.
  const implied = /orbital/.test(ctx.alias ?? '') ? 'boxes' : /configuration/.test(ctx.alias ?? '') ? 'notation' : 'both';
  const view = show.has('both') || (show.has('boxes') && show.has('notation')) ? 'both' : show.has('boxes') ? 'boxes' : show.has('notation') ? 'notation' : implied;

  const config = ionState(atom.z, atom.charge);
  const core = abbreviate ? nobleCore(config) : null;
  const shown: Subshell[] = core ? core.valence : config;
  const coreText = core ? `[${core.symbol}]` : '';
  const unpaired = unpairedElectrons(config);

  const nominal = frameSize(ctx.profile);
  const width = nominal.w;
  const inner = width - 2 * EDGE;
  const title = [
    speciesText(atom.z, atom.charge),
    `${elementName(atom.z)}, Z = ${atom.z}`,
    ...(atom.charge ? [`${electronCount(config)} electrons`] : []),
  ];
  const facts = [
    unpaired ? `${unpaired} unpaired electron${unpaired === 1 ? '' : 's'}` : 'no unpaired electrons',
    ...(atom.z >= FIRST_PREDICTED_Z ? ['predicted, not measured'] : []),
  ];
  const terms = view === 'boxes' ? [] : packRows([...(core ? [coreText] : []), ...notationTerms(shown)], inner, TERM_GAP);

  // Box rows: a subshell's boxes stay together; the core symbol leads the first row.
  const lead = core ? textW(coreText) + GROUP_GAP : 0;
  const rows: Subshell[][] = [];
  let used = 0;
  for (const subshell of view === 'notation' ? [] : shown) {
    const w = orbitals(subshell.l) * BOX;
    const row = rows.at(-1);
    if (row && used + GROUP_GAP + w <= inner) {
      row.push(subshell);
      used += GROUP_GAP + w;
    } else {
      rows.push([subshell]);
      used = (rows.length === 1 ? lead : 0) + w;
    }
  }

  const boxesH = rows.length ? rows.length * ROW_H + (rows.length - 1) * ROW_GAP + 8 : 0;
  const termsH = terms.length ? terms.length * LINE + 5 : 0;
  // The notation alone is all text; a rule under the heading keeps it a figure, and needs the room.
  const headGap = rows.length ? 8 : 14;
  const contentH = TEXT_H + headGap + boxesH + termsH + TEXT_H;
  const height = contentH + 2 * EDGE <= nominal.h ? Math.max(72, Math.ceil(contentH + 2 * EDGE)) : canvasHeight(contentH + 2 * EDGE, nominal.h);
  const b = new SceneBuilder('econfig', width, height);
  let y = (height - contentH) / 2;
  putRows(b, 'title', [title], width / 2, y, 12);
  if (!rows.length) b.line('rule', EDGE + 20, y + TEXT_H + 5, width - EDGE - 20, y + TEXT_H + 5, { color: 'muted', role: 'guide', width: 1 });
  y += TEXT_H + headGap;

  rows.forEach((row, r) => {
    const rowW = row.reduce((sum, subshell) => sum + orbitals(subshell.l) * BOX, 0) + GROUP_GAP * (row.length - 1) + (r === 0 ? lead : 0);
    let x = (width - rowW) / 2;
    if (r === 0 && core) {
      putLeft(b, 'core', coreText, x, y + BOX / 2);
      x += lead;
    }
    for (const subshell of row) {
      const name = subshellName(subshell);
      const count = orbitals(subshell.l);
      // Hund's rule: one electron in every orbital, spins parallel, before any orbital takes a second.
      const singles = Math.min(subshell.electrons, count);
      const pairs = subshell.electrons - singles;
      for (let k = 0; k < count; k++) {
        const left = x + k * BOX;
        b.rect(`${name}-box-${k}`, left, y, BOX, BOX, { role: 'boundary', width: 1.2 });
        if (k < singles) b.path(`${name}-up-${k}`, arrowPath(left + BOX * 0.33, y + BOX - 3, y + 3), { color: 'accent', role: 'annotation', width: 1.2 });
        if (k < pairs) b.path(`${name}-down-${k}`, arrowPath(left + BOX * 0.67, y + 3, y + BOX - 3), { color: 'accent', role: 'annotation', width: 1.2 });
      }
      put(b, `${name}-label`, name, x + (count * BOX) / 2, y + BOX + 3 + TEXT_H / 2);
      x += count * BOX + GROUP_GAP;
    }
    y += ROW_H + ROW_GAP;
  });
  if (rows.length) y += 8 - ROW_GAP;
  if (terms.length) {
    putRows(b, 'term', terms, width / 2, y, TERM_GAP);
    y += termsH;
  }
  putRows(b, 'fact', [facts], width / 2, y, 14);
  return finish(b.scene());
}

export const compileEconfig = guard(compile);
