import { describe, expect, it } from 'vitest';
import { draw, expectCleanLabels, reason, type Drawn } from '../cs/testing';

const ids = (drawn: Drawn, pattern: RegExp) => drawn.scene.strokes.filter((stroke) => pattern.test(stroke.id)).map((stroke) => stroke.id);
/** The notation line as text: `[Ar] 3d5`. */
const notation = (drawn: Drawn) => drawn.scene.labels.filter((label) => label.id.startsWith('term-')).map((label) => label.text!.replace(/[\^{}]/g, '')).join(' ');

describe('econfig', () => {
  it('draws the specimen: Fe3+ as [Ar] 3d5 with five parallel spins', async () => {
    const drawn = await draw('econfig', 'element: Fe\ncharge: 3+\nshow: both\ncore: noble');
    expect(notation(drawn)).toBe('[Ar] 3d5');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['Fe^{3+}', 'iron, Z = 26', '23 electrons', '5 unpaired electrons', '[Ar]', '3d']));
    expect(ids(drawn, /^3d-box-/)).toHaveLength(5);
    expect(ids(drawn, /^3d-up-/)).toHaveLength(5);
    expect(ids(drawn, /-down-/)).toHaveLength(0);
    expectCleanLabels(drawn);
  });

  it('fills boxes by Hund and Pauli: singles first, then pairs from the left', async () => {
    const drawn = await draw('econfig', 'element: Fe');
    expect(notation(drawn)).toBe('1s2 2s2 2p6 3s2 3p6 3d6 4s2');
    expect(ids(drawn, /^3d-up-/)).toEqual(['3d-up-0', '3d-up-1', '3d-up-2', '3d-up-3', '3d-up-4']);
    expect(ids(drawn, /^3d-down-/)).toEqual(['3d-down-0']);
    expect(ids(drawn, /^2p-(?:up|down)-/)).toHaveLength(6);
    expect(ids(drawn, /-box-/)).toHaveLength(15);
    expect(drawn.texts()).toContain('4 unpaired electrons');
    // An up arrow's head is above its tail; a down arrow's is below.
    expect(drawn.stroke('3d-up-0')!.d).toMatch(/^M (\S+) (\S+) L \1 (\S+) /);
    const [, , tail, head] = /^M (\S+) (\S+) L \S+ (\S+)/.exec(drawn.stroke('3d-up-0')!.d!)!.map(Number);
    expect(head!).toBeLessThan(tail!);
    expectCleanLabels(drawn);
  });

  it('counts unpaired electrons in words', async () => {
    expect((await draw('econfig', 'element: Ne')).texts()).toContain('no unpaired electrons');
    expect((await draw('econfig', 'element: Na')).texts()).toContain('1 unpaired electron');
    expect((await draw('econfig', 'element: Cr')).texts()).toContain('6 unpaired electrons');
    expect((await draw('econfig', 'element: Gd')).texts()).toContain('8 unpaired electrons');
  });

  it('shows what show: asks for, and what the alias implies when it is silent', async () => {
    const boxes = await draw('econfig', 'element: C\nshow: boxes');
    expect(notation(boxes)).toBe('');
    expect(ids(boxes, /-box-/)).toHaveLength(5);
    const line = await draw('econfig', 'element: C\nshow: notation');
    expect(notation(line)).toBe('1s2 2s2 2p2');
    expect(ids(line, /-box-/)).toHaveLength(0);
    expect(ids(await draw('orbital-diagram', 'element: C'), /-box-/)).toHaveLength(5);
    expect(notation(await draw('orbital-box', 'element: C'))).toBe('');
    expect(ids(await draw('electron-configuration', 'element: C'), /-box-/)).toHaveLength(0);
    const both = await draw('aufbau', 'element: C');
    expect(notation(both)).toBe('1s2 2s2 2p2');
    expect(ids(both, /-box-/)).toHaveLength(5);
    // An explicit show: wins over the alias.
    expect(notation(await draw('orbital-diagram', 'element: C\nshow: both'))).toBe('1s2 2s2 2p2');
  });

  it('abbreviates with the noble-gas core only when asked', async () => {
    expect(notation(await draw('econfig', 'element: Cu\ncore: noble'))).toBe('[Ar] 3d10 4s1');
    expect(notation(await draw('econfig', 'element: Cu\ncore: noble gas'))).toBe('[Ar] 3d10 4s1');
    expect(notation(await draw('econfig', 'element: Cu\ncore: full'))).toBe('1s2 2s2 2p6 3s2 3p6 3d10 4s1');
    expect(notation(await draw('econfig', 'element: He\ncore: noble'))).toBe('1s2');
  });

  it('accepts sloppy but unambiguous input', async () => {
    for (const content of ['element: Fe3+', 'element: Fe(III)', 'element: Fe³⁺', 'element:   IRON(iii) ion', 'element: fe\ncharge: +3', 'element: Z=26\ncharge: III', 'Element: Fe^{3+}\nCharge: 3+']) {
      const drawn = await draw('econfig', `${content}\ncore: noble`);
      expect(notation(drawn), content).toBe('[Ar] 3d5');
    }
    expect(notation(await draw('econfig', 'element: chloride\nshow: boxes + notation'))).toBe('1s2 2s2 2p6 3s2 3p6');
    expect(notation(await draw('econfig', 'element: O\ncharge: 2−'))).toBe('1s2 2s2 2p6');
  });

  it('wraps the heaviest element onto several rows with clean labels and marks it predicted', async () => {
    const drawn = await draw('econfig', 'element: Og');
    expect(ids(drawn, /-box-/)).toHaveLength(59);
    expect(ids(drawn, /-(?:up|down)-/)).toHaveLength(118);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['no unpaired electrons', 'predicted, not measured']));
    expectCleanLabels(drawn);
    expectCleanLabels(await draw('econfig', 'element: Lr\ncore: noble'));
    expectCleanLabels(await draw('electron-configuration', 'element: Au'));
  });

  it.each([
    ['charge: 3+', 'missing element'],
    ['element: unobtainium', 'is not a symbol, a name or Z=number'],
    ['element: Z=119', 'Z must be 1 to 118'],
    ['element: O2', '"2" is not a charge'],
    ['element: V+', 'V+ does not follow the rule'],
    ['element: Fe\ncharge: 30', 'no electrons left'],
    ['element: Fe\ncharge: lots', 'is not a charge such as 3+ or 2-'],
    ['element: Fe3+\ncharge: 2+', 'state two different charges'],
    ['element: Fe\ncharge: 2-', 'anions of d- and f-block elements'],
    ['element: O\ncharge: 3-', 'room for only 2 more electrons'],
    ['element: Rf\ncharge: 4+', 'beyond Lr'],
    ['element: Fe\nshow: spectrum', '"spectrum" is not one of'],
    ['element: Fe\ncore: argon', 'is not noble or full'],
    ['element: Fe\nelement: Cu', 'element is stated twice'],
  ])('refuses %s', async (content, expected) => {
    expect(await reason('econfig', content)).toContain(expected);
  });
});

