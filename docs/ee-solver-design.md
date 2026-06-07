# EE Solver Design — `EEProblemSpec` Schema

> Generated from analysis of `year1.ts`, `year2.ts`, `year3.ts`, and `types.ts`.

## Goals

Provide a minimal, solver-oriented description of each problem containing only what an automated
solver needs: **what kind of calculation** to perform and **what numbers to plug in**.
No answers, no SVG, no step text.

---

## TypeScript Schema

```typescript
// ── Primitives ────────────────────────────────────────────────────────────────

/** Complex number in rectangular form (real + j·imag). */
export interface Complex {
  re: number;
  im: number;
}

/** Resistor/impedance component for multi-element lists. */
export interface ResistorEntry { label: string; ohms: number; }

/** Three-phase line impedance entry (pu or physical). */
export interface LineEntry { from: number; to: number; y: Complex; }

/** ABCD section description. */
export type ABCDSection =
  | { type: 'series-Z';  Z: Complex }
  | { type: 'shunt-Y';   Y: Complex }
  | { type: 'series-RL'; R: number; L: number; omega: number }
  | { type: 'series-RC'; R: number; C: number; omega: number };

/** Power-flow bus specification. */
export interface PFBus {
  id: number;
  type: 'slack' | 'PV' | 'PQ';
  /** Specified values (pu). Slack: V & angle; PV: P & |V|; PQ: P & Q. */
  V_mag?: number;
  V_ang_deg?: number;
  P?: number;
  Q?: number;
}

// ── Per-kind params ────────────────────────────────────────────────────────────

export interface KvlSeriesLoopParams {
  Vs: number;                     // source voltage (V)
  resistors: ResistorEntry[];     // series resistors in order
}

export interface NodalAnalysisParams {
  nodeCount: number;              // total node count (incl. ground)
  /** Voltage sources fixing a node: key = node id (1-based), value = V */
  fixedVoltages: Record<number, number>;
  /** Resistors as [fromNode, toNode, ohms]; 0 = ground */
  resistors: [number, number, number][];
  /** Independent current sources injecting into a node: [nodeId, amps] */
  currentSources?: [number, number][];
}

export interface MeshAnalysisParams {
  meshCount: number;
  /** Voltage sources per mesh (positive = aids CW current) */
  Vs: number[];
  /** Self-impedances per mesh */
  selfZ: number[];
  /** Mutual impedances: [meshA, meshB, sharedZ] */
  mutualZ: [number, number, number][];
}

export interface SuperpositionParams {
  Vs: number;                     // voltage source (V)
  Is: number;                     // current source (A)
  R1: number; R2: number; R3: number;
  targetBranch: 'R3';             // which branch current to find
}

export interface TheveninNortonParams {
  Vs: number;
  R1: number; R2: number; R3: number;
  /** Which node pair are the Thevenin terminals */
  terminalLabel: string;          // e.g. 'A-B'
}

export interface DependentSourceNodalParams {
  Vs: number;                     // voltage source fixing V1 (V)
  R1: number; R2: number;
  /** Dependent VCCS: current = gain × controlling node voltage */
  vccsGain: number;               // e.g. 0.4 (A/V)
  controllingNode: number;        // 1-based node id
  injectingNode: number;
}

export interface DeltaWyeParams {
  Rab: number; Rbc: number; Rca: number;
  /** Test voltage applied across these two terminals (A=1,B=2,C=3), third floating */
  VTest: number;
  testTerminals: [1 | 2 | 3, 1 | 2 | 3];
}

export interface RcStepParams {
  R: number;    // Ω
  C: number;    // F
  Vs: number;   // step amplitude (V)
  vc0: number;  // initial capacitor voltage (V)
}

export interface RlTransientParams {
  R_src: number;    // source-side resistance (Ω)
  L: number;        // H
  Vs: number;       // pre-switch source voltage (V)
  R_fw: number;     // freewheeling resistance after switch opens (Ω)
}

export interface RlcSeriesStepParams {
  R: number; L: number; C: number;
  Vs: number;                     // step voltage (V)
  vc0: number;                    // initial v_C (V)
  iL0: number;                    // initial i_L (A)
  /** Expected damping regime (informational, solver derives from params). */
  damping: 'over' | 'under' | 'critical';
}

export interface RcNonzeroIcParams extends RcStepParams {
  R2: number;       // second resistor forming Thevenin with R (Ω)
}

// ── AC Phasor ─────────────────────────────────────────────────────────────────

export interface AcSeriesRlcParams {
  Vs_mag: number; Vs_ang_deg: number;
  f_Hz: number;                   // frequency (Hz)
  R: number; L: number; C: number;
}

export interface AcParallelRlcParams {
  Is_mag: number; Is_ang_deg: number;
  omega: number;                  // angular frequency (rad/s)
  R: number; L: number; C: number;
}

export interface AcMeshDependentParams {
  omega: number;
  Vs: number;
  /** Simple two-mesh descriptor. Series elements per mesh. */
  mesh1Elements: ABCDSection[];
  mesh2Elements: ABCDSection[];
  /** Dependent voltage source: V_d = gain × I2 × R2 */
  depSrcGain: number;
}

export interface AcTheveninParams {
  Vs_mag: number; Vs_ang_deg: number;
  omega: number;
  R1: number; L: number; R2: number; C: number;
  terminalLabel: string;
}

export interface PfCorrectionParams {
  P_W: number;                    // real power (W)
  pf1: number;                    // original lagging power factor
  pf2: number;                    // target lagging power factor
  V_rms: number;                  // line voltage rms (V)
  f_Hz: number;
}

export interface ComplexPowerBalanceParams {
  Vs_mag: number;
  omega: number;
  R: number; L: number; C: number;
}

export interface SeriesResonanceParams {
  R: number; L: number; C: number;
}

export interface ParallelResonanceParams {
  R: number; L: number; C: number;
  Is: number;                     // current source magnitude (A)
}

export interface BodePlotParams {
  /** Symbolic transfer function string for documentation. */
  H_s: string;
  gain: number;                   // leading gain constant K
  poles: number[];                // real part of poles (negative for LHP), 0 for origin
  zeros: number[];                // real part of finite zeros
  /** Frequency at which to compute exact |H(jω)| */
  evalAt_omega?: number;
}

export interface BandpassFilterParams {
  R: number; L: number; C: number;
  topology: 'series-RLC-across-R';
}

export interface ZParametersParams {
  Za: number | Complex;           // port-1 series arm
  Zb: number | Complex;           // port-2 series arm
  Zc: number | Complex;           // shunt arm
  topology: 'T' | 'Pi';
}

export interface AbcdCascadeParams {
  sections: ABCDSection[];
  Zs: Complex;                    // source impedance
  ZL: Complex;                    // load impedance
}

export interface TwoPortGainParams {
  Z11: number; Z12: number; Z22: number;  // Z-matrix (reciprocal assumed)
  Vs: number;
  Zs: number;                     // source impedance
  ZL: number;                     // load impedance
}

export interface MutualInductanceParams {
  L1: number; L2: number; M: number;
  Vs_mag: number;
  omega: number;
  port2Open: boolean;
}

export interface IdealTransformerParams {
  n: number;                      // turns ratio N1:N2 (e.g. 5 means 5:1)
  Vs: number;
  Zs: number;
  ZL: number;
}

// ── Three-Phase ───────────────────────────────────────────────────────────────

export interface ThreePhaseYYParams {
  VL_rms: number;                 // line voltage (V rms)
  Z_ph: Complex;                  // per-phase load impedance (Ω)
}

export interface ThreePhaseYDParams {
  VL_rms: number;
  Z_delta: Complex;               // per-phase delta load impedance (Ω)
}

export interface TwoWattmeterParams {
  W1: number;                     // wattmeter 1 reading (W)
  W2: number;                     // wattmeter 2 reading (W)
}

// ── BJT Small-Signal ──────────────────────────────────────────────────────────

export interface BjtCeAmplifierParams {
  IC: number;     // collector bias current (A)
  beta: number;   // current gain β
  VA: number;     // Early voltage (V)
  RC: number;     // collector resistance (Ω)
  RS: number;     // source resistance (Ω)
}

export interface MillerBandwidthParams {
  Av: number;     // midband voltage gain (negative for CE)
  Cpi: number;    // C_π (F)
  Cmu: number;    // C_μ (F)
  RS: number;     // source resistance (Ω)
  rpi: number;    // r_π (Ω)
}

export interface EmitterDegenerationParams {
  RE: number;     // unbypassed emitter resistance (Ω)
  RC: number;
  gm: number;     // transconductance (A/V)
  rpi: number;
  ro: number;     // output resistance (Ω)
}

export interface CascodeParams {
  gm1: number; ro1: number;       // CE stage
  gm2: number; ro2: number;       // CB stage
  RL: number;
}

// ── MOSFET Small-Signal ───────────────────────────────────────────────────────

export interface MosfetCsParams {
  kn: number;       // process transconductance parameter (A/V²)
  VTN: number;      // threshold voltage (V)
  VGS: number;      // gate-source bias (V)
  lambda: number;   // channel-length modulation (V⁻¹)
  RD: number;       // drain resistance (Ω)
}

export interface MosfetDiffPairParams {
  gm: number;
  ro: number;
  RSS: number;      // tail resistance (Ω)
  RD: number;
}

export interface SourceFollowerParams {
  gm: number;
  ro: number;
  RS: number;       // source resistance (Ω)
  RL: number;
}

// ── Op-Amp ────────────────────────────────────────────────────────────────────

export interface OpampSummerParams {
  Rf: number;
  inputs: { R: number; V: number }[];   // each input resistor and its voltage
}

export interface DiffAmpCmrrParams {
  R1: number; R2: number; R3: number; R4: number;
  /** R4 mismatch delta (e.g. 100 = 0.1 kΩ over a 10 kΩ nominal) */
  deltaR4: number;
}

export interface SallenKeyParams {
  R1: number; R2: number;
  C1: number; C2: number;
  K: number;    // op-amp gain (1 + Rb/Ra) — sets Q
}

export interface SchmittTriggerParams {
  R1: number;                     // to non-inverting input from output
  R2: number;                     // to non-inverting input from input signal
  Vsat_pos: number;               // positive saturation voltage (V)
  Vsat_neg: number;               // negative saturation voltage (V)
}

export interface SeriesShuntFeedbackParams {
  A: number;          // open-loop voltage gain
  Rin: number;        // open-loop input resistance (Ω)
  Rout: number;       // open-loop output resistance (Ω)
  beta_f: number;     // feedback fraction
}

// ── Control / Stability ───────────────────────────────────────────────────────

export interface BodeStabilityParams {
  /** Symbolic open-loop transfer function L(s). */
  L_s: string;
  /** Real parts of open-loop poles (negative = LHP). */
  poles: number[];
  zeros: number[];
  gain: number;
}

export interface RootLocusParams {
  /** Symbolic loop gain G(s)H(s). */
  GH_s: string;
  openLoopPoles: number[];        // real axis values
  openLoopZeros: number[];
  gain_symbol: 'K';
}

export interface IntegratorOscillatorParams {
  f0: number;     // desired oscillation frequency (Hz)
  C: number;      // capacitor value (F)
  /** Number of op-amp integrators in the loop (2 for a 360°/−180°+inversion loop). */
  nIntegrators: 2;
}

// ── Power Systems ─────────────────────────────────────────────────────────────

export interface PerUnitParams {
  Sbase_MVA: number;
  zones: { Vbase_kV: number }[];  // one entry per voltage zone
  /** Actual line impedances in physical ohms: [zoneIndex, R_ohm, X_ohm] */
  lineImpedances: [number, number, number][];
}

export interface YbusFormationParams {
  nBuses: number;
  lines: LineEntry[];             // line admittances in pu
  /** Shunt admittances per bus (pu). Omit or set 0 if none. */
  shunts?: Record<number, Complex>;
}

export interface GaussSeidelPfParams {
  buses: PFBus[];
  Ybus: Complex[][];              // nBus × nBus admittance matrix (pu)
  maxIter: number;
  tolerance: number;
}

export interface SymmetricalFaultParams {
  Zbus: Complex[][];              // Thevenin Zbus matrix (pu)
  Vpre: number;                   // pre-fault voltage (pu), typically 1.0
  faultBus: number;               // 1-based bus index
}

export interface NrJacobianParams {
  buses: PFBus[];
  Ybus: Complex[][];
  maxIter: number;
  tolerance: number;
}

// ── Discriminated Union ────────────────────────────────────────────────────────

export type EEProblemSpec =
  | { kind: 'kvl-series-loop';          params: KvlSeriesLoopParams }
  | { kind: 'nodal-analysis';           params: NodalAnalysisParams }
  | { kind: 'mesh-analysis';            params: MeshAnalysisParams }
  | { kind: 'superposition';            params: SuperpositionParams }
  | { kind: 'thevenin-norton';          params: TheveninNortonParams }
  | { kind: 'dependent-source-nodal';   params: DependentSourceNodalParams }
  | { kind: 'delta-wye';                params: DeltaWyeParams }
  | { kind: 'rc-step';                  params: RcStepParams }
  | { kind: 'rl-transient';             params: RlTransientParams }
  | { kind: 'rlc-series-step';          params: RlcSeriesStepParams }
  | { kind: 'rc-nonzero-ic';            params: RcNonzeroIcParams }
  | { kind: 'ac-series-rlc';            params: AcSeriesRlcParams }
  | { kind: 'ac-parallel-rlc';          params: AcParallelRlcParams }
  | { kind: 'ac-mesh-dependent';        params: AcMeshDependentParams }
  | { kind: 'ac-thevenin';             params: AcTheveninParams }
  | { kind: 'pf-correction';           params: PfCorrectionParams }
  | { kind: 'complex-power-balance';   params: ComplexPowerBalanceParams }
  | { kind: 'series-resonance';        params: SeriesResonanceParams }
  | { kind: 'parallel-resonance';      params: ParallelResonanceParams }
  | { kind: 'bode-plot';               params: BodePlotParams }
  | { kind: 'bandpass-filter';         params: BandpassFilterParams }
  | { kind: 'z-parameters';            params: ZParametersParams }
  | { kind: 'abcd-cascade';            params: AbcdCascadeParams }
  | { kind: 'two-port-gain';           params: TwoPortGainParams }
  | { kind: 'mutual-inductance';       params: MutualInductanceParams }
  | { kind: 'ideal-transformer';       params: IdealTransformerParams }
  | { kind: 'three-phase-yy';          params: ThreePhaseYYParams }
  | { kind: 'three-phase-yd';          params: ThreePhaseYDParams }
  | { kind: 'two-wattmeter';           params: TwoWattmeterParams }
  | { kind: 'bjt-ce-amplifier';        params: BjtCeAmplifierParams }
  | { kind: 'miller-bandwidth';        params: MillerBandwidthParams }
  | { kind: 'emitter-degeneration';    params: EmitterDegenerationParams }
  | { kind: 'cascode';                 params: CascodeParams }
  | { kind: 'mosfet-cs';              params: MosfetCsParams }
  | { kind: 'mosfet-diff-pair';       params: MosfetDiffPairParams }
  | { kind: 'source-follower';         params: SourceFollowerParams }
  | { kind: 'opamp-summer';           params: OpampSummerParams }
  | { kind: 'diff-amp-cmrr';          params: DiffAmpCmrrParams }
  | { kind: 'sallen-key';             params: SallenKeyParams }
  | { kind: 'schmitt-trigger';         params: SchmittTriggerParams }
  | { kind: 'series-shunt-feedback';  params: SeriesShuntFeedbackParams }
  | { kind: 'bode-stability';         params: BodeStabilityParams }
  | { kind: 'root-locus';             params: RootLocusParams }
  | { kind: 'per-unit';               params: PerUnitParams }
  | { kind: 'ybus-formation';          params: YbusFormationParams }
  | { kind: 'gauss-seidel-pf';        params: GaussSeidelPfParams }
  | { kind: 'symmetrical-fault';      params: SymmetricalFaultParams }
  | { kind: 'nr-jacobian';            params: NrJacobianParams }
  | { kind: 'integrator-oscillator';  params: IntegratorOscillatorParams };
```

