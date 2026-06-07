import { describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('@/src/lib/mermaid', () => ({
  renderMermaid: vi.fn(
    async () =>
      '<svg viewBox="0 0 100 60"><rect width="40" height="20" style="fill:#eee;stroke:#333"/></svg>',
  ),
}));

import { generatePhysicsCapsule } from './ai-client';
import { PHYSICS_SPECS } from './specs/index';
import { PHYSICS_BENCHMARK_SOLVERS } from './solvers';
import { verifyPhysicsCapsule } from './verify-capsule';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

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
  const poly = (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t);
  return sign * (1 - poly * Math.exp(-ax * ax));
}

function erfcApprox(x: number): number {
  return 1 - erfApprox(x);
}

function stub(...parts: (string | number)[]): string {
  return parts
    .map((part) => (typeof part === 'number' ? String(part) : part))
    .join(' ');
}

function buildQ01Stub(): string {
  const m1 = 5;
  const m2 = 3;
  const theta = 30 * DEG_TO_RAD;
  const muK = 0.2;
  const a = (G * (m2 - m1 * Math.sin(theta))) / (m1 + m2);
  const tension = m2 * (G - a);
  const friction = muK * m1 * G * Math.cos(theta);
  const aWithFriction =
    (G * (m2 - m1 * Math.sin(theta) - muK * m1 * Math.cos(theta))) / (m1 + m2);
  return stub(a, tension, friction, aWithFriction);
}

function buildQ02Stub(): string {
  const x = 2;
  const y = 3;
  const m = 2;
  const potential = -(x ** 3) * y - y ** 2;
  const work = -potential;
  const speed = Math.sqrt((2 * work) / m);
  return stub('partial derivatives show curl=0 conservative force', potential, work, speed);
}

function buildQ03Stub(): string {
  const theta = 30 * DEG_TO_RAD;
  const h = 2;
  const aSphere = (5 / 7) * G * Math.sin(theta);
  const vBottom = Math.sqrt((10 / 7) * G * h);
  const muMin = (2 / 7) * Math.tan(theta);
  return stub(aSphere, vBottom, muMin);
}

function buildQ04Stub(): string {
  const keplerCoeff = 4 * Math.PI ** 2;
  return stub(
    'L=mr^2 conserved',
    'd^2u/d\\theta^2 + u Binet equation',
    'r(θ)=1+e\\cos\\theta conic orbit',
    'Kepler third law r_0^3 dependence',
    keplerCoeff,
  );
}

function buildQ05Stub(): string {
  const l = 1;
  const omegaPlus = Math.sqrt((G / l) * (2 + Math.sqrt(2)));
  const omegaMinus = Math.sqrt((G / l) * (2 - Math.sqrt(2)));
  return stub(
    '\\mathcal{L}=T-V double-pendulum Lagrangian',
    'ω+ ∝ sqrt(g/l*(2+\\sqrt{2}))',
    'ω- ∝ sqrt(g/l*(2-\\sqrt{2}))',
    omegaPlus,
    omegaMinus,
  );
}

function buildQ06Stub(): string {
  const mass = 2;
  const a = 0.6;
  const b = 0.4;
  const tau = 0.5;
  const ixx = (mass * b ** 2) / 12;
  const iyy = (mass * a ** 2) / 12;
  const izzCm = (mass * (a ** 2 + b ** 2)) / 12;
  const izzCorner = (mass * (a ** 2 + b ** 2)) / 3;
  const alpha = tau / izzCorner;
  return stub(ixx, iyy, izzCm, izzCorner, alpha);
}

function buildQ07Stub(): string {
  const m = 0.5;
  const k = 50;
  const b = 2;
  const omega0 = Math.sqrt(k / m);
  const gamma = b / (2 * m);
  const omegaD = Math.sqrt(omega0 ** 2 - gamma ** 2);
  const tDecay = 1 / gamma;
  const q = omega0 / (2 * gamma);
  return stub(omega0, gamma, omegaD, tDecay, q);
}

function buildQ08Stub(): string {
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
  const aResApprox = (omega0 / (2 * gamma) * f0) / k;
  return stub(amplitude, omegaRes, aResApprox);
}

function buildQ09Stub(): string {
  const m = 0.5;
  const k = 50;
  const kc = 50;
  const omega1 = Math.sqrt(k / m);
  const omega2 = Math.sqrt((k + 2 * kc) / m);
  const beatPeriod = (2 * Math.PI) / Math.abs(omega2 - omega1);
  return stub(omega1, omega2, beatPeriod, 'normal-mode beat envelope');
}

