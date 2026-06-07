import {
  centralDogmaDiagram,
  geneticCodeDiagram,
  transcriptionTranslationDiagram,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q09: BiologyQuestionDef = {
  id: 'q09',
  number: 9,
  topic: 'Central Dogma, Transcription, Translation, and Genetic Code',
  question:
    'Explain the central dogma, outline transcription and translation mechanisms, and discuss key properties of the genetic code with quantitative examples.',
  steps: [
    {
      title: 'State the central dogma and exceptions carefully',
      body: 'Canonical information flow is DNA -> RNA -> protein, with DNA replication preserving genetic material. Reverse transcription (RNA -> DNA) occurs in retroviruses and some cellular processes but does not invalidate the central dogma framework.',
      diagram: centralDogmaDiagram(),
    },
    {
      title: 'Transcribe a template sequence into mRNA',
      formula:
        '$$\\text{DNA template }3\'-\\text{TAC GGA TTT}-5\'\\Rightarrow \\text{mRNA }5\'-\\text{AUG CCU AAA}-3\'$$',
      body: 'RNA polymerase reads template DNA 3\'->5\' and synthesizes RNA 5\'->3\'. In the example, TAC corresponds to AUG (start codon), GGA to CCU, and TTT to AAA.',
      diagram: transcriptionTranslationDiagram(),
    },
    {
      title: 'Translate codons into peptide sequence',
      formula:
        '$$\\text{AUG}\\to\\text{Met},\\;\\text{CCU}\\to\\text{Pro},\\;\\text{AAA}\\to\\text{Lys}$$',
      body: 'For the mRNA 5\'-AUG CCU AAA-3\', the peptide is Met-Pro-Lys (N-terminus to C-terminus). Translation terminates when a stop codon (UAA, UAG, or UGA) enters the ribosomal A site.',
    },
    {
      title: 'Use codon length arithmetic',
      formula:
        '$$\\text{Number of codons}=\\frac{\\text{coding nucleotides}}{3}$$\n$$\\text{Example: }900\\,\\text{nt coding region}\\Rightarrow 300\\,\\text{codons}$$',
      body: 'If one codon is stop, translated amino acids are typically 299 from a 300-codon ORF. Triplet coding is non-overlapping and read in a fixed frame set by the start codon.',
    },
    {
      title: 'Summarize core genetic code properties',
      body: 'The code is nearly universal, degenerate (multiple codons per amino acid), unambiguous (each codon specifies one amino acid or stop), and comma-less (continuous reading). Degeneracy contributes to silent mutations at third codon positions.',
      diagram: geneticCodeDiagram(),
    },
    {
      title: 'Connect molecular steps to phenotype',
      body: 'Mutations can alter transcription efficiency, RNA processing, translation rate, or amino-acid sequence and therefore phenotype. Nonsense mutations introduce premature stop codons, often producing truncated proteins with reduced function.',
      takeaway:
        'High-yield anchors are AUG start, UAA/UAG/UGA stop, triplet reading frame, and DNA->RNA->protein information flow.',
    },
  ],
  solution:
    'Central dogma describes information transfer DNA -> RNA -> protein, with replication copying DNA. During transcription, RNA polymerase synthesizes mRNA 5\'->3\' from a DNA template strand. During translation, ribosomes decode codons in triplets from AUG start to a stop codon. Example: template 3\'-TAC GGA TTT-5\' gives mRNA 5\'-AUG CCU AAA-3\' and peptide Met-Pro-Lys. The genetic code is triplet, degenerate, largely universal, and unambiguous.',
  verifiedPatterns: ['DNA -> RNA -> protein', 'AUG', 'UAA', 'UAG', 'UGA', 'triplet', 'degenerate'],
  minDiagramSteps: 3,
};
