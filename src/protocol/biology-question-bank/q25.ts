import { punnettSquare, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q25: BiologyQuestionDef = {
  id: 'q25',
  number: 25,
  topic: 'Hardy-Weinberg Equilibrium and Evolutionary Mechanisms',
  question:
    'For population genetics, state Hardy-Weinberg conditions, calculate genotype frequencies when q=0.3, solve a 10000-individual recessive phenotype case, and explain mechanisms that violate equilibrium.',
  steps: [
    {
      title: 'List Hardy-Weinberg equilibrium assumptions',
      formula:
        '$$p+q=1,\\qquad p^2+2pq+q^2=1$$',
      body: 'Equilibrium assumptions are: very large population size, random mating, no mutation, no migration (gene flow), and no natural selection. Numeric check example: if p=0.7 and q=0.3, then p+q = 0.7+0.3 = 1.0 and p^2+2pq+q^2 = 0.49+0.42+0.09 = 1.0.',
      diagram: wrapBioSvg(
        '<rect x="16" y="22" width="268" height="134" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="16" y1="46" x2="284" y2="46" stroke="#334155"/>' +
          '<text x="150" y="38" font-size="11" text-anchor="middle">Hardy-Weinberg conditions</text>' +
          '<text x="24" y="66" font-size="9">1. large population (no drift)</text>' +
          '<text x="24" y="84" font-size="9">2. random mating</text>' +
          '<text x="24" y="102" font-size="9">3. no mutation</text>' +
          '<text x="24" y="120" font-size="9">4. no migration</text>' +
          '<text x="24" y="138" font-size="9">5. no selection</text>',
      ),
    },
    {
      title: 'Compute genotype frequencies when q=0.3',
      formula:
        '$$q=0.3\\Rightarrow p=1-q=0.7$$\n$$p^2=(0.7)^2=0.49,\\;2pq=2(0.7)(0.3)=0.42,\\;q^2=(0.3)^2=0.09$$',
      body: 'With q=0.3, genotype frequencies are AA = 0.49, Aa = 0.42, aa = 0.09. In percentages this is 49%, 42%, and 9%, and frequencies sum correctly: 0.49+0.42+0.09 = 1.00.',
      diagram: punnettSquare(),
    },
    {
      title: 'Solve the 10000-individual recessive phenotype case',
      formula:
        '$$N=10000,\\;q^2=0.09\\Rightarrow \\text{recessive phenotype count}=q^2N=0.09\\times10000$$',
      body: 'Recessive phenotype count = 900 individuals. Carrier frequency is 2pq = 0.42, so heterozygous carriers = 0.42x10000 = 4200 individuals.',
    },
    {
      title: 'Back-calculate allele frequency from observed recessives',
      formula:
        '$$\\text{If }aa=1600\\text{ in }10000,\\;q^2=\\frac{1600}{10000}=0.16\\Rightarrow q=0.4,\\;p=0.6$$',
      body: 'Then expected heterozygotes = 2pq = 2x0.6x0.4 = 0.48, giving 0.48x10000 = 4800 carriers. This reverse method is common for autosomal recessive disease estimation.',
    },
    {
      title: 'Quantify one mechanism that violates equilibrium',
      formula:
        '$$p\'=(1-m)p+m p_m$$\n$$p=0.70,\\;m=0.10,\\;p_m=0.40\\Rightarrow p\'=0.9(0.70)+0.1(0.40)=0.67$$',
      body: 'Gene flow decreases p from 0.70 to 0.67 in one generation under these values, so Delta p = 0.67-0.70 = -0.03. Similar departures occur from selection, mutation, non-random mating, and genetic drift in small populations.',
      diagram: wrapBioSvg(
        '<rect x="20" y="30" width="92" height="92" fill="#dbeafe" stroke="#1e3a8a"/>' +
          '<rect x="188" y="30" width="92" height="92" fill="#dcfce7" stroke="#166534"/>' +
          '<line x1="112" y1="76" x2="188" y2="76" stroke="#334155" stroke-width="2"/>' +
          '<text x="66" y="56" font-size="10" text-anchor="middle">population A</text>' +
          '<text x="66" y="76" font-size="10" text-anchor="middle">p=0.70</text>' +
          '<text x="66" y="96" font-size="10" text-anchor="middle">q=0.30</text>' +
          '<text x="234" y="56" font-size="10" text-anchor="middle">migrants</text>' +
          '<text x="234" y="76" font-size="10" text-anchor="middle">p_m=0.40</text>' +
          '<text x="150" y="20" font-size="11" text-anchor="middle">gene flow changes allele frequency</text>',
      ),
    },
    {
      title: 'State interpretation limits and exam phrasing',
      body: 'Hardy-Weinberg is a null model, not a claim that populations never evolve. The correct workflow is estimate p and q, compare expected and observed genotype counts, then infer likely violating mechanisms.',
      takeaway:
        'Core calculations: p=1-q, genotype frequencies p^2/2pq/q^2, and count = frequency x population size.',
    },
  ],
  solution:
    'Hardy-Weinberg equilibrium requires large population size, random mating, and no mutation, migration, or selection. With q=0.3, p=0.7 and expected genotype frequencies are p^2=0.49, 2pq=0.42, q^2=0.09. In a population of 10000, expected recessive phenotype count is 0.09x10000=900. If 1600 recessive individuals are observed, q^2=0.16 so q=0.4 and p=0.6. Evolutionary mechanisms such as gene flow, drift, mutation, and selection shift allele frequencies away from Hardy-Weinberg expectations.',
  verifiedPatterns: ['Hardy-Weinberg', 'p+q=1', 'q=0.3', 'p^2+2pq+q^2', '10000', 'recessive phenotype'],
  minDiagramSteps: 3,
};