function buildQ10Stub(): string {
  const v = Math.sqrt(100 / 0.01);
  const f1 = v / 2;
  const omega1 = Math.PI * v;
  const energyFractionFundamental =
    (0.02 ** 2 * 1 ** 2) / (0.02 ** 2 * 1 ** 2 + 0.01 ** 2 * 3 ** 2);
  return stub(v, f1, omega1, energyFractionFundamental);
}

function buildQ11Stub(): string {
  const th = 600;
  const tc = 300;
  const w = 10_000;
  const etaCarnot = 1 - tc / th;
  const qh = w / etaCarnot;
  const qc = qh - w;
  const qhReal = w / 0.35;
  const qcReal = qhReal - w;
  const entropyGeneration = qcReal / tc - qhReal / th;
  return stub(etaCarnot, qh / 1000, qc / 1000, entropyGeneration);
}

function buildQ12Stub(): string {
  const m = 4.65e-26;
  const t = 300;
  const vp = Math.sqrt((2 * K_B * t) / m);
  const vMean = Math.sqrt((8 * K_B * t) / (Math.PI * m));
  const vRms = Math.sqrt((3 * K_B * t) / m);
  const pTail = erfcApprox(2) + (4 / Math.sqrt(Math.PI)) * Math.exp(-4);
  const vRmsAtDoubleT = Math.sqrt(2) * vRms;
  return stub(vp, vMean, vRms, pTail, vRmsAtDoubleT);
}

function buildQ13Stub(): string {
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
    ((b ** 5) / 5 -
      a ** 3 * b ** 2 -
      a ** 6 / b +
      (9 * a ** 5) / 5 +
      ((b ** 3 - a ** 3) ** 2) / b);
  return stub(eMid, eOut, vCavity, energy);
}

function buildQ14Stub(): string {
  const e0 = 5.0e3;
  const r = 0.1;
  const a1 = e0 * r ** 3;
  const sigmaMax = 3 * EPSILON_0 * e0;
  return stub(a1, sigmaMax, 'q_{\\text{ind}}=0');
}

function buildQ15Stub(): string {
  const bLoop = (MU_0 * 5.0) / (2 * 0.08);
  const bSolenoid = MU_0 * 1200 * 2.0;
  const bToroid = (MU_0 * 600 * 1.5) / (2 * Math.PI * 0.12);
  return stub('\\mu_0 I / 2R Biot-Savart loop center', bLoop, bSolenoid, bToroid);
}

function buildQ16Stub(): string {
  const emf = 0.8 * 0.2 * 5.0;
  const current = emf / 0.5;
  const force = 0.8 * 0.2 * current;
  const inductance = (MU_0 * 200 ** 2 * Math.PI * 0.02 ** 2) / 0.4;
  const energy = 0.5 * inductance * current ** 2;
  return stub(emf, current, force, inductance, energy);
}

function buildQ17Stub(): string {
  const c = 1 / Math.sqrt(MU_0 * EPSILON_0);
  const b0 = 120 / c;
  const sAvg = (120 * b0) / (2 * MU_0);
  return stub('\\nabla^2\\mathbf E = \\mu_0\\epsilon_0 wave equation', c, b0, sAvg);
}

function buildQ18Stub(): string {
  const n1 = 1;
  const n2 = 2;
  const r = (n1 - n2) / (n1 + n2);
  const t = (2 * n1) / (n1 + n2);
  const powerR = Math.abs(r) ** 2;
  const powerT = (n2 / n1) * Math.abs(t) ** 2;
  return stub(r, t, powerR, powerT, powerR + powerT);
}

function buildQ19Stub(): string {
  const m = 9.11e-31;
  const l = 1.0e-9;
  const e1J = (Math.PI ** 2 * HBAR ** 2) / (2 * m * l ** 2);
  const e1Ev = e1J / E_CHARGE;
  const eExpectation = (13 / 4) * e1Ev;
  const xAverageOverL = 0.5 - (8 * Math.sqrt(3)) / (9 * Math.PI ** 2);
  return stub(e1Ev, eExpectation, xAverageOverL, '\\langle p\\rangle=0');
}

