import { phylogeneticTree, virusStructures, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q47: BiologyQuestionDef = {
  id: 'q47',
  number: 47,
  topic: 'Three Domains, Extremophiles, Archaeal Phylogeny, and Horizontal Gene Transfer',
  question:
    'In microbiology and evolution, compare Bacteria, Archaea, and Eukarya in a domain table, explain extremophile adaptations, interpret archaeal placement on the tree of life, and contrast horizontal gene transfer by transformation, transduction, and conjugation.',
  steps: [
    {
      title: 'Build a three-domain comparison table',
      body: 'Domain-level distinctions include cell structure, membrane chemistry, gene-expression machinery, and typical habitats. Bacteria and Archaea are prokaryotic, while Eukarya has membrane-bound organelles and nucleus.',
      diagram: wrapBioSvg(
        '<rect x="14" y="22" width="272" height="126" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="88" y1="22" x2="88" y2="148" stroke="#334155"/><line x1="172" y1="22" x2="172" y2="148" stroke="#334155"/><line x1="14" y1="46" x2="286" y2="46" stroke="#334155"/>' +
          '<text x="50" y="40" font-size="10" text-anchor="middle">feature</text><text x="130" y="40" font-size="10" text-anchor="middle">Bacteria</text><text x="214" y="40" font-size="10" text-anchor="middle">Archaea / Eukarya</text>' +
          '<text x="50" y="68" font-size="8" text-anchor="middle">cell wall</text><text x="130" y="68" font-size="8" text-anchor="middle">peptidoglycan</text><text x="214" y="68" font-size="8" text-anchor="middle">no peptidoglycan / variable</text>' +
          '<text x="50" y="92" font-size="8" text-anchor="middle">membrane lipids</text><text x="130" y="92" font-size="8" text-anchor="middle">ester linked</text><text x="214" y="92" font-size="8" text-anchor="middle">ether (Archaea), ester (Euk)</text>' +
          '<text x="50" y="116" font-size="8" text-anchor="middle">histones</text><text x="130" y="116" font-size="8" text-anchor="middle">generally absent</text><text x="214" y="116" font-size="8" text-anchor="middle">present in Archaea/Euk</text>' +
          '<text x="50" y="140" font-size="8" text-anchor="middle">nucleus</text><text x="130" y="140" font-size="8" text-anchor="middle">absent</text><text x="214" y="140" font-size="8" text-anchor="middle">absent / present</text>',
      ),
    },
    {
      title: 'Explain extremophile bioenergetic adaptation',
      formula:
        '$$\\text{enzyme activity ratio}=\\frac{v_{80^{\\circ}\\text{C}}}{v_{37^{\\circ}\\text{C}}}=\\frac{120}{40}=3$$',
      body: 'An extremophile persists in high temperature, salinity, acidity, or pressure by stabilizing proteins and membranes. In one thermophile example, activity ratio = 120/40 = 3 at 80 C relative to 37 C, showing biochemical specialization to extreme conditions.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Extremophile niches</text>' +
          '<rect x="20" y="40" width="78" height="34" fill="#fee2e2" stroke="#991b1b"/><text x="59" y="60" font-size="9" text-anchor="middle">thermophile</text>' +
          '<rect x="112" y="40" width="78" height="34" fill="#dbeafe" stroke="#1e3a8a"/><text x="151" y="60" font-size="9" text-anchor="middle">halophile</text>' +
          '<rect x="204" y="40" width="78" height="34" fill="#dcfce7" stroke="#166534"/><text x="243" y="60" font-size="9" text-anchor="middle">acidophile</text>' +
          '<text x="24" y="94" font-size="9">protein folding and membrane chemistry adapted to stress</text>',
      ),
    },
    {
      title: 'Interpret archaeal placement on tree of life',
      body: 'Molecular phylogenies (rRNA and conserved proteins) place Archaea as a distinct domain with close evolutionary relationship to Eukarya relative to Bacteria. Therefore tree topology = Bacteria branch separate from Archaea-Eukarya shared ancestry in many reconstructions.',
      diagram: phylogeneticTree(),
    },
    {
      title: 'Differentiate horizontal gene transfer mechanisms',
      formula:
        '$$\\text{total HGT events}=\\text{transformation}+\\text{transduction}+\\text{conjugation}$$\n$$12+7+21=40$$',
      body: 'Transformation = uptake of naked DNA, transduction = phage-mediated transfer, and conjugation = plasmid transfer through cell-cell contact. If observed events are 12, 7, and 21, total HGT events = 40 and conjugation fraction = 21/40 = 52.5%.',
      diagram: virusStructures(),
    },
    {
      title: 'Add conjugation pathway logic with plasmid spread',
      formula:
        '$$\\text{recipient fraction after one round}=\\frac{30}{120}=0.25=25\\%$$',
      body: 'If a donor population transfers plasmid to 30 recipients out of 120 total cells in one interval, recipient fraction = 25%. This process can rapidly spread antibiotic resistance genes because replication of successful transconjugants increases donor-like cells over time.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Conjugation transfer</text>' +
          '<circle cx="74" cy="90" r="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="74" y="94" font-size="9" text-anchor="middle">donor</text>' +
          '<circle cx="208" cy="90" r="24" fill="#fee2e2" stroke="#991b1b"/><text x="208" y="94" font-size="9" text-anchor="middle">recipient</text>' +
          '<line x1="98" y1="90" x2="184" y2="90" stroke="#334155" stroke-width="2"/><rect x="128" y="82" width="26" height="16" fill="#fde68a" stroke="#a16207"/><text x="141" y="94" font-size="8" text-anchor="middle">plasmid</text>',
      ),
    },
    {
      title: 'Synthesize evolution with gene-flow processes',
      body: 'Domain divergence reflects deep ancestry, while HGT introduces network-like gene exchange across lineages. Therefore microbial evolution = tree-like vertical inheritance plus reticulate horizontal transfer, especially for ecological adaptation genes.',
      takeaway:
        'Remember domain signatures, archaeal evolutionary placement, and the mechanistic triad transformation-transduction-conjugation.',
    },
  ],
  solution:
    'The three-domain system distinguishes Bacteria, Archaea, and Eukarya using molecular and cellular features. Extremophiles (often archaeal) survive harsh conditions through specialized proteins and membrane adaptations. Phylogenetic data place Archaea as a domain distinct from Bacteria and often closer to Eukarya in conserved informational machinery. Horizontal gene transfer occurs by transformation (free DNA uptake), transduction (phage-mediated), and conjugation (cell-contact plasmid transfer), strongly shaping microbial adaptation.',
  verifiedPatterns: ['Bacteria', 'Archaea', 'Eukarya', 'extremophile', 'transformation', 'transduction', 'conjugation', '52.5%'],
  minDiagramSteps: 4,
};
