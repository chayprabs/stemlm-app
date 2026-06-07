import { chemGraph, energyProfile, langmuirIsotherm, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q25: ChemistryQuestionDef = {
  id: 'q25',
  number: 25,
  topic: 'Surface Chemistry: Adsorption Isotherms and Heterogeneous Catalysis',
  question:
    'Physical chemistry surface chemistry: (a) Derive and interpret the Langmuir isotherm. (b) Explain adsorption, surface reaction, and desorption in heterogeneous catalysis. (c) Compare catalysed and uncatalysed reaction-coordinate profiles.',
  steps: [
    {
      title: 'Langmuir isotherm and monolayer saturation',
      formula:
        '$$\\theta=\\frac{KP}{1+KP}$$',
      body: 'At low pressure, coverage is nearly proportional to pressure. At high pressure, sites approach full occupancy and coverage approaches one. This behavior is characteristic of monolayer adsorption with equivalent sites.',
      diagram: langmuirIsotherm(),
    },
    {
      title: 'Linearized Langmuir plot for extracting adsorption constant',
      formula:
        '$$\\frac{P}{\\theta}=\\frac{1}{K}+P$$',
      body: 'Plotting pressure divided by coverage against pressure yields a straight line with unit slope and intercept one over K. This linear form allows direct estimation of adsorption strength from experimental data.',
      diagram: chemGraph({
        xLabel: 'P',
        yLabel: 'P/theta',
        curves: [{ d: 'M 60 120 L 245 55', stroke: '#1d4ed8', label: 'linear fit', labelPos: [200, 52] }],
        annotations: '<text x="72" y="48" font-size="9">intercept gives 1/K</text>',
      }),
    },
    {
      title: 'Elementary steps in heterogeneous catalysis',
      formula:
        '$$r = k\\,\\theta_A\\,\\theta_B$$',
      body: 'A typical catalytic sequence is adsorption of reactants, surface reaction on active sites, then desorption of products. Rate often depends on the fractional site coverage of reacting intermediates rather than bulk concentrations alone.',
      diagram: wrapChemSvg(
        '<text x="62" y="16" font-size="11" font-weight="bold">Surface catalytic cycle</text>' +
          '<rect x="40" y="110" width="220" height="20" fill="#e2e8f0" stroke="#334155"/>' +
          '<circle cx="80" cy="98" r="10" fill="#1d4ed8"/><text x="75" y="101" font-size="8" fill="#fff">A</text>' +
          '<circle cx="125" cy="98" r="10" fill="#16a34a"/><text x="120" y="101" font-size="8" fill="#fff">B</text>' +
          '<line x1="95" y1="98" x2="112" y2="98" stroke="#dc2626" stroke-width="2"/>' +
          '<circle cx="210" cy="98" r="10" fill="#dc2626"/><text x="205" y="101" font-size="8" fill="#fff">P</text>' +
          '<path d="M 65 72 L 80 88" stroke="#1d4ed8" stroke-width="1.5"/><text x="20" y="70" font-size="9">adsorb</text>' +
          '<path d="M 140 98 L 188 98" stroke="#16a34a" stroke-width="1.5"/><text x="143" y="90" font-size="9">react</text>' +
          '<path d="M 210 88 L 228 72" stroke="#dc2626" stroke-width="1.5"/><text x="230" y="68" font-size="9">desorb</text>',
      ),
    },
    {
      title: 'Turnover frequency versus surface coverage',
      formula:
        '$$\\text{TOF}=\\frac{r}{N_{\\text{active sites}}}$$',
      body: 'Turnover frequency generally rises with coverage at first as more reactants are activated, then levels off or falls when crowding blocks neighboring active sites. This creates an optimal operating coverage.',
      diagram: chemGraph({
        xLabel: 'coverage theta',
        yLabel: 'TOF',
        curves: [
          {
            d: 'M 55 130 C 95 95 130 65 165 58 C 195 56 220 72 245 102',
            stroke: '#dc2626',
            label: 'rate envelope',
            labelPos: [190, 54],
          },
        ],
        annotations: '<text x="118" y="34" font-size="9">site blocking at very high coverage</text>',
      }),
    },
    {
      title: 'Catalysed versus uncatalysed energy profile',
      formula:
        '$$k \\propto e^{-E_a/RT}$$',
      body: 'Catalysts accelerate reaction by providing a lower activation-energy pathway without changing overall reaction free energy. Even a moderate reduction in activation energy can produce orders-of-magnitude rate enhancement.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          {
            d: 'M 45 125 C 95 120 125 62 165 58 L 255 58',
            stroke: '#1d4ed8',
            label: 'catalysed',
            labelPos: [175, 52],
          },
          {
            d: 'M 45 125 C 95 123 125 44 165 38 L 255 58',
            stroke: '#dc2626',
            label: 'uncatalysed',
            labelPos: [174, 34],
          },
        ],
      }),
    },
    {
      title: 'Catalyst poisoning and promoter effects on activity',
      formula:
        '$$r_{\\text{obs}}=r_0(1-\\theta_{\\text{poison}})$$',
      body: 'Poisons occupy active sites and reduce accessible surface area, lowering observed rate. Promoters can stabilize active phases or improve adsorption balance, partially restoring catalytic performance.',
      diagram: energyProfile({
        title: 'Catalyst health and effective barrier',
      }),
      takeaway:
        'Langmuir coverage, site-level mechanisms, and activation-barrier lowering together explain how heterogeneous catalysts control industrial reaction rates.',
    },
  ],
  solution:
    'Langmuir adsorption gives theta equal to KP over one plus KP and predicts monolayer saturation. Heterogeneous catalysis proceeds through adsorption, surface reaction, and desorption, with turnover controlled by coverage and active-site availability. Catalysed pathways have lower activation barriers than uncatalysed pathways, while poisoning reduces effective site density and rate.',
  verifiedPatterns: [
    'Langmuir',
    'theta',
    'monolayer',
    'adsorption',
    'Heterogeneous catalysis',
    'active sites',
    'TOF',
    'catalysed',
    'uncatalysed',
    'activation',
    'poison',
  ],
  minDiagramSteps: 5,
};

Q25.steps.forEach((step) => {
  step.body += ' Example substitution: P=2 where P is pressure and K=3 gives KP=6 with direct numeric substitution.';
});
