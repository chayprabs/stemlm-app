/**
 * Periodic data for Z = 1..118 and the tolerant reader for "which atom or ion is this":
 * `Fe`, `iron`, `Z=26`, `Fe3+`, `Fe(III)`, `Fe³⁺`, `iron(III) ion`, `chloride`.
 */
import { plainSuperscripts, refuse } from './shared';

const SYMBOLS = (
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr '
  + 'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu '
  + 'Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr '
  + 'Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'
).split(' ');

const NAMES = (
  'hydrogen helium lithium beryllium boron carbon nitrogen oxygen fluorine neon sodium magnesium aluminium silicon '
  + 'phosphorus sulfur chlorine argon potassium calcium scandium titanium vanadium chromium manganese iron cobalt nickel '
  + 'copper zinc gallium germanium arsenic selenium bromine krypton rubidium strontium yttrium zirconium niobium '
  + 'molybdenum technetium ruthenium rhodium palladium silver cadmium indium tin antimony tellurium iodine xenon '
  + 'caesium barium lanthanum cerium praseodymium neodymium promethium samarium europium gadolinium terbium dysprosium '
  + 'holmium erbium thulium ytterbium lutetium hafnium tantalum tungsten rhenium osmium iridium platinum gold mercury '
  + 'thallium lead bismuth polonium astatine radon francium radium actinium thorium protactinium uranium neptunium '
  + 'plutonium americium curium berkelium californium einsteinium fermium mendelevium nobelium lawrencium '
  + 'rutherfordium dubnium seaborgium bohrium hassium meitnerium darmstadtium roentgenium copernicium nihonium '
  + 'flerovium moscovium livermorium tennessine oganesson'
).split(' ');

/** Other spellings in common use. */
const NAME_ALIASES: Record<string, number> = { aluminum: 13, sulphur: 16, cesium: 55, wolfram: 74 };

/** Monatomic anion names: the element and the charge the name states. */
const ANION_NAMES: Record<string, [z: number, charge: number]> = {
  hydride: [1, -1], fluoride: [9, -1], chloride: [17, -1], bromide: [35, -1], iodide: [53, -1],
  oxide: [8, -2], sulfide: [16, -2], sulphide: [16, -2], selenide: [34, -2], telluride: [52, -2],
  nitride: [7, -3], phosphide: [15, -3],
};

export const MAX_Z = SYMBOLS.length;

const BY_SYMBOL = new Map(SYMBOLS.map((symbol, index) => [symbol.toLowerCase(), index + 1]));
const BY_NAME = new Map(NAMES.map((name, index) => [name, index + 1]));

export function elementSymbol(z: number): string {
  return SYMBOLS[z - 1] ?? '';
}

export function elementName(z: number): string {
  return NAMES[z - 1] ?? '';
}

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };

/**
 * A charge as chemists write it: `3+`, `+3`, `2-`, `-`, `+`, `(III)`, `^{2+}`, `0`, `neutral`.
 * A bare number or Roman numeral is a positive charge only under `charge:` (`bareNumber`); null when the
 * text is not a charge.
 */
export function parseCharge(raw: string, bareNumber = true): number | null {
  const text = plainSuperscripts(raw).toLowerCase().replace(/[\^{}\s]/g, '');
  if (!text || text === '0' || text === 'neutral' || text === 'none') return 0;
  // `Fe(III)` is an oxidation state; a bare `Fe III` is also spectroscopic notation for Fe2+, so only `charge:` reads it.
  const roman = (bareNumber ? /^\(?([iv]+)\)?$/ : /^\(([iv]+)\)$/).exec(text);
  if (roman && ROMAN[roman[1]!] !== undefined) return ROMAN[roman[1]!]!;
  const match = /^\(?(?:([+-])(\d{0,2})|(\d{1,2})([+-]))\)?$/.exec(text);
  if (match) {
    const sign = (match[1] ?? match[4]) === '-' ? -1 : 1;
    const magnitude = Number(match[2] || match[3] || '1');
    return sign * magnitude;
  }
  if (bareNumber && /^\d{1,2}$/.test(text)) return Number(text);
  return null;
}

export interface Species {
  z: number;
  /** Net charge stated with the element itself (`Fe3+`), undefined when none was written. */
  charge?: number;
}

/**
 * The element (and any charge written with it) named by `raw`. Symbols are read in any case because an
 * `element:` value can only be one atom, so `FE`, `fe` and `CO` (cobalt) are unambiguous here.
 */
export function parseSpecies(raw: string): Species {
  const text = plainSuperscripts(raw).replace(/\b(?:atom|ion|cation|anion)s?\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!text) refuse('element is empty');
  const byNumber = /^(?:z\s*=?\s*)?(\d{1,3})$/i.exec(text);
  if (byNumber) return { z: checkedZ(Number(byNumber[1]), raw) };
  const lead = /^([A-Za-z]+)\s*(.*)$/.exec(text);
  if (!lead) refuse(`element "${raw.trim()}" is not a symbol, a name or Z=number`);
  const word = lead[1]!.toLowerCase();
  const rest = lead[2]!.trim();
  const anion = ANION_NAMES[word];
  if (anion && !rest) return { z: anion[0], charge: anion[1] };
  const named = BY_NAME.get(word) ?? NAME_ALIASES[word] ?? BY_SYMBOL.get(word);
  if (named !== undefined) return withCharge(named, rest, raw);
  refuse(`element "${raw.trim()}" is not a symbol, a name or Z=number`);
}

function checkedZ(z: number, raw: string): number {
  if (!Number.isInteger(z) || z < 1 || z > MAX_Z) refuse(`element "${raw.trim()}": Z must be 1 to ${MAX_Z}`);
  return z;
}

function withCharge(z: number, rest: string, raw: string): Species {
  if (!rest) return { z };
  // A mass number or a count after the symbol (`O2`, `U 235`) is not a charge; guessing one would draw an ion nobody named.
  const charge = parseCharge(rest, false);
  if (charge === null) refuse(`element "${raw.trim()}": "${rest}" is not a charge`);
  return { z, charge };
}
