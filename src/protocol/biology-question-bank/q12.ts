import { meiosisOverview, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q12: BiologyQuestionDef = {
  id: 'q12',
  number: 12,
  topic: 'Sex-linked Inheritance, Non-disjunction, and Lyon Hypothesis',
  question:
    'In human genetics, use X-linked haemophilia inheritance, meiotic non-disjunction causing aneuploidy (Down syndrome and Klinefelter syndrome), and the Lyon hypothesis of X-chromosome inactivation to explain phenotype probabilities in cells and offspring.',
  steps: [
    {
      title: 'Set up an X-linked haemophilia cross',
      formula:
        '$$X^HX^h\\times X^HY\\Rightarrow daughters:\\frac{1}{2}X^HX^H,\\frac{1}{2}X^HX^h;\\;sons:\\frac{1}{2}X^HY,\\frac{1}{2}X^hY$$',
      body: 'X^H is the normal clotting allele and X^h is the haemophilia allele. If n is 120 total children with equal sex ratio (n/2 = 60 sons), expected haemophilic sons = 1/2 x 60 = 30.',
      diagram: wrapBioSvg(
        '<rect x="74" y="30" width="152" height="120" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="150" y1="30" x2="150" y2="150" stroke="#334155"/><line x1="74" y1="90" x2="226" y2="90" stroke="#334155"/>' +
          '<text x="112" y="24" font-size="10" text-anchor="middle">X^H</text><text x="188" y="24" font-size="10" text-anchor="middle">Y</text>' +
          '<text x="64" y="66" font-size="10" text-anchor="middle">X^H</text><text x="64" y="126" font-size="10" text-anchor="middle">X^h</text>' +
          '<text x="112" y="66" font-size="10" text-anchor="middle">X^HX^H</text><text x="188" y="66" font-size="10" text-anchor="middle">X^HY</text>' +
          '<text x="112" y="126" font-size="10" text-anchor="middle">X^HX^h</text><text x="188" y="126" font-size="10" text-anchor="middle">X^hY</text>' +
          '<text x="14" y="18" font-size="12">X-linked haemophilia Punnett square</text>',
      ),
    },
    {
      title: 'Link meiotic non-disjunction to trisomy and sex chromosome aneuploidy',
      formula:
        '$$\\text{Aneuploid zygote}=n+1\\;\\text{or}\\;n-1$$\n$$\\text{Examples: trisomy 21 }(47,+21),\\;\\text{Klinefelter }(47,XXY)$$',
      body: 'n is the haploid chromosome number and n = 23 in humans, so n + 1 = 24 chromosomes in an abnormal gamete. After fertilization (24 + 23), zygote chromosome number = 47.',
      diagram: meiosisOverview(),
    },
    {
      title: 'Estimate case counts from incidence values',
      formula:
        '$$\\text{Expected cases}=\\text{births}\\times\\text{incidence}$$',
      body: 'If incidence of Down syndrome is 1/700 and births = 14,000, expected Down cases = 14,000 x 1/700 = 20. If Klinefelter incidence is 1/600 male births and male births = 7,200, expected XXY cases = 7,200 x 1/600 = 12.',
    },
    {
      title: 'Explain Lyon hypothesis and Barr body number',
      formula:
        '$$\\text{Barr bodies}=X\\;\\text{chromosomes}-1$$',
      body: 'In Lyonization, one X chromosome per somatic cell remains active while others are inactivated. If a cell has 2 X chromosomes, Barr bodies = 2 - 1 = 1; if a cell has 3 X chromosomes, Barr bodies = 3 - 1 = 2.',
      diagram: wrapBioSvg(
        '<rect x="24" y="38" width="108" height="104" fill="#dbeafe" stroke="#1e3a8a"/><circle cx="78" cy="86" r="26" fill="#bfdbfe" stroke="#1e3a8a"/><circle cx="70" cy="86" r="6" fill="#1e3a8a"/><circle cx="86" cy="86" r="6" fill="#93c5fd" stroke="#1e3a8a"/>' +
          '<rect x="166" y="38" width="108" height="104" fill="#fee2e2" stroke="#991b1b"/><circle cx="220" cy="86" r="26" fill="#fecaca" stroke="#991b1b"/><circle cx="210" cy="86" r="6" fill="#991b1b"/><circle cx="220" cy="86" r="6" fill="#fca5a5" stroke="#991b1b"/><circle cx="230" cy="86" r="6" fill="#fca5a5" stroke="#991b1b"/>' +
          '<text x="18" y="20" font-size="12">Lyon hypothesis mosaic cell states</text><text x="34" y="154" font-size="10">XX cell: 1 active X + 1 Barr body</text><text x="170" y="154" font-size="10">XXX cell: 1 active X + 2 Barr bodies</text>',
      ),
    },
    {
      title: 'Connect mosaicism to phenotype variability',
      body: 'Because X inactivation is random early in embryogenesis, different cell clones express either maternal or paternal X-linked alleles. This produces mosaic patches of gene expression and variable severity in heterozygous females.',
    },
    {
      title: 'Conclude inheritance and cytogenetics interpretation',
      body: 'X-linked recessive disorders are more frequent in males, while non-disjunction changes chromosome number in all descendant cells of the zygote. Cytogenetic notation plus inheritance probabilities gives a complete Year 1 analysis.',
      takeaway:
        'Use X-linked Punnett logic for haemophilia, then map non-disjunction to 47-chromosome syndromes and Lyonization-based mosaicism.',
    },
  ],
  solution:
    'For X^HX^h x X^HY, haemophilic sons are expected at 1/2 of sons (overall 1/4 of all children). Non-disjunction generates n+1 or n-1 gametes; in humans n=23, so a 24-chromosome gamete fertilized by a normal gamete gives 47 chromosomes, as in trisomy 21 or XXY Klinefelter syndrome. Under the Lyon hypothesis, Barr bodies equal X-1, so XX cells have one Barr body and XXX cells have two, producing cellular mosaicism in X-linked gene expression.',
  verifiedPatterns: ['X^hY', '1/4', '47,+21', '47,XXY', 'Barr bodies', 'Lyon hypothesis'],
  minDiagramSteps: 3,
};
