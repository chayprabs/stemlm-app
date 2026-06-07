import { chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q34: ChemistryQuestionDef = {
  id: 'q34',
  number: 34,
  topic: 'Heterocyclic Chemistry: Aromaticity, NAS, Fischer Indole, and Tautomers',
  question:
    'Heterocyclic organic chemistry: (a) Compare aromatic electron counting in pyridine and pyrrole molecules. (b) Analyze nucleophilic aromatic substitution on activated pyridine with explicit reagent effects. (c) Explain Fischer indole synthesis as a chemical reaction with quantitative selectivity. (d) Evaluate nucleobase tautomer populations and mispair risk.',
  steps: [
    {
      title: 'Aromatic electron counting in pyridine and pyrrole',
      formula: '$$n_{\\pi}(\\text{pyridine})=6,\\quad n_{\\pi}(\\text{pyrrole})=4+2=6$$',
      body: 'Pyridine has six pi electrons from three C=C/N=C bonds, while pyrrole has four pi electrons from two C=C bonds plus two from the nitrogen lone pair: $4+2=6$. Both satisfy Huckel aromaticity with $4n+2=6$ where $n=1$.',
      diagram: chemGraph({
        xLabel: 'heterocycle',
        yLabel: 'pi electrons',
        points: [
          { x: 120, y: 82, label: 'pyridine 6', fill: '#1d4ed8' },
          { x: 220, y: 82, label: 'pyrrole 6', fill: '#16a34a' },
        ],
        annotations:
          '<text x="58" y="34" font-size="9">Both aromatic: 4n+2 = 6</text>' +
          '<text x="58" y="150" font-size="9">Pyridine lone pair is sigma; pyrrole lone pair is pi</text>',
      }),
    },
    {
      title: 'Basicity contrast from conjugate-acid pKa values',
      formula:
        '$$\\Delta pK_a=pK_aH(\\text{pyridinium})-pK_aH(\\text{pyrrolium})=5.2-0.4=4.8$$',
      body: 'Using $pK_aH=5.2$ for pyridinium and $0.4$ for pyrrolium gives $\\Delta pK_a=4.8$. Relative basicity ratio is $10^{4.8}=6.3\\times10^4$, so pyridine is about sixty-three thousand times more basic than pyrrole in water.',
      diagram: chemGraph({
        xLabel: 'conjugate acid',
        yLabel: 'pKaH',
        points: [
          { x: 120, y: 75, label: 'pyridinium 5.2', fill: '#1d4ed8' },
          { x: 220, y: 125, label: 'pyrrolium 0.4', fill: '#dc2626' },
        ],
        annotations:
          '<text x="58" y="32" font-size="9">Higher pKaH -> stronger base precursor</text>',
      }),
    },
    {
      title: 'Nucleophilic aromatic substitution on pyridine ring',
      formula:
        '$$\\text{rate}=k[\\text{2-chloropyridine}][Nu^-]=1.8\\times10^{-3}\\times0.20\\times0.30=1.08\\times10^{-4}$$',
      body: 'For activated 2-chloropyridine, with $k=1.8\\times10^{-3}\\ \\text{M}^{-1}\\text{s}^{-1}$, substrate $0.20\\ \\text{M}$, and nucleophile $0.30\\ \\text{M}$, rate is $1.08\\times10^{-4}\\ \\text{M s}^{-1}$. The Meisenheimer intermediate is stabilized by ring nitrogen, accelerating NAS relative to benzene analogs.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          { d: 'M 45 124 C 80 118 100 88 130 86 C 160 84 180 104 210 70 L 255 58', stroke: '#1d4ed8', label: 'NAS in pyridine', labelPos: [178, 102] },
        ],
        points: [{ x: 130, y: 86, label: 'Meisenheimer', fill: '#7c3aed' }],
        annotations: '<text x="60" y="34" font-size="9">addition-elimination sequence</text>',
      }),
    },
    {
      title: 'Fischer indole synthesis yield and regioselectivity check',
      formula: '$$Y=\\frac{0.62}{0.80}\\times100=77.5\\%,\\quad rr=\\frac{87}{13}=6.69$$',
      body: 'From $0.80\\ \\text{mmol}$ hydrazone precursor, $0.62\\ \\text{mmol}$ indole product gives $77.5\\%$ yield. If regioisomers are $87:13$, regioselectivity ratio is $87/13=6.69$, consistent with preferred migration in the Fischer indole rearrangement.',
      diagram: chemGraph({
        xLabel: 'Fischer indole metric',
        yLabel: 'value',
        points: [
          { x: 120, y: 84, label: 'yield 77.5', fill: '#16a34a' },
          { x: 220, y: 70, label: 'rr 6.69', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="58" y="34" font-size="9">hydrazone -> [3,3]-shift -> indole</text>',
      }),
    },
    {
      title: 'Nucleobase tautomer equilibrium from free-energy difference',
      formula:
        '$$K_{keto/enol}=\\exp\\!\\left(-\\frac{\\Delta G}{RT}\\right)=\\exp\\!\\left(\\frac{9500}{8.314\\times298}\\right)=46.1$$',
      body: 'With keto favored by $\\Delta G=-9.5\\ \\text{kJ mol}^{-1}$, $K_{keto/enol}=46.1$. Enol fraction is $1/(1+46.1)=0.021$ or $2.1\\%$, so rare tautomers exist but are low-abundance under physiological conditions.',
      diagram: chemGraph({
        xLabel: 'tautomer',
        yLabel: 'population',
        points: [
          { x: 120, y: 60, label: 'keto 97.9%', fill: '#16a34a' },
          { x: 220, y: 128, label: 'enol 2.1%', fill: '#dc2626' },
        ],
        annotations:
          '<text x="56" y="32" font-size="9">nucleobase tautomer distribution</text>',
      }),
    },
    {
      title: 'Estimated mismatch frequency from rare tautomer population',
      formula:
        '$$P_{mismatch}=P_{rare}\\times P_{capture}=0.021\\times0.12=2.52\\times10^{-3}$$',
      body: 'If rare tautomer fraction is $P_{rare}=0.021$ and polymerase capture probability is $0.12$, expected mismatch event probability is $2.52\\times10^{-3}$ per incorporation event. This simple model explains why tautomerism can contribute to mutation despite dominant canonical forms.',
      diagram: chemGraph({
        xLabel: 'probability component',
        yLabel: 'value',
        points: [
          { x: 120, y: 128, label: 'P_rare 0.021', fill: '#1d4ed8' },
          { x: 190, y: 112, label: 'P_capture 0.12', fill: '#7c3aed' },
          { x: 240, y: 136, label: 'P_mismatch 0.0025', fill: '#dc2626' },
        ],
        annotations:
          '<text x="56" y="32" font-size="9">tautomeric mispairing risk estimate</text>',
      }),
      takeaway:
        'Heterocyclic reactivity and biological fidelity both emerge from quantified aromaticity, substitution kinetics, rearrangement selectivity, and tautomer equilibria.',
    },
  ],
  solution:
    'Pyridine and pyrrole are both aromatic yet differ strongly in basicity because lone-pair participation differs. Activated pyridines undergo NAS through Meisenheimer intermediates, Fischer indole synthesis is quantified by yield and regioselectivity, and nucleobase tautomer equilibria show how small rare-form populations can still create measurable mismatch risk.',
  verifiedPatterns: [
    'pyridine',
    'pyrrole',
    'aromaticity',
    'NAS',
    'Meisenheimer',
    'Fischer indole',
    'nucleobase',
    'tautomer',
  ],
  minDiagramSteps: 5,
};
