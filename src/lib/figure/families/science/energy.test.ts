import { describe, expect, it } from 'vitest';
import { draw, expectCleanLabels, reason } from '../cs/testing';

const SPECIMEN = 'level: r 0 A + B\nlevel: ts 85 TS\nlevel: p -40 C + D\nunit: kJ/mol\nshow: ea, dh';
const TWO_STEP = 'level: r 0 Reactants\nlevel: ts1 95 TS1\nlevel: i 30 Intermediate\nlevel: ts2 70 TS2\nlevel: p -55 Products\nunit: kJ/mol';

describe('energy: computed annotations', () => {
  it('computes E_a from the first barrier and a negative ΔH for an exothermic reaction', async () => {
    const drawn = await draw('energy', SPECIMEN);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['E_a = 85 kJ/mol', 'ΔH = −40 kJ/mol (exothermic)', 'E_a', 'ΔH', 'Energy (kJ/mol)', 'Reaction coordinate']));
    expectCleanLabels(drawn);
  });

  it('signs a positive ΔH and keeps the decimals the energies were written with', async () => {
    const drawn = await draw('energy', 'level: a 12.5 H2O(l)\nlevel: b 53.2 H2O(g)\nunit: kJ/mol\nshow: dh');
    expect(drawn.texts()).toContain('ΔH = +40.7 kJ/mol (endothermic)');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['H_{2}O(l)', 'H_{2}O(g)']));
    expectCleanLabels(drawn);
  });

  it('measures E_a from the reactants to the first transition state of a multi-step profile', async () => {
    const drawn = await draw('energy', `${TWO_STEP}\nshow: ea, dh`);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['E_a = 95 kJ/mol', 'ΔH = −55 kJ/mol (exothermic)']));
    expectCleanLabels(drawn);
  });

  it('prints bare numbers when no unit is given and names neither direction when ΔH is zero', async () => {
    const drawn = await draw('energy', 'level: a 0 A\nlevel: ts 30 TS\nlevel: b 0 B\nshow: ea, dh');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['E_a = 30', 'ΔH = 0', 'Energy']));
    expect(drawn.stroke('dh')).toBeUndefined();
  });

  it('draws the catalysed barrier dashed and reports its lower E_a', async () => {
    const drawn = await draw('energy', `${TWO_STEP}\nshow: ea\ncatalyst: ts1 60`);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['E_a = 95 kJ/mol', 'with catalyst (dashed): E_a = 60 kJ/mol']));
    expect(drawn.stroke('catalyst-ts1')).toMatchObject({ dash: true, kind: 'path' });
    expectCleanLabels(drawn);
  });

  it('says what the dashed path is when E_a is not asked for', async () => {
    const drawn = await draw('energy', `${TWO_STEP}\ncatalyst: ts2 50`);
    expect(drawn.texts()).toContain('dashed: with catalyst');
    expect(drawn.stroke('catalyst-ts2')?.dash).toBe(true);
  });
});

describe('energy: drawn to scale', () => {
  it('maps energies linearly: the ΔH and E_a arrows are in the ratio of the values', async () => {
    const drawn = await draw('energy', SPECIMEN);
    const ea = drawn.stroke('ea')!.points;
    const dh = drawn.stroke('dh')!.points;
    // Screen y grows downward: the peak is above the reactants, the products below.
    expect(ea[3]!).toBeLessThan(ea[1]!);
    expect(dh[3]!).toBeGreaterThan(dh[1]!);
    expect((dh[3]! - dh[1]!) / (ea[1]! - ea[3]! + 1.5)).toBeCloseTo(40 / 85, 2);
    expect(drawn.stroke('dh')).toMatchObject({ markerEnd: true });
    expect(drawn.stroke('ea')).toMatchObject({ markerEnd: true, markerStart: true });
  });

  it('puts tick labels at round values inside the range, evenly spaced', async () => {
    const drawn = await draw('energy', SPECIMEN);
    const ticks = drawn.scene.labels.filter((label) => label.id.startsWith('tick-label-'));
    const values = ticks.map((label) => Number(label.text!.replace('−', '-')));
    expect(values.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-40);
    expect(Math.max(...values)).toBeLessThanOrEqual(85);
    const perUnit = (ticks[0]!.y - ticks[1]!.y) / (values[1]! - values[0]!);
    ticks.forEach((label, i) => expect(label.y).toBeCloseTo(ticks[0]!.y - (values[i]! - values[0]!) * perUnit, 6));
  });

  it('treats a level as a transition state only when it is above both neighbours', async () => {
    // b is a shoulder on the way up, not a peak: E_a is measured to the real peak c.
    const drawn = await draw('energy', 'level: a 0\nlevel: b 20\nlevel: c 50\nlevel: d 10\nshow: ea');
    expect(drawn.texts()).toContain('E_a = 50');
    expect(await reason('energy', 'level: a 0\nlevel: b 20\nlevel: c 50\ncatalyst: b 10')).toContain('not a transition state');
  });

  it('marks a highlighted level', async () => {
    const drawn = await draw('energy', `${SPECIMEN}\nhighlight: ts`);
    expect(drawn.stroke('mark-ts')).toMatchObject({ kind: 'circle', semanticColor: 'accent' });
  });
});

