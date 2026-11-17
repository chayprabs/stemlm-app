/**
 * Triangle solver. Index i names vertex i, its angle, and the side opposite it (the a–A convention).
 * The figure is drawn from the solved triangle, so impossible or ambiguous data is refused here with
 * the reason a teacher would give, never drawn "roughly".
 */
import { fmt, fmtDegrees } from './format';

export type Triple<T> = [T, T, T];
export type Method = 'SSS' | 'SAS' | 'ASA' | 'AAS' | 'SSA' | 'AAA';

export interface TriangleInput {
  sides: Triple<number | undefined>;
  /** Degrees. */
  angles: Triple<number | undefined>;
  /** SSA only: whether the angle opposite the other given side is acute or obtuse. */
  ssaCase?: 'acute' | 'obtuse';
  /** Names used in reasons: sides then angles. */
  names?: { sides: Triple<string>; angles: Triple<string> };
}

export interface SolvedTriangle {
  ok: true;
  sides: Triple<number>;
  angles: Triple<number>;
  method: Method;
  /** True when only the shape is known (angles alone): side lengths are relative, not to be printed. */
  scaleFree: boolean;
}

export type TriangleSolution = SolvedTriangle | { ok: false; reason: string };

const RAD = Math.PI / 180;
/** Given values are usually rounded; a redundant one may differ from the computed value by this much. */
const SIDE_TOLERANCE = 0.02;
const ANGLE_TOLERANCE = 1;
const DEFAULT_NAMES = { sides: ['a', 'b', 'c'] as Triple<string>, angles: ['A', 'B', 'C'] as Triple<string> };

const no = (reason: string): TriangleSolution => ({ ok: false, reason });
const clampUnit = (value: number) => Math.min(1, Math.max(-1, value));

function anglesFromSides(sides: Triple<number>): Triple<number> {
  const [a, b, c] = sides;
  const A = Math.acos(clampUnit((b * b + c * c - a * a) / (2 * b * c))) / RAD;
  const B = Math.acos(clampUnit((a * a + c * c - b * b) / (2 * a * c))) / RAD;
  return [A, B, 180 - A - B];
}

