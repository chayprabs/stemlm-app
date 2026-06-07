import { bornHaberCycle, gibbsEnergyCurves, pvDiagram, tsDiagram } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q04: ChemistryQuestionDef = {
  id: 'q04',
  number: 4,
  topic: 'Chemical Thermodynamics',
  question:
    'Thermodynamics and energetics: (a) Interpret a P-V diagram containing isothermal, adiabatic, isobaric, and isochoric paths and compare work terms. (b) Use a Born-Haber cycle to estimate lattice enthalpy of MgCl2. (c) Analyze Gibbs free energy G versus reaction coordinate for four ΔH/ΔS sign combinations. (d) Use a T-S Carnot cycle to compute efficiency and net work.',
  steps: [
    {
      title: 'Reading process paths on the P-V diagram',
      formula: '$$PV = nRT$$',
      body: 'Take 1.00 mol gas at $T=300$ K and $R=0.0821$ L atm mol$^{-1}$ K$^{-1}$. At $V_1=10.0$ L, pressure is $P_1=nRT/V_1=(1.00\\times0.0821\\times300)/10.0=2.46$ atm. If volume doubles to $V_2=20.0$ L isothermally, $P_2=(1.00\\times0.0821\\times300)/20.0=1.23$ atm, showing inverse $P$-$V$ behavior.',
      diagram: pvDiagram(),
    },
    {
      title: 'Work comparison: isothermal vs adiabatic vs isobaric vs isochoric',
      formula: '$$W_{\\text{isoT}} = nRT\\ln\\frac{V_2}{V_1},\\quad W_{\\text{isobaric}}=P\\Delta V,\\quad W_{\\text{isochoric}}=0$$',
      body: 'For $n=1.00$, $T=300$ K, $V_1=10.0$ L, $V_2=20.0$ L: $W_{\\text{isoT}}=(1.00)(8.314)(300)\\ln(20.0/10.0)=1728$ J. At constant $P=1.23$ atm, $W_{\\text{isobaric}}=P\\Delta V=(1.23)(10.0)=12.3$ L atm $=12.3\\times101.3=1246$ J. Isochoric gives $W=0$. For an adiabatic expansion to the same $V_2$, $|W_{\\text{adiabatic}}|>|W_{\\text{isoT}}|$ for this sign convention because internal energy decreases with no heat input.',
      diagram: pvDiagram(),
      takeaway: 'On a P-V plot, mechanical work is the area under each path; shape controls energy transfer.',
    },
    {
      title: 'Born-Haber cycle for MgCl2 lattice enthalpy',
      formula:
        '$$\\Delta H_f = \\Delta H_{sub}+IE_1+IE_2+D(Cl_2)+2EA(Cl)+U_{latt}$$',
      body: 'Using representative values (kJ mol$^{-1}$): $\\Delta H_f=-642$, $\\Delta H_{sub}=+148$, $IE_1=+738$, $IE_2=+1451$, $D(Cl_2)=+243$, and $2EA=2(-349)=-698$. Substitution gives $-642=148+738+1451+243-698+U_{latt}=1882+U_{latt}$. Therefore $U_{latt}=-642-1882=-2524$ kJ mol$^{-1}$ (exothermic lattice formation).',
      diagram: bornHaberCycle(),
    },
    {
      title: 'Gibbs free-energy criteria and four ΔH/ΔS cases',
      formula: '$$\\Delta G = \\Delta H - T\\Delta S$$',
      body: 'Case 1: $\\Delta H=-40$ kJ mol$^{-1}$, $\\Delta S=+0.080$ kJ mol$^{-1}$ K$^{-1}$ at $T=298$ K gives $\\Delta G=-40-(298)(0.080)=-63.84$ kJ mol$^{-1}$ (always spontaneous). Case 2: $\\Delta H=+40$, $\\Delta S=-0.080$ gives $\\Delta G=+40-(298)(-0.080)=+63.84$ (never spontaneous). Case 3: $\\Delta H=+40$, $\\Delta S=+0.120$: at $298$ K, $\\Delta G=+40-35.76=+4.24$ but at $500$ K, $\\Delta G=+40-60.0=-20.0$ (high-T favorable). Case 4: $\\Delta H=-40$, $\\Delta S=-0.120$: at $298$ K, $\\Delta G=-40+35.76=-4.24$ but at $500$ K, $\\Delta G=-40+60.0=+20.0$ (low-T favorable).',
      diagram: gibbsEnergyCurves(),
    },
    {
      title: 'Carnot cycle on a T-S diagram',
      formula: '$$\\eta_{Carnot}=1-\\frac{T_c}{T_h},\\quad Q_h=T_h\\Delta S,\\quad W_{net}=Q_h-Q_c$$',
      body: 'Let $T_h=600$ K, $T_c=300$ K, and entropy span $\\Delta S=2.50$ J K$^{-1}$. Then $Q_h=T_h\\Delta S=(600)(2.50)=1500$ J and $Q_c=T_c\\Delta S=(300)(2.50)=750$ J. Net work is $W_{net}=1500-750=750$ J. Efficiency is $\\eta=1-300/600=0.50=50\\%$.',
      diagram: tsDiagram(),
    },
    {
      title: 'Thermodynamic consistency check linking diagrams',
      formula: '$$\\Delta U = q - w$$',
      body: 'For a full cycle, internal energy returns to start so $\\Delta U=0=q-w$, hence $q=w$. Using the Carnot values above, net heat $q_{net}=Q_h-Q_c=1500-750=750$ J equals net work $w_{net}=750$ J, consistent with first-law thermodynamics and the enclosed areas on both P-V and T-S plots.',
      diagram: tsDiagram(),
    },
  ],
  solution:
    'P-V paths identify isothermal, adiabatic, isobaric, and isochoric transformations and their work differences by enclosed area. For the MgCl2 Born-Haber cycle with given data, lattice enthalpy is about -2524 kJ mol^-1. Gibbs analysis follows ΔG=ΔH-TΔS: (ΔH<0,ΔS>0) always spontaneous; (ΔH>0,ΔS<0) never; (ΔH>0,ΔS>0) high-T spontaneous; (ΔH<0,ΔS<0) low-T spontaneous. A Carnot engine with Th=600 K and Tc=300 K gives η=50% and Wnet=750 J for ΔS=2.50 J K^-1.',
  verifiedPatterns: [
    'isothermal',
    'adiabatic',
    'Born-Haber',
    'MgCl2',
    'ΔG',
    'Carnot',
    'η=50%',
    'lattice enthalpy',
  ],
  minDiagramSteps: 5,
};
