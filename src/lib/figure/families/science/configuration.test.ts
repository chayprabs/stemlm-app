import { describe, expect, it } from 'vitest';
import {
  EXCEPTION_ZS, electronCount, groundState, ionState, nobleCore, notationTerms, shellPopulations, unpairedElectrons, type Subshell,
} from './configuration';
import { MAX_Z, elementName, elementSymbol, parseCharge, parseSpecies } from './elements';
import { FigureError } from './shared';

const written = (config: Subshell[]) => notationTerms(config).join(' ').replace(/[\^{}]/g, '');
const abbreviated = (config: Subshell[]) => {
  const core = nobleCore(config);
  return core ? `[${core.symbol}] ${written(core.valence)}` : written(config);
};
const z = (symbol: string) => parseSpecies(symbol).z;
const refusal = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    if (error instanceof FigureError) return error.message;
    throw error;
  }
  return '';
};

describe('ground-state configurations', () => {
  it.each([
    ['H', '1s1', 1], ['He', '1s2', 0], ['Li', '[He] 2s1', 1], ['C', '[He] 2s2 2p2', 2], ['N', '[He] 2s2 2p3', 3], ['O', '[He] 2s2 2p4', 2],
    ['Ne', '[He] 2s2 2p6', 0], ['Na', '[Ne] 3s1', 1], ['P', '[Ne] 3s2 3p3', 3], ['Ar', '[Ne] 3s2 3p6', 0], ['K', '[Ar] 4s1', 1],
    ['Sc', '[Ar] 3d1 4s2', 1], ['Ti', '[Ar] 3d2 4s2', 2], ['V', '[Ar] 3d3 4s2', 3], ['Mn', '[Ar] 3d5 4s2', 5], ['Fe', '[Ar] 3d6 4s2', 4],
    ['Co', '[Ar] 3d7 4s2', 3], ['Ni', '[Ar] 3d8 4s2', 2], ['Zn', '[Ar] 3d10 4s2', 0], ['Ga', '[Ar] 3d10 4s2 4p1', 1], ['Br', '[Ar] 3d10 4s2 4p5', 1],
    ['Zr', '[Kr] 4d2 5s2', 2], ['Tc', '[Kr] 4d5 5s2', 5], ['Cd', '[Kr] 4d10 5s2', 0], ['I', '[Kr] 4d10 5s2 5p5', 1], ['Ba', '[Xe] 6s2', 0],
    ['Pr', '[Xe] 4f3 6s2', 3], ['Eu', '[Xe] 4f7 6s2', 7], ['Tb', '[Xe] 4f9 6s2', 5], ['Yb', '[Xe] 4f14 6s2', 0], ['Lu', '[Xe] 4f14 5d1 6s2', 1],
    ['Hf', '[Xe] 4f14 5d2 6s2', 2], ['W', '[Xe] 4f14 5d4 6s2', 4], ['Hg', '[Xe] 4f14 5d10 6s2', 0], ['Pb', '[Xe] 4f14 5d10 6s2 6p2', 2],
    ['Rn', '[Xe] 4f14 5d10 6s2 6p6', 0], ['Pu', '[Rn] 5f6 7s2', 6], ['Am', '[Rn] 5f7 7s2', 7], ['No', '[Rn] 5f14 7s2', 0],
    ['Rf', '[Rn] 5f14 6d2 7s2', 2], ['Og', '[Rn] 5f14 6d10 7s2 7p6', 0],
  ])('%s is %s with %i unpaired', (symbol, expected, unpaired) => {
    const config = groundState(z(symbol));
    expect(abbreviated(config)).toBe(expected);
    expect(unpairedElectrons(config)).toBe(unpaired);
  });

  // Every encoded departure from the Madelung order, against the NIST ground levels.
  it.each([
    ['Cr', '[Ar] 3d5 4s1', 6], ['Cu', '[Ar] 3d10 4s1', 1], ['Nb', '[Kr] 4d4 5s1', 5], ['Mo', '[Kr] 4d5 5s1', 6], ['Ru', '[Kr] 4d7 5s1', 4],
    ['Rh', '[Kr] 4d8 5s1', 3], ['Pd', '[Kr] 4d10', 0], ['Ag', '[Kr] 4d10 5s1', 1], ['La', '[Xe] 5d1 6s2', 1], ['Ce', '[Xe] 4f1 5d1 6s2', 2],
    ['Gd', '[Xe] 4f7 5d1 6s2', 8], ['Pt', '[Xe] 4f14 5d9 6s1', 2], ['Au', '[Xe] 4f14 5d10 6s1', 1], ['Ac', '[Rn] 6d1 7s2', 1],
    ['Th', '[Rn] 6d2 7s2', 2], ['Pa', '[Rn] 5f2 6d1 7s2', 3], ['U', '[Rn] 5f3 6d1 7s2', 4], ['Np', '[Rn] 5f4 6d1 7s2', 5],
    ['Cm', '[Rn] 5f7 6d1 7s2', 8], ['Lr', '[Rn] 5f14 7s2 7p1', 1],
  ])('exception %s is %s with %i unpaired', (symbol, expected, unpaired) => {
    const config = groundState(z(symbol));
    expect(abbreviated(config)).toBe(expected);
    expect(unpairedElectrons(config)).toBe(unpaired);
    expect(EXCEPTION_ZS).toContain(z(symbol));
  });

  it('encodes exactly twenty exceptions and holds Z electrons for every element', () => {
    expect(EXCEPTION_ZS).toHaveLength(20);
    for (let n = 1; n <= MAX_Z; n++) {
      const config = groundState(n);
      expect(electronCount(config), elementSymbol(n)).toBe(n);
      for (const subshell of config) {
        expect(subshell.l).toBeLessThan(subshell.n);
        expect(subshell.electrons).toBeGreaterThan(0);
        expect(subshell.electrons).toBeLessThanOrEqual(4 * subshell.l + 2);
      }
      expect(shellPopulations(config).reduce((sum, count) => sum + count, 0)).toBe(n);
    }
  });

  it('writes the full configuration by shell', () => {
    expect(written(groundState(26))).toBe('1s2 2s2 2p6 3s2 3p6 3d6 4s2');
    expect(written(groundState(79))).toBe('1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s1');
  });

  it.each([
    ['H', [1]], ['He', [2]], ['Na', [2, 8, 1]], ['Cl', [2, 8, 7]], ['K', [2, 8, 8, 1]], ['Ca', [2, 8, 8, 2]], ['Sc', [2, 8, 9, 2]],
    ['Fe', [2, 8, 14, 2]], ['Cu', [2, 8, 18, 1]], ['Kr', [2, 8, 18, 8]], ['Ag', [2, 8, 18, 18, 1]], ['I', [2, 8, 18, 18, 7]],
    ['Au', [2, 8, 18, 32, 18, 1]], ['U', [2, 8, 18, 32, 21, 9, 2]], ['Og', [2, 8, 18, 32, 32, 18, 8]],
  ])('%s has shells %j', (symbol, shells) => {
    expect(shellPopulations(groundState(z(symbol)))).toEqual(shells);
  });
});

