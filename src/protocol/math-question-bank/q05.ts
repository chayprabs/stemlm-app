import { axesGraph, matrixDisplay, shadedRegion } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q05: MathQuestionDef = {
  id: 'q05',
  number: 5,
  topic: 'Polar, cylindrical, and triple integrals',
  question:
    'Evaluate (a) \\iint_R (x^2+y^2)\\,dA over the polar region r=2\\cos\\theta, and (b) \\iiint_V z\\,dV where V lies between z=4-x^2-y^2 and z=x^2+y^2.',
  steps: [
    {
      title: 'Interpret the polar curve for part (a)',
      formula:
        '$$r=2\\cos\\theta \\quad\\Longleftrightarrow\\quad x^2+y^2=2x \\quad\\Longleftrightarrow\\quad (x-1)^2+y^2=1$$',
      body: 'So R is the disk centered at (1,0) with radius 1. The polar bounds are -pi/2 <= theta <= pi/2 and 0 <= r <= 2 cos theta. At theta = 0, the boundary gives r = 2, so the circle reaches x = 2 on the positive x-axis.',
      diagram: shadedRegion(
        ['M 150 140 A 50 50 0 1 1 149.9 140 Z'],
        ['R: (x-1)^2 + y^2 <= 1'],
      ),
    },
    {
      title: 'Convert the integrand and area element to polar form',
      formula:
        '$$x^2+y^2=r^2, \\qquad dA=r\\,dr\\,d\\theta, \\qquad \\iint_R (x^2+y^2)\\,dA=\\int_{-\\pi/2}^{\\pi/2}\\int_0^{2\\cos\\theta} r^3\\,dr\\,d\\theta$$',
      body: 'The integrand contributes r^2 and the Jacobian contributes another factor r. For example, when theta = 0 and r = 1, x^2 + y^2 = 1^2 = 1 and the polar integrand becomes r^3 = 1.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 150 140 A 50 50 0 1 1 149.9 140',
            stroke: '#1d4ed8',
            label: 'r = 2 cos(theta)',
            labelPos: [176, 66],
          },
          {
            d: 'M 40 140 L 150 140',
            stroke: '#dc2626',
            label: 'theta = 0',
            labelPos: [118, 132],
          },
        ],
        points: [{ x: 150, y: 140, label: '(2,0)', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Evaluate the double integral in part (a)',
      formula:
        '$$\\int_{-\\pi/2}^{\\pi/2}\\int_0^{2\\cos\\theta} r^3\\,dr\\,d\\theta = \\int_{-\\pi/2}^{\\pi/2} \\frac{(2\\cos\\theta)^4}{4}\\,d\\theta = 4\\int_{-\\pi/2}^{\\pi/2}\\cos^4\\theta\\,d\\theta = 4\\cdot \\frac{3\\pi}{8} = \\frac{3\\pi}{2}$$',
      body: 'The inner integral gives r^4/4. Plugging in r = 2 cos theta yields 16 cos^4 theta / 4 = 4 cos^4 theta, and the standard even-power integral gives 3pi/8 on the symmetric interval.',
    },
    {
      title: 'Find the intersection curve for part (b)',
      formula:
        '$$4-x^2-y^2=x^2+y^2 \\quad\\Rightarrow\\quad 4=2(x^2+y^2) \\quad\\Rightarrow\\quad r^2=2$$',
      body: 'The two paraboloids meet above the circle x^2 + y^2 = 2, so the cylindrical bounds are 0 <= r <= sqrt(2) and 0 <= theta <= 2pi. At r = 1, the lower surface is z = 1 and the upper surface is z = 3.',
      diagram: shadedRegion(
        ['M 150 90 A 45 45 0 1 1 149.9 90 Z'],
        ['projection: x^2 + y^2 <= 2'],
      ),
    },
    {
      title: 'Set up the triple integral with cylindrical bounds',
      formula:
        '$$\\iiint_V z\\,dV = \\int_0^{2\\pi}\\int_0^{\\sqrt{2}}\\int_{r^2}^{4-r^2} z\\,r\\,dz\\,dr\\,d\\theta$$',
      body: 'The lower surface is z = r^2 and the upper surface is z = 4 - r^2. The extra factor r is the cylindrical Jacobian. For r = 1, the z-interval is from 1 to 3, so the inner contribution is \\int_1^3 z dz = (9-1)/2 = 4 before multiplying by r.',
      diagram: matrixDisplay(
        [
          ['variable', 'lower bound', 'upper bound'],
          ['theta', '0', '2pi'],
          ['r', '0', 'sqrt(2)'],
          ['z', 'r^2', '4-r^2'],
        ],
        'Cylindrical bounds for V',
      ),
    },
    {
      title: 'Carry out the z- and r-integrations for part (b)',
      formula:
        '$$\\int_0^{2\\pi}\\int_0^{\\sqrt{2}}\\left[\\frac{z^2}{2}\\right]_{z=r^2}^{z=4-r^2} r\\,dr\\,d\\theta = \\int_0^{2\\pi}\\int_0^{\\sqrt{2}} (8-4r^2)r\\,dr\\,d\\theta = 2\\pi\\left[4r^2-r^4\\right]_0^{\\sqrt{2}} = 8\\pi$$',
      body: 'Expanding the inner difference gives ((4-r^2)^2 - r^4)/2 = (16 - 8r^2)/2 = 8 - 4r^2. Then \\int_0^{sqrt(2)} (8r - 4r^3)dr = [4r^2 - r^4]_0^{sqrt(2)} = 8 - 4 = 4, and multiplying by 2pi gives 8pi.',
      takeaway: 'Part (a) is 3pi/2 and part (b) is 8pi after converting the geometry into clean polar and cylindrical bounds.',
    },
  ],
  solution:
    'For part (a), the region r = 2 cos(theta) is the disk (x-1)^2 + y^2 <= 1, so \\iint_R (x^2+y^2) dA = \\int_{-pi/2}^{pi/2}\\int_0^{2 cos(theta)} r^3 dr dtheta = 3pi/2. For part (b), the paraboloids intersect where r^2 = 2, so \\iiint_V z dV = \\int_0^{2pi}\\int_0^{sqrt(2)}\\int_{r^2}^{4-r^2} z r dz dr dtheta = 8pi.',
  verifiedPatterns: ['3pi/2', 'r^2 = 2', '8pi', 'r^3', 'z r dz'],
  minDiagramSteps: 4,
};
