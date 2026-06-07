import { matrixDisplay, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q10: MathQuestionDef = {
  id: 'q10',
  number: 10,
  topic: 'Singular value decomposition and least squares',
  question:
    'For the matrix $$B=\\begin{bmatrix}3&0\\\\4&0\\\\0&5\\end{bmatrix},$$ find an SVD of this matrix, compute the pseudoinverse $B^+$, and solve the least-squares problem for $$b=(1,1,1)^T.$$',
  steps: [
    {
      title: 'Start from the columns of B',
      body: 'The columns are $c_1=(3,4,0)^T$ and $c_2=(0,0,5)^T$. Their lengths are $\\lVert c_1\\rVert=\\sqrt{3^2+4^2}=5$ and $\\lVert c_2\\rVert=5$, and $c_1\\cdot c_2=0$, so the columns are already orthogonal.',
      diagram: matrixDisplay(
        [
          ['3', '0'],
          ['4', '0'],
          ['0', '5'],
        ],
        'Matrix B',
      ),
    },
    {
      title: 'Compute B^T B and the singular values',
      formula:
        '$$B^TB=\\begin{bmatrix}3&4&0\\\\0&0&5\\end{bmatrix}\\begin{bmatrix}3&0\\\\4&0\\\\0&5\\end{bmatrix}=\\begin{bmatrix}25&0\\\\0&25\\end{bmatrix}$$\n$$\\sigma_1=\\sigma_2=\\sqrt{25}=5$$',
      body: 'The $(1,1)$ entry is $3^2+4^2+0^2=25$, the $(2,2)$ entry is $5^2=25$, and the cross term is $3\\cdot 0+4\\cdot 0+0\\cdot 5=0$. Since the eigenvalues of $B^TB$ are $25$ and $25$, both singular values are $5$.',
      diagram: matrixDisplay(
        [
          ['25', '0'],
          ['0', '25'],
        ],
        'B^T B',
      ),
    },
    {
      title: 'Choose V and the left singular vectors',
      formula:
        '$$V=I_2,\\qquad u_1=\\frac{1}{5}(3,4,0)^T=\\left(\\frac35,\\frac45,0\\right)^T,\\qquad u_2=\\frac{1}{5}(0,0,5)^T=(0,0,1)^T$$\n$$u_3=\\left(-\\frac45,\\frac35,0\\right)^T$$',
      body: 'Because $B^TB=25I_2$, we can take the right singular vectors to be the standard basis, so $V=I_2$. Dividing each nonzero column by $5$ gives $u_1$ and $u_2$, and $u_3=(-4/5,3/5,0)$ completes an orthonormal basis since $(3/5)^2+(4/5)^2=1$ and $u_1\\cdot u_3=-12/25+12/25=0$.',
      diagram: wrapMathSvg(
        [
          '<line x1="54" y1="126" x2="114" y2="46" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="114,46 105,49 111,57" fill="#1d4ed8"/>',
          '<line x1="54" y1="126" x2="54" y2="46" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="54,46 49,55 59,55" fill="#16a34a"/>',
          '<line x1="54" y1="126" x2="130" y2="104" stroke="#dc2626" stroke-width="2.5"/>',
          '<polygon points="130,104 121,101 123,111" fill="#dc2626"/>',
          '<text x="118" y="40" font-size="12">u1</text>',
          '<text x="66" y="40" font-size="12">u2</text>',
          '<text x="138" y="106" font-size="12">u3</text>',
        ].join(''),
      ),
    },
    {
      title: 'Write the SVD explicitly',
      formula:
        '$$U=\\begin{bmatrix}\\frac35&0&-\\frac45\\\\[2pt]\\frac45&0&\\frac35\\\\[2pt]0&1&0\\end{bmatrix},\\qquad \\Sigma=\\begin{bmatrix}5&0\\\\0&5\\\\0&0\\end{bmatrix},\\qquad V=I_2$$\n$$B=U\\Sigma V^T$$',
      body: 'Multiplying the first column of $U$ by the first singular value gives $5u_1=(3,4,0)^T$, and multiplying the second column by the second singular value gives $5u_2=(0,0,5)^T$. Since $V^T=I_2$, the product $U\\Sigma V^T$ reproduces $B$ exactly.',
      diagram: matrixDisplay(
        [
          ['5', '0'],
          ['0', '5'],
          ['0', '0'],
        ],
        'Sigma',
      ),
    },
    {
      title: 'Compute the pseudoinverse',
      formula:
        '$$B^+=(B^TB)^{-1}B^T=\\frac1{25}\\begin{bmatrix}3&4&0\\\\0&0&5\\end{bmatrix}=\\begin{bmatrix}\\frac3{25}&\\frac4{25}&0\\\\0&0&\\frac15\\end{bmatrix}$$',
      body: 'Because $B$ has full column rank, the normal formula applies. Multiplying $1/25$ through the rows gives $3/25$, $4/25$, and $5/25=1/5$, so $$B^+=\\begin{bmatrix}3/25&4/25&0\\\\0&0&1/5\\end{bmatrix}.$$',
      diagram: matrixDisplay(
        [
          ['3/25', '4/25', '0'],
          ['0', '0', '1/5'],
        ],
        'B^+',
      ),
    },
    {
      title: 'Solve the least-squares problem for b = (1,1,1)^T',
      formula:
        '$$\\hat x=B^+b=\\begin{bmatrix}\\frac3{25}&\\frac4{25}&0\\\\0&0&\\frac15\\end{bmatrix}\\begin{bmatrix}1\\\\1\\\\1\\end{bmatrix}=\\begin{bmatrix}\\frac7{25}\\\\[2pt]\\frac15\\end{bmatrix}$$\n$$B\\hat x=\\left(\\frac{21}{25},\\frac{28}{25},1\\right)^T,\\qquad r=b-B\\hat x=\\left(\\frac4{25},-\\frac3{25},0\\right)^T$$',
      body: 'The least-squares solution is $\\hat x=(7/25,1/5)^T$. The residual is $r=(4/25,-3/25,0)^T$, and it is orthogonal to both columns because $r\\cdot c_1=(4/25)3+(-3/25)4=0$ and $r\\cdot c_2=0$.',
      diagram: wrapMathSvg(
        [
          '<line x1="44" y1="108" x2="148" y2="74" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="148,74 139,72 142,81" fill="#1d4ed8"/>',
          '<line x1="148" y1="74" x2="178" y2="52" stroke="#dc2626" stroke-width="2"/>',
          '<polygon points="178,52 169,53 173,61" fill="#dc2626"/>',
          '<text x="34" y="116" font-size="12">0</text>',
          '<text x="116" y="66" font-size="12">proj b</text>',
          '<text x="194" y="50" font-size="12">r</text>',
          '<text x="92" y="128" font-size="12">column space</text>',
        ].join(''),
      ),
      takeaway: 'When the columns are orthogonal, the SVD and pseudoinverse become especially simple.',
    },
  ],
  solution:
    'Since $$B^TB=\\begin{bmatrix}25&0\\\\0&25\\end{bmatrix},$$ the singular values are $$\\sigma_1=\\sigma_2=5.$$ A convenient SVD is $$U=\\begin{bmatrix}\\frac35&0&-\\frac45\\\\[2pt]\\frac45&0&\\frac35\\\\[2pt]0&1&0\\end{bmatrix},\\qquad \\Sigma=\\begin{bmatrix}5&0\\\\0&5\\\\0&0\\end{bmatrix},\\qquad V=I_2,$$ so $$B=U\\Sigma V^T.$$ The pseudoinverse is $$B^+=\\begin{bmatrix}\\frac3{25}&\\frac4{25}&0\\\\0&0&\\frac15\\end{bmatrix}.$$ Therefore for $$b=(1,1,1)^T$$ the least-squares solution is $$\\hat x=B^+b=\\left(\\frac7{25},\\frac15\\right)^T,$$ with fitted vector $$B\\hat x=\\left(\\frac{21}{25},\\frac{28}{25},1\\right)^T$$ and residual $$r=\\left(\\frac4{25},-\\frac3{25},0\\right)^T.$$',
  verifiedPatterns: ['\\sigma_1=\\sigma_2=5', '\\frac7{25}', '\\frac15', '\\frac3{25}', '\\frac4{25}'],
  minDiagramSteps: 4,
};
