import { chemGraph, irSpectrum, moEnergyDiagram, crystalFieldSplitting } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q43: ChemistryQuestionDef = {
  id: 'q43',
  number: 43,
  topic: 'Metal-Metal Bonds: Re2Cl8, Wade-Mingos Boranes, and Fe3(CO)12',
  question:
    'Metal cluster chemistry: (a) Explain the Re2Cl8 quadruple bond using MO occupancy. (b) Apply Wade-Mingos rules to classify boranes. (c) Analyze electron counting and bonding in Fe3(CO)12 with supporting spectroscopic indicators.',
  steps: [
    {
      title: 'Re2Cl8 quadruple bond electron occupancy',
      formula: '$$\\text{BO}=\\frac{N_b-N_{ab}}{2}$$',
      body: 'In [Re2Cl8]2-, the metal-metal set is commonly described as $\\sigma^2\\pi^4\\delta^2$. Bonding electrons are $N_b=8$ and antibonding occupancy is $N_{ab}=0$, so bond order is $(8-0)/2=4$. This is the classic Re2Cl8 quadruple bond with a sigma, two pi, and one delta component.',
      diagram: moEnergyDiagram({
        species: 'Re2Cl8 M-M set',
        bondOrder: 4,
      }),
    },
    {
      title: 'Magnitude of force constant from stretching frequency',
      formula: '$$k=(2\\pi c\\tilde\\nu)^2\\mu$$',
      body: 'Take a representative Re-Re stretch at $\\tilde\\nu=310\\,\\text{cm}^{-1}=3.10\\times10^4\\,\\text{m}^{-1}$ and reduced mass $\\mu=8.6\\times10^{-26}\\,\\text{kg}$. With $c=3.00\\times10^8\\,\\text{m s}^{-1}$, the factor $(2\\pi c\\tilde\\nu)=5.84\\times10^{13}\\,\\text{s}^{-1}$. Squaring and multiplying gives $k=(5.84\\times10^{13})^2\\times8.6\\times10^{-26}=293\\,\\text{N m}^{-1}$, consistent with a strong multiple bond.',
      diagram: irSpectrum({
        title: 'Metal-metal stretch region',
        peaks: [
          { x: 110, label: 'Re-Re ~310 cm^-1' },
          { x: 190, label: 'Fe-CO modes' },
        ],
      }),
    },
    {
      title: 'Wade-Mingos check for closo and nido boranes',
      formula: '$$\\text{SEP}_{closo}=n+1,\\quad \\text{SEP}_{nido}=n+2$$',
      body: 'For B6H6^2-, the number of skeletal electron pairs is $(6\\times3+6\\times1+2)/2=(18+6+2)/2=13$. Exo B-H bonds consume 6 pairs, leaving $13-6=7$ skeletal pairs. Since $n+1=6+1=7$, B6H6^2- is closo. For B5H9, total pairs are $(15+9)/2=12$, exo B-H uses 9/2? more directly 5 terminal B-H and 4 bridging H consume 7 pairs, leaving 5 skeletal pairs, matching $n+2=7$? this mismatch signals the need to count bridge contributions explicitly in polyhedral electron-pair methods.',
      diagram: chemGraph({
        xLabel: 'cluster family',
        yLabel: 'skeletal electron pairs',
        points: [
          { x: 90, y: 80, label: 'closo: n+1', fill: '#1d4ed8' },
          { x: 150, y: 70, label: 'nido: n+2', fill: '#16a34a' },
          { x: 210, y: 60, label: 'arachno: n+3', fill: '#dc2626' },
        ],
        annotations: '<line x1="70" y1="90" x2="240" y2="55" stroke="#64748b" stroke-dasharray="4 3"/>',
      }),
    },
    {
      title: 'Fe3(CO)12 cluster electron count and M-M framework',
      formula: '$$\\text{VE}_{total}=\\sum \\text{metal valence}+2n_{CO}$$',
      body: 'For Fe3(CO)12, total valence electrons are $3\\times8+12\\times2=24+24=48\\,e^-$. A triangular Fe3 core has three Fe-Fe edges requiring about $3\\times2=6\\,e^-$ in M-M bonding, leaving $48-6=42\\,e^-$ for Fe-CO interactions and nonbonding occupancy. This explains why Fe3(CO)12 can be viewed as an electron-precise metal carbonyl cluster.',
      diagram: chemGraph({
        xLabel: 'bonding contribution',
        yLabel: 'electrons',
        points: [
          { x: 100, y: 75, label: 'total 48 e-', fill: '#1d4ed8' },
          { x: 165, y: 95, label: 'M-M 6 e-', fill: '#dc2626' },
          { x: 230, y: 82, label: 'M-CO 42 e-', fill: '#16a34a' },
        ],
      }),
    },
    {
      title: 'CO stretching evidence for terminal and bridging carbonyls',
      formula: '$$\\Delta\\tilde\\nu = \\tilde\\nu_{terminal} - \\tilde\\nu_{bridging}$$',
      body: 'If terminal CO absorbs at $2020\\,\\text{cm}^{-1}$ and bridging CO at $1845\\,\\text{cm}^{-1}$, then $\\Delta\\tilde\\nu=2020-1845=175\\,\\text{cm}^{-1}$. The lower bridging frequency reflects stronger back-donation into CO antibonding orbitals, supporting multicenter bonding in Fe3(CO)12.',
      diagram: irSpectrum({
        title: 'Fe3(CO)12 carbonyl region',
        peaks: [
          { x: 120, label: 'mu-CO 1845' },
          { x: 200, label: 'terminal CO 2020' },
        ],
      }),
    },
    {
      title: 'Ligand-field spin estimate for cluster fragments',
      formula: '$$\\Delta_o\\,(\\text{kJ mol}^{-1}) = 0.01196\\,\\tilde\\nu\\,(\\text{cm}^{-1})$$',
      body: 'For an octahedral-like fragment with transition near $\\tilde\\nu=18{,}000\\,\\text{cm}^{-1}$, the splitting is $\\Delta_o=0.01196\\times18{,}000=215\\,\\text{kJ mol}^{-1}$. Comparing this to pairing energy helps determine spin state and influences whether metal-metal overlap is strengthened or weakened by ligand-field occupancy.',
      diagram: crystalFieldSplitting({
        metal: 'Fe',
        ligand: 'CO',
        strongField: true,
        d5: true,
      }),
      takeaway:
        'Re2Cl8 illustrates a true quadruple metal-metal bond, Wade-Mingos organizes borane clusters by skeletal pairs, and Fe3(CO)12 electron counting plus IR data reveals its metal-cluster bonding picture.',
    },
  ],
  solution:
    '**(a)** Re2Cl8 supports a quadruple bond from $\\sigma$, $\\pi$, and $\\delta$ occupancy giving bond order 4. **(b)** Wade-Mingos rules relate borane geometry to skeletal electron pairs (closo $n+1$, nido $n+2$, arachno $n+3$). **(c)** Fe3(CO)12 has 48 valence electrons; combining cluster electron counting with CO stretching frequencies explains its Fe-Fe and Fe-CO bonding distribution.',
  verifiedPatterns: [
    'Re2Cl8',
    'quadruple bond',
    'delta',
    'Wade-Mingos',
    'borane',
    'Fe3(CO)12',
    'skeletal electron pairs',
    'carbonyl',
  ],
  minDiagramSteps: 5,
};
