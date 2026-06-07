import { foodWeb, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q22: BiologyQuestionDef = {
  id: 'q22',
  number: 22,
  topic: 'Species Interactions, Keystone Effects, and Succession',
  question:
    'Using community ecology concepts, complete a species interactions table, explain competitive exclusion, evaluate keystone species effects in a food web, and compare primary versus secondary succession.',
  steps: [
    {
      title: 'Build the species interactions sign table',
      body: 'Interaction outcomes are expressed as fitness effects on species A and B: mutualism (+/+), commensalism (+/0), predation or parasitism (+/-), competition (-/-), and amensalism (-/0). Correct sign notation helps organize ecological case studies quickly.',
      diagram: wrapBioSvg(
        '<rect x="16" y="22" width="268" height="134" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="86" y1="22" x2="86" y2="156" stroke="#334155"/>' +
          '<line x1="178" y1="22" x2="178" y2="156" stroke="#334155"/>' +
          '<line x1="16" y1="48" x2="284" y2="48" stroke="#334155"/>' +
          '<line x1="16" y1="74" x2="284" y2="74" stroke="#cbd5e1"/>' +
          '<line x1="16" y1="100" x2="284" y2="100" stroke="#cbd5e1"/>' +
          '<line x1="16" y1="126" x2="284" y2="126" stroke="#cbd5e1"/>' +
          '<text x="52" y="40" font-size="10" text-anchor="middle">interaction</text>' +
          '<text x="132" y="40" font-size="10" text-anchor="middle">signs</text>' +
          '<text x="230" y="40" font-size="10" text-anchor="middle">example</text>' +
          '<text x="52" y="66" font-size="9" text-anchor="middle">mutualism</text><text x="132" y="66" font-size="9" text-anchor="middle">+/+</text><text x="230" y="66" font-size="9" text-anchor="middle">plant-pollinator</text>' +
          '<text x="52" y="92" font-size="9" text-anchor="middle">competition</text><text x="132" y="92" font-size="9" text-anchor="middle">-/-</text><text x="230" y="92" font-size="9" text-anchor="middle">niche overlap</text>' +
          '<text x="52" y="118" font-size="9" text-anchor="middle">predation</text><text x="132" y="118" font-size="9" text-anchor="middle">+/-</text><text x="230" y="118" font-size="9" text-anchor="middle">hawk-mouse</text>' +
          '<text x="52" y="144" font-size="9" text-anchor="middle">commensalism</text><text x="132" y="144" font-size="9" text-anchor="middle">+/0</text><text x="230" y="144" font-size="9" text-anchor="middle">epiphyte-tree</text>',
      ),
    },
    {
      title: 'Apply competition equations to exclusion logic',
      formula:
        '$$\\Delta N_A=r_AN_A\\left(1-\\frac{N_A+\\alpha_{AB}N_B}{K_A}\\right)$$\n$$r_A=0.4,\\;N_A=100,\\;N_B=80,\\;\\alpha_{AB}=1.2,\\;K_A=300$$',
      body: 'Compute the bracket term: 1-((100+1.2x80)/300) = 1-(196/300) = 0.347, so Delta N_A = 0.4x100x0.347 = 13.9. If species B imposes strong competitive effects across many generations, one species can be driven to local extinction (competitive exclusion) unless niche differentiation reduces overlap.',
      diagram: wrapBioSvg(
        '<line x1="34" y1="138" x2="272" y2="138" stroke="#334155"/><line x1="34" y1="138" x2="34" y2="26" stroke="#334155"/>' +
          '<path d="M34 126 C74 92, 100 74, 136 66 C170 62, 196 78, 222 108 C238 124, 252 132, 272 136" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<path d="M34 126 C80 112, 114 98, 146 86 C178 74, 206 60, 236 42 C248 34, 260 28, 272 24" fill="none" stroke="#b91c1c" stroke-width="2"/>' +
          '<text x="14" y="18" font-size="11">Competition trajectory</text>' +
          '<text x="184" y="62" font-size="9" fill="#b91c1c">species B dominates</text>' +
          '<text x="176" y="122" font-size="9" fill="#1d4ed8">species A declines</text>',
      ),
    },
    {
      title: 'Use a food web to identify keystone species effects',
      body: 'A keystone species has disproportionately large community impact relative to abundance. Removing a top predator can release herbivores, reduce producers, and trigger trophic cascades that alter multiple trophic levels.',
      diagram: foodWeb(),
    },
    {
      title: 'Quantify diversity change after keystone removal',
      formula:
        '$$H\'=-\\sum p_i\\ln p_i$$\n$$\\text{Before: }p_i=0.25\\times4\\Rightarrow H\'=-(4)(0.25\\ln0.25)=1.386$$',
      body: 'After predator removal, suppose abundances become 0.85, 0.05, 0.05, 0.05. Then H\' = -(0.85ln0.85 + 3x0.05ln0.05) = 0.588. The drop from 1.386 to 0.588 indicates reduced evenness and diversity.',
    },
    {
      title: 'Compare primary and secondary succession pathways',
      body: 'Primary succession starts on substrate without soil (lava, glacial retreat), while secondary succession begins where soil remains after disturbance (fire, agriculture). Secondary succession usually proceeds faster due to seed banks, microbes, and residual nutrients.',
      diagram: wrapBioSvg(
        '<rect x="18" y="32" width="118" height="118" fill="#f1f5f9" stroke="#334155"/>' +
          '<rect x="164" y="32" width="118" height="118" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="77" y="24" font-size="10" text-anchor="middle">primary succession</text>' +
          '<text x="223" y="24" font-size="10" text-anchor="middle">secondary succession</text>' +
          '<text x="28" y="56" font-size="9">bare rock</text><text x="28" y="74" font-size="9">lichens</text><text x="28" y="92" font-size="9">soil formation</text><text x="28" y="110" font-size="9">grasses</text><text x="28" y="128" font-size="9">shrubs -> forest</text>' +
          '<text x="174" y="56" font-size="9">disturbed soil</text><text x="174" y="74" font-size="9">annual plants</text><text x="174" y="92" font-size="9">perennials</text><text x="174" y="110" font-size="9">young woodland</text><text x="174" y="128" font-size="9">mature community</text>',
      ),
    },
    {
      title: 'Integrate interactions and succession for exam answers',
      body: 'Strong competition can simplify communities, keystone species can stabilize trophic structure, and succession explains temporal recovery after disturbance. Good answers combine interaction signs, mechanism, and one quantitative diversity or growth calculation.',
      takeaway:
        'Remember: niche overlap drives competitive exclusion, keystone loss drives trophic cascades, and succession describes predictable community turnover.',
    },
  ],
  solution:
    'Species interactions are categorized by fitness signs (+/+ mutualism, -/- competition, +/- predation/parasitism, +/0 commensalism). Competitive exclusion occurs when niche overlap is high and one species consistently depresses the other. Keystone species removal can trigger trophic cascades and lower diversity; in the worked example Shannon diversity dropped from 1.386 to 0.588. Primary succession begins without soil, whereas secondary succession starts with remaining soil and generally proceeds faster.',
  verifiedPatterns: ['mutualism', 'competition', 'competitive exclusion', 'keystone species', "H'", 'primary succession'],
  minDiagramSteps: 3,
};
