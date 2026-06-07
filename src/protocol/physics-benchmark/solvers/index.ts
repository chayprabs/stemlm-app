import {
  expectApprox,
  expectContains,
  expectRegex,
  type PhysicsVerificationSolver,
  withSolverContext,
} from './shared';

const DEG_TO_RAD = Math.PI / 180;
const G = 9.8;
const EPSILON_0 = 8.854e-12;
const MU_0 = 4 * Math.PI * 1e-7;
const HBAR = 1.054e-34;
const H = 6.626e-34;
const K_B = 1.380649e-23;
const E_CHARGE = 1.602e-19;

function erfApprox(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const poly = (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t);
  const y = 1 - poly * Math.exp(-ax * ax);
  return sign * y;
}

function erfcApprox(x: number): number {
  return 1 - erfApprox(x);
}

export const verifyQ01: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m1 = 5;
    const m2 = 3;
    const theta = 30 * DEG_TO_RAD;
    const muK = 0.2;

    const a = (G * (m2 - m1 * Math.sin(theta))) / (m1 + m2);
    const tension = m2 * (G - a);
    const friction = muK * m1 * G * Math.cos(theta);
    const aWithFriction = (G * (m2 - m1 * Math.sin(theta) - muK * m1 * Math.cos(theta))) / (m1 + m2);

    expectApprox(ctx, 'frictionless acceleration', a, { rel: 0.03 });
    expectApprox(ctx, 'frictionless tension', tension, { rel: 0.03 });
    expectApprox(ctx, 'kinetic friction force', friction, { rel: 0.03 });
    expectApprox(ctx, 'acceleration with friction', aWithFriction, { rel: 0.04 });
  });

export const verifyQ02: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const x = 2;
    const y = 3;
    const m = 2;
    const potential = -(x ** 3) * y - y ** 2;
    const work = -potential;
    const speed = Math.sqrt((2 * work) / m);

    expectApprox(ctx, 'potential at (2,3)', potential, { rel: 0.02 });
    expectApprox(ctx, 'work from (0,0) to (2,3)', work, { rel: 0.02 });
    expectApprox(ctx, 'speed at (2,3)', speed, { rel: 0.03 });
    expectRegex(ctx, 'conservative-force condition', /partial|curl|conservative/i);
  });

export const verifyQ03: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const theta = 30 * DEG_TO_RAD;
    const h = 2;
    const aSphere = (5 / 7) * G * Math.sin(theta);
    const vBottom = Math.sqrt((10 / 7) * G * h);
    const muMin = (2 / 7) * Math.tan(theta);

    expectApprox(ctx, 'solid-sphere acceleration', aSphere, { rel: 0.03 });
    expectApprox(ctx, 'bottom speed from energy', vBottom, { rel: 0.03 });
    expectApprox(ctx, 'minimum static friction coefficient', muMin, { rel: 0.04 });
  });

export const verifyQ04: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const keplerCoeff = 4 * Math.PI ** 2;
    expectRegex(ctx, 'angular momentum conservation', /L\s*=\s*m\s*r\^?2/i);
    expectRegex(ctx, 'Binet equation', /d\^?2u.*d\\theta\^?2.*\+\s*u/i);
    expectRegex(ctx, 'conic-orbit expression', /1\s*\+\s*e\s*\\cos/i);
    expectContains(ctx, 'Kepler-third-law dependence', 'r_0^3');
    expectApprox(ctx, 'Kepler coefficient 4π²', keplerCoeff, { rel: 0.05 });
  });

export const verifyQ05: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const l = 1;
    const omegaPlus = Math.sqrt((G / l) * (2 + Math.sqrt(2)));
    const omegaMinus = Math.sqrt((G / l) * (2 - Math.sqrt(2)));

    expectRegex(ctx, 'double-pendulum Lagrangian', /L\s*=\s*T\s*-\s*V|\\mathcal\{L\}\s*=\s*T\s*-\s*V/i);
    expectRegex(ctx, 'normal-mode formula omega plus', /2\s*\+\s*\\sqrt\{2\}/i);
    expectRegex(ctx, 'normal-mode formula omega minus', /2\s*-\s*\\sqrt\{2\}/i);
    expectApprox(ctx, 'higher normal-mode frequency', omegaPlus, { rel: 0.2 });
    expectApprox(ctx, 'lower normal-mode frequency', omegaMinus, { rel: 0.2 });
  });

export const verifyQ06: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const mass = 2;
    const a = 0.6;
    const b = 0.4;
    const tau = 0.5;
    const ixx = (mass * b ** 2) / 12;
    const iyy = (mass * a ** 2) / 12;
    const izzCm = (mass * (a ** 2 + b ** 2)) / 12;
    const izzCorner = (mass * (a ** 2 + b ** 2)) / 3;
    const alpha = tau / izzCorner;

    expectApprox(ctx, 'Ixx about center of mass', ixx, { rel: 0.04 });
    expectApprox(ctx, 'Iyy about center of mass', iyy, { rel: 0.04 });
    expectApprox(ctx, 'Izz about center of mass', izzCm, { rel: 0.04 });
    expectApprox(ctx, 'Izz about corner', izzCorner, { rel: 0.06 });
    expectApprox(ctx, 'angular acceleration about corner', alpha, { rel: 0.08 });
  });

export const verifyQ07: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m = 0.5;
    const k = 50;
    const b = 2;
    const omega0 = Math.sqrt(k / m);
    const gamma = b / (2 * m);
    const omegaD = Math.sqrt(omega0 ** 2 - gamma ** 2);
    const tDecay = 1 / gamma;
    const q = omega0 / (2 * gamma);

    expectApprox(ctx, 'natural angular frequency', omega0, { rel: 0.02 });
    expectApprox(ctx, 'damping constant gamma', gamma, { rel: 0.02 });
    expectApprox(ctx, 'damped frequency', omegaD, { rel: 0.03 });
    expectApprox(ctx, '1/e amplitude decay time', tDecay, { rel: 0.03 });
    expectApprox(ctx, 'quality factor', q, { rel: 0.03 });
  });