---

## Solver-Type Grouping

All 50 problem kinds collapse into **12 solver families**. Solvers within a family share
the same mathematical engine; they differ only in params shape.

### Group 1 — DC Linear Solver
Linear algebraic system (Ohm + KVL/KCL). Covers resistive networks at DC with independent and
dependent sources.

| Kind | Key maths |
|---|---|
| `kvl-series-loop` | R_eq = ΣRᵢ; I = Vs / R_eq |
| `nodal-analysis` | Build G matrix from admittances; solve GV = I |
| `mesh-analysis` | Build Z matrix; solve ZI = V |
| `superposition` | Solve once per source, superpose |
| `thevenin-norton` | V_oc at open terminals; R_th with killed sources |
| `dependent-source-nodal` | Augmented nodal with controlled-source constraint |
| `delta-wye` | R_Y = product / sum (Δ→Y); re-solve reduced network |

### Group 2 — First-Order Transient Solver
Closed-form exponential: v(t) = v_∞ + (v₀ − v_∞)e^(−t/τ).

| Kind | τ formula |
|---|---|
| `rc-step` | τ = RC |
| `rl-transient` | τ = L / R_fw |
| `rc-nonzero-ic` | τ = R_th·C; R_th = R₁‖R₂ |

### Group 3 — Second-Order Transient Solver
Characteristic equation s² + 2αs + ω₀² = 0. Branch on discriminant.

