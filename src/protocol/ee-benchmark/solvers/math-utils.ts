/**
 * Math utilities for the EE benchmark solver module.
 * Pure numeric computation — no external dependencies.
 */

import type { Complex, ABCDSection } from '../spec-types';

export type { Complex };

// ---------------------------------------------------------------------------
// Complex arithmetic helpers
// ---------------------------------------------------------------------------

export function cx(re: number, im = 0): Complex {
  return { re, im };
}

export function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function cDiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

export function cAbs(a: Complex): number {
  return Math.sqrt(a.re * a.re + a.im * a.im);
}

export function cAngle(a: Complex): number {
  return Math.atan2(a.im, a.re);
}

export function cConj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

export function cInv(a: Complex): Complex {
  return cDiv(cx(1), a);
}

export function cScale(a: Complex, s: number): Complex {
  return { re: a.re * s, im: a.im * s };
}

export function cNeg(a: Complex): Complex {
  return { re: -a.re, im: -a.im };
}

/** Parallel combination of two complex impedances: Z1‖Z2 */
export function cParallel(Z1: Complex, Z2: Complex): Complex {
  return cDiv(cMul(Z1, Z2), cAdd(Z1, Z2));
}

/** Polar → Complex */
export function polar(mag: number, angleRad: number): Complex {
  return { re: mag * Math.cos(angleRad), im: mag * Math.sin(angleRad) };
}

/** Parallel of two real resistances */
export function parallel(R1: number, R2: number): number {
  if (R1 === 0 || R2 === 0) return 0;
  return (R1 * R2) / (R1 + R2);
}

// ---------------------------------------------------------------------------
// Real Gaussian elimination — solves A·x = b
// ---------------------------------------------------------------------------

export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col]?.[col] ?? 0);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(M[row]?.[col] ?? 0);
      if (v > maxVal) { maxVal = v; pivotRow = row; }
    }
    if (maxVal < 1e-12) throw new Error(`Singular matrix at column ${col}`);
    const tmp = M[col];
    M[col] = M[pivotRow] as number[];
    M[pivotRow] = tmp as number[];
    const pivotVal = M[col]?.[col] ?? 1;
    for (let row = col + 1; row < n; row++) {
      const factor = (M[row]?.[col] ?? 0) / pivotVal;
      for (let k = col; k <= n; k++) {
        (M[row] as number[])[k] = (M[row]?.[k] ?? 0) - factor * (M[col]?.[k] ?? 0);
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i]?.[n] ?? 0;
    for (let j = i + 1; j < n; j++) {
      sum -= (M[i]?.[j] ?? 0) * (x[j] ?? 0);
    }
    x[i] = sum / (M[i]?.[i] ?? 1);
  }
  return x;
}

// ---------------------------------------------------------------------------
// Complex Gaussian elimination
// ---------------------------------------------------------------------------

export function solveLinearSystemC(A: Complex[][], b: Complex[]): Complex[] {
  const n = b.length;
  const M: Complex[][] = A.map((row, i) => [...row, b[i] ?? cx(0)]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxMag = cAbs(M[col]?.[col] ?? cx(0));
    for (let row = col + 1; row < n; row++) {
      const mag = cAbs(M[row]?.[col] ?? cx(0));
      if (mag > maxMag) { maxMag = mag; pivotRow = row; }
    }
    if (maxMag < 1e-15) throw new Error(`Singular complex matrix at column ${col}`);
    const tmp = M[col];
    M[col] = M[pivotRow] as Complex[];
    M[pivotRow] = tmp as Complex[];
    const pivotVal = M[col]?.[col] ?? cx(1);
    for (let row = col + 1; row < n; row++) {
      const factor = cDiv(M[row]?.[col] ?? cx(0), pivotVal);
      for (let k = col; k <= n; k++) {
        (M[row] as Complex[])[k] = cSub(M[row]?.[k] ?? cx(0), cMul(factor, M[col]?.[k] ?? cx(0)));
      }
    }
  }

  const x: Complex[] = new Array<Complex>(n).fill(cx(0));
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i]?.[n] ?? cx(0);
    for (let j = i + 1; j < n; j++) {
      sum = cSub(sum, cMul(M[i]?.[j] ?? cx(0), x[j] ?? cx(0)));
    }
    x[i] = cDiv(sum, M[i]?.[i] ?? cx(1));
  }
  return x;
}

// ---------------------------------------------------------------------------
// 2×2 real Cramer shortcut
// ---------------------------------------------------------------------------

