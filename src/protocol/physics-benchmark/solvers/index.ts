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

export const verifyQ26: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ26();
    expectApprox(ctx, 'reduced energy x', values.x, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'Fermi-Dirac occupancy', values.fFD, { rel: 0.03, abs: 5e-4 });
    expectApprox(ctx, 'Bose-Einstein occupancy', values.fBE, { rel: 0.03, abs: 5e-4 });
    expectApprox(ctx, 'Maxwell-Boltzmann occupancy', values.fMB, { rel: 0.03, abs: 5e-4 });
    expectApprox(ctx, 'relative quantum difference', values.delta, { rel: 0.05, abs: 0.005 });
  });

export const verifyQ27: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ27();
    expectApprox(ctx, 'angular frequency', values.omega, { rel: 0.02 });
    expectApprox(ctx, 'centripetal acceleration', values.a, { rel: 0.03 });
    expectApprox(ctx, 'Larmor power', values.power, { rel: 0.06 });
    expectApprox(ctx, 'radiated energy per cycle', values.dE, { rel: 0.06 });
    expectApprox(ctx, 'photon momentum scale', values.pGamma, { rel: 0.08 });
  });

export const verifyQ28: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ28();
    expectApprox(ctx, 'retarded-time delay', values.tDelay, { rel: 0.03 });
    expectApprox(ctx, 'wave number k', values.k, { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'far-zone E amplitude', values.e0, { rel: 0.05 });
    expectApprox(ctx, 'far-zone B amplitude', values.b0, { rel: 0.05 });
    expectApprox(ctx, 'average Poynting flux', values.sAvg, { rel: 0.08 });
  });

export const verifyQ29: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ29();
    expectApprox(ctx, 'Lorentz gamma', values.gamma, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'lab-frame energy', values.energy, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'lab-frame pc', values.pc, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'mass-shell invariant', values.invariant, { rel: 0.04, abs: 0.004 });
    expectApprox(ctx, 'boosted-frame energy', values.ePrime, { rel: 0.04, abs: 0.006 });
  });

export const verifyQ30: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ30();
    expectApprox(ctx, 'CG coefficient sqrt(2/3)', values.cgA, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'CG coefficient sqrt(1/3)', values.cgB, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'probability weight 2/3', values.pA, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'probability weight 1/3', values.pB, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'orthogonality dot product', values.orth, { rel: 0.02, abs: 0.003 });
  });

export const verifyQ31: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ31();
    expectApprox(ctx, 'optimal variational alpha', values.alphaStar, { rel: 0.03 });
    expectApprox(ctx, 'trial energy in eV', values.eTrialEv, { rel: 0.05, abs: 0.1 });
    expectApprox(ctx, 'minimum energy in joules', values.eMinJ, { rel: 0.05 });
    expectApprox(ctx, 'minimum energy in eV', values.eMinEv, { rel: 0.04, abs: 0.1 });
    expectApprox(ctx, 'optimization improvement', Math.abs(values.gainEv), { rel: 0.3, abs: 0.05 });
  });

export const verifyQ32: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ32();
    expectApprox(ctx, 'well ground energy E1', values.e1Ev, { rel: 0.03, abs: 0.01 });
    expectApprox(ctx, 'well first excited energy E2', values.e2Ev, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'boson two-particle energy', values.eBoson, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'fermion two-particle energy', values.eFermion, { rel: 0.03, abs: 0.03 });
    expectApprox(ctx, 'boson-fermion energy gap', values.deltaEv, { rel: 0.04, abs: 0.03 });
  });

export const verifyQ33: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ33();
    expectApprox(ctx, 'perturbation matrix element', values.vfi, { rel: 0.05 });
    expectApprox(ctx, 'Fermi-golden-rule transition rate', values.rate, { rel: 0.08 });
    expectApprox(ctx, 'transition lifetime', values.tau, { rel: 0.08 });
    expectApprox(ctx, 'photon momentum emission scale', values.pGamma, { rel: 0.08 });
  });

