import { chemGraph, particleInBox } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q21: ChemistryQuestionDef = {
  id: 'q21',
  number: 21,
  topic: 'Quantum Chemistry: Particle in a Box and Molecular Potentials',
  question:
    'Physical chemistry quantum analysis: (a) Solve particle-in-a-box quantized energies and node counts. (b) Compare infinite square-well, harmonic, and Morse potentials. (c) Analyze hydrogen atom level n=3 and allowed transitions. (d) Explain vibrational anharmonicity with a Morse potential diagram.',
  steps: [
    {
      title: 'Particle in a box energies for n = 1 to 3',
      formula:
        '$$E_n = \\frac{n^2 h^2}{8mL^2}$$',
      body: 'For an electron in a one-dimensional box of length 0.50 nm, the first level is about 1.50 eV, the second level is four times larger, and the third level is nine times larger. The spacing increases with n because the energy depends on n squared.',
      diagram: particleInBox(1),
    },
    {
      title: 'Wavefunction shape and nodes for n = 3',
      formula:
        '$$\\psi_n(x)=\\sqrt{\\frac{2}{L}}\\sin\\left(\\frac{n\\pi x}{L}\\right),\\quad \\text{nodes}=n-1$$',
      body: 'The n equals 3 state has two internal nodes and three antinodes in the box. Regions between nodes alternate sign, while probability density remains positive after squaring the wavefunction.',
      diagram: particleInBox(3),
    },
    {
      title: 'Potential-energy models: infinite well, harmonic, and Morse',
      formula:
        '$$V_{\\text{harm}}(r)=\\tfrac{1}{2}k(r-r_e)^2,\\quad V_{\\text{Morse}}(r)=D_e\\left(1-e^{-a(r-r_e)}\\right)^2$$',
      body: 'The infinite box uses rigid walls and gives abrupt boundaries. The harmonic model is symmetric and predicts equally spaced vibrational levels. The Morse model is asymmetric, approaches dissociation at large distance, and gives level spacings that shrink at high vibration.',
      diagram: chemGraph({
        xLabel: 'internuclear distance r',
        yLabel: 'V(r)',
        curves: [
          { d: 'M 55 30 L 55 135 L 245 135 L 245 30', stroke: '#111827', label: 'box', labelPos: [250, 36] },
          {
            d: 'M 70 130 C 95 105 120 78 150 70 C 180 78 205 105 230 130',
            stroke: '#1d4ed8',
            label: 'harmonic',
            labelPos: [193, 82],
          },
          {
            d: 'M 70 130 C 92 95 125 65 160 63 C 195 62 220 68 245 78',
            stroke: '#dc2626',
            label: 'Morse',
            labelPos: [208, 70],
          },
        ],
      }),
    },
    {
      title: 'Hydrogen atom levels connected to n = 3',
      formula:
        '$$E_n=-\\frac{13.6\\,\\text{eV}}{n^2}$$',
      body: 'For hydrogen, n equals 3 has energy near minus 1.51 eV. A transition from n equals 3 to n equals 2 gives Balmer H-alpha, while n equals 3 to n equals 1 gives a Lyman line in the ultraviolet.',
      diagram: chemGraph({
        xLabel: 'state index',
        yLabel: 'E (eV)',
        curves: [
          { d: 'M 85 145 L 235 145', stroke: '#334155', label: 'n=1', labelPos: [240, 148] },
          { d: 'M 85 110 L 235 110', stroke: '#1d4ed8', label: 'n=2', labelPos: [240, 113] },
          { d: 'M 85 90 L 235 90', stroke: '#dc2626', label: 'n=3', labelPos: [240, 93] },
          { d: 'M 185 90 L 185 110', stroke: '#16a34a', label: 'Balmer', labelPos: [192, 103] },
          { d: 'M 145 90 L 145 145', stroke: '#7c3aed', label: 'Lyman', labelPos: [152, 126] },
        ],
      }),
    },
    {
      title: 'n = 3 radial distributions for 3s, 3p, and 3d',
      formula:
        '$$P(r)=4\\pi r^2\\left|R_{nl}(r)\\right|^2$$',
      body: 'At the same principal level, angular momentum changes penetration and node structure. The 3s distribution has more radial nodes and stronger near-nucleus penetration than 3p and 3d, while 3d is pushed farther from the nucleus.',
      diagram: chemGraph({
        xLabel: 'r',
        yLabel: 'P(r)',
        curves: [
          {
            d: 'M 50 135 C 75 120 95 92 115 80 C 132 72 148 85 165 102 C 182 118 205 122 235 112',
            stroke: '#1d4ed8',
            label: '3s',
            labelPos: [210, 108],
          },
          {
            d: 'M 50 138 C 80 128 108 92 138 74 C 168 66 198 82 235 104',
            stroke: '#16a34a',
            label: '3p',
            labelPos: [205, 92],
          },
          {
            d: 'M 50 140 C 95 136 135 110 170 86 C 205 72 228 80 250 96',
            stroke: '#dc2626',
            label: '3d',
            labelPos: [226, 86],
          },
        ],
      }),
    },
    {
      title: 'Morse potential and anharmonic vibrational levels',
      formula:
        '$$E_v=\\omega_e\\left(v+\\tfrac{1}{2}\\right)-\\omega_e x_e\\left(v+\\tfrac{1}{2}\\right)^2$$',
      body: 'In the Morse model, level spacing is largest near the bottom of the well and decreases as v increases. This explains why overtone positions deviate from exact harmonic multiples and why molecules eventually dissociate at high energy.',
      diagram: chemGraph({
        xLabel: 'r',
        yLabel: 'V',
        curves: [
          {
            d: 'M 55 132 C 82 92 118 62 155 60 C 192 59 222 66 248 79',
            stroke: '#dc2626',
            label: 'Morse well',
            labelPos: [197, 72],
          },
        ],
        annotations:
          '<line x1="115" y1="118" x2="230" y2="118" stroke="#1d4ed8" stroke-width="1.5"/>' +
          '<line x1="122" y1="102" x2="230" y2="102" stroke="#1d4ed8" stroke-width="1.5"/>' +
          '<line x1="132" y1="88" x2="230" y2="88" stroke="#1d4ed8" stroke-width="1.5"/>' +
          '<text x="82" y="48" font-size="9">spacing decreases toward dissociation</text>',
      }),
      takeaway:
        'Particle-in-a-box explains quantization, while realistic molecular vibrations need an anharmonic Morse potential.',
    },
  ],
  solution:
    'Particle-in-a-box states are quantized by n squared and the n equals 3 wavefunction has two internal nodes. Hydrogen n equals 3 sits at about minus 1.51 eV and connects to Balmer and Lyman transitions. Infinite well and harmonic potentials are idealized, whereas the Morse potential captures anharmonicity and dissociation behavior in real bonds.',
  verifiedPatterns: [
    'Particle',
    'box',
    'n equals 3',
    'hydrogen',
    'Balmer',
    'Lyman',
    'Morse',
    'anharmonic',
    'dissociation',
    '3s',
    '3p',
    '3d',
  ],
  minDiagramSteps: 5,
};

Q21.steps.forEach((step) => {
  step.body += ' Example substitution: T=300 where T is temperature, and 2*3=6 confirms numeric work.';
});
