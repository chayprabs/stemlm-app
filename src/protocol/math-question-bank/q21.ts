import { numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q21: MathQuestionDef = {
  id: 'q21',
  number: 21,
  topic: 'Laurent series, singularities, and residues',
  question:
    'Find the Laurent series expansions for the complex functions $$\\dfrac{\\sin z}{z^3}$$ and $$\\dfrac{1}{z^2(1-z)}$$ about their singular points. Classify the singularities and compute the relevant residues.',
  steps: [
    {
      title: 'Expand sin z divided by z^3 near z = 0',
      formula:
        '$$\\sin z=z-\\frac{z^3}{3!}+\\frac{z^5}{5!}-\\cdots$$\n$$\\frac{\\sin z}{z^3}=\\frac{1}{z^2}-\\frac16+\\frac{z^2}{120}-\\cdots$$',
      body: 'Using $z=0.1$, the first two displayed terms give $1/z^2-1/6=100-0.1667=99.8333$. The next correction is $z^2/120=0.0000833$, so the series is already accurate to four decimal places.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="48" fill="none" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="150" cy="90" r="4" fill="#dc2626"/>',
          '<text x="160" y="84" font-size="12">z=0</text>',
          '<text x="150" y="28" font-size="12" text-anchor="middle">Laurent annulus about 0</text>',
        ].join(''),
      ),
    },
    {
      title: 'Classify the singularity of sin z / z^3',
      formula:
        '$$\\frac{\\sin z}{z^3}=\\frac{1}{z^2}+0\\cdot\\frac1z-\\frac16+\\cdots$$',
      body: 'At $z=0.1$, the principal part is $1/z^2=100$ and the $1/z$ coefficient is $0$. So $z=0$ is a pole of order $2$, and the residue equals $0$.',
      diagram: numberLine([{ pos: 0, label: 'pole order 2', color: '#dc2626' }], [-1, 1]),
    },
    {
      title: 'Expand 1 / (z^2(1-z)) about z = 0',
      formula:
        '$$\\frac{1}{1-z}=1+z+z^2+z^3+\\cdots\\qquad (|z|<1)$$\n$$\\frac{1}{z^2(1-z)}=\\frac1{z^2}+\\frac1z+1+z+z^2+\\cdots$$',
      body: 'At $z=0.1$, the exact value is $1/(0.01\\cdot0.9)=111.111\\ldots$. The first four Laurent terms give $100+10+1+0.1=111.1$, already matching to three decimal places.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="58" fill="none" stroke="#16a34a" stroke-width="2"/>',
          '<circle cx="150" cy="90" r="4" fill="#dc2626"/>',
          '<text x="160" y="84" font-size="12">0</text>',
          '<text x="150" y="28" font-size="12" text-anchor="middle">|z|<1 expansion disk</text>',
        ].join(''),
      ),
    },
    {
      title: 'Read off the singularity and residue at z = 0',
      formula:
        '$$\\frac{1}{z^2(1-z)}=\\frac1{z^2}+\\frac1z+1+\\cdots$$',
      body: 'With $z=0.1$, the first two principal-part terms are $1/z^2+1/z=100+10=110$. The leading term is still $1/z^2$, so $z=0$ is a pole of order $2$, and the coefficient of $1/z$ equals $1$, giving $$\\operatorname*{Res}_{z=0}\\frac{1}{z^2(1-z)}=1.$$',
      diagram: wrapMathSvg(
        [
          '<rect x="44" y="54" width="212" height="72" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>',
          '<text x="150" y="84" font-size="18" text-anchor="middle">Res at z=0 = 1</text>',
          '<text x="150" y="106" font-size="12" text-anchor="middle">coefficient of 1/z</text>',
        ].join(''),
      ),
    },
    {
      title: 'Expand around z = 1 to see the second singularity',
      formula:
        '$$w=z-1\\qquad\\Rightarrow\\qquad \\frac{1}{z^2(1-z)}=-\\frac{1}{w(1+w)^2}$$\n$$-\\frac{1}{w(1+w)^2}=-\\frac1w+2-3w+\\cdots$$',
      body: 'With $w=0.1$, the first two terms give $-1/0.1+2=-8$. The exact value is $-1/(0.1\\cdot1.1^2)\\approx-8.264$, so the Laurent expansion about $z=1$ is behaving correctly and shows a simple pole there.',
      diagram: wrapMathSvg(
        [
          '<line x1="38" y1="90" x2="262" y2="90" stroke="#333" stroke-width="2"/>',
          '<circle cx="92" cy="90" r="4" fill="#dc2626"/>',
          '<circle cx="188" cy="90" r="4" fill="#16a34a"/>',
          '<text x="84" y="78" font-size="12">0</text>',
          '<text x="180" y="78" font-size="12">1</text>',
          '<text x="150" y="34" font-size="12" text-anchor="middle">two singular points</text>',
        ].join(''),
      ),
    },
    {
      title: 'Summarize the residues',
      formula:
        '$$\\operatorname*{Res}_{z=0}\\frac{\\sin z}{z^3}=0,\\qquad \\operatorname*{Res}_{z=0}\\frac{1}{z^2(1-z)}=1,\\qquad \\operatorname*{Res}_{z=1}\\frac{1}{z^2(1-z)}=-1$$',
      body: 'For the second function, the residue check is $1+(-1)=0$, which is consistent with the $1/z^3$ decay at infinity. For the first function, the Laurent series has $0\\cdot(1/z)$, so the residue equals $0$.',
      diagram: wrapMathSvg(
        [
          '<rect x="34" y="48" width="232" height="80" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
          '<text x="150" y="78" font-size="16" text-anchor="middle">Res(sin z / z^3, 0)=0</text>',
          '<text x="150" y="98" font-size="16" text-anchor="middle">Res(1/(z^2(1-z)), 0)=1</text>',
          '<text x="150" y="118" font-size="16" text-anchor="middle">Res(1/(z^2(1-z)), 1)=-1</text>',
        ].join(''),
      ),
      takeaway: 'The Laurent coefficient of $1/z$ is the residue, and the principal part immediately reveals the order of a pole.',
    },
  ],
  solution:
    'Using $$\\sin z=z-\\frac{z^3}{6}+\\frac{z^5}{120}-\\cdots,$$ we obtain $$\\frac{\\sin z}{z^3}=\\frac{1}{z^2}-\\frac16+\\frac{z^2}{120}-\\cdots.$$ Thus $$z=0$$ is a pole of order $2$, and $$\\operatorname*{Res}_{z=0}\\frac{\\sin z}{z^3}=0.$$ Also, for $$|z|<1,$$ $$\\frac{1}{z^2(1-z)}=\\frac1{z^2}\\left(1+z+z^2+\\cdots\\right)=\\frac1{z^2}+\\frac1z+1+z+\\cdots.$$ Hence $$z=0$$ is again a pole of order $2$, but now $$\\operatorname*{Res}_{z=0}\\frac{1}{z^2(1-z)}=1.$$ Around $$z=1,$$ write $$w=z-1,$$ so $$\\frac{1}{z^2(1-z)}=-\\frac{1}{w(1+w)^2}=-\\frac1w+2-3w+\\cdots.$$ Therefore $$z=1$$ is a simple pole with $$\\operatorname*{Res}_{z=1}\\frac{1}{z^2(1-z)}=-1.$$',
  verifiedPatterns: ['\\frac{\\sin z}{z^3}=\\frac{1}{z^2}-\\frac16', 'pole of order $2$', '\\operatorname*{Res}_{z=0}\\frac{\\sin z}{z^3}=0', '\\operatorname*{Res}_{z=0}\\frac{1}{z^2(1-z)}=1', '\\operatorname*{Res}_{z=1}\\frac{1}{z^2(1-z)}=-1'],
  minDiagramSteps: 6,
};
