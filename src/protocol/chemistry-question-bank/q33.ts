import { chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q33: ChemistryQuestionDef = {
  id: 'q33',
  number: 33,
  topic: 'Natural Product Biosynthesis: Cholesterol, Morphine, and Polyketides',
  question:
    'Natural product biosynthesis: (a) Quantify key carbon-flow and reducing-equivalent steps in the cholesterol pathway. (b) Analyze major branch points in morphine biosynthesis. (c) Evaluate chain-extension arithmetic and reduction patterns in polyketide assembly.',
  steps: [
    {
      title: 'Cholesterol pathway entry: acetyl-CoA to mevalonate accounting',
      formula:
        '$$3\\,\\text{acetyl-CoA}\\;(3\\times2C=6C)\\rightarrow \\text{mevalonate}\\;(6C),\\quad n_{NADPH}=2$$',
      body: 'Three acetyl-CoA units contribute $3\\times2=6$ carbons to one mevalonate molecule, so carbon is conserved at $6C$. The HMG-CoA reductase step consumes $2$ NADPH per mevalonate, establishing early reducing-equivalent demand in sterol biosynthesis.',
      diagram: chemGraph({
        xLabel: 'pathway stage',
        yLabel: 'carbon count',
        points: [
          { x: 100, y: 86, label: 'acetyl pool 6C', fill: '#1d4ed8' },
          { x: 220, y: 86, label: 'mevalonate 6C', fill: '#16a34a' },
        ],
        annotations:
          '<line x1="110" y1="86" x2="210" y2="86" stroke="#333" stroke-width="2"/>' +
          '<text x="122" y="72" font-size="9">HMG-CoA reductase, 2 NADPH</text>',
      }),
    },
    {
      title: 'Isoprenoid arithmetic from mevalonate to squalene',
      formula: '$$6\\times C_5\\,\\text{IPP}=30C\\rightarrow C_{30}\\,\\text{squalene}$$',
      body: 'Each isopentenyl pyrophosphate unit is $C_5$, so six units deliver $6\\times5=30$ carbons for one squalene molecule. This gives exact carbon closure: $C_{30}$ precursor to tetracyclic sterol scaffolds.',
      diagram: chemGraph({
        xLabel: 'oligomerization step',
        yLabel: 'carbon number',
        points: [
          { x: 90, y: 110, label: 'IPP x6', fill: '#dc2626' },
          { x: 220, y: 70, label: 'squalene C30', fill: '#16a34a' },
        ],
        annotations:
          '<line x1="95" y1="108" x2="215" y2="72" stroke="#333"/>' +
          '<text x="118" y="95" font-size="9">head-to-tail prenyl couplings</text>',
      }),
    },
    {
      title: 'Lanosterol to cholesterol: demethylation and reduction bookkeeping',
      formula: '$$C_{30}\\rightarrow C_{27}+3\\,CO_2,\\quad n_{NADPH}\\approx8$$',
      body: 'Sterol maturation removes three carbons from $C_{30}$ lanosterol to reach $C_{27}$ cholesterol: $30-3=27$. A simplified reducing-equivalent estimate of about $8$ NADPH across later reductions and rearrangements is consistent with a strongly reductive sequence.',
      diagram: chemGraph({
        xLabel: 'sterol intermediate',
        yLabel: 'carbon count',
        points: [
          { x: 120, y: 62, label: 'lanosterol 30', fill: '#1d4ed8' },
          { x: 220, y: 86, label: 'cholesterol 27', fill: '#16a34a' },
        ],
        annotations:
          '<text x="58" y="34" font-size="9">three oxidative demethylations</text>' +
          '<line x1="125" y1="62" x2="215" y2="84" stroke="#333"/>',
      }),
    },
    {
      title: 'Morphine biosynthesis branch efficiency through salutaridine node',
      formula: '$$Y_{\\text{branch}}=0.72\\times0.68\\times0.81=0.397\\approx39.7\\%$$',
      body: 'If three key enzymatic branch steps in morphine biosynthesis proceed at $72\\%$, $68\\%$, and $81\\%$, the overall branch throughput is $Y_{\\text{branch}}=0.397$ or $39.7\\%$. This identifies the $68\\%$ conversion as the dominant leverage point for pathway engineering.',
      diagram: chemGraph({
        xLabel: 'biosynthetic branch',
        yLabel: 'fraction remaining',
        points: [
          { x: 90, y: 74, label: '0.72', fill: '#1d4ed8' },
          { x: 150, y: 95, label: '0.49', fill: '#dc2626' },
          { x: 220, y: 115, label: '0.40', fill: '#16a34a' },
        ],
        annotations:
          '<line x1="90" y1="74" x2="150" y2="95" stroke="#333"/>' +
          '<line x1="150" y1="95" x2="220" y2="115" stroke="#333"/>' +
          '<text x="58" y="36" font-size="9">reticuline -> salutaridine -> morphinan</text>',
      }),
    },
    {
      title: 'Polyketide synthase chain-extension arithmetic',
      formula:
        '$$N_C=2+2n,\\; n=8\\Rightarrow N_C=18;\\quad n_{CO_2}=n=8$$',
      body: 'A starter acetyl unit contributes $2$ carbons and each malonyl extension contributes net $2$ carbons after decarboxylation. For $n=8$ extensions, $N_C=2+2(8)=18$ carbons in the polyketide chain, with $8$ CO2 losses during condensations.',
      diagram: chemGraph({
        xLabel: 'extension number n',
        yLabel: 'chain carbons',
        curves: [
          { d: 'M 50 125 L 250 55', stroke: '#7c3aed', label: 'N_C = 2 + 2n', labelPos: [170, 62] },
        ],
        points: [{ x: 210, y: 69, label: 'n=8 -> C18', fill: '#7c3aed' }],
        annotations: '<text x="60" y="34" font-size="9">modular PKS growth rule</text>',
      }),
    },
    {
      title: 'Isotopic labeling interpretation for pathway validation',
      formula:
        '$$\\%\\,^{13}C\\,incorporation=\\frac{I_{labeled}}{I_{total}}\\times100=\\frac{36}{120}\\times100=30.0\\%$$',
      body: 'If labeled-fragment signal is $I_{labeled}=36$ and total product signal is $I_{total}=120$, then isotopic incorporation is $\\%\\,^{13}C=30.0\\%$. A measured value near this prediction supports the proposed cholesterol pathway or polyketide carbon-flow map.',
      diagram: chemGraph({
        xLabel: 'NMR peak set',
        yLabel: 'intensity',
        points: [
          { x: 120, y: 88, label: 'labeled 36', fill: '#dc2626' },
          { x: 220, y: 58, label: 'total 120', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="58" y="34" font-size="9">stable-isotope pathway confirmation</text>',
      }),
      takeaway:
        'Natural product biosynthesis problems are solved by strict carbon accounting, branch-yield multiplication, and isotope-based validation.',
    },
  ],
  solution:
    'The cholesterol pathway is quantified by mevalonate carbon conservation, IPP assembly to squalene, and sterol demethylation/reduction bookkeeping. Morphine pathway analysis hinges on branch efficiencies around salutaridine-like nodes, while polyketide logic follows deterministic 2-carbon chain extensions. Isotopic incorporation provides an independent numeric check of proposed biosynthetic maps.',
  verifiedPatterns: [
    'cholesterol pathway',
    'mevalonate',
    'squalene',
    'morphine',
    'salutaridine',
    'polyketide',
    'malonyl',
    'isotopic',
  ],
  minDiagramSteps: 5,
};
