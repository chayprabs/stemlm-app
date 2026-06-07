import { defineQuestion } from '../define-question';
import { wrapSvg } from '../circuit-svg';
import { equationPanel, bodeAxesPlot } from '../question-factory';
import * as A from '../verified-answers';

const hybridPiSvg = wrapSvg([
  '<line x1="80" y1="40" x2="80" y2="95" stroke="#333" stroke-width="2"/>',
  '<text x="95" y="72" font-size="10">r\u03c0</text>',
  '<text x="80" y="28" font-size="10" font-weight="bold" text-anchor="middle">B</text>',
  '<line x1="80" y1="95" x2="80" y2="140" stroke="#333" stroke-width="2"/>',
  '<text x="108" y="128" font-size="10">R_E</text>',
  '<text x="80" y="155" font-size="10" font-weight="bold" text-anchor="middle">E</text>',
  '<line x1="80" y1="40" x2="170" y2="40" stroke="#333" stroke-width="2"/>',
  '<line x1="170" y1="40" x2="170" y2="75" stroke="#333" stroke-width="2"/>',
  '<text x="185" y="62" font-size="10">R_C</text>',
  '<text x="170" y="28" font-size="10" font-weight="bold" text-anchor="middle">C</text>',
  '<polygon points="130,85 155,95 130,105 105,95" fill="none" stroke="#333" stroke-width="2"/>',
  '<text x="138" y="118" font-size="9">g_m v_be</text>',
  '<text x="28" y="72" font-size="10">v_in</text>',
  '<line x1="28" y1="72" x2="80" y2="72" stroke="#333" stroke-width="1.5"/>',
].join(''), 220, 175);

const opampSvg = wrapSvg([
  '<polygon points="140,70 210,45 210,95 140,70" fill="none" stroke="#333" stroke-width="2"/>',
  '<text x="152" y="58" font-size="11">+</text>',
  '<text x="152" y="82" font-size="11">\u2212</text>',
  '<line x1="60" y1="82" x2="140" y2="82" stroke="#333" stroke-width="2"/>',
  '<line x1="60" y1="58" x2="140" y2="58" stroke="#333" stroke-width="2"/>',
  '<text x="28" y="62" font-size="10">V\u2081</text>',
  '<text x="28" y="86" font-size="10">V\u2082</text>',
  '<line x1="210" y1="70" x2="270" y2="70" stroke="#333" stroke-width="2"/>',
  '<text x="278" y="74" font-size="10">V_out</text>',
  '<line x1="210" y1="70" x2="240" y2="55" stroke="#333" stroke-width="1.5"/>',
  '<line x1="240" y1="55" x2="240" y2="30" stroke="#333" stroke-width="1.5"/>',
  '<text x="248" y="28" font-size="9">R_f</text>',
].join(''), 310, 120);

function bjtStep(id: number, slug: string, title: string, topic: string, problem: string, verified: Record<string, number>, steps: Parameters<typeof defineQuestion>[0]['steps']) {
  return defineQuestion({ id, slug, title, year: 3, difficulty: 'Mid', topic, problemStatement: problem, verified, svg: hybridPiSvg, solutionSvg: hybridPiSvg, steps, solution: [steps[steps.length - 1]?.formula ?? ''] });
}

export const Q31 = bjtStep(31, 'q31-ce-amplifier', 'CE Amplifier — Hybrid-\u03c0 Midband', 'BJT CE hybrid-pi midband',
  '$I_C=2\\,\\text{mA}$, $\\beta=100$, $V_A=80\\,\\text{V}$, $R_C=5\\,\\text{k}\\Omega$, $R_S=1\\,\\text{k}\\Omega$.',
  { gm: A.Q31.gm, rpi: A.Q31.rpi, ro: A.Q31.ro, Av: A.Q31.Av },
  [
    { title: 'Compute g_m, r_\u03c0, r_o', formula: '$$g_m=\\frac{I_C}{V_T}=76.9\\,\\text{mS},\\;r_\\pi=\\frac{\\beta}{g_m}=1.3\\,\\text{k}\\Omega,\\;r_o=\\frac{V_A}{I_C}=40\\,\\text{k}\\Omega$$', body: '$V_T=26\\,\\text{mV}$ at room temperature.', takeaway: 'Hybrid-\u03c0 parameters from bias.', quickcheckQ: 'g_m at 2 mA?', quickcheckA: '$\\approx77\\,\\text{mS}$.', followup: 'Temperature effect.' },
    { title: 'Voltage gain A_v', formula: '$$A_v=-g_m(r_o\\|R_C)\\approx-196$$', body: 'Common-emitter inverting gain.', takeaway: '$A_v=-g_m R_{out}$.', quickcheckQ: 'Sign?', quickcheckA: 'Negative — inversion.', followup: 'With emitter degeneration.' },
    { title: 'Input resistance R_in', formula: '$$R_{in}=r_\\pi+R_S=2.3\\,\\text{k}\\Omega$$', body: 'Series source resistance adds.', takeaway: '$R_{in}=R_S+r_\\pi$ at base.', quickcheckQ: 'Without R_S?', quickcheckA: '$R_{in}=r_\\pi$.', followup: 'Loading effect.' },
    { title: 'Output resistance R_out', formula: '$$R_{out}=r_o\\|R_C=4.65\\,\\text{k}\\Omega$$', body: 'Parallel combination at collector.', takeaway: '$R_{out}=r_o\\|R_C$.', quickcheckQ: 'If R_C very large?', quickcheckA: '$R_{out}\\approx r_o$.', followup: 'Cascode output resistance.' },
    { title: 'Summary', formula: '$$A_v\\approx-196,\\;R_{in}=2.3\\,\\text{k}\\Omega,\\;R_{out}=4.65\\,\\text{k}\\Omega$$', body: 'CE midband analysis complete.', takeaway: 'Hybrid-\u03c0 model for BJT AC.', quickcheckQ: 'Bandwidth?', quickcheckA: 'Limited by C_\u03c0 Miller effect.', followup: 'Miller approximation.' },
  ]);

export const Q32 = defineQuestion({ id: 32, slug: 'q32-miller-bandwidth', title: 'Miller Approximation — Bandwidth', year: 3, difficulty: 'Mid', topic: 'Miller effect bandwidth',
  problemStatement: 'Same BJT as Q31 with $C_\\pi=15\\,\\text{pF}$, $C_\\mu=2\\,\\text{pF}$.',
  verified: { CM: A.Q32.CM, Cin: A.Q32.Cin, f3dB: A.Q32.f3dB }, svg: hybridPiSvg,
  steps: [
    { title: 'Miller capacitance', formula: '$$C_M=C_\\mu(1-A_v)=2(1+196)=394\\,\\text{pF}$$', body: '$C_\\mu$ multiplied by $(1-A_v)$ at input.', takeaway: 'Miller: $C_M=C(1-A_v)$.', quickcheckQ: 'Why amplified?', quickcheckA: 'Feedback through C_\u03bc.', followup: 'Output Miller.' },
    { title: 'Total input capacitance', formula: '$$C_{in}=C_\\pi+C_M=409\\,\\text{pF}$$', body: 'Dominated by Miller term.', takeaway: 'C_\u03c0 plus Miller C_\u03bc.', quickcheckQ: 'Without Miller?', quickcheckA: 'Only 15 pF — much wider BW.', followup: 'f_{3dB}.' },
    { title: '3 dB bandwidth', formula: '$$f_{3dB}=\\frac{1}{2\\pi R_{in}C_{in}}\\approx170\\,\\text{kHz}$$', body: '$R_{in}=R_S\\|r_\\pi\\approx870\\,\\Omega$.', takeaway: 'Dominant pole at input.', quickcheckQ: 'GBW product?', quickcheckA: '$|A_v|f_{3dB}\\approx$ constant.', followup: 'Cascode to reduce Miller.' },
    { title: 'Why Miller overestimates at high f', formula: '$$C_M \\text{ valid only when } A_v \\text{ is frequency-independent}$$', body: 'As $A_v$ rolls off, Miller effect weakens.', takeaway: 'Miller is midband approximation.', quickcheckQ: 'At high f?', quickcheckA: '$A_v$ drops → less Miller multiplication.', followup: 'Exact pole-zero analysis.' },
    { title: 'Summary', formula: '$$C_M\\approx394\\,\\text{pF},\\;f_{3dB}\\approx170\\,\\text{kHz}$$', body: 'Miller bandwidth analysis.', takeaway: 'Miller limits CE amplifier BW.', quickcheckQ: 'Fix?', quickcheckA: 'Cascode or common-base second stage.', followup: 'Emitter degeneration tradeoff.' },
  ],
  solution: ['$C_M\\approx394\\,\\text{pF}$.', '$f_{3dB}\\approx170\\,\\text{kHz}$.'],
});

