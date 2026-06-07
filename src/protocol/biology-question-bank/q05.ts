import {
  c3c4camDiagram,
  calvinCycleDiagram,
  chloroplastDiagram,
  photosystemZDiagram,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q05: BiologyQuestionDef = {
  id: 'q05',
  number: 5,
  topic: 'Chloroplast Function, Light Reactions, and Carbon Fixation',
  question:
    'Explain chloroplast structure, the light reactions (PSII and PSI), Calvin cycle stoichiometry, and compare C3, C4, and CAM carbon fixation strategies.',
  steps: [
    {
      title: 'Relate chloroplast anatomy to function',
      body: 'Chloroplasts have a double membrane, internal thylakoid membranes (stacked as grana), and a stroma matrix. Light reactions occur on thylakoids, while Calvin cycle enzymes are in the stroma.',
      diagram: chloroplastDiagram(),
    },
    {
      title: 'Trace electron flow across PSII and PSI',
      body: 'In linear electron flow, PSII oxidizes water, releasing O2, electrons, and protons. Electrons move through plastoquinone, cytochrome b6f, plastocyanin, PSI, and finally reduce NADP+ to NADPH via ferredoxin-NADP+ reductase.',
      diagram: photosystemZDiagram(),
    },
    {
      title: 'Write a representative light-reaction balance',
      formula:
        '$$2\\,\\text{H}_2\\text{O}+2\\,\\text{NADP}^++3\\,\\text{ADP}+3\\,\\text{P}_i+\\text{light}\\rightarrow \\text{O}_2+2\\,\\text{NADPH}+3\\,\\text{ATP}$$',
      body: 'A useful stoichiometric approximation is that making 2 NADPH is coupled with about 3 ATP and release of 1 O2 from splitting 2 H2O. Exact ATP:NADPH coupling can vary with cyclic electron flow contributions.',
    },
    {
      title: 'Quantify Calvin cycle requirements for one G3P export',
      formula:
        '$$3\\,\\text{CO}_2+9\\,\\text{ATP}+6\\,\\text{NADPH}\\rightarrow 1\\,\\text{G3P}+9\\,\\text{ADP}+8\\,\\text{P}_i+6\\,\\text{NADP}^+$$',
      body: 'For one net triose phosphate (G3P), 3 CO2 are fixed. To form one hexose equivalent, the cycle must run twice: 6 CO2, 18 ATP, and 12 NADPH.',
      diagram: calvinCycleDiagram(),
    },
    {
      title: 'Compare C3, C4, and CAM pathways',
      body: 'C3 plants fix CO2 directly with Rubisco in mesophyll. C4 plants spatially separate initial fixation (PEP carboxylase in mesophyll) from Calvin cycle (bundle sheath), lowering photorespiration. CAM plants separate steps temporally: CO2 capture at night, Calvin cycle by day.',
      diagram: c3c4camDiagram(),
    },
    {
      title: 'Link pathway choice to ecology and efficiency',
      body: 'C3 is efficient in cool/moderate conditions, C4 excels in high light and heat, and CAM is advantageous in arid habitats due to high water-use efficiency. C4 and CAM incur extra ATP costs but reduce carbon loss via photorespiration.',
      takeaway:
        'Photosynthesis couples light-driven ATP/NADPH production to carbon fixation, with C3/C4/CAM representing trade-offs among ATP cost, photorespiration control, and water conservation.',
    },
  ],
  solution:
    'Chloroplasts compartmentalize photosynthesis: thylakoids perform light reactions and stroma runs the Calvin cycle. Linear light flow from PSII to PSI generates ATP and NADPH while evolving O2 from water. A standard stoichiometric representation is 2 H2O + 2 NADP+ + 3 ADP + 3 Pi + light -> O2 + 2 NADPH + 3 ATP. Calvin cycle demand is 3 CO2 + 9 ATP + 6 NADPH per net G3P (double for one hexose). C3 fixes directly via Rubisco, C4 uses spatial concentration of CO2, and CAM uses temporal concentration at night.',
  verifiedPatterns: ['PSII', 'PSI', '3 CO2', '9 ATP', '6 NADPH', 'C4', 'CAM'],
  minDiagramSteps: 4,
};