export const verifyQ08: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m = 0.5;
    const k = 50;
    const b = 2;
    const omega0 = Math.sqrt(k / m);
    const gamma = b / (2 * m);
    const omega = 9;
    const f0 = 5;
    const amplitude =
      (f0 / m) /
      Math.sqrt((omega0 ** 2 - omega ** 2) ** 2 + (2 * gamma * omega) ** 2);
    const omegaRes = Math.sqrt(omega0 ** 2 - 2 * gamma ** 2);
    const q = omega0 / (2 * gamma);
    const aResApprox = (q * f0) / k;

    expectApprox(ctx, 'steady-state amplitude at omega=9 rad/s', amplitude, { rel: 0.06 });
    expectApprox(ctx, 'resonance frequency', omegaRes, { rel: 0.03 });
    expectApprox(ctx, 'peak amplitude approximation QF0/k', aResApprox, { rel: 0.08 });
  });

export const verifyQ09: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m = 0.5;
    const k = 50;
    const kc = 50;
    const omega1 = Math.sqrt(k / m);
    const omega2 = Math.sqrt((k + 2 * kc) / m);
    const beatPeriod = (2 * Math.PI) / Math.abs(omega2 - omega1);

    expectApprox(ctx, 'symmetric mode frequency', omega1, { rel: 0.03 });
    expectApprox(ctx, 'antisymmetric mode frequency', omega2, { rel: 0.03 });
    expectApprox(ctx, 'beat period', beatPeriod, { rel: 0.06 });
    expectContains(ctx, 'mode-beating explanation', 'beat');
  });

export const verifyQ10: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const v = Math.sqrt(100 / 0.01);
    const f1 = v / (2 * 1);
    const omega1 = Math.PI * v;
    const energyFractionFundamental = (0.02 ** 2 * 1 ** 2) / (0.02 ** 2 * 1 ** 2 + 0.01 ** 2 * 3 ** 2);

    expectApprox(ctx, 'wave speed', v, { rel: 0.02 });
    expectApprox(ctx, 'fundamental frequency', f1, { rel: 0.02 });
    expectApprox(ctx, 'fundamental angular frequency', omega1, { rel: 0.03 });
    expectApprox(ctx, 'energy fraction in fundamental mode', energyFractionFundamental, { rel: 0.08 });
  });

export const verifyQ11: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const th = 600;
    const tc = 300;
    const w = 10_000;
    const etaCarnot = 1 - tc / th;
    const qh = w / etaCarnot;
    const qc = qh - w;
    const qhReal = w / 0.35;
    const qcReal = qhReal - w;
    const entropyGeneration = qcReal / tc - qhReal / th;

    expectApprox(ctx, 'Carnot efficiency', etaCarnot, { rel: 0.02 });
    expectApprox(ctx, 'Carnot heat input', qh / 1000, { rel: 0.03 });
    expectApprox(ctx, 'Carnot heat rejection', qc / 1000, { rel: 0.03 });
    expectApprox(ctx, 'real-engine entropy generation', entropyGeneration, { rel: 0.04 });
  });

export const verifyQ12: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m = 4.65e-26;
    const t = 300;
    const vp = Math.sqrt((2 * K_B * t) / m);
    const vMean = Math.sqrt((8 * K_B * t) / (Math.PI * m));
    const vRms = Math.sqrt((3 * K_B * t) / m);
    const pTail = erfcApprox(2) + (4 / Math.sqrt(Math.PI)) * Math.exp(-4);
    const vRmsAtDoubleT = Math.sqrt(2) * vRms;

    expectApprox(ctx, 'most probable speed', vp, { rel: 0.03 });
    expectApprox(ctx, 'mean speed', vMean, { rel: 0.03 });
    expectApprox(ctx, 'rms speed', vRms, { rel: 0.03 });
    expectApprox(ctx, 'tail probability P(v>2vp)', pTail, { rel: 0.08, abs: 0.005 });
    expectApprox(ctx, 'rms speed at doubled temperature', vRmsAtDoubleT, { rel: 0.03 });
  });

export const verifyQ13: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const rho = 2.0e-6;
    const a = 0.05;
    const b = 0.1;
    const rMid = 0.075;
    const rOut = 0.2;

    const eMid = (rho * (rMid ** 3 - a ** 3)) / (3 * EPSILON_0 * rMid ** 2);
    const eOut = (rho * (b ** 3 - a ** 3)) / (3 * EPSILON_0 * rOut ** 2);
    const vCavity = (rho * (b ** 2 - a ** 2)) / (2 * EPSILON_0);
    const energy =
      ((2 * Math.PI * rho ** 2) / (9 * EPSILON_0)) *
      ((b ** 5) / 5 - a ** 3 * b ** 2 - a ** 6 / b + (9 * a ** 5) / 5 + ((b ** 3 - a ** 3) ** 2) / b);

    expectApprox(ctx, 'field in shell region (r=0.075 m)', eMid, { rel: 0.05 });
    expectApprox(ctx, 'field outside shell (r=0.20 m)', eOut, { rel: 0.05 });
    expectApprox(ctx, 'cavity potential', vCavity, { rel: 0.05 });
    expectApprox(ctx, 'stored electrostatic energy', energy, { rel: 0.08, abs: 1e-7 });
  });

export const verifyQ14: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const e0 = 5.0e3;
    const r = 0.1;
    const a1 = e0 * r ** 3;
    const sigmaMax = 3 * EPSILON_0 * e0;

    expectApprox(ctx, 'Laplace coefficient A1', a1, { rel: 0.04 });
    expectApprox(ctx, 'maximum induced surface charge density', sigmaMax, { rel: 0.06, abs: 1e-9 });
    expectContains(ctx, 'zero net induced charge statement', 'q_{\\text{ind}}=0');
  });

export const verifyQ15: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const bLoop = (MU_0 * 5.0) / (2 * 0.08);
    const bSolenoid = MU_0 * 1200 * 2.0;
    const bToroid = (MU_0 * 600 * 1.5) / (2 * Math.PI * 0.12);

    expectRegex(ctx, 'Biot-Savart loop-center formula', /\\mu_0I\/\(2R\)|\\mu_0\s*I\s*\/\s*2R/i);
    expectApprox(ctx, 'loop-center magnetic field', bLoop, { rel: 0.05 });
    expectApprox(ctx, 'long-solenoid field', bSolenoid, { rel: 0.05 });
    expectApprox(ctx, 'toroid field at r=0.12 m', bToroid, { rel: 0.05 });
  });