export const Q33 = defineQuestion({ id: 33, slug: 'q33-emitter-degeneration', title: 'Emitter Degeneration', year: 3, difficulty: 'Mid', topic: 'Emitter degeneration',
  problemStatement: '$R_E=500\\,\\Omega$ unbypassed, $R_C=5\\,\\text{k}\\Omega$, $g_m=40\\,\\text{mA/V}$, $r_\\pi=2.5\\,\\text{k}\\Omega$, $r_o=50\\,\\text{k}\\Omega$.',
  verified: { Gm: A.Q33.Gm, Av: A.Q33.Av, Rin: A.Q33.Rin }, svg: hybridPiSvg,
  steps: [
    { title: 'Effective transconductance', formula: '$$G_m=\\frac{g_m}{1+g_m R_E}=\\frac{40}{21}=1.9\\,\\text{mS}$$', body: 'Degeneration reduces $G_m$.', takeaway: '$G_m=g_m/(1+g_m R_E)$.', quickcheckQ: 'If R_E bypassed?', quickcheckA: '$G_m=g_m=40\\,\\text{mS}$.', followup: 'Local feedback.' },
    { title: 'Voltage gain with degeneration', formula: '$$A_v=-G_m(r_o\\|R_C)\\approx-9.1$$', body: 'Much lower than without $R_E$.', takeaway: 'Gain trades for linearity.', quickcheckQ: 'Compare to CE without R_E?', quickcheckA: '$\\sim20\\times$ lower.', followup: 'Input resistance.' },
    { title: 'Input resistance increase', formula: '$$R_{in}=r_\\pi+(1+g_m R_E)R_E\\approx22.8\\,\\text{k}\\Omega$$', body: 'Increases by factor $(1+g_m R_E)$.', takeaway: 'Degeneration raises $R_{in}$.', quickcheckQ: 'By how much?', quickcheckA: '$\\approx9\\times$ over $r_\\pi$ alone.', followup: 'Output resistance.' },
    { title: 'Gain-bandwidth tradeoff', formula: '$$\\text{Lower }A_v\\Rightarrow\\text{ less Miller}\\Rightarrow\\text{ wider BW}$$', body: 'Reduced gain reduces $C_M$, extending bandwidth.', takeaway: 'GBW tradeoff via degeneration.', quickcheckQ: 'Linearity?', quickcheckA: 'Improved — local negative feedback.', followup: 'Partial bypass capacitor.' },
    { title: 'Summary', formula: '$$G_m=1.9\\,\\text{mS},\\;A_v\\approx-9.1,\\;R_{in}\\approx22.8\\,\\text{k}\\Omega$$', body: 'Emitter degeneration analysis.', takeaway: 'Trade gain for linearity, $R_{in}$, BW.', quickcheckQ: 'When use?', quickcheckA: 'When linearity or $R_{in}$ matters.', followup: 'Differential pair.' },
  ],
  solution: ['$A_v\\approx-9.1$, $R_{in}\\approx22.8\\,\\text{k}\\Omega$.', 'Gain-bandwidth tradeoff via degeneration.'],
});

export const Q34 = defineQuestion({ id: 34, slug: 'q34-cascode', title: 'Cascode Amplifier', year: 3, difficulty: 'Tough', topic: 'Cascode amplifier',
  problemStatement: 'CE ($g_{m1}=40\\,\\text{mA/V}$, $r_{o1}=50\\,\\text{k}\\Omega$) + CB ($g_{m2}=40\\,\\text{mA/V}$, $r_{o2}=50\\,\\text{k}\\Omega$), $R_L=10\\,\\text{k}\\Omega$.',
  verified: { Rout: A.Q34.Rout, Av: A.Q34.Av }, svg: hybridPiSvg,
  steps: [
    { title: 'Cascode output resistance', formula: '$$R_{out}\\approx g_{m2}r_{o2}r_{o1}=100\\,\\text{M}\\Omega$$', body: 'Cascode bootstraps $r_{o1}$.', takeaway: '$R_{out}\\approx g_m r_o^2$.', quickcheckQ: 'vs single CE?', quickcheckA: '$\\sim g_m r_o$ times larger.', followup: 'Exact formula.' },
    { title: 'Overall voltage gain', formula: '$$A_v\\approx-g_{m1}(r_{o1}\\|R_{cascode}\\|R_L)\\approx-267$$', body: 'High output resistance boosts gain.', takeaway: 'Cascode maintains voltage gain.', quickcheckQ: 'vs CE alone?', quickcheckA: 'Similar midband $A_v$ but wider BW.', followup: 'Miller effect.' },
    { title: 'Miller effect elimination', formula: '$$C_{\\mu1} \\text{ sees low impedance at collector of CE}$$', body: 'CB stage presents $1/g_{m2}$ at CE collector.', takeaway: 'Low $Z$ at CE output reduces Miller.', quickcheckQ: 'C_\u03bc at Q1?', quickcheckA: 'Not multiplied by large $A_v$.', followup: 'Frequency response.' },
    { title: 'Bandwidth advantage', formula: '$$f_{3dB,cascode} \\gg f_{3dB,CE}$$', body: 'Miller capacitance greatly reduced.', takeaway: 'Cascode for wideband amplification.', quickcheckQ: 'Cost?', quickcheckA: 'Extra transistor, reduced output swing.', followup: 'Folded cascode.' },
    { title: 'Summary', formula: '$$R_{out}\\approx100\\,\\text{M}\\Omega,\\;A_v\\approx-267$$', body: 'Cascode analysis complete.', takeaway: 'Cascode: high gain + wide BW.', quickcheckQ: 'Application?', quickcheckA: 'RF, high-speed analog ICs.', followup: 'Wilson current mirror.' },
  ],
  solution: ['$R_{out}\\approx g_{m2}r_{o2}r_{o1}$.', 'Miller effect on $C_\\mu$ largely eliminated.'],
});

