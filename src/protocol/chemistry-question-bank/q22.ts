import { chemGraph, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q22: ChemistryQuestionDef = {
  id: 'q22',
  number: 22,
  topic: 'Advanced NMR Spectroscopy: 1H, Coupling Trees, DEPT, and COSY',
  question:
    'Advanced NMR spectroscopy: (a) Interpret 1H NMR data for substituted organic compounds. (b) Construct coupling trees and extract J values. (c) Use DEPT spectra to classify CH, CH2, and CH3 carbons. (d) Use COSY cross-peaks to build proton connectivities.',
  steps: [
    {
      title: '1H NMR assignment for an ethyl fragment and aldehyde signal',
      formula:
        '$$\\delta = \\delta_{\\text{ref}} + k\\,\\Delta\\chi$$',
      body: 'A spectrum with triplet at 1.20 ppm integrating to 3 H, quartet at 2.55 ppm integrating to 2 H, and singlet at 9.80 ppm integrating to 1 H fits an ethyl aldehyde pattern. The integration ratio 3 to 2 to 1 supports CH3, CH2, and CHO environments.',
      diagram: chemGraph({
        xLabel: 'chemical shift ppm',
        yLabel: 'intensity',
        curves: [
          { d: 'M 80 140 L 80 78', stroke: '#1d4ed8', label: 't, 3H', labelPos: [66, 72] },
          { d: 'M 150 140 L 150 96', stroke: '#16a34a', label: 'q, 2H', labelPos: [138, 90] },
          { d: 'M 230 140 L 230 58', stroke: '#dc2626', label: 's, 1H', labelPos: [216, 52] },
        ],
        annotations: '<text x="98" y="160" font-size="9">downfield to the right in this schematic</text>',
      }),
    },
    {
      title: 'First-order coupling tree for CH3CH2 unit',
      formula:
        '$$n+1\\ \\text{rule}$$',
      body: 'The CH3 group sees two neighboring protons and appears as a triplet, while CH2 sees three neighboring protons and appears as a quartet. Equal spacing in each multiplet gives a common coupling constant around 7 Hz for a simple ethyl system.',
      diagram: wrapChemSvg(
        '<text x="10" y="18" font-size="11" font-weight="bold">Coupling tree (ethyl fragment)</text>' +
          '<line x1="50" y1="40" x2="90" y2="80" stroke="#1d4ed8"/><line x1="50" y1="40" x2="90" y2="120" stroke="#1d4ed8"/>' +
          '<line x1="90" y1="80" x2="130" y2="65" stroke="#1d4ed8"/><line x1="90" y1="80" x2="130" y2="95" stroke="#1d4ed8"/>' +
          '<line x1="90" y1="120" x2="130" y2="105" stroke="#1d4ed8"/><line x1="90" y1="120" x2="130" y2="135" stroke="#1d4ed8"/>' +
          '<text x="18" y="38" font-size="9">CH2 parent</text><text x="136" y="103" font-size="9">quartet</text>' +
          '<line x1="185" y1="50" x2="225" y2="90" stroke="#dc2626"/><line x1="185" y1="50" x2="225" y2="130" stroke="#dc2626"/>' +
          '<line x1="225" y1="90" x2="255" y2="90" stroke="#dc2626"/><line x1="225" y1="130" x2="255" y2="130" stroke="#dc2626"/>' +
          '<text x="158" y="48" font-size="9">CH3 parent</text><text x="258" y="113" font-size="9">triplet</text>' +
          '<text x="95" y="158" font-size="9">equal line spacing gives J ~ 7 Hz</text>',
      ),
    },
    {
      title: 'Extracting coupling constants from multiplet spacing',
      formula:
        '$$J = \\Delta\\nu = \\Delta\\text{ppm}\\times\\nu_0$$',
      body: 'On a 400 MHz instrument, a line separation of 0.0175 ppm corresponds to 7.0 Hz. Matching J for the quartet and triplet confirms vicinal coupling between CH2 and CH3 rather than unrelated accidental overlap.',
      diagram: chemGraph({
        xLabel: 'line index',
        yLabel: 'relative frequency',
        points: [
          { x: 90, y: 120, label: 'line 1', fill: '#1d4ed8' },
          { x: 120, y: 110, label: 'line 2', fill: '#1d4ed8' },
          { x: 150, y: 110, label: 'line 3', fill: '#1d4ed8' },
          { x: 180, y: 120, label: 'line 4', fill: '#1d4ed8' },
        ],
        annotations:
          '<line x1="90" y1="126" x2="120" y2="126" stroke="#333"/><text x="93" y="138" font-size="9">7 Hz</text>' +
          '<line x1="120" y1="126" x2="150" y2="126" stroke="#333"/><text x="123" y="138" font-size="9">7 Hz</text>',
      }),
    },
    {
      title: 'DEPT-90 and DEPT-135 interpretation',
      formula:
        '$$I_{135}(\\text{CH, CH3}) > 0,\\quad I_{135}(\\text{CH2}) < 0$$',
      body: 'A carbon that appears in DEPT-90 is CH only. In DEPT-135, CH and CH3 peaks are positive while CH2 peaks are inverted. Quaternary carbons are absent from DEPT spectra and must be located from the broadband-decoupled 13C experiment.',
      diagram: chemGraph({
        xLabel: 'carbon shift',
        yLabel: 'phase',
        curves: [
          { d: 'M 70 90 L 70 50', stroke: '#1d4ed8', label: 'CH3 +', labelPos: [56, 44] },
          { d: 'M 120 90 L 120 40', stroke: '#16a34a', label: 'CH +', labelPos: [109, 34] },
          { d: 'M 170 90 L 170 125', stroke: '#dc2626', label: 'CH2 -', labelPos: [156, 136] },
        ],
        annotations: '<line x1="40" y1="90" x2="260" y2="90" stroke="#334155" stroke-dasharray="4 3"/>',
      }),
    },
    {
      title: 'COSY map and through-bond proton connectivity',
      formula:
        '$$\\text{cross-peak} \\Rightarrow \\text{scalar coupling between spins}$$',
      body: 'Diagonal peaks represent each proton itself, while off-diagonal cross-peaks identify coupled pairs. A cross-peak between 2.55 ppm and 1.20 ppm confirms CH2 to CH3 connectivity. Absence of a cross-peak from 9.80 ppm to 1.20 ppm shows no direct vicinal coupling there.',
      diagram: wrapChemSvg(
        '<text x="95" y="16" font-size="11" font-weight="bold">COSY spectrum</text>' +
          '<rect x="60" y="30" width="170" height="120" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="60" y1="150" x2="230" y2="30" stroke="#64748b" stroke-dasharray="4 3"/>' +
          '<circle cx="90" cy="130" r="4" fill="#1d4ed8"/><circle cx="140" cy="95" r="4" fill="#16a34a"/><circle cx="210" cy="55" r="4" fill="#dc2626"/>' +
          '<circle cx="140" cy="130" r="4" fill="#7c3aed"/><circle cx="90" cy="95" r="4" fill="#7c3aed"/>' +
          '<text x="68" y="164" font-size="9">F2 ppm</text><text x="12" y="38" font-size="9">F1 ppm</text>' +
          '<text x="146" y="91" font-size="8">diag</text><text x="145" y="126" font-size="8">cross-peak</text>',
      ),
    },
    {
      title: 'Integrated structure call from 1H NMR plus DEPT plus COSY',
      formula:
        '$$\\text{consistency score} = \\sum_i w_i\\,\\mathbf{1}(\\text{feature matched})$$',
      body: 'Combining integration, multiplicity, DEPT phases, and COSY connectivities gives a consistent assignment map with no unpaired proton fragments. This combined strategy is more reliable than any single spectrum when peaks overlap.',
      diagram: chemGraph({
        xLabel: 'evidence channel',
        yLabel: 'match score',
        points: [
          { x: 80, y: 70, label: '1H shift', fill: '#1d4ed8' },
          { x: 120, y: 62, label: 'multiplicity', fill: '#16a34a' },
          { x: 160, y: 66, label: 'DEPT', fill: '#dc2626' },
          { x: 200, y: 58, label: 'COSY', fill: '#7c3aed' },
        ],
        annotations: '<text x="72" y="28" font-size="9">all channels agree with one structure</text>',
      }),
      takeaway:
        'Advanced NMR uses integration, J couplings, DEPT phase, and COSY cross-peaks to build a robust structural assignment.',
    },
  ],
  solution:
    'A reliable 1H NMR assignment uses integration and multiplicity first, then confirms neighbors with coupling trees and J values. DEPT-90 and DEPT-135 classify CH, CH2, and CH3 carbons, while COSY cross-peaks map coupled proton networks. Agreement among 1H NMR, DEPT, and COSY provides high-confidence structure determination.',
  verifiedPatterns: [
    '1H NMR',
    'triplet',
    'quartet',
    'coupling tree',
    'J',
    'DEPT-90',
    'DEPT-135',
    'CH2',
    'COSY',
    'cross-peak',
    'integration',
  ],
  minDiagramSteps: 5,
};
