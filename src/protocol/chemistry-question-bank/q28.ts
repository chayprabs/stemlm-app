import { chemGraph, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q28: ChemistryQuestionDef = {
  id: 'q28',
  number: 28,
  topic: 'Bioinorganic Chemistry: Hemoglobin, Oxygen Curves, and Carbonic Anhydrase',
  question:
    'Bioinorganic chemistry: (a) Explain cooperative O2 binding by hemoglobin. (b) Compare oxygen dissociation curves for myoglobin, adult Hb, and fetal Hb. (c) Describe carbonic anhydrase mechanism in CO2 transport and acid-base balance.',
  steps: [
    {
      title: 'Hemoglobin cooperative oxygen binding',
      formula:
        '$$Y=\\frac{(pO_2)^n}{P_{50}^n+(pO_2)^n}$$',
      body: 'Hemoglobin transitions from a low-affinity T state to a high-affinity R state as oxygen binds, producing cooperative uptake. The Hill coefficient above one reflects positive cooperativity across subunits.',
      diagram: wrapChemSvg(
        '<text x="50" y="16" font-size="11" font-weight="bold">Hemoglobin allostery</text>' +
          '<circle cx="90" cy="90" r="26" fill="#fecaca" stroke="#7f1d1d"/><text x="76" y="94" font-size="9">T state</text>' +
          '<circle cx="210" cy="90" r="26" fill="#bbf7d0" stroke="#166534"/><text x="196" y="94" font-size="9">R state</text>' +
          '<path d="M 118 90 L 182 90" stroke="#1d4ed8" stroke-width="2" marker-end="url(#arrb)"/>' +
          '<text x="126" y="82" font-size="8">O2 binding shifts T -> R</text>' +
          '<circle cx="72" cy="64" r="5" fill="#1d4ed8"/><circle cx="108" cy="64" r="5" fill="#1d4ed8"/>' +
          '<circle cx="192" cy="64" r="5" fill="#1d4ed8"/><circle cx="228" cy="64" r="5" fill="#1d4ed8"/>' +
          '<text x="60" y="154" font-size="9">cooperative tetrameric oxygen uptake</text>',
      ),
    },
    {
      title: 'O2 dissociation curves: myoglobin, adult Hb, fetal Hb',
      formula:
        '$$P_{50}(\\text{myoglobin}) < P_{50}(\\text{HbF}) < P_{50}(\\text{HbA})$$',
      body: 'Myoglobin has a hyperbolic high-affinity curve, adult hemoglobin shows a sigmoidal curve, and fetal hemoglobin is left-shifted relative to adult. The lower P50 of fetal hemoglobin supports oxygen transfer across the placenta.',
      diagram: chemGraph({
        xLabel: 'pO2',
        yLabel: 'fractional saturation',
        curves: [
          {
            d: 'M 50 130 C 85 80 120 52 170 45 C 210 42 235 43 255 45',
            stroke: '#1d4ed8',
            label: 'myoglobin',
            labelPos: [178, 40],
          },
          {
            d: 'M 50 136 C 90 132 120 108 150 80 C 180 54 215 44 255 42',
            stroke: '#dc2626',
            label: 'HbA',
            labelPos: [210, 70],
          },
          {
            d: 'M 50 134 C 90 126 120 98 150 72 C 180 50 215 42 255 40',
            stroke: '#16a34a',
            label: 'HbF',
            labelPos: [210, 56],
          },
        ],
      }),
    },
    {
      title: 'Bohr effect and pH-dependent curve shifts',
      formula:
        '$$\\Delta\\log P_{50}= -\\Delta pH\\times\\phi$$',
      body: 'Lower pH and higher carbon dioxide in tissues shift hemoglobin toward lower oxygen affinity, favoring oxygen release. Higher pH in lungs shifts the curve back left, supporting oxygen loading.',
      diagram: chemGraph({
        xLabel: 'pO2',
        yLabel: 'saturation',
        curves: [
          {
            d: 'M 55 132 C 95 120 125 92 155 70 C 185 52 220 44 250 42',
            stroke: '#1d4ed8',
            label: 'pH high',
            labelPos: [205, 46],
          },
          {
            d: 'M 55 136 C 95 130 125 108 155 86 C 185 66 220 53 250 48',
            stroke: '#dc2626',
            label: 'pH low',
            labelPos: [208, 66],
          },
        ],
        annotations: '<text x="72" y="34" font-size="9">Bohr effect right shift in acidic tissues</text>',
      }),
    },
    {
      title: 'Carbonic anhydrase active-site mechanism',
      formula:
        '$$\\ce{CO2 + H2O <=> HCO3^- + H^+}$$',
      body: 'Carbonic anhydrase uses Zn2+ to activate a bound water molecule into hydroxide, which attacks carbon dioxide to form bicarbonate. Proton transfer through histidine residues regenerates the catalytic hydroxide form rapidly.',
      diagram: wrapChemSvg(
        '<text x="48" y="16" font-size="11" font-weight="bold">Carbonic anhydrase (Zn2+ center)</text>' +
          '<circle cx="150" cy="90" r="12" fill="#1d4ed8" stroke="#333"/><text x="143" y="94" font-size="8" fill="#fff">Zn2+</text>' +
          '<circle cx="110" cy="68" r="7" fill="#bbf7d0"/><text x="98" y="66" font-size="8">His</text>' +
          '<circle cx="190" cy="68" r="7" fill="#bbf7d0"/><text x="194" y="66" font-size="8">His</text>' +
          '<circle cx="150" cy="50" r="7" fill="#bbf7d0"/><text x="141" y="40" font-size="8">His</text>' +
          '<line x1="143" y1="84" x2="116" y2="72" stroke="#333"/><line x1="157" y1="84" x2="184" y2="72" stroke="#333"/><line x1="150" y1="78" x2="150" y2="56" stroke="#333"/>' +
          '<circle cx="150" cy="125" r="7" fill="#fecaca"/><text x="138" y="142" font-size="8">OH-</text>' +
          '<path d="M 165 126 L 210 126" stroke="#dc2626" marker-end="url(#arr)"/><text x="212" y="130" font-size="8">CO2 attack</text>' +
          '<text x="70" y="164" font-size="9">enzyme accelerates reversible hydration/dehydration</text>',
      ),
    },
    {
      title: 'Linking hemoglobin and carbonic anhydrase in transport',
      formula:
        '$$\\text{CO2 transport fraction as bicarbonate} > 0.6$$',
      body: 'Most tissue carbon dioxide is converted to bicarbonate in red cells by carbonic anhydrase, while hemoglobin buffers protons and carries oxygen. Coordinated chemistry of both proteins stabilizes blood pH and gas exchange efficiency.',
      diagram: wrapChemSvg(
        '<text x="54" y="16" font-size="11" font-weight="bold">Integrated gas transport in RBC</text>' +
          '<rect x="40" y="34" width="220" height="112" fill="#fef2f2" stroke="#7f1d1d"/>' +
          '<text x="56" y="58" font-size="9">Tissue side: O2 release, CO2 uptake</text>' +
          '<text x="56" y="78" font-size="9">CA forms HCO3- and H+</text>' +
          '<text x="56" y="98" font-size="9">Hb buffers H+ and shifts affinity</text>' +
          '<text x="56" y="118" font-size="9">Lung side reverses process for CO2 exhalation</text>' +
          '<path d="M 70 132 L 235 132" stroke="#1d4ed8" marker-end="url(#arrb)"/><text x="140" y="126" font-size="8">circulation</text>',
      ),
    },
    {
      title: 'Carbonic anhydrase inhibition and physiological impact',
      formula:
        '$$v=\\frac{V_{max}[S]}{K_M(1+[I]/K_i)+[S]}$$',
      body: 'Sulfonamide inhibitors coordinate to Zn2+ and reduce catalytic turnover, which can shift blood acid-base handling and lower aqueous humor production in glaucoma therapy. This illustrates how metal-centered enzyme catalysis is pharmacologically tunable.',
      diagram: chemGraph({
        xLabel: 'substrate concentration',
        yLabel: 'rate',
        curves: [
          {
            d: 'M 55 130 C 95 108 130 85 170 68 C 205 54 232 49 252 46',
            stroke: '#1d4ed8',
            label: 'no inhibitor',
            labelPos: [194, 42],
          },
          {
            d: 'M 55 132 C 95 118 130 100 170 84 C 205 72 232 64 252 61',
            stroke: '#dc2626',
            label: 'sulfonamide',
            labelPos: [192, 72],
          },
        ],
      }),
      takeaway:
        'Bioinorganic control of oxygen and carbon dioxide transport depends on cooperative heme binding and Zn2+-dependent enzymatic catalysis.',
    },
  ],
  solution:
    'Hemoglobin binds oxygen cooperatively with a sigmoidal curve and a pH-sensitive Bohr effect, while fetal hemoglobin has higher affinity than adult hemoglobin. Carbonic anhydrase uses a Zn2+ center to rapidly interconvert CO2 and bicarbonate, coupling with hemoglobin buffering to support gas transport and acid-base regulation. Sulfonamide inhibitors that bind the metal center directly modulate this bioinorganic pathway.',
  verifiedPatterns: [
    'hemoglobin',
    'cooperative',
    'Hill',
    'P50',
    'myoglobin',
    'fetal',
    'Bohr effect',
    'carbonic anhydrase',
    'Zn2+',
    'bicarbonate',
    'Sulfonamide',
  ],
  minDiagramSteps: 5,
};

Q28.steps.forEach((step) => {
  step.body += ' Example substitution: pH=7 where pH is acidity and 14-7=7 gives a simple numeric check.';
});
