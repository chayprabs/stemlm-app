import { chemGraph, cyclicVoltammogram, daniellCell, electrochemicalSeries } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q12: ChemistryQuestionDef = {
  id: 'q12',
  number: 12,
  topic: 'Electrochemistry',
  question:
    'Electrochemistry and redox chemistry: (a) Evaluate a Daniell galvanic cell and apply the Nernst equation. (b) Calculate products in brine electrolysis using Faraday law. (c) Interpret polarisation curves with Tafel kinetics. (d) Use the electrochemical series to predict displacement reactions and spontaneity.',
  steps: [
    {
      title: 'Daniell cell emf under standard conditions',
      formula: '$$E^\\circ_{\\text{cell}}=E^\\circ_{\\text{cathode}}-E^\\circ_{\\text{anode}}$$',
      body: 'For the Daniell cell, $E^\\circ_{\\text{cathode}}$ is for $\\mathrm{Cu^{2+}/Cu}$ and $E^\\circ_{\\text{anode}}$ is for $\\mathrm{Zn^{2+}/Zn}$. Using $E^\\circ(\\mathrm{Cu^{2+}/Cu})=+0.34\\,\\text{V}$ and $E^\\circ(\\mathrm{Zn^{2+}/Zn})=-0.76\\,\\text{V}$, $E^\\circ_{\\text{cell}}=0.34-(-0.76)=1.10\\,\\text{V}$. The positive value confirms spontaneous galvanic operation.',
      diagram: daniellCell(),
    },
    {
      title: 'Non-standard Daniell cell potential from Nernst equation',
      formula: '$$E=E^\\circ-\\frac{0.0592}{n}\\log Q$$',
      body: 'Here $n=2$ electrons for $\\mathrm{Zn + Cu^{2+}\\to Zn^{2+}+Cu}$ and $Q=[\\mathrm{Zn^{2+}}]/[\\mathrm{Cu^{2+}}]$. With $[\\mathrm{Zn^{2+}}]=1.00\\,\\text{M}$ and $[\\mathrm{Cu^{2+}}]=0.010\\,\\text{M}$, $Q=100$. Substitution gives $E=1.10-(0.0592/2)\\log(100)=1.10-0.0592=1.0408\\,\\text{V}$.',
      diagram: daniellCell(),
    },
    {
      title: 'Brine electrolysis product yield by Faraday law',
      formula: '$$n(e^-)=\\frac{It}{F},\\quad n(\\mathrm{Cl_2})=\\frac{n(e^-)}{2}$$',
      body: 'In brine electrolysis, anode oxidation is $2\\mathrm{Cl^-\\to Cl_2+2e^-}$. For $I=5000\\,\\text{A}$ and $t=3600\\,\\text{s}$, $n(e^-)=It/F=(5000\\times3600)/96485=186.6\\,\\text{mol}$. Therefore $n(\\mathrm{Cl_2})=186.6/2=93.3\\,\\text{mol}$ and mass of chlorine is $m=93.3\\times70.9=6.61\\,\\text{kg}$.',
      diagram: chemGraph({
        xLabel: 'electrode position',
        yLabel: 'species flow',
        points: [
          { x: 90, y: 70, label: 'anode: Cl2', fill: '#dc2626' },
          { x: 90, y: 118, label: '2Cl- -> Cl2 + 2e-', fill: '#dc2626' },
          { x: 190, y: 70, label: 'cathode: H2', fill: '#1d4ed8' },
          { x: 190, y: 118, label: '2H2O + 2e- -> H2 + 2OH-', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="70" y="28" font-size="10">Brine electrolysis cell outputs: Cl2, H2, NaOH</text>',
      }),
    },
    {
      title: 'Polarisation curves and Tafel overpotential',
      formula: '$$\\eta=a+b\\log i$$',
      body: 'For an anode branch, if $a=0.12\\,\\text{V}$ and $b=0.060\\,\\text{V/dec}$, then at $i=10\\,\\text{mA cm}^{-2}$ ($\\log i=1.00$), $\\eta=0.12+0.060(1.00)=0.18\\,\\text{V}$. At $i=100\\,\\text{mA cm}^{-2}$ ($\\log i=2.00$), $\\eta=0.24\\,\\text{V}$. So each decade increase in current density adds $60\\,\\text{mV}$ overpotential.',
      diagram: cyclicVoltammogram(),
    },
    {
      title: 'Electrochemical series and displacement prediction',
      formula: '$$E^\\circ_{\\text{cell}}=E^\\circ_{\\text{oxidant}}-E^\\circ_{\\text{reductant}}$$',
      body: 'From the electrochemical series, $E^\\circ(\\mathrm{Cu^{2+}/Cu})=+0.34\\,\\text{V}$ and $E^\\circ(\\mathrm{Fe^{2+}/Fe})=-0.44\\,\\text{V}$. For $\\mathrm{Fe + Cu^{2+}\\to Fe^{2+}+Cu}$, $E^\\circ_{\\text{cell}}=0.34-(-0.44)=0.78\\,\\text{V}$, so iron displaces copper ions spontaneously.',
      diagram: electrochemicalSeries(),
    },
    {
      title: 'Thermodynamic link: Gibbs energy and equilibrium constant',
      formula: '$$\\Delta G^\\circ=-nFE^\\circ,\\quad \\log K=\\frac{nE^\\circ}{0.0592}$$',
      body: 'Using the Daniell value $E^\\circ=1.10\\,\\text{V}$ and $n=2$, standard Gibbs energy is $\\Delta G^\\circ=-(2)(96485)(1.10)=-2.12\\times10^5\\,\\text{J mol}^{-1}=-212\\,\\text{kJ mol}^{-1}$. The equilibrium constant is $\\log K=(2\\times1.10)/0.0592=37.2$, so $K\\approx10^{37.2}$ and products are overwhelmingly favored.',
      diagram: chemGraph({
        xLabel: 'reaction progress',
        yLabel: 'G',
        curves: [{ d: 'M 50 60 C 110 70 170 95 250 125', stroke: '#16a34a', label: 'DeltaG < 0', labelPos: [165, 88] }],
        annotations:
          '<text x="60" y="35" font-size="10">large positive E° gives strongly product-favored equilibrium</text>',
      }),
      takeaway:
        'Electrochemical cell voltage, Faraday charge balance, and polarisation behavior jointly predict electrolysis output, spontaneity, and practical losses.',
    },
  ],
  solution:
    'The Daniell cell gives $E^\\circ=1.10\\,\\text{V}$ and remains positive under non-standard concentrations ($E=1.0408\\,\\text{V}$ for $Q=100$). Brine electrolysis at $5000\\,\\text{A}$ for one hour gives $186.6\\,\\text{mol}$ electrons and $93.3\\,\\text{mol}$ chlorine ($6.61\\,\\text{kg}$). Polarisation follows Tafel behavior with overpotential increasing by $b$ per decade in current. Electrochemical-series analysis predicts iron will reduce copper ions, and thermodynamic conversion gives $\\Delta G^\\circ=-212\\,\\text{kJ mol}^{-1}$ with $K\\approx10^{37.2}$.',
  verifiedPatterns: [
    'Daniell',
    '1.10\\,\\text{V}',
    'Q=100',
    '6.61\\,\\text{kg}',
    'overpotential',
    'electrochemical series',
    '\\Delta G^\\circ',
    '10^{37.2}',
  ],
  minDiagramSteps: 5,
};
