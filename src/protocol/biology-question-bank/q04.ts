import {
  etcChemiosmosisDiagram,
  fermentationDiagram,
  respirationFlowchartDiagram,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q04: BiologyQuestionDef = {
  id: 'q04',
  number: 4,
  topic: 'Aerobic Respiration, ETC, and Fermentation',
  question:
    'Draw the aerobic respiration flow from glucose to ATP, explain ETC chemiosmotic coupling, estimate ATP yield from NADH and FADH2, and contrast this with fermentation.',
  steps: [
    {
      title: 'Map the aerobic respiration stages',
      body: 'Major stages are glycolysis (cytosol), pyruvate oxidation and TCA cycle (mitochondrial matrix), and oxidative phosphorylation at the inner membrane. Carbon exits as CO2 while high-energy electrons are transferred to NADH and FADH2.',
      diagram: respirationFlowchartDiagram(),
    },
    {
      title: 'Tabulate reduced cofactor production per glucose',
      formula:
        '$$\\text{Glycolysis: }2\\,\\text{NADH}+2\\,\\text{ATP}\\quad\\text{PDH: }2\\,\\text{NADH}\\quad\\text{TCA: }6\\,\\text{NADH}+2\\,\\text{FADH}_2+2\\,\\text{ATP}$$',
      body: 'Totals per glucose are NADH = 2+2+6 = 10, FADH2 = 2, and substrate-level ATP = 2+2 = 4 (2 from glycolysis plus 2 GTP/ATP from TCA). These are the standard stoichiometries for one complete oxidation of glucose.',
    },
    {
      title: 'Compute oxidative ATP equivalents from cofactors',
      formula:
        '$$\\text{ATP}\\approx 10(2.5)+2(1.5)+4=32$$',
      body: 'Using P/O ratios NADH=2.5 and FADH2=1.5 gives 25+3+4=32 ATP maximum. In many tissues, cytosolic NADH shuttle costs reduce the practical yield by about 2 ATP, giving about 30 ATP.',
    },
    {
      title: 'Explain ETC complexes and proton pumping',
      formula:
        '$$\\text{Approximate H}^+\\text{ pumped: NADH }10,\\;\\text{FADH}_2\\,6;\\quad \\sim 4\\text{ H}^+/\\text{ATP synthesized and exported}$$',
      body: 'Electrons from NADH enter at Complex I, from FADH2 at Complex II, then pass through III and IV to O2 (terminal acceptor). For one NADH, about 10 protons are pumped, which supports about 10/4=2.5 ATP; for one FADH2, about 6/4=1.5 ATP.',
      diagram: etcChemiosmosisDiagram(),
    },
    {
      title: 'Contrast ATP yield under fermentation',
      formula:
        '$$\\text{Fermentation net ATP per glucose}=2$$',
      body: 'Without a functional ETC, pyruvate is reduced to lactate (animals) or ethanol + CO2 (yeast) to regenerate NAD+ for glycolysis. Because ATP comes only from substrate-level phosphorylation in glycolysis, net yield = 2 ATP per glucose.',
      diagram: fermentationDiagram(),
    },
    {
      title: 'State when cells switch metabolic modes',
      body: 'Aerobic respiration is preferred when oxygen and mitochondria are available because 30-32 ATP is far greater than 2 ATP. Fermentation supports short-term ATP and redox balance during hypoxia or in cells lacking mitochondria, such as mature RBCs.',
      takeaway:
        'High ATP yield requires oxygen-dependent electron transport; fermentation is a low-yield redox rescue pathway.',
    },
  ],
  solution:
    'Aerobic respiration proceeds through glycolysis, pyruvate oxidation, TCA cycle, and oxidative phosphorylation. Per glucose, reduced cofactors are about 10 NADH and 2 FADH2, with 4 substrate-level ATP. Using 2.5 ATP per NADH and 1.5 per FADH2 gives about 32 ATP maximum, commonly about 30 ATP depending on shuttle usage. ETC proton pumping across the inner membrane powers ATP synthase. Fermentation regenerates NAD+ but yields only 2 ATP per glucose.',
  verifiedPatterns: ['10 NADH', '2 FADH2', '32', '30', '2 ATP', 'Complex I'],
  minDiagramSteps: 3,
};
