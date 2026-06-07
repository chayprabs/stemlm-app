import { meiosisOverview, mitosisStagesDiagram, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q37: BiologyQuestionDef = {
  id: 'q37',
  number: 37,
  topic: 'Mitosis vs Meiosis, Chromosome Numbering, and Crossing Over',
  question:
    'Compare mitosis and meiosis in a structured table, interpret a meiosis diagram for 2n=4, calculate gamete outcomes for 2n=6, and explain how crossing over increases variation.',
  steps: [
    {
      title: 'Build a mitosis vs meiosis comparison table',
      body: 'Mitosis has one division and conserves ploidy, while meiosis has two divisions and halves ploidy. Product number = 2 daughter cells for mitosis versus 4 haploid gametes for meiosis.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Mitosis vs meiosis</text>' +
          '<rect x="20" y="30" width="260" height="124" fill="#f8fafc" stroke="#334155"/><line x1="96" y1="30" x2="96" y2="154" stroke="#334155"/><line x1="188" y1="30" x2="188" y2="154" stroke="#334155"/><line x1="20" y1="56" x2="280" y2="56" stroke="#334155"/><line x1="20" y1="82" x2="280" y2="82" stroke="#cbd5e1"/><line x1="20" y1="108" x2="280" y2="108" stroke="#cbd5e1"/><line x1="20" y1="134" x2="280" y2="134" stroke="#cbd5e1"/>' +
          '<text x="42" y="48" font-size="9">feature</text><text x="122" y="48" font-size="9">mitosis</text><text x="214" y="48" font-size="9">meiosis</text>' +
          '<text x="26" y="74" font-size="9">divisions</text><text x="122" y="74" font-size="9">1</text><text x="214" y="74" font-size="9">2</text>' +
          '<text x="26" y="100" font-size="9">products</text><text x="122" y="100" font-size="9">2 cells</text><text x="214" y="100" font-size="9">4 gametes</text>' +
          '<text x="26" y="126" font-size="9">ploidy change</text><text x="122" y="126" font-size="9">2n to 2n</text><text x="214" y="126" font-size="9">2n to n</text>' +
          '<text x="26" y="152" font-size="9">crossing over</text><text x="122" y="152" font-size="9">rare/none</text><text x="214" y="152" font-size="9">prophase I</text>',
      ),
    },
    {
      title: 'Identify chromosome behavior in meiosis stages',
      body: 'Meiosis I separates homologous chromosomes, and meiosis II separates sister chromatids. Reduction division = meiosis I because chromosome set count is halved at this stage.',
      diagram: meiosisOverview(),
    },
    {
      title: 'Track counts for a 2n=4 meiosis example',
      formula:
        '$$2n=4\\Rightarrow n=2$$\n$$\\text{after meiosis I: }2\\;\\text{cells each with }n=2\\;\\text{chromosomes}$$\n$$\\text{after meiosis II: }4\\;\\text{cells each with }n=2$$',
      body: 'Starting with 2n = 4, homolog pairs = 2 and gamete chromosome number = 2. Final result = four haploid cells, each with n = 2 chromosomes.',
    },
    {
      title: 'Calculate independent assortment outcomes for 2n=6',
      formula:
        '$$2n=6\\Rightarrow n=3$$\n$$\\text{gamete combinations}=2^n=2^3=8$$',
      body: 'With n = 3 homologous pairs, independent assortment alone gives combinations = 8 genetically distinct chromosomal assortments per parent (before considering crossing over).',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Independent assortment count</text>' +
          '<rect x="24" y="40" width="252" height="100" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="40" y="70" font-size="11">n = 3 homologous pairs</text>' +
          '<text x="40" y="92" font-size="11">gamete combinations = 2^n</text>' +
          '<text x="40" y="116" font-size="11">2^3 = 8 unique chromosome sets</text>',
      ),
    },
    {
      title: 'Explain crossing over and recombination',
      body: 'Crossing over occurs between non-sister chromatids in prophase I at chiasmata, producing recombinant chromatids. Recombinant fraction = recombinant offspring divided by total offspring in linkage analysis.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">crossing over in prophase I</text>' +
          '<line x1="78" y1="46" x2="78" y2="142" stroke="#1d4ed8" stroke-width="3"/><line x1="104" y1="46" x2="104" y2="142" stroke="#1d4ed8" stroke-width="3"/>' +
          '<line x1="188" y1="46" x2="188" y2="142" stroke="#dc2626" stroke-width="3"/><line x1="214" y1="46" x2="214" y2="142" stroke="#dc2626" stroke-width="3"/>' +
          '<line x1="104" y1="82" x2="188" y2="106" stroke="#16a34a" stroke-width="3"/><line x1="188" y1="82" x2="104" y2="106" stroke="#16a34a" stroke-width="3"/>' +
          '<text x="24" y="164" font-size="10">chiasma creates recombinant chromatids</text>',
      ),
    },
    {
      title: 'Relate meiosis errors to aneuploidy risk',
      body: 'Nondisjunction in meiosis I or II can produce gametes with n+1 or n-1 chromosomes, contributing to aneuploid zygotes after fertilization. Accurate segregation plus recombination = central to heredity and variation.',
      takeaway:
        'High-yield numbers: for 2n=4, gametes have n=2; for 2n=6, independent assortment gives 2^3 = 8 gamete chromosome combinations.',
    },
  ],
  solution:
    'Mitosis and meiosis differ in division number, ploidy outcome, and recombination behavior. Meiosis I separates homologs and meiosis II separates sister chromatids, yielding four haploid gametes. For 2n=4, n=2 and each final gamete carries 2 chromosomes. For 2n=6, n=3 and independent assortment yields 2^3 = 8 chromosomal combinations before crossing-over effects. Crossing over in prophase I further increases genetic diversity by exchanging chromatid segments.',
  verifiedPatterns: ['mitosis', 'meiosis', '2n=4', '2n=6', 'n=3', '2^3=8', 'crossing over'],
  minDiagramSteps: 4,
};
