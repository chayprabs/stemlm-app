import { chemGraph, uvVisCurves, frostDiagram, crystalFieldSplitting } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q19: ChemistryQuestionDef = {
  id: 'q19',
  number: 19,
  topic: 'd-Block Transition Metals',
  question:
    'd-block transition metals: (a) Explain first ionization-energy trends from Sc to Zn. (b) Relate d-d transitions to observed colours using a colour-wheel idea. (c) Interpret manganese redox stability using a Frost diagram.',
  steps: [
    {
      title: 'First ionization energy trend from Sc to Zn',
      formula: '$$\\Delta IE_1=IE_1(\\mathrm{Zn})-IE_1(\\mathrm{Sc})$$',
      body: 'Using representative data $IE_1(\\mathrm{Sc})=633\\,\\text{kJ mol}^{-1}$ and $IE_1(\\mathrm{Zn})=906\\,\\text{kJ mol}^{-1}$, the net rise is $\\Delta IE_1=906-633=273\\,\\text{kJ mol}^{-1}$. The overall increase reflects increasing effective nuclear charge across the 3d series despite partial shielding by added d electrons.',
      diagram: chemGraph({
        xLabel: 'metal (Sc -> Zn)',
        yLabel: 'IE1 (kJ mol^-1)',
        points: [
          { x: 60, y: 120, label: 'Sc 633', fill: '#1d4ed8' },
          { x: 95, y: 115, label: 'Ti 659', fill: '#1d4ed8' },
          { x: 130, y: 111, label: 'V 651', fill: '#1d4ed8' },
          { x: 165, y: 107, label: 'Cr 653', fill: '#16a34a' },
          { x: 200, y: 102, label: 'Mn 717', fill: '#1d4ed8' },
          { x: 240, y: 90, label: 'Zn 906', fill: '#dc2626' },
        ],
        annotations:
          '<text x="55" y="28" font-size="10">overall upward trend with local irregularities</text>',
      }),
    },
    {
      title: 'Local anomalies linked to d-electron configurations',
      formula: '$$\\%\\,\\text{change}=\\frac{IE_{next}-IE_{current}}{IE_{current}}\\times100$$',
      body: 'Take Cu and Zn: with $IE_1(\\mathrm{Cu})=745\\,\\text{kJ mol}^{-1}$ and $IE_1(\\mathrm{Zn})=906\\,\\text{kJ mol}^{-1}$, percent increase is $(906-745)/745\\times100=21.6\\%$. Such jumps are connected to extra stabilization of filled or half-filled subshell arrangements and the cost of removing the first electron from compact valence orbitals.',
      diagram: chemGraph({
        xLabel: 'selected metals',
        yLabel: 'IE1 (kJ mol^-1)',
        points: [
          { x: 90, y: 113, label: 'Cr 653', fill: '#16a34a' },
          { x: 145, y: 105, label: 'Mn 717', fill: '#1d4ed8' },
          { x: 200, y: 99, label: 'Cu 745', fill: '#7c3aed' },
          { x: 255, y: 88, label: 'Zn 906', fill: '#dc2626' },
        ],
        annotations:
          '<text x="62" y="24" font-size="10" font-weight="bold">configuration-driven irregularities</text>',
      }),
    },
    {
      title: 'd-d transition energy from absorbed wavelength',
      formula: '$$E=\\frac{hc}{\\lambda}$$',
      body: 'If a complex absorbs at $\\lambda=520\\,\\text{nm}$, then $E=(6.626\\times10^{-34}\\times3.00\\times10^8)/(520\\times10^{-9})=3.82\\times10^{-19}\\,\\text{J}$ per photon. Multiplying by Avogadro number gives $3.82\\times10^{-19}\\times6.022\\times10^{23}=2.30\\times10^5\\,\\text{J mol}^{-1}=230\\,\\text{kJ mol}^{-1}$ for the d-d transition.',
      diagram: crystalFieldSplitting({
        metal: 'Ti',
        ligand: 'H2O',
        strongField: false,
      }),
    },
    {
      title: 'Complementary colour logic for visible d-d absorption',
      formula: '$$\\tilde\\nu=\\frac{1}{\\lambda\\,(\\text{cm})}$$',
      body: 'For absorption at $520\\,\\text{nm}=5.20\\times10^{-5}\\,\\text{cm}$, the wavenumber is $\\tilde\\nu=1/(5.20\\times10^{-5})=1.92\\times10^4\\,\\text{cm}^{-1}$. Absorbing green light near 520 nm makes the complex appear red-violet (complementary color), which is the practical color-wheel interpretation of d-d transitions.',
      diagram: uvVisCurves(),
    },
    {
      title: 'Frost diagram interpretation for manganese states',
      formula: '$$\\text{slope}=-E^\\circ$$',
      body: 'In a Frost diagram, a lower $nE^\\circ$ point is more stable. Using $E^\\circ=1.51\\,\\text{V}$ for the MnO4-/Mn2+ couple, the line slope is $\\text{slope}=-E^\\circ=-1.51$. This negative slope means reduction from MnO4- to Mn2+ is favorable, consistent with strong oxidizing behavior of permanganate.',
      diagram: frostDiagram(),
    },
    {
      title: 'Free-energy estimate for permanganate reduction',
      formula: '$$\\Delta G^\\circ=-nFE^\\circ$$',
      body: 'For acidic reduction of MnO4- to Mn2+, use $n=5$, $F=96485\\,\\text{C mol}^{-1}$, and $E^\\circ=1.51\\,\\text{V}$. Then $\\Delta G^\\circ=-5\\times96485\\times1.51=-7.29\\times10^5\\,\\text{J mol}^{-1}=-729\\,\\text{kJ mol}^{-1}$. The large negative value explains why permanganate is a powerful oxidant.',
      diagram: chemGraph({
        xLabel: 'redox couple',
        yLabel: 'delta G (kJ mol^-1)',
        points: [{ x: 170, y: 72, label: 'MnO4- -> Mn2+: -729', fill: '#dc2626' }],
        annotations:
          '<text x="72" y="30" font-size="10">more negative delta G means stronger oxidizing tendency</text>',
      }),
      takeaway:
        'd-block behavior links electronic structure to observables: ionization-energy irregularities, visible colours from d-d transitions, and Frost-diagram energetics for redox stability.',
    },
  ],
  solution:
    '**(a)** The first ionization energy generally increases from Sc to Zn because effective nuclear charge increases, though local d-electron configuration effects cause irregular points. **(b)** d-d transitions absorb selected visible wavelengths, and observed colour is complementary to absorbed colour. **(c)** The Mn Frost diagram shows Mn2+ as relatively stable while MnO4- lies high and acts as a strong oxidant, consistent with a large negative $\\Delta G^\\circ$ for reduction.',
  verifiedPatterns: [
    'Sc',
    'Zn',
    'ionization energy',
    'd-d transition',
    'complementary color',
    'Frost diagram',
    'MnO4-',
    'Mn2+',
    'oxidizing',
  ],
  minDiagramSteps: 5,
};
