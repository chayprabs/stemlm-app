import { physicsGraph, wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q17: PhysicsQuestionDef = {
  id: 'q17',
  number: 17,
  topic: 'Maxwell Equations and Electromagnetic Waves',
  question:
    'Physics electromagnetic wave in vacuum: starting from Maxwell equations derive the wave equation for electric field and magnetic field, compute wave speed c numerically from μ0 and ε0, then for a plane wave traveling in +x with E0=120 V/m write E and B fields and compute the time-averaged Poynting vector magnitude.',
  steps: [
    {
      title: 'Derive wave equation from Maxwell equations',
      formula:
        '$$\\nabla\\times(\\nabla\\times\\mathbf E)=\\nabla(\\nabla\\cdot\\mathbf E)-\\nabla^2\\mathbf E=-\\mu_0\\epsilon_0\\frac{\\partial^2\\mathbf E}{\\partial t^2}\\Rightarrow \\nabla^2\\mathbf E=\\mu_0\\epsilon_0\\frac{\\partial^2\\mathbf E}{\\partial t^2}$$',
      body: 'In vacuum, $\\nabla\\cdot\\mathbf E=0$ and $\\nabla\\times\\mathbf B=\\mu_0\\epsilon_0\\,\\partial\\mathbf E/\\partial t$. Numerically, $\\mu_0\\epsilon_0=(4\\pi\\times10^{-7})(8.854\\times10^{-12})=1.11\\times10^{-17}\\,\\text{s}^2/\\text{m}^2$. The same method gives $\\nabla^2\\mathbf B=\\mu_0\\epsilon_0\\,\\partial^2\\mathbf B/\\partial t^2$.',
    },
    {
      title: 'Compute electromagnetic wave speed',
      formula:
        '$$c=\\frac{1}{\\sqrt{\\mu_0\\epsilon_0}}=\\frac{1}{\\sqrt{(4\\pi\\times10^{-7})(8.854\\times10^{-12})}}=2.998\\times10^8\\,\\text{m/s}$$',
      body: 'Using the measured constants gives $c=2.998\\times10^8\\,\\text{m/s}$, equal to the physical speed of light in vacuum.',
      diagram: physicsGraph({
        curves: [
          { d: 'M 40 95 Q 70 55 100 95 T 160 95 T 220 95 T 280 95', label: 'E_y', labelPos: [242, 80] },
          { d: 'M 40 115 Q 70 75 100 115 T 160 115 T 220 115 T 280 115', stroke: '#dc2626', label: 'B_z', labelPos: [242, 130] },
        ],
        xLabel: 'x',
        yLabel: 'field',
      }),
    },
    {
      title: 'Write plane-wave electric and magnetic fields',
      formula:
        '$$\\mathbf E=120\\cos(kx-\\omega t)\\,\\hat{\\mathbf y}\\ \\text{V/m},\\quad \\mathbf B=B_0\\cos(kx-\\omega t)\\,\\hat{\\mathbf z},\\quad B_0=\\frac{E_0}{c}=\\frac{120}{2.998\\times10^8}=4.00\\times10^{-7}\\,\\text{T}$$',
      body: 'For propagation along $+x$, choose $\\mathbf E\\parallel\\hat{\\mathbf y}$ and $\\mathbf B\\parallel\\hat{\\mathbf z}$ so $\\mathbf E\\times\\mathbf B\\parallel +\\hat{\\mathbf x}$. Amplitudes satisfy $E_0=cB_0$, giving $B_0=4.00\\times10^{-7}\\,\\text{T}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="55" y1="120" x2="255" y2="120" stroke="#333" stroke-width="2"/>' +
          '<line x1="90" y1="145" x2="90" y2="65" stroke="#1d4ed8" stroke-width="3"/>' +
          '<line x1="90" y1="120" x2="130" y2="120" stroke="#dc2626" stroke-width="3"/>' +
          '<polygon points="250,120 240,115 240,125" fill="#333"/>' +
          '<text x="258" y="124" font-size="11">k, +x</text>' +
          '<text x="95" y="72" font-size="11" fill="#1d4ed8">E (y)</text>' +
          '<text x="134" y="124" font-size="11" fill="#dc2626">B (z)</text>',
      ),
    },
    {
      title: 'Evaluate the Poynting vector',
      formula:
        '$$\\mathbf S=\\frac{1}{\\mu_0}\\mathbf E\\times\\mathbf B,\\quad \\langle S\\rangle=\\frac{E_0B_0}{2\\mu_0}=\\frac{(120)(4.00\\times10^{-7})}{2(4\\pi\\times10^{-7})}=19.1\\,\\text{W/m}^2$$',
      body: 'The instantaneous energy-flow direction is $+x$. The time-average intensity for this sinusoidal wave is $\\langle S\\rangle=19.1\\,\\text{W/m}^2$.',
      takeaway:
        'Maxwell equations predict self-propagating electric and magnetic fields moving at $c=1/\\sqrt{\\mu_0\\epsilon_0}$.',
    },
  ],
  solution:
    '**Wave equation:** $\\nabla^2\\mathbf E=\\mu_0\\epsilon_0\\,\\partial^2\\mathbf E/\\partial t^2$ and similarly for $\\mathbf B$. **Speed:** $c=2.998\\times10^8\\,\\text{m/s}$. **Plane wave:** $\\mathbf E=120\\cos(kx-\\omega t)\\hat{\\mathbf y}$ V/m, $\\mathbf B=4.00\\times10^{-7}\\cos(kx-\\omega t)\\hat{\\mathbf z}$ T. **Poynting average:** $\\langle S\\rangle=19.1\\,\\text{W/m}^2$ along $+x$.',
  verifiedPatterns: [
    '\\nabla^2\\mathbf E=\\mu_0\\epsilon_0',
    '2.998\\times10^8\\,\\text{m/s}',
    '4.00\\times10^{-7}\\,\\text{T}',
    '19.1\\,\\text{W/m}^2',
  ],
  minDiagramSteps: 2,
};
