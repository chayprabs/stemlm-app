import { describe, expect, it } from 'vitest';
import { draw, expectCleanLabels, reason, type Drawn } from '../cs/testing';

const centre = (drawn: Drawn, id: string) => drawn.stroke(id)!.points as [number, number, number];

/** Drawn units per metre along x and along y, measured from the launch, apex and landing dots. */
function scales(drawn: Drawn, range: number, rise: number): { sx: number; sy: number } {
  const [launch, apex, landing] = ['launch', 'apex', 'landing'].map((id) => centre(drawn, id));
  return { sx: (landing![0] - launch![0]) / range, sy: (launch![1] - apex![1]) / rise };
}

describe('projectile: computed kinematics', () => {
  it('computes range, maximum height and flight time for a ground launch', async () => {
    // vx = 20 cos 35° = 16.383, vy = 20 sin 35° = 11.472; T = 2 vy / g = 2.339 s; R = vx T = 38.32 m; H = vy² / 2g = 6.708 m.
    const drawn = await draw('projectile', 'v0: 20\nangle: 35\nshow: range, hmax, time');
    expect(drawn.texts()).toEqual(expect.arrayContaining([
      'R = 38.3 m', 'h_max = 6.71 m', 't = 2.34 s', 'v_0x = 16.4 m/s', 'v_0y = 11.5 m/s', 'v_0 = 20 m/s at 35°', 'g = 9.81 m/s^2', '35°', 'v_0', 'v_0x', 'v_0y',
    ]));
    expectCleanLabels(drawn);
  });

  it('solves the quadratic for a launch from a height', async () => {
    // vy = 7.5, vx = 12.990; T = (7.5 + √(7.5² + 2·9.8·20)) / 9.8 = 2.926 s; R = 38.01 m; H = 20 + 7.5² / 19.6 = 22.87 m.
    const drawn = await draw('projectile', 'v0: 15\nangle: 30\nh0: 20\ng: 9.8\nshow: range, hmax, time');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['R = 38.0 m', 'h_max = 22.9 m', 't = 2.93 s', 'h_0 = 20 m', 'g = 9.8 m/s^2']));
    expectCleanLabels(drawn);
  });

  it('handles a horizontal launch: no vertical component, the launch height is the maximum', async () => {
    // T = √(2·45 / 9.81) = 3.029 s; R = 8 T = 24.23 m.
    const drawn = await draw('projectile', 'v0: 8\nangle: 0\nh0: 45\nshow: range, time, hmax');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['R = 24.2 m', 't = 3.03 s', 'h_max = 45.0 m']));
    expect(drawn.texts().some((text) => text.startsWith('v_0x') || text.startsWith('v_0y'))).toBe(false);
    expect(drawn.stroke('apex')).toBeUndefined();
    expectCleanLabels(drawn);
  });

  it('handles a downward launch in feet, with g defaulting to 32.2 ft/s²', async () => {
    // vy = −10.261, vx = 28.191; T = (−10.261 + √(10.261² + 2·32.2·60)) / 32.2 = 1.638 s; R = 46.17 ft.
    const drawn = await draw('projectile', 'v0: 30 ft/s\nangle: 20° below the horizontal\nh0: 60 ft\nshow: range, time');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['R = 46.2 ft', 't = 1.64 s', 'v_0y = −10.3 ft/s', 'v_0x = 28.2 ft/s', 'g = 32.2 ft/s^2', 'v_0 = 30 ft/s at −20°', '20°']));
    expectCleanLabels(drawn);
  });

  it('annotates nothing that was not asked for', async () => {
    const drawn = await draw('projectile', 'v0: 12\nangle: 45');
    expect(drawn.texts().some((text) => /^(?:R|h_max|t) =/.test(text))).toBe(false);
    expect(drawn.stroke('range')).toBeUndefined();
    expect(drawn.stroke('trajectory')?.kind).toBe('path');
  });
});

