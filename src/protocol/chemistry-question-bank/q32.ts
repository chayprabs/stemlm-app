import { chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q32: ChemistryQuestionDef = {
  id: 'q32',
  number: 32,
  topic: 'Asymmetric Synthesis: Cram/Felkin-Anh and Sharpless Reactions',
  question:
    'Asymmetric synthesis in advanced organic chemistry reaction mechanisms: (a) Compare Cram and Felkin-Anh predictions for nucleophilic addition to chiral carbonyl compounds. (b) Apply Sharpless epoxidation catalyst and reagent stereochemical rules quantitatively. (c) Evaluate Sharpless dihydroxylation selectivity and enantioinduction for enantiomer control.',
  steps: [
    {
      title: 'Cram model diastereomeric ratio from transition-state energy difference',
      formula:
        '$$\\frac{major}{minor}=\\exp\\!\\left(-\\frac{\\Delta\\Delta G^{\\ddagger}}{RT}\\right)=\\exp\\!\\left(\\frac{3200}{8.314\\times298}\\right)=3.64$$',
      body: 'Using a Cram-model preference of $\\Delta\\Delta G^{\\ddagger}=-3.2\\ \\text{kJ mol}^{-1}$ for one face attack, the ratio is $major/minor=3.64$. The major diastereomer fraction is $3.64/(1+3.64)=0.784$, so $78.4\\%$ major and $21.6\\%$ minor.',
      diagram: chemGraph({
        xLabel: 'diastereomer',
        yLabel: 'relative formation',
        points: [
          { x: 120, y: 62, label: 'major 78.4%', fill: '#16a34a' },
          { x: 220, y: 114, label: 'minor 21.6%', fill: '#dc2626' },
        ],
        annotations:
          '<text x="60" y="30" font-size="9">Cram approach control</text>' +
          '<text x="60" y="150" font-size="9">attack opposite largest substituent</text>',
      }),
    },
    {
      title: 'Felkin-Anh non-chelation prediction and anti relationship',
      formula:
        '$$dr=\\frac{anti}{syn}=\\exp\\!\\left(\\frac{2500}{8.314\\times298}\\right)=2.74$$',
      body: 'For a Felkin-Anh trajectory with $\\Delta\\Delta G^{\\ddagger}=-2.5\\ \\text{kJ mol}^{-1}$ favoring anti product, $dr=anti/syn=2.74$. Anti fraction becomes $2.74/(1+2.74)=0.733$, so about $73.3\\%$ anti in non-chelating solvent.',
      diagram: chemGraph({
        xLabel: 'Felkin-Anh product',
        yLabel: 'fraction',
        points: [
          { x: 120, y: 70, label: 'anti 73.3', fill: '#1d4ed8' },
          { x: 220, y: 120, label: 'syn 26.7', fill: '#d97706' },
        ],
        annotations: '<text x="56" y="34" font-size="9">Felkin-Anh: LUMO alignment control</text>',
      }),
    },
    {
      title: 'Sharpless epoxidation reagent stoichiometry and catalytic loading',
      formula:
        '$$n_{Ti}=0.08\\times0.50=0.040\\,\\text{mmol},\\quad TON=\\frac{0.50}{0.040}=12.5$$',
      body: 'With $0.50\\ \\text{mmol}$ allylic alcohol and $8.0\\%$ titanium catalyst, $n_{Ti}=0.040\\ \\text{mmol}$. If epoxide isolated is $0.43\\ \\text{mmol}$, practical turnover is $TON=0.43/0.040=10.8$, showing efficient catalytic Sharpless epoxidation.',
      diagram: chemGraph({
        xLabel: 'process stage',
        yLabel: 'mmol',
        points: [
          { x: 95, y: 60, label: 'substrate 0.50', fill: '#1d4ed8' },
          { x: 165, y: 122, label: 'Ti 0.040', fill: '#dc2626' },
          { x: 235, y: 72, label: 'product 0.43', fill: '#16a34a' },
        ],
        annotations: '<text x="52" y="28" font-size="9">Sharpless epoxidation material balance</text>',
      }),
    },
    {
      title: 'Sharpless epoxidation enantioselectivity from product ratio',
      formula:
        '$$ee=\\frac{|R-S|}{R+S}\\times100=\\frac{|96-4|}{100}\\times100=92\\%$$',
      body: 'If the Sharpless epoxidation produces a $96:4$ enantiomer ratio, then $ee=92\\%$. The major enantiomer amount at $0.43\\ \\text{mmol}$ total product is $0.96\\times0.43=0.413\\ \\text{mmol}$, while minor is $0.017\\ \\text{mmol}$.',
      diagram: chemGraph({
        xLabel: 'enantiomer',
        yLabel: 'percent',
        points: [
          { x: 120, y: 48, label: 'major 96', fill: '#16a34a' },
          { x: 220, y: 126, label: 'minor 4', fill: '#dc2626' },
        ],
        annotations:
          '<text x="58" y="26" font-size="9">(+)-DET or (-)-DET controls face selectivity</text>',
      }),
    },
    {
      title: 'Sharpless dihydroxylation conversion and enantiomeric excess',
      formula:
        '$$\\text{conversion}=\\frac{0.78}{0.90}\\times100=86.7\\%,\\quad ee=\\frac{|94-6|}{100}\\times100=88\\%$$',
      body: 'From $0.90\\ \\text{mmol}$ alkene, diol product of $0.78\\ \\text{mmol}$ gives conversion $86.7\\%$. If AD-mix gives $94:6$ enantiomeric ratio, then $ee=88\\%$, consistent with strong asymmetric osmylation control.',
      diagram: chemGraph({
        xLabel: 'Sharpless dihydroxylation metric',
        yLabel: 'percent',
        points: [
          { x: 115, y: 83, label: 'conversion 86.7', fill: '#1d4ed8' },
          { x: 220, y: 90, label: 'ee 88', fill: '#16a34a' },
        ],
        annotations: '<text x="52" y="32" font-size="9">AD-mix alpha/beta ligand control</text>',
      }),
    },
    {
      title: 'Comparative asymmetric route score across models and reactions',
      formula:
        '$$S=0.4(ee)+0.3(yield)+0.3(dr)=0.4(92)+0.3(86.7)+0.3(78.4)=86.2$$',
      body: 'Using normalized values for one route ($ee=92$, $yield=86.7$, $dr=78.4$), weighted score is $S=86.2$. A competing route with $(88,80,73)$ gives $S=0.4(88)+0.3(80)+0.3(73)=81.1$, so the Sharpless-centered route is favored by $5.1$ points.',
      diagram: chemGraph({
        xLabel: 'route option',
        yLabel: 'score',
        points: [
          { x: 120, y: 74, label: 'Route A 86.2', fill: '#16a34a' },
          { x: 220, y: 90, label: 'Route B 81.1', fill: '#dc2626' },
        ],
        annotations:
          '<text x="60" y="36" font-size="9">Integrates Cram/Felkin-Anh and Sharpless data</text>',
      }),
      takeaway:
        'Asymmetric synthesis design combines transition-state models with measurable dr, ee, yield, and catalyst turnover.',
    },
  ],
  solution:
    'Cram and Felkin-Anh models provide quantitative diastereofacial predictions, while Sharpless epoxidation and Sharpless dihydroxylation convert those ideas into high practical enantioselectivity. Numeric evaluation of dr, ee, conversion, and TON makes route selection objective and supports choosing the highest-performing asymmetric sequence.',
  verifiedPatterns: [
    'Cram',
    'Felkin-Anh',
    'Sharpless epoxidation',
    'Sharpless dihydroxylation',
    'ee',
    'diastereomer',
    'AD-mix',
    'TON',
  ],
  minDiagramSteps: 5,
};
