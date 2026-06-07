import { matrixDisplay, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q41: MathQuestionDef = {
  id: 'q41',
  number: 41,
  topic: 'Chinese Remainder Theorem and modular arithmetic',
  question:
    'Use the Chinese Remainder Theorem to solve $$x\\equiv 2\\pmod 3,\\qquad x\\equiv 3\\pmod 5,\\qquad x\\equiv 2\\pmod 7,$$ and compute $$2^{100}\\pmod{35}.$$',
  steps: [
    {
      title: 'Combine the congruences mod 3 and mod 7',
      formula: '$$x\\equiv 2\\pmod 3,\\qquad x\\equiv 2\\pmod 7\\quad\\Longrightarrow\\quad x\\equiv 2\\pmod{21}$$',
      body: 'Because the residues modulo $3$ and $7$ are the same, the first and third congruences combine immediately into a single congruence modulo $21$. So any solution must have the form $x=2+21k$.',
      diagram: numberLine(
        [
          { pos: 2, label: '2', color: '#dc2626' },
          { pos: 23, label: '23', color: '#2563eb' },
          { pos: 44, label: '44', color: '#16a34a' },
        ],
        [0, 44],
      ),
    },
    {
      title: 'Impose the congruence mod 5',
      formula:
        '$$x=2+21k\\equiv 3\\pmod 5\\quad\\Longrightarrow\\quad 2+k\\equiv 3\\pmod 5\\quad\\Longrightarrow\\quad k\\equiv 1\\pmod 5$$',
      body: 'Since $21\\equiv 1\\pmod 5$, the condition simplifies to a congruence for $k$. Thus $k=1+5m$, and substituting back gives the full solution modulo $105=3\\cdot 5\\cdot 7$.',
      diagram: matrixDisplay(
        [
          ['expression', 'mod 5 reduction'],
          ['x', '2 + 21k'],
          ['21k', 'k'],
          ['2 + k', '3'],
        ],
        'Solve for k',
      ),
    },
    {
      title: 'Write the CRT solution',
      formula: '$$x=2+21(1+5m)=23+105m\\quad\\Longrightarrow\\quad x\\equiv 23\\pmod{105}$$',
      body: 'So the unique solution modulo $105$ is $x=23+105m$. Checking the least positive solution, $23$ gives residues $2,3,2$ modulo $3,5,7$ respectively.',
      diagram: matrixDisplay(
        [
          ['modulus', '23 mod modulus'],
          ['3', '2'],
          ['5', '3'],
          ['7', '2'],
        ],
        'Verification of x = 23',
      ),
    },
    {
      title: 'Reduce 2^100 modulo 5 and modulo 7',
      formula:
        '$$2^{100}\\equiv (2^4)^{25}\\equiv 1\\pmod 5$$\n$$2^{100}\\equiv 2^{100\\bmod 6}=2^4=16\\equiv 2\\pmod 7$$',
      body: 'Modulo $5$, we get $2^4=16\\equiv 1$. Modulo $7$, write $100=6\\cdot 16+4$, so the exponent reduces to $4$ and the residue is $2^4=16\\equiv 2$.',
      diagram: matrixDisplay(
        [
          ['modulus', 'reduction'],
          ['5', '2^100 ≡ 1'],
          ['7', '2^100 ≡ 2'],
        ],
        'Residues for 2^100',
      ),
    },
    {
      title: 'Recombine the residues modulo 35',
      formula:
        '$$n\\equiv 1\\pmod 5,\\qquad n\\equiv 2\\pmod 7\\quad\\Longrightarrow\\quad n=1+5t$$\n$$1+5t\\equiv 2\\pmod 7\\Longrightarrow 5t\\equiv 1\\pmod 7\\Longrightarrow t\\equiv 3\\pmod 7$$\n$$n\\equiv 16\\pmod{35}$$',
      body: 'Setting $n=1+5t$ and solving modulo $7$ gives $t\\equiv 3$, since $5\\cdot 3=15\\equiv 1\\pmod 7$. Therefore $n=1+5(3)=16$ is the unique residue modulo $35$.',
      diagram: numberLine(
        [
          { pos: 1, label: '1 mod 5', color: '#dc2626' },
          { pos: 16, label: '16', color: '#16a34a' },
          { pos: 30, label: '30', color: '#64748b' },
        ],
        [0, 35],
      ),
    },
    {
      title: 'State the final answers',
      formula: '$$x\\equiv 23\\pmod{105},\\qquad 2^{100}\\equiv 16\\pmod{35}$$',
      body: 'The combined answers are $x=23+105m$ for the first system and $2^{100}=16+35n$ modulo $35$ for the second. Both come from applying the CRT after reducing the smaller congruences first.',
      takeaway: 'The CRT turns several small congruences into one larger congruence, often making large modular computations much easier.',
    },
  ],
  solution:
    'From $$x\\equiv 2\\pmod 3$$ and $$x\\equiv 2\\pmod 7$$ we get $$x\\equiv 2\\pmod{21},$$ so write $$x=2+21k.$$ Imposing $$x\\equiv 3\\pmod 5$$ gives $$2+21k\\equiv 2+k\\equiv 3\\pmod 5,$$ hence $$k\\equiv 1\\pmod 5.$$ Therefore $$x=2+21(1+5m)=23+105m,$$ so $$x\\equiv 23\\pmod{105}.$$ For $$2^{100}\\pmod{35},$$ first reduce modulo $5$ and $7$: $$2^{100}\\equiv 1\\pmod 5$$ and $$2^{100}\\equiv 2\\pmod 7.$$ Solving $$n\\equiv 1\\pmod 5,$$ $$n\\equiv 2\\pmod 7$$ gives $$n\\equiv 16\\pmod{35}.$$ Thus $$2^{100}\\equiv 16\\pmod{35}.$$',
  verifiedPatterns: ['k\\equiv 1\\pmod 5', 'x\\equiv 23\\pmod{105}', '2^{100}', '2^{100}\\equiv 16\\pmod{35}', 'n\\equiv 16\\pmod{35}'],
  minDiagramSteps: 5,
};
