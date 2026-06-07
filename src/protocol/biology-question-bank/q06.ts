import {
  cellCycleCircleDiagram,
  checkpointDiagram,
  mitosisStagesDiagram,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q06: BiologyQuestionDef = {
  id: 'q06',
  number: 6,
  topic: 'Cell Cycle, Mitosis, and Checkpoints',
  question:
    'Draw the cell-cycle phases, identify mitosis stages and checkpoints, and track chromosome/chromatid numbers in a human somatic cell with 2n=46.',
  steps: [
    {
      title: 'Place phases on the full cell-cycle loop',
      body: 'The cycle proceeds G1 -> S -> G2 -> M. Interphase (G1+S+G2) occupies most of the cycle, while M phase includes mitosis and cytokinesis.',
      diagram: cellCycleCircleDiagram(),
    },
    {
      title: 'Track chromosome and DNA content through interphase',
      formula:
        '$$\\text{G1: }2n=46\\;\\text{chromosomes},\\;46\\;\\text{DNA molecules}$$\n$$\\text{After S: }46\\;\\text{chromosomes},\\;92\\;\\text{sister chromatids (DNA molecules)}$$',
      body: 'Chromosome number is counted by centromeres, so it remains 46 through S and G2. DNA amount doubles from 2C to 4C after replication, corresponding to 92 chromatids in a 2n=46 human cell.',
    },
    {
      title: 'Sequence mitosis stages with key events',
      body: 'Prophase condenses chromosomes, metaphase aligns them at the plate, anaphase separates sister chromatids, and telophase reforms nuclei. Cytokinesis then partitions cytoplasm to produce two daughter cells.',
      diagram: mitosisStagesDiagram(),
    },
    {
      title: 'Count chromosomes during anaphase and after cytokinesis',
      formula:
        '$$\\text{Anaphase (single cell): }92\\;\\text{chromosomes transiently counted when chromatids separate}$$\n$$\\text{Each daughter after cytokinesis: }46\\;\\text{chromosomes (2n)}$$',
      body: 'Once sister chromatids split, each chromatid is a chromosome. Anaphase count = 92 chromosomes in one cell; after cytokinesis each daughter gets 92/2 = 46 chromosomes (2n restored).',
    },
    {
      title: 'Map major checkpoints and their logic',
      body: 'G1/S checks nutrients, growth signals, and DNA damage; G2/M verifies completion/quality of DNA replication; spindle checkpoint ensures proper kinetochore attachment before anaphase onset.',
      diagram: checkpointDiagram(),
    },
    {
      title: 'Connect checkpoint failure to disease risk',
      body: 'Loss of checkpoint control can cause aneuploidy or mutation accumulation, contributing to oncogenesis. For example, checkpoint bypass with unrepaired double-strand breaks increases genomic instability in proliferating tissues.',
      takeaway:
        'For 2n=46 cells: remember 46 -> 92 chromatids after S, transient 92 chromosomes at anaphase, then two 46-chromosome daughter cells.',
    },
  ],
  solution:
    'Cell cycle phases are G1, S, G2, and M. In a 2n=46 cell, G1 has 46 chromosomes and 46 DNA molecules; after S phase there are still 46 chromosomes but 92 chromatids (4C DNA). Mitosis progresses prophase, metaphase, anaphase, telophase, then cytokinesis. During anaphase, separated chromatids are counted as 92 chromosomes in one cell; each daughter cell finishes with 46 chromosomes. Control points are G1/S, G2/M, and spindle checkpoint.',
  verifiedPatterns: ['2n=46', '92 chromatids', 'G1/S', 'G2/M', 'spindle checkpoint', 'anaphase'],
  minDiagramSteps: 3,
};
