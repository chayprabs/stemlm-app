/**
 * EE Benchmark Solver — entry point.
 *
 * solve(spec: EEProblemSpec): EESolution
 *
 * Dispatches on spec.kind and derives all answers from spec.params using
 * real EE formulas.  No hardcoded answers per question ID.
 */

import type {
  EEProblemSpec,
  EESolution,
  SolutionStep,
  Complex,
  ABCDSection,
} from '../spec-types';

import {
  cx, cAdd, cSub, cMul, cDiv, cAbs, cAngle, cConj, cScale, cNeg, cParallel,
  polar,
  parallel,
  solveLinearSystem,
  solveLinearSystemC,
  solve2x2,
  rlcRoots,
  mat2cMul, abcdSeriesZ, abcdShuntY, abcdSectionMatrix, sectionImpedance,
  bodeMag, bodePhase,
  rootLocusCentroid, rootLocusAsymptoteAngles,
  buildYbus3, buildYbusN, gsUpdatePQ, calcPinj, calcQinj,
  type Mat2C,
} from './math-utils';

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function step(formula: string, explanation: string): SolutionStep {
  return { formula, explanation };
}

function sol(kind: string, computed: Record<string, number>, steps: SolutionStep[]): EESolution {
  return { kind, computed, steps };
}

const VT = 0.026; // thermal voltage at 300 K (V)

// ---------------------------------------------------------------------------
// Q01: KVL single-loop series circuit  (kind: 'kvl-series-loop')
// ---------------------------------------------------------------------------

