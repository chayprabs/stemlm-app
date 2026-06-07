import { axesGraph, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q18: MathQuestionDef = {
  id: 'q18',
  number: 18,
  topic: 'Analyticity and harmonic conjugates',
  question:
    'Discuss the analyticity of $$f(z)=z^2\\bar z,$$ and find a harmonic conjugate for $$u(x,y)=x^3-3xy^2+2x.$$',
  steps: [
    {
      title: 'Expand z^2 zbar into real and imaginary parts',
      formula:
        '$$f(z)=z^2\\bar z=(x+iy)^2(x-iy)=(x^3+xy^2)+i(x^2y+y^3)$$\n$$u(x,y)=x^3+xy^2,\\qquad v(x,y)=x^2y+y^3$$',
      body: 'At $(x,y)=(1,1)$ this gives $u=1+1=2$ and $v=1+1=2$, so $f(1+i)=2+2i$. The factorization $z^2\\bar z=z|z|^2$ also shows the dependence on $\\bar z$.',
      diagram: wrapMathSvg(
        [
          '<line x1="36" y1="96" x2="268" y2="96" stroke="#333" stroke-width="2"/>',
          '<line x1="72" y1="152" x2="72" y2="26" stroke="#333" stroke-width="2"/>',
          '<circle cx="152" cy="56" r="4" fill="#dc2626"/>',
          '<text x="162" y="52" font-size="12">1+i</text>',
          '<text x="246" y="112" font-size="12">Re z</text>',
          '<text x="48" y="36" font-size="12">Im z</text>',
        ].join(''),
      ),
    },
    {
      title: 'Apply the Cauchy-Riemann equations away from the origin',
      formula:
        '$$u_x=3x^2+y^2,\\qquad u_y=2xy,\\qquad v_x=2xy,\\qquad v_y=x^2+3y^2$$',
      body: 'At $(x,y)=(1,1)$, we get $u_x=4$ and $v_y=4$, but also $u_y=2$ while $-v_x=-2$. The second Cauchy-Riemann equation fails, so $f$ is not analytic there. The same comparison shows both equations hold simultaneously only at $(0,0)$.',
      diagram: wrapMathSvg(
        [
          '<rect x="32" y="46" width="102" height="84" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="166" y="46" width="102" height="84" fill="#fee2e2" stroke="#dc2626"/>',
          '<text x="83" y="78" font-size="12" text-anchor="middle">u_x = v_y</text>',
          '<text x="83" y="98" font-size="12" text-anchor="middle">4 = 4</text>',
          '<text x="217" y="78" font-size="12" text-anchor="middle">u_y = -v_x</text>',
          '<text x="217" y="98" font-size="12" text-anchor="middle">2 != -2</text>',
        ].join(''),
      ),
    },
    {
      title: 'Check differentiability at the origin separately',
      formula:
        '$$f^{\\prime}(0)=\\lim_{z\\to0}\\frac{f(z)-f(0)}{z}=\\lim_{z\\to0}\\frac{z^2\\bar z}{z}=\\lim_{z\\to0}|z|^2=0$$',
      body: 'Taking $z=0.1+0.1i$ gives $|z|^2=0.1^2+0.1^2=0.02$, already very small. Hence the complex derivative exists at the origin and equals $0$, even though $f$ is not analytic on any open set.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 44 132 C 84 116 122 94 160 70 S 222 38 258 24',
            stroke: '#16a34a',
            label: '|z|^2 -> 0',
            labelPos: [202, 20],
          },
        ],
        xLabel: '|z|',
        yLabel: '|f(z)/z|',
      }),
    },
    {
      title: 'Verify that the given u is harmonic and solve the CR equations',
      formula:
        '$$u(x,y)=x^3-3xy^2+2x$$\n$$u_{xx}=6x,\\qquad u_{yy}=-6x,\\qquad u_{xx}+u_{yy}=0$$\n$$v_x=-u_y=6xy,\\qquad v_y=u_x=3x^2-3y^2+2$$',
      body: 'At $(x,y)=(1,2)$, the Laplacian is $u_{xx}+u_{yy}=6-6=0$, so $u$ is harmonic. Also $v_x=6(1)(2)=12$, and integrating $v_x$ with respect to $x$ suggests the $3x^2y$ term in the harmonic conjugate.',
      diagram: wrapMathSvg(
        [
          '<line x1="40" y1="126" x2="150" y2="64" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="150,64 141,66 145,74" fill="#1d4ed8"/>',
          '<line x1="40" y1="126" x2="196" y2="126" stroke="#dc2626" stroke-width="2.5"/>',
          '<polygon points="196,126 187,122 187,130" fill="#dc2626"/>',
          '<text x="160" y="60" font-size="12">v_x</text>',
          '<text x="204" y="130" font-size="12">v_y</text>',
        ].join(''),
      ),
    },
    {
      title: 'Integrate to obtain the harmonic conjugate and analytic function',
      formula:
        '$$v(x,y)=3x^2y-y^3+2y+C$$\n$$F(z)=u+iv=z^3+2z+iC$$',
      body: 'At $(x,y)=(1,2)$, the conjugate is $v=3(1)^2(2)-2^3+2(2)+C=6-8+4+C=2+C$. Also, with $z=1+i$, $z^3+2z=(-2+2i)+(2+2i)=4i$, which matches $u+iv=0+4i$ when $C=0$.',
      diagram: wrapMathSvg(
        [
          '<rect x="34" y="50" width="232" height="78" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
          '<text x="150" y="82" font-size="16" text-anchor="middle">F(z)=z^3+2z+iC</text>',
          '<text x="150" y="106" font-size="12" text-anchor="middle">analytic primitive of u+iv</text>',
        ].join(''),
      ),
      takeaway: 'The function $z^2\\bar z$ is differentiable only at the origin and analytic nowhere, while the harmonic polynomial $x^3-3xy^2+2x$ fits into the analytic function $z^3+2z+iC$.',
    },
  ],
  solution:
    'Writing $$f(z)=z^2\\bar z=(x+iy)^2(x-iy)$$ gives $$f(z)=(x^3+xy^2)+i(x^2y+y^3).$$ The Cauchy-Riemann equations fail except at the origin, so $f$ is analytic nowhere. However, $$f^{\\prime}(0)=\\lim_{z\\to0}\\frac{z^2\\bar z}{z}=\\lim_{z\\to0}|z|^2=0.$$ Thus $f^{\\prime}(0)=0$, and the function is differentiable only at z=0. For $$u(x,y)=x^3-3xy^2+2x,$$ we have $$u_{xx}+u_{yy}=6x-6x=0,$$ so $u$ is harmonic. Solving the Cauchy-Riemann equations gives the harmonic conjugate $$v=3x^2y-y^3+2y+C.$$ Therefore the associated analytic function is $$F(z)=u+iv=z^3+2z+iC.$$',
  verifiedPatterns: ['analytic nowhere', 'differentiable only at z=0', 'f^{\\prime}(0)=0', 'v=3x^2y-y^3+2y+C', 'z^3+2z+iC'],
  minDiagramSteps: 5,
};