function buildQ20Stub(): string {
  const m = 1.0e-26;
  const omega = 2.0e13;
  const n = 2;
  const alpha = 1.5;
  const e2 = HBAR * omega * (n + 0.5);
  const deltaX = Math.sqrt(((n + 0.5) * HBAR) / (m * omega));
  const deltaP = Math.sqrt((n + 0.5) * m * HBAR * omega);
  const coherentMeanN = alpha ** 2;
  const coherentMeanE = HBAR * omega * (coherentMeanN + 0.5);
  return stub('[a,a^\\dagger]=1 commutator', e2, deltaX, deltaP, coherentMeanN, coherentMeanE);
}

function buildQ21Stub(): string {
  const rH = 1.097e7;
  const wavelength = 1 / (rH * (1 / 2 ** 2 - 1 / 3 ** 2));
  const frequency = 3.0e8 / wavelength;
  const energyEv = (H * frequency) / E_CHARGE;
  const momentum = H / wavelength;
  return stub(wavelength * 1e9, frequency, energyEv, momentum);
}

function buildQ22Stub(): string {
  const e1Unperturbed = 0.376;
  const deltaE1 = 0.8 / 2;
  const corrected = e1Unperturbed + deltaE1;
  const spacing = 3 * e1Unperturbed;
  const perturbativeRatio = deltaE1 / spacing;
  return stub(e1Unperturbed, deltaE1, corrected, perturbativeRatio);
}

function buildQ23Stub(): string {
  const m = 9.11e-31;
  const uMinusE = 0.30 * E_CHARGE;
  const a = 0.30e-9;
  const kappa = Math.sqrt((2 * m * uMinusE) / HBAR ** 2);
  const transmission = Math.exp(-2 * kappa * a);
  const reflection = 1 - transmission;
  const transmittedFlux = transmission * 5.0e24;
  return stub(kappa, transmission, reflection, transmittedFlux);
}

function buildQ24Stub(): string {
  const n = 1;
  const r = 8.314;
  const v = 2.0e-2;
  const alpha = 3.0;
  const t = 300;
  const dPdTAtV = (n * r) / v + 2 * alpha * t;
  const dVdTAtP = (n * r) / 1.0e5;
  const deltaS = dPdTAtV * 1.0e-3;
  return stub('dA=-S dT-P dV Helmholtz differential', dPdTAtV, dVdTAtP, deltaS);
}

function buildQ25Stub(): string {
  const epsilonEv = 0.12;
  const kbEv = 8.617e-5;
  const temperature = 300;
  const beta = 1 / (kbEv * temperature);
  const z = 1 + Math.exp(-beta * epsilonEv);
  const p1 = Math.exp(-beta * epsilonEv) / z;
  const meanEnergyEv = epsilonEv * p1;
  const heatCapacityJ =
    (kbEv *
      ((beta * epsilonEv) ** 2 * Math.exp(-beta * epsilonEv)) /
      (1 + Math.exp(-beta * epsilonEv)) ** 2 *
      E_CHARGE);
  return stub(beta, z, p1, meanEnergyEv, heatCapacityJ);
}

function buildQ26Stub(): string {
  const kB = 8.617e-5;
  const epsilon = 0.2;
  const mu = 0.1;
  const temperature = 300;
  const x = (epsilon - mu) / (kB * temperature);
  const fFD = 1 / (Math.exp(x) + 1);
  const fBE = 1 / (Math.exp(x) - 1);
  const fMB = Math.exp(-x);
  const delta = (fBE - fFD) / fMB;
  return stub(x, fFD, fBE, fMB, delta);
}

function buildQ27Stub(): string {
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
  return stub(omega, a, power, dE, pGamma);
}

function buildQ28Stub(): string {
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
  return stub(tDelay, k, e0, b0, sAvg);
}

function buildQ29Stub(): string {
  const beta = 0.8;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const mc2 = 0.511;
  const energy = gamma * mc2;
  const pc = gamma * beta * mc2;
  const invariant = energy ** 2 - pc ** 2;
  const u = 0.6;
  const gammaU = 1 / Math.sqrt(1 - u * u);
  const ePrime = gammaU * (energy - u * pc);
  return stub(gamma, energy, pc, invariant, ePrime);
}

function buildQ30Stub(): string {
  const cgA = Math.sqrt(2 / 3);
  const cgB = Math.sqrt(1 / 3);
  const pA = cgA * cgA;
  const pB = cgB * cgB;
  const orth = cgA * cgB + cgB * -cgA;
  return stub(cgA, cgB, pA, pB, orth);
}

