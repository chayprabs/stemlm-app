import { chemGraph, vseprMolecule } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q03: ChemistryQuestionDef = {
  id: 'q03',
  number: 3,
  topic: 'VSEPR and Hybridisation',
  question:
    'VSEPR and hybridisation analysis with molecular orbital language where relevant: (a) Determine shapes for PCl5, SF4, ClF3, XeF4, IF5, XeF2, SO3, and ICl4⁻ using steric number and electron-domain geometry. (b) Compare SF4 vs XeF4 bond angles and polarity. (c) Explain CO3²⁻ resonance and average bond order. (d) Justify PCl5 as sp3d hybridisation.',
  steps: [
    {
      title: 'Steric number counting for AXmEn species',
      formula: '$$\\text{SN} = \\frac{V + M - C + A}{2}$$',
      body: 'Here $V$ is central-atom valence electrons, $M$ is number of attached monovalent atoms, $C$ is positive charge, and $A$ is negative charge. Using this gives: for PCl5, $\\text{SN}=(5+5-0+0)/2=5$; for SF4, $\\text{SN}=(6+4-0+0)/2=5$; for ClF3, $\\text{SN}=(7+3-0+0)/2=5$; for XeF4, $\\text{SN}=(8+4-0+0)/2=6$. For IF5, $\\text{SN}=(7+5-0+0)/2=6$; for XeF2, $\\text{SN}=(8+2-0+0)/2=5$; for SO3, sigma-domain counting gives $\\text{SN}=3+0=3$; for ICl4^- add charge: $\\text{SN}=(7+4-0+1)/2=6$.',
      diagram: chemGraph({
        xLabel: 'Species index',
        yLabel: 'Steric number',
        points: [
          { x: 60, y: 70, label: 'PCl5:5', fill: '#1d4ed8' },
          { x: 90, y: 70, label: 'SF4:5', fill: '#1d4ed8' },
          { x: 120, y: 70, label: 'ClF3:5', fill: '#1d4ed8' },
          { x: 150, y: 50, label: 'XeF4:6', fill: '#dc2626' },
          { x: 180, y: 50, label: 'IF5:6', fill: '#dc2626' },
          { x: 210, y: 70, label: 'XeF2:5', fill: '#1d4ed8' },
          { x: 240, y: 50, label: 'ICl4-:6', fill: '#dc2626' },
        ],
        annotations: '<text x="70" y="28" font-size="10">SN=5 (trigonal bipyramidal e-domain), SN=6 (octahedral e-domain)</text>',
      }),
    },
    {
      title: 'VSEPR geometries for PCl5, SF4, ClF3, and XeF2',
      body: 'For SN = 5 systems, molecular geometry depends on lone pairs: PCl5 is AX5 trigonal bipyramidal, SF4 is AX4E seesaw, ClF3 is AX3E2 T-shaped, XeF2 is AX2E3 linear. The equatorial lone-pair preference minimizes 90° repulsions, reducing SF4 axial-equatorial angles from ideal $120^\\circ$ to about $102^\\circ$, while XeF2 remains $180^\\circ$.',
      diagram: vseprMolecule({
        name: 'SF4',
        geometry: 'AX4E seesaw',
        angle: '102° / 173°',
        hybrid: 'sp3d',
        lonePairs: 1,
      }),
    },
    {
      title: 'SF4 versus XeF4: lone-pair arrangement and polarity',
      formula: '$$\\mu_{\\text{net}} \\approx \\left|\\sum \\vec{\\mu}_{\\text{bond}}\\right|$$',
      body: 'In this expression, $\\mu_{\\text{bond}}$ means each bond-dipole vector and $\\mu_{\\text{net}}$ is the molecular dipole magnitude. SF4 has 1 lone pair and 4 S–F bonds, so vector cancellation is incomplete: with a rough component sum $1.6+1.6-1.1-0.9=1.2$ D, $\\mu_{\\text{net}}\\approx 1.2$ D (polar). XeF4 has 2 lone pairs trans in AX4E2 square planar, and opposite Xe–F dipoles cancel: $1.9+1.9-1.9-1.9=0.0$ D, so it is essentially nonpolar.',
      diagram: vseprMolecule({
        name: 'XeF4',
        geometry: 'AX4E2 square planar',
        angle: '90° / 180°',
        hybrid: 'sp3d2',
        lonePairs: 2,
      }),
      takeaway: 'Lone-pair count alone is not enough; symmetry decides whether bond dipoles cancel.',
    },
    {
      title: 'IF5 and ICl4⁻ from octahedral electron domains',
      formula: '$$\\text{FC}(\\mathrm{I}) = 7 - \\left(4 + \\frac{8}{2}\\right) = 7-(4+4)=-1$$',
      body: 'Both IF5 and ICl4⁻ have SN = 6 (octahedral electron-domain framework). IF5 is AX5E square pyramidal with one lone pair; ICl4⁻ is AX4E2 square planar with two lone pairs opposite each other. For ICl4⁻, iodine has 4 nonbonding electrons and 8 bonding electrons, so $\\text{FC}(\\mathrm{I})=7-(4+8/2)=7-8=-1$, matching the anion charge.',
      diagram: vseprMolecule({
        name: 'IF5',
        geometry: 'AX5E square pyramidal',
        angle: '84° / 90°',
        hybrid: 'sp3d2',
        lonePairs: 1,
      }),
    },
    {
      title: 'SO3 and CO3²⁻ resonance and average bond order',
      formula: '$$\\text{average bond order} = \\frac{2+1+1}{3}=\\frac{4}{3}=1.33$$',
      body: 'For carbonate, three equivalent resonance contributors distribute one C=O and two C–O in each form, so each C–O bond averages $4/3=1.33$. If typical lengths are $d_{\\mathrm{C=O}}=1.20$ A and $d_{\\mathrm{C-O}}=1.36$ A, then a weighted estimate gives $d_{\\text{avg}}=(1.20+1.36+1.36)/3=1.31$ A, close to measured carbonate values. SO3 is similarly trigonal planar with delocalized S–O pi bonding and near-equal S–O distances.',
      diagram: chemGraph({
        xLabel: 'Resonance form',
        yLabel: 'Relative bond order',
        points: [
          { x: 90, y: 90, label: 'form 1: 2,1,1', fill: '#1d4ed8' },
          { x: 150, y: 90, label: 'form 2: 1,2,1', fill: '#16a34a' },
          { x: 210, y: 90, label: 'form 3: 1,1,2', fill: '#dc2626' },
        ],
        annotations: '<text x="95" y="50" font-size="10">Average C-O bond order = 1.33 for CO3^2-</text>',
      }),
    },
    {
      title: 'Why PCl5 is described as sp3d hybridisation',
      formula: '$$5\\ \\sigma\\text{-bonds} + 0\\ \\text{lone pairs} = 5\\ \\text{electron domains}$$',
      body: 'PCl5 requires 5 electron domains around phosphorus, so VSEPR gives trigonal bipyramidal geometry and traditional hybrid labelling as sp3d. Counting domains directly: $5+0=5$. In modern molecular orbital treatment, bonding is better described as delocalized 3-center-4-electron contributions with strong ligand participation, but the sp3d label still predicts geometry and approximate bond angles $120^\\circ$, $90^\\circ$, and $180^\\circ$.',
      diagram: vseprMolecule({
        name: 'PCl5',
        geometry: 'AX5 trigonal bipyramidal',
        angle: '90° / 120° / 180°',
        hybrid: 'sp3d',
        lonePairs: 0,
      }),
    },
  ],
  solution:
    'SN counting gives PCl5, SF4, ClF3, XeF2 as SN=5 and XeF4, IF5, ICl4⁻ as SN=6. Geometries are: PCl5 trigonal bipyramidal, SF4 seesaw, ClF3 T-shaped, XeF2 linear, XeF4 square planar, IF5 square pyramidal, SO3 trigonal planar, ICl4⁻ square planar. SF4 is polar (non-cancelling dipoles) while XeF4 is nonpolar (symmetric cancellation). CO3^2- has resonance with average bond order 1.33 and equalized C-O lengths. PCl5 is classically labelled sp3d hybridisation and also explainable using molecular orbital delocalization.',
  verifiedPatterns: [
    'PCl5',
    'SF4',
    'XeF4',
    'CO3^2-',
    'average bond order',
    'sp3d',
    'square planar',
    'seesaw',
  ],
  minDiagramSteps: 5,
};