export const verifyQ16: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const emf = 0.8 * 0.2 * 5.0;
    const current = emf / 0.5;
    const force = 0.8 * 0.2 * current;
    const inductance = (MU_0 * 200 ** 2 * Math.PI * 0.02 ** 2) / 0.4;
    const energy = 0.5 * inductance * current ** 2;

    expectApprox(ctx, 'motional emf', emf, { rel: 0.02 });
    expectApprox(ctx, 'induced current', current, { rel: 0.02 });
    expectApprox(ctx, 'magnetic retarding force', force, { rel: 0.03 });
    expectApprox(ctx, 'solenoid self-inductance', inductance, { rel: 0.06 });
    expectApprox(ctx, 'stored magnetic energy', energy, { rel: 0.08 });
  });

export const verifyQ17: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const c = 1 / Math.sqrt(MU_0 * EPSILON_0);
    const b0 = 120 / c;
    const sAvg = (120 * b0) / (2 * MU_0);

    expectRegex(ctx, 'Maxwell wave equation', /\\nabla\^2\\mathbf E\s*=\s*\\mu_0\\epsilon_0/i);
    expectApprox(ctx, 'vacuum wave speed c', c, { rel: 0.03 });
    expectApprox(ctx, 'magnetic field amplitude', b0, { rel: 0.04 });
    expectApprox(ctx, 'time-averaged Poynting magnitude', sAvg, { rel: 0.05 });
  });

export const verifyQ18: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const n1 = 1;
    const n2 = 2;
    const r = (n1 - n2) / (n1 + n2);
    const t = (2 * n1) / (n1 + n2);
    const powerR = Math.abs(r) ** 2;
    const powerT = (n2 / n1) * Math.abs(t) ** 2;

    expectApprox(ctx, 'Fresnel reflection coefficient r', r, { rel: 0.03 });
    expectApprox(ctx, 'Fresnel transmission coefficient t', t, { rel: 0.03 });
    expectApprox(ctx, 'power reflectance R', powerR, { rel: 0.03 });
    expectApprox(ctx, 'power transmittance T', powerT, { rel: 0.03 });
    expectApprox(ctx, 'power conservation R+T', powerR + powerT, { rel: 0.01 });
  });

export const verifyQ19: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m = 9.11e-31;
    const l = 1.0e-9;
    const e1J = (Math.PI ** 2 * HBAR ** 2) / (2 * m * l ** 2);
    const e1Ev = e1J / E_CHARGE;
    const eExpectation = (13 / 4) * e1Ev;
    const xAverageOverL = 0.5 - (8 * Math.sqrt(3)) / (9 * Math.PI ** 2);

    expectApprox(ctx, 'ground-state energy E1 (eV)', e1Ev, { rel: 0.03 });
    expectApprox(ctx, 'energy expectation value (eV)', eExpectation, { rel: 0.04 });
    expectApprox(ctx, 'normalized position expectation <x>/L', xAverageOverL, { rel: 0.04 });
    expectRegex(ctx, 'zero momentum expectation statement', /<\\?langle\s*p\\?rangle>\s*=\s*0|\\langle p\\rangle\s*=\s*0/i);
  });

export const verifyQ20: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m = 1.0e-26;
    const omega = 2.0e13;
    const n = 2;
    const alpha = 1.5;

    const e2 = HBAR * omega * (n + 0.5);
    const deltaX = Math.sqrt(((n + 0.5) * HBAR) / (m * omega));
    const deltaP = Math.sqrt((n + 0.5) * m * HBAR * omega);
    const coherentMeanN = alpha ** 2;
    const coherentMeanE = HBAR * omega * (coherentMeanN + 0.5);

    expectRegex(ctx, 'ladder-operator commutator', /\[a,\s*a\^?\\dagger\]\s*=\s*1/i);
    expectApprox(ctx, 'n=2 oscillator energy', e2, { rel: 0.05 });
    expectApprox(ctx, 'position uncertainty at n=2', deltaX, { rel: 0.06 });
    expectApprox(ctx, 'momentum uncertainty at n=2', deltaP, { rel: 0.06 });
    expectApprox(ctx, 'coherent-state mean occupation', coherentMeanN, { rel: 0.03 });
    expectApprox(ctx, 'coherent-state mean energy', coherentMeanE, { rel: 0.06 });
  });

export const verifyQ21: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const rH = 1.097e7;
    const wavelength = 1 / (rH * (1 / 2 ** 2 - 1 / 3 ** 2));
    const frequency = 3.0e8 / wavelength;
    const energyEv = (H * frequency) / E_CHARGE;
    const momentum = H / wavelength;

    expectApprox(ctx, 'H-alpha wavelength (nm)', wavelength * 1e9, { rel: 0.03 });
    expectApprox(ctx, 'H-alpha frequency (Hz)', frequency, { rel: 0.04 });
    expectApprox(ctx, 'H-alpha photon energy (eV)', energyEv, { rel: 0.04 });
    expectApprox(ctx, 'H-alpha photon momentum', momentum, { rel: 0.06 });
  });

export const verifyQ22: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const e1Unperturbed = 0.376;
    const deltaE1 = 0.8 / 2;
    const corrected = e1Unperturbed + deltaE1;
    const spacing = 3 * e1Unperturbed;
    const perturbativeRatio = deltaE1 / spacing;

    expectApprox(ctx, 'unperturbed ground-state energy', e1Unperturbed, { rel: 0.03 });
    expectApprox(ctx, 'first-order energy correction', deltaE1, { rel: 0.03 });
    expectApprox(ctx, 'corrected ground-state energy', corrected, { rel: 0.03 });
    expectApprox(ctx, 'perturbative ratio ΔE/Δ21', perturbativeRatio, { rel: 0.04 });
  });

export const verifyQ23: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const m = 9.11e-31;
    const uMinusE = 0.30 * E_CHARGE;
    const a = 0.30e-9;
    const kappa = Math.sqrt((2 * m * uMinusE) / HBAR ** 2);
    const transmission = Math.exp(-2 * kappa * a);
    const reflection = 1 - transmission;
    const transmittedFlux = transmission * 5.0e24;

    expectApprox(ctx, 'evanescent decay constant κ', kappa, { rel: 0.04 });
    expectApprox(ctx, 'barrier transmission probability', transmission, { rel: 0.06, abs: 0.01 });
    expectApprox(ctx, 'barrier reflection probability', reflection, { rel: 0.03, abs: 0.01 });
    expectApprox(ctx, 'transmitted flux', transmittedFlux, { rel: 0.08 });
  });

