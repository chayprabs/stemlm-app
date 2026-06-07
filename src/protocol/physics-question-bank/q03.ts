import { rollingSphereIncline } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q03: PhysicsQuestionDef = {
  id: 'q03',
  number: 3,
  topic: 'Rotational Dynamics Rolling',
  question:
    'A solid sphere (M, R) rolls without slipping down an incline of angle θ and height h. (a) Equations of motion. (b) Linear acceleration; compare to hollow sphere and sliding point mass. (c) Speed at bottom via energy; verify kinematics. (d) Minimum μs for rolling without slipping.',
  steps: [
    {
      title: 'Draw the rolling setup and forces',
      body: 'A solid sphere of mass $M$ and radius $R$ rolls down incline angle $\\theta$. Forces at CM: $Mg\\sin\\theta$ down the incline, friction $f$ up the incline (provides torque for rotation).',
      diagram: rollingSphereIncline({ label: 'solid', thetaDeg: 30 }),
    },
    {
      title: 'Write translation and rotation equations',
      formula:
        '$$Mg\\sin\\theta - f = Ma,\\quad fR = I\\alpha,\\quad a=\\alpha R\\ \\text{(rolling)}$$',
      body: 'Newton law for translation along the incline plus torque $\\tau=fR=I\\alpha$. Rolling without slipping links $a$ and $\\alpha$.',
    },
    {
      title: 'Solve for linear acceleration (solid sphere)',
      formula:
        '$$a=\\frac{g\\sin\\theta}{1+I/(MR^2)}=\\frac{g\\sin\\theta}{1+2/5}=\\frac{5}{7}g\\sin\\theta$$',
      body: 'For a solid sphere $I=\\tfrac{2}{5}MR^2$, so $a=\\tfrac{5}{7}g\\sin\\theta$. With $\\theta=30°$, $a=0.714\\times4.9=3.50\\,\\text{m/s}^2$.',
    },
    {
      title: 'Compare with hollow sphere and sliding mass',
      formula:
        '$$a_{\\text{hollow}}=\\tfrac{3}{5}g\\sin\\theta,\\quad a_{\\text{slide}}=g\\sin\\theta$$',
      body: 'Hollow sphere ($I=\\tfrac{2}{3}MR^2$): $a=3g\\sin\\theta/5$. Frictionless sliding point: $a=g\\sin\\theta$ (fastest). Solid sphere is intermediate: more rotational inertia slows translation.',
    },
    {
      title: 'Energy method for speed at bottom',
      formula:
        '$$Mgh=\\tfrac{1}{2}Mv^2+\\tfrac{1}{2}I\\omega^2=\\tfrac{1}{2}Mv^2\\left(1+\\frac{2}{5}\\right)\\Rightarrow v=\\sqrt{\\frac{10}{7}gh}$$',
      body: 'With $h=2\\,\\text{m}$: $v=\\sqrt{10\\times9.8\\times2/7}=5.29\\,\\text{m/s}$. Kinematics check: $v^2=2ah=2\\times(5g\\sin\\theta/7)\\times(h/\\sin\\theta)=10gh/7$ — consistent.',
    },
    {
      title: 'Minimum static friction coefficient',
      formula: '$$f=\\frac{2}{7}Mg\\sin\\theta\\le \\mu_s Mg\\cos\\theta\\Rightarrow \\mu_s\\ge\\frac{2}{7}\\tan\\theta$$',
      body: 'For $\\theta=30°$: $\\mu_{s,\\min}=\\tfrac{2}{7}\\tan30°=0.165$. Rolling without slipping requires sufficient static friction to provide the needed torque.',
      takeaway: 'Rolling constraints couple translation and rotation; energy and Newton methods agree.',
    },
  ],
  solution:
    '**(a)** $Mg\\sin\\theta-f=Ma$, $fR=I\\alpha$, $a=\\alpha R$. **(b)** Solid: $a=\\tfrac{5}{7}g\\sin\\theta$; hollow: $\\tfrac{3}{5}g\\sin\\theta$; slide: $g\\sin\\theta$. **(c)** $v=\\sqrt{10gh/7}$. **(d)** $\\mu_{s,\\min}=\\tfrac{2}{7}\\tan\\theta$.',
  verifiedPatterns: ['\\frac{5}{7}g\\sin\\theta', '\\sqrt{\\frac{10}{7}gh}', '\\frac{2}{7}\\tan\\theta'],
  minDiagramSteps: 1,
};
