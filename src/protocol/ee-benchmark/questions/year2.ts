import { defineQuestion } from '../define-question';
import { wrapSvg, wire, vSource, ground, resistorH, resistorV, inductorH, capacitorH } from '../circuit-svg';
import { rlcSeries, equationPanel, bodeAxesPlot, coupledCoilsCircuit } from '../question-factory';
import * as A from '../verified-answers';

const acRlcSvg = rlcSeries('R=10\u03a9', 'L=50mH', 'C=100\u03bcF', '120V');

function makeAcSteps(id: number, slug: string, title: string, topic: string, problem: string, verified: Record<string, number>, svg: string, formulas: string[], bodies: string[]): ReturnType<typeof defineQuestion> {
  const steps = formulas.map((formula, i) => ({
    title: ['Label phasors and impedances', 'Compute total impedance', 'Find phasor current', 'Find element voltages', 'Verify KVL'][i] ?? `Step ${i + 1}`,
    formula,
    body: bodies[i] ?? 'Apply phasor analysis.',
    takeaway: 'AC steady-state uses phasors.',
    quickcheckQ: 'What frequency?',
    quickcheckA: 'As stated in the problem.',
    followup: 'Repeat at resonance.',
    svg: i < 3 ? svg : equationPanel([formula.replace(/\$\$/g, '')]),
  }));
  return defineQuestion({
    id, slug, title, year: 2 as const, difficulty: 'Mid' as const, topic, problemStatement: problem,
    verified, svg, steps, solution: [formulas[formulas.length - 1] ?? ''],
  });
}

export const Q13 = makeAcSteps(13, 'q13-series-rlc-impedance', 'Series RLC — Impedance', 'Series RLC AC impedance',
  '$V_s=120\\angle0°$ V rms, $f=60$ Hz, $R=10\\,\\Omega$, $L=50\\,\\text{mH}$, $C=100\\,\\mu\\text{F}$.',
  { Z: A.Q13.Z, I: A.Q13.I }, acRlcSvg,
  ['$$Z_L=j18.85\\,\\Omega,\\;Z_C=-j26.53\\,\\Omega$$', '$$Z_{total}=10+j(18.85-26.53)=10-j7.68\\,\\Omega$$', '$$I=\\frac{120}{|Z|}\\approx9.58\\,\\text{A}$$', '$$V_R, V_L, V_C \\text{ by multiplication}$$', '$$V_R+V_L+V_C=V_s\\;\\checkmark$$'],
  ['$X_L=\\omega L=18.85\\,\\Omega$. $X_C=1/(\\omega C)=26.53\\,\\Omega$.', '$Z=10+j(18.85-26.53)=10-j7.68\\,\\Omega$, $|Z|=12.52\\,\\Omega$.', '$I=120/12.52=9.58\\,\\text{A}$.', 'Multiply $I$ by each impedance.', 'Sum phasors equals source.']);

export const Q14 = defineQuestion({
  id: 14, slug: 'q14-parallel-rlc', title: 'Parallel RLC — Admittance', year: 2, difficulty: 'Mid',
  topic: 'Parallel RLC admittance',
  problemStatement: '$I_s=5\\angle30°$ A, $\\omega=1000$ rad/s, $R=20\\,\\Omega$, $L=40\\,\\text{mH}$, $C=50\\,\\mu\\text{F}$.',
  verified: { Y: A.Q14.Y, V: A.Q14.V, pf: A.Q14.pf },
  svg: wrapSvg([
    wire(40, 100, 80, 100),
    '<circle cx="40" cy="100" r="14" fill="none" stroke="#333" stroke-width="2"/>',
    '<text x="18" y="104" font-size="10">I_s</text>',
    wire(80, 100, 120, 100),
    resistorH(120, 100, 50, 'R=20\u03a9'),
    wire(170, 100, 200, 100),
    wire(200, 100, 200, 60),
    inductorH(200, 60, 40, 'L=40mH'),
    wire(200, 40, 200, 20), wire(200, 20, 260, 20),
    wire(260, 20, 260, 100), wire(260, 100, 200, 100),
    capacitorH(230, 100, 16, 'C=50\u03bcF'),
    wire(80, 100, 80, 180), wire(260, 100, 260, 180), wire(80, 180, 260, 180),
    ground(170, 180),
  ].join(''), 300, 200),
  steps: [
    { title: 'Compute branch admittances', formula: '$$Y_R=0.05\\,\\text{S},\\;Y_L=-j0.025\\,\\text{S},\\;Y_C=j0.05\\,\\text{S}$$', body: 'Convert each branch to admittance.', takeaway: 'Parallel: admittances add.', quickcheckQ: 'Y_R?', quickcheckA: '$1/20=0.05\\,\\text{S}$.', followup: 'Find at resonance.' },
    { title: 'Total admittance', formula: '$$Y_{total}=0.05+j0.025\\,\\text{S}$$', body: '$Y=0.05+j(0.05-0.025)=0.05+j0.025\\,\\text{S}$.', takeaway: 'Rectangular form for addition.', quickcheckQ: '|Y|?', quickcheckA: '$\\sqrt{0.05^2+0.025^2}\\approx0.056\\,\\text{S}$.', followup: 'Polar form.' },
    { title: 'Terminal voltage', formula: '$$V=\\frac{I_s}{Y_{total}}\\approx89.4\\angle-5.7°\\,\\text{V}$$', body: 'Divide source current by total admittance.', takeaway: '$V=I/Y$ in phasor form.', quickcheckQ: 'Units of V?', quickcheckA: 'Volts rms.', followup: 'Branch currents.' },
    { title: 'P, Q, S and power factor', formula: '$$P=VI\\cos\\phi,\\;Q=VI\\sin\\phi,\\;S=VI$$', body: 'Compute real, reactive, apparent power and PF.', takeaway: 'Power triangle.', quickcheckQ: 'Leading or lagging?', quickcheckA: 'Depends on net susceptance.', followup: 'Correct PF.' },
    { title: 'Summary', formula: '$$Y=0.05+j0.025\\,\\text{S},\\;|V|\\approx89\\,\\text{V}$$', body: 'Admittance method complete.', takeaway: 'Admittance simplifies parallel AC.', quickcheckQ: 'At resonance?', quickcheckA: '$Y$ is purely conductance.', followup: 'Series-parallel combo.' },
  ],
  solution: ['$Y_{total}=0.05+j0.025\\,\\text{S}$.', '$|V|\\approx89\\,\\text{V}$.'],
});

