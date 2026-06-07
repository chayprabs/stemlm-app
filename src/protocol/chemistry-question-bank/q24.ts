import { chemGraph, maxwellBoltzmann } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q24: ChemistryQuestionDef = {
  id: 'q24',
  number: 24,
  topic: 'Statistical Thermodynamics: Boltzmann, Partition Functions, and Heat Capacity',
  question:
    'Statistical thermodynamics: (a) Use Boltzmann distributions for level populations. (b) Analyze a two-level system and temperature dependence. (c) Build partition-function expressions and obtain thermodynamic observables. (d) Explain heat-capacity variation with temperature.',
  steps: [
    {
      title: 'Boltzmann population ratio between two energy states',
      formula:
        '$$\\frac{N_2}{N_1}=\\exp\\left(-\\frac{\\Delta E}{k_B T}\\right)$$',
      body: 'For a gap of 2.0 kJ per mol at 298 K, the upper state remains less populated than the lower state. Raising temperature increases occupation of the higher state because thermal energy better competes with the level spacing.',
      diagram: chemGraph({
        xLabel: 'state index',
        yLabel: 'population fraction',
        points: [
          { x: 110, y: 62, label: 'ground', fill: '#1d4ed8' },
          { x: 190, y: 98, label: 'excited', fill: '#dc2626' },
        ],
        annotations: '<text x="78" y="30" font-size="9">higher energy state has lower occupancy</text>',
      }),
    },
    {
      title: 'Two-level system population versus temperature',
      formula:
        '$$p_1=\\frac{1}{1+e^{-\\Delta E/k_B T}},\\quad p_0=1-p_1$$',
      body: 'At low temperature, almost all particles occupy the lower level. At high temperature, the two levels approach equal occupation. This sigmoidal crossover is a hallmark of two-level statistics.',
      diagram: chemGraph({
        xLabel: 'T',
        yLabel: 'population',
        curves: [
          {
            d: 'M 50 55 C 95 58 135 68 165 86 C 195 103 225 118 250 125',
            stroke: '#1d4ed8',
            label: 'p0',
            labelPos: [232, 122],
          },
          {
            d: 'M 50 125 C 95 122 135 112 165 94 C 195 77 225 62 250 55',
            stroke: '#dc2626',
            label: 'p1',
            labelPos: [232, 50],
          },
        ],
      }),
    },
    {
      title: 'Canonical partition function and derived internal energy',
      formula:
        '$$Z=\\sum_i g_i e^{-E_i/k_B T},\\quad U=-\\frac{\\partial \\ln Z}{\\partial \\beta}$$',
      body: 'The partition function weights each level by degeneracy and Boltzmann factor. Once Z is known, internal energy and entropy follow directly without separate counting arguments for every thermodynamic property.',
      diagram: chemGraph({
        xLabel: 'energy level i',
        yLabel: 'weight g_i exp(-Ei/kBT)',
        points: [
          { x: 90, y: 52, label: 'i=0', fill: '#1d4ed8' },
          { x: 130, y: 78, label: 'i=1', fill: '#16a34a' },
          { x: 170, y: 100, label: 'i=2', fill: '#dc2626' },
          { x: 210, y: 118, label: 'i=3', fill: '#7c3aed' },
        ],
        annotations: '<text x="68" y="28" font-size="9">higher levels contribute less at fixed T</text>',
      }),
    },
    {
      title: 'Heat capacity from partition function derivatives',
      formula:
        '$$C_V=\\left(\\frac{\\partial U}{\\partial T}\\right)_V = k_B\\beta^2\\left(\\langle E^2\\rangle-\\langle E\\rangle^2\\right)$$',
      body: 'Heat capacity measures energy fluctuations in the canonical ensemble. When many states become accessible over a narrow temperature interval, fluctuations increase and so does heat capacity.',
      diagram: chemGraph({
        xLabel: 'T',
        yLabel: 'Cv',
        curves: [
          {
            d: 'M 50 130 C 90 128 120 110 145 82 C 170 56 195 62 225 88 C 240 100 248 108 255 112',
            stroke: '#dc2626',
            label: 'two-level Cv',
            labelPos: [206, 82],
          },
        ],
        annotations: '<text x="82" y="42" font-size="9">Schottky-type maximum</text>',
      }),
    },
    {
      title: 'Translational speed distribution context',
      formula:
        '$$f(u)=4\\pi\\left(\\frac{m}{2\\pi k_B T}\\right)^{3/2}u^2 e^{-mu^2/2k_B T}$$',
      body: 'Maxwell-Boltzmann speed distributions broaden and shift toward higher speed as temperature rises. This macroscopic trend is another expression of Boltzmann weighting across many translational microstates.',
      diagram: maxwellBoltzmann(),
    },
    {
      title: 'Partition-function perspective on Cv versus temperature',
      formula:
        '$$C_V(T)=R\\,\\frac{\\partial}{\\partial T}\\left(T^2\\frac{\\partial \\ln Z}{\\partial T}\\right)$$',
      body: 'At very low temperature, only the ground state contributes and heat capacity approaches zero. At intermediate temperature, excited levels enter and Cv rises. At high temperature, each accessible mode approaches its classical equipartition limit.',
      diagram: chemGraph({
        xLabel: 'T',
        yLabel: 'Cv/R',
        curves: [
          {
            d: 'M 50 138 C 88 136 122 124 152 96 C 182 68 212 58 250 55',
            stroke: '#1d4ed8',
            label: 'vibrational mode',
            labelPos: [192, 50],
          },
        ],
        annotations: '<text x="95" y="28" font-size="9">low-T freeze out to high-T limit</text>',
      }),
      takeaway:
        'Boltzmann factors and partition functions provide a single framework for populations, energies, and temperature-dependent heat capacities.',
    },
  ],
  solution:
    'Boltzmann statistics set relative level populations and predict stronger excited-state occupation at higher temperature. The partition function Z encodes all thermodynamic observables, including internal energy and Cv through derivatives. Two-level systems show a characteristic heat-capacity peak, while translational and vibrational distributions approach classical behavior only at sufficiently high temperature.',
  verifiedPatterns: [
    'Boltzmann',
    'two-level',
    'partition function',
    'k_B',
    'internal energy',
    'Cv',
    'Schottky',
    'Maxwell-Boltzmann',
    'temperature',
    'ground state',
  ],
  minDiagramSteps: 5,
};
