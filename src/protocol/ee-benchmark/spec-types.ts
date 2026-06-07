// ── Primitives ─────────────────────────────────────────────────────────────────

/** Complex number in rectangular form (real + j·imag). */
export interface Complex {
  re: number;
  im: number;
}

/** Resistor/impedance component for multi-element lists. */
export interface ResistorEntry {
  label: string;
  ohms: number;
}

/** Three-phase line admittance entry (pu or physical). */
export interface LineEntry {
  from: number;
  to: number;
  y: Complex;
}

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
  V_mag?: number;
  V_ang_deg?: number;
  P?: number;
  Q?: number;
}

export interface KvlSeriesLoopParams {
  Vs: number;
  resistors: ResistorEntry[];
}

export interface NodalAnalysisParams {
  nodeCount: number;
  fixedVoltages: Record<number, number>;
  resistors: [number, number, number][];
  currentSources?: [number, number][];
}

export interface MeshAnalysisParams {
  meshCount: number;
  Vs: number[];
  selfZ: number[];
  mutualZ: [number, number, number][];
}

export interface SuperpositionParams {
  Vs: number;
  Is: number;
  R1: number; R2: number; R3: number;
  targetBranch: 'R3';
}

export interface TheveninNortonParams {
  Vs: number;
  R1: number; R2: number; R3: number;
  terminalLabel: string;
}

export interface DependentSourceNodalParams {
  Vs: number;
  R1: number; R2: number;
  vccsGain: number;
  controllingNode: number;
  injectingNode: number;
}

export interface DeltaWyeParams {
  Rab: number; Rbc: number; Rca: number;
  VTest: number;
  testTerminals: [1 | 2 | 3, 1 | 2 | 3];
}

export interface RcStepParams {
  R: number;
  C: number;
  Vs: number;
  vc0: number;
}

export interface RlTransientParams {
  R_src: number;
  L: number;
  Vs: number;
  R_fw: number;
}

export interface RlcSeriesStepParams {
  R: number; L: number; C: number;
  Vs: number;
  vc0: number;
  iL0: number;
  damping: 'over' | 'under' | 'critical';
}

export interface RcNonzeroIcParams extends RcStepParams {
  R2: number;
}

export interface AcSeriesRlcParams {
  Vs_mag: number; Vs_ang_deg: number;
  f_Hz: number;
  R: number; L: number; C: number;
}

export interface AcParallelRlcParams {
  Is_mag: number; Is_ang_deg: number;
  omega: number;
  R: number; L: number; C: number;
}

export interface AcMeshDependentParams {
  omega: number;
  Vs: number;
  mesh1Elements: ABCDSection[];
  mesh2Elements: ABCDSection[];
  depSrcGain: number;
}

export interface AcTheveninParams {
  Vs_mag: number; Vs_ang_deg: number;
  omega: number;
  R1: number; L: number; R2: number; C: number;
  terminalLabel: string;
}

export interface PfCorrectionParams {
  P_W: number;
  pf1: number;
  pf2: number;
  V_rms: number;
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
  Is: number;
}

export interface BodePlotParams {
  H_s: string;
  gain: number;
  poles: number[];
  zeros: number[];
  evalAt_omega?: number;
}

export interface BandpassFilterParams {
  R: number; L: number; C: number;
  topology: 'series-RLC-across-R';
}

export interface ZParametersParams {
  Za: number | Complex;
  Zb: number | Complex;
  Zc: number | Complex;
  topology: 'T' | 'Pi';
}

export interface AbcdCascadeParams {
  sections: ABCDSection[];
  Zs: Complex;
  ZL: Complex;
}

export interface TwoPortGainParams {
  Z11: number; Z12: number; Z22: number;
  Vs: number;
  Zs: number;
  ZL: number;
}

export interface MutualInductanceParams {
  L1: number; L2: number; M: number;
  Vs_mag: number;
  omega: number;
  port2Open: boolean;
}

export interface IdealTransformerParams {
  n: number;
  Vs: number;
  Zs: number;
  ZL: number;
}

export interface ThreePhaseYYParams {
  VL_rms: number;
  Z_ph: Complex;
}

export interface ThreePhaseYDParams {
  VL_rms: number;
  Z_delta: Complex;
}

export interface TwoWattmeterParams {
  W1: number;
  W2: number;
}

export interface BjtCeAmplifierParams {
  IC: number;
  beta: number;
  VA: number;
  RC: number;
  RS: number;
}

export interface MillerBandwidthParams {
  Av: number;
  Cpi: number;
  Cmu: number;
  RS: number;
  rpi: number;
}

export interface EmitterDegenerationParams {
  RE: number;
  RC: number;
  gm: number;
  rpi: number;
  ro: number;
}

export interface CascodeParams {
  gm1: number; ro1: number;
  gm2: number; ro2: number;
  RL: number;
}

export interface MosfetCsParams {
  kn: number;
  VTN: number;
  VGS: number;
  lambda: number;
  RD: number;
}

export interface MosfetDiffPairParams {
  gm: number;
  ro: number;
  RSS: number;
  RD: number;
}