describe('ions', () => {
  it.each([
    ['Na', 1, '[He] 2s2 2p6', 0], ['Mg', 2, '[He] 2s2 2p6', 0], ['Al', 3, '[He] 2s2 2p6', 0], ['K', 1, '[Ne] 3s2 3p6', 0],
    // Transition metals lose ns before (n-1)d.
    ['Sc', 3, '[Ne] 3s2 3p6', 0], ['Ti', 2, '[Ar] 3d2', 2], ['Ti', 4, '[Ne] 3s2 3p6', 0], ['V', 2, '[Ar] 3d3', 3], ['Cr', 3, '[Ar] 3d3', 3],
    ['Mn', 2, '[Ar] 3d5', 5], ['Fe', 2, '[Ar] 3d6', 4], ['Fe', 3, '[Ar] 3d5', 5], ['Co', 2, '[Ar] 3d7', 3], ['Co', 3, '[Ar] 3d6', 4],
    ['Ni', 2, '[Ar] 3d8', 2], ['Cu', 1, '[Ar] 3d10', 0], ['Cu', 2, '[Ar] 3d9', 1], ['Zn', 2, '[Ar] 3d10', 0], ['Ag', 1, '[Kr] 4d10', 0],
    ['Pd', 2, '[Kr] 4d8', 2], ['Pt', 2, '[Xe] 4f14 5d8', 2], ['Au', 3, '[Xe] 4f14 5d8', 2], ['Hg', 2, '[Xe] 4f14 5d10', 0],
    // p-block: np before ns.
    ['Ga', 3, '[Ar] 3d10', 0], ['Sn', 2, '[Kr] 4d10 5s2', 0], ['Sn', 4, '[Kr] 4d10', 0], ['Pb', 2, '[Xe] 4f14 5d10 6s2', 0], ['Tl', 1, '[Xe] 4f14 5d10 6s2', 0],
    // f-block: 6s, then 5d, then 4f.
    ['La', 3, '[Kr] 4d10 5s2 5p6', 0], ['Ce', 3, '[Xe] 4f1', 1], ['Ce', 4, '[Kr] 4d10 5s2 5p6', 0], ['Eu', 2, '[Xe] 4f7', 7], ['Gd', 3, '[Xe] 4f7', 7],
    ['Lu', 3, '[Xe] 4f14', 0], ['U', 4, '[Rn] 5f2', 2], ['U', 6, '[Xe] 4f14 5d10 6s2 6p6', 0],
    // Anions fill the outermost subshell.
    ['H', -1, '1s2', 0], ['F', -1, '[He] 2s2 2p6', 0], ['Cl', -1, '[Ne] 3s2 3p6', 0], ['O', -2, '[He] 2s2 2p6', 0], ['S', -2, '[Ne] 3s2 3p6', 0],
    ['N', -3, '[He] 2s2 2p6', 0], ['O', -1, '[He] 2s2 2p5', 1], ['Au', -1, '[Xe] 4f14 5d10 6s2', 0],
  ])('%s with charge %i is %s with %i unpaired', (symbol, charge, expected, unpaired) => {
    const config = ionState(z(symbol), charge);
    expect(abbreviated(config)).toBe(expected);
    expect(unpairedElectrons(config)).toBe(unpaired);
    expect(electronCount(config)).toBe(z(symbol) - charge);
  });

  it.each([
    ['V', 1, 'does not follow the rule'], ['Co', 1, 'does not follow the rule'], ['Ni', 1, 'does not follow the rule'],
    ['Y', 1, 'does not follow the rule'], ['La', 1, 'does not follow the rule'], ['Ce', 2, 'does not follow the rule'],
    ['Lu', 2, 'does not follow the rule'], ['Hf', 1, 'does not follow the rule'], ['Th', 3, 'does not follow the rule'],
    ['U', 2, 'does not follow the rule'], ['Pu', 1, 'does not follow the rule'],
    ['H', 1, 'no electrons left'], ['He', 3, 'no electrons left'],
    ['Fe', -1, 'anions of d- and f-block elements'], ['Ce', -1, 'anions of d- and f-block elements'],
    ['O', -3, 'room for only 2 more electrons'], ['F', -2, 'room for only 1 more electron'], ['Ne', -1, 'room for only 0 more electrons'],
    ['Rf', 4, 'beyond Lr'],
  ])('refuses %s with charge %i: %s', (symbol, charge, expected) => {
    expect(refusal(() => ionState(z(symbol), charge))).toContain(expected);
  });

  it('never returns a shared configuration that a later call could see changed', () => {
    ionState(26, 3);
    expect(written(groundState(26))).toBe('1s2 2s2 2p6 3s2 3p6 3d6 4s2');
  });
});

