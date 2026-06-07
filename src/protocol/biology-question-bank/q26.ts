import { phylogeneticTree, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q26: BiologyQuestionDef = {
  id: 'q26',
  number: 26,
  topic: 'Speciation Models and Reproductive Isolation',
  question:
    'In evolutionary speciation biology, define the biological species concept, compare allopatric versus sympatric speciation, classify prezygotic and postzygotic barriers, and contrast gradualism with punctuated equilibrium.',
  steps: [
    {
      title: 'Define the biological species concept (BSC)',
      body: 'Under BSC, a species is a group of actually or potentially interbreeding natural populations that are reproductively isolated from other such groups. The central criterion is gene flow within species and isolation between species.',
      diagram: wrapBioSvg(
        '<circle cx="92" cy="92" r="52" fill="#dbeafe" stroke="#1e3a8a"/>' +
          '<circle cx="208" cy="92" r="52" fill="#fee2e2" stroke="#991b1b"/>' +
          '<line x1="144" y1="92" x2="156" y2="92" stroke="#334155" stroke-width="3"/>' +
          '<line x1="156" y1="92" x2="168" y2="92" stroke="#334155" stroke-dasharray="4 3"/>' +
          '<text x="92" y="92" font-size="10" text-anchor="middle">species A</text>' +
          '<text x="208" y="92" font-size="10" text-anchor="middle">species B</text>' +
          '<text x="150" y="20" font-size="11" text-anchor="middle">reproductive isolation limits gene flow</text>',
      ),
    },
    {
      title: 'Compare allopatric and sympatric speciation pathways',
      body: 'Allopatric speciation begins with geographic isolation (mountains, rivers, islands), allowing divergence by drift and selection. Sympatric speciation occurs without physical separation, often through polyploidy, host shifts, or strong disruptive selection with assortative mating.',
      diagram: wrapBioSvg(
        '<rect x="18" y="28" width="118" height="124" fill="#f8fafc" stroke="#334155"/>' +
          '<rect x="164" y="28" width="118" height="124" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="77" y="20" font-size="10" text-anchor="middle">allopatric</text>' +
          '<text x="223" y="20" font-size="10" text-anchor="middle">sympatric</text>' +
          '<line x1="77" y1="44" x2="77" y2="136" stroke="#64748b"/><line x1="62" y1="88" x2="92" y2="88" stroke="#64748b" stroke-width="4"/>' +
          '<text x="28" y="58" font-size="9">barrier forms</text><text x="28" y="78" font-size="9">gene flow drops</text><text x="28" y="98" font-size="9">divergence</text><text x="28" y="118" font-size="9">isolation complete</text>' +
          '<circle cx="195" cy="72" r="14" fill="#bfdbfe" stroke="#1e3a8a"/><circle cx="251" cy="72" r="14" fill="#fecaca" stroke="#991b1b"/>' +
          '<text x="174" y="104" font-size="9">same area</text><text x="174" y="122" font-size="9">ecological split</text><text x="174" y="140" font-size="9">assortative mating</text>',
      ),
    },
    {
      title: 'Use molecular clock arithmetic for divergence time',
      formula:
        '$$t=\\frac{D}{2u}$$\n$$D=0.06\\;\\text{substitutions/site},\\;u=1.5\\times10^{-8}\\;\\text{site}^{-1}\\text{yr}^{-1}$$',
      body: 'Compute t = 0.06/(2x1.5x10^-8) = 0.06/(3x10^-8) = 2.0x10^6 years. The split is estimated at about 2 million years ago under a constant-rate clock assumption.',
    },
    {
      title: 'Classify prezygotic and postzygotic barriers',
      body: 'Prezygotic barriers prevent mating or fertilization (habitat, temporal, behavioral, mechanical, gametic isolation). Postzygotic barriers act after fertilization (hybrid inviability, hybrid sterility, hybrid breakdown).',
      diagram: wrapBioSvg(
        '<rect x="18" y="24" width="264" height="128" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="150" y1="24" x2="150" y2="152" stroke="#334155"/>' +
          '<line x1="18" y1="48" x2="282" y2="48" stroke="#334155"/>' +
          '<text x="84" y="40" font-size="10" text-anchor="middle">prezygotic</text>' +
          '<text x="216" y="40" font-size="10" text-anchor="middle">postzygotic</text>' +
          '<text x="28" y="70" font-size="9">habitat isolation</text><text x="28" y="88" font-size="9">temporal isolation</text><text x="28" y="106" font-size="9">behavioral isolation</text><text x="28" y="124" font-size="9">mechanical/gametic</text>' +
          '<text x="160" y="70" font-size="9">hybrid inviability</text><text x="160" y="88" font-size="9">hybrid sterility</text><text x="160" y="106" font-size="9">hybrid breakdown</text>',
      ),
    },
    {
      title: 'Contrast gradualism and punctuated equilibrium',
      body: 'Gradualism proposes relatively continuous small changes through time, whereas punctuated equilibrium predicts long stasis intervals interrupted by rapid evolutionary change often linked to speciation events.',
      diagram: phylogeneticTree(),
    },
    {
      title: 'Integrate concept, process, and evidence',
      body: 'Speciation is best described by mechanism (allopatric/sympatric), barrier type (pre/postzygotic), and tempo pattern (gradual vs punctuated). Combining these categories yields full-credit evolutionary explanations.',
      takeaway:
        'High-yield terms: reproductive isolation, allopatric vs sympatric, prezygotic vs postzygotic, gradualism, punctuated equilibrium.',
    },
  ],
  solution:
    'The biological species concept defines species by reproductive isolation and potential interbreeding. Allopatric speciation requires geographic separation, while sympatric speciation occurs in overlapping ranges through ecological or genetic mechanisms. Reproductive barriers are prezygotic (before fertilization) or postzygotic (after fertilization). In the worked molecular clock example, D=0.06 and u=1.5x10^-8 give t about 2 million years. Evolutionary tempo can appear gradual or punctuated depending on lineage history and fossil resolution.',
  verifiedPatterns: ['biological species concept', 'allopatric', 'sympatric', 'prezygotic', 'postzygotic', 'punctuated equilibrium'],
  minDiagramSteps: 3,
};