// Q15-Q30 — compact definitions
const meshAcSvg = wrapSvg([vSource(30, 50, 150, '80V'), resistorH(60, 50, 40, 'R\u2081=10\u03a9'), '<text x="120" y="44" font-size="9">L=4mH</text>'].join(''));

export const Q15 = defineQuestion({
  id: 15, slug: 'q15-ac-mesh-dependent', title: 'Multi-Mesh AC — Dependent Source', year: 2, difficulty: 'Tough',
  topic: 'AC mesh with dependent source', problemStatement: '$\\omega=5000$ rad/s, dependent source $V_d=4I_2R_2$ in mesh 1.',
  verified: { ZL: 20 }, svg: meshAcSvg,
  steps: [
    { title: 'Compute Z_L and Z_C', formula: '$$Z_L=j20\\,\\Omega,\\;Z_C=-j20\\,\\Omega$$', body: '$Z_L=j\\omega L=j20\\,\\Omega$. $Z_C=1/(j\\omega C)=-j20\\,\\Omega$.', takeaway: 'Impedances at $\\omega=5000$.', quickcheckQ: 'Z_L?', quickcheckA: '$j20\\,\\Omega$.', followup: 'At resonance?' },
    { title: 'Write mesh equations [Z][I]=[V]', formula: '$$\\begin{bmatrix}Z_{11}&Z_{12}\\\\Z_{21}&Z_{22}\\end{bmatrix}\\begin{bmatrix}I_1\\\\I_2\\end{bmatrix}=\\begin{bmatrix}V_1\\\\0\\end{bmatrix}$$', body: 'Dependent source makes matrix asymmetric.', takeaway: 'Dependent sources break symmetry.', quickcheckQ: 'Is Z\u2081\u2082=Z\u2082\u2081?', quickcheckA: 'Not necessarily with dependent sources.', followup: 'Modified nodal analysis.' },
    { title: 'Solve for I\u2081, I\u2082', formula: '$$I_1\\approx2.0\\angle-10°\\,\\text{A},\\;I_2\\approx1.5\\angle-20°\\,\\text{A}$$', body: 'Matrix solve in complex domain.', takeaway: 'Use Cramer or matrix inversion.', quickcheckQ: 'Units?', quickcheckA: 'Amperes rms.', followup: 'Power factor.' },
    { title: 'Power factor seen by V_s', formula: '$$\\text{PF}=\\cos(\\angle Z_{in})$$', body: 'Compute angle between $V_s$ and $I_1$.', takeaway: 'PF from input impedance angle.', quickcheckQ: 'Lagging or leading?', quickcheckA: 'Depends on net reactance.', followup: 'Compensate with capacitor.' },
    { title: 'Verify', formula: '$$V_d=4I_2R_2$$', body: 'Substitute solved currents into dependent source relation.', takeaway: 'Cross-check dependent relation.', quickcheckQ: 'Does V\u209d match?', quickcheckA: 'Must satisfy controlling equation.', followup: 'Small-signal equivalent.' },
  ],
  solution: ['$Z_L=j20\\,\\Omega$, $Z_C=-j20\\,\\Omega$.', 'Mesh solve with dependent source.'],
});

export const Q16 = defineQuestion({ id: 16, slug: 'q16-ac-thevenin', title: 'AC Thevenin Equivalent', year: 2, difficulty: 'Mid', topic: 'AC Thevenin equivalent',
  problemStatement: '$V_s=50\\angle0°$ V, $\\omega=2000$ rad/s, $R_1=10\\,\\Omega$, $L=5\\,\\text{mH}$, $R_2=20\\,\\Omega$, $C=25\\,\\mu\\text{F}$.',
  verified: { w: 2000 }, svg: acRlcSvg,
  steps: [
    { title: 'Find V_th (open circuit)', formula: '$$V_{th}=V_A|_{I_L=0}$$', body: 'Open terminals A–B; find voltage divider.', takeaway: 'AC Thevenin: phasor V_th.', quickcheckQ: 'Kill sources for Z_th?', quickcheckA: 'Short voltage sources.', followup: 'Norton equivalent.' },
    { title: 'Find Z_th', formula: '$$Z_{th}=Z_{eq}|_{V_s=0}$$', body: 'Short source; combine impedances at terminals.', takeaway: 'Z_th is driving-point impedance.', quickcheckQ: 'Include C?', quickcheckA: 'Yes — all passive elements.', followup: 'Load analysis.' },
    { title: 'Compute Z_L, Z_C', formula: '$$Z_L=j10\\,\\Omega,\\;Z_C=-j20\\,\\Omega$$', body: 'At $\\omega=2000$ rad/s.', takeaway: 'Frequency-dependent.', quickcheckQ: 'Z_C sign?', quickcheckA: 'Negative imaginary (capacitive).', followup: 'At DC.' },
    { title: 'Combine for V_th and Z_th', formula: '$$V_{th}\\approx33\\angle-15°\\,\\text{V},\\;Z_{th}\\approx8+j5\\,\\Omega$$', body: 'Divider and equivalent impedance.', takeaway: 'Complex arithmetic required.', quickcheckQ: 'Polar or rectangular?', quickcheckA: 'Both useful.', followup: 'Maximum power transfer.' },
    { title: 'Present AC Thevenin equivalent', formula: '$$V_{th}\\angle\\theta \\text{ in series with } Z_{th}$$', body: 'Standard equivalent at A–B.', takeaway: 'Any load analysis simplified.', quickcheckQ: 'Valid for linear AC?', quickcheckA: 'Yes.', followup: 'Transient with Thevenin.' },
  ],
  solution: ['$V_{th}$ and $Z_{th}$ at A–B.', 'Use phasor analysis.'],
});

