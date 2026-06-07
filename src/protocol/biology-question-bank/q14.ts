import { lacOperon, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q14: BiologyQuestionDef = {
  id: 'q14',
  number: 14,
  topic: 'Gene Regulation in Prokaryotes and Eukaryotes',
  question:
    'In gene regulation, compare lac operon control in bacteria with eukaryotic chromatin and RNA-based control, and explain catabolite repression plus miRNA effects on mRNA and enzyme production.',
  steps: [
    {
      title: 'Describe lac operon in repressed state (no lactose)',
      formula:
        '$$\\text{Transcription output}\\approx 0\\;\\text{when repressor binds operator}$$',
      body: 'Output is the relative lac mRNA level. If fully induced output is normalized to 100 units, repressed-state output = 0/100 = 0.00 because the repressor blocks RNA polymerase access.',
      diagram: lacOperon('lactoseAbsent'),
    },
    {
      title: 'Describe lac operon in induced state (lactose present)',
      formula:
        '$$\\text{Fold induction}=\\frac{\\text{induced expression}}{\\text{repressed expression}+1}$$',
      body: 'Induced expression is lac mRNA when allolactose inactivates the repressor. If induced expression = 80 units and repressed expression = 2 units, fold induction = 80/(2 + 1) = 26.7.',
      diagram: lacOperon('lactosePresent'),
    },
    {
      title: 'Quantify catabolite repression by glucose availability',
      formula:
        '$$\\text{cAMP}\\uparrow\\Rightarrow \\text{CAP binding}\\uparrow\\Rightarrow \\text{lac transcription}\\uparrow$$',
      body: 'When glucose is low, cAMP is high and CAP-cAMP activates transcription. If beta-galactosidase activity is 90 units with lactose only and 18 units with lactose plus glucose, repression factor = 90/18 = 5.',
      diagram: wrapBioSvg(
        '<rect x="22" y="42" width="106" height="42" fill="#dcfce7" stroke="#166534"/><text x="75" y="58" font-size="10" text-anchor="middle">low glucose</text><text x="75" y="74" font-size="10" text-anchor="middle">cAMP = high</text>' +
          '<rect x="172" y="42" width="106" height="42" fill="#fee2e2" stroke="#991b1b"/><text x="225" y="58" font-size="10" text-anchor="middle">high glucose</text><text x="225" y="74" font-size="10" text-anchor="middle">cAMP = low</text>' +
          '<line x1="128" y1="63" x2="172" y2="63" stroke="#334155"/><rect x="92" y="116" width="116" height="34" fill="#f8fafc" stroke="#334155"/><text x="150" y="136" font-size="10" text-anchor="middle">lac enzyme output changes</text>' +
          '<text x="16" y="20" font-size="12">Catabolite repression logic</text>',
      ),
    },
    {
      title: 'Compare major eukaryotic gene regulation layers',
      body: 'Eukaryotic cells regulate genes through chromatin remodeling, promoter-enhancer looping, transcription factor combinatorics, RNA processing, mRNA export/stability, and translation efficiency. Regulation is multi-layered and cell-type specific.',
    },
    {
      title: 'Calculate post-transcriptional repression by miRNAs',
      formula:
        '$$\\text{Remaining mRNA fraction}=1-\\text{miRNA repression fraction}$$',
      body: 'If miRNA-mediated repression fraction = 0.35, remaining mRNA fraction = 1 - 0.35 = 0.65. For initial mRNA count = 200 molecules per cell, remaining count = 200 x 0.65 = 130 molecules per cell.',
      diagram: wrapBioSvg(
        '<rect x="24" y="70" width="92" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="70" y="86" font-size="10" text-anchor="middle">target mRNA</text>' +
          '<path d="M138 74 C152 62, 178 62, 192 74 C178 86, 152 86, 138 74 Z" fill="#fef3c7" stroke="#a16207"/><text x="165" y="102" font-size="10" text-anchor="middle">miRNA-RISC</text>' +
          '<line x1="116" y1="82" x2="138" y2="74" stroke="#334155"/><rect x="210" y="70" width="70" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="245" y="86" font-size="10" text-anchor="middle">translation down</text>' +
          '<line x1="192" y1="74" x2="210" y2="82" stroke="#334155"/><text x="16" y="22" font-size="12">miRNA-guided post-transcriptional control</text>',
      ),
    },
    {
      title: 'Integrate bacterial and eukaryotic control principles',
      body: 'Bacterial operons often provide rapid metabolic switching, while eukaryotic regulation integrates developmental signals and chromatin state. Both systems tune protein output, but architecture and timescales differ substantially.',
      takeaway:
        'In lac control, think lactose (repressor) plus glucose (CAP-cAMP); in eukaryotes, add chromatin and miRNA layers.',
    },
  ],
  solution:
    'The lac operon is OFF without lactose because repressor binds operator and ON with lactose because allolactose inactivates repressor. This catabolite repression superimposes glucose control via cAMP-CAP, so high glucose lowers lac transcription even when lactose is present. Eukaryotic regulation extends beyond promoter binding to chromatin, enhancers, RNA processing, and miRNAs. miRNAs reduce effective mRNA abundance and therefore reduce protein/enzyme output.',
  verifiedPatterns: ['lac operon', 'allolactose', 'CAP', 'cAMP', 'catabolite repression', 'miRNA'],
  minDiagramSteps: 4,
};
