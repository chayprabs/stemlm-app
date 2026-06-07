import { describe, expect, it } from 'vitest';
import {
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

function expectFixed(capsule: string, label: string, value: number, digits: number): void {
  expect(capsule).toContain(`${label}=${value.toFixed(digits)}`);
}

function expectExp(capsule: string, label: string, value: number, digits: number): void {
  expect(capsule).toContain(`${label}=${value.toExponential(digits)}`);
}

describe('Independent recomputation for physics benchmark Q26-Q50', () => {
  it('Q26 Fermi-Dirac values appear in capsule text', () => {
    const out = solveQ26();
    const x = (0.2 - 0.1) / (8.617e-5 * 300);
    const fFD = 1 / (Math.exp(x) + 1);
    const fBE = 1 / (Math.exp(x) - 1);
    const fMB = Math.exp(-x);
    const delta = (fBE - fFD) / fMB;
    expectFixed(out.capsule, 'x', x, 2);
    expectFixed(out.capsule, 'fFD', fFD, 4);
    expectFixed(out.capsule, 'fBE', fBE, 4);
    expectFixed(out.capsule, 'fMB', fMB, 4);
    expectFixed(out.capsule, 'delta', delta, 3);
  });

  it('Q27 Larmor values appear in capsule text', () => {
    const out = solveQ27();
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
    expectExp(out.capsule, 'omega', omega, 2);
    expectExp(out.capsule, 'a', a, 2);
    expectExp(out.capsule, 'power', power, 2);
    expectExp(out.capsule, 'dE', dE, 2);
    expectExp(out.capsule, 'pGamma', pGamma, 2);
  });

  it('Q28 dipole-radiation values appear in capsule text', () => {
    const out = solveQ28();
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
    expectExp(out.capsule, 'tDelay', tDelay, 2);
    expectFixed(out.capsule, 'k', k, 2);
    expectExp(out.capsule, 'E0', e0, 2);
    expectExp(out.capsule, 'B0', b0, 2);
    expectExp(out.capsule, 'Savg', sAvg, 2);
  });

  it('Q29 relativity values appear in capsule text', () => {
    const out = solveQ29();
    const beta = 0.8;
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    const mc2 = 0.511;
    const energy = gamma * mc2;
    const pc = gamma * beta * mc2;
    const invariant = energy ** 2 - pc ** 2;
    const u = 0.6;
    const gammaU = 1 / Math.sqrt(1 - u * u);
    const ePrime = gammaU * (energy - u * pc);
    expectFixed(out.capsule, 'gamma', gamma, 3);
    expectFixed(out.capsule, 'E', energy, 3);
    expectFixed(out.capsule, 'pc', pc, 3);
    expectFixed(out.capsule, 'invariant', invariant, 3);
    expectFixed(out.capsule, 'Eprime', ePrime, 3);
  });

  it('Q30 Clebsch-Gordan values appear in capsule text', () => {
    const out = solveQ30();
    const cgA = Math.sqrt(2 / 3);
    const cgB = Math.sqrt(1 / 3);
    const pA = cgA * cgA;
    const pB = cgB * cgB;
    const orth = cgA * cgB + cgB * -cgA;
    expectFixed(out.capsule, 'cgA', cgA, 3);
    expectFixed(out.capsule, 'cgB', cgB, 3);
    expectFixed(out.capsule, 'pA', pA, 3);
    expectFixed(out.capsule, 'pB', pB, 3);
    expectFixed(out.capsule, 'orth', orth, 3);
  });

  it('Q31 variational-hydrogen values appear in capsule text', () => {
    const out = solveQ31();
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
    expectExp(out.capsule, 'alphaStar', alphaStar, 2);
    expectFixed(out.capsule, 'EtrialEv', eTrialEv, 1);
    expectExp(out.capsule, 'EminJ', eMinJ, 2);
    expectFixed(out.capsule, 'EminEv', eMinEv, 1);
    expectFixed(out.capsule, 'deltaEv', gainEv, 1);
  });

  it('Q32 identical-particles values appear in capsule text', () => {
    const out = solveQ32();
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
    expectFixed(out.capsule, 'E1', e1Ev, 3);
    expectFixed(out.capsule, 'E2', e2Ev, 2);
    expectFixed(out.capsule, 'Eboson', eBoson, 3);
    expectFixed(out.capsule, 'Efermion', eFermion, 2);
    expectFixed(out.capsule, 'deltaEv', deltaEv, 2);
  });

  it('Q33 golden-rule values appear in capsule text', () => {
    const out = solveQ33();
    const hbar = 1.055e-34;
    const dfi = 3e-29;
    const e0Field = 5e3;
    const rho = 2e20;
    const deltaE = 1.89 * 1.602e-19;
    const vfi = dfi * e0Field;
    const rate = (2 * Math.PI / hbar) * vfi ** 2 * rho;
    const tau = 1 / rate;
    const pGamma = deltaE / 3e8;
    expectExp(out.capsule, 'Vfi', vfi, 2);
    expectExp(out.capsule, 'W', rate, 2);
    expectExp(out.capsule, 'tau', tau, 2);
    expectExp(out.capsule, 'pGamma', pGamma, 2);
  });

  it('Q34 Ising values appear in capsule text', () => {
    const out = solveQ34();
    const kB = 1.38e-23;
    const tc = (4 * 1.2e-21) / kB;
    const a = (4 * 1.2e-21) / (kB * 400);
    const h = (9.27e-24 * 0.05) / (kB * 400);
    const m = h / (1 - a);
    const fieldEnergy = 9.27e-24 * 0.05 * m;
    expectFixed(out.capsule, 'Tc', tc, 0);
    expectFixed(out.capsule, 'A', a, 3);
    expectExp(out.capsule, 'h', h, 2);
    expectExp(out.capsule, 'm', m, 2);
    expectExp(out.capsule, 'muBm', fieldEnergy, 2);
  });

  it('Q35 equipartition values appear in capsule text', () => {
    const out = solveQ35();
    const kB = 1.38e-23;
    const u = 1.5 * 2e23 * kB * 350;
    const uPerParticle = u / 2e23;
    const vRms = Math.sqrt((3 * kB * 350) / 6.63e-26);
    const pRms = 6.63e-26 * vRms;
    const vAvg = -2 * 4e-20;
    const eTotal = 4e-20 + vAvg;
    expectExp(out.capsule, 'U', u, 2);
    expectExp(out.capsule, 'Uper', uPerParticle, 2);
    expectExp(out.capsule, 'vrms', vRms, 2);
    expectExp(out.capsule, 'prms', pRms, 2);
    expectExp(out.capsule, 'Vavg', vAvg, 2);
    expectExp(out.capsule, 'Etotal', eTotal, 2);
  });

  it('Q36 reciprocal-lattice values appear in capsule text', () => {
    const out = solveQ36();
    const a = 0.361e-9;
    const twoPiOverA = (2 * Math.PI) / a;
    const aStar = (4 * Math.PI) / a;
    const g111 = twoPiOverA * Math.sqrt(3);
    const g200 = twoPiOverA * 2;
    const d111Nm = (a / Math.sqrt(3)) * 1e9;
    const d200Nm = (a / 2) * 1e9;
    expectFixed(out.capsule, 'aStarNmInv', aStar * 1e-9, 1);
    expectFixed(out.capsule, 'G111NmInv', g111 * 1e-9, 1);
    expectFixed(out.capsule, 'G200NmInv', g200 * 1e-9, 1);
    expectFixed(out.capsule, 'd111nm', d111Nm, 3);
    expectFixed(out.capsule, 'd200nm', d200Nm, 4);
  });

  it('Q37 DOS values appear in capsule text', () => {
    const out = solveQ37();
    const hbar = 1.055e-34;
    const me = 9.11e-31;
    const e = 1.602e-19;
    const n = 8.47e28;
    const kF = (3 * Math.PI ** 2 * n) ** (1 / 3);
    const eFJ = (hbar ** 2 * kF ** 2) / (2 * me);
    const eFEv = eFJ / e;
    const vF = (hbar * kF) / me;
    const gJ = (3 * n) / (2 * eFJ);
    const gEv = gJ * e;
    const ratio = (8.617e-5 * 300) / eFEv;
    expectExp(out.capsule, 'kF', kF, 2);
    expectFixed(out.capsule, 'EF', eFEv, 2);
    expectExp(out.capsule, 'vF', vF, 2);
    expectExp(out.capsule, 'gEF_eV', gEv, 2);
    expectExp(out.capsule, 'kT_over_EF', ratio, 2);
  });

  it('Q38 band-gap values appear in capsule text', () => {
    const out = solveQ38();
    const hbar = 1.055e-34;
    const me = 9.11e-31;
    const kBoundary = Math.PI / (0.3e-9);
    const e0Ev = ((hbar ** 2 * kBoundary ** 2) / (2 * me)) / 1.602e-19;
    const eMinus = e0Ev - 0.2;
    const ePlus = e0Ev + 0.2;
    const gap = ePlus - eMinus;
    const gapOverKt = gap / (8.617e-5 * 300);
    expectExp(out.capsule, 'kBoundary', kBoundary, 2);
    expectFixed(out.capsule, 'E0', e0Ev, 2);
    expectFixed(out.capsule, 'Eminus', eMinus, 2);
    expectFixed(out.capsule, 'Eplus', ePlus, 2);
    expectFixed(out.capsule, 'gap', gap, 2);
    expectFixed(out.capsule, 'gapOverkT', gapOverKt, 1);
  });

  it('Q39 Bethe-Weizsaecker values appear in capsule text', () => {
    const out = solveQ39();
    const A = 56;
    const Z = 26;
    const a13 = A ** (1 / 3);
    const a23 = a13 ** 2;
    const bv = 15.8 * A;
    const bs = 18.3 * a23;
    const bc = (0.714 * Z * (Z - 1)) / a13;
    const ba = (23.2 * (A - 2 * Z) ** 2) / A;
    const delta = 12 / Math.sqrt(A);
    const bTotal = bv - bs - bc - ba + delta;
    const bPerA = bTotal / A;
    expectFixed(out.capsule, 'Bv', bv, 1);
    expectFixed(out.capsule, 'Bs', bs, 1);
    expectFixed(out.capsule, 'Bc', bc, 1);
    expectFixed(out.capsule, 'Ba', ba, 2);
    expectFixed(out.capsule, 'delta', delta, 2);
    expectFixed(out.capsule, 'Btotal', bTotal, 1);
    expectFixed(out.capsule, 'BperA', bPerA, 2);
  });

  it('Q40 decay-chain values appear in capsule text', () => {
    const out = solveQ40();
    const nA0 = 1e6;
    const t = 5;
    const lambdaA = Math.log(2) / 2;
    const lambdaB = Math.log(2) / 6;
    const nA = nA0 * Math.exp(-lambdaA * t);
    const nB =
      nA0 * (lambdaA / (lambdaB - lambdaA)) * (Math.exp(-lambdaA * t) - Math.exp(-lambdaB * t));
    const nC = nA0 - nA - nB;
    const aA = (lambdaA * nA) / 3600;
    const aB = (lambdaB * nB) / 3600;
    expectExp(out.capsule, 'NA', nA, 2);
    expectExp(out.capsule, 'NB', nB, 2);
    expectExp(out.capsule, 'NC', nC, 2);
    expectFixed(out.capsule, 'AA_Bq', aA, 1);
    expectFixed(out.capsule, 'AB_Bq', aB, 1);
  });

  it('Q41 interferometry values appear in capsule text', () => {
    const out = solveQ41();
    const fringes = (2 * 0.4e-6) / 632.8e-9;
    const phaseShift = 2 * Math.PI * fringes;
    const fsr = 3e8 / (2 * 5e-3);
    const finesse = (Math.PI * Math.sqrt(0.85)) / (1 - 0.85);
    const linewidth = fsr / finesse;
    const fringeScaleNm = (632.8e-9 / 2) * 1e9;
    expectFixed(out.capsule, 'fringes', fringes, 2);
    expectFixed(out.capsule, 'phaseShift', phaseShift, 2);
    expectFixed(out.capsule, 'FSR_GHz', fsr / 1e9, 1);
    expectFixed(out.capsule, 'finesse', finesse, 1);
    expectFixed(out.capsule, 'linewidth_GHz', linewidth / 1e9, 2);
    expectFixed(out.capsule, 'fringeScale_nm', fringeScaleNm, 1);
  });

  it('Q42 diffraction values appear in capsule text', () => {
    const out = solveQ42();
    const y1Cm = 2 * Math.tan(Math.asin(500e-9 / 40e-6)) * 100;
    const yMinCm = 2 * Math.tan(Math.asin(500e-9 / 20e-6)) * 100;
    expectFixed(out.capsule, 'y1_cm', y1Cm, 2);
    expectFixed(out.capsule, 'yMin1_cm', yMinCm, 2);
    expect(out.capsule).toContain('missingOrderRule_m=2p');
    expect(out.capsule).toContain('centralVisibleOrders=3');
  });

  it('Q43 laser values appear in capsule text', () => {
    const out = solveQ43();
    const photonEnergyJ = (6.626e-34 * 3e8) / 632.8e-9;
    const photonEnergyEv = photonEnergyJ / 1.602e-19;
    const fracThree = ((5e18 + 2e16) / 2) / 5e18;
    const fracFour = 2e16 / 5e18;
    const ratio = fracThree / fracFour;
    const pOut = 0.65 * (8 - 2);
    const photonRate = pOut / photonEnergyJ;
    expectFixed(out.capsule, 'photonEnergy_eV', photonEnergyEv, 2);
    expect(out.capsule).toContain(`threeLevelFraction=${(fracThree * 100).toFixed(1)}%`);
    expect(out.capsule).toContain(`fourLevelFraction=${(fracFour * 100).toFixed(2)}%`);
    expectFixed(out.capsule, 'fractionRatio', ratio, 1);
    expectFixed(out.capsule, 'Pout', pOut, 2);
    expectExp(out.capsule, 'photonRate', photonRate, 2);
  });

  it('Q44 Green-function values appear in capsule text', () => {
    const out = solveQ44();
    const eps0 = 8.854e-12;
    const g = 0.3 * (0.9 - 0.6) / 0.9;
    const phi = (2e-9 * g) / eps0;
    const eLeft = (-2e-9 * (0.9 - 0.3)) / (eps0 * 0.9);
    const eRight = (2e-9 * 0.3) / (eps0 * 0.9);
    const jump = eRight - eLeft;
    expectFixed(out.capsule, 'G_x0', g, 2);
    expectFixed(out.capsule, 'phi_x06', phi, 1);
    expectFixed(out.capsule, 'E_left', eLeft, 1);
    expectFixed(out.capsule, 'E_right', eRight, 1);
    expectFixed(out.capsule, 'fieldJump', jump, 1);
  });

  it('Q45 stress-tensor values appear in capsule text', () => {
    const out = solveQ45();
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
    expectFixed(out.capsule, 'I1', i1, 0);
    expectFixed(out.capsule, 'I2', i2, 0);
    expectFixed(out.capsule, 'lambda1', lambda1, 2);
    expectFixed(out.capsule, 'lambda2', lambda2, 2);
    expectFixed(out.capsule, 'thetaDeg', thetaDeg, 2);
    expectFixed(out.capsule, 'sigmaEq', sigmaEq, 1);
  });

  it('Q46 path-integral values appear in capsule text', () => {
    const out = solveQ46();
    const m = 9.11e-31;
    const hbar = 1.055e-34;
    const dx = 1e-9;
    const t = 1e-15;
    const kMag = Math.sqrt(m / (2 * Math.PI * hbar * t));
    const phi = (m * dx ** 2) / (2 * hbar * t);
    const sClassical = (m * dx ** 2) / (2 * t);
    const vClassical = dx / t;
    const eClassicalEv = (0.5 * m * vClassical ** 2) / 1.602e-19;
    expectExp(out.capsule, 'Kmag', kMag, 2);
    expectFixed(out.capsule, 'phi', phi, 2);
    expectExp(out.capsule, 'Sclassical', sClassical, 2);
    expectExp(out.capsule, 'vClassical', vClassical, 2);
    expectFixed(out.capsule, 'Eclassical_eV', eClassicalEv, 2);
  });

  it('Q47 Navier-Stokes values appear in capsule text', () => {
    const out = solveQ47();
    const area = (Math.PI * 0.05 ** 2) / 4;
    const v = 2.5e-3 / area;
    const re = (1000 * v * 0.05) / 1e-3;
    const hLoss = 0.02 * (12 / 0.05) * (v ** 2 / (2 * 9.81));
    const deltaP = 1000 * 9.81 * hLoss;
    const tauW = (0.02 * 1000 * v ** 2) / 8;
    const pumpPower = deltaP * 2.5e-3;
    expectFixed(out.capsule, 'v', v, 2);
    expectExp(out.capsule, 'Re', re, 2);
    expectFixed(out.capsule, 'hLoss', hLoss, 3);
    expectFixed(out.capsule, 'deltaP_kPa', deltaP / 1000, 2);
    expectFixed(out.capsule, 'tauW', tauW, 2);
    expectFixed(out.capsule, 'pumpPower', pumpPower, 2);
  });

  it('Q48 Lorenz values appear in capsule text', () => {
    const out = solveQ48();
    const beta = 8 / 3;
    const eq = Math.sqrt(beta * (28 - 1));
    const divergence = -10 - 1 - beta;
    const tDouble = Math.log(2) / 0.9;
    const t10x = Math.log(10) / 0.9;
    expectFixed(out.capsule, 'dxdt', 0, 0);
    expectFixed(out.capsule, 'dydt', 26, 0);
    expectFixed(out.capsule, 'dzdt', 1 - beta, 2);
    expectFixed(out.capsule, 'eq', eq, 2);
    expectFixed(out.capsule, 'divergence', divergence, 2);
    expectFixed(out.capsule, 'tDouble', tDouble, 2);
    expectFixed(out.capsule, 't10x', t10x, 2);
  });

  it('Q49 Schwarzschild values appear in capsule text', () => {
    const out = solveQ49();
    const rs = 2.95 * 10;
    const rIsco = 3 * rs;
    const rPhoton = 1.5 * rs;
    const vFrac = 1 / Math.sqrt(6);
    const z = (1 - 1 / 4) ** -0.5 - 1;
    const freqFactor = 1 / (1 + z);
    const alphaRad = (4 * (rs / 2)) / 200;
    const alphaDeg = (alphaRad * 180) / Math.PI;
    expectFixed(out.capsule, 'rs_km', rs, 1);
    expectFixed(out.capsule, 'rISCO_km', rIsco, 1);
    expectFixed(out.capsule, 'rPhoton_km', rPhoton, 1);
    expectFixed(out.capsule, 'vISCO_over_c', vFrac, 3);
    expectFixed(out.capsule, 'z', z, 3);
    expectFixed(out.capsule, 'freqFactor', freqFactor, 3);
    expectFixed(out.capsule, 'alphaRad', alphaRad, 3);
    expectFixed(out.capsule, 'alphaDeg', alphaDeg, 1);
  });

  it('Q50 blackbody values appear in capsule text', () => {
    const out = solveQ50();
    const h = 6.626e-34;
    const c = 3e8;
    const kB = 1.38e-23;
    const sigma = 5.67e-8;
    const t = 5800;
    const lambdaMax = 2.898e-3 / t;
    const photonEnergyEv = ((h * c) / lambdaMax) / 1.602e-19;
    const x = (h * c) / (500e-9 * kB * t);
    const numerator = (2 * h * c ** 2) / (500e-9) ** 5;
    const bLambda = numerator / (Math.exp(x) - 1);
    const flux = sigma * t ** 4;
    const luminosity = 4 * Math.PI * (6.96e8) ** 2 * flux;
    expectExp(out.capsule, 'lambdaMax', lambdaMax, 3);
    expectFixed(out.capsule, 'photonEnergy_eV', photonEnergyEv, 2);
    expectFixed(out.capsule, 'planckX', x, 2);
    expectExp(out.capsule, 'B_lambda', bLambda, 2);
    expectExp(out.capsule, 'flux', flux, 2);
    expectExp(out.capsule, 'luminosity', luminosity, 2);
  });
});

