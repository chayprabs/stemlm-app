/**
 * Dynamic SVG diagram generator for EE benchmark problems.
 *
 * renderDiagram(spec, solution, stepIndex?) dispatches on spec.kind and
 * produces an SVG string whose element labels are driven entirely by
 * spec.params and solution.computed — never by hardcoded question IDs.
 *
 * Every diagram satisfies the electrical audit: ≥4 SVG primitives and
 * ≥2 text labels, with at least one non-text graphical element.
 */
import type { EEProblemSpec, EESolution } from './spec-types';
import type {
  KvlSeriesLoopParams,
  NodalAnalysisParams,
  MeshAnalysisParams,
  TheveninNortonParams,
  SuperpositionParams,
  RcStepParams,
  RlTransientParams,
  RlcSeriesStepParams,
  AcSeriesRlcParams,
  SeriesResonanceParams,
  MutualInductanceParams,
  IdealTransformerParams,
  DeltaWyeParams,
  PfCorrectionParams,
  ThreePhaseYYParams,
  BodePlotParams,
  ZParametersParams,
  AbcdCascadeParams,
  TwoPortGainParams,
  PerUnitParams,
  YbusFormationParams,
  GaussSeidelPfParams,
  SymmetricalFaultParams,
  BjtCeAmplifierParams,
  MosfetCsParams,
  MosfetDiffPairParams,
  OpampSummerParams,
  SeriesShuntFeedbackParams,
  IntegratorOscillatorParams,
} from './spec-types';
import {
  wrapSvg,
  wire,
  vSource,
  ground,
  node,
  resistorH,
  resistorV,
  inductorH,
  capacitorH,
  currentArrow,
  equationPanel,
} from './circuit-svg';
import { zbusFromLines } from './solvers/math-utils';

// ── formatting helpers ────────────────────────────────────────────────

/** Format a numeric value with SI-friendly precision */
function fmtNum(v: number, decimals = 2): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e6) return `${(v / 1e6).toPrecision(3)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toPrecision(3)}k`;
  if (abs >= 1)   return `${parseFloat(v.toFixed(decimals))}`;
  if (abs >= 1e-3) return `${parseFloat((v * 1e3).toFixed(decimals))}m`;
  return v.toExponential(2);
}

/** Extract a value from solution.computed */
function sv(sol: EESolution, key: string): number | undefined {
  return sol.computed[key];
}

/** Format a solution value as a string with unit, or return fallback */
function fmtSv(sol: EESolution, key: string, unit = '', fallback = '?'): string {
  const v = sv(sol, key);
  return v !== undefined ? `${fmtNum(v)}${unit}` : fallback;
}

/** Build lines for an equation panel from solution.steps, falling back to values */
function panelLines(sol: EESolution, fallbackLines: string[]): string[] {
  return sol.steps.length > 0 ? sol.steps.map(s => s.formula) : fallbackLines;
}

/** Vertical annotation column separated from schematic to avoid label collisions */
function rightColumn(
  lines: string[],
  x = 248,
  y0 = 28,
  dy = 18,
  fontSize = 9,
  color = '#1565c0',
): string {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y0 + i * dy}" font-size="${fontSize}" text-anchor="start" fill="${color}">${line}</text>`,
    )
    .join('');
}

function splitSchematicPanel(
  schematicParts: string[],
  panelLines: string[],
  schematicW = 200,
  h = 200,
  panelW = 130,
): string {
  const totalW = schematicW + panelW + 16;
  const panelX = schematicW + 20;
  const divider = `<line x1="${schematicW + 8}" y1="12" x2="${schematicW + 8}" y2="${h - 12}" stroke="#ddd" stroke-width="1"/>`;
  const panel = rightColumn(panelLines, panelX, 30, 18, 9, '#333');
  return wrapSvg([...schematicParts, divider, panel].join(''), totalW, h);
}

// ── main dispatch ─────────────────────────────────────────────────────

/**
 * Render an SVG diagram for the given problem spec and solution.
 *
 * @param spec       - Problem specification (kind + params)
 * @param solution   - Computed solution values and step hints
 * @param stepIndex  - Optional 0-based step index; when ≥ 3, solution
 *                     annotations (voltage drops, currents) are overlaid
 *                     on circuit diagrams
 */
