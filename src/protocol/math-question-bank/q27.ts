import { matrixDisplay, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q27: MathQuestionDef = {
  id: 'q27',
  number: 27,
  topic: 'Finite Markov chains: stationary law, return time, and two-step transitions',
  question:
    'Consider the three-state Markov chain with transition matrix $$P=\\begin{bmatrix}\\tfrac12&\\tfrac12&0\\\\[2pt]\\tfrac14&\\tfrac12&\\tfrac14\\\\[2pt]0&\\tfrac12&\\tfrac12\\end{bmatrix}.$$ Find the stationary distribution $\\pi$, compute the mean return time to state $1$, and evaluate the two-step transition probability $P^2_{13}$.',
  steps: [
    {
      title: 'Read the chain from the transition matrix',
      body: 'From state $1$ the chain stays at $1$ with probability $1/2$ or moves to $2$ with probability $1/2$. From state $2$ it can go left, stay, or go right with probabilities $1/4$, $1/2$, and $1/4$. From state $3$ the behavior mirrors state $1$, so the chain is symmetric around state $2$.',
      diagram: matrixDisplay(
        [
          ['1/2', '1/2', '0'],
          ['1/4', '1/2', '1/4'],
          ['0', '1/2', '1/2'],
        ],
        'Transition matrix P',
      ),
    },
    {
      title: 'Square the matrix to see the two-step movement',
      formula:
        '$$P^2=\\begin{bmatrix}\\tfrac38&\\tfrac12&\\tfrac18\\\\[2pt]\\tfrac14&\\tfrac12&\\tfrac14\\\\[2pt]\\tfrac18&\\tfrac12&\\tfrac38\\end{bmatrix}$$',
      body: 'The entry we ultimately need is row $1$ dot column $3$: $$P^2_{13}=\\left(\\frac12\\right)(0)+\\left(\\frac12\\right)\\left(\\frac14\\right)+0\\left(\\frac12\\right)=\\frac18.$$ So the only two-step route from $1$ to $3$ is the path $1\\to 2\\to 3$.',
      diagram: matrixDisplay(
        [
          ['3/8', '1/2', '1/8'],
          ['1/4', '1/2', '1/4'],
          ['1/8', '1/2', '3/8'],
        ],
        'Two-step matrix P^2',
        [[0, 2]],
      ),
    },
    {
      title: 'Solve pi P = pi with total mass 1',
      formula:
        '$$\\pi=(\\pi_1,\\pi_2,\\pi_3),\\qquad \\pi P=\\pi,\\qquad \\pi_1+\\pi_2+\\pi_3=1$$\n$$\\pi_1=\\frac12\\pi_1+\\frac14\\pi_2,\\qquad \\pi_3=\\frac14\\pi_2+\\frac12\\pi_3$$\n$$\\pi=\\left(\\frac14,\\frac12,\\frac14\\right)$$',
      body: 'From the first balance equation, $$\\frac12\\pi_1=\\frac14\\pi_2,$$ so $\\pi_2=2\\pi_1$. Symmetry gives $\\pi_3=\\pi_1$, and then $$\\pi_1+2\\pi_1+\\pi_1=4\\pi_1=1,$$ so $\\pi_1=1/4$, $\\pi_2=1/2$, and $\\pi_3=1/4$.',
      diagram: numberLine(
        [
          { pos: 1, label: '1 : 1/4', color: '#dc2626' },
          { pos: 2, label: '2 : 1/2', color: '#1d4ed8' },
          { pos: 3, label: '3 : 1/4', color: '#16a34a' },
        ],
        [0.7, 3.3],
      ),
    },
    {
      title: 'Use the stationary mass to get the mean return time',
      formula:
        '$$m_1=\\frac{1}{\\pi_1}=\\frac{1}{1/4}=4$$',
      body: 'For an irreducible finite Markov chain, the mean return time to state $i$ is $1/\\pi_i$. Since $\\pi_1=1/4$, the expected time to come back to state $1$ is $4$ steps.',
      diagram: wrapMathSvg(
        [
          '<line x1="34" y1="92" x2="266" y2="92" stroke="#333" stroke-width="2"/>',
          '<circle cx="54" cy="92" r="5" fill="#dc2626"/>',
          '<circle cx="118" cy="92" r="5" fill="#1d4ed8"/>',
          '<circle cx="182" cy="92" r="5" fill="#1d4ed8"/>',
          '<circle cx="246" cy="92" r="5" fill="#dc2626"/>',
          '<text x="54" y="74" font-size="12" text-anchor="middle">start 1</text>',
          '<text x="246" y="74" font-size="12" text-anchor="middle">return</text>',
          '<text x="150" y="122" font-size="13" text-anchor="middle">mean return time 4</text>',
        ].join(''),
      ),
    },
    {
      title: 'Interpret the two-step transition probability',
      formula:
        '$$P^2_{13}=\\frac18$$',
      body: 'There is no direct one-step jump from $1$ to $3$, so after two steps the only successful route is $1\\to 2\\to 3$. Its probability is $$\\left(\\frac12\\right)\\left(\\frac14\\right)=\\frac18=0.125.$$',
      diagram: wrapMathSvg(
        [
          '<circle cx="54" cy="90" r="18" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="150" cy="90" r="18" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="246" cy="90" r="18" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>',
          '<text x="54" y="95" font-size="13" text-anchor="middle">1</text>',
          '<text x="150" y="95" font-size="13" text-anchor="middle">2</text>',
          '<text x="246" y="95" font-size="13" text-anchor="middle">3</text>',
          '<line x1="72" y1="84" x2="132" y2="84" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="132,84 123,79 123,89" fill="#16a34a"/>',
          '<line x1="168" y1="84" x2="228" y2="84" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="228,84 219,79 219,89" fill="#16a34a"/>',
          '<text x="102" y="70" font-size="12" text-anchor="middle">1/2</text>',
          '<text x="198" y="70" font-size="12" text-anchor="middle">1/4</text>',
        ].join(''),
      ),
    },
    {
      title: 'Collect the main answers',
      body: 'The chain spends half of its long-run time in the middle state and one quarter in each edge state. That makes the return time to state $1$ equal to $4$, and the two-step transition chance from $1$ to $3$ equal to $1/8$.',
      takeaway: 'Symmetry makes the stationary distribution easy to spot, and matrix powers translate directly into multi-step transition probabilities.',
    },
  ],
  solution:
    'The stationary distribution satisfies $$\\pi P=\\pi,\\qquad \\pi_1+\\pi_2+\\pi_3=1.$$ Solving the balance equations gives $$\\pi_2=2\\pi_1,\\qquad \\pi_3=\\pi_1,$$ so $$\\pi=\\left(\\frac14,\\frac12,\\frac14\\right).$$ The mean return time to state $1$ is therefore $$m_1=\\frac{1}{\\pi_1}=4.$$ Squaring the matrix gives $$P^2=\\begin{bmatrix}\\tfrac38&\\tfrac12&\\tfrac18\\\\[2pt]\\tfrac14&\\tfrac12&\\tfrac14\\\\[2pt]\\tfrac18&\\tfrac12&\\tfrac38\\end{bmatrix},$$ so $$P^2_{13}=\\frac18.$$',
  verifiedPatterns: [
    '\\pi=\\left(\\frac14,\\frac12,\\frac14\\right)',
    'm_1=\\frac{1}{\\pi_1}=4',
    'P^2_{13}=\\frac18',
    '\\tfrac38',
    '\\tfrac12',
  ],
  minDiagramSteps: 5,
};