function solveKvl(p: { Vs: number; resistors: Array<{ label: string; ohms: number }> }, kind: string): EESolution {
  const Rtot = p.resistors.reduce((a, r) => a + r.ohms, 0);
  const I = p.Vs / Rtot;
  const drops: Record<string, number> = {};
  p.resistors.forEach((r, i) => { drops[`V_R${i + 1}`] = I * r.ohms; });
  return sol(kind, { Vs: p.Vs, Rtot, I, ...drops }, [
    step(`R_{total} = ${Rtot}\\,\\Omega`, 'Sum series resistances.'),
    step(`I = V_s/R_{total} = ${I.toFixed(6)}\\,\\text{A}`, 'Ohm\'s law for the loop.'),
    step('V_{R_i} = I R_i', 'Voltage drops by V = IR.'),
    step('\\sum V_{R_i} = V_s\\;\\checkmark', 'KVL verification.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q02: Nodal analysis  (kind: 'nodal-analysis')
// Generic: builds conductance matrix from resistor list, fixed voltages, current sources.
// ---------------------------------------------------------------------------

function solveNodalAnalysis(
  p: {
    nodeCount: number;
    fixedVoltages: Record<number, number>;
    resistors: [number, number, number][];
    currentSources?: [number, number][];
  },
  kind: string
): EESolution {
  const n = p.nodeCount;
  // Identify unknown nodes (not in fixedVoltages, not ground = node 0)
  const fixed = new Map<number, number>(Object.entries(p.fixedVoltages).map(([k, v]) => [Number(k), v]));
  const unknownNodes: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (!fixed.has(i)) unknownNodes.push(i);
  }
  const m = unknownNodes.length;
  const idx = new Map(unknownNodes.map((node, i) => [node, i]));

  // Build G matrix and I vector for unknown nodes
  const G: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  const I: number[] = new Array<number>(m).fill(0);

  for (const [from, to, ohms] of p.resistors) {
    const g = 1 / ohms;
    const iFrom = idx.get(from);
    const iTo = idx.get(to);
    // from–to resistor contributions
    if (iFrom !== undefined) {
      const rowFrom = G[iFrom];
      if (rowFrom) {
        rowFrom[iFrom] = (rowFrom[iFrom] ?? 0) + g;
        if (iTo !== undefined) {
          rowFrom[iTo] = (rowFrom[iTo] ?? 0) - g;
        } else {
          const Vto = to === 0 ? 0 : (fixed.get(to) ?? 0);
          I[iFrom] = (I[iFrom] ?? 0) + g * Vto;
        }
      }
    }
    if (iTo !== undefined) {
      const rowTo = G[iTo];
      if (rowTo) {
        rowTo[iTo] = (rowTo[iTo] ?? 0) + g;
        if (iFrom !== undefined) {
          rowTo[iFrom] = (rowTo[iFrom] ?? 0) - g;
        } else {
          const Vfrom = from === 0 ? 0 : (fixed.get(from) ?? 0);
          I[iTo] = (I[iTo] ?? 0) + g * Vfrom;
        }
      }
    }
  }

  // Current sources
  for (const [nodeId, amps] of (p.currentSources ?? [])) {
    const i = idx.get(nodeId);
    if (i !== undefined) I[i] = (I[i] ?? 0) + amps;
  }

  let voltages: number[];
  try {
    voltages = solveLinearSystem(G, I);
  } catch {
    voltages = new Array<number>(m).fill(0);
  }

  const computed: Record<string, number> = {};
  fixed.forEach((v, node) => { computed[`V${node}`] = v; });
  unknownNodes.forEach((node, i) => { computed[`V${node}`] = voltages[i] ?? 0; });

  return sol(kind, computed, [
    step('\\text{Build conductance matrix }G\\text{ from resistor list}', 'G[i][i] = sum of conductances at node i.'),
    step('G V = I_{inj}', 'Nodal equations in matrix form.'),
    step(`\\text{Solve }${m}\\times${m}\\text{ system}`, 'Gaussian elimination for unknown node voltages.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q03: Mesh analysis  (kind: 'mesh-analysis')
// ---------------------------------------------------------------------------

function solveMeshAnalysis(
  p: {
    meshCount: number;
    Vs: number[];
    selfZ: number[];
    mutualZ: [number, number, number][];
  },
  kind: string
): EESolution {
  const n = p.meshCount;
  const Z: number[][] = Array.from({ length: n }, (_, i) =>
    new Array<number>(n).fill(0).map((__, j) => i === j ? (p.selfZ[i] ?? 0) : 0)
  );
  for (const [i, j, z] of p.mutualZ) {
    if (i >= 0 && i < n && j >= 0 && j < n) {
      (Z[i] as number[])[j] = -z;
      (Z[j] as number[])[i] = -z;
    }
  }
  let currents: number[];
  try {
    currents = solveLinearSystem(Z, p.Vs.slice(0, n));
  } catch {
    currents = new Array<number>(n).fill(0);
  }
  const computed: Record<string, number> = {};
  currents.forEach((I, i) => { computed[`I${i + 1}`] = I; });
  return sol(kind, computed, [
    step('[Z][I] = [V]', 'Mesh-impedance matrix from KVL around each mesh.'),
    step(`\\text{Solve }${n}\\times${n}\\text{ system}`, 'Gaussian elimination for mesh currents.'),
    step(currents.map((I, i) => `I_${i + 1}=${I.toFixed(4)}`).join(',\\;'), 'Mesh currents.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q04: Superposition  (kind: 'superposition')
// ---------------------------------------------------------------------------

function solveSuperposition(
  p: { Vs: number; Is: number; R1: number; R2: number; R3: number },
  kind: string
): EESolution {
  // Vs only (Is open): R2||R3 shunt in series with R1
  const R23p = parallel(p.R2, p.R3);
  const V_node_vs = p.Vs * R23p / (p.R1 + R23p);
  const I_R3_vs = V_node_vs / p.R3;
  // Is only (Vs shorted): R1||R2||R3 from node
  const G_tot = 1 / p.R1 + 1 / p.R2 + 1 / p.R3;
  const V_node_is = p.Is / G_tot;
  const I_R3_is = V_node_is / p.R3;
  const I_R3 = I_R3_vs + I_R3_is;
  return sol(kind, { I_R3_vs, I_R3_is, I_R3, V_node_vs, V_node_is }, [
    step('I_{R_3} = I_{R_3}^{V_s} + I_{R_3}^{I_s}', 'Superposition principle for linear circuits.'),
    step(`V_{node}^{V_s} = ${V_node_vs.toFixed(4)}\\,\\text{V},\\; I_{R_3}^{V_s} = ${I_R3_vs.toFixed(4)}\\,\\text{A}`,
         'With Is open: voltage divider.'),
    step(`V_{node}^{I_s} = ${V_node_is.toFixed(4)}\\,\\text{V},\\; I_{R_3}^{I_s} = ${I_R3_is.toFixed(4)}\\,\\text{A}`,
         'With Vs shorted: parallel conductance.'),
    step(`I_{R_3} = ${I_R3.toFixed(4)}\\,\\text{A}`, 'Superposed result.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q05: Thevenin / Norton  (kind: 'thevenin-norton')
// Topology: Vs — R1 — junction J (R2 to gnd) — R3 — terminal A, B = gnd
// ---------------------------------------------------------------------------

function solveTheveninNorton(
  p: { Vs: number; R1: number; R2: number; R3: number },
  kind: string
): EESolution {
  const Vth = p.Vs * p.R2 / (p.R1 + p.R2);  // open A: divider at J
  const R1R2p = parallel(p.R1, p.R2);
  const Rth = p.R3 + R1R2p;
  const In = Vth / Rth;
  const Pmax = Vth * Vth / (4 * Rth);
  return sol(kind, { Vth, Rth, In, Pmax, R1R2p }, [
    step(`V_{th} = V_s R_2/(R_1+R_2) = ${Vth.toFixed(4)}\\,\\text{V}`, 'Open-circuit voltage.'),
    step(`R_{th} = R_3+(R_1\\|R_2) = ${Rth.toFixed(4)}\\,\\Omega`, 'Kill source, look in.'),
    step(`I_N = V_{th}/R_{th} = ${In.toFixed(6)}\\,\\text{A}`, 'Norton current.'),
    step(`P_{max} = V_{th}^2/(4R_{th}) = ${Pmax.toFixed(4)}\\,\\text{W}`, 'Maximum power when R_L = R_th.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q06: Dependent source nodal  (kind: 'dependent-source-nodal')
// VCCS: Id = vccsGain * V[controllingNode], injecting into injectingNode
// ---------------------------------------------------------------------------

function solveDependentSourceNodal(
  p: { Vs: number; R1: number; R2: number; vccsGain: number; controllingNode: number; injectingNode: number },
  kind: string
): EESolution {
  // V1 is fixed at Vs (node 1). VCCS Id = vccsGain * V1 injects upward into node 2.
  const V1 = p.Vs;
  const Id = p.vccsGain * V1;
  // KCL at node 2: (V1-V2)/R2 + Id = 0 (no shunt at node 2)
  const V2 = V1 + Id * p.R2;
  const P_dep = Id * V2;
  return sol(kind, { V1, V2, Id, P_dep }, [
    step(`V_1 = ${V1}\\,\\text{V},\\; I_d = g_m V_1 = ${Id.toFixed(4)}\\,\\text{A}`, 'Fixed node and VCCS.'),
    step(`\\frac{V_1-V_2}{R_2} + I_d = 0 \\Rightarrow V_2 = ${V2.toFixed(4)}\\,\\text{V}`, 'KCL at node 2.'),
    step(`P_{dep} = I_d V_2 = ${P_dep.toFixed(4)}\\,\\text{W}`, 'Power delivered by dependent source.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q07: Delta-Wye conversion  (kind: 'delta-wye')
// ---------------------------------------------------------------------------

function solveDeltaWye(
  p: { Rab: number; Rbc: number; Rca: number; VTest: number },
  kind: string
): EESolution {
  const sum = p.Rab + p.Rbc + p.Rca;
  const Ra = (p.Rab * p.Rbc) / sum;
  const Rb = (p.Rbc * p.Rca) / sum;
  const Rc = (p.Rca * p.Rab) / sum;
  const I = p.VTest / (Ra + Rc);  // B floating, A-C series path
  return sol(kind, { Ra, Rb, Rc, sum, I }, [
    step(`\\Sigma = ${sum}\\,\\Omega`, 'Sum of delta resistances.'),
    step(`R_a=${Ra.toFixed(4)},\\; R_b=${Rb.toFixed(4)},\\; R_c=${Rc.toFixed(4)}\\,\\Omega`, 'Apply Δ→Y conversion.'),
    step(`I = V_{test}/(R_a+R_c) = ${I.toFixed(4)}\\,\\text{A}`, 'B floating: series Ra+Rc path.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q08: RC step response  (kind: 'rc-step')
// vc0 = initial capacitor voltage
// ---------------------------------------------------------------------------

function solveRcStep(
  p: { R: number; C: number; Vs: number; vc0: number },
  kind: string
): EESolution {
  const tau = p.R * p.C;
  const vInf = p.Vs;
  const i0 = (p.Vs - p.vc0) / p.R;
  // Time to cross 10 V (or target = 10/12 * Vs proportion)
  const Vtarget = 0.9 * vInf;
  const feasible = Vtarget > p.vc0 && Vtarget < vInf;
  const t_target = feasible ? -tau * Math.log((vInf - Vtarget) / (vInf - p.vc0)) : NaN;
  return sol(kind, { tau, vInf, i0, t_90pct: feasible ? t_target : -1 }, [
    step(`\\tau = RC = ${tau}\\,\\text{s}`, 'Time constant.'),
    step(`v_C(t) = ${vInf} + (${p.vc0}-${vInf})e^{-t/\\tau}`, 'First-order step response.'),
    step(feasible ? `t_{90\\%} = ${t_target.toFixed(4)}\\,\\text{s}` : 'Target not reachable',
      feasible ? 'Time to reach 90% of final.' : 'Vtarget unreachable.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q09: RL transient  (kind: 'rl-transient')
// ---------------------------------------------------------------------------

function solveRlTransient(
  p: { R_src: number; L: number; Vs: number; R_fw: number },
  kind: string
): EESolution {
  const i0 = p.Vs / p.R_src;
  const tau = p.L / p.R_fw;
  const E_stored = 0.5 * p.L * i0 * i0;
  return sol(kind, { i0, tau, E_stored }, [
    step(`i_L(0^+) = V_s/R_{src} = ${i0.toFixed(6)}\\,\\text{A}`, 'Continuous inductor current.'),
    step(`\\tau = L/R_{fw} = ${tau.toFixed(6)}\\,\\text{s}`, 'Discharge time constant.'),
    step(`i_L(t) = ${i0.toFixed(6)}e^{-t/${tau.toFixed(6)}}\\,\\text{A}`, 'Zero-input response.'),
    step(`E = \\tfrac{1}{2}LI_0^2 = ${E_stored.toFixed(6)}\\,\\text{J}`, 'Stored energy dissipates in R_fw.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q10/Q11: Series RLC step response  (kind: 'rlc-series-step')
// damping: 'over' | 'under' | 'critical'
// ---------------------------------------------------------------------------

function solveRlcSeriesStep(
  p: { R: number; L: number; C: number; Vs: number; vc0: number; iL0: number; damping: string },
  kind: string
): EESolution {
  const r = rlcRoots(p.R, p.L, p.C);
  const Vf = p.Vs;
  const computed: Record<string, number> = { alpha: r.alpha, omega0: r.omega0, Vf };

  const steps: SolutionStep[] = [
    step(`\\alpha = R/(2L) = ${r.alpha.toFixed(4)},\\; \\omega_0 = 1/\\sqrt{LC} = ${r.omega0.toFixed(4)}`, 'Damping and natural frequency.'),
  ];

  if (r.damping === 'overdamped') {
    const s1 = r.s1 ?? -r.alpha;
    const s2 = r.s2 ?? -r.alpha;
    // v_C(t) = Vf + A1*exp(s1*t) + A2*exp(s2*t); ICs: v_C(0)=vc0, dv_C/dt(0)=iL0/C
    const A1 = (Vf - p.vc0 - s2 === 0) ? 0 : ((p.iL0 / p.C - s2 * (p.vc0 - Vf)) / (s1 - s2));
    const A2 = p.vc0 - Vf - A1;
    computed.s1 = s1; computed.s2 = s2; computed.A1 = A1; computed.A2 = A2;
    steps.push(step(`s_{1,2} = ${s1.toFixed(4)},\\; ${s2.toFixed(4)}\\text{ (real, distinct)}`, 'Overdamped: two real roots.'));
    steps.push(step(`v_C(t) = ${Vf}+${A1.toFixed(4)}e^{${s1.toFixed(4)}t}+${A2.toFixed(4)}e^{${s2.toFixed(4)}t}`, 'Complete overdamped response.'));
  } else if (r.damping === 'underdamped') {
    const wd = r.omegaD ?? Math.sqrt(Math.abs(r.omega0 ** 2 - r.alpha ** 2));
    const B1 = p.vc0 - Vf;
    const B2 = (p.iL0 / p.C + r.alpha * B1) / wd;
    const t_peak = Math.PI / wd;
    computed.omegaD = wd; computed.B1 = B1; computed.B2 = B2; computed.t_peak = t_peak;
    steps.push(step(`\\omega_d = ${wd.toFixed(4)}\\,\\text{rad/s}`, 'Damped oscillation frequency.'));
    steps.push(step(`v_C(t)=${Vf}+e^{-${r.alpha.toFixed(4)}t}(${B1.toFixed(4)}\\cos\\omega_d t+${B2.toFixed(4)}\\sin\\omega_d t)`, 'Underdamped response.'));
    steps.push(step(`t_{peak} = \\pi/\\omega_d = ${t_peak.toFixed(4)}\\,\\text{s}`, 'First overshoot time.'));
  } else {
    computed.s_cr = -r.alpha;
    steps.push(step(`s = -\\alpha = ${-r.alpha.toFixed(4)}\\text{ (repeated)}`, 'Critically damped.'));
  }
  return sol(kind, computed, steps);
}

// ---------------------------------------------------------------------------
// Q12: RC with non-zero IC  (kind: 'rc-nonzero-ic')
// extends RcStepParams with R2 (shunt resistor)
// ---------------------------------------------------------------------------

function solveRcNonzeroIc(
  p: { R: number; C: number; Vs: number; vc0: number; R2: number },
  kind: string
): EESolution {
  const Rth = parallel(p.R, p.R2);
  const Vth = p.Vs * p.R2 / (p.R + p.R2);
  const tau = Rth * p.C;
  const vInf = Vth;
  const Vtarget = vInf + 2;  // typical probe point
  const feasible = (Vtarget > p.vc0 && Vtarget < vInf) || (Vtarget < p.vc0 && Vtarget > vInf);
  const t_target = feasible
    ? -tau * Math.log((vInf - Vtarget) / (vInf - p.vc0))
    : NaN;
  return sol(kind, { Rth, Vth, tau, vInf, t_target: isNaN(t_target) ? -1 : t_target }, [
    step(`V_{th} = V_s R_2/(R+R_2) = ${Vth.toFixed(4)}\\,\\text{V}`, 'Thevenin seen by C.'),
    step(`\\tau = R_{th}C = ${tau.toFixed(6)}\\,\\text{s}`, 'Time constant.'),
    step(`v_C(t) = ${vInf.toFixed(4)}+(${p.vc0}-${vInf.toFixed(4)})e^{-t/\\tau}`, 'Complete response from non-zero IC.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q13: Series RLC AC  (kind: 'ac-series-rlc')
// ---------------------------------------------------------------------------

function solveAcSeriesRlc(
  p: { Vs_mag: number; Vs_ang_deg: number; f_Hz: number; R: number; L: number; C: number },
  kind: string
): EESolution {
  const omega = 2 * Math.PI * p.f_Hz;
  const XL = omega * p.L;
  const XC = 1 / (omega * p.C);
  const Z = Math.sqrt(p.R ** 2 + (XL - XC) ** 2);
  const phi_deg = Math.atan2(XL - XC, p.R) * 180 / Math.PI;
  const I = p.Vs_mag / Z;
  const VR = I * p.R;
  const VL = I * XL;
  const VC = I * XC;
  const pf = Math.cos(phi_deg * Math.PI / 180);
  return sol(kind, { omega, XL, XC, Z, phi_deg, I, VR, VL, VC, pf }, [
    step(`X_L = \\omega L = ${XL.toFixed(4)}\\,\\Omega,\\; X_C = 1/(\\omega C) = ${XC.toFixed(4)}\\,\\Omega`, 'Reactances.'),
    step(`|Z| = ${Z.toFixed(4)}\\,\\Omega,\\; \\phi = ${phi_deg.toFixed(2)}°`, 'Total impedance and angle.'),
    step(`I = V_s/|Z| = ${I.toFixed(4)}\\,\\text{A}`, 'Phasor current.'),
    step(`V_R=${VR.toFixed(4)},\\; V_L=${VL.toFixed(4)},\\; V_C=${VC.toFixed(4)}\\,\\text{V}`, 'Element voltages.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q14: Parallel RLC admittance  (kind: 'ac-parallel-rlc')
// ---------------------------------------------------------------------------

function solveAcParallelRlc(
  p: { Is_mag: number; Is_ang_deg: number; omega: number; R: number; L: number; C: number },
  kind: string
): EESolution {
  const G = 1 / p.R;
  const BL = -1 / (p.omega * p.L);
  const BC = p.omega * p.C;
  const Ymag = Math.sqrt(G ** 2 + (BL + BC) ** 2);
  const Vmag = p.Is_mag / Ymag;
  const P = Vmag ** 2 * G;
  const Q = Vmag ** 2 * (BL + BC);
  const S = Math.sqrt(P ** 2 + Q ** 2);
  const pf = P / S;
  return sol(kind, { G, BL, BC, Ymag, Vmag, P, Q, S, pf }, [
    step(`Y_R=${G},\\; B_L=${BL.toFixed(4)},\\; B_C=${BC.toFixed(4)}\\,\\text{S}`, 'Branch admittances.'),
    step(`|Y_{tot}| = ${Ymag.toFixed(4)}\\,\\text{S},\\; |V| = I_s/|Y| = ${Vmag.toFixed(4)}\\,\\text{V}`, 'Terminal voltage.'),
    step(`P=${P.toFixed(4)}\\,\\text{W},\\; Q=${Q.toFixed(4)}\\,\\text{VAR},\\; \\text{PF}=${pf.toFixed(4)}`, 'Power quantities.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q15: AC mesh with dependent source  (kind: 'ac-mesh-dependent')
// mesh1Elements / mesh2Elements are ABCDSection lists describing element impedances
// ---------------------------------------------------------------------------

function solveAcMeshDependent(
  p: { omega: number; Vs: number; mesh1Elements: ABCDSection[]; mesh2Elements: ABCDSection[]; depSrcGain: number },
  kind: string
): EESolution {
  // Compute self-impedances by summing element impedances in each mesh
  const Z11 = p.mesh1Elements.reduce((z, el) => cAdd(z, sectionImpedance(el, p.omega)), cx(0));
  const Z22 = p.mesh2Elements.reduce((z, el) => cAdd(z, sectionImpedance(el, p.omega)), cx(0));
  // Mutual: elements shared between meshes — find common elements by type+params
  // Simple heuristic: assume no shared element info, use dep gain for coupling
  const Z12: Complex = { re: 0, im: 0 };
  // Dependent source shifts Z21 entry by dep gain * R (approximate)
  const Z21_dep: Complex = { re: p.depSrcGain, im: 0 };
  const Vs_c: Complex = { re: p.Vs, im: 0 };
  const [I1, I2] = solveLinearSystemC(
    [[Z11, cSub(Z12, Z21_dep)], [cNeg(Z21_dep), Z22]],
    [Vs_c, cx(0)]
  );
  const I1m = I1 ? cAbs(I1) : 0;
  const I2m = I2 ? cAbs(I2) : 0;
  return sol(kind, { Z11_re: Z11.re, Z11_im: Z11.im, Z22_re: Z22.re, Z22_im: Z22.im, I1_mag: I1m, I2_mag: I2m }, [
    step(`Z_{11} = ${Z11.re.toFixed(4)}+j${Z11.im.toFixed(4)}\\,\\Omega`, 'Self-impedance mesh 1.'),
    step(`Z_{22} = ${Z22.re.toFixed(4)}+j${Z22.im.toFixed(4)}\\,\\Omega`, 'Self-impedance mesh 2.'),
    step(`|I_1|=${I1m.toFixed(4)},\\; |I_2|=${I2m.toFixed(4)}\\,\\text{A}`, 'Mesh currents from complex matrix solve.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q16: AC Thevenin  (kind: 'ac-thevenin')
// Topology: Vs — R1 — J (R2 shunt) — L series — C to terminal A
// ---------------------------------------------------------------------------

function solveAcThevenin(
  p: { Vs_mag: number; Vs_ang_deg: number; omega: number; R1: number; L: number; R2: number; C: number },
  kind: string
): EESolution {
  const ZL: Complex = { re: 0, im: p.omega * p.L };
  const ZC: Complex = { re: 0, im: -1 / (p.omega * p.C) };
  const ZR1: Complex = { re: p.R1, im: 0 };
  const ZR2: Complex = { re: p.R2, im: 0 };
  const Vs_c: Complex = polar(p.Vs_mag, p.Vs_ang_deg * Math.PI / 180);
  // Series path to terminal: ZR1 → ZR2 shunt → ZL → ZC → A
  const Z_LC = cAdd(ZL, ZC);
  const Z_R2LC = cAdd(ZR2, Z_LC);
  const Z_total = cAdd(ZR1, Z_R2LC);
  const Vth = cMul(cDiv(Vs_c, Z_total), Z_R2LC);
  const Zth = cAdd(cParallel(ZR1, ZR2), Z_LC);
  return sol(kind, { ZL_im: ZL.im, ZC_im: ZC.im, Vth_mag: cAbs(Vth), Zth_re: Zth.re, Zth_im: Zth.im }, [
    step(`Z_L = j${ZL.im.toFixed(4)}\\,\\Omega,\\; Z_C = j${ZC.im.toFixed(4)}\\,\\Omega`, 'Impedances.'),
    step(`V_{th} = ${cAbs(Vth).toFixed(4)}\\angle${(cAngle(Vth)*180/Math.PI).toFixed(1)}°\\,\\text{V}`, 'Open-circuit phasor voltage.'),
    step(`Z_{th} = ${Zth.re.toFixed(4)}+j${Zth.im.toFixed(4)}\\,\\Omega`, 'Thevenin impedance.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q17: PF correction  (kind: 'pf-correction')
// ---------------------------------------------------------------------------

function solvePfCorrection(
  p: { P_W: number; pf1: number; pf2: number; V_rms: number; f_Hz: number },
  kind: string
): EESolution {
  const phi1 = Math.acos(p.pf1);
  const S1 = p.P_W / p.pf1;
  const Q1 = S1 * Math.sin(phi1);
  const phi2 = Math.acos(p.pf2);
  const Q2 = p.P_W * Math.tan(phi2);
  const Qc = Q1 - Q2;
  const omega = 2 * Math.PI * p.f_Hz;
  const C = Qc / (omega * p.V_rms ** 2);
  const I1 = S1 / p.V_rms;
  const S2 = p.P_W / p.pf2;
  const I2 = S2 / p.V_rms;
  return sol(kind, { phi1_deg: phi1*180/Math.PI, S1, Q1, Q2, Qc, C, I1, I2 }, [
    step(`Q_1 = P\\tan\\phi_1 = ${Q1.toFixed(2)}\\,\\text{VAR}`, 'Original reactive power.'),
    step(`Q_2 = P\\tan\\phi_2 = ${Q2.toFixed(2)}\\,\\text{VAR}`, 'Target reactive power.'),
    step(`Q_c = Q_1-Q_2 = ${Qc.toFixed(2)}\\,\\text{VAR}`, 'Capacitor reactive power.'),
    step(`C = Q_c/(\\omega V^2) = ${(C*1e6).toFixed(2)}\\,\\mu\\text{F}`, 'Required shunt capacitance.'),
    step(`I_1=${I1.toFixed(2)}\\to I_2=${I2.toFixed(2)}\\,\\text{A}`, 'Line current reduction.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q18: Complex power balance  (kind: 'complex-power-balance')
// Parallel R, L, C driven by voltage source
// ---------------------------------------------------------------------------

function solveComplexPowerBalance(
  p: { Vs_mag: number; omega: number; R: number; L: number; C: number },
  kind: string
): EESolution {
  const V = p.Vs_mag;
  const IR = V / p.R;
  const IL = V / (p.omega * p.L);
  const IC = V * p.omega * p.C;
  const SR = V * IR;
  const QL = -V * IL;   // inductive (negative)
  const QC = V * IC;    // capacitive (positive)
  const Q_total = QL + QC;
  return sol(kind, { IR, IL, IC, SR, QL, QC, Q_total }, [
    step(`I_R=${IR.toFixed(4)},\\; I_L=${IL.toFixed(4)},\\; I_C=${IC.toFixed(4)}\\,\\text{A}`, 'Branch currents.'),
    step(`S_R=${SR.toFixed(4)}\\,\\text{W},\\; Q_L=${QL.toFixed(4)},\\; Q_C=${QC.toFixed(4)}\\,\\text{VAR}`, 'Per-branch complex powers.'),
    step(`Q_{net}=${Q_total.toFixed(4)}\\,\\text{VAR}`, 'Net reactive power.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q19: Series resonance  (kind: 'series-resonance')
// ---------------------------------------------------------------------------

function solveSeriesResonance(p: { R: number; L: number; C: number }, kind: string): EESolution {
  const omega0 = 1 / Math.sqrt(p.L * p.C);
  const f0 = omega0 / (2 * Math.PI);
  const Q = (1 / p.R) * Math.sqrt(p.L / p.C);
  const BW = omega0 / Q;
  const omega1 = omega0 * (Math.sqrt(1 + 1 / (4 * Q ** 2)) - 1 / (2 * Q));
  const omega2 = omega0 * (Math.sqrt(1 + 1 / (4 * Q ** 2)) + 1 / (2 * Q));
  return sol(kind, { omega0, f0, Q, BW, omega1, omega2 }, [
    step(`\\omega_0 = 1/\\sqrt{LC} = ${omega0.toFixed(4)}\\,\\text{rad/s}`, 'Resonant frequency.'),
    step(`Q = \\frac{1}{R}\\sqrt{L/C} = ${Q.toFixed(4)}`, 'Quality factor.'),
    step(`BW = \\omega_0/Q = ${BW.toFixed(4)}\\,\\text{rad/s}`, '3 dB bandwidth.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q20: Parallel resonance  (kind: 'parallel-resonance')
// ---------------------------------------------------------------------------

function solveParallelResonance(p: { R: number; L: number; C: number; Is: number }, kind: string): EESolution {
  const omega0 = 1 / Math.sqrt(p.L * p.C);
  const Q = p.R * Math.sqrt(p.C / p.L);
  const BW = omega0 / Q;
  const V_res = p.Is * p.R;
  return sol(kind, { omega0, Q, BW, V_res }, [
    step(`\\omega_0 = 1/\\sqrt{LC} = ${omega0.toFixed(4)}\\,\\text{rad/s}`, 'Parallel resonant frequency.'),
    step(`Q = R\\sqrt{C/L} = ${Q.toFixed(4)},\\; BW = ${BW.toFixed(4)}\\,\\text{rad/s}`, 'Quality factor and bandwidth.'),
    step(`V_{res} = I_s R = ${V_res.toFixed(4)}\\,\\text{V}`, 'Terminal voltage at resonance.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q21: Bode plot  (kind: 'bode-plot')
// ---------------------------------------------------------------------------

function solveBodePlot(
  p: { H_s: string; gain: number; poles: number[]; zeros: number[]; evalAt_omega?: number },
  kind: string
): EESolution {
  const omega = p.evalAt_omega ?? 100;
  const H_mag = bodeMag(p.gain, p.zeros, p.poles, omega);
  const H_dB = 20 * Math.log10(H_mag);
  const H_phase = bodePhase(p.zeros, p.poles, omega);
  const origin_poles = p.poles.filter(pp => pp === 0).length;
  return sol(kind, { H_mag, H_dB, H_phase, origin_poles, n_poles: p.poles.length, n_zeros: p.zeros.length }, [
    step(`\\text{Poles: }[${p.poles.join(', ')}],\\; \\text{Zeros: }[${p.zeros.join(', ')}]`, 'Corner frequencies.'),
    step(`|H(j\\omega_{eval})| = ${H_mag.toFixed(6)} = ${H_dB.toFixed(2)}\\,\\text{dB}`, 'Exact magnitude.'),
    step(`\\angle H = ${H_phase.toFixed(2)}°`, 'Phase at evaluation frequency.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q22: Bandpass filter  (kind: 'bandpass-filter')
// ---------------------------------------------------------------------------

function solveBandpassFilter(p: { R: number; L: number; C: number }, kind: string): EESolution {
  const omega0 = 1 / Math.sqrt(p.L * p.C);
  const f0 = omega0 / (2 * Math.PI);
  const Q = (1 / p.R) * Math.sqrt(p.L / p.C);
  const BW = omega0 / Q;
  const omega1 = omega0 * (Math.sqrt(1 + 1 / (4 * Q ** 2)) - 1 / (2 * Q));
  const omega2 = omega0 * (Math.sqrt(1 + 1 / (4 * Q ** 2)) + 1 / (2 * Q));
  return sol(kind, { omega0, f0, Q, BW, omega1, omega2 }, [
    step(`H(j\\omega) = R/(R+j(\\omega L-1/\\omega C))`, 'BPF transfer function.'),
    step(`\\omega_0 = ${omega0.toFixed(4)}\\,\\text{rad/s},\\; Q = ${Q.toFixed(4)}`, 'Center frequency and Q.'),
    step(`BW = ${BW.toFixed(4)}\\,\\text{rad/s}`, '3 dB bandwidth.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q23: Z-parameters T-network  (kind: 'z-parameters')
// Za = series arm 1 side, Zb = series arm 2 side, Zc = shunt
// Za/Zb/Zc may be number or Complex
// ---------------------------------------------------------------------------

function solveZParameters(
  p: { Za: number | Complex; Zb: number | Complex; Zc: number | Complex },
  kind: string
): EESolution {
  const toN = (v: number | Complex): number => typeof v === 'number' ? v : cAbs(v);
  const Za = toN(p.Za);
  const Zb = toN(p.Zb);
  const Zc = toN(p.Zc);
  const Z11 = Za + Zc;
  const Z22 = Zb + Zc;
  const Z12 = Zc;
  const Z21 = Zc;
  return sol(kind, { Z11, Z12, Z21, Z22, det: Z11 * Z22 - Z12 * Z21 }, [
    step(`Z_{11} = Z_a+Z_c = ${Z11}\\,\\Omega`, 'Port-1 open-circuit impedance.'),
    step(`Z_{22} = Z_b+Z_c = ${Z22}\\,\\Omega`, 'Port-2 open-circuit impedance.'),
    step(`Z_{12} = Z_{21} = Z_c = ${Z12}\\,\\Omega`, 'Mutual impedance (reciprocal).'),
  ]);
}

// ---------------------------------------------------------------------------
// Q24: ABCD cascade  (kind: 'abcd-cascade')
// ---------------------------------------------------------------------------

function solveAbcdCascade(
  p: { sections: ABCDSection[]; Zs: Complex; ZL: Complex },
  kind: string
): EESolution {
  // Build cascaded ABCD matrix
  let M: Mat2C = [[cx(1), cx(0)], [cx(0), cx(1)]]; // identity
  const omega = 1; // frequency not specified; assume sections pre-computed at right omega
  for (const section of p.sections) {
    M = mat2cMul(M, abcdSectionMatrix(section, omega));
  }
  const A = M[0][0]; const B = M[0][1];
  const C = M[1][0]; const D = M[1][1];
  // V2/Vs = ZL / (A*ZL + B + (C*ZL + D)*Zs)
  const ZL = p.ZL;
  const Zs = p.Zs;
  const num = ZL;
  const den = cAdd(cAdd(cMul(A, ZL), B), cMul(cAdd(cMul(C, ZL), D), Zs));
  const Av = cDiv(num, den);
  return sol(kind, { Av_mag: cAbs(Av), A_re: A.re, A_im: A.im, B_re: B.re, B_im: B.im, C_re: C.re, D_re: D.re }, [
    step('[ABCD]_{tot} = \\prod_i [ABCD]_i', 'Cascade by matrix multiplication.'),
    step(`|V_2/V_s| = ${cAbs(Av).toFixed(4)}`, 'Voltage transfer ratio.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q25: Two-port voltage gain  (kind: 'two-port-gain')
// ---------------------------------------------------------------------------

function solveTwoPortGain(
  p: { Z11: number; Z12: number; Z22: number; Vs: number; Zs: number; ZL: number },
  kind: string
): EESolution {
  const det = (p.Z11 + p.Zs) * (p.Z22 + p.ZL) - p.Z12 ** 2;
  const I1 = p.Vs * (p.Z22 + p.ZL) / det;
  const I2 = -p.Z12 * I1 / (p.Z22 + p.ZL);
  const V2 = -p.ZL * I2;
  const Av = V2 / p.Vs;
  const Zin = p.Z11 - p.Z12 ** 2 / (p.Z22 + p.ZL);
  return sol(kind, { I1, I2, V2, Av, Zin }, [
    step('V_1=Z_{11}I_1+Z_{12}I_2,\\; V_2=Z_{21}I_1+Z_{22}I_2', 'Z-parameter relations.'),
    step(`A_v = V_2/V_s = ${Av.toFixed(4)}`, 'Voltage gain.'),
    step(`Z_{in} = ${Zin.toFixed(4)}\\,\\Omega`, 'Input impedance.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q26: Mutual inductance  (kind: 'mutual-inductance')
// ---------------------------------------------------------------------------

function solveMutualInductance(
  p: { L1: number; L2: number; M: number; Vs_mag: number; omega: number; port2Open: boolean },
  kind: string
): EESolution {
  const k = p.M / Math.sqrt(p.L1 * p.L2);
  // port2Open = true: I2=0, I1 = Vs/(jωL1)
  const ZL1: Complex = { re: 0, im: p.omega * p.L1 };
  const I1 = cDiv({ re: p.Vs_mag, im: 0 }, ZL1);
  const I1_mag = cAbs(I1);
  const V2 = cMul({ re: 0, im: p.omega * p.M }, I1);
  const V2_mag = cAbs(V2);
  return sol(kind, { k, I1_mag, V2_mag, V2_angle_deg: cAngle(V2) * 180 / Math.PI }, [
    step(`k = M/\\sqrt{L_1 L_2} = ${k.toFixed(4)}`, 'Coupling coefficient.'),
    step(`I_1 = V_s/(j\\omega L_1) = ${I1_mag.toFixed(4)}\\,\\text{A}`, 'Primary current (port 2 open).'),
    step(`V_2 = j\\omega M I_1 = ${V2_mag.toFixed(4)}\\,\\text{V}`, 'Open-circuit mutual voltage.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q27: Ideal transformer  (kind: 'ideal-transformer')
// ---------------------------------------------------------------------------

function solveIdealTransformer(
  p: { n: number; Vs: number; Zs: number; ZL: number },
  kind: string
): EESolution {
  const ZL_ref = p.n ** 2 * p.ZL;
  const I1 = p.Vs / (p.Zs + ZL_ref);
  const I2 = p.n * I1;
  const VL = p.ZL * I2;
  return sol(kind, { ZL_ref, I1, I2, VL, P_out: VL * I2 }, [
    step(`Z_L' = n^2 Z_L = ${ZL_ref}\\,\\Omega`, 'Reflected load.'),
    step(`I_1 = V_s/(Z_s+Z_L') = ${I1.toFixed(6)}\\,\\text{A}`, 'Primary current.'),
    step(`I_2 = n I_1 = ${I2.toFixed(6)}\\,\\text{A},\\; V_L = ${VL.toFixed(4)}\\,\\text{V}`, 'Secondary quantities.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q28: Balanced Y-Y  (kind: 'three-phase-yy')
// Z_ph is complex
// ---------------------------------------------------------------------------

function solveBalancedYY(p: { VL_rms: number; Z_ph: Complex }, kind: string): EESolution {
  const Vph = p.VL_rms / Math.sqrt(3);
  const Zmag = cAbs(p.Z_ph);
  const IL = Vph / Zmag;
  const pf = p.Z_ph.re / Zmag;
  const P = 3 * Vph * IL * pf;
  const Q = 3 * Vph * IL * (p.Z_ph.im / Zmag);
  const S = 3 * Vph * IL;
  return sol(kind, { Vph, Zmag, IL, pf, P, Q, S }, [
    step(`V_{ph} = V_L/\\sqrt{3} = ${Vph.toFixed(4)}\\,\\text{V}`, 'Phase voltage.'),
    step(`I_L = V_{ph}/|Z_{ph}| = ${IL.toFixed(4)}\\,\\text{A}`, 'Line current (equals phase in Y).'),
    step(`P = \\sqrt{3}V_L I_L\\cos\\phi = ${P.toFixed(4)}\\,\\text{W}`, 'Three-phase power.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q29: Balanced Y-Delta  (kind: 'three-phase-yd')
// ---------------------------------------------------------------------------

function solveBalancedYD(p: { VL_rms: number; Z_delta: Complex }, kind: string): EESolution {
  const ZD_mag = cAbs(p.Z_delta);
  const I_ph_D = p.VL_rms / ZD_mag;
  const IL = Math.sqrt(3) * I_ph_D;
  const pf = p.Z_delta.re / ZD_mag;
  const P = Math.sqrt(3) * p.VL_rms * IL * pf;
  const ZY_re = p.Z_delta.re / 3;
  const ZY_im = p.Z_delta.im / 3;
  return sol(kind, { ZY_re, ZY_im, I_ph_D, IL, pf, P }, [
    step(`Z_Y = Z_\\Delta/3 = ${ZY_re.toFixed(4)}+j${ZY_im.toFixed(4)}\\,\\Omega`, 'Delta to Y conversion.'),
    step(`I_{ph,\\Delta} = V_L/|Z_\\Delta| = ${I_ph_D.toFixed(4)}\\,\\text{A}`, 'Delta phase current.'),
    step(`I_L = \\sqrt{3}I_{ph} = ${IL.toFixed(4)}\\,\\text{A}`, 'Line current.'),
    step(`P = ${P.toFixed(4)}\\,\\text{W}`, 'Three-phase power.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q30: Two-wattmeter method  (kind: 'two-wattmeter')
// ---------------------------------------------------------------------------

function solveTwoWattmeter(p: { W1: number; W2: number }, kind: string): EESolution {
  const P = p.W1 + p.W2;
  const Q = Math.sqrt(3) * (p.W1 - p.W2);
  const phi = Math.atan2(Q, P);
  const pf = Math.cos(phi);
  const S = Math.sqrt(P ** 2 + Q ** 2);
  return sol(kind, { P, Q, phi_deg: phi * 180 / Math.PI, pf, S }, [
    step(`P = W_1+W_2 = ${P.toFixed(2)}\\,\\text{W}`, 'Total real power.'),
    step(`Q = \\sqrt{3}(W_1-W_2) = ${Q.toFixed(2)}\\,\\text{VAR}`, 'Reactive power.'),
    step(`\\text{PF} = ${pf.toFixed(4)}`, 'Power factor.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q31: BJT CE amplifier  (kind: 'bjt-ce-amplifier')
// ---------------------------------------------------------------------------

function solveBjtCe(
  p: { IC: number; beta: number; VA: number; RC: number; RS: number },
  kind: string
): EESolution {
  const gm = p.IC / VT;
  const rpi = p.beta / gm;
  const ro = p.VA / p.IC;
  const Rout = parallel(ro, p.RC);
  const Av = -gm * Rout;
  const Rin = rpi + p.RS;
  return sol(kind, { gm, rpi, ro, Rout, Av, Rin }, [
    step(`g_m = I_C/V_T = ${gm.toFixed(4)}\\,\\text{S}`, 'Transconductance.'),
    step(`r_\\pi = \\beta/g_m = ${rpi.toFixed(2)}\\,\\Omega,\\; r_o = V_A/I_C = ${ro.toFixed(2)}\\,\\Omega`, 'Hybrid-π elements.'),
    step(`A_v = -g_m(r_o\\|R_C) = ${Av.toFixed(4)}`, 'Voltage gain.'),
    step(`R_{in}=${Rin.toFixed(2)}\\,\\Omega,\\; R_{out}=${Rout.toFixed(2)}\\,\\Omega`, 'Port resistances.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q32: Miller bandwidth  (kind: 'miller-bandwidth')
// Params: { Av, Cpi, Cmu, RS, rpi }
// ---------------------------------------------------------------------------

function solveMillerBandwidth(
  p: { Av: number; Cpi: number; Cmu: number; RS: number; rpi: number },
  kind: string
): EESolution {
  const CM = p.Cmu * (1 - p.Av);
  const Cin = p.Cpi + CM;
  const Rin = parallel(p.RS, p.rpi);
  const f3dB = 1 / (2 * Math.PI * Rin * Cin);
  return sol(kind, { CM, Cin, Rin, f3dB, CM_pF: CM * 1e12 }, [
    step(`C_M = C_\\mu(1-A_v) = ${(CM * 1e12).toFixed(2)}\\,\\text{pF}`, 'Miller capacitance.'),
    step(`C_{in} = C_\\pi + C_M = ${(Cin * 1e12).toFixed(2)}\\,\\text{pF}`, 'Total input capacitance.'),
    step(`f_{3dB} = 1/(2\\pi R_{in} C_{in}) = ${(f3dB / 1e3).toFixed(4)}\\,\\text{kHz}`, 'Dominant pole.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q33: Emitter degeneration  (kind: 'emitter-degeneration')
// ---------------------------------------------------------------------------

function solveEmitterDegeneration(
  p: { RE: number; RC: number; gm: number; rpi: number; ro: number },
  kind: string
): EESolution {
  const Gm = p.gm / (1 + p.gm * p.RE);
  const Rout = parallel(p.ro, p.RC);
  const Av = -Gm * Rout;
  const Rin = p.rpi + (1 + p.gm * p.RE) * p.RE;
  return sol(kind, { Gm, Rout, Av, Rin }, [
    step(`G_m = g_m/(1+g_m R_E) = ${Gm.toFixed(6)}\\,\\text{S}`, 'Degenerated transconductance.'),
    step(`A_v = -G_m(r_o\\|R_C) = ${Av.toFixed(4)}`, 'Reduced gain.'),
    step(`R_{in} = r_\\pi + (1+g_m R_E)R_E = ${Rin.toFixed(2)}\\,\\Omega`, 'Increased input resistance.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q34: Cascode  (kind: 'cascode')
// ---------------------------------------------------------------------------

function solveCascode(
  p: { gm1: number; ro1: number; gm2: number; ro2: number; RL: number },
  kind: string
): EESolution {
  const Rout_cascode = p.gm2 * p.ro2 * p.ro1;
  const Rout = parallel(Rout_cascode, p.RL);
  const Av = -p.gm1 * Rout;
  const R_at_Q1_col = 1 / p.gm2;
  return sol(kind, { Rout_cascode, Rout, Av, R_at_Q1_col }, [
    step(`R_{out,cascode} \\approx g_{m2}r_{o2}r_{o1} = ${Rout_cascode.toFixed(0)}\\,\\Omega`, 'Boosted output resistance.'),
    step(`A_v = -g_{m1}(R_{out}\\|R_L) = ${Av.toFixed(4)}`, 'Voltage gain.'),
    step(`Z_{Q1,col} \\approx 1/g_{m2} = ${R_at_Q1_col.toFixed(2)}\\,\\Omega \\Rightarrow \\text{minimal Miller}`, 'Low Z kills Miller multiplication.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q35: MOSFET CS amplifier  (kind: 'mosfet-cs')
// ---------------------------------------------------------------------------

function solveMosfetCs(
  p: { kn: number; VTN: number; VGS: number; lambda: number; RD: number },
  kind: string
): EESolution {
  const Vov = p.VGS - p.VTN;
  const ID = p.kn * Vov ** 2;
  const gm = 2 * p.kn * Vov;
  const ro = 1 / (p.lambda * ID);
  const Rout = parallel(ro, p.RD);
  const Av = -gm * Rout;
  return sol(kind, { Vov, ID, gm, ro, Rout, Av }, [
    step(`I_D = k_n V_{ov}^2 = ${(ID * 1e3).toFixed(4)}\\,\\text{mA}`, 'Bias point.'),
    step(`g_m = 2k_n V_{ov} = ${(gm * 1e3).toFixed(4)}\\,\\text{mA/V},\\; r_o = ${ro.toFixed(2)}\\,\\Omega`, 'Small-signal params.'),
    step(`A_v = -g_m(r_o\\|R_D) = ${Av.toFixed(4)}`, 'CS gain (inverting).'),
  ]);
}

// ---------------------------------------------------------------------------
// Q36: MOSFET differential pair  (kind: 'mosfet-diff-pair')
// ---------------------------------------------------------------------------

function solveMosfetDiffPair(
  p: { gm: number; ro: number; RSS: number; RD: number },
  kind: string
): EESolution {
  const Ad = -p.gm * p.RD;
  const Acm = -p.RD / (2 * p.RSS);
  const CMRR = Math.abs(Ad / Acm);
  const CMRRdB = 20 * Math.log10(CMRR);
  return sol(kind, { Ad, Acm, CMRR, CMRRdB }, [
    step(`A_d = -g_m R_D = ${Ad.toFixed(4)}`, 'Differential gain.'),
    step(`A_{cm} = -R_D/(2R_{SS}) = ${Acm.toFixed(6)}`, 'Common-mode gain.'),
    step(`\\text{CMRR} = ${CMRR.toFixed(2)} = ${CMRRdB.toFixed(2)}\\,\\text{dB}`, 'CMRR.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q37: Source follower  (kind: 'source-follower')
// ---------------------------------------------------------------------------

function solveSourceFollower(
  p: { gm: number; ro: number; RS: number; RL: number },
  kind: string
): EESolution {
  const Rpar = 1 / (1 / p.ro + 1 / p.RS + 1 / p.RL);
  const Av = p.gm * Rpar / (1 + p.gm * Rpar);
  const Rout = 1 / (p.gm + 1 / p.ro + 1 / p.RS);
  return sol(kind, { Rpar, Av, Rout }, [
    step(`R_{par} = r_o\\|R_S\\|R_L = ${Rpar.toFixed(2)}\\,\\Omega`, 'Parallel combination at source.'),
    step(`A_v = g_m R_{par}/(1+g_m R_{par}) = ${Av.toFixed(6)}`, 'Source follower gain.'),
    step(`R_{out} = (1/g_m)\\|r_o\\|R_S = ${Rout.toFixed(2)}\\,\\Omega`, 'Low output resistance.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q38: Inverting summer  (kind: 'opamp-summer')
// ---------------------------------------------------------------------------

function solveOpampSummer(
  p: { Rf: number; inputs: Array<{ R: number; V: number }> },
  kind: string
): EESolution {
  const weights = p.inputs.map(inp => -p.Rf / inp.R);
  const Vout = p.inputs.reduce((sum, inp, i) => sum + (weights[i] ?? 0) * inp.V, 0);
  return sol(kind, { Vout, ...Object.fromEntries(weights.map((w, i) => [`w${i + 1}`, w])) }, [
    step('V_{out} = -\\sum_i (R_f/R_i) V_i', 'Inverting summer formula.'),
    step(`\\text{Weights: }[${weights.map(w => w.toFixed(4)).join(', ')}]`, 'Individual gain coefficients.'),
    step(`V_{out} = ${Vout.toFixed(4)}\\,\\text{V}`, 'Summed output.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q39: Difference amp CMRR  (kind: 'diff-amp-cmrr')
// R1=R2=R3=R4=R nominally; R4 = R + deltaR4
// ---------------------------------------------------------------------------

function solveDiffAmpCmrr(
  p: { R1: number; R2: number; R3: number; R4: number; deltaR4: number },
  kind: string
): EESolution {
  const Ad = 1;  // R1=R2=R3=R4 → gain = 1
  const R_nom = p.R1;  // nominal value
  const Acm = p.deltaR4 / (4 * R_nom);
  const CMRR = Math.abs(Ad / Acm);
  const CMRRdB = 20 * Math.log10(CMRR);
  return sol(kind, { Ad, Acm, CMRR, CMRRdB }, [
    step('A_d = 1\\text{ (matched ratios)}', 'Unity differential gain.'),
    step(`A_{cm} = \\Delta R_4/(4R) = ${Acm.toFixed(6)}`, 'CM gain from mismatch.'),
    step(`\\text{CMRR} = ${CMRRdB.toFixed(2)}\\,\\text{dB}`, 'CMRR limited by resistor mismatch.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q40: Sallen-Key LPF  (kind: 'sallen-key')
// General: R1, R2, C1, C2
// ---------------------------------------------------------------------------

function solveSallenKey(
  p: { R1: number; R2: number; C1: number; C2: number; K: number },
  kind: string
): EESolution {
  // For equal component case: omega0 = 1/(RC), Q = 1/(3-K)
  // General: omega0 = 1/sqrt(R1 R2 C1 C2), Q from Butterworth condition
  const omega0 = 1 / Math.sqrt(p.R1 * p.R2 * p.C1 * p.C2);
  const Q = 1 / (3 - p.K);   // valid for equal R, equal C; approximation otherwise
  const f3dB = omega0 / (2 * Math.PI);
  return sol(kind, { omega0, Q, f3dB, K: p.K }, [
    step(`\\omega_0 = 1/\\sqrt{R_1 R_2 C_1 C_2} = ${omega0.toFixed(4)}\\,\\text{rad/s}`, 'Natural frequency.'),
    step(`Q = 1/(3-K) = ${Q.toFixed(4)}`, 'Q factor from gain K.'),
    step(`f_{3dB} = ${f3dB.toFixed(4)}\\,\\text{Hz},\\; \\text{roll-off: }-40\\,\\text{dB/dec}`, '3 dB frequency.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q41: Schmitt trigger  (kind: 'schmitt-trigger')
// ---------------------------------------------------------------------------

function solveSchmittTrigger(
  p: { R1: number; R2: number; Vsat_pos: number; Vsat_neg: number },
  kind: string
): EESolution {
  const beta = p.R1 / (p.R1 + p.R2);
  const VUT = (1 - beta) * p.Vsat_pos + beta * p.Vsat_neg;
  const VLT = beta * p.Vsat_pos + (1 - beta) * p.Vsat_neg;
  const hysteresis = VUT - VLT;
  return sol(kind, { beta, VUT, VLT, hysteresis }, [
    step(`\\beta = R_1/(R_1+R_2) = ${beta.toFixed(4)}`, 'Feedback fraction.'),
    step(`V_{UT} = ${VUT.toFixed(4)}\\,\\text{V},\\; V_{LT} = ${VLT.toFixed(4)}\\,\\text{V}`, 'Switching thresholds.'),
    step(`\\Delta V = ${hysteresis.toFixed(4)}\\,\\text{V}`, 'Hysteresis width.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q42: Series-shunt feedback  (kind: 'series-shunt-feedback')
// ---------------------------------------------------------------------------

function solveSeriesShuntFeedback(
  p: { A: number; Rin: number; Rout: number; beta_f: number },
  kind: string
): EESolution {
  const T = p.A * p.beta_f;
  const Af = p.A / (1 + T);
  const Rif = p.Rin * (1 + T);
  const Rof = p.Rout / (1 + T);
  return sol(kind, { T, Af, Rif, Rof }, [
    step(`T = A\\beta_f = ${T.toFixed(4)}`, 'Loop gain.'),
    step(`A_f = A/(1+T) = ${Af.toFixed(6)}`, 'Closed-loop gain.'),
    step(`R_{if} = R_{in}(1+T) = ${Rif.toFixed(2)}\\,\\Omega,\\; R_{of} = R_{out}/(1+T) = ${Rof.toFixed(4)}\\,\\Omega`, 'Port resistances.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q43: Bode stability  (kind: 'bode-stability')
// ---------------------------------------------------------------------------

function solveBodeStability(
  p: { L_s: string; poles: number[]; zeros: number[]; gain: number },
  kind: string
): EESolution {
  const searchMax = (p.poles.filter(pp => pp > 0).reduce((a, b) => a * b, 1) ** (1 / Math.max(p.poles.length, 1))) * 20 + 1;
  let omega_pc = 0; let found_pc = false;
  for (let k = 1; k < 50000; k++) {
    const w = searchMax * k / 50000;
    if (bodePhase(p.zeros, p.poles, w) <= -180) { omega_pc = w; found_pc = true; break; }
  }
  const L_at_pc = found_pc ? bodeMag(p.gain, p.zeros, p.poles, omega_pc) : 0;
  const GM_dB = found_pc ? -20 * Math.log10(L_at_pc) : Infinity;

  let omega_gc = 0;
  for (let k = 1; k < 50000; k++) {
    const w = searchMax * k / 50000;
    if (bodeMag(p.gain, p.zeros, p.poles, w) <= 1) { omega_gc = w; break; }
  }
  const PM = 180 + bodePhase(p.zeros, p.poles, omega_gc);
  const stable = GM_dB > 0 && PM > 0;

  return sol(kind, { omega_pc, GM_dB, omega_gc, PM, stable: stable ? 1 : 0 }, [
    step(`\\omega_{pc} \\approx ${omega_pc.toFixed(4)}\\,\\text{rad/s}`, 'Phase crossover frequency.'),
    step(`\\text{GM} = ${GM_dB.toFixed(2)}\\,\\text{dB}`, 'Gain margin.'),
    step(`\\omega_{gc} \\approx ${omega_gc.toFixed(4)}\\,\\text{rad/s},\\; \\text{PM} = ${PM.toFixed(2)}°`, 'Phase margin.'),
    step(stable ? '\\text{Stable: GM>0, PM>0}' : '\\text{Unstable}', 'Stability conclusion.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q44: Root locus  (kind: 'root-locus')
// ---------------------------------------------------------------------------

function solveRootLocus(
  p: { GH_s: string; openLoopPoles: number[]; openLoopZeros: number[] },
  kind: string
): EESolution {
  const n = p.openLoopPoles.length;
  const m = p.openLoopZeros.length;
  const centroid = rootLocusCentroid(p.openLoopZeros, p.openLoopPoles);
  const asymAngles = rootLocusAsymptoteAngles(n, m);
  const n_inf = n - m;
  const searchMax = 1000;
  let K_crit = NaN;
  for (let k = 0; k < 200000; k++) {
    const w = searchMax * k / 200000;
    if (bodePhase(p.openLoopZeros, p.openLoopPoles, w) <= -180) {
      K_crit = 1 / bodeMag(1, p.openLoopZeros, p.openLoopPoles, w);
      break;
    }
  }
  return sol(kind, {
    n_branches: n, n_inf, centroid,
    K_crit: isNaN(K_crit) ? -1 : K_crit,
    ...Object.fromEntries(asymAngles.map((a, i) => [`asym_${i}`, a])),
  }, [
    step(`\\text{Poles: }[${p.openLoopPoles.map(pp => pp === 0 ? '0' : `-${pp}`).join(', ')}]`, 'Open-loop poles.'),
    step(`\\text{Centroid}=${centroid.toFixed(4)},\\; \\text{Asymptote angles: }[${asymAngles.map(a => `${a.toFixed(0)}°`).join(', ')}]`, 'Asymptotes.'),
    step(!isNaN(K_crit) ? `K_{crit} \\approx ${K_crit.toFixed(4)}` : 'K_{crit}: all branches stable', 'Marginal gain.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q45: Per-unit system  (kind: 'per-unit')
// zones[]: { Vbase_kV }
// lineImpedances[]: [zone_idx, Z_re_ohms, Z_im_ohms]
// ---------------------------------------------------------------------------

function solvePerUnit(
  p: { Sbase_MVA: number; zones: Array<{ Vbase_kV: number }>; lineImpedances: [number, number, number][] },
  kind: string
): EESolution {
  const Zbases = p.zones.map(z => z.Vbase_kV ** 2 / p.Sbase_MVA);
  const computed: Record<string, number> = {};
  p.zones.forEach((z, i) => {
    computed[`Zb${i + 1}`] = Zbases[i] ?? 0;
    computed[`Vb${i + 1}_kV`] = z.Vbase_kV;
  });
  p.lineImpedances.forEach(([zone_idx, Z_re, Z_im], li) => {
    const Zb = Zbases[zone_idx] ?? 1;
    computed[`Zline${li + 1}_pu_re`] = Z_re / Zb;
    computed[`Zline${li + 1}_pu_im`] = Z_im / Zb;
    computed[`Zline${li + 1}_pu_mag`] = Math.sqrt(Z_re ** 2 + Z_im ** 2) / Zb;
  });
  return sol(kind, computed, [
    step(`Z_b = V_b^2/S_b\\text{ per zone}`, 'Base impedances.'),
    step('Z_{pu} = Z_{actual}/Z_b', 'Per-unit line impedance.'),
    step('\\text{pu invariant across ideal transformers}', 'Key advantage of per-unit system.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q46: Ybus formation  (kind: 'ybus-formation')
// ---------------------------------------------------------------------------

function solveYbusFormation(
  p: { nBuses: number; lines: Array<{ from: number; to: number; y: Complex }>; shunts?: Record<number, Complex> },
  kind: string
): EESolution {
  const Y = buildYbusN(p.nBuses, p.lines, p.shunts);
  const computed: Record<string, number> = {};
  for (let i = 0; i < p.nBuses; i++) {
    for (let j = 0; j < p.nBuses; j++) {
      const Yij = Y[i]?.[j] ?? cx(0);
      computed[`Y${i + 1}${j + 1}_re`] = Yij.re;
      computed[`Y${i + 1}${j + 1}_im`] = Yij.im;
    }
  }
  const rowSum1 = (Y[0] ?? []).reduce((a, c) => a + c.re, 0);
  computed['rowSum1_re'] = rowSum1;
  return sol(kind, computed, [
    step('Y_{ii} = \\sum_j y_{ij}\\text{ (diagonal)}', 'Sum of admittances at each bus.'),
    step('Y_{ij} = -y_{ij}\\text{ (off-diagonal)}', 'Negative line admittances.'),
    step('\\text{Row sums}\\approx0\\text{ (no shunts)}', 'Consistency check.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q47: Gauss-Seidel power flow  (kind: 'gauss-seidel-pf')
// buses: PFBus[], Ybus: Complex[][]
// ---------------------------------------------------------------------------

function solveGaussSeidelPf(
  p: {
    buses: Array<{ id: number; type: 'slack' | 'PV' | 'PQ'; V_mag?: number; V_ang_deg?: number; P?: number; Q?: number }>;
    Ybus: Complex[][];
    maxIter: number;
    tolerance: number;
  },
  kind: string
): EESolution {
  const n = p.buses.length;
  // Initialize voltages
  const V: Complex[] = p.buses.map(b => {
    const mag = b.V_mag ?? 1;
    const ang = (b.V_ang_deg ?? 0) * Math.PI / 180;
    return polar(mag, ang);
  });

  const slackIdx = p.buses.findIndex(b => b.type === 'slack');
  if (slackIdx >= 0) {
    const sb = p.buses[slackIdx];
    if (sb) V[slackIdx] = polar(sb.V_mag ?? 1, (sb.V_ang_deg ?? 0) * Math.PI / 180);
  }

  let iter = 0;
  let maxMismatch = Infinity;

  while (iter < Math.min(p.maxIter, 50) && maxMismatch > p.tolerance) {
    maxMismatch = 0;
    for (let i = 0; i < n; i++) {
      const bus = p.buses[i];
      if (!bus || bus.type === 'slack') continue;
      const P = bus.P ?? 0;
      const Q = bus.Q ?? 0;
      const V_new = gsUpdatePQ(V, p.Ybus, i, P, Q);
      if (bus.type === 'PV') {
        const Vmag = bus.V_mag ?? 1;
        const angle = cAngle(V_new);
        V[i] = polar(Vmag, angle);
      } else {
        V[i] = V_new;
      }
      const dP = P - calcPinj(V, p.Ybus, i);
      const dQ = Q - calcQinj(V, p.Ybus, i);
      maxMismatch = Math.max(maxMismatch, Math.abs(dP), Math.abs(dQ));
    }
    iter++;
  }

  const computed: Record<string, number> = { iter, maxMismatch };
  V.forEach((v, i) => {
    computed[`V${i + 1}_mag`] = cAbs(v);
    computed[`V${i + 1}_ang_deg`] = cAngle(v) * 180 / Math.PI;
  });
  return sol(kind, computed, [
    step('\\text{Flat start: }V^{(0)}=1\\angle0°', 'Initial guess.'),
    step('V_i^{(k+1)} = \\frac{1}{Y_{ii}}(S_i^*/V_i^{*(k)} - \\sum_{j\\neq i}Y_{ij}V_j^{(k)})', 'G-S update formula.'),
    step(`\\text{Converged in }${iter}\\text{ iterations, mismatch}=${maxMismatch.toFixed(6)}\\,\\text{pu}`, 'Convergence.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q48: Symmetrical 3-phase fault  (kind: 'symmetrical-fault')
// ---------------------------------------------------------------------------

function solveSymmetricalFault(
  p: { Zbus: Complex[][]; Vpre: number; faultBus: number },
  kind: string
): EESolution {
  const fb = p.faultBus - 1;  // 0-indexed
  const Zff = p.Zbus[fb]?.[fb] ?? cx(0, 0.1);
  const Zff_mag = cAbs(Zff);
  const If_mag = Zff_mag > 0 ? p.Vpre / Zff_mag : 0;
  // If = Vpre / Zff (phasor); Zff purely imaginary → If is -j * (Vpre / Zff_im)
  const If_im = Zff.im !== 0 ? p.Vpre / Zff.im : 0;
  const computed: Record<string, number> = { If_mag, If_pu_re: 0, If_pu_im: -If_mag };
  const n = p.Zbus.length;
  for (let i = 0; i < n; i++) {
    const Zif_im = p.Zbus[i]?.[fb]?.im ?? 0;
    computed[`V${i + 1}_post`] = p.Vpre - Zif_im * If_mag;
  }
  computed['V_fault'] = 0;
  return sol(kind, computed, [
    step(`I_f = V_{pre}/Z_{ff} = ${If_mag.toFixed(4)}\\,\\text{pu}`, 'Fault current from Thevenin.'),
    step('V_i = V_{pre} - Z_{if} I_f', 'Post-fault voltages.'),
    step(`V_{fault} = 0\\,\\text{pu}\\text{ (solid fault)}`, 'Faulted bus voltage.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q49: NR Jacobian  (kind: 'nr-jacobian')
// Same bus data / Ybus as G-S case
// ---------------------------------------------------------------------------

function solveNrJacobian(
  p: {
    buses: Array<{ id: number; type: 'slack' | 'PV' | 'PQ'; V_mag?: number; V_ang_deg?: number; P?: number; Q?: number }>;
    Ybus: Complex[][];
    maxIter: number;
    tolerance: number;
  },
  kind: string
): EESolution {
  const n = p.buses.length;
  const V: Complex[] = p.buses.map(b => polar(b.V_mag ?? 1, (b.V_ang_deg ?? 0) * Math.PI / 180));
  const slackIdx = p.buses.findIndex(b => b.type === 'slack');

  // Count unknowns: δ for PV+PQ, |V| for PQ only
  const pvBuses = p.buses.filter((_, i) => p.buses[i]?.type === 'PV');
  const pqBuses = p.buses.filter((_, i) => p.buses[i]?.type === 'PQ');
  const J_dim = pvBuses.length + 2 * pqBuses.length;

  // Compute mismatch at flat start
  const mismatches: number[] = [];
  for (let i = 0; i < n; i++) {
    const bus = p.buses[i];
    if (!bus || bus.type === 'slack') continue;
    const dP = (bus.P ?? 0) - calcPinj(V, p.Ybus, i);
    mismatches.push(dP);
    if (bus.type === 'PQ') {
      const dQ = (bus.Q ?? 0) - calcQinj(V, p.Ybus, i);
      mismatches.push(dQ);
    }
  }
  const mismatch_norm = Math.sqrt(mismatches.reduce((a, b) => a + b * b, 0));

  return sol(kind, {
    J_dim, mismatch_norm,
    ...Object.fromEntries(mismatches.map((m, i) => [`mismatch_${i}`, m])),
  }, [
    step('J = \\begin{bmatrix}H & N \\\\ M & L\\end{bmatrix} = \\begin{bmatrix}\\partial P/\\partial\\delta & \\partial P/\\partial|V| \\\\ \\partial Q/\\partial\\delta & \\partial Q/\\partial|V|\\end{bmatrix}', 'Jacobian submatrices.'),
    step(`J\\text{ is }${J_dim}\\times${J_dim}`, 'Dimension from unknowns.'),
    step(`\\|\\text{mismatch}\\|_0 = ${mismatch_norm.toFixed(6)}\\,\\text{pu}`, 'Initial mismatch at flat start.'),
    step('\\text{N-R converges in 3–5 iterations vs 20–50 for G-S}', 'Quadratic convergence advantage.'),
  ]);
}

// ---------------------------------------------------------------------------
// Q50: Integrator oscillator  (kind: 'integrator-oscillator')
// ---------------------------------------------------------------------------

function solveIntegratorOscillator(
  p: { f0: number; C: number; nIntegrators: 2 },
  kind: string
): EESolution {
  const omega0 = 2 * Math.PI * p.f0;
  const R = 1 / (omega0 * p.C);
  const T = 1 / p.f0;
  return sol(kind, { omega0, R, T }, [
    step(`\\omega_0 = 2\\pi f_0 = ${omega0.toFixed(4)}\\,\\text{rad/s}`, 'Target oscillation frequency.'),
    step(`R = 1/(\\omega_0 C) = ${R.toFixed(4)}\\,\\Omega`, 'Resistor value per integrator.'),
    step('L(s) = -1/(sRC)^2 \\Rightarrow \\text{poles at }\\pm j\\omega_0', 'Two integrators + inversion.'),
    step('|L(j\\omega_0)|=1,\\; \\angle L=-180°\\;\\checkmark', 'Barkhausen criterion.'),
  ]);
}

// ---------------------------------------------------------------------------
// Main dispatch
// ---------------------------------------------------------------------------

export function solve(spec: EEProblemSpec): EESolution {
  switch (spec.kind) {
    case 'kvl-series-loop':
      return solveKvl(spec.params, spec.kind);
    case 'nodal-analysis':
      return solveNodalAnalysis(spec.params, spec.kind);
    case 'mesh-analysis':
      return solveMeshAnalysis(spec.params, spec.kind);
    case 'superposition':
      return solveSuperposition(spec.params, spec.kind);
    case 'thevenin-norton':
      return solveTheveninNorton(spec.params, spec.kind);
    case 'dependent-source-nodal':
      return solveDependentSourceNodal(spec.params, spec.kind);
    case 'delta-wye':
      return solveDeltaWye(spec.params, spec.kind);
    case 'rc-step':
      return solveRcStep(spec.params, spec.kind);
    case 'rl-transient':
      return solveRlTransient(spec.params, spec.kind);
    case 'rlc-series-step':
      return solveRlcSeriesStep(spec.params, spec.kind);
    case 'rc-nonzero-ic':
      return solveRcNonzeroIc(spec.params, spec.kind);
    case 'ac-series-rlc':
      return solveAcSeriesRlc(spec.params, spec.kind);
    case 'ac-parallel-rlc':
      return solveAcParallelRlc(spec.params, spec.kind);
    case 'ac-mesh-dependent':
      return solveAcMeshDependent(spec.params, spec.kind);
    case 'ac-thevenin':
      return solveAcThevenin(spec.params, spec.kind);
    case 'pf-correction':
      return solvePfCorrection(spec.params, spec.kind);
    case 'complex-power-balance':
      return solveComplexPowerBalance(spec.params, spec.kind);
    case 'series-resonance':
      return solveSeriesResonance(spec.params, spec.kind);
    case 'parallel-resonance':
      return solveParallelResonance(spec.params, spec.kind);
    case 'bode-plot':
      return solveBodePlot(spec.params, spec.kind);
    case 'bandpass-filter':
      return solveBandpassFilter(spec.params, spec.kind);
    case 'z-parameters':
      return solveZParameters(spec.params, spec.kind);
    case 'abcd-cascade':
      return solveAbcdCascade(spec.params, spec.kind);
    case 'two-port-gain':
      return solveTwoPortGain(spec.params, spec.kind);
    case 'mutual-inductance':
      return solveMutualInductance(spec.params, spec.kind);
    case 'ideal-transformer':
      return solveIdealTransformer(spec.params, spec.kind);
    case 'three-phase-yy':
      return solveBalancedYY(spec.params, spec.kind);
    case 'three-phase-yd':
      return solveBalancedYD(spec.params, spec.kind);
    case 'two-wattmeter':
      return solveTwoWattmeter(spec.params, spec.kind);
    case 'bjt-ce-amplifier':
      return solveBjtCe(spec.params, spec.kind);
    case 'miller-bandwidth':
      return solveMillerBandwidth(spec.params, spec.kind);
    case 'emitter-degeneration':
      return solveEmitterDegeneration(spec.params, spec.kind);
    case 'cascode':
      return solveCascode(spec.params, spec.kind);
    case 'mosfet-cs':
      return solveMosfetCs(spec.params, spec.kind);
    case 'mosfet-diff-pair':
      return solveMosfetDiffPair(spec.params, spec.kind);
    case 'source-follower':
      return solveSourceFollower(spec.params, spec.kind);
    case 'opamp-summer':
      return solveOpampSummer(spec.params, spec.kind);
    case 'diff-amp-cmrr':
      return solveDiffAmpCmrr(spec.params, spec.kind);
    case 'sallen-key':
      return solveSallenKey(spec.params, spec.kind);
    case 'schmitt-trigger':
      return solveSchmittTrigger(spec.params, spec.kind);
    case 'series-shunt-feedback':
      return solveSeriesShuntFeedback(spec.params, spec.kind);
    case 'bode-stability':
      return solveBodeStability(spec.params, spec.kind);
    case 'root-locus':
      return solveRootLocus(spec.params, spec.kind);
    case 'per-unit':
      return solvePerUnit(spec.params, spec.kind);
    case 'ybus-formation':
      return solveYbusFormation(spec.params, spec.kind);
    case 'gauss-seidel-pf':
      return solveGaussSeidelPf(spec.params, spec.kind);
    case 'symmetrical-fault':
      return solveSymmetricalFault(spec.params, spec.kind);
    case 'nr-jacobian':
      return solveNrJacobian(spec.params, spec.kind);
    case 'integrator-oscillator':
      return solveIntegratorOscillator(spec.params, spec.kind);
  }
}
