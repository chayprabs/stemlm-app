import { chemGraph, crystalUnitCell, ionizationEnergyBars, periodicTrends } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q06: ChemistryQuestionDef = {
  id: 'q06',
  number: 6,
  topic: 'Periodic Table Trends',
  question:
    'Periodic table trends: (a) Draw periodic trend arrows for atomic radius and first ionization energy across periods and down groups. (b) Explain the Na/Mg/Al first ionization energy pattern with a bar graph. (c) Discuss the diagonal relationship between Li and Mg with quantitative support. (d) Compare lattice structures and coordination for NaCl, CsCl, ZnS, and CaF2.',
  steps: [
    {
      title: 'Core periodic trend arrows across periods and down groups',
      formula: '$$Z_{\\text{eff}} = Z-\\sigma$$',
      body: 'Across period 3, effective nuclear charge rises: for Na, $Z_{\\text{eff}}=11-10=1$; for Cl, $Z_{\\text{eff}}=17-10=7$. As $Z_{\\text{eff}}$ increases, radius decreases and first ionization energy increases. Down a group, adding one shell changes $n=2$ to $n=3$ to $n=4$, so radius increases and ionization energy falls.',
      diagram: periodicTrends(),
    },
    {
      title: 'First ionization energy bars for Na, Mg, and Al',
      formula: '$$\\Delta IE = IE_1(\\mathrm{Mg})-IE_1(\\mathrm{Al})$$',
      body: 'Experimental values are $IE_1(\\mathrm{Na})=496$, $IE_1(\\mathrm{Mg})=738$, and $IE_1(\\mathrm{Al})=578\\ \\text{kJ mol}^{-1}$. The anomaly is $\\Delta IE=738-578=160\\ \\text{kJ mol}^{-1}$, so Al is easier to ionize than Mg because Al removes a 3p electron while Mg removes a 3s electron.',
      diagram: ionizationEnergyBars(),
    },
    {
      title: 'Diagonal relationship: Li and Mg',
      formula: '$$\\text{radius ratio} = \\frac{r(\\mathrm{Li^+})}{r(\\mathrm{Mg^{2+}})}$$',
      body: 'The cation radii are close: $r(\\mathrm{Li^+})=0.76\\ \\text{A}$ and $r(\\mathrm{Mg^{2+}})=0.72\\ \\text{A}$, so $\\text{radius ratio}=0.76/0.72=1.06$. This near-match helps explain similar behavior (covalent character in salts, formation of nitrides, and comparable hydration tendencies).',
      diagram: chemGraph({
        xLabel: 'property index',
        yLabel: 'normalized value',
        points: [
          { x: 95, y: 80, label: 'Li+: r=0.76 A', fill: '#1d4ed8' },
          { x: 165, y: 86, label: 'Mg2+: r=0.72 A', fill: '#dc2626' },
          { x: 110, y: 118, label: 'Li2CO3 low solubility', fill: '#1d4ed8' },
          { x: 180, y: 122, label: 'MgCO3 low solubility', fill: '#dc2626' },
        ],
        annotations:
          '<text x="70" y="32" font-size="10">Diagonal relationship: similar charge density effects</text>',
      }),
    },
    {
      title: 'NaCl lattice (rock-salt, 6:6 coordination)',
      formula: '$$\\text{NaCl units per cell} = 4$$',
      body: 'In the rock-salt unit cell, count gives $\\mathrm{Na^+}=4$ and $\\mathrm{Cl^-}=4$, so formula units \\(=4/1=4\\). Radius-ratio check: $r_+/r_-=1.02/1.81=0.56$, which supports octahedral holes and coordination number \\(=6\\) for each ion.',
      diagram: crystalUnitCell({ type: 'nacl', label: 'NaCl (6:6, rock-salt)' }),
    },
    {
      title: 'CsCl lattice (8:8 coordination)',
      formula: '$$\\frac{r_+}{r_-}=\\frac{1.67}{1.81}=0.92$$',
      body: 'For cesium chloride, the larger cation gives $r_+/r_-=1.67/1.81=0.92$, so cubic coordination is favored. The unit-cell count gives one body-center ion plus corner contribution $8\\times\\tfrac{1}{8}=1$, hence Cs:Cl ratio \\(=1:1\\) with coordination number \\(=8\\).',
      diagram: crystalUnitCell({ type: 'cscl', label: 'CsCl (8:8)' }),
    },
    {
      title: 'ZnS and CaF2 lattices: tetrahedral vs fluorite',
      formula: '$$\\text{CaF}_2\\ \\text{per cell} = \\frac{8\\ \\mathrm{F^-}}{2}=4$$',
      body: 'ZnS (zinc blende) occupies half of tetrahedral holes and gives tetrahedral \\(4:4\\) coordination. In fluorite CaF2, Ca2+ forms an FCC lattice and all eight tetrahedral holes are occupied by F-. Counting gives $\\mathrm{Ca^{2+}}=4$ and $\\mathrm{F^-}=8$, so $8/2=4$ formula units and Ca:F ratio \\(=1:2\\).',
      diagram: crystalUnitCell({ type: 'fluorite', label: 'CaF2 fluorite (8 F-, 4 Ca2+)' }),
      takeaway:
        'Across these ionic solids, radius ratio and hole occupancy determine coordination number and resulting crystal type.',
    },
    {
      title: 'ZnS tetrahedral coordination snapshot',
      formula: '$$\\text{occupied tetrahedral holes} = \\frac{4}{8}=0.50$$',
      body: 'In zinc blende, only half the tetrahedral sites are occupied: $4/8=0.50$. This produces a 1:1 stoichiometry with tetrahedral coordination around both Zn2+ and S2-. The geometry differs sharply from NaCl (octahedral, 6:6) and CsCl (cubic, 8:8).',
      diagram: crystalUnitCell({ type: 'zns', label: 'ZnS (tetrahedral 4:4)' }),
    },
  ],
  solution:
    '**(a)** Across a period, radius decreases while IE increases as $Z_{\\text{eff}}$ rises (e.g., Na: $11-10=1$, Cl: $17-10=7$). **(b)** Na/Mg/Al IE values (496, 738, 578 kJ mol$^{-1}$) show the Mg->Al drop because Al ionizes a 3p electron. **(c)** Li and Mg show diagonal similarity from close cation sizes (0.76 A vs 0.72 A). **(d)** Lattice outcomes: NaCl 6:6 rock-salt, CsCl 8:8 cubic, ZnS 4:4 tetrahedral, CaF2 fluorite with Ca:F = 1:2.',
  verifiedPatterns: [
    'Z_{\\text{eff}}',
    '496',
    '738',
    '578',
    'Li',
    'Mg',
    'NaCl',
    'CsCl',
    'ZnS',
    'CaF2',
    '6:6',
    '8:8',
  ],
  minDiagramSteps: 5,
};