export function renderDiagram(
  spec: EEProblemSpec,
  solution: EESolution,
  stepIndex?: number,
): string {
  switch (spec.kind) {
    case 'kvl-series-loop':       return renderKvlSeries(spec.params, solution, stepIndex);
    case 'nodal-analysis':        return renderNodal(spec.params, solution);
    case 'mesh-analysis':         return renderMeshPanel(spec.params, solution);
    case 'thevenin-norton':       return renderThevenin(spec.params, solution);
    case 'superposition':         return renderSuperpositionPanel(spec.params, solution);
    case 'rc-step':               return renderRcTransient(spec.params, solution);
    case 'rl-transient':          return renderRlTransient(spec.params, solution);
    case 'rlc-series-step':       return renderRlcSeries(spec.params, solution);
    case 'ac-series-rlc':         return renderAcRlc(spec.params, solution);
    case 'series-resonance':      return renderResonance(spec.params, solution);
    case 'mutual-inductance':     return renderMutualInductance(spec.params, solution);
    case 'ideal-transformer':     return renderTransformerCircuit(spec.params, solution);
    case 'delta-wye':             return renderDeltaWye(spec.params, solution);
    case 'bjt-ce-amplifier':      return renderBjtHybridPi(spec.params, solution);
    case 'mosfet-cs':             return renderMosfetCs(spec.params, solution);
    case 'mosfet-diff-pair':      return renderDiffPair(spec.params, solution);
    case 'opamp-summer':          return renderOpampCircuit(spec.params, solution);
    case 'bode-plot':             return renderBodePlot(spec.params, solution);
    case 'pf-correction':         return renderPfCorrectionPanel(spec.params, solution);
    case 'ybus-formation':        return renderYbusPanel(spec.params, solution);
    case 'z-parameters':          return renderZParamsPanel(spec.params, solution);
    case 'abcd-cascade':          return renderAbcdPanel(spec.params, solution);
    case 'two-port-gain':         return renderTwoPortPanel(spec.params, solution);
    case 'three-phase-yy':        return renderThreePhasePanel(spec.params, solution);
    case 'per-unit':              return renderPerUnitPanel(spec.params, solution);
    case 'series-shunt-feedback': return renderFeedbackPanel(spec.params, solution);
    case 'symmetrical-fault':     return renderFaultPanel(spec.params, solution);
    case 'gauss-seidel-pf':       return renderPowerFlowPanel(spec.params, solution);
    case 'integrator-oscillator': return renderOscillatorPanel(spec.params, solution);
    default:                      return renderGenericPanel(solution);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CIRCUIT DIAGRAMS — driven by spec.params + solution.computed
// ═══════════════════════════════════════════════════════════════════════

// ── KVL series loop ───────────────────────────────────────────────────
function renderKvlSeries(
  params: KvlSeriesLoopParams,
  sol: EESolution,
  stepIndex?: number,
): string {
  const { Vs, resistors } = params;
  const n = resistors.length;
  const rW = Math.min(70, Math.max(50, 230 / Math.max(n, 1)));
  const x0 = 40;
  const yTop = 50;
  const yBot = 175;
  const parts: string[] = [];

  parts.push(vSource(x0, yTop, yBot, `${Vs}V`));

  let x = x0;
  for (let i = 0; i < n; i++) {
    const entry = resistors[i]!;
    const rLabel = entry.label ?? `R${i + 1}=${entry.ohms}Ω`;

    parts.push(wire(x, yTop, x + 8, yTop));
    x += 8;
    parts.push(resistorH(x, yTop, rW, rLabel));
    x += rW;

    // Overlay voltage drops once the solving step is reached
    const annotate = stepIndex === undefined || stepIndex >= 3;
    const vDrop = annotate
      ? (sv(sol, `V_R${i + 1}`) ?? sv(sol, `VR${i + 1}`))
      : undefined;
    if (vDrop !== undefined) {
      parts.push(
        `<text x="${x - rW / 2}" y="${yTop + 30}" font-size="10" text-anchor="middle" fill="#2e7d32">${fmtNum(vDrop, 1)}V</text>`,
      );
    }
  }

  const xEnd = x;
  parts.push(wire(xEnd, yTop, xEnd, yBot));
  parts.push(wire(xEnd, yBot, x0, yBot));
  parts.push(ground(x0 + 30, yBot));

  const iVal = sv(sol, 'I');
  const iLabel = iVal !== undefined ? `I=${fmtNum(iVal, 2)}A` : 'I';
  parts.push(currentArrow(x0 + 55, yBot - 14, x0 + 95, yBot - 14, iLabel));

  return wrapSvg(parts.join(''), xEnd + 60, 220);
}

// ── Nodal analysis ────────────────────────────────────────────────────
function renderNodal(params: NodalAnalysisParams, sol: EESolution): string {
  const { nodeCount, resistors } = params;
  const n = Math.min(nodeCount, 4);
  const x0 = 40;
  const yTop = 40;
  const yBot = 185;
  const nodeSpacing = 110;
  const nodeXs = Array.from({ length: n }, (_, i) => x0 + i * nodeSpacing);
  const parts: string[] = [];

  // Node labels with solved-voltage annotations
  for (let i = 0; i < n; i++) {
    const nx = nodeXs[i]!;
    const vSol = sv(sol, `V${i + 1}`);
    const lbl = vSol !== undefined ? `V${i + 1}=${fmtNum(vSol, 1)}V` : `V${i + 1}`;
    parts.push(node(nx, yTop, lbl, i === 0 ? '#2e7d32' : undefined));
  }

  // Resistor branches from [from, to, ohms] tuples
  for (const [from, to, ohms] of resistors) {
    if (to === 0) {
      // Shunt to ground
      const nx = nodeXs[(from - 1)] ?? x0;
      parts.push(wire(nx, yTop + 4, nx, yTop + 20));
      parts.push(resistorV(nx, yTop + 20, 55, `${ohms}Ω`));
      parts.push(wire(nx, yTop + 75, nx, yBot));
    } else {
      const x1 = nodeXs[from - 1] ?? 0;
      const x2 = nodeXs[to - 1] ?? 0;
      const left = Math.min(x1, x2);
      const len = Math.abs(x2 - x1) - 8;
      if (len > 20) {
        parts.push(resistorH(left + 4, yTop, len, `${ohms}Ω`));
      }
    }
  }

  // Ground bus
  const rightX = nodeXs[n - 1] ?? x0;
  parts.push(wire(x0, yBot, rightX, yBot));
  parts.push(ground((x0 + rightX) / 2, yBot));

  return wrapSvg(parts.join(''), rightX + 60, 220);
}

// ── Thevenin equivalent source circuit ───────────────────────────────
function renderThevenin(params: TheveninNortonParams, sol: EESolution): string {
  const { Vs, R1, R2, R3 } = params;
  const parts: string[] = [];
  const x0 = 30;
  const yTop = 50;
  const yBot = 170;

  parts.push(vSource(x0, yTop, yBot, `${Vs}V`));
  parts.push(wire(x0, yTop, x0 + 10, yTop));
  parts.push(resistorH(x0 + 10, yTop, 55, `R₁=${R1}Ω`));
  parts.push(wire(x0 + 65, yTop, x0 + 95, yTop));
  parts.push(wire(x0 + 95, yTop, x0 + 95, yTop + 20));
  parts.push(resistorV(x0 + 95, yTop + 20, 55, `R₂=${R2}Ω`));
  parts.push(wire(x0 + 95, yTop + 75, x0 + 95, yBot));
  parts.push(wire(x0 + 95, yTop, x0 + 125, yTop));
  parts.push(resistorH(x0 + 125, yTop, 55, `R₃=${R3}Ω`));
  parts.push(wire(x0 + 180, yTop, x0 + 205, yTop));
  parts.push(`<text x="${x0 + 212}" y="${yTop + 4}" font-size="12" font-weight="bold">A</text>`);
  parts.push(wire(x0 + 95, yBot, x0 + 205, yBot));
  parts.push(`<text x="${x0 + 212}" y="${yBot + 4}" font-size="12" font-weight="bold">B</text>`);
  parts.push(wire(x0, yBot, x0 + 95, yBot));
  parts.push(ground(x0 + 95, yBot));

  const vth = sv(sol, 'Vth');
  const rth = sv(sol, 'Rth');
  if (vth !== undefined) {
    parts.push(`<text x="${x0 + 215}" y="${yTop + 22}" font-size="10" fill="#1565c0">Vth=${fmtNum(vth, 2)}V</text>`);
  }
  if (rth !== undefined) {
    parts.push(`<text x="${x0 + 215}" y="${yTop + 58}" font-size="10" fill="#1565c0">Rth=${fmtNum(rth, 1)}Ω</text>`);
  }

  return wrapSvg(parts.join(''), 280, 220);
}

// ── RC transient circuit ──────────────────────────────────────────────
function renderRcTransient(params: RcStepParams, sol: EESolution): string {
  const { Vs, R, C, vc0 } = params;
  const Rlbl = `R=${R}Ω`;
  const Clbl = `C=${C}F`;
  const parts: string[] = [];

  parts.push(vSource(40, 40, 160, `${Vs}V`));
  parts.push(wire(40, 40, 80, 40));
  parts.push(resistorH(80, 40, 60, Rlbl));
  parts.push(wire(140, 40, 180, 40));
  parts.push(wire(180, 40, 180, 82));
  parts.push(`<line x1="168" y1="82" x2="192" y2="82" stroke="#333" stroke-width="2.5"/>`);
  parts.push(`<line x1="168" y1="94" x2="192" y2="94" stroke="#333" stroke-width="2.5"/>`);
  parts.push(`<text x="196" y="92" font-size="11">${Clbl}</text>`);
  parts.push(wire(180, 94, 180, 160));
  parts.push(wire(180, 160, 40, 160));
  parts.push(ground(110, 160));

  const tau = sv(sol, 'tau');
  if (tau !== undefined) {
    parts.push(`<text x="50" y="120" font-size="10" fill="#d32f2f">τ=${fmtNum(tau, 2)}s</text>`);
  }
  if (vc0 !== 0) {
    parts.push(`<text x="50" y="135" font-size="10" fill="#888">vc(0)=${vc0}V</text>`);
  }

  return wrapSvg(parts.join(''), 240, 190);
}

// ── RL transient circuit ──────────────────────────────────────────────
function renderRlTransient(params: RlTransientParams, sol: EESolution): string {
  const { Vs, R_src, L, R_fw } = params;
  const Rlbl = `R=${R_src}Ω`;
  const Llbl = `L=${L}H`;
  const parts: string[] = [];

  parts.push(vSource(40, 40, 160, `${Vs}V`));
  parts.push(wire(40, 40, 75, 40));
  parts.push(resistorH(75, 40, 55, Rlbl));
  parts.push(wire(130, 40, 162, 40));
  parts.push(inductorH(162, 40, 55, Llbl));
  parts.push(wire(217, 40, 250, 40));

  parts.push(wire(250, 40, 250, 80));
  parts.push(resistorV(250, 80, 50, `R_fw=${R_fw}Ω`));
  parts.push(wire(250, 130, 250, 160));
  parts.push(wire(250, 160, 40, 160));
  parts.push(ground(145, 160));

  const tau = sv(sol, 'tau');
  if (tau !== undefined) {
    parts.push(`<text x="175" y="105" font-size="10" fill="#d32f2f">τ=${fmtNum(tau, 3)}s</text>`);
  }
  const i0 = sv(sol, 'i0');
  if (i0 !== undefined) {
    parts.push(`<text x="175" y="125" font-size="10" fill="#888">i(0)=${fmtNum(i0, 3)}A</text>`);
  }

  return wrapSvg(parts.join(''), 300, 195);
}

// ── Series RLC (also used for AC-RLC and resonance) ───────────────────

function rlcCircuitSvg(RLabel: string, LLabel: string, CLabel: string, VsLabel: string, sol: EESolution): string {
  const parts: string[] = [];
  parts.push(vSource(30, 40, 170, VsLabel));
  parts.push(wire(30, 40, 60, 40));
  parts.push(resistorH(60, 40, 50, RLabel));
  parts.push(wire(110, 40, 142, 40));
  parts.push(inductorH(142, 40, 50, LLabel));
  parts.push(wire(192, 40, 222, 40));
  parts.push(capacitorH(222, 40, 20, CLabel));
  parts.push(wire(242, 40, 270, 40));
  parts.push(wire(270, 40, 270, 170));
  parts.push(wire(270, 170, 30, 170));
  parts.push(ground(150, 170));

  const w0 = sv(sol, 'w0') ?? sv(sol, 'omega0');
  if (w0 !== undefined) {
    parts.push(`<text x="175" y="115" font-size="10" fill="#1565c0">ω₀=${fmtNum(w0, 0)} r/s</text>`);
  }
  const iMag = sv(sol, 'I') ?? sv(sol, 'Imag');
  if (iMag !== undefined) {
    parts.push(`<text x="175" y="132" font-size="10" fill="#d32f2f">I=${fmtNum(iMag, 2)}A</text>`);
  }

  return wrapSvg(parts.join(''), 310, 200);
}

function renderRlcSeries(params: RlcSeriesStepParams, sol: EESolution): string {
  return rlcCircuitSvg(`R=${params.R}Ω`, `L=${params.L}H`, `C=${params.C}F`, `${params.Vs}V`, sol);
}

function renderAcRlc(params: AcSeriesRlcParams, sol: EESolution): string {
  const omega = 2 * Math.PI * params.f_Hz;
  return rlcCircuitSvg(
    `R=${params.R}Ω`,
    `L=${params.L}H`,
    `C=${params.C}F`,
    `${params.Vs_mag}V ω=${fmtNum(omega, 0)}`,
    sol,
  );
}

function renderResonance(params: SeriesResonanceParams, sol: EESolution): string {
  return rlcCircuitSvg(
    `R=${params.R}Ω`,
    `L=${params.L}H`,
    `C=${params.C}F`,
    'Vs',
    sol,
  );
}

// ── Mutual inductance / coupled coils ─────────────────────────────────
function renderMutualInductance(params: MutualInductanceParams, sol: EESolution): string {
  const { L1, L2, M } = params;
  const parts: string[] = [];

  parts.push(vSource(40, 45, 155, 'V_s'));
  parts.push(wire(40, 45, 40, 35));
  parts.push(wire(40, 35, 70, 35));
  parts.push(inductorH(70, 35, 65, `L₁=${L1}H`));
  parts.push(wire(135, 35, 135, 155));
  parts.push(wire(135, 155, 40, 155));

  parts.push(wire(70, 35, 200, 35));
  parts.push(inductorH(200, 35, 65, `L₂=${L2}H`));
  parts.push(wire(265, 35, 265, 155));
  parts.push(wire(265, 155, 135, 155));

  parts.push(`<line x1="100" y1="55" x2="230" y2="55" stroke="#1565c0" stroke-width="1.5" stroke-dasharray="5,4"/>`);
  parts.push(`<text x="165" y="48" font-size="10" text-anchor="middle" fill="#1565c0">M=${M}H</text>`);
  parts.push(`<text x="265" y="148" font-size="10" text-anchor="middle" fill="#888">open</text>`);

  const k = sv(sol, 'k');
  const v2 = sv(sol, 'V2_mag') ?? sv(sol, 'V2mag') ?? sv(sol, 'V2');
  if (k !== undefined) {
    parts.push(`<text x="90" y="120" font-size="10" fill="#1565c0">k=${fmtNum(k, 2)}</text>`);
  }
  if (v2 !== undefined) {
    parts.push(`<text x="200" y="120" font-size="10" fill="#2e7d32">|V₂|=${fmtNum(v2, 1)}V</text>`);
  }

  parts.push(ground(135, 155));
  parts.push(currentArrow(46, 95, 46, 115, 'I₁'));

  return wrapSvg(parts.join(''), 310, 185);
}

// ── Ideal transformer ─────────────────────────────────────────────────
function renderTransformerCircuit(params: IdealTransformerParams, sol: EESolution): string {
  const { n, Vs, Zs, ZL } = params;
  const ratio = `1:${n}`;
  const parts: string[] = [];

  parts.push(vSource(30, 50, 165, `${Vs}V`));
  parts.push(wire(30, 50, 65, 50));
  parts.push(resistorH(65, 50, 50, `Zs=${Zs}Ω`));
  parts.push(wire(115, 50, 145, 50));

  parts.push(`<line x1="145" y1="40" x2="145" y2="170" stroke="#333" stroke-width="2"/>`);
  parts.push(`<line x1="158" y1="40" x2="158" y2="170" stroke="#333" stroke-width="2.5"/>`);
  parts.push(`<line x1="168" y1="40" x2="168" y2="170" stroke="#333" stroke-width="2.5"/>`);
  parts.push(`<line x1="181" y1="40" x2="181" y2="170" stroke="#333" stroke-width="2"/>`);
  parts.push(`<text x="163" y="26" font-size="11" text-anchor="middle" font-style="italic">${ratio}</text>`);

  parts.push(wire(181, 50, 215, 50));
  parts.push(resistorH(215, 50, 50, `ZL=${ZL}Ω`));
  parts.push(wire(265, 50, 280, 50));
  parts.push(`<text x="287" y="54" font-size="11" font-weight="bold">A</text>`);

  parts.push(wire(145, 165, 30, 165));
  parts.push(wire(181, 165, 280, 165));
  parts.push(`<text x="287" y="169" font-size="11" font-weight="bold">B</text>`);
  parts.push(ground(110, 165));

  const i1 = sv(sol, 'I1');
  const vL = sv(sol, 'VL');
  const zRef = sv(sol, 'ZL_ref');
  if (i1 !== undefined) {
    parts.push(`<text x="38" y="128" font-size="10" fill="#d32f2f">I₁=${fmtNum(i1, 3)}A</text>`);
  }
  if (vL !== undefined) {
    parts.push(`<text x="218" y="128" font-size="10" fill="#2e7d32">VL=${fmtNum(vL, 2)}V</text>`);
  }
  if (zRef !== undefined) {
    parts.push(`<text x="120" y="120" font-size="9" fill="#1565c0">Z'L=${fmtNum(zRef, 0)}Ω</text>`);
  }

  return wrapSvg(parts.join(''), 310, 205);
}

// ── Delta–Wye network ─────────────────────────────────────────────────
function renderDeltaWye(params: DeltaWyeParams, sol: EESolution): string {
  const { Rab, Rbc, Rca } = params;
  const parts: string[] = [];

  const Ax = 80; const Ay = 50;
  const Bx = 150; const By = 155;
  const Cx = 230; const Cy = 50;

  parts.push(`<text x="${Ax - 16}" y="${Ay + 4}" font-size="11" font-weight="bold">A</text>`);
  parts.push(`<text x="${Bx}" y="${By + 18}" font-size="11" font-weight="bold">B</text>`);
  parts.push(`<text x="${Cx + 8}" y="${Cy + 4}" font-size="11" font-weight="bold">C</text>`);

  parts.push(wire(Ax, Ay, (Ax + Bx) / 2 - 28, (Ay + By) / 2 - 10));
  parts.push(resistorH((Ax + Bx) / 2 - 28, (Ay + By) / 2, 56, `${Rab}Ω`));
  parts.push(wire((Ax + Bx) / 2 + 28, (Ay + By) / 2 - 10, Bx, By - 8));

  const bcMidX = (Bx + Cx) / 2;
  const bcMidY = (By + Cy) / 2;
  parts.push(wire(Bx + 10, By - 8, bcMidX - 28, bcMidY));
  parts.push(resistorH(bcMidX - 28, bcMidY, 56, `${Rbc}Ω`));
  parts.push(wire(bcMidX + 28, bcMidY, Cx - 10, Cy + 8));

  parts.push(resistorH(Ax + 10, Ay, Cx - Ax - 20, `${Rca}Ω`));

  const Ra = sv(sol, 'Ra');
  const Rb = sv(sol, 'Rb');
  const Rc = sv(sol, 'Rc');
  if (Ra !== undefined && Rb !== undefined && Rc !== undefined) {
    parts.push(`<text x="268" y="72" font-size="10" text-anchor="start" fill="#1565c0">Y: Ra=${fmtNum(Ra, 0)}Ω</text>`);
    parts.push(`<text x="268" y="88" font-size="10" text-anchor="start" fill="#1565c0">Rb=${fmtNum(Rb, 0)}Ω</text>`);
    parts.push(`<text x="268" y="104" font-size="10" text-anchor="start" fill="#1565c0">Rc=${fmtNum(Rc, 0)}Ω</text>`);
  }

  return wrapSvg(parts.join(''), 330, 185);
}

// ── BJT CE hybrid-π model ─────────────────────────────────────────────
function renderBjtHybridPi(params: BjtCeAmplifierParams, sol: EESolution): string {
  const { IC, beta, VA, RC, RS } = params;

  const gm = sv(sol, 'gm') ?? (IC / 0.026);
  const rpi = sv(sol, 'rpi') ?? (beta / gm);
  const Av = sv(sol, 'Av');
  const ro = sv(sol, 'ro') ?? sv(sol, 'Rout');
  const Rin = sv(sol, 'Rin');
  const Rout = sv(sol, 'Rout') ?? ro;

  const parts: string[] = [];

  parts.push(`<text x="70" y="26" font-size="11" font-weight="bold" text-anchor="middle">B</text>`);
  parts.push(`<text x="178" y="26" font-size="11" font-weight="bold" text-anchor="middle">C</text>`);
  parts.push(`<text x="145" y="168" font-size="11" font-weight="bold" text-anchor="middle">E</text>`);

  parts.push(wire(70, 30, 70, 90));
  parts.push(resistorH(70, 90, 60, `rπ=${fmtNum(rpi, 1)}Ω`));
  parts.push(wire(130, 90, 178, 90));
  parts.push(wire(145, 90, 145, 155));

  parts.push(wire(20, 90, 70, 90));
  parts.push(`<text x="8" y="78" font-size="9">v_in</text>`);
  if (Rin !== undefined) {
    parts.push(`<text x="8" y="100" font-size="9">R_in=${fmtNum(Rin, 0)}Ω</text>`);
  }
  parts.push(`<text x="8" y="148" font-size="9">R_S=${fmtNum(RS, 0)}Ω</text>`);

  parts.push(`<polygon points="178,65 194,90 178,115 162,90" fill="none" stroke="#333" stroke-width="2"/>`);
  parts.push(`<text x="168" y="78" font-size="8" text-anchor="middle">gm·vbe</text>`);

  parts.push(wire(178, 30, 178, 65));
  parts.push(wire(178, 115, 178, 155));
  parts.push(resistorV(178, 30, 30, ''));
  parts.push(`<text x="148" y="48" font-size="8" text-anchor="end">R_C=${fmtNum(RC, 0)}Ω rc</text>`);

  parts.push(wire(145, 155, 178, 155));
  parts.push(resistorH(145, 155, 40, `R_E=0Ω`));
  parts.push(`<text x="128" y="172" font-size="8" fill="#666">re</text>`);
  parts.push(ground(165, 175));

  void IC;

  const panel: string[] = [
    `gm=${fmtNum(gm, 3)}S`,
    `β=${beta}`,
    `V_A=${VA}V`,
  ];
  if (ro !== undefined) panel.push(`r_o=${fmtNum(ro, 0)}Ω`);
  if (Rout !== undefined) panel.push(`R_out=${fmtNum(Rout, 0)}Ω`);
  if (Av !== undefined) panel.push(`Av≈${fmtNum(Av, 0)}`);

  return splitSchematicPanel(parts, panel, 168, 200, 150);
}

// ── MOSFET CS amplifier ───────────────────────────────────────────────
function renderMosfetCs(params: MosfetCsParams, sol: EESolution): string {
  const { kn, VTN, VGS, lambda, RD } = params;
  const gm = sv(sol, 'gm') ?? (2 * kn * (VGS - VTN));
  const Av = sv(sol, 'Av');
  const parts: string[] = [];

  parts.push(`<text x="14" y="84" font-size="10">v_in</text>`);
  parts.push(wire(40, 80, 85, 80));

  parts.push(`<rect x="85" y="58" width="30" height="44" fill="none" stroke="#333" stroke-width="2" rx="2"/>`);
  parts.push(`<text x="100" y="82" font-size="9" text-anchor="middle">NMOS</text>`);
  parts.push(`<text x="118" y="48" font-size="8">Vgs=${VGS}V</text>`);

  parts.push(wire(100, 58, 100, 30));
  parts.push(resistorV(100, 10, 18, `Rd=${fmtNum(RD, 0)}Ω`));
  parts.push(wire(100, 10, 100, 0));
  parts.push(`<text x="112" y="6" font-size="9" fill="#888">VDD</text>`);

  parts.push(wire(100, 102, 100, 145));
  parts.push(ground(100, 145));

  parts.push(wire(100, 58, 148, 58));
  parts.push(`<text x="152" y="68" font-size="9">v_out</text>`);

  parts.push(`<polygon points="138,40 152,58 138,75 124,58" fill="none" stroke="#333" stroke-width="1.5"/>`);
  parts.push(`<text x="138" y="88" font-size="8" text-anchor="middle">gm·vgs</text>`);

  void kn;
  void VTN;

  const ro = sv(sol, 'ro') ?? sv(sol, 'Rout');
  const ID = sv(sol, 'ID');
  const Vov = sv(sol, 'Vov');
  const panel: string[] = [];
  if (ID !== undefined) panel.push(`I_D=${fmtNum(ID * 1e3, 2)}mA`);
  if (Vov !== undefined) panel.push(`V_ov=${fmtNum(Vov, 2)}V`);
  panel.push(`gm=${fmtNum(gm, 3)}S`);
  panel.push(`λ=${lambda}`);
  if (ro !== undefined) panel.push(`r_o=${fmtNum(ro, 0)}Ω`);
  if (Av !== undefined) panel.push(`Av=${fmtNum(Av, 2)}`);

  return splitSchematicPanel(parts, panel, 168, 190, 140);
}

// ── MOSFET differential pair ──────────────────────────────────────────
function renderDiffPair(params: MosfetDiffPairParams, sol: EESolution): string {
  const { gm, RD, RSS } = params;
  const Ad = sv(sol, 'Ad');
  const cmrr = sv(sol, 'CMRRdB');
  const parts: string[] = [];

  parts.push(`<rect x="90" y="50" width="26" height="28" fill="none" stroke="#333" stroke-width="2" rx="2"/>`);
  parts.push(`<text x="103" y="68" font-size="8" text-anchor="middle">M1</text>`);

  parts.push(`<rect x="170" y="50" width="26" height="28" fill="none" stroke="#333" stroke-width="2" rx="2"/>`);
  parts.push(`<text x="183" y="68" font-size="8" text-anchor="middle">M2</text>`);

  parts.push(wire(103, 50, 103, 30));
  parts.push(resistorV(103, 10, 18, `Rd=${RD}Ω`));
  parts.push(wire(183, 50, 183, 30));
  parts.push(resistorV(183, 10, 18, `Rd=${RD}Ω`));
  parts.push(`<text x="103" y="6" font-size="9" text-anchor="middle" fill="#888">VDD</text>`);
  parts.push(`<text x="183" y="6" font-size="9" text-anchor="middle" fill="#888">VDD</text>`);

  parts.push(wire(40, 64, 90, 64));
  parts.push(`<text x="24" y="68" font-size="9">v_in+</text>`);
  parts.push(wire(196, 64, 240, 64));
  parts.push(`<text x="244" y="68" font-size="9">v_in-</text>`);

  parts.push(wire(103, 78, 103, 105));
  parts.push(wire(183, 78, 183, 105));
  parts.push(wire(103, 105, 183, 105));
  parts.push(wire(143, 105, 143, 128));

  parts.push(`<circle cx="143" cy="140" r="12" fill="none" stroke="#333" stroke-width="2"/>`);
  parts.push(`<text x="143" y="144" font-size="8" text-anchor="middle">ISS</text>`);
  parts.push(wire(143, 152, 143, 170));
  parts.push(ground(143, 170));

  parts.push(`<text x="155" y="142" font-size="9" fill="#888">Rss=${RSS}Ω</text>`);
  parts.push(`<text x="248" y="118" font-size="10" fill="#1565c0">gm=${fmtNum(gm, 3)}S</text>`);
  if (Ad !== undefined) {
    parts.push(`<text x="248" y="134" font-size="10" fill="#d32f2f">Ad=${fmtNum(Ad, 0)}</text>`);
  }
  if (cmrr !== undefined) {
    parts.push(`<text x="248" y="150" font-size="9" fill="#888">CMRR≈${fmtNum(cmrr, 0)}dB</text>`);
  }

  return wrapSvg(parts.join(''), 320, 195);
}

// ── Op-amp inverting summer ───────────────────────────────────────────
function renderOpampCircuit(params: OpampSummerParams, sol: EESolution): string {
  const { Rf, inputs } = params;
  const Vout = sv(sol, 'Vout');
  const parts: string[] = [];

  parts.push(`<polygon points="150,60 220,35 220,85 150,60" fill="none" stroke="#333" stroke-width="2"/>`);
  parts.push(`<text x="132" y="46" font-size="11">+</text>`);
  parts.push(`<text x="132" y="80" font-size="11">−</text>`);

  const inp0 = inputs[0];
  if (inp0) {
    parts.push(wire(40, 72, 75, 72));
    parts.push(`<text x="14" y="76" font-size="9">v_in</text>`);
    parts.push(resistorH(75, 72, 45, `Rg=${fmtNum(inp0.R, 0)}Ω`));
    parts.push(wire(120, 72, 150, 72));
  }
  parts.push(wire(40, 48, 150, 48));
  parts.push(ground(32, 50));

  parts.push(wire(95, 72, 95, 20));
  parts.push(wire(95, 20, 220, 20));
  parts.push(resistorH(115, 20, 70, `Rf=${fmtNum(Rf, 0)}Ω`));
  parts.push(wire(220, 20, 220, 35));

  parts.push(wire(220, 60, 270, 60));
  if (Vout !== undefined) {
    parts.push(`<text x="274" y="64" font-size="10">v_out=${fmtNum(Vout, 2)}V</text>`);
  } else {
    parts.push(`<text x="274" y="64" font-size="10">v_out</text>`);
  }

  return wrapSvg(parts.join(''), 340, 120);
}

// ═══════════════════════════════════════════════════════════════════════
// BODE PLOT — computed polyline from transfer-function poles/zeros
// ═══════════════════════════════════════════════════════════════════════

/**
 * Evaluate |H(jω)| in dB using the Bode normalized form:
 *   H(jω) = K · ∏(1+jω/zᵢ) / [(jω)^m · ∏(1+jω/pⱼ)]
 * where 0-valued entries mean origin poles/zeros.
 */
function bodeMagdB(zeros: number[], poles: number[], K: number, omega: number): number {
  let mag = Math.abs(K);
  for (const z of zeros) {
    mag *= z > 0 ? Math.sqrt(1 + (omega / z) ** 2) : omega;
  }
  for (const p of poles) {
    if (p <= 0) {
      if (omega <= 0) return -200;
      mag /= omega;
    } else {
      mag /= Math.sqrt(1 + (omega / p) ** 2);
    }
  }
  return 20 * Math.log10(Math.max(mag, 1e-30));
}

function renderBodePlot(params: BodePlotParams, sol: EESolution): string {
  const { zeros, poles, gain } = params;
  const points = 40;

  // Compute omega range from corner frequencies or defaults
  const allFreqs = [...zeros, ...poles].filter(f => f > 0);
  const omStart = allFreqs.length > 0 ? Math.min(...allFreqs) / 10 : 1;
  const omEnd   = allFreqs.length > 0 ? Math.max(...allFreqs) * 10 : 1e4;

  const freqs = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    return omStart * Math.pow(omEnd / omStart, t);
  });

  const mags = freqs.map((om: number) => bodeMagdB(zeros, poles, gain, om));

  const dBmin = Math.min(...mags) - 5;
  const dBmax = Math.max(...mags) + 5;

  const xOf = (om: number): number =>
    50 + (Math.log10(om / omStart) / Math.log10(omEnd / omStart)) * 320;
  const yOf = (dB: number): number =>
    160 - ((dB - dBmin) / (dBmax - dBmin)) * 130;

  const polyPts = freqs.map((om: number, i: number) => `${xOf(om).toFixed(1)},${yOf(mags[i]!).toFixed(1)}`).join(' ');

  // Annotate evaluated point from solution if available
  const evalOm = params.evalAt_omega;
  const h_dB = sv(sol, 'H_dB');

  const parts: string[] = [
    `<line x1="50" y1="160" x2="375" y2="160" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="50" y1="30" x2="50" y2="165" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="50" y1="${yOf(0).toFixed(1)}" x2="375" y2="${yOf(0).toFixed(1)}" stroke="#ddd" stroke-width="1" stroke-dasharray="4,3"/>`,
    `<polyline points="${polyPts}" fill="none" stroke="#1565c0" stroke-width="2"/>`,
    `<text x="212" y="186" font-size="10" text-anchor="middle">ω (rad/s)</text>`,
    `<text x="22" y="100" font-size="10" text-anchor="middle" transform="rotate(-90,22,100)">|H| dB</text>`,
    `<text x="212" y="20" font-size="12" text-anchor="middle" font-weight="bold">Bode Magnitude</text>`,
    ...[...zeros.filter(z => z > 0), ...poles.filter(p => p > 0)].slice(0, 4).map((cf: number, i: number) => {
      const xc = xOf(cf);
      const role = zeros.includes(cf) ? 'z' : 'p';
      return `<text x="${xc.toFixed(0)}" y="${44 + i * 16}" font-size="9" fill="#888">${role}@${fmtNum(cf, 0)}</text>`;
    }),
  ];

  if (evalOm !== undefined && h_dB !== undefined) {
    const xe = xOf(evalOm);
    const ye = yOf(h_dB);
    parts.push(`<circle cx="${xe.toFixed(1)}" cy="${ye.toFixed(1)}" r="4" fill="#d32f2f"/>`);
    parts.push(`<text x="${xe.toFixed(0)}" y="${(ye - 8).toFixed(0)}" font-size="9" fill="#d32f2f">${fmtNum(h_dB, 1)}dB</text>`);
  }

  return wrapSvg(parts.join(''), 400, 205);
}

