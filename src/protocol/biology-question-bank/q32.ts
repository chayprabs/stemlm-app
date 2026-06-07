import { phylogeneticTree, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q32: BiologyQuestionDef = {
  id: 'q32',
  number: 32,
  topic: 'Sequence Alignment, BLAST Statistics, and Homology Terms',
  question:
    'Differentiate global and local alignment for DNA sequences from genes in different species, interpret BLAST E-values, compute percent identity for an ATGCATGCAATG alignment, and distinguish homology from ortholog/paralog relationships.',
  steps: [
    {
      title: 'Contrast global and local alignment goals',
      body: 'In global alignment, full-length sequences are compared end-to-end (Needleman-Wunsch), while local alignment finds the best matching subsections (Smith-Waterman). Alignment choice = function of whether full gene length similarity or conserved motif detection is needed.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">global vs local alignment</text>' +
          '<rect x="20" y="36" width="118" height="50" fill="#dbeafe" stroke="#1e3a8a"/><text x="30" y="52" font-size="9">global</text><line x1="34" y1="66" x2="124" y2="66" stroke="#1e3a8a" stroke-width="2"/><line x1="34" y1="78" x2="124" y2="78" stroke="#1e3a8a" stroke-width="2"/>' +
          '<rect x="162" y="36" width="118" height="50" fill="#dcfce7" stroke="#166534"/><text x="172" y="52" font-size="9">local</text><line x1="182" y1="66" x2="256" y2="66" stroke="#166534" stroke-width="2"/><line x1="198" y1="78" x2="240" y2="78" stroke="#166534" stroke-width="2"/>' +
          '<text x="20" y="112" font-size="10">global = whole sequence</text><text x="162" y="112" font-size="10">local = best region</text>',
      ),
    },
    {
      title: 'Interpret BLAST E-value correctly',
      formula:
        '$$E = Kmn e^{-\\lambda S}$$',
      body: 'E-value is the expected number of chance hits with score >= S in a database search, so lower E means higher significance. If E = 1e-20, expected random matches = 10^-20, which is far stronger evidence than E = 1e-3.',
    },
    {
      title: 'Compute percent identity for ATGCATGCAATG alignment',
      formula:
        '$$\\text{Seq1}=\\text{ATGCATGCAATG}$$\n$$\\text{Seq2}=\\text{ATGCATGGAATG}$$\n$$\\%\\text{identity}=\\frac{11}{12}\\times100=91.7\\%$$',
      body: 'Using the aligned strings above, matches = 11 and length = 12, so identity = 91.7%. This is sequence similarity, while homology is still a binary statement (homologous = yes/no, not 91.7% homologous).',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">pairwise alignment example</text>' +
          '<text x="24" y="56" font-size="12">ATGCATGCAATG</text>' +
          '<text x="24" y="82" font-size="12">||||||| ||||</text>' +
          '<text x="24" y="108" font-size="12">ATGCATGGAATG</text>' +
          '<text x="24" y="142" font-size="10">11 matches / 12 positions = 91.7%</text>',
      ),
    },
    {
      title: 'Separate similarity, identity, and homology language',
      body: 'Identity is exact residue match fraction, similarity can include conservative substitutions, and homology means shared evolutionary ancestry. Proper wording = "high identity supports probable homology" rather than "partial homology percentage."',
    },
    {
      title: 'Differentiate orthologs and paralogs',
      body: 'An ortholog relationship diverges after speciation and often retains related function, whereas paralogs arise by gene duplication within a lineage and can diverge functionally. Gene relationship labels = evolutionary event labels, not expression-level labels.',
      diagram: phylogeneticTree(),
    },
    {
      title: 'Apply this framework in annotation workflows',
      body: 'Practical annotation combines local alignment (domain-level conservation), E-value thresholds, reciprocal best hits, and synteny context. Strong annotation confidence = consistent evidence across sequence similarity and evolutionary context.',
      takeaway:
        'Remember: global vs local alignment answers different questions, E-value quantifies chance expectation, and homology terminology must be evolutionarily precise.',
    },
  ],
  solution:
    'Global alignment compares complete sequences, while local alignment detects best conserved subsections. BLAST E-value follows E = Kmn e^(-lambdaS), and smaller E indicates more statistically significant matches. For ATGCATGCAATG aligned with ATGCATGGAATG, identity is 11/12 x 100 = 91.7%. Identity/similarity are quantitative, but homology is a qualitative ancestry statement. Orthologs result from speciation, whereas paralogs result from gene duplication.',
  verifiedPatterns: ['global alignment', 'local alignment', 'E-value', 'ATGCATGCAATG', '91.7%', 'ortholog', 'paralog'],
  minDiagramSteps: 3,
};