export const Q35 = defineQuestion({ id: 35, slug: 'q35-cs-amplifier', title: 'CS Amplifier — Small-Signal', year: 3, difficulty: 'Mid', topic: 'MOSFET CS amplifier',
  problemStatement: '$k_n=2\\,\\text{mA/V}^2$, $V_{TN}=1\\,\\text{V}$, $V_{GS}=2\\,\\text{V}$, $\\lambda=0.02\\,\\text{V}^{-1}$, $R_D=10\\,\\text{k}\\Omega$.',
  verified: { gm: A.Q35.gm, ro: A.Q35.ro, Av: A.Q35.Av }, svg: wrapSvg([
    '<line x1="40" y1="80" x2="100" y2="80" stroke="#333" stroke-width="2"/>',
    '<line x1="100" y1="80" x2="100" y2="50" stroke="#333" stroke-width="2"/>',
    '<rect x="85" y="30" width="30" height="20" fill="none" stroke="#333" stroke-width="2"/>',
    '<text x="100" y="44" font-size="9" text-anchor="middle">NMOS</text>',
    '<line x1="100" y1="80" x2="180" y2="80" stroke="#333" stroke-width="2"/>',
    '<polyline points="180,80 192,66 207,94 222,66 237,94 250,80" fill="none" stroke="#333" stroke-width="2"/>',
    '<text x="215" y="60" font-size="10" text-anchor="middle">R_D=10k\u03a9</text>',
    '<line x1="250" y1="80" x2="280" y2="80" stroke="#333" stroke-width="2"/>',
    '<line x1="40" y1="80" x2="40" y2="140" stroke="#333" stroke-width="2"/>',
    '<line x1="280" y1="80" x2="280" y2="140" stroke="#333" stroke-width="2"/>',
    '<line x1="40" y1="140" x2="280" y2="140" stroke="#333" stroke-width="2"/>',
    '<text x="20" y="84" font-size="10">v_in</text>',
    '<text x="288" y="84" font-size="10">v_out</text>',
  ].join(''), 310, 160),
  steps: [
    { title: 'Find g_m and r_o', formula: '$$g_m=2k_n(V_{GS}-V_{TN})=4\\,\\text{mA/V},\\;r_o=\\frac{1}{\\lambda I_D}=25\\,\\text{k}\\Omega$$', body: '$I_D=k_n(V_{GS}-V_{TN})^2=2\\,\\text{mA}$.', takeaway: '$g_m=2k_n(V_{GS}-V_{TN})$.', quickcheckQ: 'r_o?', quickcheckA: '$1/(\\lambda I_D)=25\\,\\text{k}\\Omega$.', followup: 'Body effect.' },
    { title: 'Voltage gain', formula: '$$A_v=-g_m(r_o\\|R_D)=-3.2$$', body: 'Common-source inverting gain.', takeaway: '$A_v=-g_m(r_o\\|R_D)$.', quickcheckQ: 'Sign?', quickcheckA: 'Negative.', followup: 'Source degeneration.' },
    { title: 'R_in and R_out', formula: '$$R_{in}=\\infty,\\;R_{out}=r_o\\|R_D=7.1\\,\\text{k}\\Omega$$', body: 'MOS gate has infinite DC input resistance.', takeaway: 'MOS: $R_{in}=\\infty$ (ideal).', quickcheckQ: 'Practical R_in?', quickcheckA: 'Limited by gate oxide leakage.', followup: 'Source follower.' },
    { title: 'Verify bias point', formula: '$$V_{DS}=5\\,\\text{V}>V_{GS}-V_{TN}$$', body: 'Saturation region confirmed.', takeaway: 'Must be in saturation for amplifier.', quickcheckQ: 'Triode?', quickcheckA: '$V_{DS}<V_{GS}-V_{TN}$.', followup: 'Bias circuit design.' },
    { title: 'Summary', formula: '$$g_m=4\\,\\text{mA/V},\\;A_v=-3.2,\\;R_{out}=7.1\\,\\text{k}\\Omega$$', body: 'CS amplifier analysis.', takeaway: 'MOS CS similar to BJT CE.', quickcheckQ: 'Compare to BJT?', quickcheckA: '$R_{in}$ much higher for MOS.', followup: 'CMOS inverter.' },
  ],
  solution: ['$g_m=4\\,\\text{mA/V}$, $A_v=-3.2$.', '$R_{in}=\\infty$, $R_{out}=7.1\\,\\text{k}\\Omega$.'],
});

export const Q36 = defineQuestion({ id: 36, slug: 'q36-diff-pair', title: 'MOSFET Differential Pair', year: 3, difficulty: 'Tough', topic: 'MOSFET differential pair',
  problemStatement: '$g_m=5\\,\\text{mA/V}$, $r_o=100\\,\\text{k}\\Omega$, $R_{SS}=500\\,\\text{k}\\Omega$, $R_D=20\\,\\text{k}\\Omega$.',
  verified: { Ad: A.Q36.Ad, Acm: A.Q36.Acm, CMRRdB: A.Q36.CMRRdB }, svg: wrapSvg([
    '<line x1="60" y1="100" x2="120" y2="100" stroke="#333" stroke-width="2"/>',
    '<rect x="115" y="70" width="24" height="30" fill="none" stroke="#333" stroke-width="2"/>',
    '<rect x="175" y="70" width="24" height="30" fill="none" stroke="#333" stroke-width="2"/>',
    '<text x="127" y="88" font-size="8" text-anchor="middle">M1</text>',
    '<text x="187" y="88" font-size="8" text-anchor="middle">M2</text>',
    '<line x1="127" y1="100" x2="127" y2="130" stroke="#333" stroke-width="2"/>',
    '<line x1="187" y1="100" x2="187" y2="130" stroke="#333" stroke-width="2"/>',
    '<line x1="127" y1="130" x2="187" y2="130" stroke="#333" stroke-width="2"/>',
    '<line x1="157" y1="130" x2="157" y2="155" stroke="#333" stroke-width="2"/>',
    '<circle cx="157" cy="165" r="10" fill="none" stroke="#333" stroke-width="2"/>',
    '<text x="157" y="169" font-size="8" text-anchor="middle">I_SS</text>',
    '<text x="100" y="60" font-size="10">Diff Pair</text>',
    '<text x="220" y="78" font-size="9">R_D=20k</text>',
  ].join(''), 280, 190),
  steps: [
    { title: 'Differential gain', formula: '$$A_d=-g_m R_D=-100$$', body: 'Half-circuit on M1 with tail resistance $2R_{SS}$.', takeaway: '$A_d=-g_m R_D$.', quickcheckQ: 'Sign?', quickcheckA: 'Negative — inversion.', followup: 'Common-mode.' },
    { title: 'Common-mode gain', formula: '$$A_{cm}\\approx-\\frac{R_D}{2R_{SS}}=-0.02$$', body: 'Tail resistance provides CM rejection.', takeaway: '$A_{cm}\\approx-R_D/(2R_{SS})$.', quickcheckQ: 'Large R_SS?', quickcheckA: 'Lower $A_{cm}$.', followup: 'CMRR.' },
    { title: 'CMRR in dB', formula: '$$\\text{CMRR}=20\\log|A_d/A_{cm}|\\approx74\\,\\text{dB}$$', body: '$|A_d/A_{cm}|\\approx5000$.', takeaway: 'CMRR measures differential vs CM rejection.', quickcheckQ: 'Higher is better?', quickcheckA: 'Yes — better CM rejection.', followup: 'Active tail.' },
    { title: 'Effect of higher R_SS', formula: '$$R_{SS}\\uparrow\\Rightarrow A_{cm}\\downarrow\\Rightarrow\\text{CMRR}\\uparrow$$', body: 'Ideal tail: $R_{SS}\\to\\infty$ (current source).', takeaway: 'Current source tail maximizes CMRR.', quickcheckQ: 'Why?', quickcheckA: 'CM signal sees large degeneration.', followup: 'Current mirror tail.' },
    { title: 'Summary', formula: '$$A_d=-100,\\;A_{cm}=-0.02,\\;\\text{CMRR}=74\\,\\text{dB}$$', body: 'Differential pair analysis.', takeaway: 'Foundation of op-amp input stage.', quickcheckQ: 'Application?', quickcheckA: 'Instrumentation amplifiers.', followup: 'Offset voltage.' },
  ],
  solution: ['$A_d=-100$, CMRR $\\approx74\\,\\text{dB}$.', 'Higher $R_{SS}$ improves CMRR.'],
});

