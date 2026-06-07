import { punnettDihybridDiagram, punnettSquare, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q11: BiologyQuestionDef = {
  id: 'q11',
  number: 11,
  topic: 'Inheritance Patterns: Incomplete Dominance, Codominance, Epistasis, and Pleiotropy',
  question:
    'In genetics, compare incomplete dominance in snapdragon flower color, codominance in ABO blood groups, recessive epistasis in Labrador coat color, and pleiotropy where one gene affects multiple cell and organism traits.',
  steps: [
    {
      title: 'Model incomplete dominance in snapdragons',
      formula:
        '$$RR\\,(red)\\times rr\\,(white)\\Rightarrow F1\\;100\\%\\;Rr\\,(pink)$$\n$$Rr\\times Rr\\Rightarrow F2\\;genotype\\;ratio=1:2:1$$',
      body: 'In incomplete dominance, heterozygous Rr flowers are pink. If n is the total F2 offspring count and n = 80, expected counts are RR = 1/4 x 80 = 20, Rr = 2/4 x 80 = 40, rr = 1/4 x 80 = 20.',
      diagram: punnettSquare(),
    },
    {
      title: 'Apply codominance to ABO inheritance',
      formula:
        '$$I^Ai\\times I^Bi\\Rightarrow P(I^AI^B)=\\frac{1}{4},\\;P(ii)=\\frac{1}{4}$$',
      body: 'In ABO codominance, I^A and I^B are codominant alleles and i is recessive. For n = 200 children from I^Ai x I^Bi, expected AB count = 1/4 x 200 = 50 and expected O count = 1/4 x 200 = 50.',
      diagram: wrapBioSvg(
        '<rect x="78" y="30" width="144" height="120" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="150" y1="30" x2="150" y2="150" stroke="#334155"/><line x1="78" y1="90" x2="222" y2="90" stroke="#334155"/>' +
          '<text x="114" y="24" font-size="10" text-anchor="middle">I^B</text><text x="186" y="24" font-size="10" text-anchor="middle">i</text>' +
          '<text x="68" y="66" font-size="10" text-anchor="middle">I^A</text><text x="68" y="126" font-size="10" text-anchor="middle">i</text>' +
          '<text x="114" y="66" font-size="10" text-anchor="middle">I^AI^B</text><text x="186" y="66" font-size="10" text-anchor="middle">I^Ai</text>' +
          '<text x="114" y="126" font-size="10" text-anchor="middle">I^Bi</text><text x="186" y="126" font-size="10" text-anchor="middle">ii</text>' +
          '<text x="14" y="18" font-size="12">ABO codominance Punnett square</text>',
      ),
    },
    {
      title: 'Use recessive epistasis for Labrador coat color',
      formula:
        '$$BbEe\\times BbEe\\Rightarrow phenotypes\\;9\\,B\\_E\\_:3\\,bbE\\_:4\\,\\_\\_ee$$',
      body: 'B is the black/brown pigment gene and E is the pigment deposition gene. With n = 160 pups, expected black = 9/16 x 160 = 90, brown = 3/16 x 160 = 30, yellow = 4/16 x 160 = 40.',
      diagram: punnettDihybridDiagram(),
    },
    {
      title: 'Interpret why ee masks B/b locus effects',
      body: 'At the E locus, homozygous ee blocks eumelanin deposition in hair shafts, so genotypes BBee and bbee both appear yellow. This is epistasis because one locus modifies expression of a second pigmentation gene in cells.',
    },
    {
      title: 'Explain pleiotropy with one-gene multiple effects',
      formula:
        '$$\\text{Pleiotropy index} = \\frac{\\text{traits affected}}{\\text{gene}}$$',
      body: 'A pleiotropic gene affects multiple phenotypes. If one mutant allele affects 3 traits (red cell shape, anaemia risk, and vaso-occlusion tendency), pleiotropy index = 3/1 = 3.',
      diagram: wrapBioSvg(
        '<circle cx="72" cy="92" r="20" fill="#fecaca" stroke="#991b1b"/><path d="M126 84 C136 62, 166 62, 176 84 C166 106, 136 106, 126 84 Z" fill="#fecaca" stroke="#991b1b" stroke-width="2"/>' +
          '<line x1="92" y1="92" x2="142" y2="84" stroke="#334155"/><line x1="176" y1="84" x2="236" y2="58" stroke="#334155"/><line x1="176" y1="84" x2="236" y2="92" stroke="#334155"/><line x1="176" y1="84" x2="236" y2="126" stroke="#334155"/>' +
          '<text x="16" y="20" font-size="12">Pleiotropy: one gene, many phenotypes</text><text x="236" y="60" font-size="10">cell shape</text><text x="236" y="94" font-size="10">oxygen transport</text><text x="236" y="128" font-size="10">vascular effects</text>' +
          '<text x="46" y="126" font-size="10">normal RBC</text><text x="118" y="126" font-size="10">mutant RBC</text>',
      ),
    },
    {
      title: 'Synthesize exam-ready inheritance contrasts',
      body: 'Incomplete dominance gives an intermediate heterozygote, codominance shows both allelic products, epistasis changes phenotypic ratios like 9:3:4, and pleiotropy means one gene contributes to multiple biological traits.',
      takeaway:
        'High-yield ratios: incomplete dominance 1:2:1, codominance examples in ABO, and Labrador epistasis 9:3:4.',
    },
  ],
  solution:
    'Snapdragons show incomplete dominance where RR x rr gives all Rr pink in F1 and 1:2:1 in F2. ABO inheritance demonstrates codominance because I^A and I^B are both expressed in AB individuals. Labrador coat color is a classic recessive epistasis case (9 black : 3 brown : 4 yellow) in BbEe crosses because ee masks B locus expression. Pleiotropy describes one gene influencing multiple phenotypes, so genetic effects can appear across cell and organ systems.',
  verifiedPatterns: ['1:2:1', 'I^AI^B', 'ABO', '9:3:4', 'epistasis', 'pleiotropy'],
  minDiagramSteps: 4,
};