| Kind | Notes |
|---|---|
| `rlc-series-step` | α = R/(2L), ω₀ = 1/√(LC); over/under/critical path |

### Group 4 — AC Phasor Solver
Phasor arithmetic: replace R→R, L→jωL, C→1/(jωC); then DC-equivalent methods.

| Kind | Core operation |
|---|---|
| `ac-series-rlc` | Z_total = R + j(ωL − 1/ωC); I = Vs / Z |
| `ac-parallel-rlc` | Y_total = 1/R + 1/(jωL) + jωC; V = Is / Y |
| `ac-mesh-dependent` | Complex mesh matrix with asymmetric dependent term |
| `ac-thevenin` | Phasor V_oc, Z_th = driving-point impedance |
| `complex-power-balance` | S = VI*; ΣS_branches = S_source |

### Group 5 — Power & Power Factor Solver
Operates on P, Q, S triangle and shunt capacitor sizing.

| Kind | Key formula |
|---|---|
| `pf-correction` | Q_c = P(tan φ₁ − tan φ₂); C = Q_c / (ω V²) |
| `two-wattmeter` | P = W₁ + W₂; Q = √3(W₁ − W₂) |

### Group 6 — Resonance & Filter Solver
Finds ω₀, Q, bandwidth, and half-power frequencies.