export const verifyQ24: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const n = 1;
    const r = 8.314;
    const v = 2.0e-2;
    const alpha = 3.0;
    const t = 300;
    const dPdTAtV = (n * r) / v + 2 * alpha * t;
    const dVdTAtP = (n * r) / 1.0e5;
    const deltaS = dPdTAtV * 1.0e-3;

    expectRegex(ctx, 'Helmholtz differential', /dA\s*=\s*-S.*dT.*-P.*dV/i);
    expectApprox(ctx, 'Maxwell derivative (∂P/∂T)V', dPdTAtV, { rel: 0.03 });
    expectApprox(ctx, 'ideal-gas derivative (∂V/∂T)P', dVdTAtP, { rel: 0.03 });
    expectApprox(ctx, 'finite entropy change ΔS', deltaS, { rel: 0.03 });
  });

export const verifyQ25: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const epsilonEv = 0.12;
    const kbEv = 8.617e-5;
    const temperature = 300;
    const beta = 1 / (kbEv * temperature);
    const z = 1 + Math.exp(-beta * epsilonEv);
    const p1 = Math.exp(-beta * epsilonEv) / z;
    const meanEnergyEv = epsilonEv * p1;
    const heatCapacityJ =
      kbEv *
      ((beta * epsilonEv) ** 2 * Math.exp(-beta * epsilonEv)) /
      (1 + Math.exp(-beta * epsilonEv)) ** 2 *
      E_CHARGE;

    expectApprox(ctx, 'inverse temperature beta', beta, { rel: 0.02 });
    expectApprox(ctx, 'partition function Z', z, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'excited-state probability p1', p1, { rel: 0.04, abs: 0.002 });
    expectApprox(ctx, 'mean energy <E> in eV', meanEnergyEv, { rel: 0.06, abs: 5e-4 });
    expectApprox(ctx, 'heat capacity in J/K', heatCapacityJ, { rel: 0.08, abs: 5e-25 });
  });

function computeQ26Values(): Record<string, number> {
  const kB = 8.617e-5;
  const epsilon = 0.2;
  const mu = 0.1;
  const temperature = 300;
  const x = (epsilon - mu) / (kB * temperature);
  const fFD = 1 / (Math.exp(x) + 1);
  const fBE = 1 / (Math.exp(x) - 1);
  const fMB = Math.exp(-x);
  const delta = (fBE - fFD) / fMB;
  return { x, fFD, fBE, fMB, delta };
}

function computeQ27Values(): Record<string, number> {
  const q = 1.602e-19;
  const eps0 = 8.854e-12;
  const c = 3e8;
  const f = 1e8;
  const r = 2e-2;
  const omega = 2 * Math.PI * f;
  const a = omega * omega * r;
  const power = (q * q * a * a) / (6 * Math.PI * eps0 * c ** 3);
  const dE = power / f;
  const pGamma = dE / c;
  return { omega, a, power, dE, pGamma };
}

function computeQ28Values(): Record<string, number> {
  const eps0 = 8.854e-12;
  const mu0 = 1.257e-6;
  const c = 3e8;
  const r = 2;
  const f = 1e9;
  const p0 = 1e-29;
  const omega = 2 * Math.PI * f;
  const k = omega / c;
  const tDelay = r / c;
  const e0 = (k ** 2 * p0) / (4 * Math.PI * eps0 * r);
  const b0 = e0 / c;
  const sAvg = e0 ** 2 / (2 * mu0 * c);
  return { tDelay, k, e0, b0, sAvg };
}

function computeQ29Values(): Record<string, number> {
  const beta = 0.8;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const mc2 = 0.511;
  const energy = gamma * mc2;
  const pc = gamma * beta * mc2;
  const invariant = energy ** 2 - pc ** 2;
  const u = 0.6;
  const gammaU = 1 / Math.sqrt(1 - u * u);
  const ePrime = gammaU * (energy - u * pc);
  return { gamma, energy, pc, invariant, ePrime };
}

function computeQ30Values(): Record<string, number> {
  const cgA = Math.sqrt(2 / 3);
  const cgB = Math.sqrt(1 / 3);
  const pA = cgA * cgA;
  const pB = cgB * cgB;
  const orth = cgA * cgB + cgB * -cgA;
  return { cgA, cgB, pA, pB, orth };
}

function computeQ31Values(): Record<string, number> {
  const hbar = 1.055e-34;
  const me = 9.11e-31;
  const e = 1.602e-19;
  const eps0 = 8.854e-12;
  const alphaTrial = 1.6e10;
  const a0 = 5.29e-11;
  const jPerEv = 1.602e-19;
  const eTrialJ =
    (hbar ** 2 * alphaTrial ** 2) / (2 * me) - (e ** 2 * alphaTrial) / (4 * Math.PI * eps0);
  const eTrialEv = eTrialJ / jPerEv;
  const alphaStar = 1 / a0;
  const eMinJ =
    (hbar ** 2 * alphaStar ** 2) / (2 * me) - (e ** 2 * alphaStar) / (4 * Math.PI * eps0);
  const eMinEv = eMinJ / jPerEv;
  const gainEv = eMinEv - eTrialEv;
  return { alphaStar, eTrialEv, eMinJ, eMinEv, gainEv };
}

function computeQ32Values(): Record<string, number> {
  const hbar = 1.055e-34;
  const me = 9.11e-31;
  const e = 1.602e-19;
  const length = 1e-9;
  const e1J = (Math.PI ** 2 * hbar ** 2) / (2 * me * length ** 2);
  const e1Ev = e1J / e;
  const e2Ev = 4 * e1Ev;
  const eBoson = 2 * e1Ev;
  const eFermion = e1Ev + e2Ev;
  const deltaEv = eFermion - eBoson;
  return { e1Ev, e2Ev, eBoson, eFermion, deltaEv };
}

function computeQ33Values(): Record<string, number> {
  const hbar = 1.055e-34;
  const e = 1.602e-19;
  const c = 3e8;
  const dfi = 3e-29;
  const e0Field = 5e3;
  const rho = 2e20;
  const vfi = dfi * e0Field;
  const rate = (2 * Math.PI / hbar) * vfi ** 2 * rho;
  const tau = 1 / rate;
  const deltaE = 1.89 * e;
  const pGamma = deltaE / c;
  return { vfi, rate, tau, pGamma };
}

function computeQ34Values(): Record<string, number> {
  const kB = 1.38e-23;
  const z = 4;
  const j = 1.2e-21;
  const mu = 9.27e-24;
  const b = 0.05;
  const t = 400;
  const tc = (z * j) / kB;
  const a = (z * j) / (kB * t);
  const h = (mu * b) / (kB * t);
  const m = h / (1 - a);
  const fieldEnergy = mu * b * m;
  return { tc, a, h, m, fieldEnergy };
}

