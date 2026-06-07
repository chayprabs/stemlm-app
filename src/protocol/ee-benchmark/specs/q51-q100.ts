import type { EEBenchmarkEntry } from '../spec-types';
import { buildYbusN } from '../solvers/math-utils';

// Shared 3-bus line data for Q96–Q99 — distinct from Q46–Q49 SHARED_3BUS_LINES.
export const SHARED_3BUS_LINES_Q51 = [
  { from: 1, to: 2, y: { re: 2, im: -5 } },
  { from: 1, to: 3, y: { re: 1, im: -4 } },
  { from: 2, to: 3, y: { re: 0.5, im: -2 } },
] as const;

const YBUS_3BUS_Q51 = buildYbusN(3, [...SHARED_3BUS_LINES_Q51]);

export const EE_SPECS_Q51_Q100: EEBenchmarkEntry[] = [
  // ── Q51 ──────────────────────────────────────────────────────────────────────
  {
    id: 51,
    slug: 'q51-kvl-single-loop',
    title: 'KVL Single Loop',
    year: 1,
    difficulty: 'Easy',
    topic: 'KVL single-loop series circuit',
    problemStatement:
      'A series circuit has $V_s = 18$ V, $R_1 = 3\\,\\Omega$, $R_2 = 8\\,\\Omega$, $R_3 = 4\\,\\Omega$. Find the current and voltage drop across each resistor. Verify KVL.',
    spec: {
      kind: 'kvl-series-loop',
      params: {
        Vs: 18,
        resistors: [
          { label: 'R1', ohms: 3 },
          { label: 'R2', ohms: 8 },
          { label: 'R3', ohms: 4 },
        ],
      },
    },
  },

  // ── Q52 ──────────────────────────────────────────────────────────────────────
  {
    id: 52,
    slug: 'q52-nodal-3-node',
    title: 'Nodal Analysis — 3 Nodes',
    year: 1,
    difficulty: 'Mid',
    topic: 'Nodal analysis three-node circuit',
    problemStatement:
      '40 V at $V_1$, $R=8\\,\\Omega$ between $V_1$–$V_2$, $R=12\\,\\Omega$ between $V_2$–$V_3$, $R=25\\,\\Omega$ $V_2$–ground, $R=18\\,\\Omega$ and $3\\,\\text{A}$ into $V_3$.',
    spec: {
      kind: 'nodal-analysis',
      params: {
        nodeCount: 3,
        fixedVoltages: { 1: 40 },
        resistors: [
          [1, 2, 8],
          [2, 3, 12],
          [2, 0, 25],
          [3, 0, 18],
        ],
        currentSources: [[3, 3]],
      },
    },
  },

  // ── Q53 ──────────────────────────────────────────────────────────────────────
  {
    id: 53,
    slug: 'q53-mesh-3',
    title: 'Mesh Analysis — 3 Meshes',
    year: 1,
    difficulty: 'Mid',
    topic: 'Three-mesh circuit analysis',
    problemStatement:
      'Three clockwise mesh currents $I_1$, $I_2$, $I_3$ with 30 V and 15 V sources and shared resistors.',
    spec: {
      kind: 'mesh-analysis',
      params: {
        meshCount: 3,
        Vs: [30, 0, -15],
        selfZ: [8, 22, 12],
        mutualZ: [
          [1, 2, 5],
          [2, 3, 7],
        ],
      },
    },
  },

  // ── Q54 ──────────────────────────────────────────────────────────────────────
  {
    id: 54,
    slug: 'q54-superposition',
    title: 'Superposition',
    year: 1,
    difficulty: 'Mid',
    topic: 'Superposition theorem',
    problemStatement:
      '$V_s=48\\,\\text{V}$, $I_s=3\\,\\text{A}$, $R_1=12\\,\\Omega$, $R_2=24\\,\\Omega$, $R_3=8\\,\\Omega$. Find $I_{R_3}$.',
    spec: {
      kind: 'superposition',
      params: {
        Vs: 48,
        Is: 3,
        R1: 12,
        R2: 24,
        R3: 8,
        targetBranch: 'R3',
      },
    },
  },

  // ── Q55 ──────────────────────────────────────────────────────────────────────
  {
    id: 55,
    slug: 'q55-thevenin-norton',
    title: 'Thevenin + Norton Equivalents',
    year: 1,
    difficulty: 'Mid',
    topic: 'Thevenin and Norton equivalents',
    problemStatement:
      'Find Thevenin at A–B: $V_s=60\\,\\text{V}$, $R_1=6\\,\\Omega$ series, $R_2=18\\,\\Omega$ parallel, $R_3=9\\,\\Omega$ to A, B grounded.',
    spec: {
      kind: 'thevenin-norton',
      params: {
        Vs: 60,
        R1: 6,
        R2: 18,
        R3: 9,
        terminalLabel: 'A-B',
      },
    },
  },

  // ── Q56 ──────────────────────────────────────────────────────────────────────
  {
    id: 56,
    slug: 'q56-dependent-source',
    title: 'Dependent Source — Nodal',
    year: 1,
    difficulty: 'Tough',
    topic: 'Nodal analysis with VCCS',
    problemStatement:
      '$R_1=8\\,\\Omega$ at $V_1$, $R_2=4\\,\\Omega$ between $V_1$–$V_2$, VCCS $I_d=0.3V_1$ upward at $V_2$, $25\\,\\text{V}$ at $V_1$.',
    spec: {
      kind: 'dependent-source-nodal',
      params: {
        Vs: 25,
        R1: 8,
        R2: 4,
        vccsGain: 0.3,
        controllingNode: 1,
        injectingNode: 2,
      },
    },
  },

  // ── Q57 ──────────────────────────────────────────────────────────────────────
  {
    id: 57,
    slug: 'q57-delta-wye',
    title: 'Delta–Wye Conversion',
    year: 1,
    difficulty: 'Mid',
    topic: 'Delta-Wye transformation',
    problemStatement:
      '$R_{AB}=24\\,\\Omega$, $R_{BC}=48\\,\\Omega$, $R_{CA}=72\\,\\Omega$. Convert to Wye; find current with $120\\,\\text{V}$ across A–C, B floating.',
    spec: {
      kind: 'delta-wye',
      params: {
        Rab: 24,
        Rbc: 48,
        Rca: 72,
        VTest: 120,
        testTerminals: [1, 3],
      },
    },
  },

  // ── Q58 ──────────────────────────────────────────────────────────────────────
  {
    id: 58,
    slug: 'q58-rc-step',
    title: 'RC Step Response',
    year: 1,
    difficulty: 'Easy',
    topic: 'RC step response',
    problemStatement:
      '$R=8\\,\\text{k}\\Omega$, $C=150\\,\\mu\\text{F}$, $9\\,\\text{V}$ step at $t=0$, $v_C(0)=0$.',
    spec: {
      kind: 'rc-step',
      params: {
        R: 8e3,
        C: 150e-6,
        Vs: 9,
        vc0: 0,
      },
    },
  },

  // ── Q59 ──────────────────────────────────────────────────────────────────────
  {
    id: 59,
    slug: 'q59-rl-transient',
    title: 'RL Transient — Switch Opens',
    year: 1,
    difficulty: 'Mid',
    topic: 'RL transient discharge',
    problemStatement:
      '$R=40\\,\\Omega$, $L=150\\,\\text{mH}$, steady state 18 V, then source disconnects and L discharges through $80\\,\\Omega$.',
    spec: {
      kind: 'rl-transient',
      params: {
        R_src: 40,
        L: 0.15,
        Vs: 18,
        R_fw: 80,
      },
    },
  },

  // ── Q60 ──────────────────────────────────────────────────────────────────────
  {
    id: 60,
    slug: 'q60-rlc-overdamped',
    title: 'Series RLC — Overdamped',
    year: 1,
    difficulty: 'Mid',
    topic: 'Overdamped RLC response',
    problemStatement:
      '$R=12\\,\\Omega$, $L=0.8\\,\\text{H}$, $C=0.2\\,\\text{F}$, 15 V step, zero ICs.',
    spec: {
      kind: 'rlc-series-step',
      params: {
        R: 12,
        L: 0.8,
        C: 0.2,
        Vs: 15,
        vc0: 0,
        iL0: 0,
        damping: 'over',
      },
    },
  },

  // ── Q61 ──────────────────────────────────────────────────────────────────────
  {
    id: 61,
    slug: 'q61-rlc-underdamped',
    title: 'Series RLC — Underdamped',
    year: 1,
    difficulty: 'Mid',
    topic: 'Underdamped RLC response',
    problemStatement:
      '$R=3\\,\\Omega$, $L=1.2\\,\\text{H}$, $C=0.4\\,\\text{F}$, 16 V step, zero ICs.',
    spec: {
      kind: 'rlc-series-step',
      params: {
        R: 3,
        L: 1.2,
        C: 0.4,
        Vs: 16,
        vc0: 0,
        iL0: 0,
        damping: 'under',
      },
    },
  },

  // ── Q62 ──────────────────────────────────────────────────────────────────────
  {
    id: 62,
    slug: 'q62-switched-rc',
    title: 'Switched RC — Non-Zero IC',
    year: 1,
    difficulty: 'Tough',
    topic: 'RC with non-zero initial condition',
    problemStatement:
      '$C=22\\,\\mu\\text{F}$ charged to $6\\,\\text{V}$; at $t=0$ connected to $R_1=15\\,\\text{k}\\Omega$, $R_2=25\\,\\text{k}\\Omega$ with $12\\,\\text{V}$ in series with $R_1$.',
    spec: {
      kind: 'rc-nonzero-ic',
      params: {
        R: 15e3,
        R2: 25e3,
        C: 22e-6,
        Vs: 12,
        vc0: 6,
      },
    },
  },

  // ── Q63 ──────────────────────────────────────────────────────────────────────
  {
    id: 63,
    slug: 'q63-series-rlc-impedance',
    title: 'Series RLC — Impedance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Series RLC AC impedance',
    problemStatement:
      '$V_s=100\\angle0°$ V rms, $f=50$ Hz, $R=12\\,\\Omega$, $L=60\\,\\text{mH}$, $C=80\\,\\mu\\text{F}$.',
    spec: {
      kind: 'ac-series-rlc',
      params: {
        Vs_mag: 100,
        Vs_ang_deg: 0,
        f_Hz: 50,
        R: 12,
        L: 60e-3,
        C: 80e-6,
      },
    },
  },

  // ── Q64 ──────────────────────────────────────────────────────────────────────
  {
    id: 64,
    slug: 'q64-parallel-rlc',
    title: 'Parallel RLC — Admittance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Parallel RLC admittance',
    problemStatement:
      '$I_s=4\\angle45°$ A, $\\omega=800$ rad/s, $R=25\\,\\Omega$, $L=30\\,\\text{mH}$, $C=40\\,\\mu\\text{F}$.',
    spec: {
      kind: 'ac-parallel-rlc',
      params: {
        Is_mag: 4,
        Is_ang_deg: 45,
        omega: 800,
        R: 25,
        L: 30e-3,
        C: 40e-6,
      },
    },
  },

  // ── Q65 ──────────────────────────────────────────────────────────────────────
  {
    id: 65,
    slug: 'q65-ac-mesh-dependent',
    title: 'Multi-Mesh AC — Dependent Source',
    year: 2,
    difficulty: 'Tough',
    topic: 'AC mesh with dependent source',
    problemStatement:
      '$\\omega=4000$ rad/s, dependent source $V_d=3I_2R_2$ in mesh 1.',
    spec: {
      kind: 'ac-mesh-dependent',
      params: {
        omega: 4000,
        Vs: 60,
        mesh1Elements: [
          { type: 'series-Z', Z: { re: 12, im: 0 } },
          { type: 'series-RL', R: 0, L: 5e-3, omega: 4000 },
        ],
        mesh2Elements: [
          { type: 'series-RC', R: 0, C: 8e-6, omega: 4000 },
        ],
        depSrcGain: 3,
      },
    },
  },

  // ── Q66 ──────────────────────────────────────────────────────────────────────
  {
    id: 66,
    slug: 'q66-ac-thevenin',
    title: 'AC Thevenin Equivalent',
    year: 2,
    difficulty: 'Mid',
    topic: 'AC Thevenin equivalent',
    problemStatement:
      '$V_s=40\\angle0°$ V, $\\omega=1500$ rad/s, $R_1=8\\,\\Omega$, $L=8\\,\\text{mH}$, $R_2=15\\,\\Omega$, $C=33\\,\\mu\\text{F}$.',
    spec: {
      kind: 'ac-thevenin',
      params: {
        Vs_mag: 40,
        Vs_ang_deg: 0,
        omega: 1500,
        R1: 8,
        L: 8e-3,
        R2: 15,
        C: 33e-6,
        terminalLabel: 'A-B',
      },
    },
  },

  // ── Q67 ──────────────────────────────────────────────────────────────────────
  {
    id: 67,
    slug: 'q67-pf-correction',
    title: 'Power Factor Correction',
    year: 2,
    difficulty: 'Mid',
    topic: 'Power factor correction',
    problemStatement:
      '15 kW at 0.70 lagging PF, 240 V rms, 60 Hz. Correct to 0.92 lagging.',
    spec: {
      kind: 'pf-correction',
      params: {
        P_W: 15e3,
        pf1: 0.7,
        pf2: 0.92,
        V_rms: 240,
        f_Hz: 60,
      },
    },
  },

  // ── Q68 ──────────────────────────────────────────────────────────────────────
  {
    id: 68,
    slug: 'q68-complex-power',
    title: 'Complex Power Balance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Complex power balance',
    problemStatement:
      '$V_s=120\\angle0°$ V, $\\omega=1200$ rad/s, parallel R, L, C branches.',
    spec: {
      kind: 'complex-power-balance',
      params: {
        Vs_mag: 120,
        omega: 1200,
        R: 15,
        L: 25e-3,
        C: 40e-6,
      },
    },
  },

  // ── Q69 ──────────────────────────────────────────────────────────────────────
  {
    id: 69,
    slug: 'q69-series-resonance',
    title: 'Series Resonance',
    year: 2,
    difficulty: 'Easy',
    topic: 'Series resonance',
    problemStatement:
      '$R=8\\,\\Omega$, $L=15\\,\\text{mH}$, $C=30\\,\\mu\\text{F}$.',
    spec: {
      kind: 'series-resonance',
      params: {
        R: 8,
        L: 15e-3,
        C: 30e-6,
      },
    },
  },

  // ── Q70 ──────────────────────────────────────────────────────────────────────
  {
    id: 70,
    slug: 'q70-parallel-resonance',
    title: 'Parallel Resonance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Parallel resonance',
    problemStatement:
      '$R=40\\,\\text{k}\\Omega$, $L=0.8\\,\\text{mH}$, $C=150\\,\\text{pF}$, $I_s=3\\,\\text{mA}$.',
    spec: {
      kind: 'parallel-resonance',
      params: {
        R: 40e3,
        L: 0.8e-3,
        C: 150e-12,
        Is: 3e-3,
      },
    },
  },

  // ── Q71 ──────────────────────────────────────────────────────────────────────
  {
    id: 71,
    slug: 'q71-bode-plot',
    title: 'Bode Plot — Two Poles, One Zero',
    year: 2,
    difficulty: 'Tough',
    topic: 'Bode plot analysis',
    problemStatement:
      '$H(s)=\\frac{500(s+200)}{s(s+20)(s+500)}$.',
    spec: {
      kind: 'bode-plot',
      params: {
        H_s: '500*(s+200) / (s*(s+20)*(s+500))',
        gain: 500,
        poles: [0, -20, -500],
        zeros: [-200],
        evalAt_omega: 200,
      },
    },
  },

  // ── Q72 ──────────────────────────────────────────────────────────────────────
  {
    id: 72,
    slug: 'q72-bandpass-filter',
    title: 'Passive Band-Pass Filter',
    year: 2,
    difficulty: 'Mid',
    topic: 'Band-pass filter',
    problemStatement:
      'Series RLC BPF across R: $R=80\\,\\Omega$, $L=8\\,\\text{mH}$, $C=2\\,\\mu\\text{F}$.',
    spec: {
      kind: 'bandpass-filter',
      params: {
        R: 80,
        L: 8e-3,
        C: 2e-6,
        topology: 'series-RLC-across-R',
      },
    },
  },

  // ── Q73 ──────────────────────────────────────────────────────────────────────
  {
    id: 73,
    slug: 'q73-z-parameters',
    title: 'Z-Parameters — T Network',
    year: 2,
    difficulty: 'Mid',
    topic: 'Z-parameters T-network',
    problemStatement:
      'T-network: $Z_a=15\\,\\Omega$, $Z_b=25\\,\\Omega$, $Z_c=35\\,\\Omega$.',
    spec: {
      kind: 'z-parameters',
      params: {
        Za: 15,
        Zb: 25,
        Zc: 35,
        topology: 'T',
      },
    },
  },

  // ── Q74 ──────────────────────────────────────────────────────────────────────
  {
    id: 74,
    slug: 'q74-abcd-cascade',
    title: 'ABCD Matrix — Ladder Cascade',
    year: 2,
    difficulty: 'Tough',
    topic: 'ABCD matrix cascade',
    problemStatement:
      '$Z_1=j12\\,\\Omega$, $Y_2=j0.04\\,\\text{S}$, $Z_3=8+j6\\,\\Omega$, $Z_s=12\\,\\Omega$, $Z_L=40\\,\\Omega$.',
    spec: {
      kind: 'abcd-cascade',
      params: {
        sections: [
          { type: 'series-Z', Z: { re: 0,  im: 12  } },
          { type: 'shunt-Y',  Y: { re: 0,  im: 0.04 } },
          { type: 'series-Z', Z: { re: 8,  im: 6   } },
        ],
        Zs: { re: 12, im: 0 },
        ZL: { re: 40, im: 0 },
      },
    },
  },

  // ── Q75 ──────────────────────────────────────────────────────────────────────
  {
    id: 75,
    slug: 'q75-two-port-gain',
    title: 'Two-Port Transfer Function',
    year: 2,
    difficulty: 'Tough',
    topic: 'Two-port voltage gain',
    problemStatement:
      '$Z_{11}=25\\,\\Omega$, $Z_{12}=Z_{21}=12\\,\\Omega$, $Z_{22}=35\\,\\Omega$, $V_s=80\\,\\text{V}$, $Z_s=8\\,\\Omega$, $Z_L=30\\,\\Omega$.',
    spec: {
      kind: 'two-port-gain',
      params: {
        Z11: 25,
        Z12: 12,
        Z22: 35,
        Vs: 80,
        Zs: 8,
        ZL: 30,
      },
    },
  },

  // ── Q76 ──────────────────────────────────────────────────────────────────────
  {
    id: 76,
    slug: 'q76-mutual-inductance',
    title: 'Mutual Inductance — Dot Convention',
    year: 2,
    difficulty: 'Mid',
    topic: 'Mutual inductance',
    problemStatement:
      '$L_1=6\\,\\text{H}$, $L_2=12\\,\\text{H}$, $M=4\\,\\text{H}$, $V_s=80\\angle0°$ V, $\\omega=20$ rad/s, coil 2 open.',
    spec: {
      kind: 'mutual-inductance',
      params: {
        L1: 6,
        L2: 12,
        M: 4,
        Vs_mag: 80,
        omega: 20,
        port2Open: true,
      },
    },
  },

  // ── Q77 ──────────────────────────────────────────────────────────────────────
  {
    id: 77,
    slug: 'q77-ideal-transformer',
    title: 'Ideal Transformer — Impedance Reflection',
    year: 2,
    difficulty: 'Mid',
    topic: 'Ideal transformer',
    problemStatement:
      '$n=3:1$, $V_s=180$ V rms, $Z_s=3\\,\\Omega$, $Z_L=12\\,\\Omega$.',
    spec: {
      kind: 'ideal-transformer',
      params: {
        n: 3,
        Vs: 180,
        Zs: 3,
        ZL: 12,
      },
    },
  },

  // ── Q78 ──────────────────────────────────────────────────────────────────────
  {
    id: 78,
    slug: 'q78-balanced-yy',
    title: 'Balanced Y-Y System',
    year: 2,
    difficulty: 'Easy',
    topic: 'Balanced Y-Y three-phase',
    problemStatement:
      'Line voltage 380 V rms, $Z_{ph}=12+j10\\,\\Omega$.',
    spec: {
      kind: 'three-phase-yy',
      params: {
        VL_rms: 380,
        Z_ph: { re: 12, im: 10 },
      },
    },
  },

  // ── Q79 ──────────────────────────────────────────────────────────────────────
  {
    id: 79,
    slug: 'q79-balanced-yd',
    title: 'Balanced Y-Δ System',
    year: 2,
    difficulty: 'Mid',
    topic: 'Balanced Y-Delta three-phase',
    problemStatement:
      'Y source 240 V line, $\\Delta$ load $Z_\\Delta=24+j32\\,\\Omega$ per phase.',
    spec: {
      kind: 'three-phase-yd',
      params: {
        VL_rms: 240,
        Z_delta: { re: 24, im: 32 },
      },
    },
  },

  // ── Q80 ──────────────────────────────────────────────────────────────────────
  {
    id: 80,
    slug: 'q80-two-wattmeter',
    title: 'Two-Wattmeter Method',
    year: 2,
    difficulty: 'Mid',
    topic: 'Two-wattmeter method',
    problemStatement:
      '$W_1=5.2\\,\\text{kW}$, $W_2=2.8\\,\\text{kW}$.',
    spec: {
      kind: 'two-wattmeter',
      params: {
        W1: 5200,
        W2: 2800,
      },
    },
  },

  // ── Q81 ──────────────────────────────────────────────────────────────────────
  {
    id: 81,
    slug: 'q81-ce-amplifier',
    title: 'CE Amplifier — Hybrid-π Midband',
    year: 3,
    difficulty: 'Mid',
    topic: 'BJT CE hybrid-pi midband',
    problemStatement:
      '$I_C=1.5\\,\\text{mA}$, $\\beta=120$, $V_A=100\\,\\text{V}$, $R_C=6\\,\\text{k}\\Omega$, $R_S=2\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'bjt-ce-amplifier',
      params: {
        IC: 1.5e-3,
        beta: 120,
        VA: 100,
        RC: 6e3,
        RS: 2e3,
      },
    },
  },

  // ── Q82 ──────────────────────────────────────────────────────────────────────
  {
    id: 82,
    slug: 'q82-miller-bandwidth',
    title: 'Miller Approximation — Bandwidth',
    year: 3,
    difficulty: 'Mid',
    topic: 'Miller effect bandwidth',
    problemStatement:
      'Same BJT as Q81 with $C_\\pi=20\\,\\text{pF}$, $C_\\mu=3\\,\\text{pF}$.',
    spec: {
      kind: 'miller-bandwidth',
      params: {
        bjt: {
          IC: 1.5e-3,
          beta: 120,
          VA: 100,
          RC: 6e3,
          RS: 2e3,
        },
        Cpi: 20e-12,
        Cmu: 3e-12,
      },
    },
  },

  // ── Q83 ──────────────────────────────────────────────────────────────────────
  {
    id: 83,
    slug: 'q83-emitter-degeneration',
    title: 'Emitter Degeneration',
    year: 3,
    difficulty: 'Mid',
    topic: 'Emitter degeneration',
    problemStatement:
      '$R_E=400\\,\\Omega$ unbypassed, $R_C=4\\,\\text{k}\\Omega$, $g_m=50\\,\\text{mA/V}$, $r_\\pi=2\\,\\text{k}\\Omega$, $r_o=60\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'emitter-degeneration',
      params: {
        RE: 400,
        RC: 4e3,
        gm: 50e-3,
        rpi: 2e3,
        ro: 60e3,
      },
    },
  },

  // ── Q84 ──────────────────────────────────────────────────────────────────────
  {
    id: 84,
    slug: 'q84-cascode',
    title: 'Cascode Amplifier',
    year: 3,
    difficulty: 'Tough',
    topic: 'Cascode amplifier',
    problemStatement:
      'CE ($g_{m1}=50\\,\\text{mA/V}$, $r_{o1}=60\\,\\text{k}\\Omega$) + CB ($g_{m2}=50\\,\\text{mA/V}$, $r_{o2}=60\\,\\text{k}\\Omega$), $R_L=8\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'cascode',
      params: {
        gm1: 50e-3,
        ro1: 60e3,
        gm2: 50e-3,
        ro2: 60e3,
        RL: 8e3,
      },
    },
  },

  // ── Q85 ──────────────────────────────────────────────────────────────────────
  {
    id: 85,
    slug: 'q85-cs-amplifier',
    title: 'CS Amplifier — Small-Signal',
    year: 3,
    difficulty: 'Mid',
    topic: 'MOSFET CS amplifier',
    problemStatement:
      '$k_n=1.5\\,\\text{mA/V}^2$, $V_{TN}=0.8\\,\\text{V}$, $V_{GS}=2.5\\,\\text{V}$, $\\lambda=0.015\\,\\text{V}^{-1}$, $R_D=8\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'mosfet-cs',
      params: {
        kn: 1.5e-3,
        VTN: 0.8,
        VGS: 2.5,
        lambda: 0.015,
        RD: 8e3,
      },
    },
  },

  // ── Q86 ──────────────────────────────────────────────────────────────────────
  {
    id: 86,
    slug: 'q86-diff-pair',
    title: 'MOSFET Differential Pair',
    year: 3,
    difficulty: 'Tough',
    topic: 'MOSFET differential pair',
    problemStatement:
      '$g_m=4\\,\\text{mA/V}$, $r_o=80\\,\\text{k}\\Omega$, $R_{SS}=400\\,\\text{k}\\Omega$, $R_D=15\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'mosfet-diff-pair',
      params: {
        gm: 4e-3,
        ro: 80e3,
        RSS: 400e3,
        RD: 15e3,
      },
    },
  },

  // ── Q87 ──────────────────────────────────────────────────────────────────────
  {
    id: 87,
    slug: 'q87-source-follower',
    title: 'Source Follower (CD)',
    year: 3,
    difficulty: 'Easy',
    topic: 'MOSFET source follower',
    problemStatement:
      '$g_m=5\\,\\text{mA/V}$, $r_o=50\\,\\text{k}\\Omega$, $R_S=4\\,\\text{k}\\Omega$, $R_L=8\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'source-follower',
      params: {
        gm: 5e-3,
        ro: 50e3,
        RS: 4e3,
        RL: 8e3,
      },
    },
  },

  // ── Q88 ──────────────────────────────────────────────────────────────────────
  {
    id: 88,
    slug: 'q88-inverting-summer',
    title: 'Inverting Summing Amplifier',
    year: 3,
    difficulty: 'Mid',
    topic: 'Op-amp inverting summer',
    problemStatement:
      '$R_1=8\\,\\text{k}\\Omega$, $R_2=16\\,\\text{k}\\Omega$, $R_3=32\\,\\text{k}\\Omega$, $R_f=60\\,\\text{k}\\Omega$. $V_1=2\\,\\text{V}$, $V_2=-1.5\\,\\text{V}$, $V_3=0.8\\,\\text{V}$.',
    spec: {
      kind: 'opamp-summer',
      params: {
        Rf: 60e3,
        inputs: [
          { R: 8e3, V: 2 },
          { R: 16e3, V: -1.5 },
          { R: 32e3, V: 0.8 },
        ],
      },
    },
  },

  // ── Q89 ──────────────────────────────────────────────────────────────────────
  {
    id: 89,
    slug: 'q89-diff-amp-cmrr',
    title: 'Difference Amplifier — CMRR with Mismatch',
    year: 3,
    difficulty: 'Mid',
    topic: 'Difference amp CMRR mismatch',
    problemStatement:
      'Ideal: $R_1=R_2=R_3=R_4=8\\,\\text{k}\\Omega$. Mismatch: $R_4=8.08\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'diff-amp-cmrr',
      params: {
        R1: 8e3,
        R2: 8e3,
        R3: 8e3,
        R4: 8e3,
        deltaR4: 80,
      },
    },
  },

  // ── Q90 ──────────────────────────────────────────────────────────────────────
  {
    id: 90,
    slug: 'q90-sallen-key',
    title: 'Sallen-Key Low-Pass Filter',
    year: 3,
    difficulty: 'Tough',
    topic: 'Sallen-Key Butterworth LPF',
    problemStatement:
      '$R_1=R_2=15\\,\\text{k}\\Omega$, $C_1=C_2=8\\,\\text{nF}$, $K=1.414$.',
    spec: {
      kind: 'sallen-key',
      params: {
        R1: 15e3,
        R2: 15e3,
        C1: 8e-9,
        C2: 8e-9,
        K: 1.414,
      },
    },
  },

  // ── Q91 ──────────────────────────────────────────────────────────────────────
  {
    id: 91,
    slug: 'q91-schmitt-trigger',
    title: 'Schmitt Trigger',
    year: 3,
    difficulty: 'Mid',
    topic: 'Schmitt trigger hysteresis',
    problemStatement:
      'Non-inverting: $R_1=12\\,\\text{k}\\Omega$, $R_2=68\\,\\text{k}\\Omega$, $\\pm12\\,\\text{V}$ rails.',
    spec: {
      kind: 'schmitt-trigger',
      params: {
        R1: 12e3,
        R2: 68e3,
        Vsat_pos: 12,
        Vsat_neg: -12,
      },
    },
  },

  // ── Q92 ──────────────────────────────────────────────────────────────────────
  {
    id: 92,
    slug: 'q92-series-shunt-feedback',
    title: 'Series-Shunt Feedback',
    year: 3,
    difficulty: 'Mid',
    topic: 'Series-shunt feedback',
    problemStatement:
      '$A=1500$, $R_{in}=4\\,\\text{k}\\Omega$, $R_{out}=8\\,\\text{k}\\Omega$, $\\beta_f=0.05$.',
    spec: {
      kind: 'series-shunt-feedback',
      params: {
        A: 1500,
        Rin: 4e3,
        Rout: 8e3,
        beta_f: 0.05,
      },
    },
  },

  // ── Q93 ──────────────────────────────────────────────────────────────────────
  {
    id: 93,
    slug: 'q93-bode-stability',
    title: 'Bode Stability — Gain and Phase Margin',
    year: 3,
    difficulty: 'Mid',
    topic: 'Bode stability margins',
    problemStatement:
      '$L(s)=\\frac{800}{(s+2)(s+20)(s+200)}$.',
    spec: {
      kind: 'bode-stability',
      params: {
        L_s: '800 / ((s+2)*(s+20)*(s+200))',
        poles: [-2, -20, -200],
        zeros: [],
        gain: 800,
      },
    },
  },

  // ── Q94 ──────────────────────────────────────────────────────────────────────
  {
    id: 94,
    slug: 'q94-root-locus',
    title: 'Root Locus — Sketch',
    year: 3,
    difficulty: 'Tough',
    topic: 'Root locus analysis',
    problemStatement:
      '$G(s)H(s)=\\frac{K(s+4)}{s(s+8)(s+15)}$.',
    spec: {
      kind: 'root-locus',
      params: {
        GH_s: 'K*(s+4) / (s*(s+8)*(s+15))',
        openLoopPoles: [0, -8, -15],
        openLoopZeros: [-4],
        gain_symbol: 'K',
      },
    },
  },

  // ── Q95 ──────────────────────────────────────────────────────────────────────
  {
    id: 95,
    slug: 'q95-per-unit',
    title: 'Per-Unit Conversion',
    year: 3,
    difficulty: 'Mid',
    topic: 'Per-unit system',
    problemStatement:
      'Base 50 MVA, 220 kV (zone 1), transformer 220/66 kV.',
    spec: {
      kind: 'per-unit',
      params: {
        Sbase_MVA: 50,
        zones: [{ Vbase_kV: 220 }, { Vbase_kV: 66 }],
        lineImpedances: [[0, 15, 45]],
      },
    },
  },

  // ── Q96 ──────────────────────────────────────────────────────────────────────
  {
    id: 96,
    slug: 'q96-ybus',
    title: 'Ybus Formation',
    year: 3,
    difficulty: 'Mid',
    topic: 'Ybus matrix formation',
    problemStatement:
      '$y_{12}=2-j5$, $y_{13}=1-j4$, $y_{23}=0.5-j2$ pu. No shunts.',
    spec: {
      kind: 'ybus-formation',
      params: {
        nBuses: 3,
        lines: [...SHARED_3BUS_LINES_Q51],
      },
    },
  },

  // ── Q97 ──────────────────────────────────────────────────────────────────────
  {
    id: 97,
    slug: 'q97-gauss-seidel',
    title: 'Gauss–Seidel Power Flow — 3 Bus',
    year: 3,
    difficulty: 'Tough',
    topic: 'Gauss-Seidel power flow',
    problemStatement:
      'Slack bus 1 ($1.04\\angle0°$), PV bus 2 ($P=0.35$, $V=1.01$), PQ bus 3 ($P=-0.5$, $Q=-0.2$). Ybus from Q96.',
    spec: {
      kind: 'gauss-seidel-pf',
      params: {
        buses: [
          { id: 1, type: 'slack', V_mag: 1.04, V_ang_deg: 0 },
          { id: 2, type: 'PV',    P: 0.35, V_mag: 1.01 },
          { id: 3, type: 'PQ',    P: -0.5, Q: -0.2 },
        ],
        Ybus: YBUS_3BUS_Q51,
        maxIter: 100,
        tolerance: 1e-6,
      },
    },
  },

  // ── Q98 ──────────────────────────────────────────────────────────────────────
  {
    id: 98,
    slug: 'q98-symmetrical-fault',
    title: 'Symmetrical 3-Phase Fault',
    year: 3,
    difficulty: 'Tough',
    topic: 'Symmetrical fault analysis',
    problemStatement:
      '3-bus network from Q96, pre-fault $V=1.02\\angle0°$ pu, 3-phase fault at bus 3.',
    spec: {
      kind: 'symmetrical-fault',
      params: {
        nBuses: 3,
        lines: [...SHARED_3BUS_LINES_Q51],
        Vpre: 1.02,
        faultBus: 3,
      },
    },
  },

  // ── Q99 ──────────────────────────────────────────────────────────────────────
  {
    id: 99,
    slug: 'q99-nr-jacobian',
    title: 'Newton–Raphson Power Flow — Jacobian',
    year: 3,
    difficulty: 'Tough',
    topic: 'Newton-Raphson power flow',
    problemStatement:
      'Same 3-bus system as Q97. Write mismatch equations and Jacobian structure.',
    spec: {
      kind: 'nr-jacobian',
      params: {
        buses: [
          { id: 1, type: 'slack', V_mag: 1.04, V_ang_deg: 0 },
          { id: 2, type: 'PV',    P: 0.35, V_mag: 1.01 },
          { id: 3, type: 'PQ',    P: -0.5, Q: -0.2 },
        ],
        Ybus: YBUS_3BUS_Q51,
        maxIter: 50,
        tolerance: 1e-6,
      },
    },
  },

  // ── Q100 ─────────────────────────────────────────────────────────────────────
  {
    id: 100,
    slug: 'q100-integrator-oscillator',
    title: 'Integrator-Based Oscillator',
    year: 3,
    difficulty: 'Tough',
    topic: 'Op-amp integrator oscillator',
    problemStatement:
      'Sinusoidal oscillator at $f_0=500\\,\\text{Hz}$ using two ideal op-amp integrators.',
    spec: {
      kind: 'integrator-oscillator',
      params: {
        f0: 500,
        C: 22e-9,
        nIntegrators: 2,
      },
    },
  },
];
