import { chemGraph, energyProfile, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q30: ChemistryQuestionDef = {
  id: 'q30',
  number: 30,
  topic: 'Pericyclic Reactions and Frontier Molecular Orbitals',
  question:
    'Pericyclic chemistry with frontier orbitals: (a) Explain Diels-Alder orbital interactions and stereoselectivity. (b) Apply Woodward-Hoffmann orbital-symmetry rules. (c) Predict electrocyclic and sigmatropic outcomes under thermal or photochemical conditions.',
  steps: [
    {
      title: 'Diels-Alder HOMO-LUMO overlap and concerted bonding',
      formula:
        '$$\\Delta E_{\\text{int}} \\propto \\frac{S^2}{\\Delta E_{\\text{HOMO-LUMO}}}$$',
      body: 'The diene HOMO overlaps with the dienophile LUMO in a suprafacial-suprafacial six-electron transition state. Better energy match and orbital phase alignment lower activation energy and increase cycloaddition rate.',
      diagram: wrapChemSvg(
        '<text x="34" y="16" font-size="11" font-weight="bold">Diels-Alder FMO interaction</text>' +
          '<line x1="40" y1="70" x2="120" y2="70" stroke="#1d4ed8" stroke-width="2"/><text x="45" y="62" font-size="8">diene HOMO</text>' +
          '<line x1="40" y1="110" x2="120" y2="110" stroke="#334155" stroke-width="2"/><text x="45" y="124" font-size="8">diene LUMO</text>' +
          '<line x1="180" y1="85" x2="260" y2="85" stroke="#dc2626" stroke-width="2"/><text x="185" y="77" font-size="8">dienophile LUMO</text>' +
          '<line x1="180" y1="125" x2="260" y2="125" stroke="#334155" stroke-width="2"/><text x="185" y="139" font-size="8">dienophile HOMO</text>' +
          '<path d="M 120 70 L 180 85" stroke="#16a34a" stroke-width="1.5" marker-end="url(#arrg)"/>' +
          '<text x="122" y="62" font-size="8" fill="#16a34a">constructive phase match</text>',
      ),
    },
    {
      title: 'Endo preference in Diels-Alder transition state',
      formula:
        '$$\\frac{\\text{endo}}{\\text{exo}} = e^{-\\Delta\\Delta G^{\\ddagger}/RT}$$',
      body: 'Endo products are often favored under kinetic control because secondary orbital interactions stabilize the endo transition state. The preference is strongest for electron-withdrawing substituents on the dienophile.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          {
            d: 'M 50 130 C 95 128 125 72 165 62 L 250 62',
            stroke: '#1d4ed8',
            label: 'endo path',
            labelPos: [175, 56],
          },
          {
            d: 'M 50 130 C 95 128 125 52 165 45 L 250 62',
            stroke: '#dc2626',
            label: 'exo path',
            labelPos: [176, 40],
          },
        ],
      }),
    },
    {
      title: 'Woodward-Hoffmann orbital-symmetry framework',
      formula:
        '$$\\text{allowed if total phase continuity is conserved}$$',
      body: 'Woodward-Hoffmann rules classify pericyclic reactions by electron count and topology under thermal or photochemical conditions. Allowed pathways preserve orbital symmetry along the cyclic transition state, while forbidden pathways require phase inversion.',
      diagram: wrapChemSvg(
        '<text x="26" y="16" font-size="11" font-weight="bold">Woodward-Hoffmann decision table</text>' +
          '<rect x="25" y="30" width="250" height="118" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="95" y1="30" x2="95" y2="148" stroke="#334155"/><line x1="25" y1="58" x2="275" y2="58" stroke="#334155"/>' +
          '<text x="35" y="49" font-size="8">system</text><text x="104" y="49" font-size="8">thermal</text><text x="190" y="49" font-size="8">photochemical</text>' +
          '<text x="35" y="78" font-size="8">4n electrocyclic</text><text x="110" y="78" font-size="8">conrotatory</text><text x="194" y="78" font-size="8">disrotatory</text>' +
          '<text x="35" y="98" font-size="8">4n+2 electrocyclic</text><text x="110" y="98" font-size="8">disrotatory</text><text x="194" y="98" font-size="8">conrotatory</text>' +
          '<text x="35" y="118" font-size="8">[4+2] cycloaddition</text><text x="110" y="118" font-size="8">allowed</text><text x="194" y="118" font-size="8">often altered</text>',
      ),
    },
    {
      title: 'Electrocyclic ring closure stereochemistry',
      formula:
        '$$4n:\\ \\text{thermal conrotatory},\\quad 4n+2:\\ \\text{thermal disrotatory}$$',
      body: 'In electrocyclic reactions, terminal p orbitals rotate in opposite or same directions depending on electron count and excitation mode. This rotational mode determines whether substituents end up cis or trans in the cyclic product.',
      diagram: wrapChemSvg(
        '<text x="44" y="16" font-size="11" font-weight="bold">Electrocyclic motion modes</text>' +
          '<line x1="45" y1="95" x2="115" y2="95" stroke="#1d4ed8" stroke-width="2"/><line x1="115" y1="95" x2="185" y2="95" stroke="#1d4ed8" stroke-width="2"/><line x1="185" y1="95" x2="255" y2="95" stroke="#1d4ed8" stroke-width="2"/>' +
          '<path d="M 45 80 A 20 20 0 0 1 45 110" stroke="#dc2626" fill="none" marker-end="url(#arr)"/><text x="20" y="76" font-size="8">rotate</text>' +
          '<path d="M 255 80 A 20 20 0 0 0 255 110" stroke="#16a34a" fill="none" marker-end="url(#arrg)"/><text x="258" y="76" font-size="8">rotate</text>' +
          '<text x="95" y="58" font-size="9">disrotatory example</text><text x="90" y="142" font-size="9">conrotatory swaps one arrow direction</text>',
      ),
    },
    {
      title: 'Sigmatropic shifts and migration topology',
      formula:
        '$$[i,j]\\ \\text{shift allowed when suprafacial/antarafacial symmetry is satisfied}$$',
      body: 'Sigmatropic rearrangements move a sigma bond across a conjugated pi framework. For example, a thermal [3,3] Claisen rearrangement proceeds through a concerted six-electron cyclic transition state, while higher-order shifts may require antarafacial components.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          {
            d: 'M 55 128 C 95 122 130 78 165 70 L 252 64',
            stroke: '#7c3aed',
            label: '[3,3] shift',
            labelPos: [176, 64],
          },
        ],
        annotations:
          '<text x="74" y="38" font-size="9">concerted cyclic transition state</text>' +
          '<text x="74" y="152" font-size="9">suprafacial pathway favored in many thermal cases</text>',
      }),
    },
    {
      title: 'Unified FMO strategy for pericyclic prediction',
      formula:
        '$$\\text{reactivity index} = f(\\Delta E_{\\text{FMO}},\\ \\text{symmetry},\\ \\text{substituent effects})$$',
      body: 'Practical prediction starts by matching electron count, then checking thermal or photochemical mode, and finally confirming orbital phase relationships. This workflow correctly anticipates Diels-Alder stereochemistry, electrocyclic rotation, and sigmatropic feasibility.',
      diagram: energyProfile({
        title: 'Pericyclic pathway selection',
        hasIntermediate: false,
      }),
      takeaway:
        'Pericyclic outcomes are controlled by frontier orbital symmetry, giving consistent Woodward-Hoffmann rules across cycloadditions, electrocyclic reactions, and sigmatropic shifts.',
    },
  ],
  solution:
    'Diels-Alder reactions proceed through suprafacial HOMO-LUMO overlap and often show endo kinetic preference. Woodward-Hoffmann rules determine whether thermal or photochemical pericyclic pathways are symmetry-allowed, including conrotatory or disrotatory electrocyclic outcomes. Sigmatropic rearrangements are likewise governed by orbital topology and phase continuity.',
  verifiedPatterns: [
    'Diels-Alder',
    'HOMO',
    'LUMO',
    'suprafacial',
    'Woodward-Hoffmann',
    'electrocyclic',
    'conrotatory',
    'disrotatory',
    'sigmatropic',
    'Claisen',
    'pericyclic',
  ],
  minDiagramSteps: 5,
};