function computeQ35Values(): Record<string, number> {
  const kB = 1.38e-23;
  const n = 2e23;
  const t = 350;
  const mAr = 6.63e-26;
  const kAvg = 4e-20;
  const u = 1.5 * n * kB * t;
  const uPerParticle = u / n;
  const vRms = Math.sqrt((3 * kB * t) / mAr);
  const pRms = mAr * vRms;
  const vAvg = -2 * kAvg;
  const eTotal = kAvg + vAvg;
  return { u, uPerParticle, vRms, pRms, vAvg, eTotal };
}

function computeQ36Values(): Record<string, number> {
  const a = 0.361e-9;
  const twoPiOverA = (2 * Math.PI) / a;
  const g111 = twoPiOverA * Math.sqrt(3);
  const g200 = twoPiOverA * 2;
  const aStar = (4 * Math.PI) / a;
  const d111Nm = (a / Math.sqrt(3)) * 1e9;
  const d200Nm = (a / 2) * 1e9;
  return { aStar, g111, g200, d111Nm, d200Nm };
}

function computeQ37Values(): Record<string, number> {
  const hbar = 1.055e-34;
  const me = 9.11e-31;
  const e = 1.602e-19;
  const n = 8.47e28;
  const kB = 8.617e-5;
  const t = 300;
  const kF = (3 * Math.PI ** 2 * n) ** (1 / 3);
  const eFJ = (hbar ** 2 * kF ** 2) / (2 * me);
  const eFEv = eFJ / e;
  const vF = (hbar * kF) / me;
  const gJ = (3 * n) / (2 * eFJ);
  const gEv = gJ * e;
  const ratio = (kB * t) / eFEv;
  return { kF, eFEv, vF, gEv, ratio };
}

function computeQ38Values(): Record<string, number> {
  const hbar = 1.055e-34;
  const me = 9.11e-31;
  const kB = 8.617e-5;
  const a = 0.3e-9;
  const ug = 0.2;
  const t = 300;
  const kBz = Math.PI / a;
  const e0J = (hbar ** 2 * kBz ** 2) / (2 * me);
  const e0Ev = e0J / 1.602e-19;
  const eMinus = e0Ev - ug;
  const ePlus = e0Ev + ug;
  const gap = ePlus - eMinus;
  const gapOverKt = gap / (kB * t);
  return { kBz, e0Ev, eMinus, ePlus, gap, gapOverKt };
}

function computeQ39Values(): Record<string, number> {
  const aV = 15.8;
  const aS = 18.3;
  const aC = 0.714;
  const aA = 23.2;
  const aP = 12;
  const A = 56;
  const Z = 26;
  const a13 = A ** (1 / 3);
  const a23 = a13 ** 2;
  const bv = aV * A;
  const bs = aS * a23;
  const bc = (aC * Z * (Z - 1)) / a13;
  const ba = (aA * (A - 2 * Z) ** 2) / A;
  const delta = aP / Math.sqrt(A);
  const bMeV = bv - bs - bc - ba + delta;
  const bPerA = bMeV / A;
  return { bv, bs, bc, ba, delta, bMeV, bPerA };
}

function computeQ40Values(): Record<string, number> {
  const nA0 = 1e6;
  const t = 5;
  const lambdaA = Math.log(2) / 2;
  const lambdaB = Math.log(2) / 6;
  const nA = nA0 * Math.exp(-lambdaA * t);
  const nB =
    nA0 * (lambdaA / (lambdaB - lambdaA)) * (Math.exp(-lambdaA * t) - Math.exp(-lambdaB * t));
  const nC = nA0 - nA - nB;
  const aA_perHour = lambdaA * nA;
  const aB_perHour = lambdaB * nB;
  const aA_bq = aA_perHour / 3600;
  const aB_bq = aB_perHour / 3600;
  return { nA, nB, nC, aA_bq, aB_bq };
}

function computeQ41Values(): Record<string, number> {
  const c = 3e8;
  const lambda = 632.8e-9;
  const dx = 0.4e-6;
  const cavityL = 5e-3;
  const reflectivity = 0.85;
  const fringes = (2 * dx) / lambda;
  const phaseShift = 2 * Math.PI * fringes;
  const fsr = c / (2 * cavityL);
  const finesse = (Math.PI * Math.sqrt(reflectivity)) / (1 - reflectivity);
  const linewidth = fsr / finesse;
  const fringeDisplacement = lambda / 2;
  const coherenceTime = 1 / (Math.PI * linewidth);
  return { fringes, phaseShift, fsr, finesse, linewidth, fringeDisplacement, coherenceTime };
}

function computeQ42Values(): Record<string, number> {
  const lambda = 500e-9;
  const d = 40e-6;
  const slitA = 20e-6;
  const screenL = 2;
  const theta1 = Math.asin(lambda / d);
  const y1 = screenL * Math.tan(theta1);
  const thetaMin1 = Math.asin(lambda / slitA);
  const yMin1 = screenL * Math.tan(thetaMin1);
  const missingSpacing = d / slitA;
  const centralVisibleOrders = 3;
  return { y1, yMin1, missingSpacing, centralVisibleOrders };
}

function computeQ43Values(): Record<string, number> {
  const h = 6.626e-34;
  const c = 3e8;
  const lambda = 632.8e-9;
  const nThreshold = 2e16;
  const nTotal = 5e18;
  const slopeEfficiency = 0.65;
  const pump = 8;
  const pumpThreshold = 2;
  const photonEnergyJ = (h * c) / lambda;
  const photonEnergyEv = photonEnergyJ / 1.602e-19;
  const n2Three = (nTotal + nThreshold) / 2;
  const fracThree = n2Three / nTotal;
  const n2Four = nThreshold;
  const fracFour = n2Four / nTotal;
  const fractionRatio = fracThree / fracFour;
  const pOut = slopeEfficiency * (pump - pumpThreshold);
  const photonRate = pOut / photonEnergyJ;
  return { photonEnergyEv, fracThree, fracFour, fractionRatio, pOut, photonRate };
}

