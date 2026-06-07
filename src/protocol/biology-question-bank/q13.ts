import { dnaRnaDiagram, geneticCodeDiagram, replicationForkDiagram, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q13: BiologyQuestionDef = {
  id: 'q13',
  number: 13,
  topic: 'Mutation Types, Translation Effects, DNA Repair, and Mutagens',
  question:
    'In molecular genetics, classify mutation types in DNA, translate a given coding sequence after a base substitution, and relate DNA repair pathways to mutagen effects such as UV-induced pyrimidine dimers in cells.',
  steps: [
    {
      title: 'Classify point, insertion, deletion, and frameshift mutations',
      body: 'Point substitutions may be silent, missense, or nonsense; insertions/deletions can preserve frame in multiples of three or cause frameshift when length change is not divisible by three. Frameshifts alter all downstream codons and frequently create premature stop codons.',
      diagram: dnaRnaDiagram(),
    },
    {
      title: 'Translate reference coding DNA sequence',
      formula:
        '$$\\text{Coding DNA: }5\'-\\text{ATG CAT GCC TAA}-3\'\\Rightarrow \\text{mRNA: }5\'-\\text{AUG CAU GCC UAA}-3\'$$',
      body: 'AUG codes Met, CAU codes His, GCC codes Ala, and UAA is stop. Codon count = 12/3 = 4 and amino acids produced before stop = 4 - 1 = 3, giving Met-His-Ala.',
      diagram: geneticCodeDiagram(),
    },
    {
      title: 'Apply C to A substitution and compare peptide output',
      formula:
        '$$\\text{CAT}\\xrightarrow{C\\to A}\\text{AAT}\\Rightarrow \\text{mRNA codon }\\text{CAU}\\to\\text{AAU}$$',
      body: 'The mutation changes second codon amino acid from His to Asn. If n is the number of altered codons and only one codon changes, n = 1 and mutation fraction = 1/4 = 0.25 of total codons in this gene segment.',
    },
    {
      title: 'Quantify DNA repair burden and pathway allocation',
      formula:
        '$$\\text{Remaining lesions}=L\\_{total}-L\\_{repaired}$$',
      body: 'L_total is the initial lesion count and L_repaired is lesions corrected by repair enzymes. If L_total = 120 lesions and L_repaired = 102, remaining lesions = 120 - 102 = 18.',
      diagram: replicationForkDiagram(),
    },
    {
      title: 'Differentiate BER, NER, and mismatch repair outcomes',
      formula:
        '$$\\text{Repair efficiency}=\\frac{L\\_{repaired}}{L\\_{total}}$$',
      body: 'If base excision repair (BER) resolves 36 of 40 oxidative lesions, BER efficiency = 36/40 = 0.90. If nucleotide excision repair (NER) resolves 54 of 60 UV lesions, NER efficiency = 54/60 = 0.90.',
      diagram: wrapBioSvg(
        '<rect x="20" y="36" width="78" height="26" fill="#dbeafe" stroke="#1e3a8a"/><text x="59" y="53" font-size="10" text-anchor="middle">DNA lesion</text>' +
          '<rect x="112" y="36" width="78" height="26" fill="#dcfce7" stroke="#166534"/><text x="151" y="53" font-size="10" text-anchor="middle">damage sensing</text>' +
          '<rect x="204" y="36" width="76" height="26" fill="#fef3c7" stroke="#a16207"/><text x="242" y="53" font-size="10" text-anchor="middle">repair fill</text>' +
          '<rect x="112" y="104" width="78" height="26" fill="#fee2e2" stroke="#991b1b"/><text x="151" y="121" font-size="10" text-anchor="middle">ligation</text>' +
          '<line x1="98" y1="49" x2="112" y2="49" stroke="#334155"/><line x1="190" y1="49" x2="204" y2="49" stroke="#334155"/><line x1="242" y1="62" x2="170" y2="104" stroke="#334155"/>' +
          '<text x="16" y="20" font-size="12">Generic DNA repair workflow in cells</text>',
      ),
    },
    {
      title: 'Explain mutagens and UV pyrimidine dimers',
      body: 'UV-B commonly induces cyclobutane pyrimidine dimers, especially thymine-thymine adducts, which distort the DNA helix and stall polymerases. Failure of repair increases mutation frequency and contributes to carcinogenesis risk in exposed tissues.',
      takeaway:
        'Link mutation type to protein outcome, then connect lesion chemistry to the specific DNA repair pathway.',
    },
  ],
  solution:
    'The coding sequence 5\'-ATG CAT GCC TAA-3\' gives mRNA AUG CAU GCC UAA and peptide Met-His-Ala. A C->A substitution in CAT to AAT changes CAU (His) to AAU (Asn), a missense mutation. Mutation classes include substitutions, insertions/deletions, and frameshifts. Cells use BER for small base damage, NER for bulky lesions including UV dimers, and mismatch repair for replication errors. Quantitatively, lesion counts and efficiencies can be computed directly from repaired versus total lesions.',
  verifiedPatterns: ['ATG', 'AUG', 'CAU', 'AAU', 'missense', 'NER', 'UV', 'dimer'],
  minDiagramSteps: 4,
};
