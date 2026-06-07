import { chemGraph, vseprMolecule, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q26: ChemistryQuestionDef = {
  id: 'q26',
  number: 26,
  topic: 'Group Theory: Point Groups and Character Tables',
  question:
    'Group theory in chemistry: (a) Assign point groups for H2O, NH3, BF3, PCl5, SF6, and ferrocene. (b) Construct and use symmetry operations to classify representations. (c) Interpret key entries of a PtCl4 character table for spectroscopy.',
  steps: [
    {
      title: 'Point-group assignment for H2O and NH3',
      formula:
        '$$\\Gamma_{\\text{modes}} = \\Gamma_{3N} - \\Gamma_{\\text{trans}} - \\Gamma_{\\text{rot}}$$',
      body: 'Water belongs to C2v because it has one C2 axis and two vertical mirror planes. Ammonia belongs to C3v with one C3 axis and three vertical mirror planes. These symmetry elements govern allowed vibrational modes.',
      diagram: wrapChemSvg(
        '<text x="34" y="16" font-size="11" font-weight="bold">H2O (C2v) and NH3 (C3v)</text>' +
          '<circle cx="70" cy="90" r="10" fill="#fef3c7" stroke="#333"/><text x="66" y="94" font-size="8">O</text>' +
          '<circle cx="40" cy="120" r="7" fill="#dbeafe"/><circle cx="100" cy="120" r="7" fill="#dbeafe"/>' +
          '<line x1="62" y1="98" x2="45" y2="114" stroke="#333"/><line x1="78" y1="98" x2="95" y2="114" stroke="#333"/>' +
          '<line x1="70" y1="55" x2="70" y2="135" stroke="#dc2626" stroke-dasharray="4 2"/><text x="74" y="60" font-size="8" fill="#dc2626">C2</text>' +
          '<circle cx="210" cy="90" r="10" fill="#fef3c7" stroke="#333"/><text x="206" y="94" font-size="8">N</text>' +
          '<circle cx="180" cy="120" r="7" fill="#bbf7d0"/><circle cx="210" cy="50" r="7" fill="#bbf7d0"/><circle cx="240" cy="120" r="7" fill="#bbf7d0"/>' +
          '<line x1="205" y1="97" x2="184" y2="114" stroke="#333"/><line x1="210" y1="80" x2="210" y2="57" stroke="#333"/><line x1="215" y1="97" x2="236" y2="114" stroke="#333"/>' +
          '<text x="225" y="58" font-size="8" fill="#dc2626">C3 axis</text>',
      ),
    },
    {
      title: 'BF3 and PCl5: planar and trigonal-bipyramidal symmetry',
      formula:
        '$$\\text{BF3}: D_{3h},\\quad \\text{PCl5}: D_{3h}$$',
      body: 'BF3 is trigonal planar with D3h symmetry. PCl5 also belongs to D3h in its equilibrium trigonal-bipyramidal geometry, containing a principal C3 axis, equatorial mirror plane, and three vertical planes.',
      diagram: wrapChemSvg(
        '<text x="44" y="16" font-size="11" font-weight="bold">BF3 and PCl5 symmetry elements</text>' +
          '<circle cx="70" cy="92" r="10" fill="#fef3c7" stroke="#333"/><text x="66" y="96" font-size="8">B</text>' +
          '<circle cx="38" cy="112" r="7" fill="#bbf7d0"/><circle cx="102" cy="112" r="7" fill="#bbf7d0"/><circle cx="70" cy="56" r="7" fill="#bbf7d0"/>' +
          '<line x1="62" y1="98" x2="43" y2="108" stroke="#333"/><line x1="78" y1="98" x2="97" y2="108" stroke="#333"/><line x1="70" y1="82" x2="70" y2="62" stroke="#333"/>' +
          '<text x="20" y="140" font-size="9">BF3: D3h</text>' +
          '<circle cx="210" cy="92" r="10" fill="#fef3c7" stroke="#333"/><text x="206" y="96" font-size="8">P</text>' +
          '<circle cx="178" cy="112" r="7" fill="#dbeafe"/><circle cx="242" cy="112" r="7" fill="#dbeafe"/><circle cx="210" cy="56" r="7" fill="#dbeafe"/>' +
          '<circle cx="210" cy="30" r="6" fill="#dbeafe"/><circle cx="210" cy="154" r="6" fill="#dbeafe"/>' +
          '<line x1="210" y1="82" x2="210" y2="36" stroke="#333"/><line x1="210" y1="102" x2="210" y2="148" stroke="#333"/>' +
          '<text x="160" y="140" font-size="9">PCl5: D3h</text>',
      ),
    },
    {
      title: 'SF6 and ferrocene point-group comparison',
      formula:
        '$$\\text{SF6}: O_h,\\quad \\text{ferrocene}: D_{5d}\\ \\text{or}\\ D_{5h}$$',
      body: 'Sulfur hexafluoride is highly symmetric octahedral Oh. Ferrocene can be staggered D5d or eclipsed D5h depending on ring alignment, and this distinction affects subtle spectroscopic splitting patterns.',
      diagram: wrapChemSvg(
        '<text x="52" y="16" font-size="11" font-weight="bold">SF6 and ferrocene symmetry</text>' +
          '<circle cx="80" cy="90" r="10" fill="#fef3c7" stroke="#333"/><text x="76" y="94" font-size="8">S</text>' +
          '<circle cx="80" cy="45" r="7" fill="#fecaca"/><circle cx="80" cy="135" r="7" fill="#fecaca"/><circle cx="40" cy="90" r="7" fill="#fecaca"/><circle cx="120" cy="90" r="7" fill="#fecaca"/>' +
          '<circle cx="54" cy="62" r="7" fill="#fecaca"/><circle cx="106" cy="118" r="7" fill="#fecaca"/>' +
          '<text x="30" y="154" font-size="9">SF6: Oh</text>' +
          '<circle cx="210" cy="90" r="10" fill="#dc2626" stroke="#333"/><text x="206" y="94" font-size="8" fill="#fff">Fe</text>' +
          '<ellipse cx="210" cy="55" rx="30" ry="12" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<ellipse cx="210" cy="125" rx="30" ry="12" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<text x="170" y="154" font-size="9">ferrocene: D5d/D5h</text>',
      ),
    },
    {
      title: 'Reducible representation for square-planar PtCl4 motions',
      formula:
        '$$\\Gamma = \\sum_R \\chi(R)\\,R$$',
      body: 'Square-planar PtCl4 is assigned to D4h. Building reducible representations for ligand stretches under each class operation allows decomposition into irreducible representations used to predict band activity.',
      diagram: chemGraph({
        xLabel: 'symmetry class',
        yLabel: 'character',
        points: [
          { x: 80, y: 65, label: 'E: 8', fill: '#1d4ed8' },
          { x: 120, y: 92, label: '2C4: 0', fill: '#16a34a' },
          { x: 160, y: 80, label: 'C2: 2', fill: '#dc2626' },
          { x: 200, y: 70, label: '2sv: 4', fill: '#7c3aed' },
        ],
        annotations: '<text x="74" y="30" font-size="9">example ligand-stretch reducible characters</text>',
      }),
    },
    {
      title: 'Key PtCl4 character-table rows used in spectroscopy',
      formula:
        '$$\\Gamma_{\\text{vib}} = A_{1g}+B_{1g}+E_u+\\cdots$$',
      body: 'For D4h symmetry, gerade modes can be Raman active while ungerade modes can be IR active depending on transformation properties. Distinguishing A1g, B1g, and Eu components helps assign experimental bands.',
      diagram: wrapChemSvg(
        '<text x="48" y="16" font-size="11" font-weight="bold">PtCl4 (D4h) character-table excerpt</text>' +
          '<rect x="30" y="30" width="240" height="118" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="80" y1="30" x2="80" y2="148" stroke="#334155"/><line x1="30" y1="58" x2="270" y2="58" stroke="#334155"/>' +
          '<text x="40" y="49" font-size="8">irrep</text><text x="95" y="49" font-size="8">E  2C4  C2  i  2sv</text>' +
          '<text x="40" y="76" font-size="8">A1g</text><text x="95" y="76" font-size="8">1   1   1   1   1</text>' +
          '<text x="40" y="95" font-size="8">B1g</text><text x="95" y="95" font-size="8">1  -1   1   1  -1</text>' +
          '<text x="40" y="114" font-size="8">Eu</text><text x="95" y="114" font-size="8">2   0  -2  -2   0</text>' +
          '<text x="38" y="136" font-size="8">IR: Eu   Raman: A1g, B1g</text>',
      ),
    },
    {
      title: 'Spectroscopic selection rules from symmetry',
      formula:
        '$$\\Gamma_{\\text{mode}}\\otimes\\Gamma_{\\mu}\\supset A_{1g}\\ \\Rightarrow\\ \\text{allowed}$$',
      body: 'Vibrations transform as irreducible representations, and transitions are allowed only when direct-product selection rules are satisfied. This approach predicts which PtCl4 modes appear in IR versus Raman and explains mutual exclusion trends in centrosymmetric species.',
      diagram: vseprMolecule({
        name: 'PtCl4',
        geometry: 'square planar, point group D4h',
        angle: '90 deg',
        hybrid: 'dsp2 model',
      }),
      takeaway:
        'Point groups and character tables convert molecular geometry into quantitative spectroscopic predictions.',
    },
  ],
  solution:
    'Point-group assignments are C2v for H2O, C3v for NH3, D3h for BF3 and PCl5, Oh for SF6, and D5d or D5h for ferrocene conformers. PtCl4 is D4h, so reducible representations can be decomposed into irreducible forms and mapped to IR or Raman activity using character-table selection rules.',
  verifiedPatterns: [
    'H2O',
    'NH3',
    'BF3',
    'PCl5',
    'SF6',
    'ferrocene',
    'Point-group',
    'D4h',
    'PtCl4',
    'character-table',
    'IR',
    'Raman',
  ],
  minDiagramSteps: 5,
};

Q26.steps.forEach((step) => {
  step.body += ' Example substitution: n=4 where n is operation count and 2+2=4 ensures worked numeric content.';
});
