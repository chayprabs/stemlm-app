import {
  centralDogmaDiagram,
  cloningSteps,
  gelElectrophoresis,
  pcrCycle,
  wrapBioSvg,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q41: BiologyQuestionDef = {
  id: 'q41',
  number: 41,
  topic: 'Restriction Sites, PCR with Taq Polymerase, Reverse Transcriptase, and Ribozymes',
  question:
    'In molecular biology, explain restriction endonuclease recognition and sticky ends, apply Taq polymerase PCR cycle math, distinguish reverse transcriptase from DNA-dependent polymerases, and describe catalytic ribozyme function.',
  steps: [
    {
      title: 'Identify restriction sites and sticky-end generation',
      body: 'Restriction endonucleases recognize palindromic DNA sites. For EcoRI, recognition site = GAATTC, and cleavage creates a 5-prime overhang. Sticky-end sequence = AATT, which base-pairs with complementary sticky ends during cloning.',
      diagram: cloningSteps(),
    },
    {
      title: 'Write exact EcoRI cleavage geometry',
      formula:
        '$$5\'-\\text{G}\\downarrow\\text{AATTC}-3\'$$\n$$3\'-\\text{CTTAA}\\uparrow\\text{G}-5\'$$',
      body: 'EcoRI cut position = between G and A on each strand, and the resulting overhang = 4 nucleotides (AATT). Sticky-end ligation efficiency is often > blunt-end ligation because base pairing = transient alignment before ligase seals phosphodiester bonds.',
      diagram: wrapBioSvg(
        '<text x="14" y="24" font-size="12">EcoRI sticky-end cut</text>' +
          '<text x="20" y="62" font-size="11">5\'-G AATTC-3\'</text><text x="20" y="86" font-size="11">3\'-CTTAA G-5\'</text>' +
          '<line x1="56" y1="50" x2="56" y2="72" stroke="#dc2626" stroke-width="2"/><line x1="122" y1="76" x2="122" y2="98" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="160" y="74" font-size="10">overhang = AATT</text>',
      ),
    },
    {
      title: 'Apply PCR amplification math with Taq polymerase',
      formula:
        '$$N=N_0\\times 2^n$$\n$$N_0=10,\\;n=30\\Rightarrow N=10\\times 2^{30}=10{,}737{,}418{,}240\\approx1.07\\times10^{10}$$',
      body: 'In ideal PCR, copy number doubles each cycle, so N = N0 x 2^n. With N0 = 10 templates and n = 30 cycles, N = 10,737,418,240 copies. Taq polymerase extension optimum = 72 C, denaturation = 95 C, and annealing = about 50-65 C.',
      diagram: pcrCycle('extension'),
    },
    {
      title: 'Differentiate reverse transcriptase from Taq polymerase',
      formula:
        '$$\\text{mRNA length}=1{,}200\\,\\text{nt}\\Rightarrow \\text{cDNA length}\\approx1{,}200\\,\\text{nt}$$',
      body: 'Reverse transcriptase template = RNA, product = complementary DNA (cDNA). Taq polymerase template = DNA, product = DNA. If mRNA length = 1,200 nt, first-strand cDNA length = about 1,200 nt before second-strand synthesis and PCR amplification.',
      diagram: centralDogmaDiagram(),
    },
    {
      title: 'Explain ribozymes as catalytic RNA molecules',
      body: 'A ribozyme is RNA with catalytic activity, so catalyst = RNA rather than protein. Examples include self-splicing introns and peptidyl transferase center activity in ribosomes (rRNA-catalyzed peptide bond formation). If one ribozyme cleaves 25 substrates per minute for 8 minutes, total cleavages = 25 x 8 = 200.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Ribozyme cleavage concept</text>' +
          '<path d="M34 92 C72 60, 118 128, 156 92 C194 58, 230 120, 266 86" fill="none" stroke="#7c3aed" stroke-width="3"/>' +
          '<rect x="132" y="80" width="34" height="24" fill="#fde68a" stroke="#a16207"/><text x="149" y="96" font-size="9" text-anchor="middle">active</text>' +
          '<line x1="146" y1="70" x2="146" y2="80" stroke="#dc2626" stroke-width="2"/><text x="154" y="70" font-size="9">cut</text>',
      ),
    },
    {
      title: 'Verify recombinant DNA product size on gel',
      formula:
        '$$\\text{vector}=3.0\\,\\text{kb},\\;\\text{insert}=1.2\\,\\text{kb}\\Rightarrow \\text{recombinant}=4.2\\,\\text{kb}$$',
      body: 'Expected recombinant plasmid length = 3.0 kb + 1.2 kb = 4.2 kb. After diagnostic digest, band sizes should sum = 4.2 kb. Gel electrophoresis confirms whether observed fragment lengths = predicted cloning design.',
      diagram: gelElectrophoresis(),
      takeaway:
        'Core molecular toolkit: restriction sticky ends for joining DNA, Taq PCR for amplification, reverse transcriptase for RNA-to-DNA conversion, and ribozymes as catalytic RNA.',
    },
  ],
  solution:
    'Restriction enzymes such as EcoRI cut specific palindromic sites and can generate sticky ends (EcoRI overhang = AATT), which improves ligation specificity. PCR with Taq polymerase follows N = N0 x 2^n in ideal doubling; with 10 templates and 30 cycles this gives about 1.07 x 10^10 copies. Reverse transcriptase synthesizes cDNA from RNA templates, unlike Taq which copies DNA templates. Ribozymes are catalytic RNAs, demonstrating that biological catalysis is not limited to proteins.',
  verifiedPatterns: ['EcoRI', 'AATT', 'Taq', '72 C', '2^30', '1.07', 'reverse transcriptase', 'ribozyme', '4.2 kb'],
  minDiagramSteps: 4,
};
