import { carnotCycle, physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q11: PhysicsQuestionDef = {
  id: 'q11',
  number: 11,
  topic: 'Physics Thermodynamics Carnot Engine',
  question:
    'Physics thermodynamics: A Carnot heat engine operates between Th=600 K and Tc=300 K and delivers work W=10 kJ per cycle. (a) Find efficiency. (b) Find heat absorbed Qh and heat rejected Qc. (c) Compute entropy changes of hot and cold reservoirs and net entropy change. (d) A real engine delivering the same 10 kJ has efficiency 35%; find Qh, Qc, and entropy production.',
  steps: [
    {
      title: 'Sketch the Carnot cycle and energy flows',
      body: 'Use a standard Physics P-V Carnot cycle with two isotherms (at 600 K and 300 K) and two adiabats. Heat $Q_h$ enters from the hot reservoir, work $W$ is extracted, and $Q_c$ is expelled to the cold reservoir.',
      diagram: carnotCycle(),
    },
    {
      title: 'Compute Carnot efficiency',
      formula: '$$\\eta_{\\text{Carnot}}=1-\\frac{T_c}{T_h}=1-\\frac{300}{600}=0.50$$',
      body: 'Numeric substitution gives $\\eta=0.50=50\\%$, so this reversible Physics engine converts half of absorbed heat into useful work.',
    },
    {
      title: 'Find heat input and heat rejection for W=10 kJ',
      formula:
        '$$Q_h=\\frac{W}{\\eta}=\\frac{10\\,\\text{kJ}}{0.50}=20\\,\\text{kJ},\\qquad Q_c=Q_h-W=20-10=10\\,\\text{kJ}$$',
      body: 'With $W=10\\,\\text{kJ}$ and $\\eta=0.50$, the engine must absorb $20\\,\\text{kJ}$ of heat and reject $10\\,\\text{kJ}$ per cycle.',
    },
    {
      title: 'Reservoir entropy changes for the reversible Carnot cycle',
      formula:
        '$$\\Delta S_h=-\\frac{Q_h}{T_h}=-\\frac{20000}{600}=-33.33\\,\\text{J/K},\\quad \\Delta S_c=\\frac{Q_c}{T_c}=\\frac{10000}{300}=33.33\\,\\text{J/K}$$',
      body: 'The net change is $\\Delta S_{\\text{univ}}=\\Delta S_h+\\Delta S_c=-33.33+33.33=0\\,\\text{J/K}$, consistent with reversible thermodynamics.',
    },
    {
      title: 'Real engine at 35% efficiency: entropy production',
      formula:
        '$$Q_h^{\\text{real}}=\\frac{10\\,\\text{kJ}}{0.35}=28.57\\,\\text{kJ},\\quad Q_c^{\\text{real}}=28.57-10=18.57\\,\\text{kJ},\\quad \\Delta S_{\\text{gen}}=\\frac{18571}{300}-\\frac{28571}{600}=14.29\\,\\text{J/K}$$',
      body: 'For the same $10\\,\\text{kJ}$ work output, the less efficient real engine needs more input heat and generates positive entropy: $\\Delta S_{\\text{gen}}=14.29\\,\\text{J/K}>0$.',
      diagram: physicsGraph({
        annotations:
          '<rect x="80" y="70" width="40" height="50" fill="#60a5fa"/><rect x="180" y="85" width="40" height="35" fill="#f87171"/><text x="72" y="135" font-size="11">Carnot 50%</text><text x="172" y="135" font-size="11">Real 35%</text><text x="95" y="62" font-size="11">W/Qh</text>',
        xLabel: 'engine type',
        yLabel: 'efficiency',
      }),
      takeaway: 'Real engines have lower efficiency and positive entropy production, unlike an ideal Carnot cycle.',
    },
  ],
  solution:
    '**(a)** $\\eta_{\\text{Carnot}}=1-T_c/T_h=0.50$. **(b)** $Q_h=20\\,\\text{kJ}$, $Q_c=10\\,\\text{kJ}$. **(c)** $\\Delta S_h=-33.33\\,\\text{J/K}$, $\\Delta S_c=+33.33\\,\\text{J/K}$, net $0$. **(d)** For $\\eta=35\\%$ at the same $W=10\\,\\text{kJ}$: $Q_h=28.57\\,\\text{kJ}$, $Q_c=18.57\\,\\text{kJ}$, entropy generation $14.29\\,\\text{J/K}$.',
  verifiedPatterns: ['0.50', '20\\,\\text{kJ}', '10\\,\\text{kJ}', '14.29\\,\\text{J/K}', '\\Delta S_{\\text{gen}}'],
  minDiagramSteps: 2,
};
