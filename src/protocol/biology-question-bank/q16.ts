import { chemicalSynapse, summationSketch, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q16: BiologyQuestionDef = {
  id: 'q16',
  number: 16,
  topic: 'Chemical Synapse Signaling, Summation, and Neuropharmacology',
  question:
    'In synaptic neurobiology, explain chemical synapse transmission, distinguish EPSP and IPSP effects on neuron membrane potential, compute temporal/spatial summation outcomes, and interpret actions of cocaine, botulinum toxin, and curare.',
  steps: [
    {
      title: 'Outline chemical synapse transmission sequence',
      body: 'An arriving axon action potential opens voltage-gated Ca2+ channels, vesicles fuse with presynaptic membrane, neurotransmitter diffuses across the cleft, and ligand-gated receptors change postsynaptic ion conductance.',
      diagram: chemicalSynapse(),
    },
    {
      title: 'Quantify net postsynaptic potential from EPSP and IPSP',
      formula:
        '$$V_{post}=V_{rest}+\\sum EPSP-\\sum IPSP$$',
      body: 'V_post is postsynaptic membrane potential and V_rest is resting value. If V_rest = -70 mV, total EPSP = +18 mV, and total IPSP = 6 mV, then V_post = -70 + 18 - 6 = -58 mV.',
    },
    {
      title: 'Determine threshold crossing by temporal summation',
      formula:
        '$$\\text{Net depolarization}=n\\times EPSP\\_{single}$$',
      body: 'n is the number of closely spaced EPSPs and EPSP_single is depolarization per event. With n = 4 and EPSP_single = 4 mV, net depolarization = 4 x 4 = 16 mV; from -70 mV this reaches -70 + 16 = -54 mV, crossing a -55 mV threshold.',
      diagram: summationSketch(),
    },
    {
      title: 'Compare spatial summation with mixed inputs',
      formula:
        '$$\\Delta V\\_{net}=\\sum EPSP\\_{sites}-\\sum IPSP\\_{sites}$$',
      body: 'If three excitatory synapses contribute +5, +4, and +3 mV while one inhibitory synapse contributes 7 mV, net change = (5 + 4 + 3) - 7 = 5 mV. New Vm = -70 + 5 = -65 mV, below threshold.',
      diagram: wrapBioSvg(
        '<circle cx="76" cy="92" r="24" fill="#fee2e2" stroke="#991b1b"/><line x1="100" y1="92" x2="246" y2="92" stroke="#374151" stroke-width="3"/><rect x="170" y="80" width="60" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="200" y="96" font-size="9" text-anchor="middle">axon hillock</text>' +
          '<line x1="22" y1="56" x2="52" y2="78" stroke="#16a34a" stroke-width="2"/><line x1="22" y1="86" x2="52" y2="90" stroke="#16a34a" stroke-width="2"/><line x1="22" y1="116" x2="52" y2="102" stroke="#16a34a" stroke-width="2"/><line x1="22" y1="138" x2="52" y2="108" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="10" y="54" font-size="9" fill="#16a34a">E1</text><text x="10" y="84" font-size="9" fill="#16a34a">E2</text><text x="10" y="114" font-size="9" fill="#16a34a">E3</text><text x="10" y="138" font-size="9" fill="#dc2626">I1</text>' +
          '<text x="14" y="20" font-size="12">Spatial summation at dendritic tree</text>',
      ),
    },
    {
      title: 'Map drug mechanisms to synaptic physiology',
      formula:
        '$$\\text{Signal gain}=\\frac{\\text{synaptic response with drug}}{\\text{baseline response}}$$',
      body: 'Cocaine blocks monoamine reuptake, botulinum toxin blocks ACh vesicle release, and curare blocks nicotinic ACh receptors at neuromuscular junctions. If baseline response = 12 units and cocaine response = 18 units, signal gain = 18/12 = 1.5.',
    },
    {
      title: 'Conclude excitatory-inhibitory balance logic',
      body: 'Neuron firing reflects integrated EPSP/IPSP balance over space and time. Synaptic toxins and pharmacological agents alter release, receptor binding, or reuptake, which shifts network excitability and behavior.',
      takeaway:
        'Use Vm arithmetic at the axon hillock to decide spike/no-spike, then link each drug to its specific synaptic target.',
    },
  ],
  solution:
    'Chemical synapses convert electrical signals to neurotransmitter release and then back to electrical responses in the postsynaptic neuron. EPSPs depolarize and IPSPs hyperpolarize, and their temporal/spatial summation determines threshold crossing. Cocaine enhances signaling by blocking reuptake, botulinum toxin suppresses signaling by preventing vesicle release, and curare blocks cholinergic receptor activation at the neuromuscular synapse.',
  verifiedPatterns: ['EPSP', 'IPSP', '-55 mV', 'summation', 'cocaine', 'botulinum', 'curare'],
  minDiagramSteps: 3,
};
