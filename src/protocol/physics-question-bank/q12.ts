import { physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q12: PhysicsQuestionDef = {
  id: 'q12',
  number: 12,
  topic: 'Physics Maxwell-Boltzmann Speed Distribution',
  question:
    'Physics kinetic theory: Nitrogen molecules have mass m=4.65e-26 kg at temperature T=300 K. Using Maxwell-Boltzmann statistics, find (a) most probable speed vp, mean speed vbar, and rms speed vrms, (b) write the speed distribution, (c) fraction of molecules with v>2vp, and (d) how these speeds change if temperature doubles.',
  steps: [
    {
      title: 'Write the Maxwell-Boltzmann speed distribution',
      formula:
        '$$f(v)=4\\pi\\left(\\frac{m}{2\\pi kT}\\right)^{3/2}v^2e^{-mv^2/(2kT)},\\quad k=1.380649\\times10^{-23}\\,\\text{J/K}$$',
      body: 'With $m=4.65\\times10^{-26}\\,\\text{kg}$ and $T=300\\,\\text{K}$, the characteristic thermal scale is $\\sqrt{2kT/m}=\\sqrt{8.2839\\times10^{-21}/4.65\\times10^{-26}}=422\\,\\text{m/s}$.',
      diagram: physicsGraph({
        curves: [{ d: 'M 40 140 Q 95 45 145 65 T 280 132', label: 'f(v)', labelPos: [150, 55] }],
        annotations:
          '<line x1="170" y1="140" x2="170" y2="55" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/><text x="175" y="52" font-size="11" fill="#dc2626">2vp</text>',
        xLabel: 'v (m/s)',
        yLabel: 'f(v)',
      }),
    },
    {
      title: 'Compute vp, vbar, and vrms at 300 K',
      formula:
        '$$v_p=\\sqrt{\\frac{2kT}{m}},\\quad \\bar v=\\sqrt{\\frac{8kT}{\\pi m}},\\quad v_{\\mathrm{rms}}=\\sqrt{\\frac{3kT}{m}}$$',
      body: 'Substituting numbers: $v_p=422.1\\,\\text{m/s}$, $\\bar v=476.3\\,\\text{m/s}$, and $v_{\\mathrm{rms}}=516.9\\,\\text{m/s}$, so $v_p<\\bar v<v_{\\mathrm{rms}}$.',
    },
    {
      title: 'Fraction of molecules faster than 2vp',
      formula:
        '$$P(v>2v_p)=\\operatorname{erfc}(2)+\\frac{4}{\\sqrt{\\pi}}e^{-4}=0.0460$$',
      body: 'Using $x=v/v_p$, the tail probability is $1-F(x)$ at $x=2$: $P(v>2v_p)=0.0460=4.60\\%$, so only a small high-energy fraction exceeds twice the most probable speed.',
    },
    {
      title: 'Effect of doubling temperature to 600 K',
      formula:
        '$$v\\propto\\sqrt{T}\\Rightarrow v_2=\\sqrt{\\frac{T_2}{T_1}}\\,v_1=\\sqrt{2}\\,v_1$$',
      body: 'At $T_2=600\\,\\text{K}$ from $T_1=300\\,\\text{K}$: $v_{p,2}=\\sqrt{2}(422.1)=596.9\\,\\text{m/s}$, $\\bar v_2=\\sqrt{2}(476.3)=673.5\\,\\text{m/s}$, and $v_{\\mathrm{rms},2}=\\sqrt{2}(516.9)=731.1\\,\\text{m/s}$.',
      diagram: physicsGraph({
        curves: [
          { d: 'M 40 140 Q 95 45 145 65 T 280 132', stroke: '#1d4ed8', label: '300 K', labelPos: [100, 42] },
          { d: 'M 40 140 Q 120 70 175 80 T 280 122', stroke: '#dc2626', label: '600 K', labelPos: [165, 73] },
        ],
        xLabel: 'v (m/s)',
        yLabel: 'f(v)',
      }),
      takeaway: 'Raising temperature broadens the Physics speed distribution and shifts all characteristic speeds upward by $\\sqrt{T}$.',
    },
  ],
  solution:
    '**(a)** $v_p=422.1\\,\\text{m/s}$, $\\bar v=476.3\\,\\text{m/s}$, $v_{\\mathrm{rms}}=516.9\\,\\text{m/s}$. **(b)** $f(v)=4\\pi(m/2\\pi kT)^{3/2}v^2e^{-mv^2/(2kT)}$. **(c)** $P(v>2v_p)=0.0460\\approx4.60\\%$. **(d)** At doubled temperature, each characteristic speed multiplies by $\\sqrt{2}$: $596.9$, $673.5$, $731.1\\,\\text{m/s}$.',
  verifiedPatterns: ['422.1', '476.3', '516.9', '0.0460', '731.1'],
  minDiagramSteps: 2,
};