export const verifyQ34: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ34();
    expectApprox(ctx, 'critical temperature Tc', values.tc, { rel: 0.03, abs: 1.0 });
    expectApprox(ctx, 'reduced exchange A', values.a, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'reduced field h', values.h, { rel: 0.05 });
    expectApprox(ctx, 'linearized magnetization m', values.m, { rel: 0.05 });
    expectApprox(ctx, 'per-spin field energy', values.fieldEnergy, { rel: 0.08 });
  });

export const verifyQ35: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ35();
    expectApprox(ctx, 'equipartition thermal energy U', values.u, { rel: 0.03 });
    expectApprox(ctx, 'per-particle thermal energy', values.uPerParticle, { rel: 0.03 });
    expectApprox(ctx, 'rms speed', values.vRms, { rel: 0.03 });
    expectApprox(ctx, 'rms momentum', values.pRms, { rel: 0.04 });
    expectApprox(ctx, 'virial potential average', values.vAvg, { rel: 0.03 });
    expectApprox(ctx, 'virial total energy', values.eTotal, { rel: 0.03 });
  });

export const verifyQ36: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ36();
    expectApprox(ctx, 'reciprocal lattice constant a*', values.aStar * 1e-9, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, '|G111| in nm^-1', values.g111 * 1e-9, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, '|G200| in nm^-1', values.g200 * 1e-9, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, 'd111 spacing in nm', values.d111Nm, { rel: 0.03, abs: 0.002 });
    expectApprox(ctx, 'd200 spacing in nm', values.d200Nm, { rel: 0.03, abs: 0.002 });
  });

export const verifyQ37: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ37();
    expectApprox(ctx, 'Fermi wave vector', values.kF, { rel: 0.03 });
    expectApprox(ctx, 'Fermi energy in eV', values.eFEv, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'Fermi velocity', values.vF, { rel: 0.03 });
    expectApprox(ctx, 'DOS at EF in eV^-1 m^-3', values.gEv, { rel: 0.06 });
    expectApprox(ctx, 'kT/EF degeneracy ratio', values.ratio, { rel: 0.08, abs: 2e-4 });
  });

export const verifyQ38: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ38();
    expectApprox(ctx, 'zone-boundary wave number', values.kBz, { rel: 0.03 });
    expectApprox(ctx, 'zone-boundary free-electron energy', values.e0Ev, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'lower split branch energy', values.eMinus, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'upper split branch energy', values.ePlus, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'band gap', values.gap, { rel: 0.02, abs: 0.01 });
  });

export const verifyQ39: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ39();
    expectApprox(ctx, 'volume term', values.bv, { rel: 0.02, abs: 0.5 });
    expectApprox(ctx, 'surface term', values.bs, { rel: 0.03, abs: 0.5 });
    expectApprox(ctx, 'Coulomb term', values.bc, { rel: 0.03, abs: 0.5 });
    expectApprox(ctx, 'total binding energy MeV', values.bMeV, { rel: 0.03, abs: 0.7 });
    expectApprox(ctx, 'binding energy per nucleon', values.bPerA, { rel: 0.03, abs: 0.05 });
  });

export const verifyQ40: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ40();
    expectApprox(ctx, 'parent population NA', values.nA, { rel: 0.03 });
    expectApprox(ctx, 'daughter population NB', values.nB, { rel: 0.03 });
    expectApprox(ctx, 'stable product population NC', values.nC, { rel: 0.03 });
    expectApprox(ctx, 'activity of parent in Bq', values.aA_bq, { rel: 0.03, abs: 0.2 });
    expectApprox(ctx, 'activity of daughter in Bq', values.aB_bq, { rel: 0.03, abs: 0.2 });
  });

