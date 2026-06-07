import { dicotRoot, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q36: BiologyQuestionDef = {
  id: 'q36',
  number: 36,
  topic: 'Water Potential, Turgor, and Soil-Plant-Atmosphere Continuum',
  question:
    'Use the equation Psi = Psi_s + Psi_p, calculate plant cell water potential for given values, explain turgor versus plasmolysis, and relate water movement to the soil-plant-atmosphere continuum.',
  steps: [
    {
      title: 'Define total water potential components',
      formula:
        '$$\\Psi = \\Psi_s + \\Psi_p$$',
      body: 'Total water potential equals solute potential plus pressure potential, so Psi = Psi_s + Psi_p at a given location. Water moves from higher Psi (less negative) to lower Psi (more negative).',
    },
    {
      title: 'Calculate plant cell Psi from given values',
      formula:
        '$$\\Psi_s=-0.7\\,\\text{MPa},\\;\\Psi_p=+0.5\\,\\text{MPa}\\Rightarrow \\Psi=-0.2\\,\\text{MPa}$$',
      body: 'Substituting values gives Psi = -0.7 + 0.5 = -0.2 MPa. A cell with Psi = -0.2 MPa will gain water from a compartment at -0.1 MPa and lose water to one at -0.4 MPa.',
    },
    {
      title: 'Distinguish turgid and plasmolyzed cell states',
      body: 'In hypotonic surroundings, water entry raises pressure potential and cells become turgid; in hypertonic surroundings, water exits and plasmolysis can occur. State transition = consequence of external Psi relative to cell Psi.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">turgor vs plasmolysis</text>' +
          '<rect x="24" y="36" width="110" height="120" fill="#dcfce7" stroke="#166534"/><rect x="40" y="52" width="78" height="88" fill="#86efac" stroke="#15803d"/><text x="44" y="152" font-size="9">turgid cell</text>' +
          '<rect x="166" y="36" width="110" height="120" fill="#fee2e2" stroke="#991b1b"/><rect x="194" y="64" width="54" height="62" fill="#fecaca" stroke="#991b1b"/><text x="178" y="152" font-size="9">plasmolyzed cell</text>',
      ),
    },
    {
      title: 'Place root tissues into the water uptake pathway',
      body: 'Water enters via epidermis/root hairs, crosses cortex and endodermis, then loads xylem. Endodermal Casparian strip blocks unrestricted apoplastic bypass, so selective membrane transport = enforced before xylem entry.',
      diagram: dicotRoot(),
    },
    {
      title: 'Apply Psi gradients in the soil-plant-atmosphere continuum',
      formula:
        '$$\\Psi_{soil}=-0.1\\,\\text{MPa} > \\Psi_{root}=-0.2\\,\\text{MPa} > \\Psi_{leaf}=-1.0\\,\\text{MPa} > \\Psi_{air}=-10\\,\\text{MPa}$$',
      body: 'Because values become progressively more negative from soil to air, net flow direction = soil -> root -> xylem -> leaf -> atmosphere. Transpiration pull helps sustain this continuous gradient-driven movement.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">soil-plant-atmosphere continuum</text>' +
          '<rect x="22" y="62" width="58" height="54" fill="#fef3c7" stroke="#a16207"/><text x="31" y="82" font-size="9">soil</text><text x="27" y="98" font-size="9">-0.1</text>' +
          '<rect x="104" y="62" width="58" height="54" fill="#dcfce7" stroke="#166534"/><text x="114" y="82" font-size="9">root</text><text x="110" y="98" font-size="9">-0.2</text>' +
          '<rect x="186" y="62" width="58" height="54" fill="#dbeafe" stroke="#1e3a8a"/><text x="196" y="82" font-size="9">leaf</text><text x="192" y="98" font-size="9">-1.0</text>' +
          '<rect x="252" y="62" width="36" height="54" fill="#e2e8f0" stroke="#334155"/><text x="258" y="82" font-size="9">air</text><text x="254" y="98" font-size="9">-10</text>' +
          '<line x1="80" y1="88" x2="104" y2="88" stroke="#1f2937"/><line x1="162" y1="88" x2="186" y2="88" stroke="#1f2937"/><line x1="244" y1="88" x2="252" y2="88" stroke="#1f2937"/>',
      ),
    },
    {
      title: 'Link water relations to crop physiology',
      body: 'Maintaining turgor supports cell expansion, stomatal function, and photosynthetic performance under field conditions. Drought stress severity = drop in soil Psi and stronger evaporative demand, which can push tissues toward wilting.',
      takeaway:
        'Remember the sign logic: more negative Psi attracts water, and Psi = Psi_s + Psi_p organizes both osmotic and pressure effects.',
    },
  ],
  solution:
    'Water potential is described by Psi = Psi_s + Psi_p. For Psi_s = -0.7 MPa and Psi_p = +0.5 MPa, total Psi = -0.2 MPa. Water moves from higher to lower Psi, which explains turgor in relatively less negative external media and plasmolysis in more negative media. In the soil-plant-atmosphere continuum, Psi typically declines from soil to root to leaf to air, driving upward water flow through xylem and transpiration.',
  verifiedPatterns: ['Psi = Psi_s + Psi_p', '-0.7', '+0.5', '-0.2 MPa', 'turgor', 'plasmolysis', 'soil-plant-atmosphere continuum'],
  minDiagramSteps: 4,
};