// ═══════════════════════════════════════════════════════════════════════
// EQUATION PANELS — generated from solution.steps + solution.computed
// ═══════════════════════════════════════════════════════════════════════

/** Shared helper: pick step formulas from solution or fallback, pass to equationPanel */
function eqPanel(sol: EESolution, fallback: string[], w = 320, h = 140): string {
  return equationPanel(panelLines(sol, fallback), w, h);
}

function renderMeshPanel(params: MeshAnalysisParams, sol: EESolution): string {
  const { meshCount, Vs, selfZ } = params;
  const fb = [
    `Meshes: ${meshCount}`,
    `Vs: [${Vs.map(v => `${v}V`).join(', ')}]`,
    `selfZ: [${selfZ.map(z => `${z}Ω`).join(', ')}]`,
    `I1=${fmtSv(sol, 'I1', 'A')} I2=${fmtSv(sol, 'I2', 'A')}`,
  ];
  return eqPanel(sol, fb);
}

function renderSuperpositionPanel(params: SuperpositionParams, sol: EESolution): string {
  const { Vs, Is, R1, R2, R3 } = params;
  const fb = [
    `Vs=${Vs}V Is=${Is}A`,
    `R1=${R1}Ω R2=${R2}Ω R3=${R3}Ω`,
    `I_Vs = ${fmtSv(sol, 'I_R3_vs', 'A')}`,
    `I_Is = ${fmtSv(sol, 'I_R3_is', 'A')} → sum`,
  ];
  return eqPanel(sol, fb);
}

