/**
 * Dynamic SVG diagram generator for EE benchmark problems.
 *
 * renderDiagram(spec, solution, stepIndex?) dispatches on spec.kind and
 * produces an SVG string driven entirely by spec.params and solution.computed.
 * Every diagram satisfies the electrical audit: ≥3 SVG primitives and ≥2 text
 * labels, with no text-only fallbacks.
 *
 * Import spec types from ./spec-types; EESolution is defined there as well.
 */
import type { EEProblemSpec, EESolution } from './spec-types';
import {
  wrapSvg,
  wire,
  vSource,
  ground,
  node,
  resistorH,
  resistorV,
  capacitorH,
  inductorH,
  currentArrow,
  equationPanel,
  seriesLoopCircuit,
} from './circuit-svg';

// ── Formatting helpers ───────────────────────────────────────────────────────

/** Format a number to 4 significant figures, with optional unit suffix. */
function fmt(n: number | undefined | null, unit = ''): string {
  if (n == null || !isFinite(n)) return '?';
  const s = parseFloat(n.toPrecision(4)).toString();
  return unit ? `${s}\u202f${unit}` : s;
}

/** Read a value from the solution's computed map, defaulting to 0. */
function sv(sol: EESolution, key: string): number {
  return sol.computed[key] ?? 0;
}

// ── Bode magnitude computation ───────────────────────────────────────────────

/**
 * Compute |H(jω)| in dB for a system with real break frequencies.
 * poles/zeros are positive real frequencies (rad/s) in the denominator/numerator
 * of (1 + jω/ωn) form.
 */
function bodeMagdB(omega: number, gain: number, poles: number[], zeros: number[]): number {
  let mag = Math.abs(gain);
  for (const z of zeros) {
    if (z > 0) mag *= Math.sqrt(1 + (omega / z) ** 2);
  }
  for (const p of poles) {
    if (p > 0) mag /= Math.sqrt(1 + (omega / p) ** 2);
  }
  return mag > 0 ? 20 * Math.log10(mag) : -120;
}

// ── Bode plot SVG builder ────────────────────────────────────────────────────

