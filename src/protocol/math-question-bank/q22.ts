import { axesGraph, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q22: MathQuestionDef = {
  id: 'q22',
  number: 22,
  topic: 'Mobius maps, disk geometry, and Laplace on the upper half-plane',
  question:
    'Let $$\\phi(z)=\\frac{z-i}{z+i}.$$ Show that this Mobius map sends the upper half-plane $$H=\\{x+iy:y>0\\}$$ conformally onto the unit disk $$D=\\{w:|w|<1\\}$$, find the inverse map, determine the image of the real axis and of the point $z=i$, and solve Laplace\'s equation on $H$ with boundary data $$U(x,0)=\\frac{x^2-1}{x^2+1}$$ by transporting the harmonic disk function $v(w)=\\operatorname{Re}w$.',
  steps: [
    {
      title: 'Sketch the source half-plane and the target disk',
      body: 'The map starts on the upper half-plane $y>0$ and lands in the unit disk $|w|<1$. The special point $z=i$ should be easy to track because the numerator becomes $i-i=0$, so we expect the center $w=0$ to appear in the image.',
      diagram: wrapMathSvg(
        [
          '<rect x="26" y="28" width="106" height="56" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<line x1="26" y1="84" x2="132" y2="84" stroke="#333" stroke-width="2"/>',
          '<text x="79" y="52" font-size="14" text-anchor="middle">y &gt; 0</text>',
          '<text x="79" y="100" font-size="12" text-anchor="middle">real axis</text>',
          '<circle cx="224" cy="84" r="46" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>',
          '<text x="224" y="88" font-size="14" text-anchor="middle">|w| &lt; 1</text>',
          '<line x1="142" y1="84" x2="170" y2="84" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="170,84 161,79 161,89" fill="#16a34a"/>',
          '<text x="152" y="72" font-size="12">phi</text>',
          '<circle cx="79" cy="56" r="4" fill="#dc2626"/>',
          '<text x="92" y="52" font-size="12">z = i</text>',
          '<circle cx="224" cy="84" r="4" fill="#dc2626"/>',
          '<text x="238" y="78" font-size="12">w = 0</text>',
        ].join(''),
      ),
    },
    {
      title: 'Check that interior points go strictly inside the disk',
      formula:
        '$$\\left|\\phi(z)\\right|^2=\\frac{|z-i|^2}{|z+i|^2}=\\frac{x^2+(y-1)^2}{x^2+(y+1)^2}$$',
      body: 'For $z=x+iy$ with $y>0$, the denominator exceeds the numerator by $4y>0$, so $x^2+(y-1)^2<x^2+(y+1)^2$ and therefore $|\\phi(z)|<1$. With the sample point $z=1+2i$, the ratio is $\\frac{1^2+(2-1)^2}{1^2+(2+1)^2}=\\frac{2}{10}=0.2$, so $|\\phi(1+2i)|=\\sqrt{0.2}\\approx 0.447<1$.',
      diagram: wrapMathSvg(
        [
          '<line x1="28" y1="126" x2="132" y2="126" stroke="#333" stroke-width="2"/>',
          '<rect x="28" y="34" width="104" height="92" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<circle cx="88" cy="74" r="4" fill="#dc2626"/>',
          '<text x="98" y="68" font-size="12">1 + 2i</text>',
          '<circle cx="224" cy="90" r="52" fill="none" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="246" cy="74" r="4" fill="#dc2626"/>',
          '<text x="252" y="68" font-size="12">inside</text>',
          '<text x="84" y="22" font-size="12" text-anchor="middle">upper half-plane</text>',
          '<text x="224" y="22" font-size="12" text-anchor="middle">unit disk</text>',
        ].join(''),
      ),
    },
    {
      title: 'Track the boundary and a distinguished point',
      formula:
        '$$\\phi(x)=\\frac{x-i}{x+i},\\qquad \\left|\\phi(x)\\right|=1\\text{ for }x\\in\\mathbb R,\\qquad \\phi(i)=0$$',
      body: 'If $y=0$, then $|x-i|^2=x^2+1=|x+i|^2$, so every real point lands on the unit circle. For example, $x=2$ gives $\\left|\\frac{2-i}{2+i}\\right|=1$. Also $\\phi(i)=\\frac{i-i}{i+i}=0$, so the point $z=i$ goes to the center of the disk.',
      diagram: wrapMathSvg(
        [
          '<line x1="34" y1="128" x2="126" y2="128" stroke="#333" stroke-width="2"/>',
          '<circle cx="222" cy="88" r="50" fill="none" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="222" cy="88" r="4" fill="#dc2626"/>',
          '<text x="80" y="148" font-size="12" text-anchor="middle">real axis</text>',
          '<text x="222" y="28" font-size="12" text-anchor="middle">unit circle</text>',
          '<text x="222" y="94" font-size="12" text-anchor="middle">phi(i)=0</text>',
          '<line x1="126" y1="108" x2="172" y2="96" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="172,96 163,93 165,102" fill="#16a34a"/>',
        ].join(''),
      ),
    },
    {
      title: 'Solve algebraically for the inverse Mobius map',
      formula:
        '$$w=\\frac{z-i}{z+i}\\quad\\Longrightarrow\\quad wz+wi=z-i\\quad\\Longrightarrow\\quad z=i\\,\\frac{1+w}{1-w}$$',
      body: 'Rearranging the linear fractional equation isolates $z$. A quick check with $w=0$ gives $z=i\\frac{1+0}{1-0}=i$, matching the previous step. Another check with $w=\\frac12$ gives $z=i\\frac{3/2}{1/2}=3i$, which indeed lies in the upper half-plane.',
      diagram: wrapMathSvg(
        [
          '<rect x="22" y="44" width="110" height="84" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="168" y="44" width="110" height="84" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="77" y="84" font-size="15" text-anchor="middle">z-plane</text>',
          '<text x="223" y="84" font-size="15" text-anchor="middle">w-plane</text>',
          '<line x1="132" y1="86" x2="168" y2="86" stroke="#333" stroke-width="2.5"/>',
          '<polygon points="168,86 159,81 159,91" fill="#333"/>',
          '<line x1="168" y1="104" x2="132" y2="104" stroke="#333" stroke-width="2.5"/>',
          '<polygon points="132,104 141,99 141,109" fill="#333"/>',
          '<text x="150" y="76" font-size="12" text-anchor="middle">phi</text>',
          '<text x="150" y="120" font-size="12" text-anchor="middle">phi^-1</text>',
        ].join(''),
      ),
    },
    {
      title: 'Transport the disk harmonic function v(w) = Re w',
      formula:
        '$$U(x,y)=\\operatorname{Re}\\phi(z)=\\operatorname{Re}\\!\\left(\\frac{z-i}{z+i}\\right)=\\frac{x^2+y^2-1}{x^2+(y+1)^2}$$',
      body: 'Because $\\phi$ is analytic on $H$, the real part of $\\phi(z)$ is harmonic there. At the sample point $(x,y)=(0,2)$ we get $$U(0,2)=\\frac{0+4-1}{0+9}=\\frac13,$$ so the transported solution gives a concrete interior value. At $(2,0)$ the same formula becomes $\\frac{4-1}{4+1}=\\frac35$, matching the boundary data.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 132 Q 82 120 124 92 T 208 64 T 270 54',
            stroke: '#1d4ed8',
            label: 'boundary values',
            labelPos: [196, 48],
          },
        ],
        points: [
          { x: 40, y: 120, label: 'x=0 -> -1', fill: '#dc2626' },
          { x: 180, y: 92, label: 'x=2 -> 3/5', fill: '#16a34a' },
        ],
        xLabel: 'x',
        yLabel: 'U(x,0)',
      }),
    },
    {
      title: 'Verify the boundary condition and the Dirichlet solution',
      formula:
        '$$U(x,0)=\\frac{x^2-1}{x^2+1},\\qquad \\Delta U=0\\text{ on }y>0$$',
      body: 'Setting $y=0$ in the interior formula gives exactly the required boundary data. For instance, $x=0$ yields $U(0,0)=-1$ and $x=1$ yields $U(1,0)=0$. Since $U$ is the real part of the analytic function $\\phi(z)$, it satisfies Laplace\'s equation automatically throughout the upper half-plane.',
      takeaway: 'A conformal map converts the half-plane Dirichlet problem into an easier disk problem, then pulls the harmonic answer back.',
    },
  ],
  solution:
    'For $z=x+iy$ with $y>0$, $$\\left|\\phi(z)\\right|^2=\\frac{|z-i|^2}{|z+i|^2}=\\frac{x^2+(y-1)^2}{x^2+(y+1)^2}<1,$$ because the denominator exceeds the numerator by $4y>0$. Hence $$\\phi(z)=\\frac{z-i}{z+i}$$ maps the upper half-plane conformally onto the unit disk. On the boundary $y=0$, $$\\left|\\phi(x)\\right|=1,$$ so the real axis maps to the unit circle, and $$\\phi(i)=0.$$ Solving for the inverse gives $$\\phi^{-1}(w)=i\\,\\frac{1+w}{1-w}.$$ To solve Laplace\'s equation, use the disk harmonic function $$v(w)=\\operatorname{Re}w.$$ Pulling it back gives $$U(x,y)=v(\\phi(z))=\\operatorname{Re}\\!\\left(\\frac{z-i}{z+i}\\right)=\\frac{x^2+y^2-1}{x^2+(y+1)^2}.$$ On the boundary, $$U(x,0)=\\frac{x^2-1}{x^2+1},$$ so this is the required harmonic solution on $y>0$.',
  verifiedPatterns: [
    'x^2+(y-1)^2',
    'x^2+(y+1)^2',
    'i\\,\\frac{1+w}{1-w}',
    '\\frac{x^2+y^2-1}{x^2+(y+1)^2}',
    '\\frac{x^2-1}{x^2+1}',
  ],
  minDiagramSteps: 4,
};