function renderPfCorrectionPanel(params: PfCorrectionParams, sol: EESolution): string {
  const { P_W, pf1, pf2, V_rms, f_Hz } = params;
  const fb = [
    `P = ${fmtNum(P_W, 0)} W @ ${V_rms}V ${f_Hz}Hz`,
    `PF: ${pf1} → ${pf2}`,
    `Qc = ${fmtSv(sol, 'Qc', ' VAR')}`,
    `C ≈ ${fmtSv(sol, 'C', ' F')}`,
  ];
  return eqPanel(sol, fb);
}

function renderYbusPanel(params: YbusFormationParams, sol: EESolution): string {
  const { nBuses, lines } = params;
  const line0 = lines[0];
  const y11_re = sv(sol, 'Y11_re') ?? 0;
  const y11_im = sv(sol, 'Y11_im') ?? 0;
  const fb = [
    `${nBuses}-bus Ybus`,
    line0 ? `y${line0.from}${line0.to}=${fmtNum(line0.y.re, 2)}+j${fmtNum(line0.y.im, 2)}` : 'lines: see params',
    `Y11=${fmtNum(y11_re, 2)}+j${fmtNum(y11_im, 2)}`,
    `Yij=−yij (off-diag)`,
  ];
  return eqPanel(sol, fb);
}