export const verifyQ41: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ41();
    expectApprox(ctx, 'Michelson fringe shift count', values.fringes, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'phase shift', values.phaseShift, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'Fabry-Perot FSR', values.fsr, { rel: 0.03 });
    expectApprox(ctx, 'Fabry-Perot finesse', values.finesse, { rel: 0.04, abs: 0.2 });
    expectApprox(ctx, 'Fabry-Perot linewidth', values.linewidth, { rel: 0.04 });
  });

export const verifyQ42: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ42();
    expectApprox(ctx, 'first-order grating position', values.y1 * 100, { rel: 0.04, abs: 0.1 });
    expectApprox(ctx, 'first diffraction minimum', values.yMin1 * 100, { rel: 0.04, abs: 0.1 });
    expectApprox(ctx, 'missing-order rule ratio d/a', values.missingSpacing, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'visible central orders', values.centralVisibleOrders, { rel: 0.02, abs: 0.1 });
  });

export const verifyQ43: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ43();
    expectApprox(ctx, 'laser photon energy in eV', values.photonEnergyEv, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'three-level threshold fraction', values.fracThree * 100, { rel: 0.03, abs: 0.5 });
    expectApprox(ctx, 'four-level threshold fraction', values.fracFour * 100, { rel: 0.04, abs: 0.05 });
    expectApprox(ctx, 'three-vs-four threshold ratio', values.fractionRatio, { rel: 0.04, abs: 1.0 });
    expectApprox(ctx, 'slope-efficiency output power', values.pOut, { rel: 0.03, abs: 0.05 });
  });

export const verifyQ44: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ44();
    expectApprox(ctx, 'Green function value G(x,x0)', values.g, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'potential at x=0.60 m', values.phi, { rel: 0.03, abs: 0.3 });
    expectApprox(ctx, 'left electric field branch', values.eLeft, { rel: 0.03, abs: 1.0 });
    expectApprox(ctx, 'right electric field branch', values.eRight, { rel: 0.03, abs: 1.0 });
    expectApprox(ctx, 'field jump across source', values.jump, { rel: 0.03, abs: 1.5 });
  });

export const verifyQ45: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ45();
    expectApprox(ctx, 'first stress invariant I1', values.i1, { rel: 0.02, abs: 0.5 });
    expectApprox(ctx, 'second stress invariant I2', values.i2, { rel: 0.02, abs: 2.0 });
    expectApprox(ctx, 'major principal stress', values.lambda1, { rel: 0.03, abs: 0.6 });
    expectApprox(ctx, 'minor principal stress', values.lambda2, { rel: 0.03, abs: 0.6 });
    expectApprox(ctx, 'principal-axis angle', values.thetaDeg, { rel: 0.03, abs: 0.4 });
    expectApprox(ctx, 'equivalent stress', values.sigmaEq, { rel: 0.03, abs: 0.6 });
  });

export const verifyQ46: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ46();
    expectApprox(ctx, 'propagator magnitude', values.kMag, { rel: 0.04 });
    expectApprox(ctx, 'path-integral phase', values.phi, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'classical action', values.sClassical, { rel: 0.04 });
    expectApprox(ctx, 'effective classical velocity', values.vClassical, { rel: 0.03 });
    expectApprox(ctx, 'effective kinetic energy in eV', values.eClassicalEv, { rel: 0.04, abs: 0.05 });
  });

export const verifyQ47: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ47();
    expectApprox(ctx, 'pipe average velocity', values.v, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'Reynolds number', values.reynolds, { rel: 0.04 });
    expectApprox(ctx, 'friction head loss', values.hLoss, { rel: 0.04, abs: 0.01 });
    expectApprox(ctx, 'pressure drop', values.deltaP, { rel: 0.04, abs: 50 });
    expectApprox(ctx, 'wall shear stress', values.tauW, { rel: 0.05, abs: 0.2 });
    expectApprox(ctx, 'pump power requirement', values.pumpPower, { rel: 0.04, abs: 0.2 });
  });