export interface SourceFollowerParams {
  gm: number;
  ro: number;
  RS: number;
  RL: number;
}

export interface OpampSummerParams {
  Rf: number;
  inputs: { R: number; V: number }[];
}

export interface DiffAmpCmrrParams {
  R1: number; R2: number; R3: number; R4: number;
  deltaR4: number;
}

export interface SallenKeyParams {
  R1: number; R2: number;
  C1: number; C2: number;
  K: number;
}

export interface SchmittTriggerParams {
  R1: number;
  R2: number;
  Vsat_pos: number;
  Vsat_neg: number;
}

export interface SeriesShuntFeedbackParams {
  A: number;
  Rin: number;
  Rout: number;
  beta_f: number;
}

export interface BodeStabilityParams {
  L_s: string;
  poles: number[];
  zeros: number[];
  gain: number;
}

export interface RootLocusParams {
  GH_s: string;
  openLoopPoles: number[];
  openLoopZeros: number[];
  gain_symbol: 'K';
}

export interface IntegratorOscillatorParams {
  f0: number;
  C: number;
  nIntegrators: 2;
}

export interface PerUnitParams {
  Sbase_MVA: number;
  zones: { Vbase_kV: number }[];
  lineImpedances: [number, number, number][];
}

export interface YbusFormationParams {
  nBuses: number;
  lines: LineEntry[];
  shunts?: Record<number, Complex>;
}

export interface GaussSeidelPfParams {
  buses: PFBus[];
  Ybus: Complex[][];
  maxIter: number;
  tolerance: number;
}

export interface SymmetricalFaultParams {
  Zbus: Complex[][];
  Vpre: number;
  faultBus: number;
}

export interface NrJacobianParams {
  buses: PFBus[];
  Ybus: Complex[][];
  maxIter: number;
  tolerance: number;
}

export type EEProblemSpec =
  | { kind: 'kvl-series-loop';         params: KvlSeriesLoopParams }
  | { kind: 'nodal-analysis';          params: NodalAnalysisParams }
  | { kind: 'mesh-analysis';           params: MeshAnalysisParams }
  | { kind: 'superposition';           params: SuperpositionParams }
  | { kind: 'thevenin-norton';         params: TheveninNortonParams }
  | { kind: 'dependent-source-nodal';  params: DependentSourceNodalParams }
  | { kind: 'delta-wye';               params: DeltaWyeParams }
  | { kind: 'rc-step';                 params: RcStepParams }
  | { kind: 'rl-transient';            params: RlTransientParams }
  | { kind: 'rlc-series-step';         params: RlcSeriesStepParams }
  | { kind: 'rc-nonzero-ic';           params: RcNonzeroIcParams }
  | { kind: 'ac-series-rlc';           params: AcSeriesRlcParams }
  | { kind: 'ac-parallel-rlc';         params: AcParallelRlcParams }
  | { kind: 'ac-mesh-dependent';       params: AcMeshDependentParams }
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
  | { kind: 'mosfet-cs';               params: MosfetCsParams }
  | { kind: 'mosfet-diff-pair';        params: MosfetDiffPairParams }
  | { kind: 'source-follower';         params: SourceFollowerParams }
  | { kind: 'opamp-summer';            params: OpampSummerParams }
  | { kind: 'diff-amp-cmrr';           params: DiffAmpCmrrParams }
  | { kind: 'sallen-key';              params: SallenKeyParams }
  | { kind: 'schmitt-trigger';         params: SchmittTriggerParams }
  | { kind: 'series-shunt-feedback';   params: SeriesShuntFeedbackParams }
  | { kind: 'bode-stability';          params: BodeStabilityParams }
  | { kind: 'root-locus';              params: RootLocusParams }
  | { kind: 'per-unit';                params: PerUnitParams }
  | { kind: 'ybus-formation';          params: YbusFormationParams }
  | { kind: 'gauss-seidel-pf';         params: GaussSeidelPfParams }
  | { kind: 'symmetrical-fault';       params: SymmetricalFaultParams }
  | { kind: 'nr-jacobian';             params: NrJacobianParams }
  | { kind: 'integrator-oscillator';   params: IntegratorOscillatorParams };

export type EEDifficulty = 'Easy' | 'Mid' | 'Tough';

export interface EEBenchmarkEntry {
  id: number;
  slug: string;
  title: string;
  year: 1 | 2 | 3;
  difficulty: EEDifficulty;
  topic: string;
  problemStatement: string;
  spec: EEProblemSpec;
}

// ── Solver output types ────────────────────────────────────────────────────────

/** One derivation step hint returned by the solver. */
export interface SolutionStep {
  /** Key equation for this step (LaTeX-ready string). */
  formula: string;
  /** Plain-text explanation. */
  explanation: string;
}

/**
 * Structured solution returned by solve(spec).
 * computed: all numerically derived quantities keyed by their standard symbol.
 * steps: ordered derivation hints for diagram labels and step synthesis.
 */
export interface EESolution {
  kind: string;
  computed: Record<string, number>;
  steps: SolutionStep[];
}
