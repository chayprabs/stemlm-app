import { meiosisOverview, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q49: BiologyQuestionDef = {
  id: 'q49',
  number: 49,
  topic: 'Sexual vs Asexual Reproduction, Fertilisation, Early Embryogenesis, and hCG Testing',
  question:
    'In reproductive biology, compare sexual versus asexual reproduction, outline human fertilisation steps, track cleavage-blastulation-gastrulation and germ-layer formation, and explain how hCG-based pregnancy tests work.',
  steps: [
    {
      title: 'Compare sexual and asexual reproduction outcomes',
      formula:
        '$$\\text{offspring genotypes from asexual mitosis}=1\\;\\text{clone type}$$\n$$\\text{offspring genotype combinations from sexual meiosis}>1$$',
      body: 'Asexual reproduction uses mitotic cloning, so offspring genotype class count = 1 in ideal no-mutation cases. Sexual reproduction uses meiosis and fertilisation, so allele combinations > 1 due to independent assortment and recombination.',
      diagram: meiosisOverview(),
    },
    {
      title: 'Outline key steps of human fertilisation',
      formula:
        '$$\\text{sperm count progression: }2.0\\times10^8\\to2.0\\times10^5\\to1\\;\\text{successful fusion}$$',
      body: 'Fertilisation sequence = sperm capacitation, acrosome reaction, zona pellucida binding, membrane fusion, cortical reaction, and pronuclear fusion. If initial sperm count = 2.0 x 10^8 and only 2.0 x 10^5 reach oviduct vicinity, successful zygote-forming fusion = 1 sperm.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Human fertilisation sequence</text>' +
          '<rect x="16" y="42" width="64" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="48" y="58" font-size="8" text-anchor="middle">capacitation</text>' +
          '<rect x="92" y="42" width="64" height="24" fill="#dcfce7" stroke="#166534"/><text x="124" y="58" font-size="8" text-anchor="middle">acrosome</text>' +
          '<rect x="168" y="42" width="64" height="24" fill="#fef3c7" stroke="#a16207"/><text x="200" y="58" font-size="8" text-anchor="middle">zona bind</text>' +
          '<rect x="244" y="42" width="40" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="264" y="58" font-size="8" text-anchor="middle">fusion</text>' +
          '<line x1="80" y1="54" x2="92" y2="54" stroke="#334155"/><line x1="156" y1="54" x2="168" y2="54" stroke="#334155"/><line x1="232" y1="54" x2="244" y2="54" stroke="#334155"/>' +
          '<circle cx="150" cy="118" r="22" fill="#fecaca" stroke="#991b1b"/><text x="150" y="122" font-size="9" text-anchor="middle">zygote</text>',
      ),
    },
    {
      title: 'Track cleavage, blastulation, and gastrulation',
      formula:
        '$$\\text{cell count progression: }1\\to2\\to4\\to8\\to16\\;\\text{(morula)}$$',
      body: 'Cleavage increases blastomere number while embryo volume is near constant, so count = 1 to 2 to 4 to 8 to 16 cells. Blastulation forms blastocyst with trophoblast and inner cell mass. Gastrulation then forms ectoderm, mesoderm, and endoderm germ layers.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Early embryogenesis</text>' +
          '<circle cx="44" cy="84" r="12" fill="#fde68a" stroke="#a16207"/><text x="44" y="88" font-size="8" text-anchor="middle">1</text>' +
          '<circle cx="88" cy="84" r="12" fill="#fef3c7" stroke="#a16207"/><text x="88" y="88" font-size="8" text-anchor="middle">2</text>' +
          '<circle cx="132" cy="84" r="12" fill="#dcfce7" stroke="#166534"/><text x="132" y="88" font-size="8" text-anchor="middle">4</text>' +
          '<circle cx="176" cy="84" r="12" fill="#dbeafe" stroke="#1e3a8a"/><text x="176" y="88" font-size="8" text-anchor="middle">8</text>' +
          '<circle cx="220" cy="84" r="14" fill="#fecaca" stroke="#991b1b"/><text x="220" y="88" font-size="8" text-anchor="middle">morula</text>' +
          '<circle cx="266" cy="84" r="14" fill="#ede9fe" stroke="#5b21b6"/><text x="266" y="88" font-size="8" text-anchor="middle">blastocyst</text>' +
          '<text x="34" y="128" font-size="9">gastrulation -> ectoderm, mesoderm, endoderm</text>',
      ),
    },
    {
      title: 'Relate germ layers to organ derivatives',
      formula:
        '$$\\text{ectoderm}\\to\\text{epidermis + nervous system}$$\n$$\\text{mesoderm}\\to\\text{muscle + blood + kidney}$$\n$$\\text{endoderm}\\to\\text{gut + liver + pancreas}$$',
      body: 'Layer-to-organ mapping is deterministic at broad level: ectoderm derivatives include epidermis and CNS/PNS, mesoderm derivatives include muscle and circulatory tissues, and endoderm derivatives include gastrointestinal and respiratory epithelia.',
    },
    {
      title: 'Explain hCG pregnancy test detection logic',
      formula:
        '$$\\text{if }hCG\\ge25\\,\\text{mIU mL}^{-1}\\Rightarrow \\text{test line positive}$$\n$$hCG\\;\\text{doubling approx every }48\\,\\text{h}:\\;30\\to60\\to120$$',
      body: 'After implantation, syncytiotrophoblast secretes hCG. In an assay with threshold = 25 mIU/mL, sample hCG = 30 mIU/mL gives positive output. With approximate 48-hour doubling, concentration can rise 30 -> 60 -> 120 mIU/mL over 96 hours in early normal pregnancy.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">hCG lateral-flow concept</text>' +
          '<rect x="26" y="66" width="248" height="24" fill="#f8fafc" stroke="#334155"/><text x="36" y="62" font-size="9">sample</text>' +
          '<rect x="94" y="70" width="6" height="16" fill="#1d4ed8"/><text x="98" y="102" font-size="8" text-anchor="middle">C</text>' +
          '<rect x="144" y="70" width="6" height="16" fill="#dc2626"/><text x="148" y="102" font-size="8" text-anchor="middle">T</text>' +
          '<text x="178" y="84" font-size="9">hCG binds antibody complexes</text>',
      ),
    },
    {
      title: 'Integrate reproduction and developmental milestones',
      body: 'Sexual reproduction increases genetic diversity, fertilisation establishes diploidy, and embryogenesis progressively organizes body plan. hCG testing translates trophoblast endocrine signaling into a practical clinical diagnostic readout.',
      takeaway:
        'Core timeline: meiosis and fertilisation -> zygote cleavage -> blastocyst -> gastrulation germ layers -> implantation-associated hCG detection.',
    },
  ],
  solution:
    'Asexual reproduction yields clonal offspring in ideal conditions, while sexual reproduction produces genetically diverse offspring via meiosis and fertilisation. Human fertilisation includes capacitation, acrosome reaction, zona penetration, membrane fusion, and pronuclear fusion to form a zygote. Early development proceeds through cleavage, morula, blastocyst formation, and gastrulation that generates ectoderm, mesoderm, and endoderm. Pregnancy tests detect hCG produced after implantation, with positive results once concentration exceeds assay threshold.',
  verifiedPatterns: ['sexual', 'asexual', 'fertilisation', 'blastocyst', 'gastrulation', 'ectoderm', 'mesoderm', 'endoderm', 'hCG'],
  minDiagramSteps: 4,
};