| Kind | ω₀ |
|---|---|
| `series-resonance` | 1/√(LC) |
| `parallel-resonance` | 1/√(LC) |
| `bandpass-filter` | 1/√(LC); H(jω) = R/Z_total |
| `sallen-key` | 1/(RC); Q = 1/(3−K) |

### Group 7 — Bode / Frequency-Response Solver
Factored-form H(s) → asymptotic slopes, corner frequencies, exact magnitude and phase.

| Kind | Output |
|---|---|
| `bode-plot` | Asymptotic magnitude/phase; exact at ω_eval |
| `bode-stability` | Gain margin (at ω_pc), phase margin (at ω_gc) |

### Group 8 — Two-Port Network Solver
Matrix representations relating port voltages and currents.

| Kind | Method |
|---|---|
| `z-parameters` | Open-circuit port tests; Z₁₁, Z₁₂, Z₂₂ |
| `abcd-cascade` | Matrix product of section ABCD matrices |
| `two-port-gain` | Solve 4-equation system V₁, V₂, I₁, I₂ |
| `mutual-inductance` | V = jωLI + jωMI₂; coupling k = M/√(L₁L₂) |
| `ideal-transformer` | Z_ref = n²Z_L; I₂ = nI₁ |

### Group 9 — Three-Phase Solver
Balanced phasor methods: per-phase equivalent, line/phase conversion.