export const verifyQ48: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ48();
    expectApprox(ctx, 'initial dx/dt', values.dxdt, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'initial dy/dt', values.dydt, { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'initial dz/dt', values.dzdt, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'nontrivial fixed-point amplitude', values.eq, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'phase-space divergence', values.divergence, { rel: 0.03, abs: 0.1 });
    expectApprox(ctx, 'Lyapunov doubling time', values.tDouble, { rel: 0.05, abs: 0.03 });
  });

export const verifyQ49: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ49();
    expectApprox(ctx, 'Schwarzschild radius in km', values.rsKm, { rel: 0.02, abs: 0.2 });
    expectApprox(ctx, 'ISCO radius in km', values.rIscoKm, { rel: 0.02, abs: 0.3 });
    expectApprox(ctx, 'photon sphere radius in km', values.rPhotonKm, { rel: 0.02, abs: 0.2 });
    expectApprox(ctx, 'ISCO speed as fraction of c', values.vFracC, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'gravitational redshift', values.z, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, 'weak-field deflection angle (rad)', values.alphaRad, { rel: 0.04, abs: 0.01 });
  });

export const verifyQ50: PhysicsVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const { values } = solveQ50();
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
export interface PhysicsSolverResult {
  id: number;
  topic: string;
  capsule: string;
  values: Record<string, number>;
}

export type PhysicsBenchmarkSolver = () => PhysicsSolverResult;

function fixed(value: number, digits: number): string {
  return value.toFixed(digits);
}

function exp(value: number, digits: number): string {
  return value.toExponential(digits);
}

function capsule(title: string, lines: string[]): string {
  return [title, ...lines].join('\n');
}

export function solveQ26(): PhysicsSolverResult {
  const kB = 8.617e-5;
  const epsilon = 0.2;
  const mu = 0.1;
  const temperature = 300;
  const x = (epsilon - mu) / (kB * temperature);
  const fFD = 1 / (Math.exp(x) + 1);
  const fBE = 1 / (Math.exp(x) - 1);
  const fMB = Math.exp(-x);
  const delta = (fBE - fFD) / fMB;

  return {
    id: 26,
    topic: 'Fermi-Dirac occupation comparison',
    values: { x, fFD, fBE, fMB, delta },
    capsule: capsule('Q26 Fermi-Dirac', [
      `x=${fixed(x, 2)}`,
      `fFD=${fixed(fFD, 4)}`,
      `fBE=${fixed(fBE, 4)}`,
      `fMB=${fixed(fMB, 4)}`,
      `delta=${fixed(delta, 3)}`,
    ]),
  };
}

export function solveQ27(): PhysicsSolverResult {
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

  return {
    id: 27,
    topic: 'Larmor radiation from accelerated charge',
    values: { omega, a, power, dE, pGamma },
    capsule: capsule('Q27 Larmor radiation', [
      `omega=${exp(omega, 2)}`,
      `a=${exp(a, 2)}`,
      `power=${exp(power, 2)}`,
      `dE=${exp(dE, 2)}`,
      `pGamma=${exp(pGamma, 2)}`,
    ]),
  };
}

export function solveQ28(): PhysicsSolverResult {
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

  return {
    id: 28,
    topic: 'Retarded dipole radiation',
    values: { tDelay, k, e0, b0, sAvg },
    capsule: capsule('Q28 dipole radiation', [
      `tDelay=${exp(tDelay, 2)}`,
      `k=${fixed(k, 2)}`,
      `E0=${exp(e0, 2)}`,
      `B0=${exp(b0, 2)}`,
      `Savg=${exp(sAvg, 2)}`,
    ]),
  };
}

