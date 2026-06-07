import { axesGraph, matrixDisplay, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q35: MathQuestionDef = {
  id: 'q35',
  number: 35,
  topic: 'Runge-Kutta fourth order method',
  question:
    "Use the classical RK4 method with step size $$h=0.2$$ to approximate the solution of $$y'=y-t^2+1,\\qquad y(0)=0.5.$$ Compute the approximations at $$t=0.2$$ and $$t=0.4$$.",
  steps: [
    {
      title: 'Write the RK4 update and the time grid',
      formula:
        "$$k_1=hf(t_n,y_n),\\quad k_2=hf\\!\\left(t_n+\\frac h2,y_n+\\frac{k_1}{2}\\right),\\quad k_3=hf\\!\\left(t_n+\\frac h2,y_n+\\frac{k_2}{2}\\right),\\quad k_4=hf(t_n+h,y_n+k_3)$$\n$$y_{n+1}=y_n+\\frac{k_1+2k_2+2k_3+k_4}{6},\\qquad h=0.2$$",
      body: 'Here $f(t,y)=y-t^2+1$, with initial value $(t_0,y_0)=(0,0.5)$. We will take one RK4 step from $t=0$ to $t=0.2$, then a second step from $t=0.2$ to $t=0.4$.',
      diagram: numberLine(
        [
          { pos: 0, label: 't0 = 0', color: '#dc2626' },
          { pos: 0.2, label: 't1 = 0.2', color: '#2563eb' },
          { pos: 0.4, label: 't2 = 0.4', color: '#16a34a' },
        ],
        [0, 0.4],
      ),
    },
    {
      title: 'Compute the first RK4 stage values at t = 0',
      formula:
        "$$k_1=0.2(0.5-0^2+1)=0.3$$\n$$k_2=0.2\\left(0.5+\\frac{0.3}{2}-0.1^2+1\\right)=0.328$$\n$$k_3=0.2\\left(0.5+\\frac{0.328}{2}-0.1^2+1\\right)=0.3308$$\n$$k_4=0.2\\left(0.5+0.3308-0.2^2+1\\right)=0.35816$$",
      body: 'All four RK4 samples come from the same differential equation, and the values are $k_1=0.3$, $k_2=0.328$, $k_3=0.3308$, and $k_4=0.35816$. That increase reflects the growing right-hand side as $y$ rises across the step.',
      diagram: matrixDisplay(
        [
          ['stage', 'value'],
          ['k1', '0.300000'],
          ['k2', '0.328000'],
          ['k3', '0.330800'],
          ['k4', '0.358160'],
        ],
        'First RK4 step',
      ),
    },
    {
      title: 'Update to the approximation at t = 0.2',
      formula:
        '$$y_1=0.5+\\frac{0.3+2(0.328)+2(0.3308)+0.35816}{6}=0.829293$$',
      body: 'The weighted average of the four stage values gives the RK4 approximation at $t=0.2$. This is already very accurate because RK4 captures the local curvature much better than Euler or midpoint alone.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 128 Q 90 110 140 86 Q 190 58 240 26',
            label: 'approximate solution',
            labelPos: [166, 34],
          },
        ],
        points: [
          { x: 40, y: 128, label: '(0, 0.5)', fill: '#dc2626' },
          { x: 140, y: 86, label: '(0.2, 0.829293)', fill: '#2563eb' },
        ],
        xLabel: 't',
        yLabel: 'y',
      }),
    },
    {
      title: 'Compute the second RK4 stage values at t = 0.2',
      formula:
        '$$k_1=0.2(0.829293-0.2^2+1)=0.357859$$\n$$k_2=0.2\\left(0.829293+\\frac{0.357859}{2}-0.3^2+1\\right)=0.383645$$\n$$k_3=0.2\\left(0.829293+\\frac{0.383645}{2}-0.3^2+1\\right)=0.386223$$\n$$k_4=0.2\\left(0.829293+0.386223-0.4^2+1\\right)=0.411103$$',
      body: 'The second step repeats the same RK4 structure but starts from $(t_1,y_1)=(0.2,0.829293)$. These stage values are larger than in the first step because the solution continues to grow over this interval.',
      diagram: matrixDisplay(
        [
          ['stage', 'value'],
          ['k1', '0.357859'],
          ['k2', '0.383645'],
          ['k3', '0.386223'],
          ['k4', '0.411103'],
        ],
        'Second RK4 step',
      ),
    },
    {
      title: 'Update to the approximation at t = 0.4',
      formula:
        '$$y_2=0.829293+\\frac{0.357859+2(0.383645)+2(0.386223)+0.411103}{6}=1.214076$$',
      body: 'After the second RK4 step, the approximation at $t=0.4$ is $1.214076$. The method remains stable and accurate because the step size is modest and the vector field is smooth.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 128 Q 90 110 140 86 Q 190 58 240 26',
            label: 'approximate solution',
            labelPos: [166, 34],
          },
        ],
        points: [
          { x: 40, y: 128, label: '(0, 0.5)', fill: '#dc2626' },
          { x: 140, y: 86, label: '(0.2, 0.829293)', fill: '#2563eb' },
          { x: 240, y: 46, label: '(0.4, 1.214076)', fill: '#16a34a' },
        ],
        xLabel: 't',
        yLabel: 'y',
      }),
    },
    {
      title: 'Compare with the exact solution',
      formula:
        "$$y(t)=(t+1)^2-\\frac12 e^t$$\n$$y(0.4)=1.214088\\quad\\text{so RK4 gives }1.214076\\text{ with error about }1.14\\times 10^{-5}$$",
      body: 'The exact check gives $1.214088-1.214076=0.000012\\approx 1.2\\times 10^{-5}$, so the RK4 value is excellent. The difference appears only in the fifth decimal place.',
      takeaway: 'RK4 achieves high accuracy by blending four slope evaluations over each step rather than relying on a single local slope.',
    },
  ],
  solution:
    "For $$f(t,y)=y-t^2+1$$ with $$y(0)=0.5$$ and $$h=0.2,$$ the first RK4 step gives $$k_1=0.3,\\ k_2=0.328,\\ k_3=0.3308,\\ k_4=0.35816,$$ so $$y(0.2)=y_1\\approx 0.829293.$$ Using this as the new starting value, the second RK4 step gives $$k_1\\approx 0.357859,\\ k_2\\approx 0.383645,\\ k_3\\approx 0.386223,\\ k_4\\approx 0.411103,$$ hence $$y(0.4)=y_2\\approx 1.214076.$$ The exact solution is $$y(t)=(t+1)^2-\\frac12 e^t,$$ so $$y(0.4)\\approx 1.214088,$$ confirming that the RK4 approximation is extremely accurate.",
  verifiedPatterns: ['0.829293', '1.214076', '1.214088', 'k_1=0.3', 'y(t)=(t+1)^2-\\frac12 e^t'],
  minDiagramSteps: 5,
};