function buildBodePlot(
  title: string,
  gain: number,
  poles: number[],
  zeros: number[],
  evalAt?: number,
): string {
  const w = 440, h = 230;
  const xL = 58, xR = w - 18, yT = 28, yB = h - 38;

  const allFreqs = [...poles, ...zeros, ...(evalAt ? [evalAt] : [])].filter(f => f > 0);
  const omegaMin = allFreqs.length ? Math.min(...allFreqs) / 10 : 1;
  const omegaMax = allFreqs.length ? Math.max(...allFreqs) * 20 : 1e5;
  const logMin = Math.log10(Math.max(omegaMin, 1e-9));
  const logMax = Math.log10(Math.max(omegaMax, omegaMin * 100));

  const N = 100;
  const dbArr: number[] = [];
  for (let i = 0; i <= N; i++) {
    const omega = Math.pow(10, logMin + (i / N) * (logMax - logMin));
    dbArr.push(bodeMagdB(omega, gain, poles, zeros));
  }
  const finiteDb = dbArr.filter(isFinite);
  let dbLo = finiteDb.length ? Math.min(...finiteDb) : -40;
  let dbHi = finiteDb.length ? Math.max(...finiteDb) : 20;
  const span = dbHi - dbLo || 40;
  dbLo -= span * 0.1;
  dbHi += span * 0.1;
  if (dbHi - dbLo < 20) { dbHi += 10; dbLo -= 10; }

  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const db = dbArr[i]!;
    if (!isFinite(db)) continue;
    const omega = Math.pow(10, logMin + (i / N) * (logMax - logMin));
    const x = xL + ((Math.log10(omega) - logMin) / (logMax - logMin)) * (xR - xL);
    const y = yB - ((db - dbLo) / (dbHi - dbLo)) * (yB - yT);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // 0 dB reference line y-coordinate
  const y0 = yB - ((0 - dbLo) / (dbHi - dbLo)) * (yB - yT);
  const refLine =
    y0 >= yT && y0 <= yB
      ? `<line x1="${xL}" y1="${y0.toFixed(1)}" x2="${xR}" y2="${y0.toFixed(1)}" stroke="#ccc" stroke-width="1" stroke-dasharray="4,3"/>`
      : '';

  const dcDb = 20 * Math.log10(Math.abs(gain));
  const parts: string[] = [
    `<line x1="${xL}" y1="${yT}" x2="${xL}" y2="${yB}" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="${xL}" y1="${yB}" x2="${xR}" y2="${yB}" stroke="#333" stroke-width="1.5"/>`,
    refLine,
    `<text x="${(xL + xR) / 2}" y="${h - 9}" font-size="10" text-anchor="middle">\u03c9 (rad/s) \u2014 log scale</text>`,
    `<text x="14" y="${(yT + yB) / 2 + 4}" font-size="10" text-anchor="middle" transform="rotate(-90,14,${(yT + yB) / 2})">\u2758H\u2758 dB</text>`,
    `<text x="${(xL + xR) / 2}" y="18" font-size="12" text-anchor="middle" font-weight="bold">${title}</text>`,
    pts.length >= 2 ? `<polyline points="${pts.join(' ')}" fill="none" stroke="#1565c0" stroke-width="2"/>` : '',
    `<text x="${xL + 4}" y="${yT + 12}" font-size="9" fill="#555">G=${fmt(gain)}\u2009DC=${fmt(dcDb)}dB</text>`,
  ];

  if (poles.length > 0) {
    parts.push(`<text x="${xL + 4}" y="${yT + 24}" font-size="9" fill="#c00">pole@${fmt(poles[0])}r/s</text>`);
  }
  if (zeros.length > 0) {
    parts.push(`<text x="${xL + 4}" y="${yT + 36}" font-size="9" fill="#070">zero@${fmt(zeros[0])}r/s</text>`);
  }

  if (evalAt && evalAt > 0) {
    const db = bodeMagdB(evalAt, gain, poles, zeros);
    if (isFinite(db)) {
      const x = xL + ((Math.log10(evalAt) - logMin) / (logMax - logMin)) * (xR - xL);
      const y = yB - ((db - dbLo) / (dbHi - dbLo)) * (yB - yT);
      parts.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="none" stroke="#d32f2f" stroke-width="1.5"/>`,
        `<text x="${x.toFixed(1)}" y="${(y - 8).toFixed(1)}" font-size="9" fill="#d32f2f" text-anchor="middle">${fmt(db)}dB</text>`,
      );
    }
  }

  return wrapSvg(parts.join(''), w, h);
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Render an SVG diagram for the given spec/solution pair.
 * All labels and values are derived from spec.params and sol.computed;
 * no question IDs or hardcoded answers are used.
 */
export function renderDiagram(spec: EEProblemSpec, sol: EESolution, _stepIndex?: number): string {
  switch (spec.kind) {
    // ─────────────────────────────────────────────────────────────────────────
    // KVL / Nodal / Mesh
    // ─────────────────────────────────────────────────────────────────────────
    case 'kvl-series-loop': {
      const p = spec.params;
      return seriesLoopCircuit(
        `${fmt(p.Vs)}V`,
        p.resistors.map((r, i) => ({
          label: `${r.label}=${fmt(r.ohms)}\u03a9`,
          vDrop: `${fmt(sv(sol, `V_R${i + 1}`))}V`,
        })),
      );
    }

    case 'nodal-analysis': {
      const p = spec.params;
      const count = Math.min(p.nodeCount, 4);
      const xs = [70, 170, 270, 370].slice(0, count);
      const yT = 58, yB = 190;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const vVal =
          p.fixedVoltages[i + 1] !== undefined
            ? fmt(p.fixedVoltages[i + 1])
            : fmt(sv(sol, `V${i + 1}`));
        parts.push(node(xs[i]!, yT, `V${i + 1}=${vVal}V`));
        parts.push(wire(xs[i]!, yT, xs[i]!, yB));
        parts.push(ground(xs[i]!, yB));
      }
      p.resistors.forEach(([n1, n2, R], idx) => {
        const x1 = xs[(n1 ?? 1) - 1] ?? xs[0]!;
        const x2 = xs[(n2 ?? 2) - 1] ?? xs[1]!;
        if (x1 !== x2) {
          parts.push(
            resistorH(
              Math.min(x1, x2) + 6,
              yT - 22,
              Math.abs(x2 - x1) - 12,
              `R${idx + 1}=${fmt(R)}\u03a9`,
            ),
          );
        }
      });
      if (p.currentSources?.length) {
        const [fromN, I] = p.currentSources[0]!;
        const xCs = xs[(fromN ?? 1) - 1] ?? xs[0]!;
        parts.push(currentArrow(xCs, yT + 60, xCs, yT + 30, `${fmt(I)}A`));
      }
      return wrapSvg(parts.join(''), 450, 220);
    }

    case 'mesh-analysis': {
      const p = spec.params;
      const xL = 40, xM = 200, xR = 365;
      const yT = 45, yB = 185;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs[0] ?? 0)}V`));
      parts.push(resistorH(xL + 36, yT, 80, `Z11=${fmt(p.selfZ[0])}\u03a9`));
      parts.push(wire(xL + 116, yT, xM, yT));
      parts.push(resistorV(xM, yT, yB - yT, `Z12=${fmt(p.mutualZ[0]?.[2] ?? 0)}\u03a9`));
      parts.push(wire(xM, yT, xM + 40, yT));
      parts.push(resistorH(xM + 40, yT, 65, `Z22=${fmt(p.selfZ[1] ?? 0)}\u03a9`));
      parts.push(wire(xM + 105, yT, xR, yT));
      if (p.meshCount >= 2) {
        parts.push(vSource(xR, yT, yB, `${fmt(p.Vs[1] ?? 0)}V`));
      } else {
        parts.push(wire(xR, yT, xR, yB));
      }
      parts.push(wire(xL, yB, xR, yB));
      parts.push(currentArrow(xL + 40, yT + 75, xL + 80, yT + 75, `I\u2081=${fmt(sv(sol, 'I1'))}A`));
      if (p.meshCount >= 2) {
        parts.push(currentArrow(xM + 40, yT + 75, xM + 80, yT + 75, `I\u2082=${fmt(sv(sol, 'I2'))}A`));
      }
      return wrapSvg(parts.join(''), 440, 220);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Superposition / Thevenin / Dependent Source
    // ─────────────────────────────────────────────────────────────────────────
    case 'superposition': {
      const p = spec.params;
      const xL = 40, xM1 = 120, xM2 = 210, xR = 340;
      const yT = 48, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `Vs=${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xM1 - 8, yT));
      parts.push(resistorH(xM1 - 8, yT, 58, `R1=${fmt(p.R1)}\u03a9`));
      parts.push(wire(xM1 + 50, yT, xM2, yT));
      parts.push(resistorV(xM2, yT, yB - yT, `R2=${fmt(p.R2)}\u03a9`));
      parts.push(wire(xM2, yT, xM2 + 18, yT));
      parts.push(resistorH(xM2 + 18, yT, 58, `R3=${fmt(p.R3)}\u03a9`));
      parts.push(wire(xM2 + 76, yT, xR, yT));
      parts.push(currentArrow(xR, yB - 4, xR, yT + 4, `Is=${fmt(p.Is)}A`));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(
        `<text x="195" y="210" font-size="10" text-anchor="middle" fill="#1565c0">V_R3=${fmt(sv(sol, 'V_R3'))}V</text>`,
      );
      return wrapSvg(parts.join(''), 400, 220);
    }

    case 'thevenin-norton': {
      const p = spec.params;
      const xL = 40, xR = 330;
      const yT = 48, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(resistorH(xL + 28, yT, 58, `R1=${fmt(p.R1)}\u03a9`));
      parts.push(wire(xL + 86, yT, xL + 106, yT));
      parts.push(resistorV(xL + 106, yT, yB - yT, `R2=${fmt(p.R2)}\u03a9`));
      parts.push(resistorH(xL + 106, yT, 58, `R3=${fmt(p.R3)}\u03a9`));
      parts.push(wire(xL + 164, yT, xR, yT));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(node(xR, yT, `${p.terminalLabel}+`));
      parts.push(node(xR, yB, `${p.terminalLabel}\u2212`));
      parts.push(`<text x="${xR + 8}" y="98" font-size="10">Vth=${fmt(sv(sol, 'Vth'))}V</text>`);
      parts.push(`<text x="${xR + 8}" y="113" font-size="10">Rth=${fmt(sv(sol, 'Rth'))}\u03a9</text>`);
      return wrapSvg(parts.join(''), 440, 220);
    }

    case 'dependent-source-nodal': {
      const p = spec.params;
      const xL = 40, xM = 180, xR = 340;
      const yT = 58, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xM - 8, yT));
      parts.push(resistorH(xM - 8, yT, 68, `R1=${fmt(p.R1)}\u03a9`));
      parts.push(resistorV(xM + 60, yT, yB - yT, `R2=${fmt(p.R2)}\u03a9`));
      parts.push(wire(xM + 60, yT, xR, yT));
      parts.push(currentArrow(xR, yT + 20, xR, yT + 80, `gm=${fmt(p.vccsGain)}`));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(node(xM + 60, yT, `N${p.controllingNode}:${fmt(sv(sol, 'V1'))}V`));
      parts.push(node(xR, yT, `N${p.injectingNode}:${fmt(sv(sol, 'V2'))}V`));
      return wrapSvg(parts.join(''), 410, 220);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Delta-Wye conversion
    // ─────────────────────────────────────────────────────────────────────────
    case 'delta-wye': {
      const p = spec.params;
      const parts: string[] = [];
      // Left: Δ block
      parts.push(
        `<rect x="18" y="20" width="135" height="100" rx="6" fill="none" stroke="#333" stroke-width="1.5"/>`,
      );
      parts.push(`<text x="85" y="38" font-size="10" text-anchor="middle" font-weight="bold">\u0394 Network</text>`);
      parts.push(`<text x="85" y="56" font-size="10" text-anchor="middle">Rab=${fmt(p.Rab)}\u03a9</text>`);
      parts.push(`<text x="85" y="72" font-size="10" text-anchor="middle">Rbc=${fmt(p.Rbc)}\u03a9</text>`);
      parts.push(`<text x="85" y="88" font-size="10" text-anchor="middle">Rca=${fmt(p.Rca)}\u03a9</text>`);
      // Arrow
      parts.push(
        `<line x1="162" y1="70" x2="205" y2="70" stroke="#555" stroke-width="1.5" marker-end="url(#arw)"/>`,
      );
      parts.push(`<text x="183" y="62" font-size="9" text-anchor="middle">\u0394\u2192Y</text>`);
      // Right: Y block
      parts.push(
        `<rect x="215" y="20" width="150" height="120" rx="6" fill="none" stroke="#1565c0" stroke-width="1.5"/>`,
      );
      parts.push(
        `<text x="290" y="38" font-size="10" text-anchor="middle" font-weight="bold" fill="#1565c0">Y Network</text>`,
      );
      parts.push(
        `<text x="290" y="56" font-size="10" text-anchor="middle" fill="#1565c0">Ra=${fmt(sv(sol, 'Ra'))}\u03a9</text>`,
      );
      parts.push(
        `<text x="290" y="72" font-size="10" text-anchor="middle" fill="#1565c0">Rb=${fmt(sv(sol, 'Rb'))}\u03a9</text>`,
      );
      parts.push(
        `<text x="290" y="88" font-size="10" text-anchor="middle" fill="#1565c0">Rc=${fmt(sv(sol, 'Rc'))}\u03a9</text>`,
      );
      const Req = sv(sol, 'Req');
      if (Req) {
        parts.push(
          `<text x="290" y="110" font-size="10" text-anchor="middle">Req=${fmt(Req)}\u03a9</text>`,
        );
      }
      return wrapSvg(parts.join(''), 390, 160);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Transient / step circuits
    // ─────────────────────────────────────────────────────────────────────────
    case 'rc-step': {
      const p = spec.params;
      const xL = 40, xR = 348;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(resistorH(xL + 28, yT, 80, `R=${fmt(p.R)}\u03a9`));
      parts.push(wire(xL + 108, yT, xL + 130, yT));
      parts.push(capacitorH(xL + 130, yT, 50, `C=${fmt(p.C)}F`));
      parts.push(wire(xL + 180, yT, xR, yT));
      parts.push(wire(xR, yT, xR, yB));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(ground(xR, yB));
      parts.push(`<text x="240" y="130" font-size="10" fill="#1565c0">\u03c4=${fmt(sv(sol, 'tau'))}s</text>`);
      parts.push(`<text x="240" y="145" font-size="10">vc(\u221e)=${fmt(sv(sol, 'vc_inf'))}V</text>`);
      parts.push(`<text x="240" y="160" font-size="10">vc(0)=${fmt(p.vc0)}V</text>`);
      return wrapSvg(parts.join(''), 410, 220);
    }

    case 'rl-transient': {
      const p = spec.params;
      const xL = 40, xR = 368;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(resistorH(xL + 28, yT, 70, `Rs=${fmt(p.R_src)}\u03a9`));
      parts.push(wire(xL + 98, yT, xL + 110, yT));
      parts.push(inductorH(xL + 110, yT, 80, `L=${fmt(p.L)}H`));
      parts.push(wire(xL + 190, yT, xL + 208, yT));
      parts.push(resistorV(xL + 208, yT, yB - yT, `Rfw=${fmt(p.R_fw)}\u03a9`));
      parts.push(wire(xL + 208, yT, xR, yT));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(`<text x="240" y="150" font-size="10" fill="#1565c0">\u03c4=${fmt(sv(sol, 'tau'))}s</text>`);
      parts.push(`<text x="240" y="165" font-size="10">iL(\u221e)=${fmt(sv(sol, 'iL_inf'))}A</text>`);
      return wrapSvg(parts.join(''), 420, 220);
    }

    case 'rlc-series-step': {
      const p = spec.params;
      const xL = 40, xR = 390;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xL + 18, yT));
      parts.push(resistorH(xL + 18, yT, 60, `R=${fmt(p.R)}\u03a9`));
      parts.push(inductorH(xL + 78, yT, 70, `L=${fmt(p.L)}H`));
      parts.push(capacitorH(xL + 148, yT, 50, `C=${fmt(p.C)}F`));
      parts.push(wire(xL + 198, yT, xR, yT));
      parts.push(wire(xR, yT, xR, yB));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(ground(xL, yB));
      parts.push(
        `<text x="230" y="150" font-size="10">\u03b1=${fmt(sv(sol, 'alpha'))}\u2009\u03c90=${fmt(sv(sol, 'omega0'))}</text>`,
      );
      parts.push(`<text x="230" y="165" font-size="10">(${p.damping} damping)</text>`);
      return wrapSvg(parts.join(''), 450, 220);
    }

    case 'rc-nonzero-ic': {
      const p = spec.params;
      const xL = 40, xM = 205, xR = 380;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(resistorH(xL + 28, yT, 68, `R1=${fmt(p.R)}\u03a9`));
      parts.push(wire(xL + 96, yT, xM, yT));
      parts.push(resistorV(xM, yT, yB - yT, `R2=${fmt(p.R2)}\u03a9`));
      parts.push(wire(xM, yT, xM + 18, yT));
      parts.push(capacitorH(xM + 18, yT, 50, `C=${fmt(p.C)}F`));
      parts.push(wire(xM + 68, yT, xR, yT));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(wire(xR, yT, xR, yB));
      parts.push(
        `<text x="215" y="210" font-size="10" text-anchor="middle">\u03c4=${fmt(sv(sol, 'tau'))}s\u2009vc(0)=${fmt(p.vc0)}V</text>`,
      );
      return wrapSvg(parts.join(''), 440, 220);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC phasor circuits
    // ─────────────────────────────────────────────────────────────────────────
    case 'ac-series-rlc': {
      const p = spec.params;
      const omega = 2 * Math.PI * p.f_Hz;
      const xL = 40, xR = 378;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs_mag)}\u2220${fmt(p.Vs_ang_deg)}\u00b0`));
      parts.push(wire(xL, yT, xL + 18, yT));
      parts.push(resistorH(xL + 18, yT, 60, `R=${fmt(p.R)}\u03a9`));
      parts.push(inductorH(xL + 78, yT, 70, `XL=${fmt(omega * p.L)}\u03a9`));
      parts.push(capacitorH(xL + 148, yT, 50, `XC=${fmt(1 / (omega * p.C))}\u03a9`));
      parts.push(wire(xL + 198, yT, xR, yT));
      parts.push(wire(xR, yT, xR, yB));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(
        `<text x="225" y="148" font-size="10">|Z|=${fmt(sv(sol, 'Z_mag'))}\u03a9\u2009|I|=${fmt(sv(sol, 'I_mag'))}A</text>`,
      );
      parts.push(`<text x="225" y="163" font-size="10">f=${fmt(p.f_Hz)}Hz</text>`);
      return wrapSvg(parts.join(''), 448, 220);
    }

    case 'ac-parallel-rlc': {
      const p = spec.params;
      const XL = p.omega * p.L;
      const XC = 1 / (p.omega * p.C);
      const xL = 40, xR = 365;
      const yT = 45, yB = 185;
      const x1 = 140, x2 = 225, x3 = 305;
      const parts: string[] = [];
      parts.push(currentArrow(xL, yB - 4, xL, yT + 4, `Is=${fmt(p.Is_mag)}A`));
      parts.push(wire(xL, yT, xR, yT));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(resistorV(x1, yT, yB - yT, `R=${fmt(p.R)}\u03a9`));
      parts.push(`<line x1="${x2}" y1="${yT}" x2="${x2}" y2="${yB}" stroke="#333" stroke-width="2"/>`);
      parts.push(`<text x="${x2 + 10}" y="${(yT + yB) / 2 + 4}" font-size="10">XL=${fmt(XL)}\u03a9</text>`);
      parts.push(`<line x1="${x3}" y1="${yT}" x2="${x3}" y2="${yB}" stroke="#333" stroke-width="2"/>`);
      parts.push(`<text x="${x3 + 10}" y="${(yT + yB) / 2 + 4}" font-size="10">XC=${fmt(XC)}\u03a9</text>`);
      parts.push(
        `<text x="200" y="210" font-size="10" text-anchor="middle">V=${fmt(sv(sol, 'V_mag'))}V\u2009\u03c9=${fmt(p.omega)}r/s</text>`,
      );
      return wrapSvg(parts.join(''), 420, 220);
    }

    case 'ac-mesh-dependent': {
      const p = spec.params;
      const xL = 40, xM = 200, xR = 365;
      const yT = 45, yB = 185;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}\u22200\u00b0`));
      parts.push(wire(xL, yT, xM, yT));
      parts.push(wire(xM, yT, xR, yT));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(resistorV(xM, yT, yB - yT, `Z\u2081\u2082`));
      parts.push(resistorV(xR, yT, yB - yT, `dep\u22c5src`));
      parts.push(
        currentArrow(xL + 40, yT + 72, xL + 82, yT + 72, `I\u2081=${fmt(sv(sol, 'I1_mag'))}A`),
      );
      parts.push(
        currentArrow(xM + 38, yT + 72, xM + 80, yT + 72, `I\u2082=${fmt(sv(sol, 'I2_mag'))}A`),
      );
      parts.push(
        `<text x="200" y="208" font-size="10" text-anchor="middle">\u03c9=${fmt(p.omega)}r/s\u2009gm=${fmt(p.depSrcGain)}</text>`,
      );
      return wrapSvg(parts.join(''), 420, 220);
    }

    case 'ac-thevenin': {
      const p = spec.params;
      const xL = 40, xR = 345;
      const yT = 48, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs_mag)}\u2220${fmt(p.Vs_ang_deg)}\u00b0`));
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(resistorH(xL + 28, yT, 58, `R1=${fmt(p.R1)}\u03a9`));
      parts.push(inductorH(xL + 86, yT, 58, `L=${fmt(p.L)}H`));
      parts.push(wire(xL + 144, yT, xL + 160, yT));
      parts.push(resistorV(xL + 160, yT, yB - yT, `R2=${fmt(p.R2)}\u03a9`));
      parts.push(capacitorH(xL + 160, yT, 48, `C=${fmt(p.C)}F`));
      parts.push(wire(xL + 208, yT, xR, yT));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(node(xR, yT, `${p.terminalLabel}+`));
      parts.push(node(xR, yB, `${p.terminalLabel}\u2212`));
      parts.push(`<text x="${xR + 8}" y="100" font-size="10">|Vth|=${fmt(sv(sol, 'Vth_mag'))}V</text>`);
      parts.push(`<text x="${xR + 8}" y="115" font-size="10">|Zth|=${fmt(sv(sol, 'Zth_mag'))}\u03a9</text>`);
      return wrapSvg(parts.join(''), 460, 220);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Power / resonance
    // ─────────────────────────────────────────────────────────────────────────
    case 'pf-correction': {
      const p = spec.params;
      return equationPanel(
        [
          `PF Correction: P=${fmt(p.P_W)}W\u2009V=${fmt(p.V_rms)}V`,
          `PF: ${fmt(p.pf1)} \u2192 ${fmt(p.pf2)}`,
          `Q1=${fmt(sv(sol, 'Q1'))}VAR\u2009Q2=${fmt(sv(sol, 'Q2'))}VAR`,
          `Qc=${fmt(sv(sol, 'Qc'))}VAR`,
          `C=${fmt(sv(sol, 'C_farad'))}F\u2009f=${fmt(p.f_Hz)}Hz`,
        ],
        400,
        165,
      );
    }

    case 'complex-power-balance': {
      const p = spec.params;
      return equationPanel(
        [
          `Complex Power Balance`,
          `Vs=${fmt(p.Vs_mag)}V\u2009\u03c9=${fmt(p.omega)}r/s`,
          `P=${fmt(sv(sol, 'P_W'))}W\u2009Q=${fmt(sv(sol, 'Q_VAR'))}VAR`,
          `|S|=${fmt(sv(sol, 'S_mag'))}VA\u2009PF=${fmt(sv(sol, 'PF'))}`,
        ],
        380,
        150,
      );
    }

    case 'series-resonance': {
      const p = spec.params;
      const xL = 40, xR = 368;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(wire(xL, yT, xL + 18, yT));
      parts.push(resistorH(xL + 18, yT, 60, `R=${fmt(p.R)}\u03a9`));
      parts.push(inductorH(xL + 78, yT, 70, `L=${fmt(p.L)}H`));
      parts.push(capacitorH(xL + 148, yT, 50, `C=${fmt(p.C)}F`));
      parts.push(wire(xL + 198, yT, xR, yT));
      parts.push(wire(xR, yT, xR, yB));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(ground(xL, yB));
      parts.push(
        `<text x="215" y="148" font-size="10">f0=${fmt(sv(sol, 'f0'))}Hz\u2009Q=${fmt(sv(sol, 'Q'))}</text>`,
      );
      parts.push(`<text x="215" y="163" font-size="10">BW=${fmt(sv(sol, 'BW'))}Hz</text>`);
      return wrapSvg(parts.join(''), 430, 220);
    }

    case 'parallel-resonance': {
      const p = spec.params;
      const xL = 40, xR = 365;
      const yT = 45, yB = 185;
      const x1 = 140, x2 = 228, x3 = 308;
      const parts: string[] = [];
      parts.push(currentArrow(xL, yB - 4, xL, yT + 4, `Is=${fmt(p.Is)}A`));
      parts.push(wire(xL, yT, xR, yT));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(resistorV(x1, yT, yB - yT, `R=${fmt(p.R)}\u03a9`));
      parts.push(`<line x1="${x2}" y1="${yT}" x2="${x2}" y2="${yB}" stroke="#333" stroke-width="2"/>`);
      parts.push(`<text x="${x2 + 10}" y="${(yT + yB) / 2 + 4}" font-size="10">L=${fmt(p.L)}H</text>`);
      parts.push(`<line x1="${x3}" y1="${yT}" x2="${x3}" y2="${yB}" stroke="#333" stroke-width="2"/>`);
      parts.push(`<text x="${x3 + 10}" y="${(yT + yB) / 2 + 4}" font-size="10">C=${fmt(p.C)}F</text>`);
      parts.push(
        `<text x="200" y="210" font-size="10" text-anchor="middle">f0=${fmt(sv(sol, 'f0'))}Hz\u2009Q=${fmt(sv(sol, 'Q'))}</text>`,
      );
      return wrapSvg(parts.join(''), 420, 220);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bode plots
    // ─────────────────────────────────────────────────────────────────────────
    case 'bode-plot': {
      const p = spec.params;
      return buildBodePlot(p.H_s, p.gain, p.poles, p.zeros, p.evalAt_omega);
    }

    case 'bode-stability': {
      const p = spec.params;
      return buildBodePlot(p.L_s, p.gain, p.poles, p.zeros);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bandpass filter
    // ─────────────────────────────────────────────────────────────────────────
    case 'bandpass-filter': {
      const p = spec.params;
      const xL = 40, xR = 368;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(wire(xL, yT, xL + 18, yT));
      parts.push(resistorH(xL + 18, yT, 60, `R=${fmt(p.R)}\u03a9`));
      parts.push(inductorH(xL + 78, yT, 70, `L=${fmt(p.L)}H`));
      parts.push(capacitorH(xL + 148, yT, 50, `C=${fmt(p.C)}F`));
      parts.push(wire(xL + 198, yT, xR, yT));
      parts.push(wire(xR, yT, xR, yB));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(
        `<text x="215" y="148" font-size="10">f0=${fmt(sv(sol, 'f0'))}Hz\u2009BW=${fmt(sv(sol, 'BW'))}Hz</text>`,
      );
      parts.push(`<text x="215" y="163" font-size="10">Q=${fmt(sv(sol, 'Q'))}</text>`);
      return wrapSvg(parts.join(''), 430, 220);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Two-port networks
    // ─────────────────────────────────────────────────────────────────────────
    case 'z-parameters': {
      const p = spec.params;
      const mag = (z: typeof p.Za) => (typeof z === 'number' ? z : Math.sqrt(z.re ** 2 + z.im ** 2));
      return equationPanel(
        [
          `Z-Params (${p.topology} network)`,
          `Za=${fmt(mag(p.Za))}\u03a9\u2009Zb=${fmt(mag(p.Zb))}\u03a9\u2009Zc=${fmt(mag(p.Zc))}\u03a9`,
          `Z11=${fmt(sv(sol, 'Z11'))}\u03a9\u2009Z12=${fmt(sv(sol, 'Z12'))}\u03a9`,
          `Z21=${fmt(sv(sol, 'Z21'))}\u03a9\u2009Z22=${fmt(sv(sol, 'Z22'))}\u03a9`,
        ],
        400,
        150,
      );
    }

    case 'abcd-cascade': {
      return equationPanel(
        [
          `ABCD Cascade (${spec.params.sections.length} sections)`,
          `A=${fmt(sv(sol, 'A'))}\u2009B=${fmt(sv(sol, 'B'))}\u03a9`,
          `C=${fmt(sv(sol, 'C'))}S\u2009D=${fmt(sv(sol, 'D'))}`,
          `V ratio=${fmt(sv(sol, 'V_ratio'))}`,
        ],
        380,
        150,
      );
    }

    case 'two-port-gain': {
      const p = spec.params;
      return equationPanel(
        [
          `Two-Port Network Gain`,
          `Z11=${fmt(p.Z11)}\u03a9\u2009Z12=${fmt(p.Z12)}\u03a9\u2009Z22=${fmt(p.Z22)}\u03a9`,
          `Av=${fmt(sv(sol, 'Av'))}\u2009Ai=${fmt(sv(sol, 'Ai'))}`,
          `Zin=${fmt(sv(sol, 'Zin'))}\u03a9`,
        ],
        400,
        150,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Magnetics
    // ─────────────────────────────────────────────────────────────────────────
    case 'mutual-inductance': {
      const p = spec.params;
      const xL = 40, xM = 210, xR = 388;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs_mag)}V`));
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(inductorH(xL + 28, yT, 80, `L1=${fmt(p.L1)}H`));
      parts.push(wire(xL + 108, yT, xM, yT));
      parts.push(wire(xL, yB, xM, yB));
      parts.push(
        `<line x1="${xM}" y1="${yT}" x2="${xM}" y2="${yB}" stroke="#999" stroke-width="1" stroke-dasharray="4"/>`,
      );
      parts.push(`<text x="${xM + 4}" y="${(yT + yB) / 2 + 4}" font-size="10">M=${fmt(p.M)}H</text>`);
      parts.push(inductorH(xM + 10, yT, 80, `L2=${fmt(p.L2)}H`));
      parts.push(wire(xM + 90, yT, xR, yT));
      parts.push(wire(xM, yB, xR, yB));
      if (!p.port2Open) {
        parts.push(resistorV(xR, yT, yB - yT, 'ZL'));
      } else {
        parts.push(node(xR, yT, 'OC'));
        parts.push(node(xR, yB, ''));
      }
      parts.push(
        `<text x="215" y="210" font-size="10" text-anchor="middle">I1=${fmt(sv(sol, 'I1_mag'))}A\u2009V2=${fmt(sv(sol, 'V2_mag'))}V</text>`,
      );
      return wrapSvg(parts.join(''), 448, 220);
    }

    case 'ideal-transformer': {
      const p = spec.params;
      const xL = 40, xM1 = 178, xM2 = 230, xR = 365;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(vSource(xL, yT, yB, `${fmt(p.Vs)}V`));
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(resistorH(xL + 28, yT, 60, `Zs=${fmt(p.Zs)}\u03a9`));
      parts.push(wire(xL + 88, yT, xM1, yT));
      parts.push(wire(xL, yB, xM1, yB));
      parts.push(`<line x1="${xM1}" y1="${yT}" x2="${xM1}" y2="${yB}" stroke="#333" stroke-width="3"/>`);
      parts.push(`<line x1="${xM2}" y1="${yT}" x2="${xM2}" y2="${yB}" stroke="#333" stroke-width="3"/>`);
      parts.push(
        `<text x="${(xM1 + xM2) / 2}" y="${(yT + yB) / 2 + 4}" font-size="11" text-anchor="middle">n=${fmt(p.n)}</text>`,
      );
      parts.push(wire(xM2, yT, xR, yT));
      parts.push(wire(xM2, yB, xR, yB));
      parts.push(resistorV(xR, yT, yB - yT, `ZL=${fmt(p.ZL)}\u03a9`));
      parts.push(
        `<text x="210" y="210" font-size="10" text-anchor="middle">V2=${fmt(sv(sol, 'V2'))}V\u2009I2=${fmt(sv(sol, 'I2'))}A</text>`,
      );
      return wrapSvg(parts.join(''), 430, 220);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Three-phase systems
    // ─────────────────────────────────────────────────────────────────────────
    case 'three-phase-yy': {
      const p = spec.params;
      const Zabs = Math.sqrt(p.Z_ph.re ** 2 + p.Z_ph.im ** 2);
      return equationPanel(
        [
          `Y-Y: VL=${fmt(p.VL_rms)}V rms`,
          `Vph=${fmt(sv(sol, 'Vph_rms'))}V`,
          `|Z_ph|=${fmt(Zabs)}\u03a9`,
          `Iph=${fmt(sv(sol, 'Iph_mag'))}A`,
          `P3\u03c6=${fmt(sv(sol, 'P_total'))}W`,
        ],
        350,
        165,
      );
    }

    case 'three-phase-yd': {
      const p = spec.params;
      const Zabs = Math.sqrt(p.Z_delta.re ** 2 + p.Z_delta.im ** 2);
      return equationPanel(
        [
          `Y-\u0394: VL=${fmt(p.VL_rms)}V rms`,
          `V\u0394=${fmt(sv(sol, 'Vdelta_rms'))}V`,
          `|Z\u0394|=${fmt(Zabs)}\u03a9`,
          `Iline=${fmt(sv(sol, 'I_line'))}A`,
          `P3\u03c6=${fmt(sv(sol, 'P_total'))}W`,
        ],
        350,
        165,
      );
    }

    case 'two-wattmeter': {
      const p = spec.params;
      return equationPanel(
        [
          `Two-Wattmeter Method`,
          `W1=${fmt(p.W1)}W\u2009W2=${fmt(p.W2)}W`,
          `P_total=${fmt(sv(sol, 'P_total'))}W`,
          `Q_total=${fmt(sv(sol, 'Q_total'))}VAR`,
          `PF=${fmt(sv(sol, 'PF'))}`,
        ],
        370,
        165,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BJT amplifiers
    // ─────────────────────────────────────────────────────────────────────────
    case 'bjt-ce-amplifier': {
      const p = spec.params;
      const xL = 28, xM = 160, xR = 320;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(`<text x="${xL}" y="${yT - 8}" font-size="9">vin</text>`);
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(resistorH(xL + 28, yT, 60, `r\u03c0=${fmt(sv(sol, 'rpi'))}\u03a9`));
      parts.push(wire(xL + 88, yT, xM, yT));
      parts.push(node(xM, yT, 'v\u03c0'));
      parts.push(currentArrow(xM + 48, yT, xM + 48, yB, `gm=${fmt(sv(sol, 'gm'))}S`));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(resistorV(xR, yT, yB - yT, `RC=${fmt(p.RC)}\u03a9`));
      parts.push(wire(xM + 48, yT, xR, yT));
      parts.push(ground(xM + 48, yB));
      parts.push(
        `<text x="195" y="208" font-size="10" text-anchor="middle">Av=${fmt(sv(sol, 'Av'))}\u2009Rin=${fmt(sv(sol, 'Rin'))}\u03a9</text>`,
      );
      return wrapSvg(parts.join(''), 380, 225);
    }

    case 'miller-bandwidth': {
      const p = spec.params;
      return equationPanel(
        [
          `Miller Bandwidth`,
          `|Av|=${fmt(Math.abs(p.Av))}\u2009C\u03c0=${fmt(p.Cpi)}F\u2009C\u03bc=${fmt(p.Cmu)}F`,
          `Cin_eff=${fmt(sv(sol, 'Cin_eff'))}F`,
          `fH=${fmt(sv(sol, 'fH'))}Hz`,
        ],
        380,
        150,
      );
    }

    case 'emitter-degeneration': {
      const p = spec.params;
      const xC = 80, xM = 195;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(`<text x="${xC + 18}" y="${yT - 8}" font-size="9">VCC</text>`);
      parts.push(wire(xC + 18, yT, xC + 18, yT + 18));
      parts.push(resistorV(xC + 18, yT + 18, 50, `RC=${fmt(p.RC)}\u03a9`));
      parts.push(wire(xC - 28, yT + 42, xC, yT + 42));
      parts.push(`<text x="${xC - 34}" y="${yT + 46}" font-size="9" text-anchor="end">vin</text>`);
      parts.push(resistorH(xC, yT + 42, 58, `r\u03c0=${fmt(p.rpi)}\u03a9`));
      parts.push(wire(xC + 58, yT + 42, xM, yT + 42));
      parts.push(currentArrow(xM, yT + 20, xM, yT + 80, `gm=${fmt(p.gm)}S`));
      parts.push(resistorV(xM, yT + 80, 50, `RE=${fmt(p.RE)}\u03a9`));
      parts.push(ground(xM, yB));
      parts.push(
        `<text x="200" y="208" font-size="10" text-anchor="middle">Av=${fmt(sv(sol, 'Av'))}\u2009Rout=${fmt(sv(sol, 'Rout'))}\u03a9</text>`,
      );
      return wrapSvg(parts.join(''), 380, 225);
    }

    case 'cascode': {
      const p = spec.params;
      return equationPanel(
        [
          `Cascode Amplifier`,
          `gm1=${fmt(p.gm1)}S\u2009ro1=${fmt(p.ro1)}\u03a9`,
          `gm2=${fmt(p.gm2)}S\u2009ro2=${fmt(p.ro2)}\u03a9`,
          `Av=${fmt(sv(sol, 'Av'))}`,
          `Rout=${fmt(sv(sol, 'Rout'))}\u03a9\u2009RL=${fmt(p.RL)}\u03a9`,
        ],
        380,
        165,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MOSFET amplifiers
    // ─────────────────────────────────────────────────────────────────────────
    case 'mosfet-cs': {
      const p = spec.params;
      const xL = 28, xM = 178, xR = 320;
      const yT = 55, yB = 188;
      const parts: string[] = [];
      parts.push(`<text x="${xL}" y="${yT - 8}" font-size="9">vin(G)</text>`);
      parts.push(wire(xL, yT, xL + 28, yT));
      parts.push(node(xL + 28, yT, 'G'));
      parts.push(currentArrow(xM, yT, xM, yB, `gm=${fmt(sv(sol, 'gm'))}S`));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(ground(xM, yB));
      parts.push(resistorV(xR, yT, yB - yT, `RD=${fmt(p.RD)}\u03a9`));
      parts.push(wire(xM, yT, xR, yT));
      parts.push(
        `<text x="195" y="195" font-size="10" text-anchor="middle">VGS=${fmt(p.VGS)}V\u2009VTN=${fmt(p.VTN)}V</text>`,
      );
      parts.push(
        `<text x="195" y="210" font-size="10" text-anchor="middle">ID=${fmt(sv(sol, 'ID'))}A\u2009Av=${fmt(sv(sol, 'Av'))}</text>`,
      );
      return wrapSvg(parts.join(''), 380, 225);
    }

    case 'mosfet-diff-pair': {
      const p = spec.params;
      return equationPanel(
        [
          `MOSFET Diff Pair`,
          `gm=${fmt(p.gm)}S\u2009ro=${fmt(p.ro)}\u03a9`,
          `Ad=${fmt(sv(sol, 'Ad'))}\u2009Ac=${fmt(sv(sol, 'Ac'))}`,
          `CMRR=${fmt(sv(sol, 'CMRR_dB'))}dB`,
          `RD=${fmt(p.RD)}\u03a9\u2009RSS=${fmt(p.RSS)}\u03a9`,
        ],
        380,
        165,
      );
    }

    case 'source-follower': {
      const p = spec.params;
      return equationPanel(
        [
          `Source Follower`,
          `gm=${fmt(p.gm)}S\u2009ro=${fmt(p.ro)}\u03a9`,
          `Av=${fmt(sv(sol, 'Av'))}`,
          `Rout=${fmt(sv(sol, 'Rout'))}\u03a9`,
          `RS=${fmt(p.RS)}\u03a9\u2009RL=${fmt(p.RL)}\u03a9`,
        ],
        360,
        165,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Op-amp circuits
    // ─────────────────────────────────────────────────────────────────────────
    case 'opamp-summer': {
      const p = spec.params;
      const xBase = 38, xOA = 225;
      const yBot = 185;
      const yIn0 = 55;
      const parts: string[] = [];
      // Feedback resistor (top)
      parts.push(resistorH(xOA - 55, yIn0, 55, `Rf=${fmt(p.Rf)}\u03a9`));
      // Op-amp triangle
      const yTriTop = yIn0;
      const yTriBot = yBot - 20;
      const yTriMid = (yTriTop + yTriBot) / 2;
      parts.push(
        `<polygon points="${xOA},${yTriTop} ${xOA + 60},${yTriMid} ${xOA},${yTriBot}" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>`,
      );
      parts.push(
        `<text x="${xOA + 30}" y="${yTriMid + 4}" font-size="9" text-anchor="middle">op-amp</text>`,
      );
      // Input branches (up to 3)
      const inputs = p.inputs.slice(0, 3);
      inputs.forEach((inp, i) => {
        const yy = yIn0 + i * 30;
        parts.push(resistorH(xBase, yy, 78, `R${i + 1}=${fmt(inp.R)}\u03a9`));
        parts.push(
          `<text x="${xBase - 4}" y="${yy + 4}" font-size="9" text-anchor="end">V${i + 1}=${fmt(inp.V)}V</text>`,
        );
        parts.push(wire(xBase + 78, yy, xOA - 57, yy));
      });
      // Output label
      parts.push(
        `<text x="${xOA + 65}" y="${yTriMid + 4}" font-size="10">Vo=${fmt(sv(sol, 'Vout'))}V</text>`,
      );
      return wrapSvg(parts.join(''), 440, 220);
    }

    case 'diff-amp-cmrr': {
      const p = spec.params;
      return equationPanel(
        [
          `Diff Amp (CMRR)`,
          `R1=${fmt(p.R1)}\u03a9\u2009R2=${fmt(p.R2)}\u03a9\u2009\u0394R4=${fmt(p.deltaR4)}\u03a9`,
          `Ad=${fmt(sv(sol, 'Ad'))}\u2009Ac=${fmt(sv(sol, 'Ac'))}`,
          `CMRR=${fmt(sv(sol, 'CMRR_dB'))}dB`,
        ],
        390,
        150,
      );
    }

    case 'sallen-key': {
      const p = spec.params;
      const xL = 38, xR = 390;
      const yT = 58, yM = 128, yB = 188;
      const parts: string[] = [];
      parts.push(resistorH(xL, yT, 58, `R1=${fmt(p.R1)}\u03a9`));
      parts.push(resistorH(xL + 58, yT, 58, `R2=${fmt(p.R2)}\u03a9`));
      parts.push(wire(xL + 116, yT, xL + 136, yT));
      parts.push(capacitorH(xL + 136, yT, 48, `C1=${fmt(p.C1)}F`));
      parts.push(capacitorH(xL + 58, yM, 48, `C2=${fmt(p.C2)}F`));
      parts.push(wire(xL, yB, xR, yB));
      parts.push(ground(xL + 184, yT));
      parts.push(ground(xL + 106, yM));
      parts.push(
        `<text x="260" y="165" font-size="10">f0=${fmt(sv(sol, 'f0'))}Hz\u2009Q=${fmt(sv(sol, 'Q'))}</text>`,
      );
      parts.push(`<text x="260" y="180" font-size="10">K=${fmt(p.K)}</text>`);
      return wrapSvg(parts.join(''), 440, 220);
    }

    case 'schmitt-trigger': {
      const p = spec.params;
      return equationPanel(
        [
          `Schmitt Trigger`,
          `R1=${fmt(p.R1)}\u03a9\u2009R2=${fmt(p.R2)}\u03a9`,
          `V+=${fmt(sv(sol, 'V_upper'))}V`,
          `V\u2212=${fmt(sv(sol, 'V_lower'))}V`,
          `Vsat\u00b1=${fmt(p.Vsat_pos)}/${fmt(p.Vsat_neg)}V`,
        ],
        360,
        165,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Feedback / stability / control
    // ─────────────────────────────────────────────────────────────────────────
    case 'series-shunt-feedback': {
      const p = spec.params;
      return equationPanel(
        [
          `Series-Shunt Feedback`,
          `A=${fmt(p.A)}\u2009\u03b2=${fmt(p.beta_f)}`,
          `Af=${fmt(sv(sol, 'Af'))}`,
          `Rinf=${fmt(sv(sol, 'Rinf'))}\u03a9\u2009Routf=${fmt(sv(sol, 'Routf'))}\u03a9`,
        ],
        390,
        150,
      );
    }

    case 'root-locus': {
      const p = spec.params;
      return equationPanel(
        [
          `Root Locus: ${p.GH_s}`,
          `OL poles: ${p.openLoopPoles.join(', ')}`,
          `OL zeros: ${p.openLoopZeros.length ? p.openLoopZeros.join(', ') : 'none'}`,
          `Centroid=${fmt(sv(sol, 'centroid'))}`,
          `Asymptote: ${fmt(sv(sol, 'asym0'))}\u00b0\u2009${fmt(sv(sol, 'asym1'))}\u00b0`,
        ],
        420,
        165,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Power systems
    // ─────────────────────────────────────────────────────────────────────────
    case 'per-unit': {
      const p = spec.params;
      const zoneStr = p.zones.map((z, i) => `Z${i + 1}:${fmt(z.Vbase_kV)}kV`).join('\u2009');
      return equationPanel(
        [
          `Per-Unit System: Sbase=${fmt(p.Sbase_MVA)}MVA`,
          zoneStr,
          `Zbase1=${fmt(sv(sol, 'Zbase1'))}\u03a9`,
          `Z_pu=${fmt(sv(sol, 'Z1pu'))}pu`,
        ],
        420,
        150,
      );
    }

    case 'ybus-formation': {
      const p = spec.params;
      return equationPanel(
        [
          `Ybus: ${p.nBuses} buses, ${p.lines.length} branches`,
          `Y11=${fmt(sv(sol, 'Y11_re'))}+j${fmt(sv(sol, 'Y11_im'))}`,
          `Y12=${fmt(sv(sol, 'Y12_re'))}+j${fmt(sv(sol, 'Y12_im'))}`,
          `Y22=${fmt(sv(sol, 'Y22_re'))}+j${fmt(sv(sol, 'Y22_im'))}`,
        ],
        400,
        150,
      );
    }

    case 'gauss-seidel-pf': {
      const p = spec.params;
      return equationPanel(
        [
          `Gauss-Seidel Power Flow`,
          `${p.buses.length} buses\u2009maxIter=${p.maxIter}`,
          `|V2|=${fmt(sv(sol, 'V2_mag'))}pu\u2009\u03b42=${fmt(sv(sol, 'V2_ang_deg'))}\u00b0`,
          `P2=${fmt(sv(sol, 'P2'))}pu\u2009Q2=${fmt(sv(sol, 'Q2'))}pu`,
        ],
        400,
        150,
      );
    }

    case 'symmetrical-fault': {
      const p = spec.params;
      return equationPanel(
        [
          `3-Phase Fault at bus ${p.faultBus + 1}`,
          `Vpre=${fmt(p.Vpre)}pu`,
          `Zbus=${fmt(sv(sol, 'Zbus_re'))}+j${fmt(sv(sol, 'Zbus_im'))}pu`,
          `Ifault=${fmt(sv(sol, 'Ifault_mag'))}pu`,
        ],
        400,
        150,
      );
    }

    case 'nr-jacobian': {
      const p = spec.params;
      return equationPanel(
        [
          `Newton-Raphson Power Flow`,
          `${p.buses.length} buses\u2009tol=${fmt(p.tolerance)}`,
          `|V2|=${fmt(sv(sol, 'V2_mag'))}pu\u2009\u03b4=${fmt(sv(sol, 'V2_ang_deg'))}\u00b0`,
          `\u0394P=${fmt(sv(sol, 'dP2'))}\u2009\u0394Q=${fmt(sv(sol, 'dQ2'))}`,
        ],
        400,
        150,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Oscillator
    // ─────────────────────────────────────────────────────────────────────────
    case 'integrator-oscillator': {
      const p = spec.params;
      return equationPanel(
        [
          `Two-Integrator Oscillator`,
          `f0=${fmt(p.f0)}Hz\u2009C=${fmt(p.C)}F`,
          `R=${fmt(sv(sol, 'R'))}\u03a9\u2009\u03c90=${fmt(sv(sol, 'omega0'))}r/s`,
          `T=${fmt(sv(sol, 'T_period'))}s\u2009\u03c6/integ=\u221290\u00b0`,
        ],
        380,
        150,
      );
    }
  }
}