export function solveQ29(): PhysicsSolverResult {
  const beta = 0.8;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const mc2 = 0.511;
  const energy = gamma * mc2;
  const pc = gamma * beta * mc2;
  const invariant = energy ** 2 - pc ** 2;
  const u = 0.6;
  const gammaU = 1 / Math.sqrt(1 - u * u);
  const ePrime = gammaU * (energy - u * pc);

  return {
    id: 29,
    topic: 'Relativity four-vectors',
    values: { gamma, energy, pc, invariant, ePrime },
    capsule: capsule('Q29 relativity', [
      `gamma=${fixed(gamma, 3)}`,
      `E=${fixed(energy, 3)}`,
      `pc=${fixed(pc, 3)}`,
      `invariant=${fixed(invariant, 3)}`,
      `Eprime=${fixed(ePrime, 3)}`,
    ]),
  };
}

export function solveQ30(): PhysicsSolverResult {
  const cgA = Math.sqrt(2 / 3);
  const cgB = Math.sqrt(1 / 3);
  const pA = cgA * cgA;
  const pB = cgB * cgB;
  const orth = cgA * cgB + cgB * -cgA;

  return {
    id: 30,
    topic: 'Clebsch-Gordan coefficients',
    values: { cgA, cgB, pA, pB, orth },
    capsule: capsule('Q30 Clebsch-Gordan', [
      `cgA=${fixed(cgA, 3)}`,
      `cgB=${fixed(cgB, 3)}`,
      `pA=${fixed(pA, 3)}`,
      `pB=${fixed(pB, 3)}`,
      `orth=${fixed(orth, 3)}`,
    ]),
  };
}

export function solveQ31(): PhysicsSolverResult {
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

  return {
    id: 31,
    topic: 'Variational hydrogen ground state',
    values: { alphaStar, eTrialEv, eMinJ, eMinEv, gainEv },
    capsule: capsule('Q31 variational hydrogen', [
      `alphaStar=${exp(alphaStar, 2)}`,
      `EtrialEv=${fixed(eTrialEv, 1)}`,
      `EminJ=${exp(eMinJ, 2)}`,
      `EminEv=${fixed(eMinEv, 1)}`,
      `deltaEv=${fixed(gainEv, 1)}`,
    ]),
  };
}

export function solveQ32(): PhysicsSolverResult {
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

  return {
    id: 32,
    topic: 'Identical particles in a well',
    values: { e1Ev, e2Ev, eBoson, eFermion, deltaEv },
    capsule: capsule('Q32 identical particles', [
      `E1=${fixed(e1Ev, 3)}`,
      `E2=${fixed(e2Ev, 2)}`,
      `Eboson=${fixed(eBoson, 3)}`,
      `Efermion=${fixed(eFermion, 2)}`,
      `deltaEv=${fixed(deltaEv, 2)}`,
    ]),
  };
}

export function solveQ33(): PhysicsSolverResult {
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

  return {
    id: 33,
    topic: 'Fermi golden rule transition',
    values: { vfi, rate, tau, pGamma },
    capsule: capsule('Q33 Fermi golden rule', [
      `Vfi=${exp(vfi, 2)}`,
      `W=${exp(rate, 2)}`,
      `tau=${exp(tau, 2)}`,
      `pGamma=${exp(pGamma, 2)}`,
    ]),
  };
}

export function solveQ34(): PhysicsSolverResult {
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

  return {
    id: 34,
    topic: 'Ising mean-field response',
    values: { tc, a, h, m, fieldEnergy },
    capsule: capsule('Q34 Ising mean-field', [
      `Tc=${fixed(tc, 0)}`,
      `A=${fixed(a, 3)}`,
      `h=${exp(h, 2)}`,
      `m=${exp(m, 2)}`,
      `muBm=${exp(fieldEnergy, 2)}`,
    ]),
  };
}

export function solveQ35(): PhysicsSolverResult {
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

  return {
    id: 35,
    topic: 'Equipartition and virial theorem',
    values: { u, uPerParticle, vRms, pRms, vAvg, eTotal },
    capsule: capsule('Q35 equipartition', [
      `U=${exp(u, 2)}`,
      `Uper=${exp(uPerParticle, 2)}`,
      `vrms=${exp(vRms, 2)}`,
      `prms=${exp(pRms, 2)}`,
      `Vavg=${exp(vAvg, 2)}`,
      `Etotal=${exp(eTotal, 2)}`,
    ]),
  };
}

