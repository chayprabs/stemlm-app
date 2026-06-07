import { actionPotentialGraph, motorNeuron, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q15: BiologyQuestionDef = {
  id: 'q15',
  number: 15,
  topic: 'Motor Neuron Structure and Action Potential Physiology',
  question:
    'In neurobiology, label a motor neuron cell, explain resting membrane potential and action potential phases, interpret a membrane voltage graph, and quantify why saltatory conduction increases conduction velocity in myelinated axons.',
  steps: [
    {
      title: 'Label core parts of a motor neuron',
      body: 'A motor neuron has dendrites, soma, axon hillock, myelinated axon segments, nodes of Ranvier, and axon terminals at the neuromuscular junction. Signal flow is dendrite -> soma -> axon -> terminal.',
      diagram: motorNeuron(),
    },
    {
      title: 'Compute resting membrane potential from ion contributions',
      formula:
        '$$V_m\\approx\\frac{g_K E_K+g_{Na} E_{Na}+g_{Cl} E_{Cl}}{g_K+g_{Na}+g_{Cl}}$$',
      body: 'V_m is membrane potential, g is membrane conductance for each ion, and E is that ion equilibrium potential. Using gK = 8, gNa = 1, gCl = 1, EK = -90 mV, ENa = +60 mV, ECl = -70 mV: Vm = (8x-90 + 1x60 + 1x-70)/(8+1+1) = (-720 + 60 - 70)/10 = -730/10 = -73 mV.',
    },
    {
      title: 'Read depolarization and repolarization on the AP graph',
      formula:
        '$$\\Delta V = V_{peak}-V_{rest}$$',
      body: 'V_peak is the peak membrane voltage and V_rest is resting voltage. If V_peak = +30 mV and V_rest = -70 mV, voltage swing = +30 - (-70) = 100 mV, matching rapid Na+ influx followed by K+ efflux.',
      diagram: actionPotentialGraph(),
    },
    {
      title: 'Estimate conduction speed from distance and time',
      formula:
        '$$v=\\frac{d}{t}$$',
      body: 'v is conduction velocity, d is path length, and t is conduction time. For d = 1.2 m and t = 0.02 s, v = 1.2/0.02 = 60 m/s in a myelinated motor neuron.',
    },
    {
      title: 'Compare continuous and saltatory conduction numerically',
      formula:
        '$$\\text{speed gain}=\\frac{v\\_{saltatory}}{v\\_{continuous}}$$',
      body: 'If a comparable unmyelinated axon conducts at 2 m/s and myelinated saltatory conduction is 60 m/s, speed gain = 60/2 = 30-fold. Nodes allow AP regeneration while myelin reduces membrane capacitance and leak.',
      diagram: wrapBioSvg(
        '<line x1="24" y1="62" x2="276" y2="62" stroke="#334155" stroke-width="3"/><rect x="48" y="52" width="26" height="20" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/><rect x="86" y="52" width="26" height="20" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/><rect x="124" y="52" width="26" height="20" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/><rect x="162" y="52" width="26" height="20" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/>' +
          '<circle cx="80" cy="62" r="3" fill="#ef4444"/><circle cx="118" cy="62" r="3" fill="#ef4444"/><circle cx="156" cy="62" r="3" fill="#ef4444"/>' +
          '<path d="M80 62 L118 62 L156 62 L194 62" fill="none" stroke="#ef4444" stroke-width="2"/>' +
          '<text x="14" y="24" font-size="12">Saltatory conduction across nodes</text><text x="24" y="96" font-size="10">myelin sheaths</text><text x="214" y="62" font-size="10">AP jumps node-to-node</text>',
      ),
    },
    {
      title: 'Integrate structure with excitability',
      body: 'Large axon diameter lowers internal resistance, and myelin increases length constant, so conduction becomes faster and more energy efficient. Na+/K+ ATPase later restores ion gradients after spike trains.',
      takeaway:
        'Resting potential depends on relative ion conductances, and saltatory conduction explains high-speed motor signaling.',
    },
  ],
  solution:
    'Motor neurons propagate signals from soma to muscle through axons. Resting potential is near -70 mV because K+ conductance dominates. Action potentials show rapid depolarization, overshoot, repolarization, and after-hyperpolarization. Velocity follows v=d/t; in myelinated fibers, node-to-node saltatory conduction can increase speed by tens of fold compared with continuous conduction in unmyelinated axons.',
  verifiedPatterns: ['-70 mV', '+30 mV', '100 mV', 'v=d/t', '60 m/s', 'saltatory'],
  minDiagramSteps: 3,
};
