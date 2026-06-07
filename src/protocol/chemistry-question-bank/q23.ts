import { chemGraph, irSpectrum, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q23: ChemistryQuestionDef = {
  id: 'q23',
  number: 23,
  topic: 'Mass Spectrometry and IR: Ketones, Carboxylic Acids, and Alkanes',
  question:
    'Mass spectrometry and IR spectroscopy: (a) Analyze EI-MS fragmentation for 2-pentanone. (b) Explain the acetic acid IR profile including hydrogen-bonded dimer effects. (c) Assign major n-hexane fragment ions and rationalize peak intensities.',
  steps: [
    {
      title: '2-pentanone molecular ion and base peak assignment',
      formula:
        '$$m/z_{M^+\\bullet}=86$$',
      body: '2-pentanone gives a molecular ion at mass-to-charge 86 and a strong base peak at 43 from acylium formation. A smaller peak near 58 is consistent with alpha cleavage on the other side of the carbonyl.',
      diagram: chemGraph({
        xLabel: 'm/z',
        yLabel: 'relative intensity',
        curves: [
          { d: 'M 90 140 L 90 50', stroke: '#dc2626', label: '43 base', labelPos: [74, 44] },
          { d: 'M 150 140 L 150 95', stroke: '#1d4ed8', label: '58', labelPos: [142, 90] },
          { d: 'M 220 140 L 220 85', stroke: '#16a34a', label: '86 M+', labelPos: [208, 80] },
        ],
      }),
    },
    {
      title: 'Alpha cleavage routes in 2-pentanone',
      formula:
        '$$\\ce{R_1-CO-R_2 -> R_1CO^+ + R_2\\bullet}$$',
      body: 'Electron impact ionization is followed by bond cleavage next to the carbonyl carbon. This pathway stabilizes charge on the acylium fragment and explains why m over z 43 dominates the spectrum.',
      diagram: wrapChemSvg(
        '<text x="68" y="16" font-size="11" font-weight="bold">2-pentanone alpha cleavage</text>' +
          '<text x="20" y="72" font-size="11">CH3-CO-CH2-CH2-CH3</text>' +
          '<line x1="105" y1="64" x2="135" y2="64" stroke="#dc2626" stroke-width="2"/>' +
          '<line x1="145" y1="64" x2="175" y2="64" stroke="#dc2626" stroke-width="2"/>' +
          '<path d="M 180 64 L 230 64" stroke="#1d4ed8" stroke-width="2"/>' +
          '<text x="184" y="56" font-size="9">EI</text>' +
          '<text x="18" y="118" font-size="10">CH3CO+  (m/z 43)</text>' +
          '<text x="155" y="118" font-size="10">C3H7+  (m/z 43 alternative)</text>' +
          '<text x="22" y="150" font-size="9">carbonyl-adjacent cleavage stabilizes charge</text>',
      ),
    },
    {
      title: 'Acetic acid IR spectrum and dimer-broadened O-H band',
      formula:
        '$$\\tilde{\\nu}(\\text{C=O})\\approx1710\\,\\text{cm}^{-1}$$',
      body: 'Acetic acid shows a very broad O-H absorption from about 2500 to 3300 per centimeter because hydrogen-bonded dimers create a distribution of O-H strengths. A strong carbonyl band remains near 1710 per centimeter.',
      diagram: irSpectrum({
        title: 'Acetic acid IR with dimer effects',
        peaks: [
          { x: 95, label: 'broad O-H' },
          { x: 165, label: 'C=O' },
          { x: 220, label: 'C-O' },
        ],
      }),
    },
    {
      title: 'Hydrogen-bonded acetic acid dimer motif',
      formula:
        '$$2\\,\\ce{CH3COOH} \\rightleftharpoons (\\ce{CH3COOH})_2$$',
      body: 'Two acetic acid molecules form a cyclic dimer through two O-H to O hydrogen bonds. The cooperative ring structure lowers O-H stretching frequency and broadens the corresponding IR envelope.',
      diagram: wrapChemSvg(
        '<text x="56" y="16" font-size="11" font-weight="bold">Acetic acid cyclic dimer</text>' +
          '<circle cx="95" cy="88" r="28" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<circle cx="205" cy="88" r="28" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<text x="82" y="92" font-size="10">COOH</text><text x="192" y="92" font-size="10">COOH</text>' +
          '<line x1="120" y1="74" x2="180" y2="74" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 2"/>' +
          '<line x1="120" y1="102" x2="180" y2="102" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 2"/>' +
          '<text x="130" y="68" font-size="8" fill="#dc2626">H-bond</text><text x="132" y="116" font-size="8" fill="#dc2626">H-bond</text>' +
          '<text x="66" y="148" font-size="9">dimer ring explains broad acid O-H region</text>',
      ),
    },
    {
      title: 'n-hexane fragmentation pattern in EI-MS',
      formula:
        '$$\\ce{C6H14^+\\bullet -> C4H9+\\ (m/z\\ 57) + C2H5\\bullet}$$',
      body: 'Straight-chain alkane fragmentation often favors secondary carbocations. For n-hexane, m over z 57 and 43 are typically strong, while the molecular ion at 86 is weak because the radical cation is less stable.',
      diagram: chemGraph({
        xLabel: 'm/z',
        yLabel: 'relative intensity',
        curves: [
          { d: 'M 95 140 L 95 80', stroke: '#1d4ed8', label: '43', labelPos: [90, 74] },
          { d: 'M 145 140 L 145 55', stroke: '#dc2626', label: '57 base', labelPos: [128, 48] },
          { d: 'M 225 140 L 225 120', stroke: '#16a34a', label: '86 weak M+', labelPos: [203, 118] },
        ],
      }),
    },
    {
      title: 'Combined MS and IR logic for unknown assignment',
      formula:
        '$$\\text{diagnostic confidence} = w_{MS}+w_{IR}$$',
      body: 'A spectrum with m over z 43 and 86 plus strong carbonyl absorption supports 2-pentanone, whereas a broad acid O-H envelope indicates acetic acid dimerization. Alkane-like n-hexane lacks both carbonyl and broad acid O-H features.',
      diagram: chemGraph({
        xLabel: 'candidate',
        yLabel: 'evidence match',
        points: [
          { x: 95, y: 62, label: '2-pentanone', fill: '#dc2626' },
          { x: 155, y: 72, label: 'acetic acid', fill: '#1d4ed8' },
          { x: 215, y: 96, label: 'n-hexane', fill: '#16a34a' },
        ],
        annotations: '<text x="70" y="30" font-size="9">lower y indicates stronger multi-technique match</text>',
      }),
      takeaway:
        'MS fragmentation and IR functional-group bands are complementary fingerprints for carbonyl, acid dimer, and hydrocarbon identification.',
    },
  ],
  solution:
    '2-pentanone is recognized by molecular ion m over z 86 and a dominant fragment near 43 from alpha cleavage. Acetic acid IR shows broad dimeric O-H absorption and a strong C=O band, while n-hexane is identified by alkyl fragment ions such as m over z 57 with weak molecular ion intensity. Joint MS and IR interpretation improves structure confidence.',
  verifiedPatterns: [
    '2-pentanone',
    'm over z 86',
    '43',
    'alpha cleavage',
    'acetic acid',
    'dimer',
    '2500 to 3300',
    'C=O',
    'n-hexane',
    '57',
    'fragment',
  ],
  minDiagramSteps: 5,
};
