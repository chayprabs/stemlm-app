import { numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q12: MathQuestionDef = {
  id: 'q12',
  number: 12,
  topic: 'Exact differential equations and integrating factors',
  question:
    'Solve the exact differential equation $$(2xy+y^2)\\,dx+(x^2+2xy)\\,dy=0,$$ and then find an integrating factor for $$(y^2-xy)\\,dx+x^2\\,dy=0$$ so that the second equation becomes exact and can be integrated.',
  steps: [
    {
      title: 'Check exactness of the first differential equation',
      formula:
        '$$M(x,y)=2xy+y^2,\\qquad N(x,y)=x^2+2xy$$\n$$M_y=2x+2y,\\qquad N_x=2x+2y$$',
      body: 'With $x=1$ and $y=2$, $M_y=2(1)+2(2)=6$ and $N_x=2(1)+2(2)=6$, so the two mixed derivatives agree and the equation is exact.',
      diagram: numberLine(
        [
          { pos: 0, label: 'exactness test', color: '#333' },
          { pos: 1, label: 'M_y=N_x', color: '#16a34a' },
        ],
        [0, 1],
      ),
    },
    {
      title: 'Integrate M with respect to x to build a potential',
      formula:
        '$$F_x=M=2xy+y^2\\quad\\Rightarrow\\quad F(x,y)=\\int(2xy+y^2)\\,dx=x^2y+xy^2+g(y)$$',
      body: 'Treating $y$ as a constant, $\\int 2xy\\,dx=x^2y$ and $\\int y^2\\,dx=xy^2$. With $x=1$ and $y=2$, this gives $F(1,2)=1^2\\cdot2+1\\cdot2^2+g(2)=6+g(2)$.',
      diagram: wrapMathSvg(
        [
          '<rect x="28" y="56" width="94" height="56" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="178" y="56" width="94" height="56" fill="#dcfce7" stroke="#16a34a"/>',
          '<line x1="122" y1="84" x2="178" y2="84" stroke="#333" stroke-width="2"/>',
          '<polygon points="178,84 169,79 169,89" fill="#333"/>',
          '<text x="75" y="88" font-size="12" text-anchor="middle">F_x=M</text>',
          '<text x="225" y="76" font-size="12" text-anchor="middle">F=x^2y+xy^2+g(y)</text>',
          '<text x="225" y="94" font-size="12" text-anchor="middle">integrate in x</text>',
        ].join(''),
      ),
    },
    {
      title: 'Differentiate the potential with respect to y',
      formula:
        '$$F_y=x^2+2xy+g\\\'(y)$$\n$$F_y=N=x^2+2xy\\quad\\Rightarrow\\quad g\\\'(y)=0$$',
      body: 'Substituting $x=1$ and $y=2$ gives $F_y=1+4+g\\\'(2)$, while $N(1,2)=1+4=5$. Therefore $1+4+g\\\'(2)=5$, so $g\\\'(2)=0$, and hence $g(y)$ is constant.',
      diagram: wrapMathSvg(
        [
          '<path d="M 34 112 Q 90 56 150 84 Q 210 112 266 56" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<text x="88" y="46" font-size="12">level set F=C</text>',
          '<text x="196" y="128" font-size="12">F_y matches N</text>',
          '<circle cx="150" cy="84" r="4" fill="#dc2626"/>',
        ].join(''),
      ),
    },
    {
      title: 'Write the implicit solution of the exact equation',
      formula: '$$F(x,y)=x^2y+xy^2=C$$',
      body: 'Since $g(y)$ is just a constant, it can be absorbed into $C$. At the sample point $(x,y)=(1,2)$, the constant is $C=1^2\\cdot2+1\\cdot2^2=6$.',
      diagram: wrapMathSvg(
        [
          '<rect x="44" y="48" width="212" height="76" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
          '<text x="150" y="82" font-size="18" text-anchor="middle">x^2 y + x y^2 = C</text>',
          '<text x="150" y="104" font-size="12" text-anchor="middle">implicit integral curve family</text>',
        ].join(''),
      ),
    },
    {
      title: 'Choose a power-type integrating factor for the second equation',
      formula:
        '$$M=y^2-xy,\\qquad N=x^2,\\qquad \\mu=x^h y^k$$\n$$\\frac{\\partial(\\mu M)}{\\partial y}=x^h y^k\\bigl[(k+2)y-(k+1)x\\bigr],\\qquad \\frac{\\partial(\\mu N)}{\\partial x}=(h+2)x^{h+1}y^k$$\n$$k=-2,\\qquad h=-1\\qquad\\Rightarrow\\qquad \\mu=\\frac{1}{xy^2}$$',
      body: 'Before correction, at $(x,y)=(1,2)$ we have $M_y=2(2)-1=3$ and $N_x=2$, so the equation is not exact. With $k=-2$ and $h=-1$, the integrating factor is $\\mu=1/(xy^2)$, and then $\\mu M=1/x-1/y$ and $\\mu N=x/y^2$. At $(1,2)$, these become $1/2$ and $1/4$, with matching derivatives $\\partial_y(1/x-1/y)=1/4=\\partial_x(x/y^2)$.',
      diagram: wrapMathSvg(
        [
          '<rect x="24" y="42" width="98" height="90" fill="#fee2e2" stroke="#dc2626"/>',
          '<rect x="178" y="42" width="98" height="90" fill="#dcfce7" stroke="#16a34a"/>',
          '<line x1="122" y1="86" x2="178" y2="86" stroke="#333" stroke-width="2"/>',
          '<polygon points="178,86 169,81 169,91" fill="#333"/>',
          '<text x="73" y="72" font-size="12" text-anchor="middle">not exact</text>',
          '<text x="73" y="92" font-size="12" text-anchor="middle">M_y=3, N_x=2</text>',
          '<text x="227" y="72" font-size="12" text-anchor="middle">multiply by</text>',
          '<text x="227" y="92" font-size="12" text-anchor="middle">mu=1/(x y^2)</text>',
          '<text x="227" y="112" font-size="12" text-anchor="middle">becomes exact</text>',
        ].join(''),
      ),
    },
    {
      title: 'Integrate the transformed exact equation',
      formula:
        '$$\\left(\\frac1x-\\frac1y\\right)dx+\\frac{x}{y^2}\\,dy=0$$\n$$F_x=\\frac1x-\\frac1y\\quad\\Rightarrow\\quad F=\\ln x-\\frac{x}{y}+C_0$$\n$$F_y=\\frac{x}{y^2}=N^*\\quad\\Rightarrow\\quad \\ln x-\\frac{x}{y}=C$$',
      body: 'For the transformed equation, integrating with respect to $x$ gives $\\ln x-x/y+C_0$. At $(x,y)=(1,2)$, $\\ln 1-1/2=0-1/2=-1/2$, so that point lies on the level curve $\\ln x-x/y=-1/2$.',
      diagram: wrapMathSvg(
        [
          '<line x1="38" y1="126" x2="262" y2="126" stroke="#333" stroke-width="2"/>',
          '<line x1="54" y1="146" x2="54" y2="28" stroke="#333" stroke-width="2"/>',
          '<path d="M 70 120 Q 120 98 166 84 Q 210 72 246 60" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<text x="190" y="52" font-size="12">ln x - x/y = C</text>',
          '<circle cx="116" cy="100" r="4" fill="#dc2626"/>',
          '<text x="126" y="96" font-size="12">(1,2)</text>',
        ].join(''),
      ),
      takeaway: 'Exact equations come from a potential $F$, and a well-chosen integrating factor can create that potential when exactness initially fails.',
    },
  ],
  solution:
    'For the first equation, $$M=2xy+y^2,\\qquad N=x^2+2xy,$$ and $$M_y=2x+2y=N_x,$$ so it is exact. Integrating $$F_x=M$$ gives $$F=x^2y+xy^2+g(y),$$ and comparing $$F_y=x^2+2xy+g\\\'(y)$$ with $$N=x^2+2xy$$ yields $$g\\\'(y)=0.$$ Hence the implicit solution is $$x^2y+xy^2=C.$$ For the second equation, a power integrating factor $$\\mu=x^h y^k$$ gives $$h=-1,\\qquad k=-2,$$ so $$\\mu=\\frac{1}{xy^2}.$$ Then the transformed equation is $$\\left(\\frac1x-\\frac1y\\right)dx+\\frac{x}{y^2}\\,dy=0,$$ which is exact. Integrating gives the potential $$F=\\ln x-\\frac{x}{y},$$ so the implicit solution is $$\\ln x-\\frac{x}{y}=C.$$',
  verifiedPatterns: ['x^2y+xy^2=C', '\\mu=\\frac{1}{xy^2}', '\\ln x-\\frac{x}{y}=C', 'exact'],
  minDiagramSteps: 5,
};
