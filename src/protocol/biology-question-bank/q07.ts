import { dnaRnaDiagram, proteinStructureDiagram, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q07: BiologyQuestionDef = {
  id: 'q07',
  number: 7,
  topic: 'Biological Macromolecules, Protein Structure, and Nucleic Acids',
  question:
    'Construct a macromolecule comparison table, explain protein structural hierarchy, summarize lipid classes/functions, and compare DNA with RNA.',
  steps: [
    {
      title: 'Compare the four major macromolecule classes',
      body: 'Carbohydrates, lipids, proteins, and nucleic acids differ in monomers, bonds, and functions. Carbohydrates often provide rapid fuel, lipids store dense energy and form membranes, proteins perform catalysis/structure/signaling, and nucleic acids store/transmit information.',
      diagram: wrapBioSvg(
        '<rect x="16" y="22" width="268" height="134" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="80" y1="22" x2="80" y2="156" stroke="#334155"/>' +
          '<line x1="156" y1="22" x2="156" y2="156" stroke="#334155"/>' +
          '<line x1="224" y1="22" x2="224" y2="156" stroke="#334155"/>' +
          '<line x1="16" y1="46" x2="284" y2="46" stroke="#334155"/>' +
          '<line x1="16" y1="74" x2="284" y2="74" stroke="#cbd5e1"/>' +
          '<line x1="16" y1="102" x2="284" y2="102" stroke="#cbd5e1"/>' +
          '<line x1="16" y1="130" x2="284" y2="130" stroke="#cbd5e1"/>' +
          '<text x="28" y="38" font-size="9">class</text><text x="96" y="38" font-size="9">monomer/unit</text><text x="166" y="38" font-size="9">bond</text><text x="234" y="38" font-size="9">main role</text>' +
          '<text x="22" y="64" font-size="9">carbohydrate</text><text x="92" y="64" font-size="9">monosaccharide</text><text x="166" y="64" font-size="9">glycosidic</text><text x="228" y="64" font-size="9">fuel/structure</text>' +
          '<text x="22" y="92" font-size="9">lipid</text><text x="92" y="92" font-size="9">fatty acid + glycerol</text><text x="166" y="92" font-size="9">ester</text><text x="228" y="92" font-size="9">membrane/energy</text>' +
          '<text x="22" y="120" font-size="9">protein</text><text x="92" y="120" font-size="9">amino acid</text><text x="166" y="120" font-size="9">peptide</text><text x="228" y="120" font-size="9">enzyme/work</text>' +
          '<text x="22" y="148" font-size="9">nucleic acid</text><text x="92" y="148" font-size="9">nucleotide</text><text x="166" y="148" font-size="9">phosphodiester</text><text x="228" y="148" font-size="9">genetic info</text>',
      ),
    },
    {
      title: 'Quantify energy density differences',
      formula:
        '$$\\text{carb/protein} \\approx 4\\,\\text{kcal g}^{-1},\\quad \\text{lipid} \\approx 9\\,\\text{kcal g}^{-1}$$',
      body: 'For example, 20 g lipid stores about 20x9=180 kcal, while 20 g glucose stores about 20x4=80 kcal. This higher energy density explains why triacylglycerol is preferred for long-term storage.',
    },
    {
      title: 'Explain protein structural levels',
      body: 'Primary structure is amino-acid sequence; secondary includes alpha-helices and beta-sheets; tertiary is full 3D fold; quaternary is multi-subunit assembly (e.g., hemoglobin alpha2beta2). Structure determines function and mutation impact.',
      diagram: proteinStructureDiagram(),
    },
    {
      title: 'Summarize key lipid classes and roles',
      body: 'Triacylglycerols store energy, phospholipids form bilayers, and steroids (e.g., cholesterol) modulate membrane fluidity and serve as hormone precursors. Unsaturated fatty acids increase membrane fluidity compared with fully saturated chains.',
    },
    {
      title: 'Contrast DNA and RNA chemistry',
      body: 'DNA usually contains deoxyribose and thymine and is double-stranded in cells; RNA contains ribose and uracil and is often single-stranded. Multiple RNA types exist (mRNA, rRNA, tRNA, regulatory RNAs) with coding and noncoding functions.',
      diagram: dnaRnaDiagram(),
    },
    {
      title: 'Integrate molecule class with biological role',
      body: 'Catabolic pathways convert carbohydrate/lipid stores into ATP, proteins execute regulated cell processes, and nucleic acids preserve/transmit inherited information. Exam answers improve when composition, bonding, and function are linked in one explanation.',
      takeaway:
        'High-yield anchors: peptide bond, phosphodiester bond, 4 vs 9 kcal/g, and DNA-thymine versus RNA-uracil.',
    },
  ],
  solution:
    'Macromolecule classes are carbohydrates, lipids, proteins, and nucleic acids, each with characteristic building units and bonds. Lipids are the most energy dense (about 9 kcal/g) versus carbohydrates/proteins (about 4 kcal/g). Protein structure is hierarchical (primary -> secondary -> tertiary -> quaternary), and function depends on folding. Lipid classes include triacylglycerols, phospholipids, and steroids. DNA and RNA differ in sugar (deoxyribose vs ribose), base usage (T vs U), and typical strandedness.',
  verifiedPatterns: ['4 kcal', '9 kcal', 'peptide', 'phosphodiester', 'thymine', 'uracil', 'quaternary'],
  minDiagramSteps: 3,
};