export const Q37 = defineQuestion({ id: 37, slug: 'q37-source-follower', title: 'Source Follower (CD)', year: 3, difficulty: 'Easy', topic: 'MOSFET source follower',
  problemStatement: '$g_m=4\\,\\text{mA/V}$, $r_o=40\\,\\text{k}\\Omega$, $R_S=5\\,\\text{k}\\Omega$, $R_L=10\\,\\text{k}\\Omega$.',
  verified: { Av: A.Q37.Av, Rout: A.Q37.Rout }, svg: wrapSvg([
    '<line x1="40" y1="80" x2="100" y2="80" stroke="#333" stroke-width="2"/>',
    '<rect x="95" y="55" width="28" height="24" fill="none" stroke="#333" stroke-width="2"/>',
    '<text x="109" y="70" font-size="8" text-anchor="middle">NMOS</text>',
    '<line x1="109" y1="79" x2="109" y2="120" stroke="#333" stroke-width="2"/>',
    '<polyline points="109,120 121,108 136,132 151,108 166,132 181,120" fill="none" stroke="#333" stroke-width="2"/>',
    '<text x="145" y="100" font-size="9">R_S=5k\u03a9</text>',
    '<line x1="181" y1="120" x2="220" y2="120" stroke="#333" stroke-width="2"/>',
    '<text x="228" y="124" font-size="9">R_L=10k\u03a9</text>',
    '<text x="18" y="84" font-size="10">v_in</text>',
    '<text x="228" y="108" font-size="9">v_out</text>',
  ].join(''), 280, 160),
  steps: [
    { title: 'Voltage gain', formula: '$$A_v=\\frac{g_m(r_o\\|R_S\\|R_L)}{1+g_m(r_o\\|R_S\\|R_L)}\\approx0.95$$', body: 'Unity-gain buffer (slightly less than 1).', takeaway: 'CD: $A_v<1$, non-inverting.', quickcheckQ: 'Why <1?', quickcheckA: '$V_{gs}$ reduces $V_{out}$ below $V_{in}$.', followup: 'Exact vs approximate.' },
    { title: 'Output resistance', formula: '$$R_{out}=\\frac{1}{g_m}\\|r_o\\|R_S\\approx250\\,\\Omega$$', body: 'Low output impedance — good buffer.', takeaway: '$R_{out}\\approx1/g_m$.', quickcheckQ: 'Buffer use?', quickcheckA: 'Impedance transformation.', followup: 'Emitter follower comparison.' },
    { title: 'Why used as buffer', formula: '$$R_{in}\\approx\\infty,\\;R_{out}\\approx\\frac{1}{g_m}$$', body: 'High input Z, low output Z, unity gain.', takeaway: 'Buffers isolate stages.', quickcheckQ: 'Power gain?', quickcheckA: 'Current gain — voltage $\\approx$ unity.', followup: 'Push-pull follower.' },
    { title: 'Exact vs approximate', formula: '$$A_v\\approx0.95\\text{ (exact)},\\;A_v\\approx\\frac{g_m R_L}{1+g_m R_L}\\text{ if }r_o\\to\\infty$$', body: 'Finite $r_o$ slightly reduces gain.', takeaway: 'Check when $r_o$ is comparable to load.', quickcheckQ: 'When approximate fails?', quickcheckA: 'Short-channel devices, low $g_m$.', followup: 'Bandwidth of follower.' },
    { title: 'Summary', formula: '$$A_v\\approx0.95,\\;R_{out}\\approx250\\,\\Omega$$', body: 'Source follower analysis.', takeaway: 'CD = unity-gain buffer.', quickcheckQ: 'BJT equivalent?', quickcheckA: 'Emitter follower.', followup: 'Class AB output stage.' },
  ],
  solution: ['$A_v\\approx0.95$, $R_{out}\\approx250\\,\\Omega$.', 'Used as high-$Z_{in}$ low-$Z_{out}$ buffer.'],
});

export const Q38 = defineQuestion({ id: 38, slug: 'q38-inverting-summer', title: 'Inverting Summing Amplifier', year: 3, difficulty: 'Mid', topic: 'Op-amp inverting summer',
  problemStatement: '$R_1=10\\,\\text{k}\\Omega$, $R_2=20\\,\\text{k}\\Omega$, $R_3=40\\,\\text{k}\\Omega$, $R_f=80\\,\\text{k}\\Omega$. $V_1=1\\,\\text{V}$, $V_2=-2\\,\\text{V}$, $V_3=0.5\\,\\text{V}$.',
  verified: { Vout: A.Q38.Vout, Rf_equal: A.Q38.Rf_equal }, svg: opampSvg,
  steps: [
    { title: 'Output expression', formula: '$$V_{out}=-\\frac{R_f}{R_1}V_1-\\frac{R_f}{R_2}V_2-\\frac{R_f}{R_3}V_3$$', body: 'Superposition of inverting inputs.', takeaway: 'Each input weighted by $-R_f/R_i$.', quickcheckQ: 'Virtual ground?', quickcheckA: 'Inverting input at 0 V.', followup: 'Non-inverting summer.' },
    { title: 'Compute V_out', formula: '$$V_{out}=-8(1)+(-4)(-2)+(-2)(0.5)=-8+8-1=-1\\,\\text{V}$$', body: 'Substitute given values.', takeaway: 'Weighted sum with signs.', quickcheckQ: 'Weights?', quickcheckA: '$-8$, $-4$, $-2$ respectively.', followup: 'Equal weights.' },
    { title: 'Equal weight design', formula: '$$R_f/R_1=R_f/R_2=R_f/R_3\\Rightarrow R_1=R_2=R_3$$', body: 'Equal input resistors give equal weights.', takeaway: 'For equal weights: same $R_i$.', quickcheckQ: 'R_f for equal weights of 1?', quickcheckA: 'Any $R_f$ if all $R_i$ equal.', followup: 'DAC application.' },
    { title: 'Input resistors for equal gain', formula: '$$R_f=80\\,\\text{k}\\Omega\\Rightarrow R_1=R_2=R_3=80\\,\\text{k}\\Omega$$', body: 'Each channel gain $=-R_f/R_i=-1$.', takeaway: 'Summing amplifier = weighted DAC.', quickcheckQ: 'Binary-weighted DAC?', quickcheckA: 'Use $R$, $R/2$, $R/4$, ...', followup: 'R-2R ladder.' },
    { title: 'Summary', formula: '$$V_{out}=-1\\,\\text{V}$$', body: 'Inverting summer complete.', takeaway: 'Op-amp summers combine signals.', quickcheckQ: 'Input currents?', quickcheckA: 'Flow through $R_i$ to virtual ground.', followup: 'Average circuit.' },
  ],
  solution: ['$V_{out}=-1\\,\\text{V}$.', 'Equal weights: $R_1=R_2=R_3$.'],
});

export const Q39 = defineQuestion({ id: 39, slug: 'q39-diff-amp-cmrr', title: 'Difference Amplifier — CMRR with Mismatch', year: 3, difficulty: 'Mid', topic: 'Difference amp CMRR mismatch',
  problemStatement: 'Ideal: $R_1=R_2=R_3=R_4=10\\,\\text{k}\\Omega$. Mismatch: $R_4=10.1\\,\\text{k}\\Omega$.',
  verified: { CMRRdB: A.Q39.CMRRdB }, svg: opampSvg,
  steps: [
    { title: 'Output with mismatch', formula: '$$V_{out}=A_d V_d + A_{cm} V_{cm}$$', body: '1% mismatch in $R_4$ creates finite CM gain.', takeaway: 'Perfect match needed for high CMRR.', quickcheckQ: 'Ideal CMRR?', quickcheckA: 'Infinite.', followup: 'Exact expression.' },
    { title: 'Differential and CM gains', formula: '$$A_d=1,\\;A_{cm}=\\frac{\\Delta R}{4R}=0.0025$$', body: '$A_d=1$ (matched ratios). $A_{cm}\\approx\\Delta R/(4R)$.', takeaway: 'CM gain proportional to mismatch.', quickcheckQ: '1% mismatch?', quickcheckA: '$A_{cm}\\approx0.0025$.', followup: 'CMRR in dB.' },
    { title: 'CMRR in dB', formula: '$$\\text{CMRR}=20\\log|A_d/A_{cm}|\\approx52\\,\\text{dB}$$', body: 'Only 52 dB from 1% resistor mismatch.', takeaway: 'Resistor matching critical.', quickcheckQ: 'For 80 dB CMRR?', quickcheckA: 'Need $<0.01\\%$ matching.', followup: 'Laser trimming.' },
    { title: 'Precision applications', formula: '$$\\text{Match resistors to }0.01\\%\\text{ or use monolithic ratios}$$', body: 'Instrumentation amps use matched on-chip resistors.', takeaway: 'External 1% resistors limit CMRR.', quickcheckQ: 'Solution?', quickcheckA: 'Integrated difference amps (INA series).', followup: 'Auto-zero techniques.' },
    { title: 'Summary', formula: '$$A_d=1,\\;\\text{CMRR}\\approx52\\,\\text{dB}$$', body: 'Mismatch impact quantified.', takeaway: '1% mismatch → ~52 dB CMRR max.', quickcheckQ: 'Bridge sensors?', quickcheckA: 'Need high CMRR instrumentation amp.', followup: 'Three-op-amp INA.' },
  ],
  solution: ['$A_d=1$, CMRR $\\approx52\\,\\text{dB}$ with 1% mismatch.', 'Precision apps need matched resistors.'],
});