describe('energy: liberal input', () => {
  it('reads units written on the level lines, commas, a typographic minus and spelled-out options', async () => {
    const drawn = await draw('energy-diagram', 'level: reactants, 0 kJ/mol, CH4 + 2O2\nlevel: TS = 150kJ/mol\nlevel: products −890 kJ/mol CO2 + 2H2O\nshow: activation energy, enthalpy change');
    expect(drawn.texts()).toEqual(expect.arrayContaining([
      'Energy (kJ/mol)', 'E_a = 150 kJ/mol', 'ΔH = −890 kJ/mol (exothermic)', 'CH_{4} + 2O_{2}', 'CO_{2} + 2H_{2}O', 'TS',
    ]));
    expectCleanLabels(drawn);
  });

  it('accepts ΔH, Ea and "both" in show, list items, and a level with no id', async () => {
    for (const show of ['Ea and ΔH', 'both', 'E_a; delta H', 'all', 'dH, ea']) {
      const drawn = await draw('energy', `level: 0 Reactants\nlevel: 40 TS\nlevel: 15 Products\nshow: ${show}`);
      expect(drawn.texts(), show).toEqual(expect.arrayContaining(['E_a = 40', 'ΔH = +15 (endothermic)', 'Reactants']));
    }
    const listed = await draw('energy', 'level:\n  - r 0 R\n  - ts 9.5 TS\n  - p 2.25 P\nunit: kJ mol^-1\nshow: ea, dh');
    expect(listed.texts()).toEqual(expect.arrayContaining(['E_a = 9.5 kJ mol^-1', 'ΔH = +2.25 kJ mol^-1 (endothermic)']));
  });

  it('applies an unnamed catalyst to the only transition state', async () => {
    const drawn = await draw('energy', 'level: r 0 R\nlevel: ts 80 TS\nlevel: p -20 P\ncatalyst: 45\nshow: ea');
    expect(drawn.texts()).toContain('with catalyst (dashed): E_a = 45');
  });

  it('wraps a long label and keeps every label clear of the others', async () => {
    const drawn = await draw('energy', 'level: r 0 enzyme + substrate\nlevel: ts 42 enzyme–substrate transition state\nlevel: p -18 enzyme + product\nunit: kJ/mol\nshow: ea');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['enzyme +', 'substrate', 'transition state']));
    expectCleanLabels(drawn);
  });

  it('draws the densest profile it admits without overlapping labels', async () => {
    const drawn = await draw('energy', 'level: a 0 A\nlevel: t1 40 TS1\nlevel: b 10 B\nlevel: t2 55 TS2\nlevel: c 20 C\nlevel: t3 48 TS3\nlevel: d -5 D\nlevel: t4 30 TS4\nlevel: e -30 E\nshow: ea, dh');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['E_a = 40', 'ΔH = −30 (exothermic)']));
    expectCleanLabels(drawn);
  });
});

describe('energy: refusals', () => {
  it.each([
    ['level: a 0 A', 'at least two level lines'],
    ['level: a 0 A\nlevel: b -20 B\nshow: ea', 'needs a transition state'],
    ['level: a 0\nlevel: b -50\nlevel: c -20\nlevel: d -80\nshow: ea', 'below the reactants'],
    ['level: a 0\nlevel: b five\nlevel: c 3', 'has no energy'],
    ['level: a 0\nlevel: A 5\nlevel: b 3', 'declared twice'],
    ['level: a 7\nlevel: b 7', 'same energy'],
    ['level: a 0\nlevel: b 9\nlevel: c 3\nshow: entropy', '"entropy" is not one of'],
    ['level: a 0\nlevel: ts 80\nlevel: c 3\ncatalyst: ts 90', 'must lie below 80'],
    ['level: a 0\nlevel: ts 80\nlevel: c 30\ncatalyst: ts 20', 'above both neighbouring levels'],
    ['level: a 0\nlevel: ts 80\nlevel: c 30\ncatalyst: zz 20', 'no level line declares'],
    ['level: a 0\nlevel: t1 80\nlevel: b 30\nlevel: t2 60\nlevel: c 5\ncatalyst: 20', 'must name the transition state'],
    [`${Array.from({ length: 10 }, (_, i) => `level: l${i} ${i % 2 ? 50 : 0}`).join('\n')}`, 'at most 9 levels'],
    ['level: r 0 a-label-that-is-one-enormously-long-unbroken-word\nlevel: p 5', 'too long'],
    ['level: a 0\nlevel: b 5\nunit: kilojoules per mole of reaction as written in the balanced equation', 'unit is too long'],
  ])('%s', async (content, expected) => {
    expect(await reason('energy', content)).toContain(expected);
  });
});
