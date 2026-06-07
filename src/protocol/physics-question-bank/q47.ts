import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q47: PhysicsQuestionDef = {
  id: 'q47',
  number: 47,
  topic: 'Navier-Stokes and Bernoulli in Pipe Flow',
  question:
    'Physics momentum and conservation of energy in pipe flow: using Navier-Stokes for water with rho=1000 kg/m^3 and mu=1.0e-3 Pa·s in a pipe of diameter 0.050 m, length 12 m, and volume rate Q=2.5e-3 m^3/s, find velocity, Reynolds number, pressure loss, and pump power from the Bernoulli relation with friction.',
  steps: [
    {
      title: 'Compute average velocity and Reynolds number',
      formula:
        '$$A=\\frac{\\pi D^2}{4}=\\frac{\\pi(0.050)^2}{4}=1.963\\times10^{-3}\\,\\text{m}^2,\\quad v=\\frac{Q}{A}=\\frac{2.5\\times10^{-3}}{1.963\\times10^{-3}}=1.27\\,\\text{m/s}$$',
      body: 'Reynolds number is $\\mathrm{Re}=\\rho vD/\\mu=(1000)(1.27)(0.050)/(1.0\\times10^{-3})=6.37\\times10^4$. The flow is turbulent because $\\mathrm{Re}\\gg4000$.',
      diagram: wrapPhysicsSvg(
        '<rect x="35" y="70" width="230" height="40" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="55" y1="90" x2="245" y2="90" stroke="#dc2626" stroke-width="2"/>' +
          '<polygon points="245,90 235,85 235,95" fill="#dc2626"/>' +
          '<text x="105" y="84" font-size="11" fill="#dc2626">v=1.27 m/s</text>' +
          '<text x="40" y="63" font-size="11">D=0.050 m, L=12 m</text>',
      ),
    },
    {
      title: 'Apply momentum-loss model for wall friction',
      formula:
        '$$h_f=f\\frac{L}{D}\\frac{v^2}{2g}=0.020\\times\\frac{12}{0.050}\\times\\frac{(1.27)^2}{2(9.81)}=0.394\\,\\text{m}$$',
      body: 'Using Darcy factor $f=0.020$, pressure drop is $\\Delta p=\\rho gh_f=(1000)(9.81)(0.394)=3.87\\times10^3\\,\\text{Pa}=3.87\\,\\text{kPa}$. Wall stress estimate is $\\tau_w=f\\rho v^2/8=0.020(1000)(1.27)^2/8=4.03\\,\\text{Pa}$.',
    },
    {
      title: 'Use Bernoulli with dissipation term',
      formula:
        '$$\\frac{p_1}{\\rho g}+\\frac{v_1^2}{2g}=\\frac{p_2}{\\rho g}+\\frac{v_2^2}{2g}+h_f\\Rightarrow p_1-p_2=\\rho gh_f$$',
      body: 'For equal diameters $v_1=v_2=1.27\\,\\text{m/s}$ and same elevation, the kinetic terms cancel. Therefore $p_1-p_2=(1000)(9.81)(0.394)=3.87\\,\\text{kPa}$ exactly matching the momentum-loss estimate.',
      diagram: wrapPhysicsSvg(
        '<rect x="35" y="70" width="100" height="40" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
          '<rect x="170" y="70" width="95" height="40" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="135" y1="90" x2="170" y2="90" stroke="#1d4ed8" stroke-width="2"/>' +
          '<text x="55" y="63" font-size="11">p1</text><text x="202" y="63" font-size="11">p2</text>' +
          '<text x="95" y="140" font-size="11">p1 - p2 = 3.87 kPa</text>' +
          '<line x1="90" y1="120" x2="210" y2="120" stroke="#dc2626" stroke-width="1.8"/><polygon points="210,120 201,115 201,125" fill="#dc2626"/>',
      ),
    },
    {
      title: 'Compute required pump power',
      formula: '$$P_{pump}=\\Delta p\\,Q=(3.87\\times10^3)(2.5\\times10^{-3})=9.67\\,\\text{W}$$',
      body: 'Energy-loss rate is $9.67\\,\\text{W}$. Per unit mass, head loss corresponds to $gh_f=(9.81)(0.394)=3.87\\,\\text{J/kg}$, showing consistency between Bernoulli energy and Navier-Stokes momentum viewpoints.',
      takeaway:
        'Navier-Stokes momentum balance and Bernoulli-with-loss give the same pressure drop when friction is modeled consistently.',
    },
  ],
  solution:
    'For $Q=2.5\\times10^{-3}\\,\\text{m}^3/\\text{s}$, $D=0.050\\,\\text{m}$: $v=1.27\\,\\text{m/s}$ and $\\mathrm{Re}=6.37\\times10^4$. With $f=0.020$ and $L=12\\,\\text{m}$, head loss is $h_f=0.394\\,\\text{m}$, pressure drop is $\\Delta p=3.87\\,\\text{kPa}$, and pump power is $P_{pump}=9.67\\,\\text{W}$.',
  verifiedPatterns: ['v=1.27\\,\\text{m/s}', '\\mathrm{Re}=6.37\\times10^4', '\\Delta p=3.87\\,\\text{kPa}', 'P_{pump}=9.67\\,\\text{W}'],
  minDiagramSteps: 2,
};