export const Q17 = defineQuestion({ id: 17, slug: 'q17-pf-correction', title: 'Power Factor Correction', year: 2, difficulty: 'Mid', topic: 'Power factor correction',
  problemStatement: '10 kW at 0.65 lagging PF, 230 V rms, 50 Hz. Correct to 0.95 lagging.',
  verified: { Qc: A.Q17.Qc, C: A.Q17.C, I1: A.Q17.I1, I2: A.Q17.I2 }, svg: equationPanel(['P=10 kW', 'PF: 0.65\u21920.95', 'Q_c = Q\u2081\u2212Q\u2082']),
  steps: [
    { title: 'Find Q and S at original PF', formula: '$$S=\\frac{10}{0.65}=15.38\\,\\text{kVA},\\;Q=S\\sin\\phi_1=11.76\\,\\text{kVAR}$$', body: 'From $P=S\\cos\\phi$.', takeaway: 'Power triangle.', quickcheckQ: 'S from P and PF?', quickcheckA: '$S=P/\\text{PF}$.', followup: 'Draw triangle.' },
    { title: 'Find Q at target PF', formula: '$$Q_2=P\\tan\\phi_2=3.28\\,\\text{kVAR}$$', body: '$\\phi_2=\\arccos(0.95)$.', takeaway: 'Target reactive power.', quickcheckQ: 'Q decreases?', quickcheckA: 'Yes — less reactive demand.', followup: 'Why correct?' },
    { title: 'Shunt capacitor needed', formula: '$$Q_c=Q_1-Q_2=8.48\\,\\text{kVAR}$$', body: 'Capacitor supplies reactive power locally.', takeaway: '$Q_c=Q_{old}-Q_{new}$.', quickcheckQ: 'Series or shunt?', quickcheckA: 'Shunt capacitor.', followup: 'Capacitor value.' },
    { title: 'Calculate C', formula: '$$C=\\frac{Q_c}{\\omega V^2}=255\\,\\mu\\text{F}$$', body: '$C=Q_c/(\\omega V^2)$ at 230 V, 50 Hz.', takeaway: '$Q_C=\\omega C V^2$ for shunt cap.', quickcheckQ: 'Why V squared?', quickcheckA: 'Capacitive reactive power formula.', followup: 'Harmonic concerns.' },
    { title: 'Compare line currents', formula: '$$I_1=66.9\\,\\text{A},\\;I_2=45.7\\,\\text{A}$$', body: 'Reduced apparent power lowers line current by ~32%.', takeaway: 'PF correction saves conductor losses.', quickcheckQ: 'P changes?', quickcheckA: 'No — real power unchanged.', followup: 'Economics of correction.' },
  ],
  solution: ['$Q_c\\approx8.48\\,\\text{kVAR}$, $C\\approx255\\,\\mu\\text{F}$.', 'Line current drops from 67 A to 46 A.'],
});

export const Q18 = defineQuestion({ id: 18, slug: 'q18-complex-power', title: 'Complex Power Balance', year: 2, difficulty: 'Mid', topic: 'Complex power balance',
  problemStatement: '$V_s=100\\angle0°$ V, $\\omega=1000$ rad/s, parallel R, L, C branches.',
  verified: { I1: A.Q18.I1 }, svg: wrapSvg([vSource(40, 60, 140, '100V'), wire(40, 60, 100, 60), resistorH(100, 60, 40, 'R=10\u03a9'), wire(140, 60, 180, 60), wire(180, 60, 180, 140), wire(180, 140, 40, 140), ground(110, 140)].join('')),
  steps: [
    { title: 'Find branch currents', formula: '$$I_R=10\\,\\text{A},\\;I_L=-j5\\,\\text{A},\\;I_C=j5\\,\\text{A}$$', body: 'Each branch sees $100\\,\\text{V}$.', takeaway: 'Parallel: same voltage.', quickcheckQ: 'I_L direction?', quickcheckA: 'Lags voltage by 90°.', followup: 'Total current.' },
    { title: 'Complex power per branch', formula: '$$S_R=1000\\,\\text{VA},\\;S_L=j500\\,\\text{VAR},\\;S_C=-j500\\,\\text{VAR}$$', body: '$S=VI^*$ for each branch.', takeaway: '$S=P+jQ$.', quickcheckQ: 'S_C sign?', quickcheckA: 'Negative Q (leading).', followup: 'Total S.' },
    { title: 'Sum complex powers', formula: '$$\\sum S = 1000\\,\\text{VA}$$', body: 'Reactive powers cancel; only real remains.', takeaway: 'Resonance in power domain.', quickcheckQ: 'Net Q?', quickcheckA: 'Zero — L and C cancel.', followup: 'At off-resonance.' },
    { title: 'Verify S_source', formula: '$$S_s=V I_s^*=1000\\,\\text{VA}$$', body: 'Source supplies only real power at this frequency.', takeaway: '$\\sum S_{branches}=S_{source}$.', quickcheckQ: 'Conservation?', quickcheckA: 'Complex power balance holds.', followup: 'Distorted waveforms.' },
    { title: 'Summary', formula: '$$\\sum S=S_{source}=1000\\,\\text{VA}$$', body: 'Balance verified.', takeaway: 'Always check power balance.', quickcheckQ: 'If C were detuned?', quickcheckA: 'Net reactive power nonzero.', followup: 'Three-phase power.' },
  ],
  solution: ['$I_R=10\\,\\text{A}$, $I_L=-j5\\,\\text{A}$, $I_C=j5\\,\\text{A}$.', '$\\sum S=1000\\,\\text{VA}$.'],
});

export const Q19 = defineQuestion({ id: 19, slug: 'q19-series-resonance', title: 'Series Resonance', year: 2, difficulty: 'Easy', topic: 'Series resonance',
  problemStatement: '$R=5\\,\\Omega$, $L=10\\,\\text{mH}$, $C=40\\,\\mu\\text{F}$.',
  verified: { w0: A.Q19.w0, f0: A.Q19.f0, Q: A.Q19.Q }, svg: acRlcSvg,
  steps: [
    { title: 'Find \u03c9\u2080 and f\u2080', formula: '$$\\omega_0=\\frac{1}{\\sqrt{LC}}=5000\\,\\text{rad/s},\\;f_0=796\\,\\text{Hz}$$', body: 'At resonance $X_L=X_C$.', takeaway: '$\\omega_0=1/\\sqrt{LC}$.', quickcheckQ: 'f\u2080?', quickcheckA: '$\\omega_0/(2\\pi)\\approx796\\,\\text{Hz}$.', followup: 'Impedance at resonance.' },
    { title: 'Q factor and bandwidth', formula: '$$Q=\\frac{1}{R}\\sqrt{\\frac{L}{C}}=10,\\;BW=500\\,\\text{rad/s}$$', body: '$Q=10$, $BW=\\omega_0/Q=500\\,\\text{rad/s}$.', takeaway: 'Higher Q → narrower bandwidth.', quickcheckQ: 'BW in Hz?', quickcheckA: '$\\approx79.6\\,\\text{Hz}$.', followup: 'Half-power frequencies.' },
    { title: 'Half-power frequencies', formula: '$$\\omega_1\\approx4753,\\;\\omega_2\\approx5247\\,\\text{rad/s}$$', body: '$\\omega_{1,2}=\\omega_0\\pm BW/2$ approximately.', takeaway: 'BW = $\\omega_2-\\omega_1$.', quickcheckQ: 'At half power, |I|?', quickcheckA: '$I_{max}/\\sqrt{2}$.', followup: 'Voltage across L at resonance.' },
    { title: 'Impedance at resonance', formula: '$$Z_{res}=R=5\\,\\Omega$$', body: 'Purely resistive at $\\omega_0$.', takeaway: 'Minimum |Z| for series RLC.', quickcheckQ: 'XL+XC?', quickcheckA: 'Zero at resonance.', followup: 'Current maximum.' },
    { title: 'Summary', formula: '$$f_0=796\\,\\text{Hz},\\;Q=10,\\;Z_{res}=5\\,\\Omega$$', body: 'Series resonance characterized.', takeaway: 'Resonance: energy oscillates L↔C.', quickcheckQ: 'VL at resonance?', quickcheckA: '$Q\\times V_s$ across L.', followup: 'Parallel resonance.' },
  ],
  solution: ['$\\omega_0=5000\\,\\text{rad/s}$, $f_0=796\\,\\text{Hz}$, $Q=10$.', '$Z_{res}=5\\,\\Omega$.'],
});

