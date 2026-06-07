/** Auto-synced from ee-benchmark/specs/q51-q100.ts — questions only, no answers. */
import type { ElectricalPromptDef } from './types';

export const ELECTRICAL_PROMPTS_Q51_100: ElectricalPromptDef[] = [
  {
    "id": "q51-kvl-single-loop",
    "number": 51,
    "topic": "KVL single-loop series circuit",
    "question": "A series circuit has $V_s = 18$ V, $R_1 = 3\\,\\Omega$, $R_2 = 8\\,\\Omega$, $R_3 = 4\\,\\Omega$. Find the current and voltage drop across each resistor. Verify KVL."
  },
  {
    "id": "q52-nodal-3-node",
    "number": 52,
    "topic": "Nodal analysis three-node circuit",
    "question": "40 V at $V_1$, $R=8\\,\\Omega$ between $V_1$–$V_2$, $R=12\\,\\Omega$ between $V_2$–$V_3$, $R=25\\,\\Omega$ $V_2$–ground, $R=18\\,\\Omega$ and $3\\,\\text{A}$ into $V_3$."
  },
  {
    "id": "q53-mesh-3",
    "number": 53,
    "topic": "Three-mesh circuit analysis",
    "question": "Three clockwise mesh currents $I_1$, $I_2$, $I_3$ with 30 V and 15 V sources and shared resistors."
  },
  {
    "id": "q54-superposition",
    "number": 54,
    "topic": "Superposition theorem",
    "question": "$V_s=48\\,\\text{V}$, $I_s=3\\,\\text{A}$, $R_1=12\\,\\Omega$, $R_2=24\\,\\Omega$, $R_3=8\\,\\Omega$. Find $I_{R_3}$."
  },
  {
    "id": "q55-thevenin-norton",
    "number": 55,
    "topic": "Thevenin and Norton equivalents",
    "question": "Find Thevenin at A–B: $V_s=60\\,\\text{V}$, $R_1=6\\,\\Omega$ series, $R_2=18\\,\\Omega$ parallel, $R_3=9\\,\\Omega$ to A, B grounded."
  },
  {
    "id": "q56-dependent-source",
    "number": 56,
    "topic": "Nodal analysis with VCCS",
    "question": "$R_1=8\\,\\Omega$ at $V_1$, $R_2=4\\,\\Omega$ between $V_1$–$V_2$, VCCS $I_d=0.3V_1$ upward at $V_2$, $25\\,\\text{V}$ at $V_1$."
  },
  {
    "id": "q57-delta-wye",
    "number": 57,
    "topic": "Delta-Wye transformation",
    "question": "$R_{AB}=24\\,\\Omega$, $R_{BC}=48\\,\\Omega$, $R_{CA}=72\\,\\Omega$. Convert to Wye; find current with $120\\,\\text{V}$ across A–C, B floating."
  },
  {
    "id": "q58-rc-step",
    "number": 58,
    "topic": "RC step response",
    "question": "$R=8\\,\\text{k}\\Omega$, $C=150\\,\\mu\\text{F}$, $9\\,\\text{V}$ step at $t=0$, $v_C(0)=0$."
  },
  {
    "id": "q59-rl-transient",
    "number": 59,
    "topic": "RL transient discharge",
    "question": "$R=40\\,\\Omega$, $L=150\\,\\text{mH}$, steady state 18 V, then source disconnects and L discharges through $80\\,\\Omega$."
  },
  {
    "id": "q60-rlc-overdamped",
    "number": 60,
    "topic": "Overdamped RLC response",
    "question": "$R=12\\,\\Omega$, $L=0.8\\,\\text{H}$, $C=0.2\\,\\text{F}$, 15 V step, zero ICs."
  },
  {
    "id": "q61-rlc-underdamped",
    "number": 61,
    "topic": "Underdamped RLC response",
    "question": "$R=3\\,\\Omega$, $L=1.2\\,\\text{H}$, $C=0.4\\,\\text{F}$, 16 V step, zero ICs."
  },
  {
    "id": "q62-switched-rc",
    "number": 62,
    "topic": "RC with non-zero initial condition",
    "question": "$C=22\\,\\mu\\text{F}$ charged to $6\\,\\text{V}$; at $t=0$ connected to $R_1=15\\,\\text{k}\\Omega$, $R_2=25\\,\\text{k}\\Omega$ with $12\\,\\text{V}$ in series with $R_1$."
  },
  {
    "id": "q63-series-rlc-impedance",
    "number": 63,
    "topic": "Series RLC AC impedance",
    "question": "$V_s=100\\angle0°$ V rms, $f=50$ Hz, $R=12\\,\\Omega$, $L=60\\,\\text{mH}$, $C=80\\,\\mu\\text{F}$."
  },
  {
    "id": "q64-parallel-rlc",
    "number": 64,
    "topic": "Parallel RLC admittance",
    "question": "$I_s=4\\angle45°$ A, $\\omega=800$ rad/s, $R=25\\,\\Omega$, $L=30\\,\\text{mH}$, $C=40\\,\\mu\\text{F}$."
  },
  {
    "id": "q65-ac-mesh-dependent",
    "number": 65,
    "topic": "AC mesh with dependent source",
    "question": "$\\omega=4000$ rad/s, dependent source $V_d=3I_2R_2$ in mesh 1."
  },
  {
    "id": "q66-ac-thevenin",
    "number": 66,
    "topic": "AC Thevenin equivalent",
    "question": "$V_s=40\\angle0°$ V, $\\omega=1500$ rad/s, $R_1=8\\,\\Omega$, $L=8\\,\\text{mH}$, $R_2=15\\,\\Omega$, $C=33\\,\\mu\\text{F}$."
  },
  {
    "id": "q67-pf-correction",
    "number": 67,
    "topic": "Power factor correction",
    "question": "15 kW at 0.70 lagging PF, 240 V rms, 60 Hz. Correct to 0.92 lagging."
  },
  {
    "id": "q68-complex-power",
    "number": 68,
    "topic": "Complex power balance",
    "question": "$V_s=120\\angle0°$ V, $\\omega=1200$ rad/s, parallel R, L, C branches."
  },
  {
    "id": "q69-series-resonance",
    "number": 69,
    "topic": "Series resonance",
    "question": "$R=8\\,\\Omega$, $L=15\\,\\text{mH}$, $C=30\\,\\mu\\text{F}$."
  },
  {
    "id": "q70-parallel-resonance",
    "number": 70,
    "topic": "Parallel resonance",
    "question": "$R=40\\,\\text{k}\\Omega$, $L=0.8\\,\\text{mH}$, $C=150\\,\\text{pF}$, $I_s=3\\,\\text{mA}$."
  },
  {
    "id": "q71-bode-plot",
    "number": 71,
    "topic": "Bode plot analysis",
    "question": "$H(s)=\\frac{500(s+200)}{s(s+20)(s+500)}$."
  },
  {
    "id": "q72-bandpass-filter",
    "number": 72,
    "topic": "Band-pass filter",
    "question": "Series RLC BPF across R: $R=80\\,\\Omega$, $L=8\\,\\text{mH}$, $C=2\\,\\mu\\text{F}$."
  },
  {
    "id": "q73-z-parameters",
    "number": 73,
    "topic": "Z-parameters T-network",
    "question": "T-network: $Z_a=15\\,\\Omega$, $Z_b=25\\,\\Omega$, $Z_c=35\\,\\Omega$."
  },
  {
    "id": "q74-abcd-cascade",
    "number": 74,
    "topic": "ABCD matrix cascade",
    "question": "$Z_1=j12\\,\\Omega$, $Y_2=j0.04\\,\\text{S}$, $Z_3=8+j6\\,\\Omega$, $Z_s=12\\,\\Omega$, $Z_L=40\\,\\Omega$."
  },
  {
    "id": "q75-two-port-gain",
    "number": 75,
    "topic": "Two-port voltage gain",
    "question": "$Z_{11}=25\\,\\Omega$, $Z_{12}=Z_{21}=12\\,\\Omega$, $Z_{22}=35\\,\\Omega$, $V_s=80\\,\\text{V}$, $Z_s=8\\,\\Omega$, $Z_L=30\\,\\Omega$."
  },
  {
    "id": "q76-mutual-inductance",
    "number": 76,
    "topic": "Mutual inductance",
    "question": "$L_1=6\\,\\text{H}$, $L_2=12\\,\\text{H}$, $M=4\\,\\text{H}$, $V_s=80\\angle0°$ V, $\\omega=20$ rad/s, coil 2 open."
  },
  {
    "id": "q77-ideal-transformer",
    "number": 77,
    "topic": "Ideal transformer",
    "question": "$n=3:1$, $V_s=180$ V rms, $Z_s=3\\,\\Omega$, $Z_L=12\\,\\Omega$."
  },
  {
    "id": "q78-balanced-yy",
    "number": 78,
    "topic": "Balanced Y-Y three-phase",
    "question": "Line voltage 380 V rms, $Z_{ph}=12+j10\\,\\Omega$."
  },
  {
    "id": "q79-balanced-yd",
    "number": 79,
    "topic": "Balanced Y-Delta three-phase",
    "question": "Y source 240 V line, $\\Delta$ load $Z_\\Delta=24+j32\\,\\Omega$ per phase."
  },
  {
    "id": "q80-two-wattmeter",
    "number": 80,
    "topic": "Two-wattmeter method",
    "question": "$W_1=5.2\\,\\text{kW}$, $W_2=2.8\\,\\text{kW}$."
  },
  {
    "id": "q81-ce-amplifier",
    "number": 81,
    "topic": "BJT CE hybrid-pi midband",
    "question": "$I_C=1.5\\,\\text{mA}$, $\\beta=120$, $V_A=100\\,\\text{V}$, $R_C=6\\,\\text{k}\\Omega$, $R_S=2\\,\\text{k}\\Omega$."
  },
  {
    "id": "q82-miller-bandwidth",
    "number": 82,
    "topic": "Miller effect bandwidth",
    "question": "Same BJT as Q81 with $C_\\pi=20\\,\\text{pF}$, $C_\\mu=3\\,\\text{pF}$."
  },
  {
    "id": "q83-emitter-degeneration",
    "number": 83,
    "topic": "Emitter degeneration",
    "question": "$R_E=400\\,\\Omega$ unbypassed, $R_C=4\\,\\text{k}\\Omega$, $g_m=50\\,\\text{mA/V}$, $r_\\pi=2\\,\\text{k}\\Omega$, $r_o=60\\,\\text{k}\\Omega$."
  },
  {
    "id": "q84-cascode",
    "number": 84,
    "topic": "Cascode amplifier",
    "question": "CE ($g_{m1}=50\\,\\text{mA/V}$, $r_{o1}=60\\,\\text{k}\\Omega$) + CB ($g_{m2}=50\\,\\text{mA/V}$, $r_{o2}=60\\,\\text{k}\\Omega$), $R_L=8\\,\\text{k}\\Omega$."
  },
  {
    "id": "q85-cs-amplifier",
    "number": 85,
    "topic": "MOSFET CS amplifier",
    "question": "$k_n=1.5\\,\\text{mA/V}^2$, $V_{TN}=0.8\\,\\text{V}$, $V_{GS}=2.5\\,\\text{V}$, $\\lambda=0.015\\,\\text{V}^{-1}$, $R_D=8\\,\\text{k}\\Omega$."
  },
  {
    "id": "q86-diff-pair",
    "number": 86,
    "topic": "MOSFET differential pair",
    "question": "$g_m=4\\,\\text{mA/V}$, $r_o=80\\,\\text{k}\\Omega$, $R_{SS}=400\\,\\text{k}\\Omega$, $R_D=15\\,\\text{k}\\Omega$."
  },
  {
    "id": "q87-source-follower",
    "number": 87,
    "topic": "MOSFET source follower",
    "question": "$g_m=5\\,\\text{mA/V}$, $r_o=50\\,\\text{k}\\Omega$, $R_S=4\\,\\text{k}\\Omega$, $R_L=8\\,\\text{k}\\Omega$."
  },
  {
    "id": "q88-inverting-summer",
    "number": 88,
    "topic": "Op-amp inverting summer",
    "question": "$R_1=8\\,\\text{k}\\Omega$, $R_2=16\\,\\text{k}\\Omega$, $R_3=32\\,\\text{k}\\Omega$, $R_f=60\\,\\text{k}\\Omega$. $V_1=2\\,\\text{V}$, $V_2=-1.5\\,\\text{V}$, $V_3=0.8\\,\\text{V}$."
  },
  {
    "id": "q89-diff-amp-cmrr",
    "number": 89,
    "topic": "Difference amp CMRR mismatch",
    "question": "Ideal: $R_1=R_2=R_3=R_4=8\\,\\text{k}\\Omega$. Mismatch: $R_4=8.08\\,\\text{k}\\Omega$."
  },
  {
    "id": "q90-sallen-key",
    "number": 90,
    "topic": "Sallen-Key Butterworth LPF",
    "question": "$R_1=R_2=15\\,\\text{k}\\Omega$, $C_1=C_2=8\\,\\text{nF}$, $K=1.414$."
  },
  {
    "id": "q91-schmitt-trigger",
    "number": 91,
    "topic": "Schmitt trigger hysteresis",
    "question": "Non-inverting: $R_1=12\\,\\text{k}\\Omega$, $R_2=68\\,\\text{k}\\Omega$, $\\pm12\\,\\text{V}$ rails."
  },
  {
    "id": "q92-series-shunt-feedback",
    "number": 92,
    "topic": "Series-shunt feedback",
    "question": "$A=1500$, $R_{in}=4\\,\\text{k}\\Omega$, $R_{out}=8\\,\\text{k}\\Omega$, $\\beta_f=0.05$."
  },
  {
    "id": "q93-bode-stability",
    "number": 93,
    "topic": "Bode stability margins",
    "question": "$L(s)=\\frac{800}{(s+2)(s+20)(s+200)}$."
  },
  {
    "id": "q94-root-locus",
    "number": 94,
    "topic": "Root locus analysis",
    "question": "$G(s)H(s)=\\frac{K(s+4)}{s(s+8)(s+15)}$."
  },
  {
    "id": "q95-per-unit",
    "number": 95,
    "topic": "Per-unit system",
    "question": "Base 50 MVA, 220 kV (zone 1), transformer 220/66 kV."
  },
  {
    "id": "q96-ybus",
    "number": 96,
    "topic": "Ybus matrix formation",
    "question": "$y_{12}=2-j5$, $y_{13}=1-j4$, $y_{23}=0.5-j2$ pu. No shunts."
  },
  {
    "id": "q97-gauss-seidel",
    "number": 97,
    "topic": "Gauss-Seidel power flow",
    "question": "Slack bus 1 ($1.04\\angle0°$), PV bus 2 ($P=0.35$, $V=1.01$), PQ bus 3 ($P=-0.5$, $Q=-0.2$). Ybus from Q96."
  },
  {
    "id": "q98-symmetrical-fault",
    "number": 98,
    "topic": "Symmetrical fault analysis",
    "question": "3-bus network from Q96, pre-fault $V=1.02\\angle0°$ pu, 3-phase fault at bus 3."
  },
  {
    "id": "q99-nr-jacobian",
    "number": 99,
    "topic": "Newton-Raphson power flow",
    "question": "Same 3-bus system as Q97. Write mismatch equations and Jacobian structure."
  },
  {
    "id": "q100-integrator-oscillator",
    "number": 100,
    "topic": "Op-amp integrator oscillator",
    "question": "Sinusoidal oscillator at $f_0=500\\,\\text{Hz}$ using two ideal op-amp integrators."
  }
] as ElectricalPromptDef[];