describe('bohr', () => {
  const electrons = (drawn: Drawn) => {
    const perShell: number[] = [];
    for (const id of ids(drawn, /^electron-/)) {
      const shell = Number(id.split('-')[1]);
      perShell[shell - 1] = (perShell[shell - 1] ?? 0) + 1;
    }
    return perShell;
  };

  it('draws the specimen: sodium-23 with 2, 8, 1 and twelve neutrons', async () => {
    const drawn = await draw('bohr', 'element: Na\nmass: 23');
    expect(electrons(drawn)).toEqual([2, 8, 1]);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['Na', 'sodium, Z = 11', 'A = 23', '11p^{+}', '12n^{0}', '11 electrons: 2, 8, 1']));
    expectCleanLabels(drawn);
  });

  it.each([
    ['element: H', [1]], ['element: He', [2]], ['element: C', [2, 4]], ['element: Cl', [2, 8, 7]], ['element: K', [2, 8, 8, 1]],
    ['element: Ca', [2, 8, 8, 2]], ['element: Fe', [2, 8, 14, 2]], ['element: Cu', [2, 8, 18, 1]], ['element: Kr', [2, 8, 18, 8]],
    ['element: Na+', [2, 8]], ['element: Cl-', [2, 8, 8]], ['element: calcium\ncharge: 2+', [2, 8, 8]], ['element: Fe3+', [2, 8, 13]],
    ['element: Z=53', [2, 8, 18, 18, 7]], ['element: U', [2, 8, 18, 32, 21, 9, 2]], ['element: Og', [2, 8, 18, 32, 32, 18, 8]],
  ])('%s has shells %j, one dot per electron', async (content, shells) => {
    const drawn = await draw('bohr', content);
    expect(electrons(drawn)).toEqual(shells);
    expect(ids(drawn, /^shell-/)).toHaveLength(shells.length);
    expectCleanLabels(drawn);
  });

  it('spaces electrons evenly on concentric shells', async () => {
    const drawn = await draw('bohr', 'element: Ne');
    const [cx, cy, r] = drawn.stroke('shell-2')!.points as [number, number, number];
    expect(drawn.stroke('shell-1')!.points.slice(0, 2)).toEqual([cx, cy]);
    const angles = ids(drawn, /^electron-2-/).map((id) => {
      const [x, y] = drawn.stroke(id)!.points as [number, number];
      expect(Math.hypot(x - cx, y - cy)).toBeCloseTo(r, 6);
      return Math.atan2(y - cy, x - cx);
    });
    const steps = angles.slice(1).map((angle, i) => (angle - angles[i]! + 2 * Math.PI) % (2 * Math.PI));
    for (const step of steps) expect(step).toBeCloseTo(Math.PI / 4, 6);
  });

  it('reads the mass number from the element or from mass:, and shows neutrons only when it is known', async () => {
    expect((await draw('bohr', 'element: C-14')).texts()).toEqual(expect.arrayContaining(['6p^{+}', '8n^{0}', 'A = 14']));
    expect((await draw('bohr', 'element: uranium-238')).texts()).toEqual(expect.arrayContaining(['92p^{+}', '146n^{0}']));
    expect((await draw('bohr-model', 'element: H\nmass: 1')).texts()).toEqual(expect.arrayContaining(['1p^{+}', '0n^{0}', '1 electron: 1']));
    expect((await draw('shell-model', 'element: Mg\nmass: A = 24')).texts()).toContain('12n^{0}');
    expect((await draw('bohr', 'element: Mg')).texts().some((text) => /n\^/.test(text))).toBe(false);
  });

  it.each([
    ['mass: 23', 'missing element'],
    ['element: unobtainium', 'is not a symbol'],
    ['element: Na\nmass: 22.99', 'is not a mass number'],
    ['element: Na\nmass: heavy', 'is not a mass number'],
    ['element: Na\nmass: 9', 'mass number 9 is impossible for Z = 11'],
    ['element: C-14\nmass: 12', 'two different mass numbers'],
    ['element: H+', 'no electrons left'],
    ['element: V+', 'does not follow the rule'],
  ])('refuses %s', async (content, expected) => {
    expect(await reason('bohr', content)).toContain(expected);
  });
});