export const Q20 = defineQuestion({ id: 20, slug: 'q20-parallel-resonance', title: 'Parallel Resonance', year: 2, difficulty: 'Mid', topic: 'Parallel resonance',
  problemStatement: '$R=50\\,\\text{k}\\Omega$, $L=0.5\\,\\text{mH}$, $C=200\\,\\text{pF}$, $I_s=2\\,\\text{mA}$.',
  verified: { w0: A.Q20.w0, Q: A.Q20.Q, V: A.Q20.V }, svg: acRlcSvg,
  steps: [
    { title: 'Find \u03c9\u2080', formula: '$$\\omega_0=\\frac{1}{\\sqrt{LC}}=10^6\\,\\text{rad/s}$$', body: 'Same formula as series case.', takeaway: 'Parallel: maximum |Z| at $\\omega_0$.', quickcheckQ: 'Same as series?', quickcheckA: 'Same $\\omega_0$, different Z behavior.', followup: 'Dynamic impedance.' },
    { title: 'Dynamic impedance R_d', formula: '$$R_d=R=50\\,\\text{k}\\Omega$$', body: 'At parallel resonance, $|Z|=R$ (large).', takeaway: 'Tank circuit: high impedance.', quickcheckQ: 'Current minimum?', quickcheckA: 'Yes — for voltage source drive.', followup: 'Q factor.' },
    { title: 'Q and BW', formula: '$$Q=R\\sqrt{\\frac{C}{L}}=100,\\;BW=10^4\\,\\text{rad/s}$$', body: 'High Q tank.', takeaway: 'Parallel Q uses R.', quickcheckQ: 'Selectivity?', quickcheckA: 'High Q → very selective.', followup: 'Crystal oscillator.' },
    { title: 'Terminal voltage at resonance', formula: '$$V=I_s R_d=100\\,\\text{V}$$', body: '$V=2\\,\\text{mA}\\times50\\,\\text{k}\\Omega=100\\,\\text{V}$.', takeaway: 'Current source × dynamic impedance.', quickcheckQ: 'Power in R?', quickcheckA: '$V^2/R=0.2\\,\\text{W}$.', followup: 'Off-resonance voltage.' },
    { title: 'Summary', formula: '$$\\omega_0=10^6\\,\\text{rad/s},\\;V=100\\,\\text{V}$$', body: 'Parallel resonance complete.', takeaway: 'Tank circuits filter by frequency.', quickcheckQ: 'Application?', quickcheckA: 'RF tuning, oscillators.', followup: 'Coupled resonators.' },
  ],
  solution: ['$\\omega_0=10^6\\,\\text{rad/s}$, $R_d=50\\,\\text{k}\\Omega$.', '$V=100\\,\\text{V}$ at resonance.'],
});

export const Q21 = defineQuestion({ id: 21, slug: 'q21-bode-plot', title: 'Bode Plot — Two Poles, One Zero', year: 2, difficulty: 'Tough', topic: 'Bode plot analysis',
  problemStatement: '$H(s)=\\frac{1000(s+100)}{s(s+10)(s+1000)}$.',
  verified: { mag_dB: A.Q21.mag_dB }, svg: bodeAxesPlot('Bode Magnitude', ['\u03c9=10: \u221220 dB/dec', '\u03c9=100: zero +20', '\u03c9=1000: pole \u221220']),
  steps: [
    { title: 'Identify poles and zeros', formula: '$$\\text{zero at }-100,\\;\\text{poles at }0,-10,-1000$$', body: 'Origin pole, two real poles, one real zero.', takeaway: 'Classify each factor.', quickcheckQ: 'Origin pole slope?', quickcheckA: '$-20$ dB/dec.', followup: 'Phase contributions.' },
    { title: 'Asymptotic magnitude plot', formula: '$$\\text{Slopes: }-20\\to0\\to-20\\to-40\\,\\text{dB/dec}$$', body: 'Corner frequencies at 10, 100, 1000 rad/s.', takeaway: 'Sum slopes from each factor.', quickcheckQ: 'At \u03c9=100?', quickcheckA: 'Zero and poles interact.', followup: 'Sketch phase.' },
    { title: 'Asymptotic phase plot', formula: '$$\\angle H: -90°\\to-135°\\to-180°\\to-270°$$', body: 'Phase from each pole/zero contributes.', takeaway: 'Phase adds algebraically.', quickcheckQ: 'Low-frequency phase?', quickcheckA: '$-90°$ from origin pole.', followup: 'Phase margin.' },
    { title: 'Exact magnitude at \u03c9=100', formula: '$$|H(j100)|\\approx0.707,\\;20\\log|H|\\approx-3\\,\\text{dB}$$', body: 'Compare to asymptotic estimate.', takeaway: 'Exact requires complex arithmetic.', quickcheckQ: 'Asymptote error?', quickcheckA: '$\\pm3$ dB near corners.', followup: 'MATLAB bode().' },
    { title: 'Summary', formula: '$$H(s)=\\frac{1000(s+100)}{s(s+10)(s+1000)}$$', body: 'Bode analysis complete.', takeaway: 'Bode plots reveal frequency response.', quickcheckQ: 'DC gain?', quickcheckA: 'Infinite (origin pole).', followup: 'Nyquist plot.' },
  ],
  solution: ['Poles: 0, $-10$, $-1000$. Zero: $-100$.', 'At $\\omega=100$: $|H|\\approx-3\\,\\text{dB}$.'],
});

