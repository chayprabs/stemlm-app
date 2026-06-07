import { physicsGraph, sphericalShell } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q13: PhysicsQuestionDef = {
  id: 'q13',
  number: 13,
  topic: 'Physics Electrostatics Charged Spherical Shell',
  question:
    'Physics electric field and energy: A nonconducting spherical shell has uniform volume charge density rho for a<r<b (inner radius a, outer radius b). (a) Find E(r) in regions r<a, a<r<b, and r>b. (b) Find potential V(r) with V(infinity)=0. (c) Compute electrostatic energy stored. (d) Verify numerically that field energy equals (1/2) integral rho V dV.',
  steps: [
    {
      title: 'Draw the charged spherical shell regions',
      body: 'Charge fills only the shell thickness between radii $a$ and $b$. Region $r<a$ is an empty cavity; region $a<r<b$ contains uniform charge density $\\rho$; region $r>b$ sees the total enclosed charge.',
      diagram: sphericalShell('a', 'b'),
    },
    {
      title: 'Use Gauss law for piecewise electric field',
      formula:
        '$$E(r)=\\begin{cases}0,&r<a\\\\[2mm]\\dfrac{\\rho(r^3-a^3)}{3\\varepsilon_0 r^2},&a<r<b\\\\[2mm]\\dfrac{\\rho(b^3-a^3)}{3\\varepsilon_0 r^2},&r>b\\end{cases}$$',
      body: 'Numeric check with $\\rho=2.0\\times10^{-6}\\,\\text{C/m}^3$, $a=0.05\\,\\text{m}$, $b=0.10\\,\\text{m}$: $E(0.04)=0$, $E(0.075)=3.97\\times10^3\\,\\text{V/m}$, and $E(0.20)=1.65\\times10^3\\,\\text{V/m}$.',
    },
    {
      title: 'Compute potential in all three radial regions',
      formula:
        '$$V(r)=\\begin{cases}\\dfrac{\\rho(b^2-a^2)}{2\\varepsilon_0},&r<a\\\\[2mm]\\dfrac{\\rho}{3\\varepsilon_0}\\left[\\dfrac{3b^2-r^2}{2}-\\dfrac{a^3}{r}\\right],&a\\le r\\le b\\\\[2mm]\\dfrac{\\rho(b^3-a^3)}{3\\varepsilon_0 r},&r\\ge b\\end{cases}$$',
      body: 'Using the same numbers: $V(0.04)=847\\,\\text{V}$ (constant cavity value), $V(0.075)=792\\,\\text{V}$, and $V(0.20)=329\\,\\text{V}$ with $V(\\infty)=0$.',
    },
    {
      title: 'Energy from electric field integration',
      formula:
        '$$U=\\frac{\\varepsilon_0}{2}\\int E^2\\,d\\tau=\\frac{2\\pi\\rho^2}{9\\varepsilon_0}\\left[\\frac{b^5}{5}-a^3b^2-\\frac{a^6}{b}+\\frac{9a^5}{5}+\\frac{(b^3-a^3)^2}{b}\\right]$$',
      body: 'Substitute $\\rho=2.0\\times10^{-6}$, $a=0.05$, $b=0.10$ (SI): bracket $=8.8125\\times10^{-6}$ and prefactor $=0.315$, so $U=0.315\\times8.8125\\times10^{-6}=2.78\\times10^{-6}\\,\\text{J}$.',
    },
    {
      title: 'Verify with the rho-V volume integral',
      formula:
        '$$U=\\frac{1}{2}\\int\\rho V\\,d\\tau=\\frac{2\\pi\\rho^2}{3\\varepsilon_0}\\left(\\frac{2b^5}{5}-a^3b^2+\\frac{3a^5}{5}\\right)$$',
      body: 'With the same numeric values, $U=2.78\\times10^{-6}\\,\\text{J}$ again, so the Physics identity $\\frac{\\varepsilon_0}{2}\\int E^2 d\\tau=\\frac{1}{2}\\int\\rho V d\\tau$ is verified.',
      diagram: physicsGraph({
        annotations:
          '<rect x="95" y="70" width="35" height="50" fill="#60a5fa"/><rect x="175" y="70" width="35" height="50" fill="#34d399"/><text x="78" y="135" font-size="11">field integral</text><text x="164" y="135" font-size="11">rhoV integral</text><text x="94" y="62" font-size="11">2.78e-6 J</text><text x="174" y="62" font-size="11">2.78e-6 J</text>',
        xLabel: 'method',
        yLabel: 'U',
      }),
      takeaway: 'Gauss law gives the correct piecewise field, and both energy methods agree exactly.',
    },
  ],
  solution:
    '**(a)** $E=0$ for $r<a$; $E=\\rho(r^3-a^3)/(3\\varepsilon_0 r^2)$ for $a<r<b$; $E=\\rho(b^3-a^3)/(3\\varepsilon_0 r^2)$ for $r>b$. **(b)** With $V(\\infty)=0$, the piecewise potential is the stated continuous form. **(c)** For $\\rho=2.0\\times10^{-6}\\,\\text{C/m}^3$, $a=0.05\\,\\text{m}$, $b=0.10\\,\\text{m}$, stored energy is $U=2.78\\times10^{-6}\\,\\text{J}$. **(d)** Direct evaluation of $(1/2)\\int\\rho V\\,d\\tau$ gives the same $2.78\\times10^{-6}\\,\\text{J}$.',
  verifiedPatterns: ['E(r)=', 'V(\\infty)=0', '2.78\\times10^{-6}\\,\\text{J}', '\\frac{1}{2}\\int\\rho V'],
  minDiagramSteps: 2,
};