function buildQ31Stub(): string {
  const hbar = 1.055e-34;
  const me = 9.11e-31;
  const e = 1.602e-19;
  const eps0 = 8.854e-12;
  const alphaTrial = 1.6e10;
  const a0 = 5.29e-11;
  const eTrialJ =
    (hbar ** 2 * alphaTrial ** 2) / (2 * me) - (e ** 2 * alphaTrial) / (4 * Math.PI * eps0);
  const eTrialEv = eTrialJ / e;
  const alphaStar = 1 / a0;
  const eMinJ =
    (hbar ** 2 * alphaStar ** 2) / (2 * me) - (e ** 2 * alphaStar) / (4 * Math.PI * eps0);
  const eMinEv = eMinJ / e;
  const gainEv = eMinEv - eTrialEv;
  return stub(alphaStar, eTrialEv, eMinJ, eMinEv, Math.abs(gainEv));
}

function buildQ32Stub(): string {
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
  return stub(e1Ev, e2Ev, eBoson, eFermion, deltaEv);
}

function buildQ33Stub(): string {
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
  return stub(vfi, rate, tau, pGamma);
}

function buildQ34Stub(): string {
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
  return stub(tc, a, h, m, fieldEnergy);
}

function buildQ35Stub(): string {
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
  return stub(u, uPerParticle, vRms, pRms, vAvg, eTotal);
}

function buildQ36Stub(): string {
  const a = 0.361e-9;
  const twoPiOverA = (2 * Math.PI) / a;
  const g111 = twoPiOverA * Math.sqrt(3);
  const g200 = twoPiOverA * 2;
  const aStar = (4 * Math.PI) / a;
  const d111Nm = (a / Math.sqrt(3)) * 1e9;
  const d200Nm = (a / 2) * 1e9;
  return stub(aStar * 1e-9, g111 * 1e-9, g200 * 1e-9, d111Nm, d200Nm);
}

function buildQ37Stub(): string {
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
  return stub(kF, eFEv, vF, gEv, ratio);
}

function buildQ38Stub(): string {
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
  return stub(kBz, e0Ev, eMinus, ePlus, gap);
}

function buildQ39Stub(): string {
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
  return stub(bv, bs, bc, bMeV, bPerA);
}

function buildQ40Stub(): string {
  const nA0 = 1e6;
  const t = 5;
  const lambdaA = Math.log(2) / 2;
  const lambdaB = Math.log(2) / 6;
  const nA = nA0 * Math.exp(-lambdaA * t);
  const nB =
    nA0 * (lambdaA / (lambdaB - lambdaA)) * (Math.exp(-lambdaA * t) - Math.exp(-lambdaB * t));
  const nC = nA0 - nA - nB;
  const aA_bq = (lambdaA * nA) / 3600;
  const aB_bq = (lambdaB * nB) / 3600;
  return stub(nA, nB, nC, aA_bq, aB_bq);
}

function buildQ41Stub(): string {
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
  return stub(fringes, phaseShift, fsr, finesse, linewidth);
}

function buildQ42Stub(): string {
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
  return stub(y1 * 100, yMin1 * 100, missingSpacing, centralVisibleOrders);
}

function buildQ43Stub(): string {
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
  return stub(photonEnergyEv, fracThree * 100, fracFour * 100, fractionRatio, pOut);
}

function buildQ44Stub(): string {
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
  return stub(g, phi, eLeft, eRight, jump);
}

function buildQ45Stub(): string {
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
  return stub(i1, i2, lambda1, lambda2, thetaDeg, sigmaEq);
}

function buildQ46Stub(): string {
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
  return stub(kMag, phi, sClassical, vClassical, eClassicalEv);
}

function buildQ47Stub(): string {
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
  return stub(v, reynolds, hLoss, deltaP, tauW, pumpPower);
}

function buildQ48Stub(): string {
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
  return stub(dxdt, dydt, dzdt, eq, divergence, tDouble);
}

function buildQ49Stub(): string {
  const massSolar = 10;
  const bKm = 200;
  const rsKm = 2.95 * massSolar;
  const rIscoKm = 3 * rsKm;
  const rPhotonKm = 1.5 * rsKm;
  const vFracC = 1 / Math.sqrt(6);
  const z = (1 - 1 / 4) ** -0.5 - 1;
  const alphaRad = (4 * (rsKm / 2)) / bKm;
  return stub(rsKm, rIscoKm, rPhotonKm, vFracC, z, alphaRad);
}