| Kind | Key conversion |
|---|---|
| `three-phase-yy` | V_ph = V_L/√3; I_L = I_ph |
| `three-phase-yd` | Z_Y = Z_Δ/3; I_L = √3·I_ph |

### Group 10 — BJT / MOSFET Small-Signal Solver
Linearised hybrid-π or common-source model at a bias point.

| Kind | Model |
|---|---|
| `bjt-ce-amplifier` | gₘ = Ic/Vt; rπ = β/gₘ; ro = VA/Ic; Av = −gₘ(ro‖RC) |
| `miller-bandwidth` | Cₘ = Cμ(1−Av); f_3dB = 1/(2π Rᵢₙ Cᵢₙ) |
| `emitter-degeneration` | Gₘ = gₘ/(1+gₘRE); Rᵢₙ = rπ+(1+gₘRE)RE |
| `cascode` | Rout ≈ gₘ₂ ro₂ ro₁ |
| `mosfet-cs` | gₘ = 2kₙ(VGS−VTN); ro = 1/(λID); Av = −gₘ(ro‖RD) |
| `mosfet-diff-pair` | Ad = −gₘRD; Acm = −RD/(2RSS); CMRR = 20 log|Ad/Acm| |
| `source-follower` | Av = gₘRL_eff/(1+gₘRL_eff) ≈ 1; Rout ≈ 1/gₘ |