export function solveQ36(): PhysicsSolverResult {
  const a = 0.361e-9;
  const twoPiOverA = (2 * Math.PI) / a;
  const g111 = twoPiOverA * Math.sqrt(3);
  const g200 = twoPiOverA * 2;
  const aStar = (4 * Math.PI) / a;
  const d111Nm = (a / Math.sqrt(3)) * 1e9;
  const d200Nm = (a / 2) * 1e9;

  return {
    id: 36,
    topic: 'FCC reciprocal lattice',
    values: { aStar, g111, g200, d111Nm, d200Nm },
    capsule: capsule('Q36 FCC reciprocal lattice', [
      `aStarNmInv=${fixed(aStar * 1e-9, 1)}`,
      `G111NmInv=${fixed(g111 * 1e-9, 1)}`,
      `G200NmInv=${fixed(g200 * 1e-9, 1)}`,
      `d111nm=${fixed(d111Nm, 3)}`,
      `d200nm=${fixed(d200Nm, 4)}`,
    ]),
  };
}

export function solveQ37(): PhysicsSolverResult {
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

  return {
    id: 37,
    topic: 'Free electron density of states',
    values: { kF, eFEv, vF, gEv, ratio },
    capsule: capsule('Q37 free-electron DOS', [
      `kF=${exp(kF, 2)}`,
      `EF=${fixed(eFEv, 2)}`,
      `vF=${exp(vF, 2)}`,
      `gEF_eV=${exp(gEv, 2)}`,
      `kT_over_EF=${exp(ratio, 2)}`,
    ]),
  };
}

export function solveQ38(): PhysicsSolverResult {
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

  return {
    id: 38,
    topic: 'Nearly free electron band gap',
    values: { kBz, e0Ev, eMinus, ePlus, gap, gapOverKt },
    capsule: capsule('Q38 band gap', [
      `kBoundary=${exp(kBz, 2)}`,
      `E0=${fixed(e0Ev, 2)}`,
      `Eminus=${fixed(eMinus, 2)}`,
      `Eplus=${fixed(ePlus, 2)}`,
      `gap=${fixed(gap, 2)}`,
      `gapOverkT=${fixed(gapOverKt, 1)}`,
    ]),
  };
}

export function solveQ39(): PhysicsSolverResult {
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

  return {
    id: 39,
    topic: 'Bethe-Weizsaecker Fe-56',
    values: { bv, bs, bc, ba, delta, bMeV, bPerA },
    capsule: capsule('Q39 Bethe-Weizsaecker', [
      `Bv=${fixed(bv, 1)}`,
      `Bs=${fixed(bs, 1)}`,
      `Bc=${fixed(bc, 1)}`,
      `Ba=${fixed(ba, 2)}`,
      `delta=${fixed(delta, 2)}`,
      `Btotal=${fixed(bMeV, 1)}`,
      `BperA=${fixed(bPerA, 2)}`,
    ]),
  };
}

export function solveQ40(): PhysicsSolverResult {
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

  return {
    id: 40,
    topic: 'Decay chain A->B->C',
    values: { nA, nB, nC, aA_bq, aB_bq },
    capsule: capsule('Q40 decay chain', [
      `NA=${exp(nA, 2)}`,
      `NB=${exp(nB, 2)}`,
      `NC=${exp(nC, 2)}`,
      `AA_Bq=${fixed(aA_bq, 1)}`,
      `AB_Bq=${fixed(aB_bq, 1)}`,
    ]),
  };
}

