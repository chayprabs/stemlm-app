import { energyProfile, newmanProjection, chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q09: ChemistryQuestionDef = {
  id: 'q09',
  number: 9,
  topic: 'Nucleophilic Substitution (SN1 and SN2)',
  question:
    'Nucleophilic substitution mechanisms: (a) Analyze SN1/SN2 competition for 2-bromobutane with NaOH. (b) Draw and explain the steric-hindrance transition state for SN2. (c) Explain solvolysis of (R)-3-chloro-3-methylhexane. (d) Compare SN1 and SN2 energy profiles and stereochemical outcomes.',
  steps: [
    {
      title: 'SN1/SN2 competition for 2-bromobutane + NaOH',
      formula:
        '$$\\text{rate}_{SN2}=k_{SN2}[\\text{2-bromobutane}][\\text{OH}^-],\\quad \\text{rate}_{SN1}=k_{SN1}[\\text{2-bromobutane}]$$',
      body: 'With $[\\text{2-bromobutane}]=0.10\\,\\text{M}$ and $[\\text{OH}^-]=0.20\\,\\text{M}$, if $k_{SN2}=1.5\\times10^{-3}\\,\\text{M}^{-1}\\text{s}^{-1}$ then $\\text{rate}_{SN2}=1.5\\times10^{-3}\\times0.10\\times0.20=3.0\\times10^{-5}\\,\\text{M s}^{-1}$. If $k_{SN1}=8.0\\times10^{-6}\\,\\text{s}^{-1}$, then $\\text{rate}_{SN1}=8.0\\times10^{-6}\\times0.10=8.0\\times10^{-7}\\,\\text{M s}^{-1}$, so under these basic conditions SN2 is about $3.0\\times10^{-5}/8.0\\times10^{-7}=37.5$ times faster.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          { d: 'M 40 125 C 95 125 120 80 160 58 L 255 58', stroke: '#1d4ed8', label: 'SN2 (NaOH)', labelPos: [172, 50] },
          { d: 'M 40 125 C 85 120 100 92 130 82 C 155 75 175 100 200 68 L 255 58', stroke: '#dc2626', label: 'SN1 (minor)', labelPos: [170, 88] },
        ],
      }),
    },
    {
      title: 'SN2 backside attack and Walden inversion at C2',
      formula: '$$\\text{rate}_{SN2} \\propto [\\text{OH}^-]$$',
      body: 'Doubling hydroxide concentration from $0.20\\,\\text{M}$ to $0.40\\,\\text{M}$ doubles the predicted SN2 rate from $3.0\\times10^{-5}$ to $6.0\\times10^{-5}\\,\\text{M s}^{-1}$. The nucleophile attacks from the side opposite Br, so configuration at C2 inverts (Walden inversion): a chiral center that starts as mostly one configuration gives the opposite configuration in product 2-butanol.',
      diagram: newmanProjection({
        conformation: 'SN2 backside attack on 2-bromobutane (inversion)',
        energy: 'single transition state',
      }),
    },
    {
      title: 'Steric hindrance raises the SN2 transition-state barrier',
      formula: '$$\\frac{k_{\\text{hindered}}}{k_{\\text{less hindered}}}=e^{-\\Delta\\Delta G^{\\ddagger}/RT}$$',
      body: 'At $T=298\\,\\text{K}$ with $R=8.314\\,\\text{J mol}^{-1}\\text{K}^{-1}$, if steric crowding adds $\\Delta\\Delta G^{\\ddagger}=7.5\\,\\text{kJ mol}^{-1}$, then $k_{\\text{hindered}}/k_{\\text{less hindered}}=\\exp[-7500/(8.314\\times298)]\\approx0.049$. So the hindered substrate is about $1/0.049\\approx20$ times slower through the SN2 transition state.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          { d: 'M 45 125 C 95 120 125 70 160 62 C 195 58 225 65 255 60', stroke: '#1d4ed8', label: 'less hindered TS‡', labelPos: [165, 52] },
          { d: 'M 45 125 C 95 123 125 52 160 44 C 195 42 225 55 255 60', stroke: '#dc2626', label: 'sterically hindered TS‡', labelPos: [152, 36] },
        ],
        annotations:
          '<text x="70" y="30" font-size="9">crowding increases TS energy</text>',
      }),
    },
    {
      title: '(R)-3-chloro-3-methylhexane solvolysis proceeds by SN1',
      formula:
        '$$\\text{rate}_{SN1}=k[\\text{(R)-3-chloro-3-methylhexane}],\\quad t_{1/2}=\\frac{0.693}{k}$$',
      body: 'For a tertiary chloride in ethanol/water, ionization to a carbocation is favored. If $k=2.0\\times10^{-5}\\,\\text{s}^{-1}$ and $[\\text{substrate}]=0.050\\,\\text{M}$, then $\\text{rate}=2.0\\times10^{-5}\\times0.050=1.0\\times10^{-6}\\,\\text{M s}^{-1}$. The first-order half-life is $t_{1/2}=0.693/(2.0\\times10^{-5})=3.47\\times10^4\\,\\text{s}\\approx9.6\\,\\text{h}$.',
      diagram: energyProfile({
        title: '(R)-3-chloro-3-methylhexane solvolysis (SN1)',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Stereochemical outcomes: inversion (SN2) vs racemization (SN1)',
      formula: '$$ee=\\frac{|R-S|}{R+S}\\times100\\%$$',
      body: 'SN2 at a stereogenic center gives nearly complete inversion, so a pure $R$ reactant can give nearly pure $S$ product (about $100\\%$ inversion). SN1 passes through a planar carbocation, so both faces are attacked: if product is $52:48$ (R:S), then $ee=|52-48|/(52+48)\\times100=4\\%$, i.e. near-racemic.',
      diagram: newmanProjection({
        conformation: 'SN2 inversion contrasted with SN1 racemization',
        energy: 'SN2: stereospecific; SN1: near-racemic',
      }),
      takeaway:
        'Backside attack makes SN2 stereospecific, while planar-carbocation attack in SN1 erodes optical purity.',
    },
    {
      title: 'SN1 vs SN2 energy-profile comparison',
      formula:
        '$$\\Delta\\Delta G^{\\ddagger}=-RT\\ln\\left(\\frac{k_{SN2}}{k_{SN1}}\\right)$$',
      body: 'Using the earlier ratio $k_{SN2}/k_{SN1}=37.5$ at $298\\,\\text{K}$: $\\Delta\\Delta G^{\\ddagger}=-(8.314)(298)\\ln(37.5)=-8.97\\times10^3\\,\\text{J mol}^{-1}\\approx-9.0\\,\\text{kJ mol}^{-1}$. The negative sign means the SN2 pathway has the lower activation barrier under concentrated NaOH conditions.',
      diagram: energyProfile({
        title: 'SN1 vs SN2 profiles for substitution',
        compareSn: true,
      }),
    },
  ],
  solution:
    '**(a)** For 2-bromobutane with NaOH, SN2 dominates when hydroxide concentration is high and solvent does not over-stabilize ions; rate is second order in substrate and nucleophile. **(b)** SN2 is one-step backside attack with a pentacoordinate-like transition state; steric hindrance raises $\\Delta G^{\\ddagger}$ and slows rate exponentially. **(c)** (R)-3-chloro-3-methylhexane solvolyzes by SN1 via a tertiary carbocation, giving first-order kinetics and near-racemization. **(d)** SN2 has one barrier and stereochemical inversion; SN1 has two barriers with a carbocation intermediate and racemization.',
  verifiedPatterns: [
    '2-bromobutane',
    'NaOH',
    'SN2',
    'backside attack',
    'Walden inversion',
    'steric hindrance',
    '(R)-3-chloro-3-methylhexane',
    'solvolysis',
    'SN1',
    'carbocation',
    'racemization',
  ],
  minDiagramSteps: 5,
};