export const Q40 = defineQuestion({ id: 40, slug: 'q40-sallen-key', title: 'Sallen-Key Low-Pass Filter', year: 3, difficulty: 'Tough', topic: 'Sallen-Key Butterworth LPF',
  problemStatement: '$R_1=R_2=10\\,\\text{k}\\Omega$, $C_1=C_2=10\\,\\text{nF}$, $K=1.586$.',
  verified: { w0: A.Q40.w0, Q: A.Q40.Q, f3dB: A.Q40.f3dB }, svg: opampSvg,
  steps: [
    { title: 'Transfer function H(s)', formula: '$$H(s)=\\frac{K\\omega_0^2}{s^2+\\frac{\\omega_0}{Q}s+\\omega_0^2}$$', body: 'Second-order low-pass Sallen-Key topology.', takeaway: 'SK: active filter with op-amp.', quickcheckQ: 'Order?', quickcheckA: 'Second-order (12 dB/oct roll-off).', followup: 'Component values.' },
    { title: 'Find \u03c9\u2080 and Q', formula: '$$\\omega_0=\\frac{1}{RC}=10^4\\,\\text{rad/s},\\;Q=\\frac{1}{3-K}=0.707$$', body: '$Q=1/\\sqrt{2}$ — Butterworth (maximally flat).', takeaway: 'Butterworth: $Q=1/\\sqrt{2}$.', quickcheckQ: 'K for Butterworth?', quickcheckA: '$K=3-1/Q=1.586$.', followup: '-3 dB frequency.' },
    { title: '3 dB frequency', formula: '$$f_{3dB}=\\frac{\\omega_0}{2\\pi}=1592\\,\\text{Hz}$$', body: 'For Butterworth, $f_{3dB}=f_0$.', takeaway: 'SK Butterworth: $f_c=f_0$.', quickcheckQ: 'Roll-off beyond f\u2080?', quickcheckA: '$-40$ dB/decade.', followup: 'Higher-order filters.' },
    { title: 'Roll-off rate', formula: '$$-40\\,\\text{dB/decade beyond }\\omega_0$$', body: 'Second-order: twice first-order slope.', takeaway: 'Each order adds $-20$ dB/dec.', quickcheckQ: '4th order?', quickcheckA: '$-80$ dB/dec.', followup: 'Chebyshev vs Butterworth.' },
    { title: 'Summary', formula: '$$f_{3dB}=1592\\,\\text{Hz},\\;Q=0.707\\text{ (Butterworth)}$$', body: 'Sallen-Key LPF designed.', takeaway: 'Active filters: no inductors needed.', quickcheckQ: 'Gain at DC?', quickcheckA: '$K=1.586$ (passband gain).', followup: 'High-pass SK.' },
  ],
  solution: ['$\\omega_0=10^4\\,\\text{rad/s}$, $Q=1/\\sqrt{2}$.', '$f_{3dB}=1592\\,\\text{Hz}$, $-40$ dB/dec roll-off.'],
});

export const Q41 = defineQuestion({ id: 41, slug: 'q41-schmitt-trigger', title: 'Schmitt Trigger', year: 3, difficulty: 'Mid', topic: 'Schmitt trigger hysteresis',
  problemStatement: 'Non-inverting: $R_1=10\\,\\text{k}\\Omega$, $R_2=90\\,\\text{k}\\Omega$, $\\pm15\\,\\text{V}$ rails.',
  verified: { VUT: A.Q41.VUT, VLT: A.Q41.VLT }, svg: opampSvg,
  steps: [
    { title: 'Upper and lower thresholds', formula: '$$V_{UT}=+12\\,\\text{V},\\;V_{LT}=-12\\,\\text{V}$$', body: '$\\beta=R_1/(R_1+R_2)=0.1$. $V_{UT}=\\beta V_{sat+}+(1-\\beta)V_{sat-}$.', takeaway: 'Hysteresis prevents chatter.', quickcheckQ: 'Hysteresis width?', quickcheckA: '$V_{UT}-V_{LT}=24\\,\\text{V}$.', followup: 'Inverting Schmitt.' },
    { title: 'Hysteresis characteristic', formula: '$$\\text{Transfer: two thresholds with memory}$$', body: 'Output switches at different input levels depending on state.', takeaway: 'Bistable switching behavior.', quickcheckQ: 'Noise immunity?', quickcheckA: 'Hysteresis rejects noise in transition region.', followup: 'Draw characteristic.' },
    { title: '2 V peak sinusoid at 1 kHz', formula: '$$|V_{in}|<V_{UT}\\Rightarrow\\text{no switching}$$', body: '2 V peak < 12 V threshold — output does not switch.', takeaway: 'Input must exceed threshold to toggle.', quickcheckQ: 'Does it switch?', quickcheckA: 'No — amplitude too small.', followup: 'What amplitude needed?' },
    { title: 'Required amplitude for switching', formula: '$$V_{in,peak}>V_{UT}=12\\,\\text{V}$$', body: 'Need >12 V peak to trigger (with these rails/ratios).', takeaway: 'Thresholds set by resistor ratio and rails.', quickcheckQ: 'Reduce thresholds?', quickcheckA: 'Lower supply or change $R_1/R_2$.', followup: 'Astable multivibrator.' },
    { title: 'Summary', formula: '$$V_{UT}=+12\\,\\text{V},\\;V_{LT}=-12\\,\\text{V}$$', body: 'Schmitt trigger analysis.', takeaway: 'Hysteresis for clean digital transitions.', quickcheckQ: 'Application?', quickcheckA: 'Signal conditioning, oscillators.', followup: '555 timer.' },
  ],
  solution: ['$V_{UT}=+12\\,\\text{V}$, $V_{LT}=-12\\,\\text{V}$.', '2 V sinusoid does not switch.'],
});

export const Q42 = defineQuestion({ id: 42, slug: 'q42-series-shunt-feedback', title: 'Series-Shunt Feedback', year: 3, difficulty: 'Mid', topic: 'Series-shunt feedback',
  problemStatement: '$A=2000$, $R_{in}=5\\,\\text{k}\\Omega$, $R_{out}=10\\,\\text{k}\\Omega$, $\\beta_f=0.04$.',
  verified: { Af: A.Q42.Af, Rif: A.Q42.Rif, T: A.Q42.T }, svg: equationPanel(['A_f=A/(1+A\u03b2)', 'T=A\u03b2=80']),
  steps: [
    { title: 'Closed-loop gain', formula: '$$A_f=\\frac{A}{1+A\\beta_f}=\\frac{2000}{81}=24.7$$', body: 'Series-shunt (voltage-voltage) feedback.', takeaway: '$A_f=A/(1+T)$.', quickcheckQ: 'T?', quickcheckA: '$A\\beta_f=80$.', followup: 'Desensitivity.' },
    { title: 'Input and output resistances', formula: '$$R_{if}=R_{in}(1+T)=405\\,\\text{k}\\Omega,\\;R_{of}=\\frac{R_{out}}{1+T}=123\\,\\Omega$$', body: 'Series input: $R_{in}$ increases. Shunt output: $R_{out}$ decreases.', takeaway: 'Topology determines R changes.', quickcheckQ: 'Series at input?', quickcheckA: '$R_{if}$ increases by $(1+T)$.', followup: 'Other topologies.' },
    { title: 'Loop gain and desensitivity', formula: '$$T=A\\beta_f=80,\\;\\text{sensitivity factor}=1+T=81$$', body: 'Gain varies 81× less with component changes.', takeaway: 'High T → stable, predictable gain.', quickcheckQ: 'If T drops?', quickcheckA: 'Less desensitivity, more gain variation.', followup: 'Stability.' },
    { title: 'Feedback topology identification', formula: '$$\\text{Series-shunt: samples }V_{out}\\text{, mixes }V_{fb}\\text{ in series}$$', body: 'Voltage amplifier configuration.', takeaway: 'Four topologies: SS, SC, PS, PC.', quickcheckQ: 'Op-amp with Rf?', quickcheckA: 'Series-shunt (inverting).', followup: 'Current amplifier topology.' },
    { title: 'Summary', formula: '$$A_f=24.7,\\;T=80,\\;R_{if}=405\\,\\text{k}\\Omega$$', body: 'Feedback analysis complete.', takeaway: 'Feedback trades gain for stability.', quickcheckQ: 'Bandwidth?', quickcheckA: 'Extends by $(1+T)$.', followup: 'Oscillator design.' },
  ],
  solution: ['$A_f=24.7$, $T=80$.', '$R_{if}=405\\,\\text{k}\\Omega$, $R_{of}=123\\,\\Omega$.'],
});

