import { punnettDihybridDiagram, testCrossDiagram, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q10: BiologyQuestionDef = {
  id: 'q10',
  number: 10,
  topic: 'Mendelian Genetics with Dihybrid Pea Crosses',
  question:
    'In Mendelian genetics, for pea plant traits with alleles R/r and Y/y, use Punnett squares to derive expected F1 and F2 outcomes from parental crosses, apply Mendel laws, compute key probabilities, and interpret a test cross.',
  steps: [
    {
      title: 'Define alleles, dominance, and parental setup',
      body: 'Let R=round dominant to r=wrinkled, and Y=yellow dominant to y=green. Classical dihybrid setup starts from true-breeding RRYY x rryy, giving genetically uniform F1.',
      diagram: wrapBioSvg(
        '<rect x="34" y="48" width="98" height="84" fill="#dbeafe" stroke="#1d4ed8"/>' +
          '<rect x="168" y="48" width="98" height="84" fill="#fee2e2" stroke="#b91c1c"/>' +
          '<text x="62" y="74" font-size="10">P1: RRYY</text><text x="186" y="74" font-size="10">P2: rryy</text>' +
          '<text x="88" y="98" font-size="10">gamete RY</text><text x="210" y="98" font-size="10">gamete ry</text>' +
          '<text x="92" y="150" font-size="10">F1: all RrYy</text>',
      ),
    },
    {
      title: 'Generate F1 and F2 framework',
      formula:
        '$$RRYY\\times rryy\\Rightarrow F1\\;100\\%\\;RrYy$$\n$$F1\\times F1: RrYy\\times RrYy$$',
      body: 'Each F1 parent forms four gamete types (RY, Ry, rY, ry) with equal frequency: P(each gamete) = 1/4 = 0.25 under independent assortment.',
      diagram: punnettDihybridDiagram(),
    },
    {
      title: 'Derive F2 phenotypic ratio using independence',
      formula:
        '$$P(R\\_)=\\frac{3}{4},\\;P(Y\\_)=\\frac{3}{4}\\Rightarrow P(R\\_Y\\_)=\\frac{9}{16}$$\n$$\\text{F2 phenotypes}=9:3:3:1$$',
      body: 'P(R_) = 3/4 and P(Y_) = 3/4, so P(R_Y_) = (3/4)×(3/4) = 9/16. F2 phenotypic ratio = 9:3:3:1. In n = 160 offspring, expected counts = 90:30:30:10.',
    },
    {
      title: 'Compute a specific double-recessive probability',
      formula:
        '$$P(rryy)=P(rr)\\times P(yy)=\\frac{1}{4}\\times\\frac{1}{4}=\\frac{1}{16}$$',
      body: 'P(rryy) = P(rr)×P(yy) = (1/4)×(1/4) = 1/16 = 0.0625. In a sample of n = 100, expected rryy count = 100×(1/16) = 6.25 ≈ 6 individuals.',
    },
    {
      title: 'Use a test cross to infer unknown genotype',
      formula:
        '$$R\\_Y\\_\\times rryy\\Rightarrow \\text{if unknown is }RrYy,\\;\\text{offspring ratio }1:1:1:1$$',
      body: 'Test cross: R_Y_ × rryy. If unknown is RrYy, offspring ratio = 1:1:1:1 (each class P = 1/4). If unknown is RRYY, all progeny show dominant phenotypes (P = 1). Intermediate patterns indicate heterozygosity at one locus only.',
      diagram: testCrossDiagram(),
    },
    {
      title: 'Tie results to Mendel laws',
      body: 'Law of segregation explains allele separation into gametes; law of independent assortment explains combinatorial mixing of R/r and Y/y (when genes are unlinked). Deviations can signal linkage, selection, or sampling noise.',
      takeaway:
        'For RrYy x RrYy, memorize 9:3:3:1 phenotype and 1/16 double recessive, then validate with test-cross logic.',
    },
  ],
  solution:
    'With RRYY x rryy parents, F1 are all RrYy. Selfing F1 (RrYy x RrYy) gives F2 phenotypes in the Mendelian 9:3:3:1 ratio under independent assortment. The double recessive class probability is 1/16. In a test cross with rryy, a true dihybrid (RrYy) yields a 1:1:1:1 offspring phenotype ratio, while uniform dominant progeny indicates homozygous dominance in the tested parent.',
  verifiedPatterns: ['RrYy', '9:3:3:1', '1/16', 'segregation', 'independent assortment', '1:1:1:1'],
  minDiagramSteps: 3,
};
