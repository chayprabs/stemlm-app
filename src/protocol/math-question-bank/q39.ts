import { matrixDisplay, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q39: MathQuestionDef = {
  id: 'q39',
  number: 39,
  topic: 'Subgroups and cosets of Z_12',
  question:
    'In abstract algebra and modular arithmetic, describe all subgroups of the additive group $$\\mathbb Z_{12}$$ and compute the cosets of $$H=\\{0,4,8\\}.$$',
  steps: [
    {
      title: 'Recall that subgroups of a cyclic group correspond to divisors',
      formula: '$$12=1\\cdot 12=2\\cdot 6=3\\cdot 4$$',
      body: 'Because $\\mathbb Z_{12}$ is cyclic, it has one subgroup for each divisor of $12$. So the possible subgroup orders are $1,2,3,4,6$, and $12=|\\mathbb Z_{12}|$.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="86" r="56" fill="none" stroke="#64748b" stroke-width="2"/>',
          '<circle cx="150" cy="30" r="4" fill="#dc2626"/>',
          '<circle cx="178" cy="38" r="4" fill="#2563eb"/>',
          '<circle cx="198" cy="58" r="4" fill="#2563eb"/>',
          '<circle cx="206" cy="86" r="4" fill="#16a34a"/>',
          '<circle cx="198" cy="114" r="4" fill="#2563eb"/>',
          '<circle cx="178" cy="134" r="4" fill="#2563eb"/>',
          '<circle cx="150" cy="142" r="4" fill="#dc2626"/>',
          '<circle cx="122" cy="134" r="4" fill="#2563eb"/>',
          '<circle cx="102" cy="114" r="4" fill="#2563eb"/>',
          '<circle cx="94" cy="86" r="4" fill="#16a34a"/>',
          '<circle cx="102" cy="58" r="4" fill="#2563eb"/>',
          '<circle cx="122" cy="38" r="4" fill="#2563eb"/>',
          '<text x="146" y="22" font-size="12">0</text>',
          '<text x="212" y="90" font-size="12">3</text>',
          '<text x="146" y="160" font-size="12">6</text>',
          '<text x="78" y="90" font-size="12">9</text>',
          '<text x="220" y="22" font-size="12">clock model of Z12</text>',
        ].join(''),
      ),
    },
    {
      title: 'List all distinct subgroups of Z_12',
      formula:
        '$$\\{0\\},\\quad \\langle 6\\rangle=\\{0,6\\},\\quad \\langle 4\\rangle=\\{0,4,8\\},\\quad \\langle 3\\rangle=\\{0,3,6,9\\},\\quad \\langle 2\\rangle=\\{0,2,4,6,8,10\\},\\quad \\langle 1\\rangle=\\mathbb Z_{12}$$',
      body: 'These are the only subgroups because generators in a cyclic group are determined by the gcd with $12$. For example, $\\langle 8\\rangle=\\langle 4\\rangle$ and $\\langle 10\\rangle=\\langle 2\\rangle$, so no new subgroups appear.',
      diagram: matrixDisplay(
        [
          ['generator', 'subgroup'],
          ['6', '{0,6}'],
          ['4', '{0,4,8}'],
          ['3', '{0,3,6,9}'],
          ['2', '{0,2,4,6,8,10}'],
          ['1', 'Z12'],
        ],
        'Subgroups of Z12',
      ),
    },
    {
      title: 'Focus on the subgroup H = {0,4,8}',
      formula: '$$H=\\langle 4\\rangle=\\{0,4,8\\}$$',
      body: 'Adding $4$ repeatedly cycles through $0,4,8,0$, so $H$ has order $3$. Since $|\\mathbb Z_{12}|/|H|=12/3=4$, there will be exactly four distinct cosets.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="86" r="56" fill="none" stroke="#64748b" stroke-width="2"/>',
          '<circle cx="150" cy="30" r="7" fill="#dc2626"/>',
          '<circle cx="198" cy="58" r="7" fill="#dc2626"/>',
          '<circle cx="102" cy="114" r="7" fill="#dc2626"/>',
          '<text x="146" y="22" font-size="12">0</text>',
          '<text x="202" y="54" font-size="12">4</text>',
          '<text x="82" y="118" font-size="12">8</text>',
          '<text x="212" y="30" font-size="12" fill="#dc2626">H = {0,4,8}</text>',
        ].join(''),
      ),
    },
    {
      title: 'Compute the cosets of H',
      formula:
        '$$0+H=\\{0,4,8\\},\\qquad 1+H=\\{1,5,9\\},\\qquad 2+H=\\{2,6,10\\},\\qquad 3+H=\\{3,7,11\\}$$',
      body: 'For example, $1+H=\\{1+0,1+4,1+8\\}=\\{1,5,9\\}$ and $2+H=\\{2,6,10\\}$. Adding any larger residue reproduces one of these four sets because the cosets already partition the entire group.',
      diagram: matrixDisplay(
        [
          ['representative', 'coset'],
          ['0', '{0,4,8}'],
          ['1', '{1,5,9}'],
          ['2', '{2,6,10}'],
          ['3', '{3,7,11}'],
        ],
        'Cosets of H',
      ),
    },
    {
      title: 'Read off the quotient structure',
      formula:
        '$$\\mathbb Z_{12}/H=\\{H,1+H,2+H,3+H\\}\\cong \\mathbb Z_4$$',
      body: 'There are four cosets, and addition of cosets behaves like addition modulo $4$: for instance $(1+H)+(2+H)=3+H$ and $(1+H)+(3+H)=H$. So the quotient group is cyclic of order $4$.',
      diagram: wrapMathSvg(
        [
          '<rect x="40" y="44" width="44" height="28" fill="#fee2e2" stroke="#333"/>',
          '<rect x="102" y="44" width="44" height="28" fill="#dbeafe" stroke="#333"/>',
          '<rect x="164" y="44" width="44" height="28" fill="#dcfce7" stroke="#333"/>',
          '<rect x="226" y="44" width="44" height="28" fill="#ede9fe" stroke="#333"/>',
          '<text x="62" y="62" font-size="12" text-anchor="middle">H</text>',
          '<text x="124" y="62" font-size="12" text-anchor="middle">1+H</text>',
          '<text x="186" y="62" font-size="12" text-anchor="middle">2+H</text>',
          '<text x="248" y="62" font-size="12" text-anchor="middle">3+H</text>',
          '<text x="150" y="102" font-size="13" text-anchor="middle">quotient has 4 elements, so it behaves like Z4</text>',
        ].join(''),
      ),
      takeaway: 'In a cyclic group, subgroups and quotient groups are controlled entirely by divisors of the group order.',
    },
  ],
  solution:
    'Since $$\\mathbb Z_{12}$$ is cyclic, it has one subgroup for each divisor of $12$. The distinct subgroups are $$\\{0\\},\\quad \\{0,6\\},\\quad \\{0,4,8\\},\\quad \\{0,3,6,9\\},\\quad \\{0,2,4,6,8,10\\},\\quad \\mathbb Z_{12}.$$ For $$H=\\{0,4,8\\},$$ the cosets are $$H=\\{0,4,8\\},\\qquad 1+H=\\{1,5,9\\},\\qquad 2+H=\\{2,6,10\\},\\qquad 3+H=\\{3,7,11\\}.$$ These four cosets partition $$\\mathbb Z_{12},$$ and the quotient group satisfies $$\\mathbb Z_{12}/H \\cong \\mathbb Z_4.$$',
  verifiedPatterns: ['\\{0,4,8\\}', '\\{1,5,9\\}', '\\{2,6,10\\}', '\\{3,7,11\\}', '\\mathbb Z_{12}/H \\cong \\mathbb Z_4'],
  minDiagramSteps: 5,
};