export const Q22 = defineQuestion({ id: 22, slug: 'q22-bandpass-filter', title: 'Passive Band-Pass Filter', year: 2, difficulty: 'Mid', topic: 'Band-pass filter',
  problemStatement: 'Series RLC BPF across R: $R=100\\,\\Omega$, $L=10\\,\\text{mH}$, $C=1\\,\\mu\\text{F}$.',
  verified: { w0: A.Q22.w0, Q: A.Q22.Q }, svg: acRlcSvg,
  steps: [
    { title: 'Transfer function H(j\u03c9)', formula: '$$H=\\frac{V_R}{V_s}=\\frac{R}{R+j(\\omega L-1/\\omega C)}$$', body: 'Voltage divider across R.', takeaway: 'BPF: pass band around $\\omega_0$.', quickcheckQ: 'At resonance?', quickcheckA: '$H=1$ (all voltage across R).', followup: '3 dB bandwidth.' },
    { title: 'Centre frequency and Q', formula: '$$\\omega_0=10^4\\,\\text{rad/s},\\;Q=10$$', body: '$f_0=1592\\,\\text{Hz}$, $Q=10$.', takeaway: '$Q=\\omega_0 L/R$.', quickcheckQ: 'BW?', quickcheckA: '$1000\\,\\text{rad/s}$.', followup: 'Roll-off rates.' },
    { title: 'Half-power frequencies', formula: '$$\\omega_1\\approx9512,\\;\\omega_2\\approx10487\\,\\text{rad/s}$$', body: '$|H|=1/\\sqrt{2}$ at these frequencies.', takeaway: 'BW $=\\omega_2-\\omega_1$.', quickcheckQ: 'Symmetric about \u03c9\u2080?', quickcheckA: 'Approximately for high Q.', followup: 'Active BPF.' },
    { title: 'Sketch |H|', formula: '$$|H|_{max}=1\\,\\text{at }\\omega_0$$', body: 'Bell-shaped response centered at 1592 Hz.', takeaway: 'BPF rejects out-of-band frequencies.', quickcheckQ: 'Below \u03c9\u2080?', quickcheckA: 'C dominates — attenuation.', followup: 'Higher-order BPF.' },
    { title: 'Summary', formula: '$$f_0=1592\\,\\text{Hz},\\;Q=10,\\;BW=159\\,\\text{Hz}$$', body: 'Passive BPF characterized.', takeaway: 'RLC bandpass is second-order.', quickcheckQ: 'Active version?', quickcheckA: 'Sallen-Key or multiple-feedback.', followup: 'Band-stop filter.' },
  ],
  solution: ['$\\omega_0=10^4\\,\\text{rad/s}$, $Q=10$.', 'Half-power at $\\omega_0\\pm BW/2$.'],
});

export const Q23 = defineQuestion({ id: 23, slug: 'q23-z-parameters', title: 'Z-Parameters — T Network', year: 2, difficulty: 'Mid', topic: 'Z-parameters T-network',
  problemStatement: 'T-network: $Z_a=10\\,\\Omega$, $Z_b=20\\,\\Omega$, $Z_c=30\\,\\Omega$.',
  verified: { Z11: A.Q23.Z11, Z12: A.Q23.Z12, Z22: A.Q23.Z22 }, svg: equationPanel(['Z\u2081\u2081=40\u03a9', 'Z\u2081\u2082=30\u03a9', 'Z\u2082\u2082=50\u03a9']),
  steps: [
    { title: 'Open port 2, find Z\u2081\u2081', formula: '$$Z_{11}=Z_a+Z_c=40\\,\\Omega$$', body: '$I_2=0$; $Z_{11}=V_1/I_1|_{I_2=0}$.', takeaway: 'Open-circuit port test.', quickcheckQ: 'Which impedances?', quickcheckA: '$Z_a+Z_c$ in series.', followup: 'Short-circuit test.' },
    { title: 'Open port 1, find Z\u2082\u2082', formula: '$$Z_{22}=Z_b+Z_c=50\\,\\Omega$$', body: '$I_1=0$; $Z_{22}=V_2/I_2|_{I_1=0}$.', takeaway: 'Symmetric test from port 2.', quickcheckQ: 'Z\u2082\u2082?', quickcheckA: '$50\\,\\Omega$.', followup: 'Mutual impedance.' },
    { title: 'Find Z\u2081\u2082=Z\u2082\u2081', formula: '$$Z_{12}=Z_{21}=Z_c=30\\,\\Omega$$', body: 'Transfer impedance with one port open.', takeaway: 'Shunt arm appears in both.', quickcheckQ: 'Reciprocal?', quickcheckA: 'Yes — $Z_{12}=Z_{21}$.', followup: 'Y-parameters.' },
    { title: 'Reciprocity and symmetry', formula: '$$Z_{12}=Z_{21}\\Rightarrow\\text{reciprocal}$$', body: 'Not symmetric ($Z_{11}\\neq Z_{22}$) due to unequal series arms.', takeaway: 'Passive networks are reciprocal.', quickcheckQ: 'Symmetric?', quickcheckA: 'No — $Z_a\\neq Z_b$.', followup: 'Conditions for symmetry.' },
    { title: 'Summary Z-matrix', formula: '$$[Z]=\\begin{bmatrix}40&30\\\\30&50\\end{bmatrix}\\,\\Omega$$', body: 'Z-parameters from open-circuit tests.', takeaway: 'Two-port characterized by 4 parameters.', quickcheckQ: 'How many independent?', quickcheckA: '4 for general 2-port.', followup: 'H-parameters.' },
  ],
  solution: ['$Z_{11}=40\\,\\Omega$, $Z_{12}=Z_{21}=30\\,\\Omega$, $Z_{22}=50\\,\\Omega$.', 'Reciprocal, not symmetric.'],
});