describe('reading an element and a charge', () => {
  it.each([
    ['Fe', 26, undefined], ['fe', 26, undefined], ['FE', 26, undefined], ['iron', 26, undefined], ['Iron', 26, undefined], ['  IRON atom ', 26, undefined],
    ['Z=26', 26, undefined], ['z = 26', 26, undefined], ['26', 26, undefined], ['Fe3+', 26, 3], ['Fe 3+', 26, 3], ['Fe^{3+}', 26, 3],
    ['Fe³⁺', 26, 3], ['Fe(III)', 26, 3], ['iron(III) ion', 26, 3], ['Fe+3', 26, 3], ['Cu+', 29, 1], ['Cl-', 17, -1], ['Cl⁻', 17, -1],
    ['O2-', 8, -2], ['O²⁻', 8, -2], ['O 2−', 8, -2], ['chloride', 17, -1], ['Oxide ion', 8, -2], ['sulphide', 16, -2], ['aluminum', 13, undefined],
    ['aluminium', 13, undefined], ['cesium', 55, undefined], ['sulphur', 16, undefined], ['Og', 118, undefined], ['oganesson', 118, undefined],
    ['Co', 27, undefined], ['S-2', 16, -2], ['Cl-1', 17, -1],
  ])('%s', (text, expectedZ, charge) => {
    const species = parseSpecies(text);
    expect(species.z).toBe(expectedZ);
    expect(species.charge).toBe(charge);
    expect(species.mass).toBeUndefined();
  });

  it('reads an isotope suffix as a mass number, never as a charge', () => {
    expect(parseSpecies('C-14')).toEqual({ z: 6, mass: 14 });
    expect(parseSpecies('uranium-235')).toEqual({ z: 92, mass: 235 });
    expect(parseSpecies('U 238')).toEqual({ z: 92, mass: 238 });
    expect(parseSpecies('H-2')).toEqual({ z: 1, mass: 2 });
  });

  it.each(['', 'unobtainium', 'Xx', 'Z=0', 'Z=119', '200', 'O2', 'Fe III', 'Fe ++', 'H2O', '<b>Fe</b>'])('refuses %j', (text) => {
    expect(refusal(() => parseSpecies(text))).not.toBe('');
  });

  it('reads a charge the ways chemists write one', () => {
    expect(['3+', '+3', '3', 'III', '(III)', '2-', '-2', '−2', '2–', '-', '+', '0', 'neutral', '^{2+}'].map((text) => parseCharge(text)))
      .toEqual([3, 3, 3, 3, 3, -2, -2, -2, -2, -1, 1, 0, 0, 2]);
    expect(parseCharge('plus two')).toBeNull();
    expect(parseCharge('3', false)).toBeNull();
  });

  it('names all 118 elements with distinct symbols', () => {
    const symbols = new Set(Array.from({ length: MAX_Z }, (_, i) => elementSymbol(i + 1)));
    const names = new Set(Array.from({ length: MAX_Z }, (_, i) => elementName(i + 1)));
    expect(MAX_Z).toBe(118);
    expect(symbols.size).toBe(118);
    expect(names.size).toBe(118);
    for (let n = 1; n <= MAX_Z; n++) {
      expect(parseSpecies(elementSymbol(n)).z).toBe(n);
      expect(parseSpecies(elementName(n)).z).toBe(n);
    }
    expect([elementSymbol(1), elementSymbol(26), elementSymbol(79), elementSymbol(118)]).toEqual(['H', 'Fe', 'Au', 'Og']);
  });
});