function computeQ44Values(): Record<string, number> {
  const eps0 = 8.854e-12;
  const q = 2e-9;
  const length = 0.9;
  const x0 = 0.3;
  const x = 0.6;
  const g = x0 * (length - x) / length;
  const phi = (q * g) / eps0;
  const eLeft = (-q * (length - x0)) / (eps0 * length);
  const eRight = (q * x0) / (eps0 * length);
  const jump = eRight - eLeft;
  return { g, phi, eLeft, eRight, jump };
}

function computeQ45Values(): Record<string, number> {
  const sigmaX = 120;
  const sigmaY = 80;
  const tauXY = 30;
  const i1 = sigmaX + sigmaY;
  const i2 = sigmaX * sigmaY - tauXY ** 2;
  const radius = Math.sqrt(((sigmaX - sigmaY) / 2) ** 2 + tauXY ** 2);
  const lambda1 = (sigmaX + sigmaY) / 2 + radius;
  const lambda2 = (sigmaX + sigmaY) / 2 - radius;
  const thetaDeg = (0.5 * Math.atan2(2 * tauXY, sigmaX - sigmaY) * 180) / Math.PI;
  const sigmaEq = Math.sqrt(sigmaX ** 2 - sigmaX * sigmaY + sigmaY ** 2 + 3 * tauXY ** 2);
  return { i1, i2, lambda1, lambda2, thetaDeg, sigmaEq };
}

function computeQ46Values(): Record<string, number> {
  const m = 9.11e-31;
  const hbar = 1.055e-34;
  const dx = 1e-9;
  const t = 1e-15;
  const kMag = Math.sqrt(m / (2 * Math.PI * hbar * t));
  const phi = (m * dx ** 2) / (2 * hbar * t);
  const sClassical = (m * dx ** 2) / (2 * t);
  const vClassical = dx / t;
  const eClassicalJ = 0.5 * m * vClassical ** 2;
  const eClassicalEv = eClassicalJ / 1.602e-19;
  return { kMag, phi, sClassical, vClassical, eClassicalEv };
}

function computeQ47Values(): Record<string, number> {
  const rho = 1000;
  const mu = 1e-3;
  const g = 9.81;
  const d = 0.05;
  const l = 12;
  const q = 2.5e-3;
  const f = 0.02;
  const area = (Math.PI * d ** 2) / 4;
  const v = q / area;
  const reynolds = (rho * v * d) / mu;
  const hLoss = f * (l / d) * (v ** 2 / (2 * g));
  const deltaP = rho * g * hLoss;
  const tauW = (f * rho * v ** 2) / 8;
  const pumpPower = deltaP * q;
  return { v, reynolds, hLoss, deltaP, tauW, pumpPower };
}

function computeQ48Values(): Record<string, number> {
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const x = 1;
  const y = 1;
  const z = 1;
  const lyapunov = 0.9;
  const dxdt = sigma * (y - x);
  const dydt = x * (rho - z) - y;
  const dzdt = x * y - beta * z;
  const eq = Math.sqrt(beta * (rho - 1));
  const divergence = -sigma - 1 - beta;
  const tDouble = Math.log(2) / lyapunov;
  const tTenX = Math.log(10) / lyapunov;
  return { dxdt, dydt, dzdt, eq, divergence, tDouble, tTenX };
}

function computeQ49Values(): Record<string, number> {
  const c = 3e8;
  const massSolar = 10;
  const bKm = 200;
  const rsKm = 2.95 * massSolar;
  const rIscoKm = 3 * rsKm;
  const rPhotonKm = 1.5 * rsKm;
  const vFracC = 1 / Math.sqrt(6);
  const vIsco = vFracC * c;
  const z = (1 - 1 / 4) ** -0.5 - 1;
  const freqFactor = 1 / (1 + z);
  const alphaRad = (4 * (rsKm / 2)) / bKm;
  const alphaDeg = (alphaRad * 180) / Math.PI;
  return { rsKm, rIscoKm, rPhotonKm, vFracC, vIsco, z, freqFactor, alphaRad, alphaDeg };
}

function computeQ50Values(): Record<string, number> {
  const h = 6.626e-34;
  const c = 3e8;
  const kB = 1.38e-23;
  const sigma = 5.67e-8;
  const bWien = 2.898e-3;
  const t = 5800;
  const r = 6.96e8;
  const lambdaEval = 500e-9;
  const lambdaMax = bWien / t;
  const photonEnergyJ = (h * c) / lambdaMax;
  const photonEnergyEv = photonEnergyJ / 1.602e-19;
  const x = (h * c) / (lambdaEval * kB * t);
  const numerator = (2 * h * c ** 2) / lambdaEval ** 5;
  const bLambda = numerator / (Math.exp(x) - 1);
  const flux = sigma * t ** 4;
  const luminosity = 4 * Math.PI * r ** 2 * flux;
  return { lambdaMax, photonEnergyEv, x, bLambda, flux, luminosity };
}

export const verifyQ26: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ26Values();
    expectApprox(ctx, 'reduced energy x', values.x, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'Fermi-Dirac occupancy', values.fFD, { rel: 0.03, abs: 5e-4 });
    expectApprox(ctx, 'Bose-Einstein occupancy', values.fBE, { rel: 0.03, abs: 5e-4 });
    expectApprox(ctx, 'Maxwell-Boltzmann occupancy', values.fMB, { rel: 0.03, abs: 5e-4 });
    expectApprox(ctx, 'relative quantum difference', values.delta, { rel: 0.05, abs: 0.005 });
  });

export const verifyQ27: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ27Values();
    expectApprox(ctx, 'angular frequency', values.omega, { rel: 0.02 });
    expectApprox(ctx, 'centripetal acceleration', values.a, { rel: 0.03 });
    expectApprox(ctx, 'Larmor power', values.power, { rel: 0.06 });
    expectApprox(ctx, 'radiated energy per cycle', values.dE, { rel: 0.06 });
    expectApprox(ctx, 'photon momentum scale', values.pGamma, { rel: 0.08 });
  });

export const verifyQ28: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ28Values();
    expectApprox(ctx, 'retarded-time delay', values.tDelay, { rel: 0.03 });
    expectApprox(ctx, 'wave number k', values.k, { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'far-zone E amplitude', values.e0, { rel: 0.05 });
    expectApprox(ctx, 'far-zone B amplitude', values.b0, { rel: 0.05 });
    expectApprox(ctx, 'average Poynting flux', values.sAvg, { rel: 0.08 });
  });

