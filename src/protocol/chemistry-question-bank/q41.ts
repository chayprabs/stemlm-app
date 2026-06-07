import { chemGraph, energyProfile, moEnergyDiagram, particleInBox } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q41: ChemistryQuestionDef = {
  id: 'q41',
  number: 41,
  topic: 'Computational Chemistry: PES, Huckel vs Ab Initio, and Basis Functions',
  question:
    'Computational chemistry: (a) Draw and interpret the potential energy surface for the H + H2 exchange reaction. (b) Compare Huckel and ab initio approaches for pi systems. (c) Explain basis-function quality (minimal vs split-valence vs polarized) and quantify its effect on computed energies.',
  steps: [
    {
      title: 'Potential energy surface for H + H2 exchange',
      formula: '$$E_a = E_{TS} - E_R$$',
      body: 'For a collinear H + H2 path, take reactants at $E_R=-1.170\\,E_h$ and the saddle point at $E_{TS}=-1.130\\,E_h$. The barrier is $E_a=0.040\\,E_h$. Using $1\\,E_h=2625.5\\,\\text{kJ mol}^{-1}$ gives $E_a=0.040\\times2625.5=105\\,\\text{kJ mol}^{-1}$, consistent with an activated exchange on the potential energy surface.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'E',
        curves: [
          {
            d: 'M 45 120 C 85 112 120 72 150 62 C 180 72 215 112 255 120',
            stroke: '#1d4ed8',
            label: 'H + H2 PES cut',
            labelPos: [155, 56],
          },
        ],
        points: [
          { x: 70, y: 112, label: 'R', fill: '#16a34a' },
          { x: 150, y: 62, label: 'TS', fill: '#dc2626' },
          { x: 230, y: 112, label: 'P', fill: '#16a34a' },
        ],
      }),
    },
    {
      title: 'Rate estimate from transition-state barrier',
      formula: '$$k = \\frac{k_B T}{h}\\exp\\!\\left(-\\frac{E_a}{RT}\\right)$$',
      body: 'At $T=1000\\,\\text{K}$, $k_B T/h=(1.381\\times10^{-23}\\times1000)/(6.626\\times10^{-34})=2.08\\times10^{13}\\,\\text{s}^{-1}$. With $E_a=105\\,\\text{kJ mol}^{-1}$, the exponential term is $\\exp[-105000/(8.314\\times1000)]=3.3\\times10^{-6}$. So $k=2.08\\times10^{13}\\times3.3\\times10^{-6}=6.9\\times10^7\\,\\text{s}^{-1}$ on this 1D cut.',
      diagram: energyProfile({
        title: 'H + H2 exchange barrier profile',
      }),
    },
    {
      title: 'Huckel pi-energy estimate for butadiene',
      formula: '$$E_k = \\alpha + 2\\beta\\cos\\!\\left(\\frac{k\\pi}{n+1}\\right)$$',
      body: 'For butadiene ($n=4$) with $\\beta=-2.90\\,\\text{eV}$, occupied levels are $k=1,2$. Relative to $\\alpha$, $E_1-\\alpha=2\\beta\\cos(\\pi/5)=-4.69\\,\\text{eV}$ and $E_2-\\alpha=2\\beta\\cos(2\\pi/5)=-1.79\\,\\text{eV}$. Total pi energy for 4 electrons is $2E_1+2E_2=2\\alpha-12.96\\,\\text{eV}$, a rapid Huckel estimate.',
      diagram: moEnergyDiagram({
        species: 'pi-system sketch',
        bondOrder: 2,
        n2Ordering: true,
      }),
    },
    {
      title: 'Ab initio cost and scaling compared with Huckel',
      formula: '$$t_2 = t_1\\left(\\frac{N_2}{N_1}\\right)^4$$',
      body: 'A Hartree-Fock SCF cycle scales approximately as $N^4$. If 50 basis functions require $t_1=12\\,\\text{s}$, then 100 functions require $t_2=12\\times(100/50)^4=12\\times16=192\\,\\text{s}$. Huckel diagonalization scales far more gently for the same pi framework, so it is much faster but less transferable.',
      diagram: chemGraph({
        xLabel: 'basis functions N',
        yLabel: 'compute time',
        curves: [
          { d: 'M 50 130 C 100 128 150 110 200 75 C 220 60 240 40 255 25', stroke: '#dc2626', label: 'ab initio ~N^4', labelPos: [170, 48] },
          { d: 'M 50 130 C 110 122 170 110 255 95', stroke: '#1d4ed8', label: 'Huckel', labelPos: [205, 103] },
        ],
      }),
    },
    {
      title: 'Basis-set improvement: minimal to polarized split-valence',
      formula: '$$\\Delta E = E_{\\text{small}} - E_{\\text{large}}$$',
      body: 'Suppose STO-3G gives $E=-153.2040\\,E_h$ and 6-31G(d) gives $E=-153.2765\\,E_h$ for the same geometry. The change is $\\Delta E=(-153.2040)-(-153.2765)=0.0725\\,E_h$, or $0.0725\\times2625.5=190\\,\\text{kJ mol}^{-1}$ of additional variational stabilization from better basis functions.',
      diagram: particleInBox(2),
    },
    {
      title: 'Correlation recovery beyond Hartree-Fock',
      formula: '$$\\%\\,\\text{corr recovered}=\\frac{E_{HF}-E_{method}}{E_{HF}-E_{exact}}\\times100$$',
      body: 'Take $E_{HF}=-153.2765\\,E_h$, $E_{MP2}=-153.3010\\,E_h$, and a reference $E_{exact}=-153.3200\\,E_h$. Then the recovered fraction is $(-153.2765+153.3010)/(-153.2765+153.3200)=0.0245/0.0435=0.563$. Therefore MP2 captures about $56\\%$ of the missing correlation energy for this example.',
      diagram: particleInBox(3),
      takeaway:
        'For computational chemistry, the potential energy surface gives mechanism, Huckel gives fast qualitative pi trends, and ab initio with better basis sets improves quantitative accuracy.',
    },
  ],
  solution:
    '**(a)** The H + H2 potential energy surface has a saddle point and a barrier around $105\\,\\text{kJ mol}^{-1}$ on the chosen cut. **(b)** Huckel gives fast analytical pi-level estimates, while ab initio methods are more general but computationally heavier. **(c)** Larger basis functions (for example STO-3G to 6-31G(d)) lower variational energies and improve observables. **(d)** Post-Hartree-Fock correlation methods recover part of the remaining electron-correlation error.',
  verifiedPatterns: [
    'H + H2',
    'potential energy surface',
    'Huckel',
    'ab initio',
    'basis functions',
    'STO-3G',
    '6-31G',
    'Hartree-Fock',
  ],
  minDiagramSteps: 5,
};