function renderZParamsPanel(params: ZParametersParams, sol: EESolution): string {
  const { Za, Zb, Zc } = params;
  const toN = (v: number | { re: number; im: number }): number =>
    typeof v === 'number' ? v : Math.sqrt(v.re ** 2 + v.im ** 2);
  const Z11 = sv(sol, 'Z11') ?? (toN(Za) + toN(Zc));
  const Z12 = sv(sol, 'Z12') ?? toN(Zc);
  const Z22 = sv(sol, 'Z22') ?? (toN(Zb) + toN(Zc));
  const fb = [
    `Za=${toN(Za)}Ω Zb=${toN(Zb)}Ω Zc=${toN(Zc)}Ω`,
    `Z11=${fmtNum(Z11, 0)}Ω Z12=${fmtNum(Z12, 0)}Ω`,
    `Z22=${fmtNum(Z22, 0)}Ω Z21=Z12`,
    `Reciprocal: Z12 = Z21`,
  ];
  return eqPanel(sol, fb);
}

function renderAbcdPanel(params: AbcdCascadeParams, sol: EESolution): string {
  const { sections, ZL } = params;
  const fb = [
    `${sections.length} cascaded sections`,
    `ZL: re=${typeof ZL === 'object' ? ZL.re : ZL}Ω`,
    `Av = ${fmtSv(sol, 'Av_mag', '')}`,
    `[ABCD] = product of section matrices`,
  ];
  return eqPanel(sol, fb);
}