export const Q43 = defineQuestion({ id: 43, slug: 'q43-bode-stability', title: 'Bode Stability — Gain and Phase Margin', year: 3, difficulty: 'Mid', topic: 'Bode stability margins',
  problemStatement: '$L(s)=\\frac{1000}{(s+1)(s+10)(s+100)}$.',
  verified: { stable: 1 }, svg: bodeAxesPlot('Open-Loop L(s)', ['GM > 0', 'PM > 0', 'Stable']),
  steps: [
    { title: 'Phase crossover frequency', formula: '$$\\angle L(j\\omega_{pc})=-180°\\text{ at }\\omega_{pc}\\approx31.6\\,\\text{rad/s}$$', body: 'Frequency where phase hits $-180°$.', takeaway: '$\\omega_{pc}$: phase = $-180°$.', quickcheckQ: 'At \u03c9_pc, |L|?', quickcheckA: 'Determines gain margin.', followup: 'Gain margin.' },
    { title: 'Gain margin', formula: '$$\\text{GM}=20\\log|L(j\\omega_{pc})|^{-1}>0\\,\\text{dB}$$', body: 'GM $>0$ → stable.', takeaway: 'GM: how much gain can increase before instability.', quickcheckQ: 'GM=0?', quickcheckA: 'Marginally stable.', followup: 'Phase margin.' },
    { title: 'Gain crossover and phase margin', formula: '$$\\omega_{gc}\\approx10\\,\\text{rad/s},\\;\\text{PM}\\approx55°$$', body: '$\\omega_{gc}$: $|L|=1$. PM = $180°+$phase at $\\omega_{gc}$.', takeaway: 'PM $>0$ → stable. PM $>45°$ preferred.', quickcheckQ: 'PM=0?', quickcheckA: 'Marginally stable.', followup: 'Compensation.' },
    { title: 'Stability conclusion', formula: '$$\\text{GM}>0\\text{ and PM}>0\\Rightarrow\\text{stable}$$', body: 'Both margins positive — closed-loop stable.', takeaway: 'Check both GM and PM.', quickcheckQ: 'Minimum PM?', quickcheckA: '$45°$ typical design target.', followup: 'Lead/lag compensation.' },
    { title: 'Summary', formula: '$$\\text{Stable: GM}>0,\\;\\text{PM}\\approx55°$$', body: 'Stability margins computed.', takeaway: 'Bode plots for stability analysis.', quickcheckQ: 'Nyquist alternative?', quickcheckA: 'Encirclements of $-1+j0$.', followup: 'Root locus.' },
  ],
  solution: ['GM $>0$, PM $\\approx55°$.', 'Closed-loop system is stable.'],
});

export const Q44 = defineQuestion({ id: 44, slug: 'q44-root-locus', title: 'Root Locus — Sketch', year: 3, difficulty: 'Tough', topic: 'Root locus analysis',
  problemStatement: '$G(s)H(s)=\\frac{K(s+2)}{s(s+5)(s+10)}$.',
  verified: { centroid: A.Q44.centroid, branches: A.Q44.branches }, svg: bodeAxesPlot('Root Locus', ['3 branches', 'centroid=-6.5', 'zero at -2']),
  steps: [
    { title: 'Poles, zeros, branches', formula: '$$\\text{Poles: }0,-5,-10;\\;\\text{Zero: }-2;\\;3\\text{ branches}$$', body: 'Number of branches = number of poles.', takeaway: 'Branches start at poles, end at zeros or $\\infty$.', quickcheckQ: 'Branches to infinity?', quickcheckA: '$n-m=3-1=2$ branches.', followup: 'Asymptotes.' },
    { title: 'Asymptote angles and centroid', formula: '$$\\phi=\\pm60°,180°;\\;\\sigma=-6.5$$', body: 'Centroid $=(\\sum\\text{poles}-\\sum\\text{zeros})/n_m$.', takeaway: 'Asymptotes for $K\\to\\infty$.', quickcheckQ: 'Centroid?', quickcheckA: '$-6.5$ on real axis.', followup: 'Breakaway points.' },
    { title: 'Breakaway points', formula: '$$\\frac{dK}{ds}=0\\Rightarrow s\\approx-3.5\\text{ on real axis}$$', body: 'Where locus leaves real axis.', takeaway: 'Solve $dK/ds=0$ for breakaway.', quickcheckQ: 'On real axis?', quickcheckA: 'Between $-5$ and $0$.', followup: 'j\u03c9-axis crossing.' },
    { title: 'K for j\u03c9-axis crossing (marginal stability)', formula: '$$K_{crit}\\approx300$$', body: 'Routh-Hurwitz or substitute $s=j\\omega$.', takeaway: '$K>K_{crit}$ → unstable.', quickcheckQ: 'At K=0?', quickcheckA: 'Poles at 0, $-5$, $-10$ — stable.', followup: 'Dominant pole design.' },
    { title: 'Summary', formula: '$$3\\text{ branches, centroid}=-6.5,\\;K_{crit}\\approx300$$', body: 'Root locus sketched.', takeaway: 'RL shows closed-loop pole migration.', quickcheckQ: 'Design use?', quickcheckA: 'Choose K for desired damping.', followup: 'Lead compensator RL.' },
  ],
  solution: ['Poles: 0, $-5$, $-10$. Zero: $-2$.', 'Centroid $=-6.5$, $K_{crit}\\approx300$.'],
});

export const Q45 = defineQuestion({ id: 45, slug: 'q45-per-unit', title: 'Per-Unit Conversion', year: 3, difficulty: 'Mid', topic: 'Per-unit system',
  problemStatement: 'Base 100 MVA, 132 kV (zone 1), transformer 132/33 kV.',
  verified: { Zb1: A.Q45.Zb1, Zb2: A.Q45.Zb2 }, svg: equationPanel(['Z_b=V\u00b2/S', 'Zone1: 132kV', 'Zone2: 33kV']),
  steps: [
    { title: 'Base impedance per zone', formula: '$$Z_{b1}=\\frac{132^2}{100}=174.24\\,\\Omega,\\;Z_{b2}=\\frac{33^2}{100}=10.89\\,\\Omega$$', body: '$Z_b=V_b^2/S_b$ on each side of transformer.', takeaway: 'MVA base same; kV base per zone.', quickcheckQ: 'Same S_b?', quickcheckA: 'Yes — 100 MVA everywhere.', followup: 'Turns ratio.' },
    { title: 'Convert line impedance to pu', formula: '$$Z_{line,pu}=\\frac{10+j30}{174.24}=0.057+j0.172\\,\\text{pu}$$', body: 'Divide actual ohms by base impedance.', takeaway: 'pu values are dimensionless.', quickcheckQ: 'In zone 1?', quickcheckA: 'Use $Z_{b1}$.', followup: 'Referred impedance.' },
    { title: 'Convert load to pu', formula: '$$S_{load}=50+j30\\,\\text{MVA}\\Rightarrow S_{pu}=0.5+j0.3$$', body: 'Divide by 100 MVA base.', takeaway: '$S_{pu}=S/S_b$.', quickcheckQ: 'At bus 3 zone 2?', quickcheckA: 'Same MVA base, local kV for Z.', followup: 'Transformer pu impedance.' },
    { title: 'Verify consistency across zones', formula: '$$Z_1\\text{ referred} = Z_2\\times(n^2)\\text{ in pu}$$', body: 'Per-unit values invariant across transformer.', takeaway: 'pu eliminates turns ratio from calculations.', quickcheckQ: 'Why pu?', quickcheckA: 'Simplifies multi-voltage-level systems.', followup: 'Change of base.' },
    { title: 'Summary', formula: '$$Z_{b1}=174.24\\,\\Omega,\\;Z_{line,pu}=0.057+j0.172$$', body: 'Per-unit conversion complete.', takeaway: 'pu system standard in power engineering.', quickcheckQ: 'Admittance base?', quickcheckA: '$Y_b=1/Z_b$.', followup: 'Ybus formation.' },
  ],
  solution: ['$Z_{b1}=174.24\\,\\Omega$, $Z_{b2}=10.89\\,\\Omega$.', '$Z_{line,pu}=0.057+j0.172$.'],
});

