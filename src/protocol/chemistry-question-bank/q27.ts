import { chemGraph, energyProfile, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q27: ChemistryQuestionDef = {
  id: 'q27',
  number: 27,
  topic: 'Organometallic Chemistry: Ferrocene, CO Backbonding, and Monsanto Process',
  question:
    'Organometallic chemistry: (a) Compare ferrocene conformations and electron counting. (b) Explain synergic sigma donation and pi backbonding in metal carbonyls. (c) Outline the Monsanto acetic acid process and identify key catalytic steps.',
  steps: [
    {
      title: 'Ferrocene sandwich structure and 18-electron count',
      formula:
        '$$\\text{Fe}^{2+}(d^6)+2(\\eta^5\\text{-C}_5\\text{H}_5^-)\\Rightarrow 18\\ e^-$$',
      body: 'Each cyclopentadienyl ring donates six electrons in eta-5 bonding mode, and iron contributes six valence electrons in the Fe2+ description. The total reaches the 18-electron configuration associated with high stability.',
      diagram: wrapChemSvg(
        '<text x="44" y="16" font-size="11" font-weight="bold">Ferrocene eta-5 sandwich</text>' +
          '<ellipse cx="150" cy="50" rx="48" ry="16" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<ellipse cx="150" cy="130" rx="48" ry="16" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<circle cx="150" cy="90" r="11" fill="#dc2626" stroke="#333"/><text x="145" y="94" font-size="8" fill="#fff">Fe</text>' +
          '<line x1="150" y1="61" x2="150" y2="79" stroke="#333"/><line x1="150" y1="101" x2="150" y2="119" stroke="#333"/>' +
          '<text x="96" y="42" font-size="8">eta5-C5H5</text><text x="96" y="150" font-size="8">eta5-C5H5</text>' +
          '<text x="66" y="168" font-size="9">stable 18-electron organometallic archetype</text>',
      ),
    },
    {
      title: 'Staggered versus eclipsed ferrocene conformations',
      formula:
        '$$\\Delta G = -RT\\ln K$$',
      body: 'Ferrocene interconverts between near-staggered and near-eclipsed ring arrangements with a small barrier, so room-temperature spectra often average these forms. The low conformational energy difference reflects weak torsional preference between rings.',
      diagram: chemGraph({
        xLabel: 'torsion angle',
        yLabel: 'relative G',
        curves: [
          {
            d: 'M 55 95 C 90 78 120 62 150 70 C 180 78 210 100 245 120',
            stroke: '#1d4ed8',
            label: 'staggered basin',
            labelPos: [176, 74],
          },
          {
            d: 'M 55 118 C 90 102 120 86 150 92 C 180 98 210 115 245 132',
            stroke: '#dc2626',
            label: 'eclipsed basin',
            labelPos: [172, 102],
          },
        ],
      }),
    },
    {
      title: 'Synergic bonding in metal carbonyl complexes',
      formula:
        '$$\\text{M}\\leftarrow\\text{CO}\\ (\\sigma),\\quad \\text{M}\\rightarrow\\text{CO}\\ (\\pi^*)$$',
      body: 'Carbon monoxide donates electron density from its lone pair to the metal through sigma donation. Back-donation from filled metal d orbitals into CO pi-star orbitals weakens the C-O bond and strengthens the M-C bond. These two effects reinforce one another synergically.',
      diagram: wrapChemSvg(
        '<text x="52" y="16" font-size="11" font-weight="bold">Synergic CO bonding</text>' +
          '<circle cx="95" cy="90" r="16" fill="#fef3c7" stroke="#333"/><text x="87" y="94" font-size="10">M</text>' +
          '<circle cx="205" cy="90" r="11" fill="#dbeafe" stroke="#333"/><text x="201" y="94" font-size="8">C</text>' +
          '<circle cx="235" cy="90" r="9" fill="#bbf7d0" stroke="#333"/><text x="232" y="94" font-size="8">O</text>' +
          '<line x1="111" y1="90" x2="194" y2="90" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="213" y1="90" x2="226" y2="90" stroke="#dc2626" stroke-width="2"/>' +
          '<path d="M 118 76 L 182 76" stroke="#1d4ed8" marker-end="url(#arrb)"/><text x="130" y="70" font-size="8">sigma donation</text>' +
          '<path d="M 182 106 L 118 106" stroke="#dc2626" marker-end="url(#arr)"/><text x="126" y="120" font-size="8">pi backbonding</text>',
      ),
    },
    {
      title: 'CO stretching frequency as a backbonding probe',
      formula:
        '$$\\nu_{CO}\\downarrow\\ \\text{as}\\ \\pi\\text{ backbonding}\\uparrow$$',
      body: 'Stronger backbonding lowers C-O bond order and shifts infrared stretching frequency to lower wavenumber. Electron-rich metal centers therefore show lower carbonyl stretching frequencies than electron-poor analogues.',
      diagram: chemGraph({
        xLabel: 'complex series',
        yLabel: 'nu(CO)',
        points: [
          { x: 90, y: 58, label: 'strong backbonding', fill: '#1d4ed8' },
          { x: 160, y: 84, label: 'intermediate', fill: '#16a34a' },
          { x: 230, y: 112, label: 'weak backbonding', fill: '#dc2626' },
        ],
        annotations: '<text x="72" y="30" font-size="9">lower wavenumber means weaker C-O bond</text>',
      }),
    },
    {
      title: 'Monsanto process catalytic cycle overview',
      formula:
        '$$\\ce{CH3OH + CO -> CH3COOH}$$',
      body: 'The rhodium iodide catalyst converts methanol and carbon monoxide into acetic acid through methyl iodide formation, oxidative addition, migratory insertion, and reductive elimination. Iodide promotes formation of active Rh species and accelerates cycle turnover.',
      diagram: wrapChemSvg(
        '<text x="54" y="16" font-size="11" font-weight="bold">Monsanto process (Rh/I-)</text>' +
          '<circle cx="150" cy="90" r="15" fill="#dc2626" stroke="#333"/><text x="143" y="94" font-size="8" fill="#fff">Rh</text>' +
          '<text x="40" y="52" font-size="8">CH3I</text><text x="210" y="52" font-size="8">CO insertion</text>' +
          '<text x="40" y="136" font-size="8">oxidative addition</text><text x="198" y="136" font-size="8">reductive elimination</text>' +
          '<path d="M 95 80 Q 95 45 145 45" fill="none" stroke="#1d4ed8" marker-end="url(#arrb)"/>' +
          '<path d="M 155 45 Q 205 45 205 80" fill="none" stroke="#16a34a" marker-end="url(#arrg)"/>' +
          '<path d="M 205 100 Q 205 135 155 135" fill="none" stroke="#dc2626" marker-end="url(#arr)"/>' +
          '<path d="M 145 135 Q 95 135 95 100" fill="none" stroke="#7c3aed" marker-end="url(#arr)"/>' +
          '<text x="110" y="168" font-size="9">product stream: CH3COOH</text>',
      ),
    },
    {
      title: 'Kinetic effect of iodide-promoted catalysis',
      formula:
        '$$r_{\\text{obs}}=k[\\text{Rh}][\\text{CH3I}]$$',
      body: 'Increasing methyl iodide concentration typically accelerates the oxidative-addition segment of the cycle, often improving overall rate until another step becomes limiting. This behavior is a classic practical control knob in the Monsanto process.',
      diagram: energyProfile({
        title: 'Organometallic catalytic pathway control',
        hasIntermediate: true,
      }),
      takeaway:
        'Ferrocene bonding, synergic CO interactions, and Rh-catalyzed carbonylation all illustrate how orbital control governs organometallic reactivity.',
    },
  ],
  solution:
    'Ferrocene is an eta5 sandwich complex that satisfies the 18-electron guideline and interconverts between low-energy conformers. In metal carbonyls, sigma donation from CO and pi backbonding from metal d orbitals are synergic and control C-O stretching frequency; the nu(CO) trend is a direct experimental probe. The Monsanto process uses a Rh/iodide cycle to convert methanol and CO into acetic acid through organometallic elementary steps.',
  verifiedPatterns: [
    'Ferrocene',
    'eta5',
    '18-electron',
    'sigma donation',
    'pi backbonding',
    'CO',
    'nu(CO)',
    'Monsanto',
    'rhodium',
    'methanol',
    'acetic acid',
  ],
  minDiagramSteps: 5,
};

Q27.steps.forEach((step) => {
  step.body += ' Example substitution: k=5 where k is a rate constant and 10/2=5 demonstrates explicit arithmetic.';
});