export const verifyQ29: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ29Values();
    expectApprox(ctx, 'Lorentz gamma', values.gamma, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'lab-frame energy', values.energy, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'lab-frame pc', values.pc, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'mass-shell invariant', values.invariant, { rel: 0.04, abs: 0.004 });
    expectApprox(ctx, 'boosted-frame energy', values.ePrime, { rel: 0.04, abs: 0.006 });
  });

export const verifyQ30: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ30Values();
    expectApprox(ctx, 'CG coefficient sqrt(2/3)', values.cgA, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'CG coefficient sqrt(1/3)', values.cgB, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'probability weight 2/3', values.pA, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'probability weight 1/3', values.pB, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'orthogonality dot product', values.orth, { rel: 0.02, abs: 0.003 });
  });

export const verifyQ31: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ31Values();
    expectApprox(ctx, 'optimal variational alpha', values.alphaStar, { rel: 0.03 });
    expectApprox(ctx, 'trial energy in eV', values.eTrialEv, { rel: 0.05, abs: 0.1 });
    expectApprox(ctx, 'minimum energy in joules', values.eMinJ, { rel: 0.05 });
    expectApprox(ctx, 'minimum energy in eV', values.eMinEv, { rel: 0.04, abs: 0.1 });
    expectApprox(ctx, 'optimization improvement', Math.abs(values.gainEv), { rel: 0.3, abs: 0.05 });
  });

export const verifyQ32: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ32Values();
    expectApprox(ctx, 'well ground energy E1', values.e1Ev, { rel: 0.03, abs: 0.01 });
    expectApprox(ctx, 'well first excited energy E2', values.e2Ev, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'boson two-particle energy', values.eBoson, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'fermion two-particle energy', values.eFermion, { rel: 0.03, abs: 0.03 });
    expectApprox(ctx, 'boson-fermion energy gap', values.deltaEv, { rel: 0.04, abs: 0.03 });
  });

export const verifyQ33: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ33Values();
    expectApprox(ctx, 'perturbation matrix element', values.vfi, { rel: 0.05 });
    expectApprox(ctx, 'Fermi-golden-rule transition rate', values.rate, { rel: 0.08 });
    expectApprox(ctx, 'transition lifetime', values.tau, { rel: 0.08 });
    expectApprox(ctx, 'photon momentum emission scale', values.pGamma, { rel: 0.08 });
  });

export const verifyQ34: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ34Values();
    expectApprox(ctx, 'critical temperature Tc', values.tc, { rel: 0.03, abs: 1.0 });
    expectApprox(ctx, 'reduced exchange A', values.a, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'reduced field h', values.h, { rel: 0.05 });
    expectApprox(ctx, 'linearized magnetization m', values.m, { rel: 0.05 });
    expectApprox(ctx, 'per-spin field energy', values.fieldEnergy, { rel: 0.08 });
  });

export const verifyQ35: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ35Values();
    expectApprox(ctx, 'equipartition thermal energy U', values.u, { rel: 0.03 });
    expectApprox(ctx, 'per-particle thermal energy', values.uPerParticle, { rel: 0.03 });
    expectApprox(ctx, 'rms speed', values.vRms, { rel: 0.03 });
    expectApprox(ctx, 'rms momentum', values.pRms, { rel: 0.04 });
    expectApprox(ctx, 'virial potential average', values.vAvg, { rel: 0.03 });
    expectApprox(ctx, 'virial total energy', values.eTotal, { rel: 0.03 });
  });

export const verifyQ36: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ36Values();
    expectApprox(ctx, 'reciprocal lattice constant a*', values.aStar * 1e-9, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, '|G111| in nm^-1', values.g111 * 1e-9, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, '|G200| in nm^-1', values.g200 * 1e-9, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, 'd111 spacing in nm', values.d111Nm, { rel: 0.03, abs: 0.002 });
    expectApprox(ctx, 'd200 spacing in nm', values.d200Nm, { rel: 0.03, abs: 0.002 });
  });

export const verifyQ37: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ37Values();
    expectApprox(ctx, 'Fermi wave vector', values.kF, { rel: 0.03 });
    expectApprox(ctx, 'Fermi energy in eV', values.eFEv, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'Fermi velocity', values.vF, { rel: 0.03 });
    expectApprox(ctx, 'DOS at EF in eV^-1 m^-3', values.gEv, { rel: 0.06 });
    expectApprox(ctx, 'kT/EF degeneracy ratio', values.ratio, { rel: 0.08, abs: 2e-4 });
  });

export const verifyQ38: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ38Values();
    expectApprox(ctx, 'zone-boundary wave number', values.kBz, { rel: 0.03 });
    expectApprox(ctx, 'zone-boundary free-electron energy', values.e0Ev, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'lower split branch energy', values.eMinus, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'upper split branch energy', values.ePlus, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'band gap', values.gap, { rel: 0.02, abs: 0.01 });
  });

export const verifyQ39: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ39Values();
    expectApprox(ctx, 'volume term', values.bv, { rel: 0.02, abs: 0.5 });
    expectApprox(ctx, 'surface term', values.bs, { rel: 0.03, abs: 0.5 });
    expectApprox(ctx, 'Coulomb term', values.bc, { rel: 0.03, abs: 0.5 });
    expectApprox(ctx, 'total binding energy MeV', values.bMeV, { rel: 0.03, abs: 0.7 });
    expectApprox(ctx, 'binding energy per nucleon', values.bPerA, { rel: 0.03, abs: 0.05 });
  });

export const verifyQ40: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ40Values();
    expectApprox(ctx, 'parent population NA', values.nA, { rel: 0.03 });
    expectApprox(ctx, 'daughter population NB', values.nB, { rel: 0.03 });
    expectApprox(ctx, 'stable product population NC', values.nC, { rel: 0.03 });
    expectApprox(ctx, 'activity of parent in Bq', values.aA_bq, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, 'activity of daughter in Bq', values.aB_bq, { rel: 0.03, abs: 0.2 });
  });

export const verifyQ41: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ41Values();
    expectApprox(ctx, 'Michelson fringe shift count', values.fringes, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'phase shift', values.phaseShift, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'Fabry-Perot FSR', values.fsr, { rel: 0.03 });
    expectApprox(ctx, 'Fabry-Perot finesse', values.finesse, { rel: 0.04, abs: 0.2 });
    expectApprox(ctx, 'Fabry-Perot linewidth', values.linewidth, { rel: 0.04 });
  });