export function solve2x2(a11: number, a12: number, a21: number, a22: number,
                          b1: number, b2: number): [number, number] {
  const det = a11 * a22 - a12 * a21;
  return [(b1 * a22 - b2 * a12) / det, (a11 * b2 - a21 * b1) / det];
}

// ---------------------------------------------------------------------------
// RLC characteristic roots
// ---------------------------------------------------------------------------

export interface RlcRoots {
  alpha: number;
  omega0: number;
  damping: 'overdamped' | 'underdamped' | 'critically-damped';
  s1?: number;
  s2?: number;
  omegaD?: number;
}

export function rlcRoots(R: number, L: number, C: number): RlcRoots {
  const alpha = R / (2 * L);
  const omega0 = 1 / Math.sqrt(L * C);
  const disc = alpha * alpha - omega0 * omega0;
  if (disc > 1e-10) {
    return { alpha, omega0, damping: 'overdamped', s1: -alpha + Math.sqrt(disc), s2: -alpha - Math.sqrt(disc) };
  } else if (disc < -1e-10) {
    return { alpha, omega0, damping: 'underdamped', omegaD: Math.sqrt(-disc) };
  }
  return { alpha, omega0, damping: 'critically-damped', s1: -alpha, s2: -alpha };
}

// ---------------------------------------------------------------------------
// 2×2 complex matrix type and operations
// ---------------------------------------------------------------------------

export type Mat2C = [[Complex, Complex], [Complex, Complex]];

export function mat2cMul(A: Mat2C, B: Mat2C): Mat2C {
  return [
    [
      cAdd(cMul(A[0][0], B[0][0]), cMul(A[0][1], B[1][0])),
      cAdd(cMul(A[0][0], B[0][1]), cMul(A[0][1], B[1][1])),
    ],
    [
      cAdd(cMul(A[1][0], B[0][0]), cMul(A[1][1], B[1][0])),
      cAdd(cMul(A[1][0], B[0][1]), cMul(A[1][1], B[1][1])),
    ],
  ];
}

export function abcdSeriesZ(Z: Complex): Mat2C {
  return [[cx(1), Z], [cx(0), cx(1)]];
}

export function abcdShuntY(Y: Complex): Mat2C {
  return [[cx(1), cx(0)], [Y, cx(1)]];
}

/** Convert an ABCDSection to its ABCD matrix given omega. */
export function abcdSectionMatrix(s: ABCDSection, omega: number): Mat2C {
  switch (s.type) {
    case 'series-Z':
      return abcdSeriesZ(s.Z);
    case 'shunt-Y':
      return abcdShuntY(s.Y);
    case 'series-RL': {
      const Z: Complex = { re: s.R, im: omega * s.L };
      return abcdSeriesZ(Z);
    }
    case 'series-RC': {
      const Z: Complex = { re: s.R, im: -1 / (omega * s.C) };
      return abcdSeriesZ(Z);
    }
  }
}

/** Impedance of an ABCDSection (only valid for series sections). */
export function sectionImpedance(s: ABCDSection, omega: number): Complex {
  switch (s.type) {
    case 'series-Z': return s.Z;
    case 'shunt-Y': return cInv(s.Y);
    case 'series-RL': return { re: s.R, im: omega * s.L };
    case 'series-RC': return { re: s.R, im: -1 / (omega * s.C) };
  }
}

// ---------------------------------------------------------------------------
// Bode helpers
// ---------------------------------------------------------------------------

export function bodeMag(K: number, zeros: number[], poles: number[], omega: number): number {
  const s: Complex = { re: 0, im: omega };
  let num: Complex = cx(K);
  for (const z of zeros) {
    num = cMul(num, cSub(s, cx(-Math.abs(z))));
  }
  let den: Complex = cx(1);
  for (const p of poles) {
    const pVal = p === 0 ? cx(0) : cx(-Math.abs(p));
    den = cMul(den, cSub(s, pVal));
  }
  return cAbs(cDiv(num, den));
}

export function bodePhase(zeros: number[], poles: number[], omega: number): number {
  let phase = 0;
  for (const z of zeros) {
    phase += Math.atan2(omega, Math.abs(z)) * (180 / Math.PI);
  }
  for (const p of poles) {
    if (p === 0) { phase -= 90; }
    else { phase -= Math.atan2(omega, Math.abs(p)) * (180 / Math.PI); }
  }
  return phase;
}

// ---------------------------------------------------------------------------
// Root locus helpers
// ---------------------------------------------------------------------------

export function rootLocusCentroid(zeros: number[], poles: number[]): number {
  const sumPoles = poles.reduce((s, p) => s - p, 0);
  const sumZeros = zeros.reduce((s, z) => s - z, 0);
  const n = poles.length - zeros.length;
  return n === 0 ? NaN : (sumPoles - sumZeros) / n;
}