function renderTwoPortPanel(params: TwoPortGainParams, sol: EESolution): string {
  const { Z11, Z12, Z22, Zs, ZL } = params;
  const fb = [
    `Z11=${Z11}Ω Z12=${Z12}Ω Z22=${Z22}Ω`,
    `Zs=${Zs}Ω ZL=${ZL}Ω`,
    `Av ≈ ${fmtSv(sol, 'Av', '')}`,
    `Zin ≈ ${fmtSv(sol, 'Zin', 'Ω')}`,
  ];
  return eqPanel(sol, fb);
}

function renderThreePhasePanel(params: ThreePhaseYYParams, sol: EESolution): string {
  const { VL_rms, Z_ph } = params;
  const fb = [
    `Y-Y: VL=${VL_rms}V`,
    `Zph=${Z_ph.re}+j${Z_ph.im}Ω`,
    `Vph=${fmtSv(sol, 'Vph', 'V')} IL=${fmtSv(sol, 'IL', 'A')}`,
    `P=${fmtSv(sol, 'P', 'W')}`,
  ];
  return eqPanel(sol, fb);
}

function renderPerUnitPanel(params: PerUnitParams, sol: EESolution): string {
  const { Sbase_MVA, zones } = params;
  const zone0 = zones[0];
  const zone1 = zones[1];
  const fb = [
    `Sbase=${Sbase_MVA}MVA`,
    zone0 ? `V1=${zone0.Vbase_kV}kV → Zb1=${fmtNum(zone0.Vbase_kV ** 2 / Sbase_MVA, 2)}Ω` : '',
    zone1 ? `V2=${zone1.Vbase_kV}kV → Zb2=${fmtNum(zone1.Vbase_kV ** 2 / Sbase_MVA, 2)}Ω` : '',
    `Z_pu = Z_Ω / Zb`,
  ].filter(Boolean);
  return eqPanel(sol, fb);
}

