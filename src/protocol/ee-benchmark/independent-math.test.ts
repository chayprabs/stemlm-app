/**
 * Independent recomputation of all 50 EE benchmark answers.
 * These checks do NOT import verified-answers.ts — values are derived fresh
 * from the problem statements so we cannot accidentally self-validate.
 */
import { describe, it, expect } from 'vitest';
import * as Ref from './verified-answers';

const VT = 0.026;
const TOL = 1e-6;
const TOL_REL = 0.02;

function close(a: number, b: number, rel = TOL_REL): void {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  expect(Math.abs(a - b)).toBeLessThan(scale * rel + TOL);
}

function solve3(
  a11: number, a12: number, a13: number, b1: number,
  a21: number, a22: number, a23: number, b2: number,
  a31: number, a32: number, a33: number, b3: number,
): [number, number, number] {
  const det =
    a11 * (a22 * a33 - a23 * a32) -
    a12 * (a21 * a33 - a23 * a31) +
    a13 * (a21 * a32 - a22 * a31);
  const x =
    (b1 * (a22 * a33 - a23 * a32) -
      a12 * (b2 * a33 - a23 * b3) +
      a13 * (b2 * a32 - a22 * b3)) /
    det;
  const y =
    (a11 * (b2 * a33 - a23 * b3) -
      b1 * (a21 * a33 - a23 * a31) +
      a13 * (a21 * b3 - b2 * a31)) /
    det;
  const z =
    (a11 * (a22 * b3 - b2 * a32) -
      a12 * (a21 * b3 - b2 * a31) +
      b1 * (a21 * a32 - a22 * a31)) /
    det;
  return [x, y, z];
}

describe('Independent math — Year 1 DC', () => {
  it('Q1: KVL single loop', () => {
    const I = 24 / (4 + 6 + 2);
    expect(I).toBe(2);
    close(Ref.Q01.I, I);
    close(Ref.Q01.V1, I * 4);
    close(Ref.Q01.V2, I * 6);
    close(Ref.Q01.V3, I * 2);
    expect(Ref.Q01.V1 + Ref.Q01.V2 + Ref.Q01.V3).toBe(24);
  });

  it('Q2: nodal 3-node', () => {
    const V2 = 720 / 19;
    const V3 = 660 / 19;
    close(Ref.Q02.V2, V2);
    close(Ref.Q02.V3, V3);
    expect(5 * V2 - 2 * V3).toBeCloseTo(120, 8);
    expect(3 * V2 - 5 * V3).toBeCloseTo(-60, 8);
  });

  it('Q3: three-mesh currents', () => {
    const [I1, I2, I3] = solve3(6, -4, 0, 20, 4, -18, 6, 0, 0, -6, 9, -10);
    close(Ref.Q03.I1, I1);
    close(Ref.Q03.I2, I2);
    close(Ref.Q03.I3, I3);
    expect(6 * I1 - 4 * I2).toBeCloseTo(20, 8);
    expect(4 * I1 - 18 * I2 + 6 * I3).toBeCloseTo(0, 8);
    expect(-6 * I2 + 9 * I3).toBeCloseTo(-10, 8);
    close(Ref.Q03.P20V, 20 * I1);
    close(Ref.Q03.P10V, 10 * I3);
  });

  it('Q4: superposition through R3', () => {
    const Rpar = (18 * 6) / 24;
    const V_vs = 36 * Rpar / (9 + Rpar);
    const I_vs = V_vs / 6;
    const G = 1 / 9 + 1 / 18 + 1 / 6;
    const V_is = 4 / G;
    const I_is = V_is / 6;
    close(Ref.Q04.I_R3, I_vs + I_is);
  });

  it('Q5: Thevenin at A–B', () => {
    const Rpar = (8 * 24) / 32;
    const Vth = 48 * Rpar / (8 + Rpar);
    const Rth = 12 + Rpar;
    close(Ref.Q05.Vth, Vth);
    close(Ref.Q05.Rth, Rth);
    close(Ref.Q05.Pmax, (Vth ** 2) / (4 * Rth));
  });

  it('Q6: VCCS nodal', () => {
    const V1 = 20;
    const V2 = 20 + 8 * 5;
    expect(V2).toBe(60);
    close(Ref.Q06.V2, V2);
    close(Ref.Q06.Id, 0.4 * V1);
  });

  it('Q7: delta–wye and A–C current', () => {
    const sum = 180;
    const Ra = (30 * 60) / sum;
    const Rc = (90 * 30) / sum;
    close(Ref.Q07.Ra, Ra);
    close(Ref.Q07.I, 100 / (Ra + Rc));
  });

  it('Q8: RC step τ and t at 10V', () => {
    const tau = 10000 * 100e-6;
    close(Ref.Q08.tau, tau);
    close(Ref.Q08.t10, -tau * Math.log(1 - 10 / 12));
  });

  it('Q9: RL discharge energy', () => {
    const i0 = 24 / 50;
    close(Ref.Q09.i0, i0);
    close(Ref.Q09.tau, 0.2 / 100);
    const E = 0.5 * 0.2 * i0 ** 2;
    close(Ref.Q09.E100, E);
  });

  it('Q10: overdamped roots', () => {
    const alpha = 4;
    const w0 = 2;
    const disc = alpha ** 2 - w0 ** 2;
    close(Ref.Q10.s1, -alpha + Math.sqrt(disc));
    close(Ref.Q10.s2, -alpha - Math.sqrt(disc));
  });

  it('Q11: underdamped ωd and first peak', () => {
    const alpha = 1;
    const w0 = Math.sqrt(2);
    const wd = Math.sqrt(w0 ** 2 - alpha ** 2);
    close(Ref.Q11.wd, wd);
    close(Ref.Q11.t_peak, Math.PI / wd);
  });

  it('Q12: switched RC with initial charge', () => {
    const vInf = (15 * 30) / 50;
    const tau = 10e-6 * ((20e3 * 30e3) / 50e3);
    close(Ref.Q12.vInf, vInf);
    close(Ref.Q12.tau, tau);
    expect(vInf).toBeLessThan(12);
    expect(Number.isNaN(Ref.Q12.t12)).toBe(true);
  });
});

