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
import {
  PHYSICS_BENCHMARK_SOLVERS,
  solveQ26,
  solveQ27,
  solveQ28,
  solveQ29,
  solveQ30,
  solveQ31,
  solveQ32,
  solveQ33,
  solveQ34,
  solveQ35,
  solveQ36,
  solveQ37,
  solveQ38,
  solveQ39,
  solveQ40,
  solveQ41,
  solveQ42,
  solveQ43,
  solveQ44,
  solveQ45,
  solveQ46,
  solveQ47,
  solveQ48,
  solveQ49,
  solveQ50,
} from './solvers';
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

const EARLY_STUB_BUILDERS = [
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
] as const;

const LATE_SOLVERS = [
  [26, solveQ26],
  [27, solveQ27],
  [28, solveQ28],
  [29, solveQ29],
  [30, solveQ30],
  [31, solveQ31],
  [32, solveQ32],
  [33, solveQ33],
  [34, solveQ34],
  [35, solveQ35],
  [36, solveQ36],
  [37, solveQ37],
  [38, solveQ38],
  [39, solveQ39],
  [40, solveQ40],
  [41, solveQ41],
  [42, solveQ42],
  [43, solveQ43],
  [44, solveQ44],
  [45, solveQ45],
  [46, solveQ46],
  [47, solveQ47],
  [48, solveQ48],
  [49, solveQ49],
  [50, solveQ50],
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

describe('independent verification Q01-Q25', () => {
  it.each(EARLY_STUB_BUILDERS.map((buildStub, index) => [index + 1, buildStub] as const))(
    'Q%02i numeric stub passes verification',
    (number, buildStub) => {
      const verify = PHYSICS_BENCHMARK_SOLVERS[number - 1];
      const result = verify(buildStub());
      expect(result.ok, result.errors.join('; ')).toBe(true);
    },
  );
});

describe('independent verification Q26-Q50', () => {
  it.each(LATE_SOLVERS)('Q%i solver capsule passes verification', (number, solve) => {
    const verify = PHYSICS_BENCHMARK_SOLVERS[number - 1];
    const result = verify(solve().capsule);
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });
});

describe('AI fixtures', () => {
  const fixtureFiles = existsSync(FIXTURES_DIR)
    ? readdirSync(FIXTURES_DIR).filter((name) => /^q\d{2}\.stemlm$/i.test(name))
    : [];

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
