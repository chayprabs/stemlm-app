import { chemGraph, crystalUnitCell, pnJunction } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q44: ChemistryQuestionDef = {
  id: 'q44',
  number: 44,
  topic: 'Solid State Chemistry: Crystal Packing, Band Structure, and XRD',
  question:
    'Solid-state chemistry: (a) Compare sc, bcc, fcc, and hcp structures using coordination and packing arguments. (b) Relate crystal structure to electronic band structure. (c) Use Debye-Scherrer and Bragg methods to extract crystallite and lattice parameters from XRD data.',
  steps: [
    {
      title: 'Packing fractions for sc, bcc, fcc, and hcp',
      formula:
        '$$\\text{APF}=\\frac{N\\,\\frac{4}{3}\\pi r^3}{a^3}$$',
      body: 'Using standard geometry relations: sc has $N=1$ and $a=2r$, giving APF $=\\pi/6=0.52$. bcc has $N=2$ and $a=4r/\\sqrt{3}$, giving APF $=0.68$. fcc and hcp both reach close packing with APF $=0.74$. Therefore sc is most open while fcc and hcp are densest.',
      diagram: chemGraph({
        xLabel: 'structure',
        yLabel: 'APF',
        points: [
          { x: 80, y: 120, label: 'sc 0.52', fill: '#dc2626' },
          { x: 135, y: 95, label: 'bcc 0.68', fill: '#1d4ed8' },
          { x: 190, y: 82, label: 'fcc 0.74', fill: '#16a34a' },
          { x: 245, y: 82, label: 'hcp 0.74', fill: '#7c3aed' },
        ],
      }),
    },
    {
      title: 'Coordination numbers and nearest-neighbor distances',
      formula:
        '$$d_{nn}^{sc}=a,\\quad d_{nn}^{bcc}=\\frac{\\sqrt{3}}{2}a,\\quad d_{nn}^{fcc}=\\frac{a}{\\sqrt{2}}$$',
      body: 'For $a=4.00\\,\\text{A}$, nearest-neighbor spacing is $d_{nn}^{sc}=4.00\\,\\text{A}$. For bcc, $d_{nn}^{bcc}=0.866\\times4.00=3.46\\,\\text{A}$. For fcc, $d_{nn}^{fcc}=4.00/1.414=2.83\\,\\text{A}$. Corresponding coordination numbers are 6 (sc), 8 (bcc), and 12 (fcc/hcp).',
      diagram: crystalUnitCell({
        type: 'cscl',
        label: 'bcc-like nearest neighbors',
      }),
    },
    {
      title: 'Debye-Scherrer crystallite size from peak broadening',
      formula:
        '$$D=\\frac{K\\lambda}{\\beta\\cos\\theta}$$',
      body: 'With $K=0.90$, Cu Kalpha wavelength $\\lambda=0.154\\,\\text{nm}$, full-width $\\beta=0.0050\\,\\text{rad}$, and $2\\theta=36.0^\\circ$ so $\\theta=18.0^\\circ$, $\\cos\\theta=0.951$. Then $D=(0.90\\times0.154)/(0.0050\\times0.951)=29.1\\,\\text{nm}$. This indicates nanocrystalline broadening.',
      diagram: chemGraph({
        xLabel: '2theta',
        yLabel: 'intensity',
        curves: [
          { d: 'M 60 125 C 95 120 120 55 145 45 C 170 55 195 120 230 125', stroke: '#1d4ed8', label: 'broadened peak', labelPos: [148, 42] },
        ],
        annotations: '<text x="82" y="138" font-size="9">beta from FWHM</text>',
      }),
    },
    {
      title: 'Bragg law and cubic lattice parameter extraction',
      formula:
        '$$n\\lambda=2d\\sin\\theta,\\quad d_{hkl}=\\frac{a}{\\sqrt{h^2+k^2+l^2}}$$',
      body: 'For first-order reflection ($n=1$) at $2\\theta=44.0^\\circ$, $\\theta=22.0^\\circ$. With $\\lambda=1.540\\,\\text{A}$, spacing is $d=1.540/(2\\sin22.0^\\circ)=2.06\\,\\text{A}$. If this is the (110) line, then $a=d\\sqrt{2}=2.06\\times1.414=2.91\\,\\text{A}$.',
      diagram: chemGraph({
        xLabel: 'h^2+k^2+l^2',
        yLabel: '1/d^2',
        curves: [
          { d: 'M 55 125 L 250 55', stroke: '#dc2626', label: 'cubic indexing line', labelPos: [145, 63] },
        ],
      }),
    },
    {
      title: 'Band-structure consequence of periodic solids',
      formula:
        '$$n_i \\propto \\exp\\!\\left(-\\frac{E_g}{2k_B T}\\right)$$',
      body: 'At $T=300\\,\\text{K}$, compare Si ($E_g=1.12\\,\\text{eV}$) and a wider-gap oxide ($E_g=3.20\\,\\text{eV}$). The **band structure** gap sets intrinsic carrier density via $\\exp[-(3.20-1.12)/(2\\times8.617\\times10^{-5}\\times300)]$. The exponent is $-40.2$, so the ratio is about $3.4\\times10^{-18}$, showing why large-gap solids are insulating.',
      diagram: pnJunction(),
    },
    {
      title: 'hcp metric check from c/a ratio',
      formula: '$$\\frac{c}{a}=\\sqrt{\\frac{8}{3}}=1.633$$',
      body: 'If an hcp metal has $a=2.95\\,\\text{A}$, ideal close-packed value predicts $c=1.633\\times2.95=4.82\\,\\text{A}$. If measured $c=4.78\\,\\text{A}$, deviation is $(4.78-4.82)/4.82=-0.8\\%$, meaning the lattice is very close to ideal hcp packing.',
      diagram: crystalUnitCell({
        type: 'zns',
        label: 'close-packed motif reference',
      }),
      takeaway:
        'Solid-state analysis links geometry (sc/bcc/fcc/hcp), diffraction (Bragg and Debye-Scherrer), and electronics (band structure and carrier density).',
    },
  ],
  solution:
    '**(a)** sc, bcc, fcc, and hcp differ in coordination and packing efficiency, with fcc/hcp closest packed. **(b)** XRD peak positions and widths give lattice constants and crystallite size through Bragg and Debye-Scherrer equations. **(c)** Periodic potentials create bands; the band gap sets intrinsic carrier concentration and therefore conductivity class.',
  verifiedPatterns: [
    'sc',
    'bcc',
    'fcc',
    'hcp',
    'band structure',
    'Debye-Scherrer',
    'Bragg',
    'crystallite',
  ],
  minDiagramSteps: 5,
};
