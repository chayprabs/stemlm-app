import { foodWeb, nitrogenCycle, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q23: BiologyQuestionDef = {
  id: 'q23',
  number: 23,
  topic: 'Food Web Energetics, Productivity, Biomass, and Nitrogen Cycle',
  question:
    'In ecosystem ecology, interpret a food web diagram, apply the 10% rule from 10000 kcal, calculate GPP and NPP with biomass implications, and explain how the nitrogen cycle supports trophic productivity.',
  steps: [
    {
      title: 'Read energy direction in a food web',
      body: 'Energy enters ecosystems via producers and flows through herbivores to carnivores, while decomposers recycle nutrients. Arrows indicate energy transfer direction from resource to consumer.',
      diagram: foodWeb(),
    },
    {
      title: 'Apply the 10% rule from producer energy',
      formula:
        '$$E_{n+1}\\approx 0.1E_n$$\n$$E_\\text{producer}=10000\\,\\text{kcal}\\Rightarrow E_\\text{primary}=1000,\\;E_\\text{secondary}=100,\\;E_\\text{tertiary}=10$$',
      body: 'Using trophic transfer efficiency of about 10%: 10000x0.1 = 1000 kcal at primary consumers, then 1000x0.1 = 100 kcal at secondary consumers, and 100x0.1 = 10 kcal at tertiary consumers.',
    },
    {
      title: 'Calculate GPP, NPP, and potential biomass gain',
      formula:
        '$$\\text{NPP}=\\text{GPP}-R$$\n$$\\text{GPP}=24000\\,\\text{kcal m}^{-2}\\text{yr}^{-1},\\;R=9000\\Rightarrow \\text{NPP}=15000$$',
      body: 'NPP = 24000-9000 = 15000 kcal m^-2 yr^-1, which is energy available to herbivores and growth. If producer biomass stores about 4 kcal per gram dry mass, new biomass = 15000/4 = 3750 g m^-2 yr^-1.',
      diagram: wrapBioSvg(
        '<rect x="24" y="24" width="252" height="126" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="24" y1="58" x2="276" y2="58" stroke="#334155"/>' +
          '<line x1="108" y1="58" x2="108" y2="150" stroke="#334155"/>' +
          '<line x1="196" y1="58" x2="196" y2="150" stroke="#334155"/>' +
          '<text x="150" y="44" font-size="11" text-anchor="middle">Productivity budget</text>' +
          '<text x="66" y="78" font-size="9" text-anchor="middle">GPP</text><text x="152" y="78" font-size="9" text-anchor="middle">Respiration</text><text x="236" y="78" font-size="9" text-anchor="middle">NPP</text>' +
          '<text x="66" y="102" font-size="9" text-anchor="middle">24000</text><text x="152" y="102" font-size="9" text-anchor="middle">9000</text><text x="236" y="102" font-size="9" text-anchor="middle">15000</text>' +
          '<text x="152" y="132" font-size="9" text-anchor="middle">NPP = GPP - R</text>',
      ),
    },
    {
      title: 'Connect nitrogen transformations to productivity',
      body: 'Nitrogen fixation converts atmospheric N2 to biologically available forms, nitrification generates nitrate, and assimilation places N into amino acids and proteins. Denitrification returns N to the atmosphere, closing the biogeochemical loop.',
      diagram: nitrogenCycle(),
    },
    {
      title: 'Estimate nitrogen demand for new producer biomass',
      formula:
        '$$\\text{If C:N}=20:1\\;\\text{(mass basis)},\\;\\text{N needed}=\\frac{3750\\,\\text{g C-biomass equivalent}}{20}=187.5\\,\\text{g N m}^{-2}\\text{yr}^{-1}$$',
      body: 'With C:N = 20:1, each 20 g biomass carbon-equivalent requires 1 g nitrogen. For 3750 g biomass equivalent, required nitrogen = 3750/20 = 187.5 g N m^-2 yr^-1, showing nutrient availability can cap realized productivity.',
      diagram: wrapBioSvg(
        '<polygon points="150,16 42,146 258,146" fill="#ecfccb" stroke="#4d7c0f" stroke-width="2"/>' +
          '<line x1="74" y1="106" x2="226" y2="106" stroke="#4d7c0f"/><line x1="104" y1="70" x2="196" y2="70" stroke="#4d7c0f"/>' +
          '<text x="150" y="34" font-size="10" text-anchor="middle">tertiary 10 kcal</text>' +
          '<text x="150" y="88" font-size="10" text-anchor="middle">secondary 100 kcal</text>' +
          '<text x="150" y="124" font-size="10" text-anchor="middle">primary 1000 kcal</text>' +
          '<text x="150" y="156" font-size="10" text-anchor="middle">producers 10000 kcal</text>',
      ),
    },
    {
      title: 'State the integrated ecosystem conclusion',
      body: 'Energy flow is unidirectional with major losses as heat, while nitrogen cycles between atmospheric, soil, and biomass pools. High GPP does not guarantee high trophic biomass unless NPP is high and nutrient cycles supply limiting elements such as nitrogen.',
      takeaway:
        'Exam core: 10% rule for energy transfer, NPP = GPP - R, and nitrogen availability as a control on biomass production.',
    },
  ],
  solution:
    'Food webs depict energy flow from producers to consumers and nutrient recycling by decomposers. Applying the 10% rule to 10000 kcal gives about 1000, 100, and 10 kcal across successive consumer levels. Productivity is quantified by NPP = GPP - R; with GPP=24000 and R=9000, NPP=15000 kcal m^-2 yr^-1, supporting biomass formation. The nitrogen cycle (fixation, nitrification, assimilation, denitrification) provides bioavailable N needed to convert energy capture into proteins and biomass.',
  verifiedPatterns: ['10% rule', '10000 kcal', 'NPP = GPP - R', 'biomass', 'nitrification', 'denitrification'],
  minDiagramSteps: 3,
};
