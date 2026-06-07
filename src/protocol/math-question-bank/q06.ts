import { axesGraph, matrixDisplay, shadedRegion } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q06: MathQuestionDef = {
  id: 'q06',
  number: 6,
  topic: 'Green and Stokes theorems',
  question:
    'Use (a) Green\'s theorem to evaluate \\oint_C (y^2\\,dx+x^2\\,dy) where C is the counterclockwise triangle with vertices (0,0), (1,0), (0,1), and (b) Stokes\' theorem for F=(xz,yz,xy) on the paraboloid z=1-x^2-y^2 above z=0 with upward orientation.',
  steps: [
    {
      title: 'Sketch the triangular region for Green\'s theorem',
      formula:
        '$$D=\\{(x,y): 0 \\le x \\le 1, \\ 0 \\le y \\le 1-x\\}$$',
      body: 'The boundary is the right triangle with area 1/2 and counterclockwise orientation. At x = 0.25, the top edge is y = 1 - 0.25 = 0.75.',
      diagram: shadedRegion(
        ['M 40 140 L 180 140 L 40 30 Z'],
        ['triangle: x >= 0, y >= 0, x + y <= 1'],
      ),
    },
    {
      title: 'Compute the Green\'s theorem integrand',
      formula:
        '$$P=y^2, \\quad Q=x^2, \\quad \\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}=2x-2y$$',
      body: 'Differentiate each component once: d/dx[x^2] = 2x and d/dy[y^2] = 2y. For example, at (0.4,0.1) the density is 2(0.4) - 2(0.1) = 0.8 - 0.2 = 0.6.',
      diagram: matrixDisplay(
        [
          ['quantity', 'value'],
          ['P', 'y^2'],
          ['Q', 'x^2'],
          ['Q_x - P_y', '2x-2y'],
        ],
        'Green data',
      ),
    },
    {
      title: 'Integrate over the triangle',
      formula:
        '$$\\oint_C (y^2\\,dx+x^2\\,dy)=\\iint_D (2x-2y)\\,dA=\\int_0^1\\int_0^{1-x} (2x-2y)\\,dy\\,dx=0$$',
      body: 'The inner integral is 2[x y - y^2/2]_0^{1-x} = 2[x(1-x) - (1-x)^2/2] = 4x - 3x^2 - 1. Then \\int_0^1 (4x - 3x^2 - 1)dx = [2x^2 - x^3 - x]_0^1 = 2 - 1 - 1 = 0.',
    },
    {
      title: 'Identify the boundary for the Stokes problem',
      formula:
        '$$z=1-x^2-y^2, \\ z=0 \\quad\\Rightarrow\\quad x^2+y^2=1$$',
      body: 'The paraboloid meets the plane z = 0 along the unit circle. With upward orientation on the surface, the induced boundary orientation is counterclockwise when viewed from above.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 80 140 A 60 60 0 1 1 79.9 140',
            stroke: '#1d4ed8',
            label: 'x^2 + y^2 = 1',
            labelPos: [160, 58],
          },
          {
            d: 'M 40 140 Q 100 45 160 140',
            stroke: '#16a34a',
            label: 'z = 1 - r^2',
            labelPos: [110, 46],
          },
        ],
        points: [{ x: 140, y: 140, label: 'boundary', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'z',
      }),
    },
    {
      title: 'Compute the curl of F',
      formula:
        '$$\\nabla\\times F=\\left(\\frac{\\partial (xy)}{\\partial y}-\\frac{\\partial (yz)}{\\partial z}, \\frac{\\partial (xz)}{\\partial z}-\\frac{\\partial (xy)}{\\partial x}, \\frac{\\partial (yz)}{\\partial x}-\\frac{\\partial (xz)}{\\partial y}\\right)=(x-y,x-y,0)$$',
      body: 'The first component is x - y, the second is x - y, and the third is 0 - 0 = 0. At (1,0,0), this gives curl F = (1,1,0).',
      diagram: matrixDisplay(
        [
          ['component', 'value'],
          ['i', 'x-y'],
          ['j', 'x-y'],
          ['k', '0'],
        ],
        'Curl of F',
      ),
    },
    {
      title: 'Apply Stokes theorem on the flat disk with the same boundary',
      formula:
        '$$\\oint_{\\partial S} F\\cdot dr = \\iint_{x^2+y^2\\le 1} (\\nabla\\times F)\\cdot \\mathbf{k}\\,dA = \\iint_{x^2+y^2\\le 1} 0\\,dA = 0$$',
      body: 'Stokes lets us replace the paraboloid by the simpler flat disk z = 0 because both surfaces have the same boundary circle. Since the k-component of curl F is 0 everywhere, the circulation is 0.',
      diagram: shadedRegion(
        ['M 150 90 A 55 55 0 1 1 149.9 90 Z'],
        ['flat disk used in Stokes'],
      ),
      takeaway: 'Green turns the line integral into a planar double integral, and Stokes turns the circulation into a curl flux over any convenient spanning surface.',
    },
  ],
  solution:
    'For part (a), Green\'s theorem gives \\oint_C (y^2 dx + x^2 dy) = \\iint_D (2x-2y) dA = 0, so part (a) = 0. For part (b), \\nabla\\times F = (x-y, x-y, 0), and Stokes theorem lets us use the flat unit disk z = 0. Because the k-component of the curl is 0, the flux integral is 0, so part (b) = 0.',
  verifiedPatterns: ['2x-2y', 'part (a) = 0', '(x-y, x-y, 0)', 'part (b) = 0'],
  minDiagramSteps: 5,
};
