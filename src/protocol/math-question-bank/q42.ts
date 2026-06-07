import { matrixDisplay, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q42: MathQuestionDef = {
  id: 'q42',
  number: 42,
  topic: 'Finite fields and multiplicative order in F_8',
  question:
    'Let $p(x)=x^3+x+1\\in \\mathbf F_2[x]$ and let $\\alpha$ be the class of $x$ in $\\mathbf F_2[x]/(p(x))$. Show that $p$ is irreducible over $\\mathbf F_2$, list the eight elements of the quotient field, reduce powers of $\\alpha$, and determine the multiplicative order of each nonzero element.',
  steps: [
    {
      title: 'Test the cubic at the two elements of F_2',
      formula:
        '$$p(0)=0^3+0+1=1,\\qquad p(1)=1^3+1+1=1\\pmod 2$$',
      body: 'Over $\\mathbf F_2$ there are only two possible roots to check. Substituting $x=0$ gives $1$, and substituting $x=1$ gives $1+1+1=3\\equiv 1\\pmod 2$, so neither $0$ nor $1$ is a root.',
      diagram: numberLine(
        [
          { pos: 0, label: 'x=0 -> 1', color: '#dc2626' },
          { pos: 1, label: 'x=1 -> 1', color: '#2563eb' },
        ],
        [0, 1],
      ),
    },
    {
      title: 'Conclude the polynomial is irreducible',
      formula:
        '$$x^3+x+1\\text{ has no linear factor in }\\mathbf F_2[x]\\Rightarrow x^3+x+1\\text{ is irreducible}$$',
      body: 'A cubic over a field factors nontrivially only if it has a linear factor. Here the only two possible root checks are already numeric: $p(0)=1$ and $p(1)=1$. Since both evaluations stay nonzero, neither $x$ nor $x+1$ divides the cubic, so the polynomial is irreducible.',
      diagram: matrixDisplay(
        [
          ['x', 'p(x) mod 2'],
          ['0', '1'],
          ['1', '1'],
        ],
        'Root check in F_2',
      ),
    },
    {
      title: 'Use the relation alpha^3 = alpha + 1 to list F_8',
      formula:
        '$$\\alpha^3+\\alpha+1=0\\Rightarrow \\alpha^3=\\alpha+1$$\n$$F_8=\\{0,1,\\alpha,\\alpha^2,\\alpha+1,\\alpha^2+\\alpha,\\alpha^2+\\alpha+1,\\alpha^2+1\\}$$',
      body: 'Because the modulus has degree $3$, every residue class reduces to $a+b\\alpha+c\\alpha^2$ with $a,b,c\\in \\mathbf F_2$. The $2^3=8$ binary choices give exactly the eight listed elements, and the reduction rule starts with $\\alpha^3=\\alpha+1$.',
      diagram: matrixDisplay(
        [
          ['000', '0'],
          ['001', '1'],
          ['010', '\\alpha'],
          ['011', '\\alpha+1'],
          ['100', '\\alpha^2'],
          ['110', '\\alpha^2+\\alpha'],
          ['111', '\\alpha^2+\\alpha+1'],
          ['101', '\\alpha^2+1'],
        ],
        'Binary coefficients a+bα+cα²',
      ),
    },
    {
      title: 'Reduce successive powers of alpha',
      formula:
        '$$\\alpha^4=\\alpha(\\alpha+1)=\\alpha^2+\\alpha$$\n$$\\alpha^5=\\alpha(\\alpha^2+\\alpha)=\\alpha^2+\\alpha+1$$\n$$\\alpha^6=\\alpha(\\alpha^2+\\alpha+1)=\\alpha^2+1$$\n$$\\alpha^7=\\alpha(\\alpha^2+1)=\\alpha^3+\\alpha=(\\alpha+1)+\\alpha=1$$',
      body: 'The reductions stay inside the basis $\\{1,\\alpha,\\alpha^2\\}$. For example, $\\alpha^5=\\alpha^3+\\alpha^2=(\\alpha+1)+\\alpha^2=\\alpha^2+\\alpha+1$, and one more step gives $\\alpha^7=1$.',
      diagram: numberLine(
        [
          { pos: 0, label: 'α^0=1', color: '#333' },
          { pos: 1, label: 'α', color: '#2563eb' },
          { pos: 2, label: 'α²', color: '#2563eb' },
          { pos: 3, label: 'α+1', color: '#dc2626' },
          { pos: 4, label: 'α²+α', color: '#16a34a' },
          { pos: 5, label: 'α²+α+1', color: '#7c3aed' },
          { pos: 6, label: 'α²+1', color: '#ea580c' },
          { pos: 7, label: '1', color: '#333' },
        ],
        [0, 7],
      ),
    },
    {
      title: 'Read off the multiplicative orders in the nonzero group',
      formula:
        '$$|F_8^\\times|=8-1=7,\\qquad \\alpha^7=1,\\qquad \\operatorname{ord}(\\alpha)=7$$',
      body: 'The nonzero elements form the multiplicative group $F_8^\\times$ of size $7$. Since $7$ is prime, every nonidentity element has order 7. Therefore $1$ has order $1$, while $\\alpha,\\alpha^2,\\alpha^3,\\alpha^4,\\alpha^5,\\alpha^6$ all have order 7.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="54" fill="none" stroke="#64748b" stroke-width="2"/>',
          '<circle cx="150" cy="36" r="4" fill="#333"/>',
          '<circle cx="192" cy="52" r="4" fill="#2563eb"/>',
          '<circle cx="214" cy="90" r="4" fill="#2563eb"/>',
          '<circle cx="192" cy="128" r="4" fill="#dc2626"/>',
          '<circle cx="150" cy="144" r="4" fill="#16a34a"/>',
          '<circle cx="108" cy="128" r="4" fill="#7c3aed"/>',
          '<circle cx="86" cy="90" r="4" fill="#ea580c"/>',
          '<text x="150" y="28" font-size="12" text-anchor="middle">1=α^7</text>',
          '<text x="204" y="50" font-size="12">α</text>',
          '<text x="222" y="94" font-size="12">α²</text>',
          '<text x="196" y="144" font-size="12">α³</text>',
          '<text x="150" y="162" font-size="12" text-anchor="middle">α⁴</text>',
          '<text x="80" y="144" font-size="12">α⁵</text>',
          '<text x="54" y="94" font-size="12">α⁶</text>',
        ].join(''),
      ),
      takeaway:
        'An irreducible cubic over $\\mathbf F_2$ produces a field with $8$ elements, and its nonzero elements form a cyclic group of order $7$.',
    },
  ],
  solution:
    'Because $p(0)=1$ and $p(1)=1$ in $\\mathbf F_2$, the cubic $x^3+x+1$ has no root in $\\mathbf F_2$ and is therefore irreducible. Writing $\\alpha=x\\bmod (x^3+x+1)$ gives the reduction rule $$\\alpha^3=\\alpha+1.$$ Every element of the quotient field is of the form $a+b\\alpha+c\\alpha^2$, so $$F_8=\\{0,1,\\alpha,\\alpha^2,\\alpha+1,\\alpha^2+\\alpha,\\alpha^2+\\alpha+1,\\alpha^2+1\\}.$$ Successive reductions give $$\\alpha^4=\\alpha^2+\\alpha,\\quad \\alpha^5=\\alpha^2+\\alpha+1,\\quad \\alpha^6=\\alpha^2+1,\\quad \\alpha^7=1.$$ Hence $F_8^\\times$ has order $7$, so $1$ has order $1$ and every other nonzero element has order 7. In particular, $\\alpha$ is a generator of $F_8^\\times$.',
  verifiedPatterns: ['irreducible', '\\alpha^3=\\alpha+1', 'F_8', '\\alpha^7=1', 'order 7'],
  minDiagramSteps: 4,
};
