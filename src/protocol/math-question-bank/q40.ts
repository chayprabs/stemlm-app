import { matrixDisplay, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q40: MathQuestionDef = {
  id: 'q40',
  number: 40,
  topic: 'Quotient rings and Gaussian integers',
  question:
    'Show that $$\\mathbb Z[x]/(x^2+1)\\cong \\mathbb Z[i].$$ Then determine whether the ideal $$(x^2+1)$$ is prime, maximal, both, or neither in $$\\mathbb Z[x].$$',
  steps: [
    {
      title: 'Define the evaluation homomorphism at i',
      formula: '$$\\varphi:\\mathbb Z[x]\\to\\mathbb Z[i],\\qquad \\varphi(p(x))=p(i),\\qquad x\\mapsto i$$',
      body: 'Evaluating a polynomial with integer coefficients at $i$ lands in the Gaussian integers because, for example, $\\varphi(2+3x)=2+3i$. This map preserves addition and multiplication, so it is a ring homomorphism.',
      diagram: wrapMathSvg(
        [
          '<rect x="28" y="54" width="88" height="34" fill="#f8fafc" stroke="#333"/>',
          '<rect x="184" y="54" width="88" height="34" fill="#f8fafc" stroke="#333"/>',
          '<line x1="116" y1="71" x2="184" y2="71" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="184,71 175,67 175,75" fill="#1d4ed8"/>',
          '<text x="72" y="75" font-size="13" text-anchor="middle">Z[x]</text>',
          '<text x="228" y="75" font-size="13" text-anchor="middle">Z[i]</text>',
          '<text x="150" y="61" font-size="12" text-anchor="middle">phi</text>',
          '<text x="150" y="88" font-size="12" text-anchor="middle">x maps to i</text>',
        ].join(''),
      ),
    },
    {
      title: 'Find the kernel of the homomorphism',
      formula:
        '$$\\varphi(x^2+1)=i^2+1=-1+1=0,\\qquad (x^2+1)\\subseteq \\ker\\varphi$$',
      body: 'Because $i$ satisfies the polynomial $x^2+1$, every multiple of $x^2+1$ maps to zero. Conversely, if $p(i)=0$, divide $p(x)$ by $x^2+1$: the remainder has the form $ax+b$, and $ai+b=0$ forces $a=b=0$, so the remainder vanishes.',
      diagram: matrixDisplay(
        [
          ['polynomial', 'value at i'],
          ['x^2 + 1', '0'],
          ['x^3 + x', '0'],
          ['a + bx', 'a + bi'],
        ],
        'Kernel test at i',
      ),
    },
    {
      title: 'Use the First Isomorphism Theorem',
      formula:
        '$$\\ker\\varphi=(x^2+1)\\quad\\Longrightarrow\\quad \\mathbb Z[x]/(x^2+1)\\cong \\operatorname{im}(\\varphi)=\\mathbb Z[i]$$',
      body: 'The image is all of $\\mathbb Z[i]$ because, for example, $2+3i=\\varphi(2+3x)$. Therefore the quotient by the kernel is exactly the Gaussian integer ring.',
      diagram: wrapMathSvg(
        [
          '<rect x="20" y="48" width="94" height="36" fill="#fee2e2" stroke="#333"/>',
          '<rect x="186" y="48" width="94" height="36" fill="#dcfce7" stroke="#333"/>',
          '<line x1="114" y1="66" x2="186" y2="66" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="186,66 177,62 177,70" fill="#16a34a"/>',
          '<text x="67" y="70" font-size="12" text-anchor="middle">Z[x]/(x^2+1)</text>',
          '<text x="233" y="70" font-size="13" text-anchor="middle">Z[i]</text>',
          '<text x="150" y="56" font-size="12" text-anchor="middle">isomorphic rings</text>',
          '<text x="150" y="98" font-size="12" text-anchor="middle">in the quotient, x^2 = -1</text>',
        ].join(''),
      ),
    },
    {
      title: 'Decide whether the ideal is prime',
      formula: '$$\\mathbb Z[i]\\text{ is an integral domain }\\Longrightarrow (x^2+1)\\text{ is prime in }\\mathbb Z[x]$$',
      body: 'A quotient ring is an integral domain exactly when the ideal is prime. For instance, $(1+i)(1-i)=2\\neq 0$, and products in $\\mathbb Z[i]$ behave without zero divisors, so $(x^2+1)$ is prime.',
      diagram: wrapMathSvg(
        [
          '<line x1="70" y1="120" x2="70" y2="36" stroke="#64748b" stroke-width="1.5"/>',
          '<line x1="28" y1="78" x2="112" y2="78" stroke="#64748b" stroke-width="1.5"/>',
          '<circle cx="98" cy="50" r="4" fill="#1d4ed8"/>',
          '<circle cx="84" cy="92" r="4" fill="#1d4ed8"/>',
          '<circle cx="56" cy="64" r="4" fill="#1d4ed8"/>',
          '<circle cx="42" cy="106" r="4" fill="#1d4ed8"/>',
          '<text x="132" y="60" font-size="12">Gaussian lattice has no zero divisors</text>',
          '<text x="132" y="80" font-size="12">so the quotient is an integral domain</text>',
        ].join(''),
      ),
    },
    {
      title: 'Decide whether the ideal is maximal',
      formula: '$$\\mathbb Z[i]\\text{ is not a field }\\Longrightarrow (x^2+1)\\text{ is not maximal in }\\mathbb Z[x]$$',
      body: 'For maximality the quotient would have to be a field, but $\\mathbb Z[i]$ is not a field. For example, $2$ has no multiplicative inverse in $\\mathbb Z[i]$, since $(a+bi)2=1$ would force $a=1/2$ and $b=0$, which are not both integers.',
      diagram: matrixDisplay(
        [
          ['element', 'invertible in Z[i]?'],
          ['1 + i', 'yes'],
          ['2', 'no'],
          ['3 - i', 'no in general'],
        ],
        'Not a field',
      ),
    },
    {
      title: 'State the classification clearly',
      formula:
        '$$\\mathbb Z[x]/(x^2+1)\\cong \\mathbb Z[i],\\qquad (x^2+1)\\text{ is prime but not maximal}$$',
      body: 'The quotient ring identification answers both ideal questions at once: $2=(1+i)(1-i)$ lives in $\\mathbb Z[i]$, but $2$ is not invertible. So the answer is prime $=\\text{yes}$ and maximal $=\\text{no}$.',
      takeaway: 'A quotient ring can be an integral domain without being a field, so prime ideals need not be maximal in rings like $\\mathbb Z[x]$.',
    },
  ],
  solution:
    'Define $$\\varphi:\\mathbb Z[x]\\to\\mathbb Z[i]$$ by $$\\varphi(p(x))=p(i),$$ so in particular $$x\\mapsto i.$$ Since every element of $$\\mathbb Z[i]$$ has the form $$a+bi=\\varphi(a+bx),$$ the map is surjective. Also $$\\varphi(x^2+1)=i^2+1=0,$$ so $$(x^2+1)\\subseteq\\ker\\varphi.$$ If $$p(i)=0,$$ division by $$x^2+1$$ leaves a remainder $$ax+b,$$ and $$ai+b=0$$ forces $$a=b=0,$$ so $$\\ker\\varphi=(x^2+1).$$ By the First Isomorphism Theorem, $$\\mathbb Z[x]/(x^2+1)\\cong \\mathbb Z[i].$$ Since $$\\mathbb Z[i]$$ is an integral domain, the ideal $$(x^2+1)$$ is prime. But $$\\mathbb Z[i]$$ is not a field, so $$(x^2+1)$$ is not maximal.',
  verifiedPatterns: ['\\mathbb Z[x]/(x^2+1)\\cong \\mathbb Z[i]', 'x\\mapsto i', 'prime', 'not maximal', 'not a field'],
  minDiagramSteps: 5,
};
