import { bacterialGrowthCurve, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q27: BiologyQuestionDef = {
  id: 'q27',
  number: 27,
  topic: 'Bacterial Growth, Gram Staining, Binary Fission, and Resistance',
  question:
    'In microbiology, interpret a bacterial growth curve, compare Gram-positive and Gram-negative staining outcomes, calculate binary fission from 100 cells over 3 hours, and explain antibiotic resistance evolution.',
  steps: [
    {
      title: 'Interpret lag, log, stationary, and death phases',
      body: 'Batch culture growth has four classic phases: lag (adaptation), log/exponential (maximal division), stationary (birth about death), and death/decline (net negative growth). Nutrient depletion and waste buildup drive transition into stationary and death phases.',
      diagram: bacterialGrowthCurve(),
    },
    {
      title: 'Compare Gram stain structural basis',
      body: 'Gram-positive bacteria have thick peptidoglycan that retains crystal violet-iodine complexes (purple), while Gram-negative bacteria have thin peptidoglycan plus outer membrane and appear pink after safranin counterstain.',
      diagram: wrapBioSvg(
        '<rect x="18" y="24" width="122" height="128" fill="#f8fafc" stroke="#334155"/>' +
          '<rect x="160" y="24" width="122" height="128" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="79" y="18" font-size="10" text-anchor="middle">Gram positive</text>' +
          '<text x="221" y="18" font-size="10" text-anchor="middle">Gram negative</text>' +
          '<rect x="40" y="44" width="78" height="86" fill="#e9d5ff" stroke="#7e22ce"/><text x="79" y="62" font-size="9" text-anchor="middle">thick peptidoglycan</text><text x="79" y="82" font-size="9" text-anchor="middle">teichoic acids</text><text x="79" y="120" font-size="9" text-anchor="middle">purple stain</text>' +
          '<rect x="176" y="44" width="90" height="86" fill="#fce7f3" stroke="#be185d"/><line x1="176" y1="62" x2="266" y2="62" stroke="#be185d"/><line x1="176" y1="112" x2="266" y2="112" stroke="#be185d"/><text x="221" y="58" font-size="8" text-anchor="middle">outer membrane</text><text x="221" y="90" font-size="8" text-anchor="middle">thin peptidoglycan</text><text x="221" y="124" font-size="8" text-anchor="middle">pink stain</text>',
      ),
    },
    {
      title: 'Calculate binary fission from 100 cells in 3 hours',
      formula:
        '$$N=N_0\\times2^n,\\qquad n=\\frac{t}{g}$$\n$$N_0=100,\\;t=180\\,\\text{min},\\;g=20\\,\\text{min}\\Rightarrow n=9$$',
      body: 'With n=9 generations, N = 100x2^9 = 100x512 = 51200 cells after 3 hours, assuming constant 20-minute generation time and no resource limitation.',
    },
    {
      title: 'Connect growth phase to antibiotic efficacy',
      formula:
        '$$\\text{kill fraction}=1-\\frac{N_t}{N_0}$$\n$$N_0=10^8,\\;N_t=10^5\\Rightarrow \\text{kill fraction}=1-10^{-3}=0.999$$',
      body: 'A drop from 10^8 to 10^5 CFU is a 3-log reduction and percent kill = 0.999x100 = 99.9%. Many cell-wall-targeting antibiotics are most effective during active log-phase division when peptidoglycan synthesis is high.',
    },
    {
      title: 'Model resistance enrichment during treatment',
      formula:
        '$$f_R\'=\\frac{f_R w_R}{\\bar{w}}$$\n$$f_R=0.001,\\;w_R=1.0,\\;w_S=0.01,\\;\\bar{w}=f_Rw_R+(1-f_R)w_S=0.01099$$',
      body: 'After treatment, resistant frequency f_R\' = (0.001x1.0)/0.01099 = 0.091, so resistance rises from 0.1% to 9.1% in one selection episode. This is selection on existing variants, not directed mutation by the drug.',
      diagram: wrapBioSvg(
        '<line x1="34" y1="140" x2="272" y2="140" stroke="#334155"/><line x1="34" y1="140" x2="34" y2="26" stroke="#334155"/>' +
          '<rect x="68" y="132" width="40" height="8" fill="#94a3b8"/><text x="88" y="122" font-size="9" text-anchor="middle">before 0.1%</text>' +
          '<rect x="190" y="68" width="40" height="72" fill="#b91c1c"/><text x="210" y="58" font-size="9" text-anchor="middle">after 9.1%</text>' +
          '<text x="150" y="18" font-size="11" text-anchor="middle">resistant fraction increases under antibiotic selection</text>',
      ),
    },
    {
      title: 'State stewardship implications',
      body: 'Incomplete dosing, unnecessary antibiotic use, and broad-spectrum overuse increase selection pressure for resistant strains. Stewardship combines diagnostics, narrow-spectrum choice, and full-course adherence to slow resistance evolution.',
      takeaway:
        'Core exam trio: growth phases, Gram-positive versus Gram-negative wall structure, and selection-driven antibiotic resistance.',
    },
  ],
  solution:
    'Bacterial batch culture proceeds through lag phase, log phase, stationary phase, and death phase. Gram-positive cells retain crystal violet due to thick peptidoglycan, while Gram-negative cells stain pink after counterstain because of thinner peptidoglycan and an outer membrane. binary fission follows N=N0x2^n; from 100 cells over 180 minutes with g=20 minutes, n=9 and N=51200. Antibiotics can cause large log reductions but also select resistant subpopulations, driving antibiotic resistance in the population.',
  verifiedPatterns: ['lag phase', 'log phase', 'Gram-positive', 'Gram-negative', 'binary fission', 'antibiotic resistance'],
  minDiagramSteps: 3,
};
