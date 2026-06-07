/** Electrical exam prompts — questions only; solutions/diagrams come from Gemini at runtime. */
import type { ElectricalPromptDef } from './types';
import { ELECTRICAL_PROMPTS_Q51_100 } from './prompts-q51-100';

const ELECTRICAL_PROMPTS_Q01_50: ElectricalPromptDef[] = [
  {
    "id": "q01-kvl-single-loop",
    "number": 1,
    "topic": "KVL single-loop series circuit",
    "question": "A series circuit has $V_s = 24$ V, $R_1 = 4\\,\\Omega$, $R_2 = 6\\,\\Omega$, $R_3 = 2\\,\\Omega$. Find the current and voltage drop across each resistor. Verify KVL."
  },
  {
    "id": "q02-nodal-3-node",
    "number": 2,
    "topic": "Nodal analysis three-node circuit",
    "question": "30 V at $V_1$, $R=5\\,\\Omega$ between $V_1$–$V_2$, $R=10\\,\\Omega$ between $V_2$–$V_3$, $R=20\\,\\Omega$ $V_2$–ground, $R=15\\,\\Omega$ and $2\\,\\text{A}$ into $V_3$."
  },
  {
    "id": "q03-mesh-3",
    "number": 3,
    "topic": "Three-mesh circuit analysis",
    "question": "Three clockwise mesh currents $I_1$, $I_2$, $I_3$ with 20 V and 10 V sources and shared resistors."
  },
  {
    "id": "q04-superposition",
    "number": 4,
    "topic": "Superposition theorem",
    "question": "$V_s=36\\,\\text{V}$, $I_s=4\\,\\text{A}$, $R_1=9\\,\\Omega$, $R_2=18\\,\\Omega$, $R_3=6\\,\\Omega$. Find $I_{R_3}$."
  },
  {
    "id": "q05-thevenin-norton",
    "number": 5,
    "topic": "Thevenin and Norton equivalents",
    "question": "Find Thevenin at A–B: $V_s=48\\,\\text{V}$, $R_1=8\\,\\Omega$ series, $R_2=24\\,\\Omega$ parallel, $R_3=12\\,\\Omega$ to A, B grounded."
  },
  {
    "id": "q06-dependent-source",
    "number": 6,
    "topic": "Nodal analysis with VCCS",
    "question": "$R_1=10\\,\\Omega$ at $V_1$, $R_2=5\\,\\Omega$ between $V_1$–$V_2$, VCCS $I_d=0.4V_1$ upward at $V_2$, $20\\,\\text{V}$ at $V_1$."
  },
  {
    "id": "q07-delta-wye",
    "number": 7,
    "topic": "Delta-Wye transformation",
    "question": "$R_{AB}=30\\,\\Omega$, $R_{BC}=60\\,\\Omega$, $R_{CA}=90\\,\\Omega$. Convert to Wye; find current with $100\\,\\text{V}$ across A–C, B floating."
  },
  {
    "id": "q08-rc-step",
    "number": 8,
    "topic": "RC step response",
    "question": "$R=10\\,\\text{k}\\Omega$, $C=100\\,\\mu\\text{F}$, $12\\,\\text{V}$ step at $t=0$, $v_C(0)=0$."
  },
  {
    "id": "q09-rl-transient",
    "number": 9,
    "topic": "RL transient discharge",
    "question": "$R=50\\,\\Omega$, $L=200\\,\\text{mH}$, steady state 24 V, then source disconnects and L discharges through $100\\,\\Omega$."
  },
  {
    "id": "q10-rlc-overdamped",
    "number": 10,
    "topic": "Overdamped RLC response",
    "question": "$R=8\\,\\Omega$, $L=1\\,\\text{H}$, $C=0.25\\,\\text{F}$, 10 V step, zero ICs."
  },
  {
    "id": "q11-rlc-underdamped",
    "number": 11,
    "topic": "Underdamped RLC response",
    "question": "$R=2\\,\\Omega$, $L=1\\,\\text{H}$, $C=0.5\\,\\text{F}$, 20 V step, zero ICs."
  },
  {
    "id": "q12-switched-rc",
    "number": 12,
    "topic": "RC with non-zero initial condition",
    "question": "$C=10\\,\\mu\\text{F}$ charged to $8\\,\\text{V}$; at $t=0$ connected to $R_1=20\\,\\text{k}\\Omega$, $R_2=30\\,\\text{k}\\Omega$ with $15\\,\\text{V}$ in series with $R_1$."
  },
  {
    "id": "q13-series-rlc-impedance",
    "number": 13,
    "topic": "Series RLC AC impedance",
    "question": "$V_s=120\\angle0°$ V rms, $f=60$ Hz, $R=10\\,\\Omega$, $L=50\\,\\text{mH}$, $C=100\\,\\mu\\text{F}$."
  },
  {
    "id": "q14-parallel-rlc",
    "number": 14,
    "topic": "Parallel RLC admittance",
    "question": "$I_s=5\\angle30°$ A, $\\omega=1000$ rad/s, $R=20\\,\\Omega$, $L=40\\,\\text{mH}$, $C=50\\,\\mu\\text{F}$."
  },
  {
    "id": "q15-ac-mesh-dependent",
    "number": 15,
    "topic": "AC mesh with dependent source",
    "question": "$\\omega=5000$ rad/s, dependent source $V_d=4I_2R_2$ in mesh 1."
  },
  {
    "id": "q16-ac-thevenin",
    "number": 16,
    "topic": "AC Thevenin equivalent",
    "question": "$V_s=50\\angle0°$ V, $\\omega=2000$ rad/s, $R_1=10\\,\\Omega$, $L=5\\,\\text{mH}$, $R_2=20\\,\\Omega$, $C=25\\,\\mu\\text{F}$."
  },
  {
    "id": "q17-pf-correction",
    "number": 17,
    "topic": "Power factor correction",
    "question": "10 kW at 0.65 lagging PF, 230 V rms, 50 Hz. Correct to 0.95 lagging."
  },
  {
    "id": "q18-complex-power",
    "number": 18,
    "topic": "Complex power balance",
    "question": "$V_s=100\\angle0°$ V, $\\omega=1000$ rad/s, parallel R, L, C branches."
  },
  {
    "id": "q19-series-resonance",
    "number": 19,
    "topic": "Series resonance",
    "question": "$R=5\\,\\Omega$, $L=10\\,\\text{mH}$, $C=40\\,\\mu\\text{F}$."
  },
  {
    "id": "q20-parallel-resonance",
    "number": 20,
    "topic": "Parallel resonance",
    "question": "$R=50\\,\\text{k}\\Omega$, $L=0.5\\,\\text{mH}$, $C=200\\,\\text{pF}$, $I_s=2\\,\\text{mA}$."
  },
  {
    "id": "q21-bode-plot",
    "number": 21,
    "topic": "Bode plot analysis",
    "question": "$H(s)=\\frac{1000(s+100)}{s(s+10)(s+1000)}$."
  },
  {
    "id": "q22-bandpass-filter",
    "number": 22,
    "topic": "Band-pass filter",
    "question": "Series RLC BPF across R: $R=100\\,\\Omega$, $L=10\\,\\text{mH}$, $C=1\\,\\mu\\text{F}$."
  },
  {
    "id": "q23-z-parameters",
    "number": 23,
    "topic": "Z-parameters T-network",
    "question": "T-network: $Z_a=10\\,\\Omega$, $Z_b=20\\,\\Omega$, $Z_c=30\\,\\Omega$."
  },
  {
    "id": "q24-abcd-cascade",
    "number": 24,
    "topic": "ABCD matrix cascade",
    "question": "$Z_1=j10\\,\\Omega$, $Y_2=j0.05\\,\\text{S}$, $Z_3=5+j5\\,\\Omega$, $Z_s=10\\,\\Omega$, $Z_L=50\\,\\Omega$."
  },
  {
    "id": "q25-two-port-gain",
    "number": 25,
    "topic": "Two-port voltage gain",
    "question": "$Z_{11}=20\\,\\Omega$, $Z_{12}=Z_{21}=10\\,\\Omega$, $Z_{22}=30\\,\\Omega$, $V_s=100\\,\\text{V}$, $Z_s=5\\,\\Omega$, $Z_L=25\\,\\Omega$."
  },
  {
    "id": "q26-mutual-inductance",
    "number": 26,
    "topic": "Mutual inductance",
    "question": "$L_1=4\\,\\text{H}$, $L_2=9\\,\\text{H}$, $M=3\\,\\text{H}$, $V_s=100\\angle0°$ V, $\\omega=10$ rad/s, coil 2 open."
  },
  {
    "id": "q27-ideal-transformer",
    "number": 27,
    "topic": "Ideal transformer",
    "question": "$n=5:1$, $V_s=240$ V rms, $Z_s=2\\,\\Omega$, $Z_L=8\\,\\Omega$."
  },
  {
    "id": "q28-balanced-yy",
    "number": 28,
    "topic": "Balanced Y-Y three-phase",
    "question": "Line voltage 415 V rms, $Z_{ph}=10+j8\\,\\Omega$."
  },
  {
    "id": "q29-balanced-yd",
    "number": 29,
    "topic": "Balanced Y-Delta three-phase",
    "question": "Y source 208 V line, $\\Delta$ load $Z_\\Delta=30+j40\\,\\Omega$ per phase."
  },
  {
    "id": "q30-two-wattmeter",
    "number": 30,
    "topic": "Two-wattmeter method",
    "question": "$W_1=4.5\\,\\text{kW}$, $W_2=1.5\\,\\text{kW}$."
  },
  {
    "id": "q31-ce-amplifier",
    "number": 31,
    "topic": "BJT CE hybrid-pi midband",
    "question": "$I_C=2\\,\\text{mA}$, $\\beta=100$, $V_A=80\\,\\text{V}$, $R_C=5\\,\\text{k}\\Omega$, $R_S=1\\,\\text{k}\\Omega$."
  },
  {
    "id": "q32-miller-bandwidth",
    "number": 32,
    "topic": "Miller effect bandwidth",
    "question": "Same BJT as Q31 with $C_\\pi=15\\,\\text{pF}$, $C_\\mu=2\\,\\text{pF}$."
  },
  {
    "id": "q33-emitter-degeneration",
    "number": 33,
    "topic": "Emitter degeneration",
    "question": "$R_E=500\\,\\Omega$ unbypassed, $R_C=5\\,\\text{k}\\Omega$, $g_m=40\\,\\text{mA/V}$, $r_\\pi=2.5\\,\\text{k}\\Omega$, $r_o=50\\,\\text{k}\\Omega$."
  },
  {
    "id": "q34-cascode",
    "number": 34,
    "topic": "Cascode amplifier",
    "question": "CE ($g_{m1}=40\\,\\text{mA/V}$, $r_{o1}=50\\,\\text{k}\\Omega$) + CB ($g_{m2}=40\\,\\text{mA/V}$, $r_{o2}=50\\,\\text{k}\\Omega$), $R_L=10\\,\\text{k}\\Omega$."
  },
  {
    "id": "q35-cs-amplifier",
    "number": 35,
    "topic": "MOSFET CS amplifier",
    "question": "$k_n=2\\,\\text{mA/V}^2$, $V_{TN}=1\\,\\text{V}$, $V_{GS}=2\\,\\text{V}$, $\\lambda=0.02\\,\\text{V}^{-1}$, $R_D=10\\,\\text{k}\\Omega$."
  },
  {
    "id": "q36-diff-pair",
    "number": 36,
    "topic": "MOSFET differential pair",
    "question": "$g_m=5\\,\\text{mA/V}$, $r_o=100\\,\\text{k}\\Omega$, $R_{SS}=500\\,\\text{k}\\Omega$, $R_D=20\\,\\text{k}\\Omega$."
  },
  {
    "id": "q37-source-follower",
    "number": 37,
    "topic": "MOSFET source follower",
    "question": "$g_m=4\\,\\text{mA/V}$, $r_o=40\\,\\text{k}\\Omega$, $R_S=5\\,\\text{k}\\Omega$, $R_L=10\\,\\text{k}\\Omega$."
  },
  {
    "id": "q38-inverting-summer",
    "number": 38,
    "topic": "Op-amp inverting summer",
    "question": "$R_1=10\\,\\text{k}\\Omega$, $R_2=20\\,\\text{k}\\Omega$, $R_3=40\\,\\text{k}\\Omega$, $R_f=80\\,\\text{k}\\Omega$. $V_1=1\\,\\text{V}$, $V_2=-2\\,\\text{V}$, $V_3=0.5\\,\\text{V}$."
  },
  {
    "id": "q39-diff-amp-cmrr",
    "number": 39,
    "topic": "Difference amp CMRR mismatch",
    "question": "Ideal: $R_1=R_2=R_3=R_4=10\\,\\text{k}\\Omega$. Mismatch: $R_4=10.1\\,\\text{k}\\Omega$."
  },
  {
    "id": "q40-sallen-key",
    "number": 40,
    "topic": "Sallen-Key Butterworth LPF",
    "question": "$R_1=R_2=10\\,\\text{k}\\Omega$, $C_1=C_2=10\\,\\text{nF}$, $K=1.586$."
  },
  {
    "id": "q41-schmitt-trigger",
    "number": 41,
    "topic": "Schmitt trigger hysteresis",
    "question": "Non-inverting: $R_1=10\\,\\text{k}\\Omega$, $R_2=90\\,\\text{k}\\Omega$, $\\pm15\\,\\text{V}$ rails."
  },
  {
    "id": "q42-series-shunt-feedback",
    "number": 42,
    "topic": "Series-shunt feedback",
    "question": "$A=2000$, $R_{in}=5\\,\\text{k}\\Omega$, $R_{out}=10\\,\\text{k}\\Omega$, $\\beta_f=0.04$."
  },
  {
    "id": "q43-bode-stability",
    "number": 43,
    "topic": "Bode stability margins",
    "question": "$L(s)=\\frac{1000}{(s+1)(s+10)(s+100)}$."
  },
  {
    "id": "q44-root-locus",
    "number": 44,
    "topic": "Root locus analysis",
    "question": "$G(s)H(s)=\\frac{K(s+2)}{s(s+5)(s+10)}$."
  },
  {
    "id": "q45-per-unit",
    "number": 45,
    "topic": "Per-unit system",
    "question": "Base 100 MVA, 132 kV (zone 1), transformer 132/33 kV."
  },
  {
    "id": "q46-ybus",
    "number": 46,
    "topic": "Ybus matrix formation",
    "question": "$y_{12}=1-j3$, $y_{13}=2-j6$, $y_{23}=1.5-j4.5$ pu. No shunts."
  },
  {
    "id": "q47-gauss-seidel",
    "number": 47,
    "topic": "Gauss-Seidel power flow",
    "question": "Slack bus 1 (1.05u22200°), PV bus 2 (P=0.4, V=1.02), PQ bus 3 (P=-0.6, Q=-0.25). Ybus from Q46."
  },
  {
    "id": "q48-symmetrical-fault",
    "number": 48,
    "topic": "Symmetrical fault analysis",
    "question": "$Z_{bus}$ given, pre-fault $V=1.0\\angle0°$ pu, 3-phase fault at bus 2."
  },
  {
    "id": "q49-nr-jacobian",
    "number": 49,
    "topic": "Newton-Raphson power flow",
    "question": "Same 3-bus system as Q47. Write mismatch equations and Jacobian structure."
  },
  {
    "id": "q50-integrator-oscillator",
    "number": 50,
    "topic": "Op-amp integrator oscillator",
    "question": "Sinusoidal oscillator at $f_0=1\\,\\text{kHz}$ using two ideal op-amp integrators."
  }
];

export const ELECTRICAL_PROMPTS: ElectricalPromptDef[] = [
  ...ELECTRICAL_PROMPTS_Q01_50,
  ...ELECTRICAL_PROMPTS_Q51_100,
];

export function getElectricalPromptByNumber(n: number): ElectricalPromptDef | undefined {
  return ELECTRICAL_PROMPTS.find((q) => q.number === n);
}