function renderFeedbackPanel(params: SeriesShuntFeedbackParams, sol: EESolution): string {
  const { A, beta_f, Rin, Rout } = params;
  const T = A * beta_f;
  const Af = sv(sol, 'Af') ?? A / (1 + T);
  const fb = [
    `A=${A} β=${beta_f}`,
    `T=Aβ=${fmtNum(T, 0)}`,
    `Af=${fmtNum(Af, 1)} (closed-loop)`,
    `Rif=${fmtSv(sol, 'Rif', 'Ω')} Rof=${fmtSv(sol, 'Rof', 'Ω')}`,
  ];
  // Suppress unused-param warning
  void Rin; void Rout;
  return eqPanel(sol, fb);
}

function renderFaultPanel(params: SymmetricalFaultParams, sol: EESolution): string {
  const { nBuses, lines, Vpre, faultBus } = params;
  const Zbus = zbusFromLines(nBuses, lines);
  const Zff = Zbus[faultBus - 1]?.[faultBus - 1];
  const Zff_im = Zff?.im ?? 0.1;
  const If_mag = sv(sol, 'If_mag') ?? (Vpre / Math.abs(Zff_im));
  const fb = [
    `Vpre=${Vpre}pu Z_ff=j${fmtNum(Zff_im, 3)}pu`,
    `If = Vpre/Z_ff = ${fmtNum(Math.abs(If_mag), 2)}pu`,
    `Vi=Vpre−Zif·If (all buses)`,
    `V_fault≈${fmtSv(sol, 'V_fault', 'pu')}`,
  ];
  return eqPanel(sol, fb);
}