export function solveTriangle(input: TriangleInput): TriangleSolution {
  const names = input.names ?? DEFAULT_NAMES;
  const { sides, angles } = input;
  const sideIdx = [0, 1, 2].filter((i) => sides[i] !== undefined);
  const angleIdx = [0, 1, 2].filter((i) => angles[i] !== undefined);
  for (const i of sideIdx) {
    if (!(sides[i]! > 0) || !Number.isFinite(sides[i]!)) return no(`side ${names.sides[i]} must be a positive length`);
  }
  for (const i of angleIdx) {
    if (!(angles[i]! > 0 && angles[i]! < 180)) return no(`angle ${names.angles[i]} must lie between 0° and 180°`);
  }
  const angleSum = angleIdx.reduce((sum, i) => sum + angles[i]!, 0);
  if (angleIdx.length === 3 && Math.abs(angleSum - 180) > 0.5) {
    return no(`the angles sum to ${fmtDegrees(angleSum)}, not 180°`);
  }
  if (angleIdx.length === 2 && angleSum >= 180) {
    return no(`${names.angles[angleIdx[0]!]} + ${names.angles[angleIdx[1]!]} = ${fmtDegrees(angleSum)} leaves no third angle`);
  }

  const sideClash = (i: number, computed: number, basis: string): TriangleSolution | null => {
    const given = sides[i];
    if (given === undefined || Math.abs(given - computed) <= SIDE_TOLERANCE * Math.max(given, computed)) return null;
    return no(`${names.sides[i]} = ${fmt(given)} contradicts ${basis} (it would be ${fmt(computed)})`);
  };
  const angleClash = (i: number, computed: number, basis: string): TriangleSolution | null => {
    const given = angles[i];
    if (given === undefined || Math.abs(given - computed) <= ANGLE_TOLERANCE) return null;
    return no(`${names.angles[i]} = ${fmtDegrees(given)} contradicts ${basis} (it would be ${fmtDegrees(computed)})`);
  };

  if (sideIdx.length === 3) {
    const s = sides as Triple<number>;
    const longest = [0, 1, 2].reduce((best, i) => (s[i]! > s[best]! ? i : best), 0);
    const others = [0, 1, 2].filter((i) => i !== longest);
    const reach = s[others[0]!]! + s[others[1]!]!;
    if (reach <= s[longest]! * (1 + 1e-12)) {
      const relation = Math.abs(reach - s[longest]!) <= 1e-9 * reach ? '=' : '<';
      return no(`triangle inequality fails: ${names.sides[others[0]!]} + ${names.sides[others[1]!]} ${relation} ${names.sides[longest]} (${fmt(s[others[0]!]!)} + ${fmt(s[others[1]!]!)} ${relation} ${fmt(s[longest]!)})`);
    }
    const solved = anglesFromSides(s);
    for (const i of angleIdx) {
      const clash = angleClash(i, solved[i]!, 'the three sides');
      if (clash) return clash;
    }
    return { ok: true, sides: s, angles: solved, method: 'SSS', scaleFree: false };
  }

  if (angleIdx.length >= 2) {
    const full = [...angles] as Triple<number | undefined>;
    if (angleIdx.length === 2) {
      const missing = [0, 1, 2].find((i) => angles[i] === undefined)!;
      full[missing] = 180 - angleSum;
    }
    const all = full as Triple<number>;
    const sines = all.map((angle) => Math.sin(angle * RAD)) as Triple<number>;
    if (!sideIdx.length) {
      return { ok: true, sides: sines, angles: all, method: 'AAA', scaleFree: true };
    }
    const reference = sideIdx[0]!;
    const ratio = sides[reference]! / sines[reference]!;
    const solved = sines.map((sine) => sine * ratio) as Triple<number>;
    solved[reference] = sides[reference]!;
    for (const i of sideIdx.slice(1)) {
      const clash = sideClash(i, solved[i]!, `${names.sides[reference]} and the angles`);
      if (clash) return clash;
    }
    // ASA: the given side joins the two given angles, i.e. it is opposite the one that was not given.
    const included = angleIdx.length === 2 && angles[reference] === undefined;
    return { ok: true, sides: solved, angles: all, method: included ? 'ASA' : 'AAS', scaleFree: false };
  }

  if (sideIdx.length === 2 && angleIdx.length === 1) {
    const unknown = [0, 1, 2].find((i) => sides[i] === undefined)!;
    const g = angleIdx[0]!;
    const gamma = angles[g]!;
    if (g === unknown) {
      const [p, q] = [sides[sideIdx[0]!]!, sides[sideIdx[1]!]!];
      const third = Math.sqrt(p * p + q * q - 2 * p * q * Math.cos(gamma * RAD));
      const solved = [...sides] as Triple<number | undefined>;
      solved[unknown] = third;
      const s = solved as Triple<number>;
      const computed = anglesFromSides(s);
      computed[g] = gamma;
      return { ok: true, sides: s, angles: computed, method: 'SAS', scaleFree: false };
    }
    // SSA: the angle faces one of the two given sides.
    const o = [0, 1, 2].find((i) => i !== g && i !== unknown)!;
    const facing = sides[g]!;
    const other = sides[o]!;
    const sine = (other * Math.sin(gamma * RAD)) / facing;
    const [G, O, sg, so] = [names.angles[g], names.angles[o], names.sides[g], names.sides[o]];
    if (sine > 1 + 1e-9) {
      return no(`no such triangle: ${sg} = ${fmt(facing)} cannot reach the opposite side (it needs at least ${so}·sin ${G} = ${fmt(other * Math.sin(gamma * RAD))})`);
    }
    const acute = Math.asin(clampUnit(sine)) / RAD;
    const right = Math.abs(sine - 1) <= 1e-9;
    const candidates = (right ? [90] : [acute, 180 - acute]).filter((angle) => gamma + angle < 180 - 1e-9);
    if (!candidates.length) {
      return no(`no such triangle: with ${G} = ${fmtDegrees(gamma)}, side ${sg} must be longer than ${so}`);
    }
    let chosen = candidates[0]!;
    if (candidates.length === 2) {
      if (!input.ssaCase) {
        return no(`ambiguous case (SSA): ${sg} = ${fmt(facing)}, ${so} = ${fmt(other)}, ${G} = ${fmtDegrees(gamma)} fit two triangles (${O} = ${fmtDegrees(candidates[0]!)} or ${fmtDegrees(candidates[1]!)}); add case: acute or case: obtuse for angle ${O}`);
      }
      chosen = input.ssaCase === 'acute' ? candidates[0]! : candidates[1]!;
    } else if (input.ssaCase && (input.ssaCase === 'obtuse') !== chosen > 90) {
      return no(`case: ${input.ssaCase} is impossible here: the only triangle has ${O} = ${fmtDegrees(chosen)}`);
    }
    const solvedAngles = [0, 0, 0] as Triple<number>;
    solvedAngles[g] = gamma;
    solvedAngles[o] = chosen;
    solvedAngles[unknown] = 180 - gamma - chosen;
    const solvedSides = [...sides] as Triple<number | undefined>;
    solvedSides[unknown] = (facing * Math.sin(solvedAngles[unknown]! * RAD)) / Math.sin(gamma * RAD);
    return { ok: true, sides: solvedSides as Triple<number>, angles: solvedAngles, method: 'SSA', scaleFree: false };
  }

  if (sideIdx.length === 2) return no('two sides alone do not fix a triangle: give the third side or an angle');
  if (sideIdx.length === 1) return no('one side needs two angles, or two more facts, to fix a triangle');
  return no('not enough data: give three of the sides and angles of the triangle');
}