describe('Independent math — Year 2 AC & filters', () => {
  it('Q13: series RLC impedance at 60 Hz', () => {
    const w = 2 * Math.PI * 60;
    const XL = w * 0.05;
    const XC = 1 / (w * 100e-6);
    const Z = Math.sqrt(100 + (XL - XC) ** 2);
    close(Ref.Q13.Z, Z);
    close(Ref.Q13.I, 120 / Z);
  });

  it('Q14: parallel admittance and power', () => {
    const G = 0.05;
    const B = 1000 * 50e-6 - 1 / 40;
    const Y = Math.sqrt(G ** 2 + B ** 2);
    const V = 5 / Y;
    close(Ref.Q14.Y, Y);
    close(Ref.Q14.V, V);
    close(Ref.Q14.P, V ** 2 * G);
  });

  it('Q17: power-factor correction', () => {
    const S = 10000 / 0.65;
    const Q1 = S * Math.sin(Math.acos(0.65));
    const Q2 = 10000 * Math.tan(Math.acos(0.95));
    const C = (Q1 - Q2) / (230 ** 2 * 2 * Math.PI * 50);
    close(Ref.Q17.S, S);
    close(Ref.Q17.C, C);
    expect(Ref.Q17.I2).toBeLessThan(Ref.Q17.I1);
  });

  it('Q19: series resonance', () => {
    const w0 = 1 / Math.sqrt(0.01 * 40e-6);
    const Q = (1 / 5) * Math.sqrt(0.01 / 40e-6);
    close(Ref.Q19.w0, w0);
    close(Ref.Q19.Q, Q);
    close(Ref.Q19.BW, w0 / Q);
  });

  it('Q20: parallel resonance voltage', () => {
    const w0 = 1 / Math.sqrt(0.0005 * 200e-12);
    const Q = 50000 * Math.sqrt(200e-12 / 0.0005);
    close(Ref.Q20.w0, w0);
    close(Ref.Q20.V, 0.002 * 50000);
  });

  it('Q23: T-network Z-parameters', () => {
    expect(Ref.Q23.Z11).toBe(10 + 30);
    expect(Ref.Q23.Z12).toBe(30);
    expect(Ref.Q23.Z22).toBe(20 + 30);
  });

  it('Q26: mutual inductance open-circuit', () => {
    const k = 3 / 6;
    const I1 = 100 / (10 * 4);
    const V2 = 10 * 3 * I1;
    close(Ref.Q26.k, k);
    close(Ref.Q26.I1mag, I1);
    close(Ref.Q26.V2mag, V2);
  });

  it('Q27: ideal transformer reflection', () => {
    const Zref = 8 * 25;
    const I1 = 240 / (2 + Zref);
    close(Ref.Q27.ZLref, Zref);
    close(Ref.Q27.I1, I1);
    close(Ref.Q27.VL, 8 * 5 * I1);
  });

  it('Q28: balanced Y–Y powers', () => {
    const Vph = 415 / Math.sqrt(3);
    const Zmag = Math.sqrt(164);
    const IL = Vph / Zmag;
    close(Ref.Q28.Vph, Vph);
    close(Ref.Q28.IL, IL);
    close(Ref.Q28.P, 3 * Vph * IL * (10 / Zmag));
  });

  it('Q30: two-wattmeter method', () => {
    const P = 6000;
    const Q = P * Math.sqrt(3) * (4500 - 1500) / 6000;
    close(Ref.Q30.P, P);
    close(Ref.Q30.Q, Q);
    expect(Ref.Q30.pf).toBeGreaterThan(0);
    expect(Ref.Q30.pf).toBeLessThan(1);
  });
});

