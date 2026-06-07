import { chemGraph, energyProfile, particleInBox } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q47: ChemistryQuestionDef = {
  id: 'q47',
  number: 47,
  topic: 'Nuclear Chemistry: Nuclides, Binding Energy, and U-235 Fission',
  question:
    'Nuclear chemistry: (a) Interpret the chart of nuclides and neutron-to-proton trends. (b) Compute binding energy from mass defect. (c) Quantify U-235 fission energetics and simple reactor multiplication metrics.',
  steps: [
    {
      title: 'Chart of nuclides and N/Z ratio trend',
      formula: '$$\\frac{N}{Z}=\\frac{A-Z}{Z}$$',
      body: 'For U-235, neutrons are $N=235-92=143$, so $N/Z=143/92=1.55$. For Fe-56, $N=30$ and $Z=26$, giving $N/Z=1.15$. The larger N/Z required for heavy nuclei reflects stronger Coulomb repulsion at high proton number.',
      diagram: chemGraph({
        xLabel: 'Z',
        yLabel: 'N',
        curves: [
          { d: 'M 50 120 C 95 110 140 95 190 70 C 220 55 240 42 260 30', stroke: '#1d4ed8', label: 'valley of stability', labelPos: [155, 62] },
        ],
        points: [
          { x: 120, y: 95, label: 'Fe-56', fill: '#16a34a' },
          { x: 235, y: 42, label: 'U-235', fill: '#dc2626' },
        ],
      }),
    },
    {
      title: 'Binding energy from mass defect',
      formula:
        '$$E_b=\\Delta m\\,c^2,\\quad \\Delta m=Zm_p+Nm_n-m_{nucleus}$$',
      body: 'The mass defect is $\\Delta m=Zm_p+Nm_n-m_{nucleus}$, where $m_p$ is the proton mass and $m_n$ is the neutron mass. For Fe-56 with $Z=26$, $N=30$, $m_p=1.007276\\,u$, $m_n=1.008665\\,u$, and $m_{nucleus}=55.9207\\,u$, $\\Delta m=0.5285\\,u$. Total binding is $0.5285\\times931.5=492\\,\\text{MeV}$, or $8.79\\,\\text{MeV per nucleon}$.',
      diagram: chemGraph({
        xLabel: 'mass number A',
        yLabel: 'Eb/A (MeV)',
        curves: [
          { d: 'M 50 120 C 90 70 120 45 150 40 C 180 45 210 60 250 85', stroke: '#dc2626', label: 'binding-energy curve', labelPos: [145, 34] },
        ],
      }),
    },
    {
      title: 'Radioactive decay and half-life calculation',
      formula:
        '$$N(t)=N_0e^{-\\lambda t},\\quad t_{1/2}=\\frac{0.693}{\\lambda}$$',
      body: 'If a nuclide has decay constant $\\lambda=2.10\\times10^{-4}\\,\\text{s}^{-1}$, then half-life is $t_{1/2}=0.693/(2.10\\times10^{-4})=3300\\,\\text{s}=55.0\\,\\text{min}$. After $t=110\\,\\text{min}$ (two half-lives), remaining fraction is $(1/2)^2=0.25$.',
      diagram: chemGraph({
        xLabel: 'time',
        yLabel: 'N/N0',
        curves: [
          { d: 'M 50 50 C 100 78 150 100 200 115 C 225 122 242 127 255 130', stroke: '#1d4ed8', label: 'exponential decay', labelPos: [155, 108] },
        ],
      }),
    },
    {
      title: 'U-235 fission Q-value and energy per mole',
      formula: '$$Q=\\Delta m\\,c^2$$',
      body: 'Take an effective fission mass defect of $\\Delta m=0.215\\,u$ per U-235 event. Then $Q=0.215\\times931.5=200\\,\\text{MeV}$ per fission. Converting to joules gives $200\\times10^6\\times1.602\\times10^{-19}=3.20\\times10^{-11}\\,\\text{J}$ each. Per mole, energy is $3.20\\times10^{-11}\\times6.022\\times10^{23}=1.93\\times10^{13}\\,\\text{J mol}^{-1}$.',
      diagram: energyProfile({
        title: 'U-235 fission energy release',
      }),
    },
    {
      title: 'Neutron multiplication factor in a thermal reactor',
      formula:
        '$$k_{eff}=\\eta f p \\varepsilon$$',
      body: 'The neutron multiplication factor is $k_{eff}=\\eta f p \\varepsilon$. Using $\\eta=2.05$, $f=0.72$, $p=0.88$, and $\\varepsilon=1.03$ gives $k_{eff}=2.05\\times0.72\\times0.88\\times1.03=1.34$. Because $k_{eff}>1$, the system is supercritical; control rods must reduce reactivity toward $k_{eff}=1.00$.',
      diagram: chemGraph({
        xLabel: 'generation',
        yLabel: 'neutron population',
        curves: [
          { d: 'M 50 120 C 95 110 140 98 185 82 C 220 70 240 60 255 50', stroke: '#dc2626', label: 'k>1', labelPos: [210, 44] },
          { d: 'M 50 120 L 255 120', stroke: '#16a34a', label: 'k=1', labelPos: [210, 114] },
        ],
      }),
    },
    {
      title: 'Quantum confinement analogy for neutron states',
      formula:
        '$$E_n=\\frac{n^2h^2}{8mL^2}$$',
      body: 'With $L=1.0\\times10^{-14}\\,\\text{m}$, neutron mass $m=1.675\\times10^{-27}\\,\\text{kg}$, and $n=1$, level spacing estimate is $E_1=h^2/(8mL^2)=3.28\\times10^{-14}\\,\\text{J}=0.205\\,\\text{MeV}$. This rough particle-in-a-box scale is comparable to nuclear level separations.',
      diagram: particleInBox(1),
      takeaway:
        'Nuclear stability, binding-energy trends, and U-235 fission energetics are quantitatively linked by mass defect and neutron-balance concepts.',
    },
  ],
  solution:
    '**(a)** The chart of nuclides shows heavier stable nuclei requiring larger $N/Z$. **(b)** Binding energy follows directly from mass defect, with Fe-region nuclei near maximum binding per nucleon. **(c)** U-235 fission releases about $200\\,\\text{MeV}$ per event, and reactor behavior is governed by the neutron multiplication factor $k_{eff}$.',
  verifiedPatterns: [
    'chart of nuclides',
    'N/Z',
    'binding energy',
    'mass defect',
    'U-235 fission',
    'k_eff',
    'half-life',
    'MeV',
  ],
  minDiagramSteps: 5,
};