export const Q46 = defineQuestion({ id: 46, slug: 'q46-ybus', title: 'Ybus Formation', year: 3, difficulty: 'Mid', topic: 'Ybus matrix formation',
  problemStatement: '$y_{12}=1-j3$, $y_{13}=2-j6$, $y_{23}=1.5-j4.5$ pu. No shunts.',
  verified: { y12g: 1 }, svg: equationPanel(['Y\u2081\u2081=y\u2081\u2082+y\u2081\u2083', 'Y\u2081\u2082=-y\u2081\u2082', 'rows sum to 0']),
  steps: [
    { title: 'Form Ybus elements', formula: '$$Y_{11}=y_{12}+y_{13}=3-j9,\\;Y_{12}=-y_{12}=-1+j3$$', body: 'Diagonal: sum of admittances at bus. Off-diagonal: negative of line admittance.', takeaway: 'Ybus from network topology.', quickcheckQ: 'Y\u2081\u2083?', quickcheckA: '$-y_{13}=-2+j6$.', followup: 'Complete matrix.' },
    { title: 'Complete 3\u00d73 Ybus', formula: '$$[Y_{bus}]=\\begin{bmatrix}3-j9&-1+j3&-2+j6\\\\-1+j3&2.5-j7.5&-1.5+j4.5\\\\-2+j6&-1.5+j4.5&3.5-j10.5\\end{bmatrix}$$', body: 'Symmetric, sparse matrix.', takeaway: 'Each off-diagonal $Y_{ij}=-y_{ij}$.', quickcheckQ: 'Symmetric?', quickcheckA: 'Yes for reciprocal network.', followup: 'Row sums.' },
    { title: 'Verify row sums zero', formula: '$$\\sum_j Y_{ij}=0\\text{ (no shunt)}$$', body: 'Without shunt elements, each row sums to zero.', takeaway: 'Shunt admittances break row-sum-zero.', quickcheckQ: 'With shunt?', quickcheckA: 'Row sum = shunt admittance.', followup: 'Sparsity.' },
    { title: 'Why symmetric', formula: '$$Y_{ij}=Y_{ji}\\text{ for reciprocal networks}$$', body: 'Passive network: transposed Ybus equals Ybus.', takeaway: 'Symmetry from reciprocity.', quickcheckQ: 'Phase shifters?', quickcheckA: 'Break symmetry.', followup: 'Zbus from Ybus.' },
    { title: 'Summary', formula: '$$[Y_{bus}]\\text{ is }3\\times3\\text{, symmetric, sparse}$$', body: 'Ybus formation complete.', takeaway: 'Ybus is foundation of power flow.', quickcheckQ: 'Singular?', quickcheckA: 'Yes — needs ground reference.', followup: 'Power flow solution.' },
  ],
  solution: ['$3\\times3$ $Y_{bus}$ formed.', 'Symmetric; rows sum to zero (no shunts).'],
});

export const Q47 = defineQuestion({ id: 47, slug: 'q47-gauss-seidel', title: 'Gauss–Seidel Power Flow — 3 Bus', year: 3, difficulty: 'Tough', topic: 'Gauss-Seidel power flow',
  problemStatement: 'Slack bus 1 (1.05\u22200°), PV bus 2 (P=0.4, V=1.02), PQ bus 3 (P=-0.6, Q=-0.25). Ybus from Q46.',
  verified: { flatStart: 1 }, svg: equationPanel(['Bus1: Slack', 'Bus2: PV', 'Bus3: PQ']),
  steps: [
    { title: 'G-S update equations', formula: '$$V_3^{(k+1)}=\\frac{1}{Y_{33}}\\left(\\frac{P_3-jQ_3}{V_3^{(k)*}}-\\sum_{j\\neq3}Y_{3j}V_j\\right)$$', body: 'PQ bus: solve for $V_3$ from power equation.', takeaway: 'G-S: sequential bus updates.', quickcheckQ: 'PV bus update?', quickcheckA: 'Solve for angle, fix $|V|$.', followup: 'Flat start.' },
    { title: 'One iteration from flat start', formula: '$$V_2^{(1)},\\;V_3^{(1)}\\text{ computed from }V^{(0)}=1\\angle0°$$', body: 'Flat start: all voltages $1\\angle0°$ except slack.', takeaway: 'Flat start is common initial guess.', quickcheckQ: 'Converge?', quickcheckA: 'Slowly — many iterations needed.', followup: 'PV bus angle.' },
    { title: 'Force |V\u2082|=1.02 after angle update', formula: '$$V_2=1.02\\angle\\delta_2^{(1)}$$', body: 'PV bus: compute $\\delta_2$, then reset magnitude to 1.02 pu.', takeaway: 'PV: fix $|V|$, solve for $\\delta$.', quickcheckQ: 'Why force |V|?', quickcheckA: 'PV buses control voltage magnitude.', followup: 'Q\u2082 calculation.' },
    { title: 'Compute Q\u2082 and check limits', formula: '$$Q_2^{(1)}=\\text{Im}\\{V_2\\sum Y_{2j}V_j^*\\}$$', body: 'If $Q_2\\notin[0, 0.5]$ pu: convert bus 2 to PQ (voltage relaxation).', takeaway: 'Generator Q limits may bind.', quickcheckQ: 'If Q violated?', quickcheckA: 'Switch PV\u2192PQ, fix Q at limit.', followup: 'Acceleration factor.' },
    { title: 'Summary', formula: '$$\\text{G-S: one iteration from flat start}$$', body: 'Power flow iteration demonstrated.', takeaway: 'G-S simple but slow for large systems.', quickcheckQ: 'vs Newton-Raphson?', quickcheckA: 'N-R converges in 3–5 iterations.', followup: 'N-R Jacobian.' },
  ],
  solution: ['G-S update for PQ and PV buses.', 'PV: force $|V_2|=1.02$ after angle update.'],
});

export const Q48 = defineQuestion({ id: 48, slug: 'q48-symmetrical-fault', title: 'Symmetrical 3-Phase Fault', year: 3, difficulty: 'Tough', topic: 'Symmetrical fault analysis',
  problemStatement: '$Z_{bus}$ given, pre-fault $V=1.0\\angle0°$ pu, 3-phase fault at bus 2.',
  verified: { If: A.Q48.If, V1: A.Q48.V1, V3: A.Q48.V3 }, svg: equationPanel(['I_f=V/Z\u2082\u2082', 'V\u2081=1-Z\u2081\u2082I_f']),
  steps: [
    { title: 'Fault current', formula: '$$I_f=\\frac{V_{pre}}{Z_{22}}=\\frac{1}{j0.15}=-j6.67\\,\\text{pu}$$', body: 'Fault at bus 2: $I_f=V_{pre}/Z_{22}$.', takeaway: 'Thevenin at fault point.', quickcheckQ: 'Pre-fault voltage?', quickcheckA: '$1.0\\angle0°$ pu.', followup: 'Post-fault voltages.' },
    { title: 'Voltages at buses 1 and 3', formula: '$$V_1=1-Z_{12}I_f,\\;V_3=1-Z_{32}I_f$$', body: '$V_1=1-j0.08(-j6.67)=0.47\\,\\text{pu}$. $V_3=1-j0.07(-j6.67)=0.53\\,\\text{pu}$.', takeaway: 'Voltage drop from fault current through mutual Z.', quickcheckQ: 'Bus 2 voltage?', quickcheckA: 'Zero — solid fault.', followup: 'Protection.' },
    { title: 'Role of off-diagonal Z_bus elements', formula: '$$V_i=V_{pre}-Z_{ij}I_f$$', body: 'Off-diagonal $Z_{ij}$ couples fault current to other bus voltages.', takeaway: 'Zbus mutual terms distribute fault effects.', quickcheckQ: 'If Z\u2081\u2082=0?', quickcheckA: 'Bus 1 unaffected (no coupling).', followup: 'Sequence networks.' },
    { title: 'Fault level and breaker rating', formula: '$$|I_f|=6.67\\,\\text{pu}$$', body: 'Breakers must interrupt fault current.', takeaway: 'Fault analysis for protection design.', quickcheckQ: 'Symmetrical fault?', quickcheckA: 'All three phases — simplest case.', followup: 'Unsymmetrical faults.' },
    { title: 'Summary', formula: '$$I_f=-j6.67\\,\\text{pu},\\;V_1=0.47\\,\\text{pu},\\;V_3=0.53\\,\\text{pu}$$', body: 'Symmetrical fault analysis.', takeaway: 'Zbus method efficient for fault studies.', quickcheckQ: 'Zbus from?', quickcheckA: 'Invert Ybus or build directly.', followup: 'Line outage contingency.' },
  ],
  solution: ['$I_f=-j6.67\\,\\text{pu}$.', '$V_1=0.47$ pu, $V_3=0.53$ pu during fault.'],
});