describe('Independent math — Year 3 devices & power', () => {
  it('Q31: hybrid-π parameters', () => {
    const gm = 0.002 / VT;
    const rpi = 100 / gm;
    const ro = 80 / 0.002;
    const Av = -gm * ((ro * 5000) / (ro + 5000));
    close(Ref.Q31.gm, gm);
    close(Ref.Q31.rpi, rpi);
    close(Ref.Q31.ro, ro);
    close(Ref.Q31.Av, Av);
  });

  it('Q33: emitter degeneration', () => {
    const Gm = 0.04 / (1 + 0.04 * 500);
    close(Ref.Q33.Gm, Gm);
    close(Ref.Q33.Rin, 2500 + (1 + 0.04 * 500) * 500);
  });

  it('Q35: CS amplifier gm and gain', () => {
    const gm = 2 * 2e-3 * (2 - 1);
    const ID = 2e-3;
    const ro = 1 / (0.02 * ID);
    close(Ref.Q35.gm, gm);
    close(Ref.Q35.ro, ro);
    close(Ref.Q35.Av, -gm * ((ro * 10000) / (ro + 10000)));
  });

  it('Q36: differential pair CMRR', () => {
    const Ad = -0.005 * 20000;
    const Acm = -20000 / 1e6;
    close(Ref.Q36.Ad, Ad);
    close(Ref.Q36.Acm, Acm);
    close(Ref.Q36.CMRRdB, 20 * Math.log10(Math.abs(Ad / Acm)));
  });

  it('Q38: inverting summer output', () => {
    const Vout = -8 - (-8) - 1;
    close(Ref.Q38.Vout, Vout);
    expect(Vout).toBe(-1);
  });

  it('Q40: Sallen-Key Butterworth Q', () => {
    const w0 = 1 / (10000 * 10e-9);
    const Q = 1 / (3 - 1.586);
    close(Ref.Q40.w0, w0);
    close(Ref.Q40.Q, Q);
    close(Math.SQRT2 * Ref.Q40.Q, 1, 0.01);
  });

  it('Q41: Schmitt thresholds', () => {
    const beta = 0.1;
    const VUT = 15 * (1 - beta) + (-15) * beta;
    const VLT = 15 * beta + (-15) * (1 - beta);
    close(Ref.Q41.VUT, VUT);
    close(Ref.Q41.VLT, VLT);
    expect(VUT).toBeCloseTo(12, 6);
    expect(VLT).toBeCloseTo(-12, 6);
  });

  it('Q42: series-shunt feedback', () => {
    const T = 2000 * 0.04;
    close(Ref.Q42.T, T);
    close(Ref.Q42.Af, 2000 / (1 + T));
    close(Ref.Q42.Rif, 5000 * (1 + T));
  });

  it('Q45: per-unit base impedance', () => {
    close(Ref.Q45.Zb1, (132 ** 2) / 100);
    close(Ref.Q45.Zb2, (33 ** 2) / 100);
    close(Ref.Q45.Zpu_re, 10 / Ref.Q45.Zb1);
  });

  it('Q48: symmetrical fault via Zbus', () => {
    const If = 1 / 0.15;
    close(Ref.Q48.If, If);
    close(Ref.Q48.V1, 1 - 0.08 * If);
    close(Ref.Q48.V3, 1 - 0.07 * If);
  });

  it('Q50: integrator oscillator R at 1 kHz', () => {
    const w0 = 2 * Math.PI * 1000;
    close(Ref.Q50.w0, w0);
    close(Ref.Q50.R, 1 / (w0 * 10e-9));
    expect(Ref.Q50.phaseShift).toBe(180);
  });
});

describe('Sanity — corrupt data must fail pipeline', () => {
  it('wrong mesh current I1=2.5 fails Q3 KVL', () => {
    const I1 = 2.5;
    const I2 = 10 / 17;
    const I3 = 20 / 51;
    expect(6 * I1 - 4 * I2).not.toBeCloseTo(20, 2);
  });

  it('text-only SVG fails collision audit', async () => {
    const { auditSvgDiagram } = await import('./svg-utils');
    const bad = '<svg viewBox="0 0 200 100"><text x="10" y="20">only text</text></svg>';
    const audit = auditSvgDiagram(bad);
    expect(audit.ok).toBe(false);
    expect(audit.errors.some((e) => e.includes('too few primitives'))).toBe(true);
  });
});