function renderPowerFlowPanel(params: GaussSeidelPfParams, sol: EESolution): string {
  const { buses, maxIter, tolerance } = params;
  const iter = sv(sol, 'iter') ?? maxIter;
  const fb = [
    `${buses.length}-bus Gauss-Seidel`,
    `maxIter=${maxIter} tol=${tolerance}`,
    `Converged in ${fmtNum(iter, 0)} iterations`,
    `G-S or N-R iteration`,
  ];
  return eqPanel(sol, fb);
}

function renderOscillatorPanel(params: IntegratorOscillatorParams, sol: EESolution): string {
  const { f0, C } = params;
  const R_val = sv(sol, 'R') ?? (1 / (2 * Math.PI * f0 * C));
  const fb = [
    `f0 = ${f0} Hz`,
    `C = ${C} F`,
    `R ≈ ${fmtNum(R_val, 1)} Ω`,
    `β: |L|=1, ∠L=−180°`,
  ];
  return eqPanel(sol, fb);
}

function renderGenericPanel(sol: EESolution): string {
  const eqs = sol.steps.length > 0
    ? sol.steps.map(s => s.formula)
    : Object.entries(sol.computed).slice(0, 4).map(([k, v]) => `${k} = ${fmtNum(v, 3)}`);
  return equationPanel(eqs.length > 0 ? eqs : ['Solution', 'see computed values']);
}