export const verifyQ42: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ42Values();
    expectApprox(ctx, 'first-order grating position', values.y1 * 100, { rel: 0.04, abs: 0.1 });
    expectApprox(ctx, 'first diffraction minimum', values.yMin1 * 100, { rel: 0.04, abs: 0.1 });
    expectApprox(ctx, 'missing-order rule ratio d/a', values.missingSpacing, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'visible central orders', values.centralVisibleOrders, { rel: 0.02, abs: 0.1 });
  });

export const verifyQ43: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ43Values();
    expectApprox(ctx, 'laser photon energy in eV', values.photonEnergyEv, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'three-level threshold fraction', values.fracThree * 100, { rel: 0.03, abs: 0.5 });
    expectApprox(ctx, 'four-level threshold fraction', values.fracFour * 100, { rel: 0.04, abs: 0.05 });
    expectApprox(ctx, 'three-vs-four threshold ratio', values.fractionRatio, { rel: 0.04, abs: 1.0 });
    expectApprox(ctx, 'slope-efficiency output power', values.pOut, { rel: 0.03, abs: 0.05 });
  });

export const verifyQ44: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ44Values();
    expectApprox(ctx, 'Green function value G(x,x0)', values.g, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'potential at x=0.60 m', values.phi, { rel: 0.03, abs: 0.3 });
    expectApprox(ctx, 'left electric field branch', values.eLeft, { rel: 0.03, abs: 1.0 });
    expectApprox(ctx, 'right electric field branch', values.eRight, { rel: 0.03, abs: 1.0 });
    expectApprox(ctx, 'field jump across source', values.jump, { rel: 0.03, abs: 1.5 });
  });

export const verifyQ45: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ45Values();
    expectApprox(ctx, 'first stress invariant I1', values.i1, { rel: 0.02, abs: 0.5 });
    expectApprox(ctx, 'second stress invariant I2', values.i2, { rel: 0.02, abs: 2.0 });
    expectApprox(ctx, 'major principal stress', values.lambda1, { rel: 0.03, abs: 0.6 });
    expectApprox(ctx, 'minor principal stress', values.lambda2, { rel: 0.03, abs: 0.6 });
    expectApprox(ctx, 'principal-axis angle', values.thetaDeg, { rel: 0.03, abs: 0.4 });
    expectApprox(ctx, 'equivalent stress', values.sigmaEq, { rel: 0.03, abs: 0.6 });
  });

export const verifyQ46: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ46Values();
    expectApprox(ctx, 'propagator magnitude', values.kMag, { rel: 0.04 });
    expectApprox(ctx, 'path-integral phase', values.phi, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'classical action', values.sClassical, { rel: 0.04 });
    expectApprox(ctx, 'effective classical velocity', values.vClassical, { rel: 0.03 });
    expectApprox(ctx, 'effective kinetic energy in eV', values.eClassicalEv, { rel: 0.04, abs: 0.05 });
  });

export const verifyQ47: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ47Values();
    expectApprox(ctx, 'pipe average velocity', values.v, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'Reynolds number', values.reynolds, { rel: 0.04 });
    expectApprox(ctx, 'friction head loss', values.hLoss, { rel: 0.04, abs: 0.01 });
    expectApprox(ctx, 'pressure drop', values.deltaP, { rel: 0.04, abs: 50 });
    expectApprox(ctx, 'wall shear stress', values.tauW, { rel: 0.05, abs: 0.2 });
    expectApprox(ctx, 'pump power requirement', values.pumpPower, { rel: 0.04, abs: 0.2 });
  });

export const verifyQ48: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ48Values();
    expectApprox(ctx, 'initial dx/dt', values.dxdt, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'initial dy/dt', values.dydt, { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'initial dz/dt', values.dzdt, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'nontrivial fixed-point amplitude', values.eq, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'phase-space divergence', values.divergence, { rel: 0.03, abs: 0.1 });
    expectApprox(ctx, 'Lyapunov doubling time', values.tDouble, { rel: 0.05, abs: 0.03 });
  });

export const verifyQ49: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ49Values();
    expectApprox(ctx, 'Schwarzschild radius in km', values.rsKm, { rel: 0.02, abs: 0.2 });
    expectApprox(ctx, 'ISCO radius in km', values.rIscoKm, { rel: 0.02, abs: 0.3 });
    expectApprox(ctx, 'photon sphere radius in km', values.rPhotonKm, { rel: 0.02, abs: 0.2 });
    expectApprox(ctx, 'ISCO speed as fraction of c', values.vFracC, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'gravitational redshift', values.z, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'weak-field deflection angle (rad)', values.alphaRad, { rel: 0.04, abs: 0.01 });
  });

export const verifyQ50: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const values = computeQ50Values();
    expectApprox(ctx, 'Wien peak wavelength', values.lambdaMax, { rel: 0.03 });
    expectApprox(ctx, 'peak photon energy in eV', values.photonEnergyEv, { rel: 0.03, abs: 0.03 });
    expectApprox(ctx, 'Planck exponent x at 500nm', values.x, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'Planck radiance B_lambda', values.bLambda, { rel: 0.08 });
    expectApprox(ctx, 'Stefan-Boltzmann flux', values.flux, { rel: 0.04 });
    expectApprox(ctx, 'blackbody luminosity', values.luminosity, { rel: 0.04 });
  });

export const PHYSICS_BENCHMARK_SOLVERS: PhysicsVerificationSolver[] = [
  verifyQ01,
  verifyQ02,
  verifyQ03,
  verifyQ04,
  verifyQ05,
  verifyQ06,
  verifyQ07,
  verifyQ08,
  verifyQ09,
  verifyQ10,
  verifyQ11,
  verifyQ12,
  verifyQ13,
  verifyQ14,
  verifyQ15,
  verifyQ16,
  verifyQ17,
  verifyQ18,
  verifyQ19,
  verifyQ20,
  verifyQ21,
  verifyQ22,
  verifyQ23,
  verifyQ24,
  verifyQ25,
  verifyQ26,
  verifyQ27,
  verifyQ28,
  verifyQ29,
  verifyQ30,
  verifyQ31,
  verifyQ32,
  verifyQ33,
  verifyQ34,
  verifyQ35,
  verifyQ36,
  verifyQ37,
  verifyQ38,
  verifyQ39,
  verifyQ40,
  verifyQ41,
  verifyQ42,
  verifyQ43,
  verifyQ44,
  verifyQ45,
  verifyQ46,
  verifyQ47,
  verifyQ48,
  verifyQ49,
  verifyQ50,
];

export default PHYSICS_BENCHMARK_SOLVERS;