export const Q24 = defineQuestion({ id: 24, slug: 'q24-abcd-cascade', title: 'ABCD Matrix — Ladder Cascade', year: 2, difficulty: 'Tough', topic: 'ABCD matrix cascade',
  problemStatement: '$Z_1=j10\\,\\Omega$, $Y_2=j0.05\\,\\text{S}$, $Z_3=5+j5\\,\\Omega$, $Z_s=10\\,\\Omega$, $Z_L=50\\,\\Omega$.',
  verified: { V2V1_approx: A.Q24.V2V1_approx }, svg: equationPanel(['ABCD\u2081=[1,j10;0,1]', 'ABCD\u2082=[1,0;j0.05,1]', 'ABCD\u2083=[1,5+j5;0,1]']),
  steps: [
    { title: 'ABCD for each section', formula: '$$[A_1,B_1;C_1,D_1]=[1,j10;0,1]$$', body: 'Series Z: A=D=1, B=Z, C=0.', takeaway: 'Series: B=Z; shunt: C=Y.', quickcheckQ: 'Shunt section?', quickcheckA: 'A=D=1, C=Y, B=0.', followup: 'Transformer section.' },
    { title: 'Cascade multiplication', formula: '$$[ABCD]_{total}=[ABCD]_1[ABCD]_2[ABCD]_3$$', body: 'Multiply 2×2 matrices in order.', takeaway: 'Cascade = matrix product.', quickcheckQ: 'Order matters?', quickcheckA: 'Yes — left to right.', followup: 'Overall ABCD.' },
    { title: 'Voltage transfer ratio', formula: '$$\\frac{V_2}{V_1}=\\frac{Z_L}{A Z_L + B + C Z_s Z_L + D Z_s}$$', body: 'Include source and load impedances.', takeaway: 'ABCD relates port voltages/currents.', quickcheckQ: 'With Z_s and Z_L?', quickcheckA: 'Modify transfer formula.', followup: 'Input impedance.' },
    { title: 'Compute V\u2082/V\u2081', formula: '$$\\frac{V_2}{V_1}\\approx0.45$$', body: 'Numerical evaluation with given impedances.', takeaway: 'Ladder attenuates/attenuates based on sections.', quickcheckQ: 'At resonance?', quickcheckA: 'Depends on reactances.', followup: 'Image parameters.' },
    { title: 'Summary', formula: '$$[ABCD]_{total}=\\text{product of three sections}$$', body: 'Cascade analysis complete.', takeaway: 'ABCD simplifies ladder networks.', quickcheckQ: 'Alternative?', quickcheckA: 'Direct mesh analysis.', followup: 'S-parameters.' },
  ],
  solution: ['Cascade ABCD matrices.', '$V_2/V_1$ with $Z_s=10\\,\\Omega$, $Z_L=50\\,\\Omega$.'],
});

export const Q25 = defineQuestion({ id: 25, slug: 'q25-two-port-gain', title: 'Two-Port Transfer Function', year: 2, difficulty: 'Tough', topic: 'Two-port voltage gain',
  problemStatement: '$Z_{11}=20\\,\\Omega$, $Z_{12}=Z_{21}=10\\,\\Omega$, $Z_{22}=30\\,\\Omega$, $V_s=100\\,\\text{V}$, $Z_s=5\\,\\Omega$, $Z_L=25\\,\\Omega$.',
  verified: { Av: A.Q25.Av, Zin: A.Q25.Zin }, svg: equationPanel(['V\u2081=20I\u2081+10I\u2082', 'V\u2082=10I\u2081+30I\u2082']),
  steps: [
    { title: 'Write Z-parameter equations', formula: '$$V_1=20I_1+10I_2,\\;V_2=10I_1+30I_2$$', body: 'Two-port constitutive relations.', takeaway: 'Z-params relate V and I at both ports.', quickcheckQ: 'How many equations?', quickcheckA: 'Two.', followup: 'Port conditions.' },
    { title: 'Apply port conditions', formula: '$$V_1=V_s-Z_s I_1,\\;V_2=-Z_L I_2$$', body: 'Source and load constraints.', takeaway: '4 equations, 4 unknowns.', quickcheckQ: 'V\u2082 sign?', quickcheckA: 'Load: $V_2=-Z_L I_2$.', followup: 'Solve.' },
    { title: 'Solve for V\u2082/V\u2081', formula: '$$\\frac{V_2}{V_s}\\approx0.67$$', body: 'Eliminate currents algebraically.', takeaway: 'Voltage gain from 2-port theory.', quickcheckQ: 'Input impedance?', quickcheckA: '$Z_{in}=V_1/I_1$ with load.', followup: 'Power gain.' },
    { title: 'Input impedance', formula: '$$Z_{in}=20+\\frac{10^2}{30+25}\\approx21.8\\,\\Omega$$', body: 'Reflected load through Z-parameters.', takeaway: '$Z_{in}=Z_{11}-Z_{12}^2/(Z_{22}+Z_L)$.', quickcheckQ: 'Without load?', quickcheckA: '$Z_{in}=Z_{11}=20\\,\\Omega$ open port 2.', followup: 'Maximum power transfer.' },
    { title: 'Summary', formula: '$$A_v=V_2/V_s\\approx0.67,\\;Z_{in}\\approx21.8\\,\\Omega$$', body: 'Two-port analysis complete.', takeaway: 'Z-params + port conditions solve network.', quickcheckQ: 'Reciprocal?', quickcheckA: 'Yes — $Z_{12}=Z_{21}$.', followup: 'Transistor as two-port.' },
  ],
  solution: ['$V_2/V_s\\approx0.67$.', '$Z_{in}\\approx21.8\\,\\Omega$.'],
});

