import { fbdHangingMass, fbdInclineBlock, inclinePulley } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q01: PhysicsQuestionDef = {
  id: 'q01',
  number: 1,
  topic: 'Newton Laws Constrained Motion',
  question:
    'A block m1=5 kg on a frictionless incline at θ=30° is connected via a massless string over a frictionless pulley to a hanging mass m2=3 kg. (a) Draw free body diagrams. (b) Write Newton second law for each mass. (c) Find acceleration and tension. (d) With μk=0.2, redo (b) and (c).',
  steps: [
    {
      title: 'Draw the incline-pulley setup',
      body: 'Mass $m_1=5\\,\\text{kg}$ sits on a $30°$ incline; $m_2=3\\,\\text{kg}$ hangs vertically. A massless string over a frictionless pulley connects them.',
      diagram: inclinePulley({ thetaDeg: 30, labelM1: 'm1=5kg', labelM2: 'm2=3kg' }),
    },
    {
      title: 'Draw free-body diagrams for both masses',
      body: 'On $m_1$: weight $m_1 g$ splits into components parallel and perpendicular to the incline; normal $N=m_1 g\\cos\\theta$; tension $T$ acts up the incline. On $m_2$: tension $T$ upward and weight $m_2 g$ downward.',
      diagram: fbdInclineBlock({
        title: 'm1 on incline',
        showWeight: true,
        showNormal: true,
        showTension: true,
        showParallel: true,
      }),
    },
    {
      title: 'Draw the hanging mass free-body diagram',
      body: 'For $m_2$, choose downward as positive. The only forces are $m_2 g=3 \\times 9.8=29.4\\,\\text{N}$ down and tension $T$ up.',
      diagram: fbdHangingMass({ label: 'm2=3kg' }),
    },
    {
      title: 'Write Newton second law (frictionless)',
      formula:
        '$$m_2 g - T = m_2 a,\\quad T - m_1 g\\sin\\theta = m_1 a \\Rightarrow a = \\frac{g(m_2 - m_1\\sin\\theta)}{m_1+m_2}$$',
      body: 'With $m_1=5\\,\\text{kg}$, $m_2=3\\,\\text{kg}$, $\\theta=30°$, $\\sin\\theta=0.5$: numerator $=9.8(3-2.5)=4.9\\,\\text{N}$ and denominator $=8\\,\\text{kg}$.',
    },
    {
      title: 'Find acceleration and tension (frictionless)',
      formula:
        '$$a=\\frac{9.8 \\times 0.5}{8}=0.6125\\,\\text{m/s}^2,\\quad T=m_2(g-a)=3(9.8-0.6125)=27.6\\,\\text{N}$$',
      body: '$a=0.613\\,\\text{m/s}^2$ ( $m_2$ accelerates downward, $m_1$ up the incline). Tension $T=27.6\\,\\text{N}$ is less than $m_2 g$ because $m_2$ accelerates downward.',
      takeaway: 'Connect equations by eliminating $T$; check that $T$ is between the two weight limits.',
    },
    {
      title: 'Add kinetic friction on the incline',
      formula:
        '$$f_k=\\mu_k m_1 g\\cos\\theta=0.2 \\times 5 \\times 9.8 \\times 0.866=8.49\\,\\text{N}$$',
      body: 'Kinetic friction opposes motion up the incline, so it points down the incline. With $\\mu_k=0.2$ and $\\cos 30°=0.866$, $f_k=8.49\\,\\text{N}$.',
      diagram: inclinePulley({ thetaDeg: 30, labelM1: 'm1', labelM2: 'm2', showFriction: true }),
    },
    {
      title: 'Newton laws with friction and solve',
      formula:
        '$$a=\\frac{g(m_2-m_1\\sin\\theta-\\mu_k m_1\\cos\\theta)}{m_1+m_2}=\\frac{9.8(3-2.5-0.866)}{8}=-0.448\\,\\text{m/s}^2$$',
      body: 'The negative sign means the assumed direction ($m_2$ down) is wrong: friction exceeds the driving imbalance. The system is in static equilibrium with $a=0$ and $T=m_2 g=29.4\\,\\text{N}$ (or moves oppositely with $|a|=0.448\\,\\text{m/s}^2$ if already sliding).',
    },
  ],
  solution:
    '**(a)** FBDs: on $m_1$ — $N$, $m_1 g\\sin\\theta$, $T$; on $m_2$ — $T$ and $m_2 g$. **(b)** $m_2 g-T=m_2 a$ and $T-m_1 g\\sin\\theta=m_1 a$. **(c)** $a=0.613\\,\\text{m/s}^2$, $T=27.6\\,\\text{N}$. **(d)** With $\\mu_k=0.2$, $f_k=8.49\\,\\text{N}$; $a=-0.448\\,\\text{m/s}^2$ so the net driving force cannot overcome friction — the system remains at rest ($a=0$, $T=29.4\\,\\text{N}$) unless already moving in the reverse direction.',
  verifiedPatterns: ['0.613', '27.6', '8.49', '-0.448', 'm_2 g-T=m_2 a'],
  minDiagramSteps: 4,
};