### Group 11 — Op-Amp Circuit Solver
Virtual-ground / feedback analysis for ideal op-amps.

| Kind | Method |
|---|---|
| `opamp-summer` | Vout = −Rf·Σ(Vᵢ/Rᵢ) |
| `diff-amp-cmrr` | Ad = 1 (ideal); Acm = ΔR/(4R) from mismatch |
| `schmitt-trigger` | VUT = β·Vsat_pos + (1−β)·Vsat_neg and symmetric VLT |
| `series-shunt-feedback` | Af = A/(1+Aβ); Rif = Rᵢₙ(1+T); Rof = Rout/(1+T) |

### Group 12 — Power-Systems / Control Solver
Large-system matrix methods; iterative algorithms.

| Kind | Algorithm |
|---|---|
| `per-unit` | Zb = Vb²/Sb per zone; Z_pu = Z_Ω/Zb |
| `ybus-formation` | Y_ii = Σyᵢⱼ (diag); Y_ij = −yᵢⱼ (off-diag) |
| `gauss-seidel-pf` | Iterative PQ/PV bus voltage updates |
| `symmetrical-fault` | If = Vpre/Z_ff; Vk = Vpre − Zkf·If |
| `nr-jacobian` | Mismatch [ΔP, ΔQ]; J = ∂[P,Q]/∂[δ,|V|]; Δx = J⁻¹ΔF |
| `root-locus` | Poles/zeros → centroid, asymptotes, breakaway, jω crossing |
| `integrator-oscillator` | ω₀ = 1/RC per integrator; R = 1/(ω₀C) |

---

## Q1–Q50 Mapping Table

