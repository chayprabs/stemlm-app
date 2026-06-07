import { chemGraph, crystalUnitCell, energyProfile } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q07: ChemistryQuestionDef = {
  id: 'q07',
  number: 7,
  topic: 's-Block Chemistry',
  question:
    's-Block chemistry: (a) Draw and explain the NaCl unit cell. (b) Compare alkali metal oxides Li2O, Na2O2, and KO2 with oxidation-state and stoichiometric arguments. (c) Draw Grignard reagent RMgX structure and discuss preparation/reactivity. (d) Plot melting point versus atomic number for alkali metals and interpret the trend.',
  steps: [
    {
      title: 'NaCl unit cell and stoichiometry',
      formula: '$$n_{\\mathrm{NaCl}}=\\frac{8\\times\\tfrac{1}{8}+6\\times\\tfrac{1}{2}}{1}=4$$',
      body: 'In the rock-salt description, corner and face contributions give $8\\times\\tfrac{1}{8}+6\\times\\tfrac{1}{2}=4$ chloride sites, matched by 4 sodium ions in octahedral holes. Therefore, formula units per cell $=4$ and each ion has coordination number $=6$.',
      diagram: crystalUnitCell({ type: 'nacl', label: 'NaCl rock-salt (CN=6)' }),
    },
    {
      title: 'Oxide, peroxide, and superoxide progression',
      formula: '$$\\text{O oxidation state: Li}_2\\text{O}=-2,\\ \\text{Na}_2\\text{O}_2=-1,\\ \\text{KO}_2=-\\tfrac{1}{2}$$',
      body: 'Charge balance confirms the sequence: for Li2O, $2(+1)+x=0$ so $x=-2$; for Na2O2, $2(+1)+2x=0$ so $x=-1$; for KO2, $(+1)+2x=0$ so $x=-0.5$. Down Group 1, larger cations stabilize larger oxygen anions, so products shift oxide -> peroxide -> superoxide.',
      diagram: chemGraph({
        xLabel: 'alkali cation size',
        yLabel: 'preferred oxide type',
        points: [
          { x: 80, y: 120, label: 'Li+ -> Li2O', fill: '#1d4ed8' },
          { x: 145, y: 90, label: 'Na+ -> Na2O2', fill: '#16a34a' },
          { x: 220, y: 60, label: 'K+ -> KO2', fill: '#dc2626' },
        ],
        annotations:
          '<text x="55" y="35" font-size="10">Increasing cation radius stabilizes O2(2-) then O2(-)</text>',
      }),
    },
    {
      title: 'Grignard reagent structure RMgX',
      formula: '$$n(\\mathrm{RMgX})=n(\\mathrm{Mg})=n(\\mathrm{RX})$$',
      body: 'For preparation in dry ether, if $n(\\mathrm{Mg})=0.050\\ \\text{mol}$ and $n(\\mathrm{RX})=0.050\\ \\text{mol}$, then ideal $n(\\mathrm{RMgX})=0.050\\ \\text{mol}$. The C-Mg bond is polarized ($\\mathrm{C^{\\delta-}-Mg^{\\delta+}}$), so carbon behaves nucleophilically.',
      diagram: chemGraph({
        xLabel: 'electron density',
        yLabel: 'bond polarity',
        annotations:
          '<text x="58" y="45" font-size="12" font-weight="bold">R</text>' +
          '<line x1="70" y1="50" x2="130" y2="50" stroke="#333" stroke-width="2"/>' +
          '<text x="82" y="43" font-size="9">delta-</text>' +
          '<text x="133" y="54" font-size="12" font-weight="bold">Mg</text>' +
          '<line x1="155" y1="50" x2="210" y2="50" stroke="#333" stroke-width="2"/>' +
          '<text x="160" y="43" font-size="9">delta+</text>' +
          '<text x="214" y="54" font-size="12" font-weight="bold">X</text>' +
          '<text x="55" y="95" font-size="10">Ether-solvated aggregate: (RMgX)2 in many solvents</text>' +
          '<text x="55" y="115" font-size="10">Moisture destroys reagent: RMgX + H2O -> RH + Mg(OH)X</text>',
      }),
    },
    {
      title: 'Grignard addition to carbonyl compounds',
      formula:
        '$$\\mathrm{RMgX + RCHO \\to RCH(OMgX)R \\xrightarrow{H_3O^+} RCH(OH)R}$$',
      body: 'Stoichiometry is 1:1. If $0.020\\ \\text{mol}$ aldehyde reacts with $0.025\\ \\text{mol}$ RMgX, limiting reagent is aldehyde, so alcohol product is $0.020\\ \\text{mol}$ and excess RMgX is $0.025-0.020=0.005\\ \\text{mol}$.',
      diagram: energyProfile({ title: 'Grignard addition + acidic workup', hasIntermediate: true }),
    },
    {
      title: 'Melting point vs atomic number for alkali metals',
      formula: '$$\\text{slope}=\\frac{28.5-180.5}{55-3}=-2.92\\ ^\\circ\\text{C per atomic number}$$',
      body: 'Representative melting points are Li $=180.5^\\circ$C, Na $=97.8^\\circ$C, K $=63.5^\\circ$C, Rb $=39.3^\\circ$C, Cs $=28.5^\\circ$C. The negative slope $=(28.5-180.5)/(55-3)=-2.92$ shows weaker metallic bonding as atomic size increases down Group 1.',
      diagram: chemGraph({
        xLabel: 'atomic number (Z)',
        yLabel: 'melting point (deg C)',
        points: [
          { x: 50, y: 45, label: 'Li 3, 180.5', fill: '#1d4ed8' },
          { x: 95, y: 88, label: 'Na 11, 97.8', fill: '#16a34a' },
          { x: 140, y: 106, label: 'K 19, 63.5', fill: '#dc2626' },
          { x: 185, y: 118, label: 'Rb 37, 39.3', fill: '#7c3aed' },
          { x: 235, y: 127, label: 'Cs 55, 28.5', fill: '#d97706' },
        ],
        curves: [{ d: 'M 50 45 L 95 88 L 140 106 L 185 118 L 235 127', stroke: '#1d4ed8', label: 'down-group drop', labelPos: [170, 82] }],
      }),
      takeaway:
        's-Block trends combine structure and bonding: ionic solids depend on packing, while metallic bonding weakens down Group 1.',
    },
  ],
  solution:
    '**(a)** NaCl rock-salt has 4 formula units per cell and 6:6 coordination. **(b)** Oxide products evolve with cation size: Li2O (O=-2), Na2O2 (O=-1), KO2 (O=-0.5). **(c)** RMgX forms in dry ether with 1:1 Mg:RX stoichiometry and adds to carbonyls as a nucleophile. **(d)** Alkali metal melting points decrease strongly with Z (Li 180.5 deg C to Cs 28.5 deg C), reflecting weaker metallic bonding down the group.',
  verifiedPatterns: ['NaCl', '4', 'Li2O', 'Na2O2', 'KO2', 'RMgX', '1:1', '180.5', '28.5', '-2.92'],
  minDiagramSteps: 5,
};