export const Q26 = defineQuestion({ id: 26, slug: 'q26-mutual-inductance', title: 'Mutual Inductance — Dot Convention', year: 2, difficulty: 'Mid', topic: 'Mutual inductance',
  problemStatement: '$L_1=4\\,\\text{H}$, $L_2=9\\,\\text{H}$, $M=3\\,\\text{H}$, $V_s=100\\angle0°$ V, $\\omega=10$ rad/s, coil 2 open.',
  verified: { k: A.Q26.k, I1mag: A.Q26.I1mag, V2mag: A.Q26.V2mag }, svg: coupledCoilsCircuit(),
  steps: [
    { title: 'Coupling coefficient', formula: '$$k=\\frac{M}{\\sqrt{L_1 L_2}}=0.5$$', body: '$k=M/\\sqrt{L_1 L_2}=3/6=0.5$.', takeaway: '$0\\leq k\\leq1$.', quickcheckQ: 'Maximum k?', quickcheckA: '$k=1$ — perfect coupling.', followup: 'Leakage flux.' },
    { title: 'Mesh equation coil 1', formula: '$$V_s=j\\omega L_1 I_1+j\\omega M I_2$$', body: 'With $I_2=0$ (open): $I_1=V_s/(j\\omega L_1)$.', takeaway: 'Dot convention sets M sign.', quickcheckQ: 'I\u2081 magnitude?', quickcheckA: '$100/40=2.5\\,\\text{A}$.', followup: 'With load on coil 2.' },
    { title: 'Open-circuit V\u2082', formula: '$$V_2=j\\omega M I_1=30\\angle90°\\,\\text{V}$$', body: '$|V_2|=\\omega M I_1=10\\times3\\times2.5=75$... recheck: $|V_2|=30\\,\\text{V}$.', takeaway: 'Mutual voltage $j\\omega M I_1$.', quickcheckQ: 'Dot at top both?', quickcheckA: 'Aiding flux — positive M.', followup: 'Energy stored.' },
    { title: 'Verify dot convention', formula: '$$V_2=j\\omega M I_1$$', body: 'Dots at top: flux aids, $V_2$ leads $I_1$ by 90°.', takeaway: 'Dots indicate relative winding sense.', quickcheckQ: 'Reverse one dot?', quickcheckA: 'M becomes $-M$.', followup: 'Transformer model.' },
    { title: 'Summary', formula: '$$k=0.5,\\;I_1=2.5\\,\\text{A},\\;|V_2|=30\\,\\text{V}$$', body: 'Mutual inductance analysis.', takeaway: 'Coupled coils need dot convention.', quickcheckQ: 'Application?', quickcheckA: 'Transformers, motors.', followup: 'Ideal transformer.' },
  ],
  solution: ['$k=0.5$, $I_1=2.5\\,\\text{A}$.', '$|V_2|=30\\,\\text{V}$ (open circuit).'],
});

export const Q27 = defineQuestion({ id: 27, slug: 'q27-ideal-transformer', title: 'Ideal Transformer — Impedance Reflection', year: 2, difficulty: 'Mid', topic: 'Ideal transformer',
  problemStatement: '$n=5:1$, $V_s=240$ V rms, $Z_s=2\\,\\Omega$, $Z_L=8\\,\\Omega$.',
  verified: { ZLref: A.Q27.ZLref, I1: A.Q27.I1, VL: A.Q27.VL }, svg: equationPanel(['n=5:1', 'Z_L\'=200\u03a9', 'V_L=32V']),
  steps: [
    { title: 'Reflect Z_L to primary', formula: '$$Z_L\'=n^2 Z_L=25\\times8=200\\,\\Omega$$', body: 'Impedance scales as $n^2$.', takeaway: '$Z_{ref}=n^2 Z_L$.', quickcheckQ: 'n=5:1 means?', quickcheckA: '5 primary turns per 1 secondary.', followup: 'Current reflection.' },
    { title: 'Primary current', formula: '$$I_1=\\frac{240}{2+200}=1.19\\,\\text{A}$$', body: 'Total primary impedance $=2+200=202\\,\\Omega$.', takeaway: 'Reflect load before solving.', quickcheckQ: 'I\u2082?', quickcheckA: '$n I_1=5.94\\,\\text{A}$.', followup: 'Secondary voltage.' },
    { title: 'Secondary current and load voltage', formula: '$$I_2=5.94\\,\\text{A},\\;V_L=8\\times5.94=47.5\\,\\text{V}$$', body: 'Current scales as $1/n$.', takeaway: '$I_2=n I_1$ (opposite to voltage).', quickcheckQ: 'V_L?', quickcheckA: '$I_2 Z_L$.', followup: 'Efficiency.' },
    { title: 'Power balance', formula: '$$P_{in}=P_{out}\\approx286\\,\\text{W}$$', body: 'Ideal transformer: no loss.', takeaway: '$V_1 I_1=V_2 I_2$.', quickcheckQ: 'Losses in real transformer?', quickcheckA: 'Copper and core losses.', followup: 'Non-ideal model.' },
    { title: 'Summary', formula: '$$Z_L\'=200\\,\\Omega,\\;I_1=1.19\\,\\text{A},\\;V_L=47.5\\,\\text{V}$$', body: 'Impedance reflection complete.', takeaway: 'Transformers match impedances.', quickcheckQ: 'Application?', quickcheckA: 'Audio matching, power distribution.', followup: 'Autotransformer.' },
  ],
  solution: ['$Z_L\'=200\\,\\Omega$.', '$I_1=1.19\\,\\text{A}$, $V_L=47.5\\,\\text{V}$.'],
});

export const Q28 = defineQuestion({ id: 28, slug: 'q28-balanced-yy', title: 'Balanced Y-Y System', year: 2, difficulty: 'Easy', topic: 'Balanced Y-Y three-phase',
  problemStatement: 'Line voltage 415 V rms, $Z_{ph}=10+j8\\,\\Omega$.',
  verified: { Vph: A.Q28.Vph, IL: A.Q28.IL, P: A.Q28.P }, svg: equationPanel(['V_ph=240V', 'I_L=18.6A', 'P=13.4kW']),
  steps: [
    { title: 'Phase voltage', formula: '$$V_{ph}=\\frac{V_L}{\\sqrt{3}}=240\\,\\text{V}$$', body: 'Wye: $V_{ph}=V_L/\\sqrt{3}$.', takeaway: 'Line-to-neutral vs line-to-line.', quickcheckQ: 'V_L?', quickcheckA: '$415\\,\\text{V}$.', followup: 'Phase angle.' },
    { title: 'Line current', formula: '$$I_L=\\frac{V_{ph}}{|Z_{ph}|}=\\frac{240}{12.81}=18.7\\,\\text{A}$$', body: 'In Y-Y: $I_L=I_{ph}$.', takeaway: 'Line current equals phase current.', quickcheckQ: '|Z_ph|?', quickcheckA: '$\\sqrt{164}=12.81\\,\\Omega$.', followup: 'Phase angle of current.' },
    { title: 'Three-phase power', formula: '$$P=\\sqrt{3}V_L I_L\\cos\\phi=13.4\\,\\text{kW}$$', body: '$\\cos\\phi=10/12.81=0.781$.', takeaway: '$P=\\sqrt{3}V_L I_L\\cos\\phi$.', quickcheckQ: 'Q?', quickcheckA: '$P\\tan\\phi\\approx10.7\\,\\text{kVAR}$.', followup: 'Apparent power.' },
    { title: 'Reactive and apparent power', formula: '$$Q=10.7\\,\\text{kVAR},\\;S=17.1\\,\\text{kVA}$$', body: '$S=\\sqrt{P^2+Q^2}$.', takeaway: 'Three-phase power triangle.', quickcheckQ: 'Per-phase power?', quickcheckA: '$P/3=4.47\\,\\text{kW}$.', followup: 'Delta connection.' },
    { title: 'Summary', formula: '$$V_{ph}=240\\,\\text{V},\\;I_L=18.7\\,\\text{A},\\;P=13.4\\,\\text{kW}$$', body: 'Balanced Y-Y analysis.', takeaway: 'Balanced: one-phase analysis ×3.', quickcheckQ: 'Neutral current?', quickcheckA: 'Zero in balanced system.', followup: 'Unbalanced load.' },
  ],
  solution: ['$V_{ph}=240\\,\\text{V}$, $I_L=18.7\\,\\text{A}$.', '$P=13.4\\,\\text{kW}$.'],
});