| Q | Slug | Kind | Key Params |
|---|---|---|---|
| Q01 | `q01-kvl-single-loop` | `kvl-series-loop` | `Vs=24`, `resistors=[4,6,2]Ω` |
| Q02 | `q02-nodal-3-node` | `nodal-analysis` | `nodeCount=4`, `fixedVoltages={1:30}`, `Is=[{3,2A}]`, resistors |
| Q03 | `q03-mesh-3` | `mesh-analysis` | `meshCount=3`, `Vs=[20,0,-10]`, selfZ, mutualZ |
| Q04 | `q04-superposition` | `superposition` | `Vs=36`, `Is=4`, `R1=9`, `R2=18`, `R3=6` |
| Q05 | `q05-thevenin-norton` | `thevenin-norton` | `Vs=48`, `R1=8`, `R2=24`, `R3=12`, terminal `A-B` |
| Q06 | `q06-dependent-source` | `dependent-source-nodal` | `Vs=20`, `R1=10`, `R2=5`, `vccsGain=0.4` |
| Q07 | `q07-delta-wye` | `delta-wye` | `Rab=30`, `Rbc=60`, `Rca=90`, `VTest=100`, terminals `[A,C]` |
| Q08 | `q08-rc-step` | `rc-step` | `R=10e3`, `C=100e-6`, `Vs=12`, `vc0=0` |
| Q09 | `q09-rl-transient` | `rl-transient` | `R_src=50`, `L=0.2`, `Vs=24`, `R_fw=100` |
| Q10 | `q10-rlc-overdamped` | `rlc-series-step` | `R=8`, `L=1`, `C=0.25`, `Vs=10`, `damping='over'` |
| Q11 | `q11-rlc-underdamped` | `rlc-series-step` | `R=2`, `L=1`, `C=0.5`, `Vs=20`, `damping='under'` |
| Q12 | `q12-switched-rc` | `rc-nonzero-ic` | `R=20e3`, `R2=30e3`, `C=10e-6`, `vc0=8`, `Vs=15` |
| Q13 | `q13-series-rlc-impedance` | `ac-series-rlc` | `Vs=120∠0°`, `f=60Hz`, `R=10`, `L=50e-3`, `C=100e-6` |
| Q14 | `q14-parallel-rlc` | `ac-parallel-rlc` | `Is=5∠30°`, `ω=1000`, `R=20`, `L=40e-3`, `C=50e-6` |
| Q15 | `q15-ac-mesh-dependent` | `ac-mesh-dependent` | `ω=5000`, `Vs=80`, dependent `Vd=4I₂R₂` |
| Q16 | `q16-ac-thevenin` | `ac-thevenin` | `Vs=50∠0°`, `ω=2000`, `R1=10`, `L=5e-3`, `R2=20`, `C=25e-6` |
| Q17 | `q17-pf-correction` | `pf-correction` | `P=10e3W`, `pf1=0.65`, `pf2=0.95`, `V=230Vrms`, `f=50Hz` |
| Q18 | `q18-complex-power` | `complex-power-balance` | `Vs=100∠0°`, `ω=1000`, `R=10`, `L` and `C` at resonance |
| Q19 | `q19-series-resonance` | `series-resonance` | `R=5`, `L=10e-3`, `C=40e-6` |
| Q20 | `q20-parallel-resonance` | `parallel-resonance` | `R=50e3`, `L=0.5e-3`, `C=200e-12`, `Is=2e-3` |
| Q21 | `q21-bode-plot` | `bode-plot` | `H(s)=1000(s+100)/[s(s+10)(s+1000)]`, `evalAt=100rad/s` |
| Q22 | `q22-bandpass-filter` | `bandpass-filter` | `R=100`, `L=10e-3`, `C=1e-6` |
| Q23 | `q23-z-parameters` | `z-parameters` | `Za=10`, `Zb=20`, `Zc=30`, `topology='T'` |
| Q24 | `q24-abcd-cascade` | `abcd-cascade` | 3 sections: `[series-Z j10]`, `[shunt-Y j0.05]`, `[series-Z 5+j5]`; `Zs=10`, `ZL=50` |
| Q25 | `q25-two-port-gain` | `two-port-gain` | `Z11=20`, `Z12=10`, `Z22=30`, `Vs=100`, `Zs=5`, `ZL=25` |
| Q26 | `q26-mutual-inductance` | `mutual-inductance` | `L1=4`, `L2=9`, `M=3`, `Vs=100∠0°`, `ω=10`, `port2Open=true` |
| Q27 | `q27-ideal-transformer` | `ideal-transformer` | `n=5`, `Vs=240`, `Zs=2`, `ZL=8` |
| Q28 | `q28-balanced-yy` | `three-phase-yy` | `VL=415Vrms`, `Z_ph={re:10,im:8}` |
| Q29 | `q29-balanced-yd` | `three-phase-yd` | `VL=208Vrms`, `Z_delta={re:30,im:40}` |
| Q30 | `q30-two-wattmeter` | `two-wattmeter` | `W1=4500`, `W2=1500` |
| Q31 | `q31-ce-amplifier` | `bjt-ce-amplifier` | `IC=2e-3`, `β=100`, `VA=80`, `RC=5e3`, `RS=1e3` |
| Q32 | `q32-miller-bandwidth` | `miller-bandwidth` | `Av=-196`, `Cpi=15e-12`, `Cmu=2e-12`, `RS=1e3`, `rpi=1.3e3` |
| Q33 | `q33-emitter-degeneration` | `emitter-degeneration` | `RE=500`, `RC=5e3`, `gm=40e-3`, `rpi=2.5e3`, `ro=50e3` |
| Q34 | `q34-cascode` | `cascode` | `gm1=40e-3`, `ro1=50e3`, `gm2=40e-3`, `ro2=50e3`, `RL=10e3` |
| Q35 | `q35-cs-amplifier` | `mosfet-cs` | `kn=2e-3`, `VTN=1`, `VGS=2`, `λ=0.02`, `RD=10e3` |
| Q36 | `q36-diff-pair` | `mosfet-diff-pair` | `gm=5e-3`, `ro=100e3`, `RSS=500e3`, `RD=20e3` |
| Q37 | `q37-source-follower` | `source-follower` | `gm=4e-3`, `ro=40e3`, `RS=5e3`, `RL=10e3` |
| Q38 | `q38-inverting-summer` | `opamp-summer` | `Rf=80e3`, `inputs=[{R:10e3,V:1},{R:20e3,V:-2},{R:40e3,V:0.5}]` |
| Q39 | `q39-diff-amp-cmrr` | `diff-amp-cmrr` | `R1=R2=R3=10e3`, `R4=10e3`, `deltaR4=100` (1% mismatch) |
| Q40 | `q40-sallen-key` | `sallen-key` | `R1=R2=10e3`, `C1=C2=10e-9`, `K=1.586` |
| Q41 | `q41-schmitt-trigger` | `schmitt-trigger` | `R1=10e3`, `R2=90e3`, `Vsat_pos=15`, `Vsat_neg=-15` |
| Q42 | `q42-series-shunt-feedback` | `series-shunt-feedback` | `A=2000`, `Rin=5e3`, `Rout=10e3`, `beta_f=0.04` |
| Q43 | `q43-bode-stability` | `bode-stability` | `L(s)=1000/[(s+1)(s+10)(s+100)]`, poles `[-1,-10,-100]` |
| Q44 | `q44-root-locus` | `root-locus` | `G(s)H(s)=K(s+2)/[s(s+5)(s+10)]`, poles `[0,-5,-10]`, zero `-2` |
| Q45 | `q45-per-unit` | `per-unit` | `Sbase=100MVA`, `zones=[{132kV},{33kV}]`, line `10+j30Ω` in zone 1 |
| Q46 | `q46-ybus` | `ybus-formation` | `nBuses=3`, lines: `y₁₂=1−j3`, `y₁₃=2−j6`, `y₂₃=1.5−j4.5` pu |
| Q47 | `q47-gauss-seidel` | `gauss-seidel-pf` | buses `[slack(1.05∠0°), PV(P=0.4,V=1.02), PQ(P=-0.6,Q=-0.25)]`, Ybus from Q46 |
| Q48 | `q48-symmetrical-fault` | `symmetrical-fault` | `Zbus` 3×3 complex (pu), `Vpre=1.0`, `faultBus=2` |
| Q49 | `q49-nr-jacobian` | `nr-jacobian` | same 3-bus system; Jacobian structure; tolerance `1e-6` |
| Q50 | `q50-integrator-oscillator` | `integrator-oscillator` | `f0=1000Hz`, `C=10e-9`, `nIntegrators=2` |