export function rootLocusAsymptoteAngles(nPoles: number, nZeros: number): number[] {
  const n = nPoles - nZeros;
  if (n <= 0) return [];
  const angles: number[] = [];
  for (let k = 0; k < n; k++) angles.push(((2 * k + 1) * 180) / n);
  return angles;
}

// ---------------------------------------------------------------------------
// Power-flow Ybus builder
// ---------------------------------------------------------------------------

export interface BusAdmittance { g: number; b: number }

export function buildYbus3(y12: BusAdmittance, y13: BusAdmittance, y23: BusAdmittance): Complex[][] {
  const Y12: Complex = { re: y12.g, im: y12.b };
  const Y13: Complex = { re: y13.g, im: y13.b };
  const Y23: Complex = { re: y23.g, im: y23.b };
  return [
    [cAdd(Y12, Y13), cNeg(Y12), cNeg(Y13)],
    [cNeg(Y12), cAdd(Y12, Y23), cNeg(Y23)],
    [cNeg(Y13), cNeg(Y23), cAdd(Y13, Y23)],
  ];
}

/** Build Ybus from LineEntry list. Buses are 1-indexed in entries; returned matrix is 0-indexed. */
export function buildYbusN(
  nBuses: number,
  lines: Array<{ from: number; to: number; y: Complex }>,
  shunts?: Record<number, Complex>,
): Complex[][] {
  const Y: Complex[][] = Array.from({ length: nBuses }, () =>
    new Array<Complex>(nBuses).fill(cx(0))
  );
  for (const line of lines) {
    const i = line.from - 1;
    const j = line.to - 1;
    if (i < 0 || j < 0 || i >= nBuses || j >= nBuses) continue;
    (Y[i] as Complex[])[i] = cAdd((Y[i] as Complex[])[i] ?? cx(0), line.y);
    (Y[j] as Complex[])[j] = cAdd((Y[j] as Complex[])[j] ?? cx(0), line.y);
    (Y[i] as Complex[])[j] = cSub((Y[i] as Complex[])[j] ?? cx(0), line.y);
    (Y[j] as Complex[])[i] = cSub((Y[j] as Complex[])[i] ?? cx(0), line.y);
  }
  if (shunts) {
    for (const [busStr, y] of Object.entries(shunts)) {
      const i = Number(busStr) - 1;
      if (i >= 0 && i < nBuses) {
        (Y[i] as Complex[])[i] = cAdd((Y[i] as Complex[])[i] ?? cx(0), y);
      }
    }
  }
  return Y;
}

/** One G-S update for a PQ bus (0-indexed). */
export function gsUpdatePQ(
  V_k: Complex[], Y: Complex[][], bus: number, P: number, Q: number
): Complex {
  const Yii = Y[bus]?.[bus] ?? cx(1);
  const Vi_conj = cConj(V_k[bus] ?? cx(1));
  const S_conj: Complex = { re: P, im: -Q };
  const I_inj = cDiv(S_conj, Vi_conj);
  let offDiag: Complex = cx(0);
  for (let j = 0; j < V_k.length; j++) {
    if (j === bus) continue;
    offDiag = cAdd(offDiag, cMul(Y[bus]?.[j] ?? cx(0), V_k[j] ?? cx(1)));
  }
  return cDiv(cSub(I_inj, offDiag), Yii);
}

/** Compute P injection at bus i (0-indexed). */
export function calcPinj(V: Complex[], Y: Complex[][], bus: number): number {
  let P = 0;
  const Vi = V[bus] ?? cx(1);
  for (let j = 0; j < V.length; j++) {
    const Yij = Y[bus]?.[j] ?? cx(0);
    const Vj = V[j] ?? cx(1);
    const th = cAngle(Vi) - cAngle(Vj);
    P += cAbs(Vi) * cAbs(Vj) * (Yij.re * Math.cos(th) + Yij.im * Math.sin(th));
  }
  return P;
}

/** Compute Q injection at bus i (0-indexed). */
export function calcQinj(V: Complex[], Y: Complex[][], bus: number): number {
  let Q = 0;
  const Vi = V[bus] ?? cx(1);
  for (let j = 0; j < V.length; j++) {
    const Yij = Y[bus]?.[j] ?? cx(0);
    const Vj = V[j] ?? cx(1);
    const th = cAngle(Vi) - cAngle(Vj);
    Q += cAbs(Vi) * cAbs(Vj) * (Yij.re * Math.sin(th) - Yij.im * Math.cos(th));
  }
  return Q;
}
