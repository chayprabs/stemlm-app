import { chemGraph, cyclohexaneChair, energyProfile, newmanProjection } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q08: ChemistryQuestionDef = {
  id: 'q08',
  number: 8,
  topic: 'Stereochemistry',
  question:
    'Stereochemistry: (a) Determine all stereoisomers of 2-bromo-3-chlorobutane. (b) Draw tartaric acid Fischer projections and identify meso/enantiomeric forms. (c) Draw butane Newman projections and correlate with an energy profile. (d) Explain cyclohexane conformations and axial/equatorial preference.',
  steps: [
    {
      title: 'Count stereoisomers of 2-bromo-3-chlorobutane',
      formula: '$$N_{\\text{max}}=2^n=2^2=4$$',
      body: 'There are 2 stereogenic centers (C2 and C3), so maximum stereoisomers are $2^2=4$. Because the substituents differ (Br at C2, Cl at C3), there is no internal mirror plane and no meso reduction, so observed count remains $N=4$.',
      diagram: chemGraph({
        xLabel: 'carbon index',
        yLabel: 'substituent',
        annotations:
          '<text x="50" y="55" font-size="11">CH3-CH(Br)-CH(Cl)-CH3</text>' +
          '<circle cx="115" cy="50" r="11" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<circle cx="172" cy="50" r="11" fill="none" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="108" y="77" font-size="9" fill="#1d4ed8">C2*</text>' +
          '<text x="165" y="77" font-size="9" fill="#dc2626">C3*</text>' +
          '<text x="48" y="105" font-size="10">Pairs: (2R,3R)/(2S,3S) and (2R,3S)/(2S,3R)</text>',
      }),
    },
    {
      title: 'Assign R/S configuration using CIP priorities',
      formula:
        '$$\\text{C2 priorities: }1=Br>2=C3\\text{ chain}>3=CH_3>4=H;\\ \\text{clockwise}=R$$',
      body: 'At C2, ranking is $1=\\mathrm{Br}$, $2=\\mathrm{C3\\ chain}$, $3=\\mathrm{CH_3}$, $4=\\mathrm{H}$. With H placed back, a 1->2->3 clockwise sequence gives $R$. Repeating at C3 with $1=\\mathrm{Cl}$, $2=\\mathrm{C2\\ chain}$, $3=\\mathrm{CH_3}$, $4=\\mathrm{H}$ can give $R$ or $S$, producing all four configurations.',
      diagram: chemGraph({
        xLabel: 'view',
        yLabel: 'priority order',
        annotations:
          '<text x="40" y="40" font-size="10">(2R,3R) example</text>' +
          '<text x="40" y="62" font-size="10">1 -> 2 -> 3 = clockwise at C2</text>' +
          '<text x="40" y="84" font-size="10">1 -> 2 -> 3 = clockwise at C3</text>' +
          '<text x="40" y="112" font-size="10">Mirror image gives (2S,3S)</text>' +
          '<text x="40" y="134" font-size="10">Mixed signs produce diastereomeric pair</text>',
      }),
    },
    {
      title: 'Tartaric acid Fischer projections and meso form',
      formula: '$$N_{\\text{actual}}=2^2-1=3$$',
      body: 'Tartaric acid has 2 stereocenters, so max is $2^2=4$, but one pair collapses into a meso form, giving $N_{\\text{actual}}=4-1=3$. Thus there are two enantiomers ((R,R) and (S,S)) plus one meso (R,S) with an internal mirror plane.',
      diagram: chemGraph({
        xLabel: 'Fischer set',
        yLabel: 'configuration',
        annotations:
          '<text x="30" y="32" font-size="10">(R,R)</text>' +
          '<line x1="55" y1="40" x2="55" y2="85" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="55" x2="70" y2="55" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="70" x2="70" y2="70" stroke="#333" stroke-width="2"/>' +
          '<text x="95" y="32" font-size="10">(S,S)</text>' +
          '<line x1="120" y1="40" x2="120" y2="85" stroke="#333" stroke-width="2"/>' +
          '<line x1="105" y1="55" x2="135" y2="55" stroke="#333" stroke-width="2"/>' +
          '<line x1="105" y1="70" x2="135" y2="70" stroke="#333" stroke-width="2"/>' +
          '<text x="170" y="32" font-size="10">meso (R,S)</text>' +
          '<line x1="205" y1="40" x2="205" y2="85" stroke="#333" stroke-width="2"/>' +
          '<line x1="190" y1="55" x2="220" y2="55" stroke="#333" stroke-width="2"/>' +
          '<line x1="190" y1="70" x2="220" y2="70" stroke="#333" stroke-width="2"/>' +
          '<line x1="205" y1="38" x2="205" y2="88" stroke="#dc2626" stroke-dasharray="3 2"/>' +
          '<text x="215" y="62" font-size="9" fill="#dc2626">mirror plane</text>',
      }),
    },
    {
      title: 'Butane Newman projections: anti and gauche',
      formula: '$$\\Delta E_{\\text{gauche-anti}}=0.9-0.0=0.9\\ \\text{kcal mol}^{-1}$$',
      body: 'For butane rotation, anti at dihedral $180^\\circ$ is lowest with $E=0.0\\ \\text{kcal mol}^{-1}$. Gauche at $60^\\circ$ has $E=0.9\\ \\text{kcal mol}^{-1}$, so $\\Delta E=0.9-0.0=0.9$. This small penalty reflects CH3...CH3 steric interaction in gauche.',
      diagram: newmanProjection({ conformation: 'Butane anti (180 deg)', energy: '0.0 kcal/mol' }),
    },
    {
      title: 'Eclipsed Newman projection and torsional barrier',
      formula: '$$\\Delta E^{\\ddagger}=4.5-0.0=4.5\\ \\text{kcal mol}^{-1}$$',
      body: 'The fully eclipsed CH3/CH3 arrangement at $0^\\circ$ is highest at about $E=4.5\\ \\text{kcal mol}^{-1}$. Relative to anti, the barrier is $\\Delta E^{\\ddagger}=4.5-0.0=4.5\\ \\text{kcal mol}^{-1}$. Eclipsing interactions (torsional + steric) raise the energy.',
      diagram: newmanProjection({ conformation: 'Butane eclipsed (0 deg)', energy: '4.5 kcal/mol' }),
    },
    {
      title: 'Energy profile for butane rotation',
      formula: '$$E_{\\text{anti}}<E_{\\text{gauche}}<E_{\\text{eclipsed}}\\ ;\\ 0.0<0.9<4.5$$',
      body: 'One full rotation gives repeating minima and maxima: anti minima at $180^\\circ$ ($E=0.0$), gauche local minima at $\\pm 60^\\circ$ ($E=0.9$), and eclipsed maxima near $0^\\circ$ and $120^\\circ$ ($E\\approx 3.6$ to $4.5$). The numeric order $0.0<0.9<4.5$ matches conformational stability.',
      diagram: energyProfile({ title: 'Butane rotational energy profile' }),
    },
    {
      title: 'Cyclohexane chair and axial/equatorial preference',
      formula: '$$K=\\exp\\!\\left(-\\frac{\\Delta G^\\circ}{RT}\\right)=\\exp\\!\\left(-\\frac{1.74}{0.001987\\times 298}\\right)=0.053$$',
      body: 'For methylcyclohexane, axial is higher by $\\Delta G^\\circ=1.74\\ \\text{kcal mol}^{-1}$. Using $R=0.001987\\ \\text{kcal mol}^{-1}\\text{K}^{-1}$ and $T=298\\ \\text{K}$ gives $K=0.053$, so equatorial:axial $=1/0.053\\approx 18.9:1$. Chair conformations interconvert by ring flip while preserving tetrahedral angles.',
      diagram: cyclohexaneChair(),
      takeaway:
        'Stereochemistry combines configuration (R/S, meso, enantiomer) and conformation (Newman and chair) with measurable energy differences.',
    },
  ],
  solution:
    '**(a)** 2-bromo-3-chlorobutane has 2 stereocenters and no meso symmetry, so 4 stereoisomers. **(b)** Tartaric acid gives 3 stereoisomers (R,R), (S,S), and meso (R,S). **(c)** Butane conformers follow anti (0.0) < gauche (0.9) < eclipsed (up to 4.5 kcal mol$^{-1}$), seen in Newman projections and rotational profile. **(d)** Cyclohexane chair forms are lowest in strain; substituents prefer equatorial positions (about 19:1 over axial for methyl at 298 K).',
  verifiedPatterns: [
    '2^2=4',
    '2-bromo-3-chlorobutane',
    'R,R',
    'S,S',
    'meso',
    '0.9',
    '4.5',
    'cyclohexane',
    'equatorial',
  ],
  minDiagramSteps: 5,
};