export const Q49 = defineQuestion({ id: 49, slug: 'q49-nr-jacobian', title: 'Newton–Raphson Power Flow — Jacobian', year: 3, difficulty: 'Tough', topic: 'Newton-Raphson power flow',
  problemStatement: 'Same 3-bus system as Q47. Write mismatch equations and Jacobian structure.',
  verified: { J_dim: 1 }, svg: equationPanel(['J: \u2202P/\u2202\u03b4, \u2202P/\u2202|V|', '\u2202Q/\u2202\u03b4, \u2202Q/\u2202|V|']),
  steps: [
    { title: 'Jacobian dimension', formula: '$$J\\text{ is }2\\times2\\text{ for 1 slack, 1 PV, 1 PQ}$$', body: 'Unknowns: $\\delta_2$, $|V_3|$, $\\delta_3$ — but PV fixes $|V_2|$, so 2 unknowns: $\\delta_2$, $\\delta_3$, $|V_3|$... Actually: 1 PV ($\\delta_2$) + 1 PQ ($|V_3|$, $\\delta_3$) = 2 angles + 1 voltage = but P and Q equations... For 1 slack, 1 PV, 1 PQ: equations for P\u2082 (PV), P\u2083 and Q\u2083 (PQ) = 3 equations, 3 unknowns ($\\delta_2$, $|V_3|$, $\\delta_3$). $J$ is $3\\times3$.', takeaway: '$n_{unknown}$ equations for $n_{unknown}$ unknowns.', quickcheckQ: 'Slack bus?', quickcheckA: 'Not in Jacobian — reference.', followup: 'Mismatch equations.' },
    { title: 'Mismatch at bus 3', formula: '$$\\Delta P_3=P_3^{sch}-P_3^{calc},\\;\\Delta Q_3=Q_3^{sch}-Q_3^{calc}$$', body: 'Specified minus calculated power.', takeaway: 'Mismatch drives N-R corrections.', quickcheckQ: 'At PV bus?', quickcheckA: '$\\Delta P_2$ only (Q is free).', followup: 'Jacobian elements.' },
    { title: 'One N-R iteration vs G-S', formula: '$$|\\Delta V|_{N-R}<|\\Delta V|_{G-S}$$', body: 'N-R quadratic convergence near solution.', takeaway: 'N-R faster near solution.', quickcheckQ: 'Flat start N-R?', quickcheckA: 'May diverge — needs good initial guess.', followup: 'Fast decoupled.' },
    { title: 'Why N-R converges faster', formula: '$$\\text{Quadratic vs linear convergence}$$', body: 'N-R: 3–5 iterations. G-S: 20–50.', takeaway: 'N-R standard for production power flow.', quickcheckQ: 'Cost per iteration?', quickcheckA: 'N-R more expensive (Jacobian factorization).', followup: 'Sparse techniques.' },
    { title: 'Summary', formula: '$$J\\text{ structure: }\\partial P/\\partial\\delta,\\;\\partial P/\\partial|V|,\\;\\partial Q/\\partial\\delta,\\;\\partial Q/\\partial|V|$$', body: 'N-R setup complete.', takeaway: 'Jacobian captures power-voltage sensitivity.', quickcheckQ: 'PV bus in J?', quickcheckA: '$\\partial P_2/\\partial\\delta_2$, etc.', followup: 'Optimal power flow.' },
  ],
  solution: ['Mismatch: $\\Delta P$, $\\Delta Q$ at non-slack buses.', 'N-R converges in 3–5 iterations vs 20–50 for G-S.'],
});

export const Q50 = defineQuestion({ id: 50, slug: 'q50-integrator-oscillator', title: 'Integrator-Based Oscillator', year: 3, difficulty: 'Tough', topic: 'Op-amp integrator oscillator',
  problemStatement: 'Sinusoidal oscillator at $f_0=1\\,\\text{kHz}$ using two ideal op-amp integrators.',
  verified: { w0: A.Q50.w0, R: A.Q50.R, phaseShift: A.Q50.phaseShift }, svg: opampSvg,
  steps: [
    { title: 'Loop gain and poles on j\u03c9 axis', formula: '$$L(s)=-\\frac{1}{(sRC)^2}\\Rightarrow\\text{poles at }s=\\pm j\\omega_0$$', body: 'Two integrators in negative feedback loop.', takeaway: 'Oscillation when poles on imaginary axis.', quickcheckQ: 'Sign of loop gain?', quickcheckA: 'Negative feedback gives $-\\omega^2$.', followup: 'Barkhausen criterion.' },
    { title: 'Find R for C=10 nF', formula: '$$\\omega_0=2\\pi\\times1000,\\;R=\\frac{1}{\\omega_0 C}=15.9\\,\\text{k}\\Omega$$', body: '$R=1/(2\\pi\\times1000\\times10^{-8})\\approx15.9\\,\\text{k}\\Omega$.', takeaway: '$\\omega_0=1/(RC)$ per integrator, two give $\\omega_0$.', quickcheckQ: 'Each integrator?', quickcheckA: 'Same R and C.', followup: 'Amplitude stabilization.' },
    { title: 'Amplitude stabilization', formula: '$$\\text{Add AGC or nonlinear element (e.g., lamp, diode)}$$', body: 'Poles drift to RHP → amplitude grows → clip. AGC stabilizes.', takeaway: 'Practical oscillators need amplitude control.', quickcheckQ: 'Why clip?', quickcheckA: 'Op-amp output limits.', followup: 'Wien bridge oscillator.' },
    { title: 'Phase shift at \u03c9\u2080 and Barkhausen', formula: '$$\\angle L(j\\omega_0)=-180°\\Rightarrow\\text{Barkhausen satisfied}$$', body: 'Each integrator: $-90°$. Two integrators + inversion: $-180°$ total.', takeaway: 'Barkhausen: $|L|=1$ and $\\angle L=-180°$.', quickcheckQ: 'Phase at \u03c9\u2080?', quickcheckA: '$-180°$ around loop.', followup: 'Phase-shift oscillator.' },
    { title: 'Summary', formula: '$$f_0=1\\,\\text{kHz},\\;R=15.9\\,\\text{k}\\Omega,\\;C=10\\,\\text{nF}$$', body: 'Integrator oscillator designed.', takeaway: 'Two integrators + inversion = oscillator.', quickcheckQ: 'Application?', quickcheckA: 'Function generators, audio oscillators.', followup: 'Crystal oscillator.' },
  ],
  solution: ['$R=15.9\\,\\text{k}\\Omega$ for $f_0=1\\,\\text{kHz}$.', 'Barkhausen: $|L|=1$, $\\angle L=-180°$ at $\\omega_0$.'],
});

export const YEAR3_QUESTIONS = [Q31, Q32, Q33, Q34, Q35, Q36, Q37, Q38, Q39, Q40, Q41, Q42, Q43, Q44, Q45, Q46, Q47, Q48, Q49, Q50];
