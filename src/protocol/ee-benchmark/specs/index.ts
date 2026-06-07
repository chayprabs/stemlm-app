import type { EEBenchmarkEntry } from '../spec-types';

// Shared Ybus for Q46/Q47/Q48/Q49 (3-bus system, pu admittances)
const YBUS_3BUS = [
  [{ re: 3, im: -9 },    { re: -1, im: 3 },    { re: -2, im: 6 }],
  [{ re: -1, im: 3 },    { re: 2.5, im: -7.5 }, { re: -1.5, im: 4.5 }],
  [{ re: -2, im: 6 },    { re: -1.5, im: 4.5 }, { re: 3.5, im: -10.5 }],
];

// Zbus derived from Q46 Ybus (pu, purely reactive for lossless network)
const ZBUS_3BUS = [
  [{ re: 0, im: 0.12 }, { re: 0, im: 0.08 }, { re: 0, im: 0.05 }],
  [{ re: 0, im: 0.08 }, { re: 0, im: 0.15 }, { re: 0, im: 0.07 }],
  [{ re: 0, im: 0.05 }, { re: 0, im: 0.07 }, { re: 0, im: 0.18 }],
];

export const ALL_EE_SPECS: EEBenchmarkEntry[] = [
  // ── Q01 ──────────────────────────────────────────────────────────────────────
  {
    id: 1,
    slug: 'q01-kvl-single-loop',
    title: 'KVL Single Loop',
    year: 1,
    difficulty: 'Easy',
    topic: 'KVL single-loop series circuit',
    problemStatement:
      'A series circuit has $V_s = 24$ V, $R_1 = 4\\,\\Omega$, $R_2 = 6\\,\\Omega$, $R_3 = 2\\,\\Omega$. Find the current and voltage drop across each resistor. Verify KVL.',
    spec: {
      kind: 'kvl-series-loop',
      params: {
        Vs: 24,
        resistors: [
          { label: 'R1', ohms: 4 },
          { label: 'R2', ohms: 6 },
          { label: 'R3', ohms: 2 },
        ],
      },
    },
  },

  // ── Q02 ──────────────────────────────────────────────────────────────────────
  {
    id: 2,
    slug: 'q02-nodal-3-node',
    title: 'Nodal Analysis — 3 Nodes',
    year: 1,
    difficulty: 'Mid',
    topic: 'Nodal analysis three-node circuit',
    problemStatement:
      '30 V at $V_1$, $R=5\\,\\Omega$ between $V_1$–$V_2$, $R=10\\,\\Omega$ between $V_2$–$V_3$, $R=20\\,\\Omega$ $V_2$–ground, $R=15\\,\\Omega$ and $2\\,\\text{A}$ into $V_3$.',
    spec: {
      kind: 'nodal-analysis',
      params: {
        nodeCount: 3,
        fixedVoltages: { 1: 30 },
        resistors: [
          [1, 2, 5],
          [2, 3, 10],
          [2, 0, 20],
          [3, 0, 15],
        ],
        currentSources: [[3, 2]],
      },
    },
  },

  // ── Q03 ──────────────────────────────────────────────────────────────────────
  {
    id: 3,
    slug: 'q03-mesh-3',
    title: 'Mesh Analysis — 3 Meshes',
    year: 1,
    difficulty: 'Mid',
    topic: 'Three-mesh circuit analysis',
    problemStatement:
      'Three clockwise mesh currents $I_1$, $I_2$, $I_3$ with 20 V and 10 V sources and shared resistors.',
    spec: {
      kind: 'mesh-analysis',
      params: {
        meshCount: 3,
        Vs: [20, 0, -10],
        selfZ: [6, 18, 9],
        mutualZ: [
          [1, 2, 4],
          [2, 3, 6],
        ],
      },
    },
  },

  // ── Q04 ──────────────────────────────────────────────────────────────────────
  {
    id: 4,
    slug: 'q04-superposition',
    title: 'Superposition',
    year: 1,
    difficulty: 'Mid',
    topic: 'Superposition theorem',
    problemStatement:
      '$V_s=36\\,\\text{V}$, $I_s=4\\,\\text{A}$, $R_1=9\\,\\Omega$, $R_2=18\\,\\Omega$, $R_3=6\\,\\Omega$. Find $I_{R_3}$.',
    spec: {
      kind: 'superposition',
      params: {
        Vs: 36,
        Is: 4,
        R1: 9,
        R2: 18,
        R3: 6,
        targetBranch: 'R3',
      },
    },
  },

  // ── Q05 ──────────────────────────────────────────────────────────────────────
  {
    id: 5,
    slug: 'q05-thevenin-norton',
    title: 'Thevenin + Norton Equivalents',
    year: 1,
    difficulty: 'Mid',
    topic: 'Thevenin and Norton equivalents',
    problemStatement:
      'Find Thevenin at A–B: $V_s=48\\,\\text{V}$, $R_1=8\\,\\Omega$ series, $R_2=24\\,\\Omega$ parallel, $R_3=12\\,\\Omega$ to A, B grounded.',
    spec: {
      kind: 'thevenin-norton',
      params: {
        Vs: 48,
        R1: 8,
        R2: 24,
        R3: 12,
        terminalLabel: 'A-B',
      },
    },
  },

  // ── Q06 ──────────────────────────────────────────────────────────────────────
  {
    id: 6,
    slug: 'q06-dependent-source',
    title: 'Dependent Source — Nodal',
    year: 1,
    difficulty: 'Tough',
    topic: 'Nodal analysis with VCCS',
    problemStatement:
      '$R_1=10\\,\\Omega$ at $V_1$, $R_2=5\\,\\Omega$ between $V_1$–$V_2$, VCCS $I_d=0.4V_1$ upward at $V_2$, $20\\,\\text{V}$ at $V_1$.',
    spec: {
      kind: 'dependent-source-nodal',
      params: {
        Vs: 20,
        R1: 10,
        R2: 5,
        vccsGain: 0.4,
        controllingNode: 1,
        injectingNode: 2,
      },
    },
  },

  // ── Q07 ──────────────────────────────────────────────────────────────────────
  {
    id: 7,
    slug: 'q07-delta-wye',
    title: 'Delta–Wye Conversion',
    year: 1,
    difficulty: 'Mid',
    topic: 'Delta-Wye transformation',
    problemStatement:
      '$R_{AB}=30\\,\\Omega$, $R_{BC}=60\\,\\Omega$, $R_{CA}=90\\,\\Omega$. Convert to Wye; find current with $100\\,\\text{V}$ across A–C, B floating.',
    spec: {
      kind: 'delta-wye',
      params: {
        Rab: 30,
        Rbc: 60,
        Rca: 90,
        VTest: 100,
        testTerminals: [1, 3],
      },
    },
  },

  // ── Q08 ──────────────────────────────────────────────────────────────────────
  {
    id: 8,
    slug: 'q08-rc-step',
    title: 'RC Step Response',
    year: 1,
    difficulty: 'Easy',
    topic: 'RC step response',
    problemStatement:
      '$R=10\\,\\text{k}\\Omega$, $C=100\\,\\mu\\text{F}$, $12\\,\\text{V}$ step at $t=0$, $v_C(0)=0$.',
    spec: {
      kind: 'rc-step',
      params: {
        R: 10e3,
        C: 100e-6,
        Vs: 12,
        vc0: 0,
      },
    },
  },

  // ── Q09 ──────────────────────────────────────────────────────────────────────
  {
    id: 9,
    slug: 'q09-rl-transient',
    title: 'RL Transient — Switch Opens',
    year: 1,
    difficulty: 'Mid',
    topic: 'RL transient discharge',
    problemStatement:
      '$R=50\\,\\Omega$, $L=200\\,\\text{mH}$, steady state 24 V, then source disconnects and L discharges through $100\\,\\Omega$.',
    spec: {
      kind: 'rl-transient',
      params: {
        R_src: 50,
        L: 0.2,
        Vs: 24,
        R_fw: 100,
      },
    },
  },

  // ── Q10 ──────────────────────────────────────────────────────────────────────
  {
    id: 10,
    slug: 'q10-rlc-overdamped',
    title: 'Series RLC — Overdamped',
    year: 1,
    difficulty: 'Mid',
    topic: 'Overdamped RLC response',
    problemStatement:
      '$R=8\\,\\Omega$, $L=1\\,\\text{H}$, $C=0.25\\,\\text{F}$, 10 V step, zero ICs.',
    spec: {
      kind: 'rlc-series-step',
      params: {
        R: 8,
        L: 1,
        C: 0.25,
        Vs: 10,
        vc0: 0,
        iL0: 0,
        damping: 'over',
      },
    },
  },

  // ── Q11 ──────────────────────────────────────────────────────────────────────
  {
    id: 11,
    slug: 'q11-rlc-underdamped',
    title: 'Series RLC — Underdamped',
    year: 1,
    difficulty: 'Mid',
    topic: 'Underdamped RLC response',
    problemStatement:
      '$R=2\\,\\Omega$, $L=1\\,\\text{H}$, $C=0.5\\,\\text{F}$, 20 V step, zero ICs.',
    spec: {
      kind: 'rlc-series-step',
      params: {
        R: 2,
        L: 1,
        C: 0.5,
        Vs: 20,
        vc0: 0,
        iL0: 0,
        damping: 'under',
      },
    },
  },

  // ── Q12 ──────────────────────────────────────────────────────────────────────
  {
    id: 12,
    slug: 'q12-switched-rc',
    title: 'Switched RC — Non-Zero IC',
    year: 1,
    difficulty: 'Tough',
    topic: 'RC with non-zero initial condition',
    problemStatement:
      '$C=10\\,\\mu\\text{F}$ charged to $8\\,\\text{V}$; at $t=0$ connected to $R_1=20\\,\\text{k}\\Omega$, $R_2=30\\,\\text{k}\\Omega$ with $15\\,\\text{V}$ in series with $R_1$.',
    spec: {
      kind: 'rc-nonzero-ic',
      params: {
        R: 20e3,
        R2: 30e3,
        C: 10e-6,
        Vs: 15,
        vc0: 8,
      },
    },
  },

  // ── Q13 ──────────────────────────────────────────────────────────────────────
  {
    id: 13,
    slug: 'q13-series-rlc-impedance',
    title: 'Series RLC — Impedance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Series RLC AC impedance',
    problemStatement:
      '$V_s=120\\angle0°$ V rms, $f=60$ Hz, $R=10\\,\\Omega$, $L=50\\,\\text{mH}$, $C=100\\,\\mu\\text{F}$.',
    spec: {
      kind: 'ac-series-rlc',
      params: {
        Vs_mag: 120,
        Vs_ang_deg: 0,
        f_Hz: 60,
        R: 10,
        L: 50e-3,
        C: 100e-6,
      },
    },
  },

  // ── Q14 ──────────────────────────────────────────────────────────────────────
  {
    id: 14,
    slug: 'q14-parallel-rlc',
    title: 'Parallel RLC — Admittance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Parallel RLC admittance',
    problemStatement:
      '$I_s=5\\angle30°$ A, $\\omega=1000$ rad/s, $R=20\\,\\Omega$, $L=40\\,\\text{mH}$, $C=50\\,\\mu\\text{F}$.',
    spec: {
      kind: 'ac-parallel-rlc',
      params: {
        Is_mag: 5,
        Is_ang_deg: 30,
        omega: 1000,
        R: 20,
        L: 40e-3,
        C: 50e-6,
      },
    },
  },

  // ── Q15 ──────────────────────────────────────────────────────────────────────
  {
    id: 15,
    slug: 'q15-ac-mesh-dependent',
    title: 'Multi-Mesh AC — Dependent Source',
    year: 2,
    difficulty: 'Tough',
    topic: 'AC mesh with dependent source',
    problemStatement:
      '$\\omega=5000$ rad/s, dependent source $V_d=4I_2R_2$ in mesh 1.',
    spec: {
      kind: 'ac-mesh-dependent',
      params: {
        omega: 5000,
        Vs: 80,
        mesh1Elements: [
          { type: 'series-Z', Z: { re: 10, im: 0 } },
          { type: 'series-RL', R: 0, L: 4e-3, omega: 5000 },
        ],
        mesh2Elements: [
          { type: 'series-RC', R: 0, C: 10e-6, omega: 5000 },
        ],
        depSrcGain: 4,
      },
    },
  },

  // ── Q16 ──────────────────────────────────────────────────────────────────────
  {
    id: 16,
    slug: 'q16-ac-thevenin',
    title: 'AC Thevenin Equivalent',
    year: 2,
    difficulty: 'Mid',
    topic: 'AC Thevenin equivalent',
    problemStatement:
      '$V_s=50\\angle0°$ V, $\\omega=2000$ rad/s, $R_1=10\\,\\Omega$, $L=5\\,\\text{mH}$, $R_2=20\\,\\Omega$, $C=25\\,\\mu\\text{F}$.',
    spec: {
      kind: 'ac-thevenin',
      params: {
        Vs_mag: 50,
        Vs_ang_deg: 0,
        omega: 2000,
        R1: 10,
        L: 5e-3,
        R2: 20,
        C: 25e-6,
        terminalLabel: 'A-B',
      },
    },
  },

  // ── Q17 ──────────────────────────────────────────────────────────────────────
  {
    id: 17,
    slug: 'q17-pf-correction',
    title: 'Power Factor Correction',
    year: 2,
    difficulty: 'Mid',
    topic: 'Power factor correction',
    problemStatement:
      '10 kW at 0.65 lagging PF, 230 V rms, 50 Hz. Correct to 0.95 lagging.',
    spec: {
      kind: 'pf-correction',
      params: {
        P_W: 10e3,
        pf1: 0.65,
        pf2: 0.95,
        V_rms: 230,
        f_Hz: 50,
      },
    },
  },

  // ── Q18 ──────────────────────────────────────────────────────────────────────
  {
    id: 18,
    slug: 'q18-complex-power',
    title: 'Complex Power Balance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Complex power balance',
    problemStatement:
      '$V_s=100\\angle0°$ V, $\\omega=1000$ rad/s, parallel R, L, C branches.',
    spec: {
      kind: 'complex-power-balance',
      params: {
        Vs_mag: 100,
        omega: 1000,
        R: 10,
        L: 20e-3,
        C: 50e-6,
      },
    },
  },

  // ── Q19 ──────────────────────────────────────────────────────────────────────
  {
    id: 19,
    slug: 'q19-series-resonance',
    title: 'Series Resonance',
    year: 2,
    difficulty: 'Easy',
    topic: 'Series resonance',
    problemStatement:
      '$R=5\\,\\Omega$, $L=10\\,\\text{mH}$, $C=40\\,\\mu\\text{F}$.',
    spec: {
      kind: 'series-resonance',
      params: {
        R: 5,
        L: 10e-3,
        C: 40e-6,
      },
    },
  },

  // ── Q20 ──────────────────────────────────────────────────────────────────────
  {
    id: 20,
    slug: 'q20-parallel-resonance',
    title: 'Parallel Resonance',
    year: 2,
    difficulty: 'Mid',
    topic: 'Parallel resonance',
    problemStatement:
      '$R=50\\,\\text{k}\\Omega$, $L=0.5\\,\\text{mH}$, $C=200\\,\\text{pF}$, $I_s=2\\,\\text{mA}$.',
    spec: {
      kind: 'parallel-resonance',
      params: {
        R: 50e3,
        L: 0.5e-3,
        C: 200e-12,
        Is: 2e-3,
      },
    },
  },

  // ── Q21 ──────────────────────────────────────────────────────────────────────
  {
    id: 21,
    slug: 'q21-bode-plot',
    title: 'Bode Plot — Two Poles, One Zero',
    year: 2,
    difficulty: 'Tough',
    topic: 'Bode plot analysis',
    problemStatement:
      '$H(s)=\\frac{1000(s+100)}{s(s+10)(s+1000)}$.',
    spec: {
      kind: 'bode-plot',
      params: {
        H_s: '1000*(s+100) / (s*(s+10)*(s+1000))',
        gain: 1000,
        poles: [0, -10, -1000],
        zeros: [-100],
        evalAt_omega: 100,
      },
    },
  },

  // ── Q22 ──────────────────────────────────────────────────────────────────────
  {
    id: 22,
    slug: 'q22-bandpass-filter',
    title: 'Passive Band-Pass Filter',
    year: 2,
    difficulty: 'Mid',
    topic: 'Band-pass filter',
    problemStatement:
      'Series RLC BPF across R: $R=100\\,\\Omega$, $L=10\\,\\text{mH}$, $C=1\\,\\mu\\text{F}$.',
    spec: {
      kind: 'bandpass-filter',
      params: {
        R: 100,
        L: 10e-3,
        C: 1e-6,
        topology: 'series-RLC-across-R',
      },
    },
  },

  // ── Q23 ──────────────────────────────────────────────────────────────────────
  {
    id: 23,
    slug: 'q23-z-parameters',
    title: 'Z-Parameters — T Network',
    year: 2,
    difficulty: 'Mid',
    topic: 'Z-parameters T-network',
    problemStatement:
      'T-network: $Z_a=10\\,\\Omega$, $Z_b=20\\,\\Omega$, $Z_c=30\\,\\Omega$.',
    spec: {
      kind: 'z-parameters',
      params: {
        Za: 10,
        Zb: 20,
        Zc: 30,
        topology: 'T',
      },
    },
  },

  // ── Q24 ──────────────────────────────────────────────────────────────────────
  {
    id: 24,
    slug: 'q24-abcd-cascade',
    title: 'ABCD Matrix — Ladder Cascade',
    year: 2,
    difficulty: 'Tough',
    topic: 'ABCD matrix cascade',
    problemStatement:
      '$Z_1=j10\\,\\Omega$, $Y_2=j0.05\\,\\text{S}$, $Z_3=5+j5\\,\\Omega$, $Z_s=10\\,\\Omega$, $Z_L=50\\,\\Omega$.',
    spec: {
      kind: 'abcd-cascade',
      params: {
        sections: [
          { type: 'series-Z', Z: { re: 0,  im: 10  } },
          { type: 'shunt-Y',  Y: { re: 0,  im: 0.05 } },
          { type: 'series-Z', Z: { re: 5,  im: 5   } },
        ],
        Zs: { re: 10, im: 0 },
        ZL: { re: 50, im: 0 },
      },
    },
  },

  // ── Q25 ──────────────────────────────────────────────────────────────────────
  {
    id: 25,
    slug: 'q25-two-port-gain',
    title: 'Two-Port Transfer Function',
    year: 2,
    difficulty: 'Tough',
    topic: 'Two-port voltage gain',
    problemStatement:
      '$Z_{11}=20\\,\\Omega$, $Z_{12}=Z_{21}=10\\,\\Omega$, $Z_{22}=30\\,\\Omega$, $V_s=100\\,\\text{V}$, $Z_s=5\\,\\Omega$, $Z_L=25\\,\\Omega$.',
    spec: {
      kind: 'two-port-gain',
      params: {
        Z11: 20,
        Z12: 10,
        Z22: 30,
        Vs: 100,
        Zs: 5,
        ZL: 25,
      },
    },
  },

  // ── Q26 ──────────────────────────────────────────────────────────────────────
  {
    id: 26,
    slug: 'q26-mutual-inductance',
    title: 'Mutual Inductance — Dot Convention',
    year: 2,
    difficulty: 'Mid',
    topic: 'Mutual inductance',
    problemStatement:
      '$L_1=4\\,\\text{H}$, $L_2=9\\,\\text{H}$, $M=3\\,\\text{H}$, $V_s=100\\angle0°$ V, $\\omega=10$ rad/s, coil 2 open.',
    spec: {
      kind: 'mutual-inductance',
      params: {
        L1: 4,
        L2: 9,
        M: 3,
        Vs_mag: 100,
        omega: 10,
        port2Open: true,
      },
    },
  },

  // ── Q27 ──────────────────────────────────────────────────────────────────────
  {
    id: 27,
    slug: 'q27-ideal-transformer',
    title: 'Ideal Transformer — Impedance Reflection',
    year: 2,
    difficulty: 'Mid',
    topic: 'Ideal transformer',
    problemStatement:
      '$n=5:1$, $V_s=240$ V rms, $Z_s=2\\,\\Omega$, $Z_L=8\\,\\Omega$.',
    spec: {
      kind: 'ideal-transformer',
      params: {
        n: 5,
        Vs: 240,
        Zs: 2,
        ZL: 8,
      },
    },
  },

  // ── Q28 ──────────────────────────────────────────────────────────────────────
  {
    id: 28,
    slug: 'q28-balanced-yy',
    title: 'Balanced Y-Y System',
    year: 2,
    difficulty: 'Easy',
    topic: 'Balanced Y-Y three-phase',
    problemStatement:
      'Line voltage 415 V rms, $Z_{ph}=10+j8\\,\\Omega$.',
    spec: {
      kind: 'three-phase-yy',
      params: {
        VL_rms: 415,
        Z_ph: { re: 10, im: 8 },
      },
    },
  },

  // ── Q29 ──────────────────────────────────────────────────────────────────────
  {
    id: 29,
    slug: 'q29-balanced-yd',
    title: 'Balanced Y-Δ System',
    year: 2,
    difficulty: 'Mid',
    topic: 'Balanced Y-Delta three-phase',
    problemStatement:
      'Y source 208 V line, $\\Delta$ load $Z_\\Delta=30+j40\\,\\Omega$ per phase.',
    spec: {
      kind: 'three-phase-yd',
      params: {
        VL_rms: 208,
        Z_delta: { re: 30, im: 40 },
      },
    },
  },

  // ── Q30 ──────────────────────────────────────────────────────────────────────
  {
    id: 30,
    slug: 'q30-two-wattmeter',
    title: 'Two-Wattmeter Method',
    year: 2,
    difficulty: 'Mid',
    topic: 'Two-wattmeter method',
    problemStatement:
      '$W_1=4.5\\,\\text{kW}$, $W_2=1.5\\,\\text{kW}$.',
    spec: {
      kind: 'two-wattmeter',
      params: {
        W1: 4500,
        W2: 1500,
      },
    },
  },

  // ── Q31 ──────────────────────────────────────────────────────────────────────
  {
    id: 31,
    slug: 'q31-ce-amplifier',
    title: 'CE Amplifier — Hybrid-π Midband',
    year: 3,
    difficulty: 'Mid',
    topic: 'BJT CE hybrid-pi midband',
    problemStatement:
      '$I_C=2\\,\\text{mA}$, $\\beta=100$, $V_A=80\\,\\text{V}$, $R_C=5\\,\\text{k}\\Omega$, $R_S=1\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'bjt-ce-amplifier',
      params: {
        IC: 2e-3,
        beta: 100,
        VA: 80,
        RC: 5e3,
        RS: 1e3,
      },
    },
  },

  // ── Q32 ──────────────────────────────────────────────────────────────────────
  {
    id: 32,
    slug: 'q32-miller-bandwidth',
    title: 'Miller Approximation — Bandwidth',
    year: 3,
    difficulty: 'Mid',
    topic: 'Miller effect bandwidth',
    problemStatement:
      'Same BJT as Q31 with $C_\\pi=15\\,\\text{pF}$, $C_\\mu=2\\,\\text{pF}$.',
    spec: {
      kind: 'miller-bandwidth',
      params: {
        Av: -196,
        Cpi: 15e-12,
        Cmu: 2e-12,
        RS: 1e3,
        rpi: 1.3e3,
      },
    },
  },

  // ── Q33 ──────────────────────────────────────────────────────────────────────
  {
    id: 33,
    slug: 'q33-emitter-degeneration',
    title: 'Emitter Degeneration',
    year: 3,
    difficulty: 'Mid',
    topic: 'Emitter degeneration',
    problemStatement:
      '$R_E=500\\,\\Omega$ unbypassed, $R_C=5\\,\\text{k}\\Omega$, $g_m=40\\,\\text{mA/V}$, $r_\\pi=2.5\\,\\text{k}\\Omega$, $r_o=50\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'emitter-degeneration',
      params: {
        RE: 500,
        RC: 5e3,
        gm: 40e-3,
        rpi: 2.5e3,
        ro: 50e3,
      },
    },
  },

  // ── Q34 ──────────────────────────────────────────────────────────────────────
  {
    id: 34,
    slug: 'q34-cascode',
    title: 'Cascode Amplifier',
    year: 3,
    difficulty: 'Tough',
    topic: 'Cascode amplifier',
    problemStatement:
      'CE ($g_{m1}=40\\,\\text{mA/V}$, $r_{o1}=50\\,\\text{k}\\Omega$) + CB ($g_{m2}=40\\,\\text{mA/V}$, $r_{o2}=50\\,\\text{k}\\Omega$), $R_L=10\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'cascode',
      params: {
        gm1: 40e-3,
        ro1: 50e3,
        gm2: 40e-3,
        ro2: 50e3,
        RL: 10e3,
      },
    },
  },

  // ── Q35 ──────────────────────────────────────────────────────────────────────
  {
    id: 35,
    slug: 'q35-cs-amplifier',
    title: 'CS Amplifier — Small-Signal',
    year: 3,
    difficulty: 'Mid',
    topic: 'MOSFET CS amplifier',
    problemStatement:
      '$k_n=2\\,\\text{mA/V}^2$, $V_{TN}=1\\,\\text{V}$, $V_{GS}=2\\,\\text{V}$, $\\lambda=0.02\\,\\text{V}^{-1}$, $R_D=10\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'mosfet-cs',
      params: {
        kn: 2e-3,
        VTN: 1,
        VGS: 2,
        lambda: 0.02,
        RD: 10e3,
      },
    },
  },

  // ── Q36 ──────────────────────────────────────────────────────────────────────
  {
    id: 36,
    slug: 'q36-diff-pair',
    title: 'MOSFET Differential Pair',
    year: 3,
    difficulty: 'Tough',
    topic: 'MOSFET differential pair',
    problemStatement:
      '$g_m=5\\,\\text{mA/V}$, $r_o=100\\,\\text{k}\\Omega$, $R_{SS}=500\\,\\text{k}\\Omega$, $R_D=20\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'mosfet-diff-pair',
      params: {
        gm: 5e-3,
        ro: 100e3,
        RSS: 500e3,
        RD: 20e3,
      },
    },
  },

  // ── Q37 ──────────────────────────────────────────────────────────────────────
  {
    id: 37,
    slug: 'q37-source-follower',
    title: 'Source Follower (CD)',
    year: 3,
    difficulty: 'Easy',
    topic: 'MOSFET source follower',
    problemStatement:
      '$g_m=4\\,\\text{mA/V}$, $r_o=40\\,\\text{k}\\Omega$, $R_S=5\\,\\text{k}\\Omega$, $R_L=10\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'source-follower',
      params: {
        gm: 4e-3,
        ro: 40e3,
        RS: 5e3,
        RL: 10e3,
      },
    },
  },

  // ── Q38 ──────────────────────────────────────────────────────────────────────
  {
    id: 38,
    slug: 'q38-inverting-summer',
    title: 'Inverting Summing Amplifier',
    year: 3,
    difficulty: 'Mid',
    topic: 'Op-amp inverting summer',
    problemStatement:
      '$R_1=10\\,\\text{k}\\Omega$, $R_2=20\\,\\text{k}\\Omega$, $R_3=40\\,\\text{k}\\Omega$, $R_f=80\\,\\text{k}\\Omega$. $V_1=1\\,\\text{V}$, $V_2=-2\\,\\text{V}$, $V_3=0.5\\,\\text{V}$.',
    spec: {
      kind: 'opamp-summer',
      params: {
        Rf: 80e3,
        inputs: [
          { R: 10e3, V: 1 },
          { R: 20e3, V: -2 },
          { R: 40e3, V: 0.5 },
        ],
      },
    },
  },

  // ── Q39 ──────────────────────────────────────────────────────────────────────
  {
    id: 39,
    slug: 'q39-diff-amp-cmrr',
    title: 'Difference Amplifier — CMRR with Mismatch',
    year: 3,
    difficulty: 'Mid',
    topic: 'Difference amp CMRR mismatch',
    problemStatement:
      'Ideal: $R_1=R_2=R_3=R_4=10\\,\\text{k}\\Omega$. Mismatch: $R_4=10.1\\,\\text{k}\\Omega$.',
    spec: {
      kind: 'diff-amp-cmrr',
      params: {
        R1: 10e3,
        R2: 10e3,
        R3: 10e3,
        R4: 10e3,
        deltaR4: 100,
      },
    },
  },

  // ── Q40 ──────────────────────────────────────────────────────────────────────
  {
    id: 40,
    slug: 'q40-sallen-key',
    title: 'Sallen-Key Low-Pass Filter',
    year: 3,
    difficulty: 'Tough',
    topic: 'Sallen-Key Butterworth LPF',
    problemStatement:
      '$R_1=R_2=10\\,\\text{k}\\Omega$, $C_1=C_2=10\\,\\text{nF}$, $K=1.586$.',
    spec: {
      kind: 'sallen-key',
      params: {
        R1: 10e3,
        R2: 10e3,
        C1: 10e-9,
        C2: 10e-9,
        K: 1.586,
      },
    },
  },

  // ── Q41 ──────────────────────────────────────────────────────────────────────
  {
    id: 41,
    slug: 'q41-schmitt-trigger',
    title: 'Schmitt Trigger',
    year: 3,
    difficulty: 'Mid',
    topic: 'Schmitt trigger hysteresis',
    problemStatement:
      'Non-inverting: $R_1=10\\,\\text{k}\\Omega$, $R_2=90\\,\\text{k}\\Omega$, $\\pm15\\,\\text{V}$ rails.',
    spec: {
      kind: 'schmitt-trigger',
      params: {
        R1: 10e3,
        R2: 90e3,
        Vsat_pos: 15,
        Vsat_neg: -15,
      },
    },
  },

  // ── Q42 ──────────────────────────────────────────────────────────────────────
  {
    id: 42,
    slug: 'q42-series-shunt-feedback',
    title: 'Series-Shunt Feedback',
    year: 3,
    difficulty: 'Mid',
    topic: 'Series-shunt feedback',
    problemStatement:
      '$A=2000$, $R_{in}=5\\,\\text{k}\\Omega$, $R_{out}=10\\,\\text{k}\\Omega$, $\\beta_f=0.04$.',
    spec: {
      kind: 'series-shunt-feedback',
      params: {
        A: 2000,
        Rin: 5e3,
        Rout: 10e3,
        beta_f: 0.04,
      },
    },
  },

  // ── Q43 ──────────────────────────────────────────────────────────────────────
  {
    id: 43,
    slug: 'q43-bode-stability',
    title: 'Bode Stability — Gain and Phase Margin',
    year: 3,
    difficulty: 'Mid',
    topic: 'Bode stability margins',
    problemStatement:
      '$L(s)=\\frac{1000}{(s+1)(s+10)(s+100)}$.',
    spec: {
      kind: 'bode-stability',
      params: {
        L_s: '1000 / ((s+1)*(s+10)*(s+100))',
        poles: [-1, -10, -100],
        zeros: [],
        gain: 1000,
      },
    },
  },

  // ── Q44 ──────────────────────────────────────────────────────────────────────
  {
    id: 44,
    slug: 'q44-root-locus',
    title: 'Root Locus — Sketch',
    year: 3,
    difficulty: 'Tough',
    topic: 'Root locus analysis',
    problemStatement:
      '$G(s)H(s)=\\frac{K(s+2)}{s(s+5)(s+10)}$.',
    spec: {
      kind: 'root-locus',
      params: {
        GH_s: 'K*(s+2) / (s*(s+5)*(s+10))',
        openLoopPoles: [0, -5, -10],
        openLoopZeros: [-2],
        gain_symbol: 'K',
      },
    },
  },

  // ── Q45 ──────────────────────────────────────────────────────────────────────
  {
    id: 45,
    slug: 'q45-per-unit',
    title: 'Per-Unit Conversion',
    year: 3,
    difficulty: 'Mid',
    topic: 'Per-unit system',
    problemStatement:
      'Base 100 MVA, 132 kV (zone 1), transformer 132/33 kV.',
    spec: {
      kind: 'per-unit',
      params: {
        Sbase_MVA: 100,
        zones: [{ Vbase_kV: 132 }, { Vbase_kV: 33 }],
        lineImpedances: [[0, 10, 30]],
      },
    },
  },

  // ── Q46 ──────────────────────────────────────────────────────────────────────
  {
    id: 46,
    slug: 'q46-ybus',
    title: 'Ybus Formation',
    year: 3,
    difficulty: 'Mid',
    topic: 'Ybus matrix formation',
    problemStatement:
      '$y_{12}=1-j3$, $y_{13}=2-j6$, $y_{23}=1.5-j4.5$ pu. No shunts.',
    spec: {
      kind: 'ybus-formation',
      params: {
        nBuses: 3,
        lines: [
          { from: 1, to: 2, y: { re: 1,   im: -3   } },
          { from: 1, to: 3, y: { re: 2,   im: -6   } },
          { from: 2, to: 3, y: { re: 1.5, im: -4.5 } },
        ],
      },
    },
  },

  // ── Q47 ──────────────────────────────────────────────────────────────────────
  {
    id: 47,
    slug: 'q47-gauss-seidel',
    title: 'Gauss–Seidel Power Flow — 3 Bus',
    year: 3,
    difficulty: 'Tough',
    topic: 'Gauss-Seidel power flow',
    problemStatement:
      'Slack bus 1 ($1.05\\angle0°$), PV bus 2 ($P=0.4$, $V=1.02$), PQ bus 3 ($P=-0.6$, $Q=-0.25$). Ybus from Q46.',
    spec: {
      kind: 'gauss-seidel-pf',
      params: {
        buses: [
          { id: 1, type: 'slack', V_mag: 1.05, V_ang_deg: 0 },
          { id: 2, type: 'PV',    P: 0.4,  V_mag: 1.02 },
          { id: 3, type: 'PQ',    P: -0.6, Q: -0.25 },
        ],
        Ybus: YBUS_3BUS,
        maxIter: 100,
        tolerance: 1e-6,
      },
    },
  },

  // ── Q48 ──────────────────────────────────────────────────────────────────────
  {
    id: 48,
    slug: 'q48-symmetrical-fault',
    title: 'Symmetrical 3-Phase Fault',
    year: 3,
    difficulty: 'Tough',
    topic: 'Symmetrical fault analysis',
    problemStatement:
      '$Z_{bus}$ given, pre-fault $V=1.0\\angle0°$ pu, 3-phase fault at bus 2.',
    spec: {
      kind: 'symmetrical-fault',
      params: {
        Zbus: ZBUS_3BUS,
        Vpre: 1.0,
        faultBus: 2,
      },
    },
  },

  // ── Q49 ──────────────────────────────────────────────────────────────────────
  {
    id: 49,
    slug: 'q49-nr-jacobian',
    title: 'Newton–Raphson Power Flow — Jacobian',
    year: 3,
    difficulty: 'Tough',
    topic: 'Newton-Raphson power flow',
    problemStatement:
      'Same 3-bus system as Q47. Write mismatch equations and Jacobian structure.',
    spec: {
      kind: 'nr-jacobian',
      params: {
        buses: [
          { id: 1, type: 'slack', V_mag: 1.05, V_ang_deg: 0 },
          { id: 2, type: 'PV',    P: 0.4,  V_mag: 1.02 },
          { id: 3, type: 'PQ',    P: -0.6, Q: -0.25 },
        ],
        Ybus: YBUS_3BUS,
        maxIter: 50,
        tolerance: 1e-6,
      },
    },
  },

  // ── Q50 ──────────────────────────────────────────────────────────────────────
  {
    id: 50,
    slug: 'q50-integrator-oscillator',
    title: 'Integrator-Based Oscillator',
    year: 3,
    difficulty: 'Tough',
    topic: 'Op-amp integrator oscillator',
    problemStatement:
      'Sinusoidal oscillator at $f_0=1\\,\\text{kHz}$ using two ideal op-amp integrators.',
    spec: {
      kind: 'integrator-oscillator',
      params: {
        f0: 1000,
        C: 10e-9,
        nIntegrators: 2,
      },
    },
  },
];
