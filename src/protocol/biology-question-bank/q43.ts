import { biomesLatitude, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q43: BiologyQuestionDef = {
  id: 'q43',
  number: 43,
  topic: 'Terrestrial Biomes, Latitude-Altitude Patterns, Greenhouse Effect, and Shannon Biodiversity',
  question:
    'In ecology and biogeography, summarize six terrestrial biomes for species and ecosystem patterns in a comparison table, interpret latitude-altitude biome shifts, explain the greenhouse effect radiation budget, and compute biodiversity using the Shannon index.',
  steps: [
    {
      title: 'Construct a six-biome comparison table',
      body: 'A concise terrestrial-biome set = tundra, boreal forest (taiga), temperate deciduous forest, temperate grassland, desert, and tropical rainforest. Typical trend = temperature and precipitation jointly determine dominant vegetation and productivity.',
      diagram: wrapBioSvg(
        '<rect x="12" y="16" width="276" height="148" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="86" y1="16" x2="86" y2="164" stroke="#334155"/><line x1="180" y1="16" x2="180" y2="164" stroke="#334155"/><line x1="12" y1="38" x2="288" y2="38" stroke="#334155"/>' +
          '<line x1="12" y1="60" x2="288" y2="60" stroke="#cbd5e1"/><line x1="12" y1="82" x2="288" y2="82" stroke="#cbd5e1"/><line x1="12" y1="104" x2="288" y2="104" stroke="#cbd5e1"/><line x1="12" y1="126" x2="288" y2="126" stroke="#cbd5e1"/><line x1="12" y1="148" x2="288" y2="148" stroke="#cbd5e1"/>' +
          '<text x="48" y="32" font-size="9" text-anchor="middle">biome</text><text x="132" y="32" font-size="9" text-anchor="middle">climate</text><text x="234" y="32" font-size="9" text-anchor="middle">vegetation</text>' +
          '<text x="48" y="54" font-size="8" text-anchor="middle">tundra</text><text x="132" y="54" font-size="8" text-anchor="middle">cold dry</text><text x="234" y="54" font-size="8" text-anchor="middle">moss lichen</text>' +
          '<text x="48" y="76" font-size="8" text-anchor="middle">taiga</text><text x="132" y="76" font-size="8" text-anchor="middle">cold seasonal</text><text x="234" y="76" font-size="8" text-anchor="middle">conifers</text>' +
          '<text x="48" y="98" font-size="8" text-anchor="middle">temperate forest</text><text x="132" y="98" font-size="8" text-anchor="middle">moderate rain</text><text x="234" y="98" font-size="8" text-anchor="middle">deciduous trees</text>' +
          '<text x="48" y="120" font-size="8" text-anchor="middle">grassland</text><text x="132" y="120" font-size="8" text-anchor="middle">seasonal drought</text><text x="234" y="120" font-size="8" text-anchor="middle">grasses</text>' +
          '<text x="48" y="142" font-size="8" text-anchor="middle">desert</text><text x="132" y="142" font-size="8" text-anchor="middle">very arid</text><text x="234" y="142" font-size="8" text-anchor="middle">xerophytes</text>' +
          '<text x="48" y="160" font-size="8" text-anchor="middle">rainforest</text><text x="132" y="160" font-size="8" text-anchor="middle">warm wet</text><text x="234" y="160" font-size="8" text-anchor="middle">broadleaf evergreen</text>',
      ),
    },
    {
      title: 'Interpret latitude and altitude controls',
      formula:
        '$$T(h)=T_0-6.5\\,^{\\circ}\\text{C km}^{-1}\\times h$$\n$$h=2\\,\\text{km}\\Rightarrow \\Delta T=13\\,^{\\circ}\\text{C}$$',
      body: 'Temperature decreases with altitude: T(h) = T0 - 6.5 C per km x h. At h = 2 km, temperature drop = 13 C, so high-altitude zones can resemble higher-latitude biomes. Thus biome pattern with altitude = compressed latitude gradient.',
      diagram: biomesLatitude(),
    },
    {
      title: 'Explain greenhouse-effect energy bookkeeping',
      formula:
        '$$\\text{incoming solar}\\approx340\\,\\text{W m}^{-2}$$\n$$\\text{absorbed}\\approx240\\,\\text{W m}^{-2}=\\text{outgoing longwave at equilibrium}$$',
      body: 'Planetary mean incoming radiation = about 340 W m^-2, but after albedo reflection the absorbed flux = about 240 W m^-2. Greenhouse gases absorb/re-emit infrared, raising surface temperature above blackbody expectation while top-of-atmosphere longwave = absorbed solar at steady state.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Greenhouse effect energy flow</text>' +
          '<circle cx="78" cy="92" r="30" fill="#fde68a" stroke="#a16207"/><text x="78" y="96" font-size="9" text-anchor="middle">Sun</text>' +
          '<rect x="162" y="56" width="102" height="68" fill="#dbeafe" stroke="#1e3a8a"/><text x="213" y="72" font-size="9" text-anchor="middle">atmosphere</text>' +
          '<rect x="172" y="126" width="82" height="24" fill="#bbf7d0" stroke="#15803d"/><text x="213" y="142" font-size="9" text-anchor="middle">surface</text>' +
          '<line x1="108" y1="92" x2="162" y2="92" stroke="#f59e0b" stroke-width="2"/><text x="112" y="84" font-size="8">shortwave in</text>' +
          '<line x1="213" y1="126" x2="213" y2="84" stroke="#dc2626" stroke-width="2"/><text x="220" y="104" font-size="8">IR up</text>' +
          '<line x1="238" y1="84" x2="238" y2="126" stroke="#7c3aed" stroke-width="2"/><text x="244" y="110" font-size="8">IR back</text>',
      ),
    },
    {
      title: 'Compute Shannon biodiversity index from species proportions',
      formula:
        '$$H\'=-\\sum p_i\\ln p_i$$\n$$p=(0.4,0.3,0.2,0.1)\\Rightarrow H\'=-(0.4\\ln0.4+0.3\\ln0.3+0.2\\ln0.2+0.1\\ln0.1)=1.2799$$',
      body: 'Using p = 0.4, 0.3, 0.2, 0.1, Shannon index = 1.2799 (about 1.28). Evenness can be computed as J = H\'/ln(S) = 1.2799/ln(4) = 0.923, so distribution is relatively even despite unequal abundances.',
    },
    {
      title: 'Relate biome shifts to biodiversity risk',
      body: 'Warming and precipitation change shift biome boundaries poleward and upslope. If specialists cannot track habitat migration, local richness = lower and extinction risk = higher. High Shannon H\' communities generally show greater functional redundancy than species-poor systems.',
    },
    {
      title: 'Synthesize climate-biodiversity interpretation',
      body: 'Biome identity follows climate constraints, greenhouse forcing modifies those constraints, and biodiversity metrics quantify resulting community structure. Quantitative ecology answers combine mechanistic climate drivers with index-based biodiversity tracking.',
      takeaway:
        'High-yield links: six-biome comparison, latitude-altitude climate gradient, greenhouse radiative balance, and Shannon index H\' calculations.',
    },
  ],
  solution:
    'Six terrestrial biomes can be summarized by climate and dominant vegetation: tundra, taiga, temperate forest, grassland, desert, and tropical rainforest. Latitude and altitude both shape biome distributions because temperature declines with increasing latitude and with elevation (about 6.5 C per km). The greenhouse effect alters surface thermal conditions by trapping outgoing infrared radiation while maintaining top-of-atmosphere energy balance. Biodiversity can be quantified with Shannon H\' = -sum(p_i ln p_i); for proportions 0.4, 0.3, 0.2, 0.1, H\' about 1.28.',
  verifiedPatterns: ['tundra', 'taiga', 'desert', 'rainforest', '6.5', '340', '240', '1.2799', '0.923'],
  minDiagramSteps: 3,
};
