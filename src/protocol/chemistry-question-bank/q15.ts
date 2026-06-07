import { chemGraph, energyProfile } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q15: ChemistryQuestionDef = {
  id: 'q15',
  number: 15,
  topic: 'Carbonyl Chemistry',
  question:
    'Organic chemistry of carbonyl compounds: (a) analyze HCN addition to aldehydes and cyanohydrin equilibrium. (b) work through aldol condensation and Claisen condensation energetics and yields. (c) assign proton NMR spectra for carbonyl-containing products.',
  steps: [
    {
      title: 'HCN addition to ethanal and cyanohydrin equilibrium',
      formula:
        '$$K=\\frac{[\\mathrm{CH_3CH(OH)CN}]}{[\\mathrm{CH_3CHO}][\\mathrm{HCN}]}$$',
      body: 'For nucleophilic HCN addition, cyanide attacks the carbonyl carbon and protonation gives cyanohydrin. If $[\\mathrm{CH_3CH(OH)CN}]=0.72\\,\\text{M}$, $[\\mathrm{CH_3CHO}]=0.20\\,\\text{M}$, and $[\\mathrm{HCN}]=0.18\\,\\text{M}$, then $K=0.72/(0.20\\times0.18)=0.72/0.036=20.0$. The large equilibrium constant indicates strongly product-favored cyanohydrin formation.',
      diagram: energyProfile({
        title: 'HCN addition to ethanal (cyanohydrin formation)',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Kinetic rate for cyanohydrin formation',
      formula: '$$\\text{rate}=k[\\mathrm{CH_3CHO}][\\mathrm{CN^-}]$$',
      body: 'Taking $k=4.5\\times10^{-2}\\,\\text{M}^{-1}\\text{s}^{-1}$, $[\\mathrm{CH_3CHO}]=0.20\\,\\text{M}$, and $[\\mathrm{CN^-}]=0.050\\,\\text{M}$, the initial rate is $4.5\\times10^{-2}\\times0.20\\times0.050=4.5\\times10^{-4}\\,\\text{M s}^{-1}$. Increasing cyanide concentration twofold would double this bimolecular rate under the same conditions.',
      diagram: chemGraph({
        xLabel: 'time (min)',
        yLabel: 'concentration (M)',
        curves: [
          {
            d: 'M 50 55 C 90 70 130 88 170 102 C 205 115 230 122 250 126',
            stroke: '#16a34a',
            label: 'cyanohydrin',
            labelPos: [180, 96],
          },
          {
            d: 'M 50 125 C 95 112 135 94 175 80 C 210 67 235 58 250 52',
            stroke: '#dc2626',
            label: 'ethanal',
            labelPos: [182, 66],
          },
        ],
      }),
    },
    {
      title: 'Aldol condensation yield from acetaldehyde feed',
      formula: '$$\\%\\text{yield}=\\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times100$$',
      body: 'Self-aldol of acetaldehyde gives 3-hydroxybutanal, then dehydration gives crotonaldehyde. From $12.0\\,\\text{g}$ acetaldehyde ($M=44.05$), moles are $n=12.0/44.05=0.272\\,\\text{mol}$, so theoretical crotonaldehyde mass is $0.272\\times70.09=19.1\\,\\text{g}$. If isolated mass is $13.4\\,\\text{g}$, yield is $(13.4/19.1)\\times100=70.2\\%$.',
      diagram: energyProfile({
        title: 'Aldol condensation: addition then dehydration',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Claisen condensation driving force by beta-ketoester acidity',
      formula:
        '$$K\\approx10^{\\mathrm{p}K_a(\\mathrm{EtOH})-\\mathrm{p}K_a(\\beta\\text{-ketoester})}$$',
      body: 'In Claisen condensation, deprotonation of the beta-ketoester product helps pull equilibrium forward. With $\\mathrm{p}K_a(\\mathrm{EtOH})=16$ and $\\mathrm{p}K_a(\\beta\\text{-ketoester})=11$, $K\\approx10^{16-11}=10^5$. This large value explains why alkoxide base matching the ester alkoxy group is effective.',
      diagram: energyProfile({
        title: 'Claisen condensation of ethyl acetate',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Claisen atom economy and stoichiometric efficiency',
      formula: '$$\\text{AE}=\\frac{M_{\\text{desired}}}{\\sum M_{\\text{reactants}}}\\times100\\%$$',
      body: 'For $2\\,\\mathrm{ethyl\\ acetate}\\to\\mathrm{ethyl\\ acetoacetate}+\\mathrm{ethanol}$, reactant mass basis is $2\\times88.11=176.22\\,\\text{g mol}^{-1}$. Desired product molar mass is $130.14\\,\\text{g mol}^{-1}$, so atom economy is $\\text{AE}=130.14/176.22\\times100=73.9\\%$. The remainder appears mainly in ethanol byproduct.',
      diagram: chemGraph({
        xLabel: 'species',
        yLabel: 'molar mass basis',
        points: [
          { x: 95, y: 52, label: 'reactants 176.22', fill: '#1d4ed8' },
          { x: 195, y: 88, label: 'desired 130.14', fill: '#16a34a' },
          { x: 225, y: 120, label: 'byproduct 46.07', fill: '#dc2626' },
        ],
        annotations: '<text x="110" y="30" font-size="10">Claisen atom economy = 73.9%</text>',
      }),
    },
    {
      title: '1H NMR spectra assignment for carbonyl products',
      formula: '$$\\delta\\,(\\mathrm{ppm})=\\frac{\\nu-\\nu_{ref}}{\\nu_0}\\times10^6$$',
      body: 'On a $400\\,\\text{MHz}$ instrument, a resonance $880\\,\\text{Hz}$ from TMS gives $\\delta=(880/4.00\\times10^8)\\times10^6=2.20\\,\\text{ppm}$ (methyl near carbonyl). A signal at $1020\\,\\text{Hz}$ gives $2.55\\,\\text{ppm}$ (methylene), and $3880\\,\\text{Hz}$ gives $9.70\\,\\text{ppm}$ (aldehyde proton). Integration ratio $3:2:1$ supports the assigned carbonyl skeleton.',
      diagram: chemGraph({
        xLabel: 'delta (ppm)',
        yLabel: 'intensity',
        points: [
          { x: 95, y: 70, label: '9.70 ppm, 1H', fill: '#dc2626' },
          { x: 165, y: 88, label: '2.55 ppm, 2H', fill: '#1d4ed8' },
          { x: 225, y: 102, label: '2.20 ppm, 3H', fill: '#16a34a' },
        ],
        annotations:
          '<line x1="95" y1="130" x2="95" y2="70" stroke="#dc2626" stroke-width="2"/>' +
          '<line x1="165" y1="130" x2="165" y2="88" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="225" y1="130" x2="225" y2="102" stroke="#16a34a" stroke-width="2"/>',
      }),
      takeaway:
        'Carbonyl reactivity trends from HCN addition, aldol, and Claisen chemistry are reinforced by quantitative NMR spectra assignments.',
    },
  ],
  solution:
    'HCN addition to ethanal gives a cyanohydrin equilibrium constant of $K=20.0$ and initial rate $4.5\\times10^{-4}\\,\\text{M s}^{-1}$ for the stated concentrations. Aldol condensation from $12.0\\,\\text{g}$ acetaldehyde gives a theoretical $19.1\\,\\text{g}$ crotonaldehyde and observed $70.2\\%$ yield. Claisen condensation is driven by beta-ketoester deprotonation with estimated $K\\approx10^5$, and its atom economy for ethyl acetoacetate is $73.9\\%$. NMR spectra calculations at $400\\,\\text{MHz}$ map key resonances to $\\delta=2.20$, $2.55$, and $9.70\\,\\text{ppm}$ with integration $3:2:1$.',
  verifiedPatterns: [
    'HCN addition',
    'cyanohydrin',
    'Aldol condensation',
    'Claisen condensation',
    'beta-ketoester',
    'ethyl acetoacetate',
    'NMR spectra',
    '9.70\\,\\text{ppm}',
    '3:2:1',
  ],
  minDiagramSteps: 5,
};