export function solveQ41(): PhysicsSolverResult {
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

  return {
    id: 41,
    topic: 'Interferometry and Fabry-Perot',
    values: { fringes, phaseShift, fsr, finesse, linewidth, fringeDisplacement, coherenceTime },
    capsule: capsule('Q41 interferometry', [
      `fringes=${fixed(fringes, 2)}`,
      `phaseShift=${fixed(phaseShift, 2)}`,
      `FSR=${exp(fsr, 2)}`,
      `FSR_GHz=${fixed(fsr / 1e9, 1)}`,
      `finesse=${fixed(finesse, 1)}`,
      `linewidth=${exp(linewidth, 2)}`,
      `linewidth_GHz=${fixed(linewidth / 1e9, 2)}`,
      `fringeScale_nm=${fixed(fringeDisplacement * 1e9, 1)}`,
    ]),
  };
}

export function solveQ42(): PhysicsSolverResult {
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

  return {
    id: 42,
    topic: 'Diffraction and grating envelope',
    values: { y1, yMin1, missingSpacing, centralVisibleOrders },
    capsule: capsule('Q42 diffraction', [
      `y1_cm=${fixed(y1 * 100, 2)}`,
      `yMin1_cm=${fixed(yMin1 * 100, 2)}`,
      `missingOrderRule_m=${fixed(missingSpacing, 0)}p`,
      `centralVisibleOrders=${fixed(centralVisibleOrders, 0)}`,
    ]),
  };
}

export function solveQ43(): PhysicsSolverResult {
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

  return {
    id: 43,
    topic: 'Three-level vs four-level laser',
    values: { photonEnergyEv, fracThree, fracFour, fractionRatio, pOut, photonRate },
    capsule: capsule('Q43 laser operation', [
      `photonEnergy_eV=${fixed(photonEnergyEv, 2)}`,
      `threeLevelFraction=${fixed(fracThree * 100, 1)}%`,
      `fourLevelFraction=${fixed(fracFour * 100, 2)}%`,
      `fractionRatio=${fixed(fractionRatio, 1)}`,
      `Pout=${fixed(pOut, 2)}`,
      `photonRate=${exp(photonRate, 2)}`,
    ]),
  };
}

export function solveQ44(): PhysicsSolverResult {
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

  return {
    id: 44,
    topic: 'Green function in 1D field theory',
    values: { g, phi, eLeft, eRight, jump },
    capsule: capsule('Q44 Green function', [
      `G_x0=${fixed(g, 2)}`,
      `phi_x06=${fixed(phi, 1)}`,
      `E_left=${fixed(eLeft, 1)}`,
      `E_right=${fixed(eRight, 1)}`,
      `fieldJump=${fixed(jump, 1)}`,
    ]),
  };
}

export function solveQ45(): PhysicsSolverResult {
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

  return {
    id: 45,
    topic: 'Principal stress tensor values',
    values: { i1, i2, lambda1, lambda2, thetaDeg, sigmaEq },
    capsule: capsule('Q45 stress tensor', [
      `I1=${fixed(i1, 0)}`,
      `I2=${fixed(i2, 0)}`,
      `lambda1=${fixed(lambda1, 2)}`,
      `lambda2=${fixed(lambda2, 2)}`,
      `thetaDeg=${fixed(thetaDeg, 2)}`,
      `sigmaEq=${fixed(sigmaEq, 1)}`,
    ]),
  };
}

export function solveQ46(): PhysicsSolverResult {
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

  return {
    id: 46,
    topic: 'Path integral free-particle propagator',
    values: { kMag, phi, sClassical, vClassical, eClassicalEv },
    capsule: capsule('Q46 path integral', [
      `Kmag=${exp(kMag, 2)}`,
      `phi=${fixed(phi, 2)}`,
      `Sclassical=${exp(sClassical, 2)}`,
      `vClassical=${exp(vClassical, 2)}`,
      `Eclassical_eV=${fixed(eClassicalEv, 2)}`,
    ]),
  };
}

