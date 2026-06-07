import { cobalaminStructure, uvVisCurves, energyProfile, dnaBasePairs, chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q50: ChemistryQuestionDef = {
  id: 'q50',
  number: 50,
  topic: 'Vitamin B12 Integrated: Structure, Spectroscopy, Mechanism, Biosynthesis, and Assay',
  question:
    'Integrated vitamin B12 chemistry: (a) Explain cyanocobalamin structure and cobalt coordination. (b) Quantify UV-Vis concentration by Beer-Lambert law. (c) Analyze AdoB12 radical mechanism energetics. (d) Summarize biosynthesis logic and perform a yield estimate. (e) Calculate concentration from a competitive RIA assay.',
  steps: [
    {
      title: 'Cyanocobalamin structure and oxidation-state bookkeeping',
      formula:
        '$$\\text{OS(Co)} + (-1)_{CN} + (-1)_{DMB} + 0_{corrin\\,approx} = 0$$',
      body: 'Taking cyanide as $-1$ and dimethylbenzimidazole lower ligand as $-1$, cobalt in cyanocobalamin is assigned near +3 in the common formal picture. The cobalt center is hexacoordinate with four equatorial corrin nitrogens plus axial CN and DMB ligands, giving the characteristic cyanocobalamin structure.',
      diagram: cobalaminStructure(),
    },
    {
      title: 'UV-Vis quantification of vitamin B12',
      formula:
        '$$A=\\varepsilon l c$$',
      body: 'At 361 nm, take molar absorptivity $\\varepsilon=27{,}500\\,\\text{L mol}^{-1}\\text{cm}^{-1}$, path length $l=1.00\\,\\text{cm}$, and measured absorbance $A=0.825$. Then concentration is $c=A/(\\varepsilon l)=0.825/27{,}500=3.00\\times10^{-5}\\,\\text{mol L}^{-1}$ or $30.0\\,\\mu\\text{M}$.',
      diagram: uvVisCurves(),
    },
    {
      title: 'AdoB12 mechanism: Co-C homolysis and radical generation',
      formula:
        '$$\\Delta G=-RT\\ln K$$',
      body: 'If equilibrium constant for Co-C homolysis under enzyme conditions is $K=2.0\\times10^{-4}$ at $298\\,\\text{K}$, then $\\Delta G=-(8.314)(298)\\ln(2.0\\times10^{-4})=21.1\\,\\text{kJ mol}^{-1}$. Enzymes lower the effective barrier and stabilize radicals, enabling AdoB12 mechanism pathways such as 1,2-rearrangements.',
      diagram: energyProfile({
        title: 'AdoB12 Co-C cleavage and radical rebound',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Biosynthesis yield through multistep pathway',
      formula:
        '$$Y_{overall}=\\prod_i Y_i$$',
      body: 'If five key biosynthesis modules each operate at $80\\%$, $75\\%$, $70\\%$, $85\\%$, and $90\\%$ yield, overall pathway yield is $0.80\\times0.75\\times0.70\\times0.85\\times0.90=0.321$. Therefore only $32.1\\%$ of initial precursor reaches final cobalamin, highlighting why pathway optimization is crucial.',
      diagram: dnaBasePairs(),
    },
    {
      title: 'Competitive RIA assay calibration for serum B12',
      formula:
        '$$\\frac{B}{B_0}=\\frac{1}{1+C/K_d}$$',
      body: 'Suppose measured bound fraction is $B/B_0=0.40$ with assay dissociation constant $K_d=0.25\\,\\text{nM}$. Rearranging gives $C=K_d(1/(B/B_0)-1)=0.25(1/0.40-1)=0.25(1.5)=0.375\\,\\text{nM}$. The sample concentration is therefore $0.375\\,\\text{nM}$ in the assay mixture.',
      diagram: chemGraph({
        xLabel: 'log[B12]',
        yLabel: 'B/B0',
        curves: [
          { d: 'M 55 45 C 100 55 150 75 200 102 C 225 115 242 122 255 128', stroke: '#1d4ed8', label: 'RIA standard curve', labelPos: [140, 86] },
        ],
        points: [{ x: 185, y: 102, label: 'unknown', fill: '#dc2626' }],
      }),
    },
    {
      title: 'Dose translation from concentration target',
      formula:
        '$$n = C V,\\quad m=nM$$',
      body: 'If target plasma increment is $C=0.60\\,\\mu\\text{mol L}^{-1}$ in an effective distribution volume $V=3.0\\,\\text{L}$, moles required are $n=0.60\\times10^{-6}\\times3.0=1.8\\times10^{-6}\\,\\text{mol}$. With cyanocobalamin molar mass $M=1355\\,\\text{g mol}^{-1}$, mass is $m=1.8\\times10^{-6}\\times1355=2.44\\,\\text{mg}$.',
      diagram: cobalaminStructure(),
      takeaway:
        'Vitamin B12 analysis integrates cyanocobalamin structure, UV-Vis quantification, AdoB12 radical chemistry, biosynthesis constraints, and quantitative RIA assay interpretation.',
    },
  ],
  solution:
    '**(a)** Cyanocobalamin contains a corrin-bound cobalt center with axial CN and DMB ligands. **(b)** UV-Vis absorbance is converted to concentration via Beer-Lambert law. **(c)** AdoB12 mechanism chemistry depends on controlled Co-C homolysis and radical intermediates. **(d)** Biosynthesis is multi-step and multiplicative in yield. **(e)** Competitive RIA assay curves allow back-calculation of unknown B12 concentration.',
  verifiedPatterns: [
    'cyanocobalamin structure',
    'UV-Vis',
    'AdoB12',
    'mechanism',
    'biosynthesis',
    'RIA assay',
    'corrin',
    'Co-C',
  ],
  minDiagramSteps: 5,
};