---

## Design Notes

### Why discriminated union over a flat record

A discriminated union lets TypeScript narrow `params` without any runtime casts.
A solver registry simply matches on `spec.kind`:

```typescript
function solve(spec: EEProblemSpec): Record<string, number> {
  switch (spec.kind) {
    case 'kvl-series-loop': return solveKvlSeriesLoop(spec.params);
    case 'rc-step':         return solveRcStep(spec.params);
    // ...
  }
}
```

### Numeric units convention

All params use **SI base units** unless otherwise noted:
- Resistance: Ω (`number`)
- Capacitance: F (`number`)
- Inductance: H (`number`)
- Frequency: Hz (`number`) for `f_Hz`, rad/s (`number`) for `omega`
- Voltage: V, Current: A, Power: W, VA, VAR
- Power-systems quantities: pu (`number`) except where physical units are stated

### Fields intentionally excluded

`EEProblemSpec` omits everything present in `EEQuestionDef` that is not needed to compute
answers:
- `title`, `slug`, `topic`, `problemStatement` — human display only
- `steps`, `solution`, `solutionSvg` — pedagogical content
- `svg` — circuit diagram markup
- `verified` — expected answers (would cause circular dependency with a solver)
- `difficulty`, `year` — metadata

These remain in `EEQuestionDef` and can be looked up by `id` when needed.