export function solveQ47(): PhysicsSolverResult {
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

  return {
    id: 47,
    topic: 'Navier-Stokes pipe-flow benchmark',
    values: { v, reynolds, hLoss, deltaP, tauW, pumpPower },
    capsule: capsule('Q47 Navier-Stokes', [
      `v=${fixed(v, 2)}`,
      `Re=${exp(reynolds, 2)}`,
      `hLoss=${fixed(hLoss, 3)}`,
      `deltaP=${fixed(deltaP, 2)}`,
      `deltaP_kPa=${fixed(deltaP / 1000, 2)}`,
      `tauW=${fixed(tauW, 2)}`,
      `pumpPower=${fixed(pumpPower, 2)}`,
    ]),
  };
}

export function solveQ48(): PhysicsSolverResult {
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

  return {
    id: 48,
    topic: 'Lorenz chaotic dynamics',
    values: { dxdt, dydt, dzdt, eq, divergence, tDouble, tTenX },
    capsule: capsule('Q48 Lorenz system', [
      `dxdt=${fixed(dxdt, 0)}`,
      `dydt=${fixed(dydt, 0)}`,
      `dzdt=${fixed(dzdt, 2)}`,
      `eq=${fixed(eq, 2)}`,
      `divergence=${fixed(divergence, 2)}`,
      `tDouble=${fixed(tDouble, 2)}`,
      `t10x=${fixed(tTenX, 2)}`,
    ]),
  };
}

export function solveQ49(): PhysicsSolverResult {
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

  return {
    id: 49,
    topic: 'Schwarzschild geodesics',
    values: { rsKm, rIscoKm, rPhotonKm, vFracC, vIsco, z, freqFactor, alphaRad, alphaDeg },
    capsule: capsule('Q49 Schwarzschild', [
      `rs_km=${fixed(rsKm, 1)}`,
      `rISCO_km=${fixed(rIscoKm, 1)}`,
      `rPhoton_km=${fixed(rPhotonKm, 1)}`,
      `vISCO_over_c=${fixed(vFracC, 3)}`,
      `z=${fixed(z, 3)}`,
      `freqFactor=${fixed(freqFactor, 3)}`,
      `alphaRad=${fixed(alphaRad, 3)}`,
      `alphaDeg=${fixed(alphaDeg, 1)}`,
    ]),
  };
}

export function solveQ50(): PhysicsSolverResult {
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

  return {
    id: 50,
    topic: 'Blackbody radiation laws',
    values: { lambdaMax, photonEnergyEv, x, bLambda, flux, luminosity },
    capsule: capsule('Q50 blackbody', [
      `lambdaMax=${exp(lambdaMax, 3)}`,
      `photonEnergy_eV=${fixed(photonEnergyEv, 2)}`,
      `planckX=${fixed(x, 2)}`,
      `B_lambda=${exp(bLambda, 2)}`,
      `flux=${exp(flux, 2)}`,
      `luminosity=${exp(luminosity, 2)}`,
    ]),
  };
}

export const SOLVERS_Q26_TO_Q50: Record<number, PhysicsBenchmarkSolver> = {
  26: solveQ26,
  27: solveQ27,
  28: solveQ28,
  29: solveQ29,
  30: solveQ30,
  31: solveQ31,
  32: solveQ32,
  33: solveQ33,
  34: solveQ34,
  35: solveQ35,
  36: solveQ36,
  37: solveQ37,
  38: solveQ38,
  39: solveQ39,
  40: solveQ40,
  41: solveQ41,
  42: solveQ42,
  43: solveQ43,
  44: solveQ44,
  45: solveQ45,
  46: solveQ46,
  47: solveQ47,
  48: solveQ48,
  49: solveQ49,
  50: solveQ50,
};

export function getPhysicsSolver(id: number): PhysicsBenchmarkSolver | undefined {
  return SOLVERS_Q26_TO_Q50[id];
}

