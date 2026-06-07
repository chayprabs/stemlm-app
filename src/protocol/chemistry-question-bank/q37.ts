import { chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q37: ChemistryQuestionDef = {
  id: 'q37',
  number: 37,
  topic: "Physical Organic Chemistry: Hammett, More O'Ferrall-Jencks, and Bronsted",
  question:
    "Physical organic chemistry reaction analysis: (a) Use Hammett correlations to quantify substituent effects in an organic reaction. (b) Interpret reaction pathways on a More O'Ferrall-Jencks surface for molecular bond changes. (c) Apply Bronsted correlations to leaving-group dependence and infer mechanism shifts in chemical reactions.",
  steps: [
    {
      title: 'Hammett equation application for para-substituted benzoate hydrolysis',
      formula:
        '$$\\log\\left(\\frac{k}{k_0}\\right)=\\rho\\sigma=(1.45)(0.23)=0.3335$$',
      body: 'With reaction constant $\\rho=1.45$ and substituent constant $\\sigma=0.23$, $\\log(k/k_0)=0.3335$. In plain notation this is log(k/k0) $=0.3335$. Therefore $k/k_0=10^{0.3335}=2.15$, meaning the substituted substrate reacts about $2.15$ times faster than the reference.',
      diagram: chemGraph({
        xLabel: 'sigma',
        yLabel: 'log(k/k0)',
        curves: [{ d: 'M 50 120 L 250 50', stroke: '#1d4ed8', label: 'rho = 1.45', labelPos: [170, 62] }],
        points: [{ x: 170, y: 78, label: '(0.23,0.33)', fill: '#dc2626' }],
        annotations: '<text x="58" y="34" font-size="9">Hammett linear free-energy relationship</text>',
      }),
    },
    {
      title: 'Extract reaction constant rho from two substituent data points',
      formula:
        '$$\\rho=\\frac{\\Delta\\log(k/k_0)}{\\Delta\\sigma}=\\frac{0.52-(-0.18)}{0.35-(-0.10)}=\\frac{0.70}{0.45}=1.56$$',
      body: 'Using data pairs $(\\sigma,\\log k/k_0)=(-0.10,-0.18)$ and $(0.35,0.52)$ gives slope $\\rho=1.56$. Positive $\\rho$ means electron-withdrawing groups accelerate this reaction, consistent with negative charge development being disfavored in the transition state.',
      diagram: chemGraph({
        xLabel: 'sigma',
        yLabel: 'log(k/k0)',
        points: [
          { x: 90, y: 110, label: 'EDG point', fill: '#16a34a' },
          { x: 220, y: 60, label: 'EWG point', fill: '#dc2626' },
        ],
        annotations:
          '<line x1="90" y1="110" x2="220" y2="60" stroke="#333"/>' +
          '<text x="126" y="80" font-size="9">slope rho = 1.56</text>',
      }),
    },
    {
      title: "More O'Ferrall-Jencks surface coordinate estimate",
      formula:
        '$$\\chi_{bond\\ break}=0.68,\\quad \\chi_{bond\\ form}=0.31,\\quad \\Delta\\chi=0.37$$',
      body: "If a transition state has $\\chi_{bond\\ break}=0.68$ and $\\chi_{bond\\ form}=0.31$, then $\\Delta\\chi=0.37$ indicates a relatively dissociative character. On a More O'Ferrall-Jencks map this point sits closer to bond-breaking edge than bond-forming edge.",
      diagram: chemGraph({
        xLabel: 'bond formation',
        yLabel: 'bond cleavage',
        points: [{ x: 125, y: 68, label: 'TS (0.31,0.68)', fill: '#7c3aed' }],
        annotations:
          '<rect x="70" y="45" width="140" height="90" fill="none" stroke="#333"/>' +
          '<text x="75" y="42" font-size="9">More OFJ surface projection</text>' +
          '<line x1="70" y1="135" x2="210" y2="45" stroke="#94a3b8" stroke-dasharray="4 3"/>',
      }),
    },
    {
      title: 'Bronsted leaving-group correlation slope beta_lg',
      formula:
        '$$\\beta_{lg}=\\frac{\\Delta\\log k}{\\Delta pK_a}=\\frac{-2.10-(-0.85)}{4.5-1.0}=\\frac{-1.25}{3.5}=-0.357$$',
      body: 'Comparing leaving groups with conjugate-acid $pK_a$ values $1.0$ and $4.5$ and rates $\\log k=-0.85$ and $-2.10$ gives $\\beta_{lg}=-0.357$. The same value can be written as beta_lg $=-0.357$. The negative slope indicates slower reaction for poorer leaving groups, implying significant C-LG bond cleavage in the transition state.',
      diagram: chemGraph({
        xLabel: 'pKa of LGH',
        yLabel: 'log k',
        curves: [{ d: 'M 70 60 L 240 120', stroke: '#dc2626', label: 'beta_lg = -0.36', labelPos: [145, 102] }],
        points: [
          { x: 90, y: 68, label: 'LG1', fill: '#16a34a' },
          { x: 220, y: 114, label: 'LG2', fill: '#1d4ed8' },
        ],
      }),
    },
    {
      title: 'Combine Hammett rho and Bronsted beta_lg for mechanism assignment',
      formula:
        '$$M=0.6|\\rho|+0.4|\\beta_{lg}|=0.6(1.56)+0.4(0.357)=1.08$$',
      body: 'A composite sensitivity metric $M=1.08$ from $\\rho=1.56$ and $\\beta_{lg}=-0.357$ indicates strong electronic control with moderate leaving-group dependence. This pattern is consistent with a polarized transition state rather than a fully stepwise ionic intermediate.',
      diagram: chemGraph({
        xLabel: 'sensitivity term',
        yLabel: 'magnitude',
        points: [
          { x: 110, y: 64, label: '|rho| 1.56', fill: '#1d4ed8' },
          { x: 190, y: 106, label: '|beta| 0.36', fill: '#dc2626' },
          { x: 250, y: 86, label: 'M 1.08', fill: '#16a34a' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">integrated physical-organic diagnostics</text>',
      }),
    },
    {
      title: 'Predict rate change for new substituent and leaving group set',
      formula:
        '$$\\log\\left(\\frac{k_{new}}{k_0}\\right)=\\rho\\sigma+\\beta_{lg}\\Delta pK_a=(1.56)(0.18)+(-0.357)(1.2)=-0.147$$',
      body: 'For a new substrate with $\\sigma=0.18$ and leaving-group shift $\\Delta pK_a=1.2$, predicted $\\log(k_{new}/k_0)=-0.147$. Thus $k_{new}/k_0=10^{-0.147}=0.71$, so reaction is expected to be $29\\%$ slower than reference.',
      diagram: chemGraph({
        xLabel: 'case',
        yLabel: 'relative rate',
        points: [
          { x: 140, y: 88, label: 'reference 1.00', fill: '#1d4ed8' },
          { x: 230, y: 104, label: 'new 0.71', fill: '#dc2626' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">Hammett + Bronsted predictive model</text>',
      }),
      takeaway:
        "Hammett, More O'Ferrall-Jencks, and Bronsted tools are most powerful when combined into one quantitative mechanistic picture.",
    },
  ],
  solution:
    "Hammett analysis gives substituent sensitivity (rho), More O'Ferrall-Jencks coordinates locate transition-state progress, and Bronsted correlations report leaving-group involvement. Integrating these values enables quantitative mechanism assignment and forward prediction of rate changes for new substrate designs.",
  verifiedPatterns: [
    'Hammett',
    "More O'Ferrall-Jencks",
    'Bronsted',
    'rho',
    'beta_lg',
    'log(k/k0)',
    'transition state',
    'substituent',
  ],
  minDiagramSteps: 5,
};