describe('projectile: drawn to scale', () => {
  it('uses one scale on both axes where the arc stays legible', async () => {
    for (const [content, range, rise] of [
      ['v0: 20\nangle: 35', 38.3166, 6.7075],
      ['v0: 18.5\nangle: 60', 30.2136, 13.0829],
      ['v0: 25\nangle: 75', 31.8552, 29.7217],
      ['v0: 30\nangle: 88', 6.3997, 45.8157],
    ] as const) {
      const drawn = await draw('projectile', content);
      const { sx, sy } = scales(drawn, range, rise);
      expect(sy / sx, content).toBeCloseTo(1, 3);
      expect(drawn.texts().some((text) => /scale ×/.test(text)), content).toBe(false);
    }
  });

  it('stretches a flat arc vertically by a round factor and says so on the figure', async () => {
    // R = 40² sin 16° / 9.81 = 44.96 m, H = (40 sin 8°)² / 19.62 = 1.580 m.
    const drawn = await draw('projectile', 'v0: 40\nangle: 8\nshow: range, hmax, time');
    const { sx, sy } = scales(drawn, 44.9575, 1.5796);
    expect(sy / sx).toBeCloseTo(4, 2);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['vertical scale ×4', 'R = 45.0 m', 'h_max = 1.58 m', '8°']));
    expectCleanLabels(drawn);
  });

  it('stretches a needle-thin arc horizontally', async () => {
    const drawn = await draw('projectile', 'v0: 30\nangle: 89.5\nshow: hmax');
    expect(drawn.texts().some((text) => /^horizontal scale ×\d+$/.test(text))).toBe(true);
    expectCleanLabels(drawn);
  });

  it('puts a marked instant where the projectile is and points its velocity along the path', async () => {
    const drawn = await draw('projectile', 'v0: 20\nangle: 35\nmark: 0.5, 1.8');
    const { sx } = scales(drawn, 38.3166, 6.7075);
    const launch = centre(drawn, 'launch');
    // x = vx t; y = vy t − g t² / 2.
    const first = centre(drawn, 'mark-0');
    expect((first[0] - launch[0]) / sx).toBeCloseTo(16.383 * 0.5, 2);
    expect((launch[1] - first[1]) / sx).toBeCloseTo(11.4715 * 0.5 - 4.905 * 0.25, 2);
    const rising = drawn.stroke('mark-velocity-0')!.points;
    const falling = drawn.stroke('mark-velocity-1')!.points;
    expect(rising[3]!).toBeLessThan(rising[1]!);
    expect(falling[3]!).toBeGreaterThan(falling[1]!);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['t = 0.5 s', 't = 1.8 s']));
    expectCleanLabels(drawn);
  });

  it('keeps every label clear in crowded figures', async () => {
    for (const content of [
      'v0: 25 m/s\nangle: 75 deg\nshow: all\nmark: 2, 4',
      'v0: 15 m/s\nangle: 30°\nh0: 20 m\ng: 9.8\nshow: range, hmax, time\nmark: 1.0\nmark: 2.5',
      'v0: 30\nangle: 88\nshow: range, hmax, time',
      'v0: 5\nangle: -60\nh0: 100\nshow: all',
    ]) expectCleanLabels(await draw('projectile', content));
  });
});

describe('projectile: liberal input', () => {
  it('reads units, degree signs, radians, LaTeX and spelled-out options', async () => {
    const expected = ['R = 38.3 m', 'h_max = 6.71 m', 't = 2.34 s'];
    for (const content of [
      'v0: 20 m/s\nangle: 35°\nh0: 0 m\ng: 9.81 m/s²\nshow: range, max height, time of flight',
      'v0: 20m/s\nangle: 35 deg\ng: 9.81 m/s^2\nshow: R, h_max, t',
      'v0: 20\\,\\text{m/s}\nangle: 35^\\circ\nshow: all',
      'v0: 20 m s⁻¹\nangle: 35 degrees above the horizontal\nshow: Range; Maximum Height; Time',
      'V0: 20.0\nAngle: 0.610865 rad\nshow: range and hmax and time',
    ]) {
      const drawn = await draw('projectile-motion', content);
      expect(drawn.texts(), content).toEqual(expect.arrayContaining(expected));
    }
  });

  it('reads marks as a list, with or without the unit', async () => {
    const drawn = await draw('trajectory', 'v0: 20\nangle: 35\nmark:\n  - 0.5 s\n  - 1.25s');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['t = 0.5 s', 't = 1.25 s']));
  });
});

describe('projectile: refusals', () => {
  it.each([
    ['v0: 20', 'missing angle'],
    ['angle: 35', 'missing v0'],
    ['v0: fast\nangle: 35', 'v0: "fast" is not a number'],
    ['v0: 20\nangle: steep', 'angle: "steep" is not a number'],
    ['v0: 0\nangle: 35', 'v0 must be a positive speed'],
    ['v0: -5\nangle: 35', 'v0 must be a positive speed'],
    ['v0: 20\nangle: 90', 'vertical launch has no range'],
    ['v0: 20\nangle: 120', 'between −90° and 90°'],
    ['v0: 20\nangle: 0', 'never leaves the ground'],
    ['v0: 20\nangle: -10', 'never leaves the ground'],
    ['v0: 20\nangle: 35\nh0: -3', 'cannot be negative'],
    ['v0: 20\nangle: 35\ng: 0', 'g must be positive'],
    ['v0: 20 km/h\nangle: 35', 'the unit "km/h" is not understood'],
    ['v0: 20 m/s\nangle: 35\nh0: 10 ft', 'mixes metres and feet'],
    ['v0: 20\nangle: 35 gradians', 'the unit "gradians" is not understood'],
    ['v0: 20\nangle: 35\nmark: 9', 'mark 9 s is not during the flight, which lasts 2.34 s'],
    ['v0: 20\nangle: 35\nmark: soon', 'is not a time in seconds'],
    ['v0: 20\nangle: 35\nmark: 2.33', 'too close to the landing'],
    ['v0: 20\nangle: 35\nmark: 0.2, 0.4, 0.6, 0.8, 1.0', 'at most 4 instants'],
    ['v0: 20\nangle: 35\nshow: drag', '"drag" is not one of'],
    ['v0: 20\nv0: 30\nangle: 35', 'v0 is stated twice'],
  ])('%s', async (content, expected) => {
    expect(await reason('projectile', content)).toContain(expected);
  });
});