function buildQ50Stub(): string {
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
  return stub(lambdaMax, photonEnergyEv, x, bLambda, flux, luminosity);
}

const ALL_STUB_BUILDERS = [
  buildQ01Stub,
  buildQ02Stub,
  buildQ03Stub,
  buildQ04Stub,
  buildQ05Stub,
  buildQ06Stub,
  buildQ07Stub,
  buildQ08Stub,
  buildQ09Stub,
  buildQ10Stub,
  buildQ11Stub,
  buildQ12Stub,
  buildQ13Stub,
  buildQ14Stub,
  buildQ15Stub,
  buildQ16Stub,
  buildQ17Stub,
  buildQ18Stub,
  buildQ19Stub,
  buildQ20Stub,
  buildQ21Stub,
  buildQ22Stub,
  buildQ23Stub,
  buildQ24Stub,
  buildQ25Stub,
  buildQ26Stub,
  buildQ27Stub,
  buildQ28Stub,
  buildQ29Stub,
  buildQ30Stub,
  buildQ31Stub,
  buildQ32Stub,
  buildQ33Stub,
  buildQ34Stub,
  buildQ35Stub,
  buildQ36Stub,
  buildQ37Stub,
  buildQ38Stub,
  buildQ39Stub,
  buildQ40Stub,
  buildQ41Stub,
  buildQ42Stub,
  buildQ43Stub,
  buildQ44Stub,
  buildQ45Stub,
  buildQ46Stub,
  buildQ47Stub,
  buildQ48Stub,
  buildQ49Stub,
  buildQ50Stub,
] as const;

const hasGeminiKey = Boolean(
  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
);

describe('physics benchmark registry', () => {
  it('has exactly 50 specs with ids q01-q50 wired to solvers', () => {
    expect(PHYSICS_SPECS).toHaveLength(50);
    expect(PHYSICS_BENCHMARK_SOLVERS).toHaveLength(50);

    const expectedIds = Array.from({ length: 50 }, (_, i) => `q${String(i + 1).padStart(2, '0')}`);
    expect(PHYSICS_SPECS.map((spec) => spec.id)).toEqual(expectedIds);

    for (const spec of PHYSICS_SPECS) {
      expect(spec.verify).toBe(PHYSICS_BENCHMARK_SOLVERS[spec.number - 1]);
    }
  });
});

describe('independent verification Q01-Q50', () => {
  it.each(ALL_STUB_BUILDERS.map((buildStub, index) => [index + 1, buildStub] as const))(
    'Q%02i numeric stub passes verification',
    (number, buildStub) => {
      const verify = PHYSICS_BENCHMARK_SOLVERS[number - 1]!;
      const result = verify(buildStub());
      expect(result.ok, result.errors.join('; ')).toBe(true);
    },
  );
});

describe('AI fixtures', () => {
  const fixtureFiles = existsSync(FIXTURES_DIR)
    ? readdirSync(FIXTURES_DIR).filter((name) => /^q\d{2}\.stemlm$/i.test(name))
    : [];

  it('AI fixture experiment coverage', () => {
    const count = fixtureFiles.length;
    console.info(`${count}/50 AI-generated fixtures cached`);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  if (fixtureFiles.length === 0) {
    it('skips when no qNN.stemlm fixtures are cached', () => {
      expect(fixtureFiles).toHaveLength(0);
    });
    return;
  }

  it.each(fixtureFiles)('fixture %s passes verifyPhysicsCapsule', async (filename) => {
    const id = filename.replace(/\.stemlm$/i, '').toLowerCase();
    const spec = PHYSICS_SPECS.find((entry) => entry.id === id);
    expect(spec, `missing spec for ${filename}`).toBeDefined();

    const capsuleText = readFileSync(join(FIXTURES_DIR, filename), 'utf8');
    const report = await verifyPhysicsCapsule(spec!, capsuleText);
    expect(report.ok, report.errors.join('; ')).toBe(true);
  });
});

describe.skipIf(!hasGeminiKey)('live Gemini generation (Q01 only)', () => {
  it('generates non-empty capsule and logs verification without failing on verify errors', async () => {
    const spec = PHYSICS_SPECS[0]!;
    const text = await generatePhysicsCapsule(spec.question);
    expect(text.length).toBeGreaterThan(0);

    const report = await verifyPhysicsCapsule(spec, text);
    if (!report.ok) {
      console.warn(`Gemini Q01 verification issues (${report.errors.length}):`, report.errors);
    }
  }, 120_000);
});