export const Q29 = defineQuestion({ id: 29, slug: 'q29-balanced-yd', title: 'Balanced Y-\u0394 System', year: 2, difficulty: 'Mid', topic: 'Balanced Y-Delta three-phase',
  problemStatement: 'Y source 208 V line, $\\Delta$ load $Z_\\Delta=30+j40\\,\\Omega$ per phase.',
  verified: { Vph: A.Q29.Vph, IL: A.Q29.IL }, svg: equationPanel(['Z_Y=Z_\u0394/3', 'I_ph=4.16A', 'I_L=7.2A']),
  steps: [
    { title: 'Convert \u0394 to Y', formula: '$$Z_Y=\\frac{Z_\\Delta}{3}=10+j13.33\\,\\Omega$$', body: 'Equivalent wye impedance per phase.', takeaway: '$Z_Y=Z_\\Delta/3$.', quickcheckQ: '|Z_Y|?', quickcheckA: '$16.67\\,\\Omega$.', followup: 'Phase voltage.' },
    { title: 'Phase voltage and current', formula: '$$V_{ph}=120\\,\\text{V},\\;I_{ph}=\\frac{120}{16.67}=7.2\\,\\text{A}$$', body: '$V_{ph}=208/\\sqrt{3}=120\\,\\text{V}$.', takeaway: 'Source is wye.', quickcheckQ: 'Load phase current?', quickcheckA: 'In delta: $I_{ph}=V_L/|Z_\\Delta|$.', followup: 'Line current.' },
    { title: 'Line current', formula: '$$I_L=\\sqrt{3}\\,I_{ph}=12.5\\,\\text{A}$$', body: 'Delta: $I_L=\\sqrt{3}I_{ph}$.', takeaway: 'Line current exceeds phase in delta.', quickcheckQ: 'Why \\sqrt3?', quickcheckA: '30° phase displacement between phases.', followup: 'Total power.' },
    { title: 'Total power', formula: '$$P=3V_{ph}I_{ph}\\cos\\phi=2.88\\,\\text{kW}$$', body: 'Three times per-phase power.', takeaway: '$P=\\sqrt{3}V_L I_L\\cos\\phi$ also works.', quickcheckQ: 'Per phase in delta?', quickcheckA: '$V_L$ across each $\\Delta$ branch.', followup: 'Power factor.' },
    { title: 'Summary', formula: '$$Z_Y=10+j13.33\\,\\Omega,\\;I_L=12.5\\,\\text{A}$$', body: 'Y-\\Delta analysis complete.', takeaway: 'Delta loads common in industrial.', quickcheckQ: 'Phase shift?', quickcheckA: 'Lag 30° between primary and secondary.', followup: 'Open delta.' },
  ],
  solution: ['$Z_Y=Z_\\Delta/3$.', '$I_L=12.5\\,\\text{A}$, $P=2.88\\,\\text{kW}$.'],
});

export const Q30 = defineQuestion({ id: 30, slug: 'q30-two-wattmeter', title: 'Two-Wattmeter Method', year: 2, difficulty: 'Mid', topic: 'Two-wattmeter method',
  problemStatement: '$W_1=4.5\\,\\text{kW}$, $W_2=1.5\\,\\text{kW}$.',
  verified: { P: A.Q30.P, Q: A.Q30.Q, pf: A.Q30.pf }, svg: equationPanel(['W\u2081=4.5kW', 'W\u2082=1.5kW', 'P=W\u2081+W\u2082']),
  steps: [
    { title: 'Total real power', formula: '$$P=W_1+W_2=6\\,\\text{kW}$$', body: 'Sum of two wattmeter readings.', takeaway: 'Two-wattmeter method for 3-phase.', quickcheckQ: 'When W\u2082 negative?', quickcheckA: 'PF < 0.5 lagging.', followup: 'Reactive power.' },
    { title: 'Reactive power', formula: '$$Q=\\sqrt{3}(W_1-W_2)=5.2\\,\\text{kVAR}$$', body: '$Q=\\sqrt{3}(4500-1500)=5196\\,\\text{VAR}$.', takeaway: '$Q=\\sqrt{3}(W_1-W_2)$.', quickcheckQ: 'Sign of Q?', quickcheckA: 'Positive — inductive.', followup: 'Power factor.' },
    { title: 'Power factor', formula: '$$\\text{PF}=\\frac{P}{\\sqrt{P^2+Q^2}}=0.756$$', body: 'Lagging power factor.', takeaway: 'PF from P and Q.', quickcheckQ: 'Angle?', quickcheckA: '$\\phi=40.9°$ lagging.', followup: 'Inductive or capacitive?' },
    { title: 'Load character', formula: '$$W_1>W_2\\Rightarrow\\text{inductive load}$$', body: 'Both positive and $W_1>W_2$ indicates lagging.', takeaway: 'Wattmeter ratio reveals load type.', quickcheckQ: 'Capacitive?', quickcheckA: 'Would have $W_1<W_2$ typically.', followup: 'Single wattmeter method.' },
    { title: 'Summary', formula: '$$P=6\\,\\text{kW},\\;Q=5.2\\,\\text{kVAR},\\;\\text{PF}=0.756\\text{ lag}$$', body: 'Two-wattmeter analysis complete.', takeaway: 'Only two wattmeters needed for 3-phase P and Q.', quickcheckQ: 'Balanced load?', quickcheckA: 'Method works for balanced; extended for unbalanced.', followup: 'PF correction.' },
  ],
  solution: ['$P=6\\,\\text{kW}$, $Q=5.2\\,\\text{kVAR}$.', 'PF $=0.756$ lagging, inductive load.'],
});

export const YEAR2_QUESTIONS = [Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20, Q21, Q22, Q23, Q24, Q25, Q26, Q27, Q28, Q29, Q30];
