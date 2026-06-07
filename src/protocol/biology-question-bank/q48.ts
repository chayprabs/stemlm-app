import { chemicalSynapse, reflexArc, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q48: BiologyQuestionDef = {
  id: 'q48',
  number: 48,
  topic: 'Reflex Arc, Somatic vs Autonomic Systems, Neurotransmitters, and Blood-Brain Barrier',
  question:
    'In neurobiology, diagram a reflex arc, compare somatic and autonomic pathways (including sympathetic and parasympathetic divisions), identify major neurotransmitters, and explain blood-brain barrier selectivity.',
  steps: [
    {
      title: 'Trace the reflex arc from receptor to effector',
      body: 'Reflex arc sequence = receptor -> sensory neuron -> spinal interneuron -> motor neuron -> effector. Reflex latency is short because processing loop = local spinal circuit, while conscious perception can occur after the motor response begins.',
      diagram: reflexArc(),
    },
    {
      title: 'Contrast somatic and autonomic efferent architecture',
      formula:
        '$$\\text{somatic pathway}=1\\,\\text{motor neuron}$$\n$$\\text{autonomic pathway}=\\text{preganglionic}+\\text{postganglionic}=2\\,\\text{neurons}$$',
      body: 'Somatic output uses one lower motor neuron from CNS to skeletal muscle. Autonomic output uses two-neuron chains via peripheral ganglia. Therefore neuron count = 1 in somatic versus 2 in autonomic, which changes synaptic control and modulation.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Somatic vs autonomic pathways</text>' +
          '<rect x="24" y="42" width="118" height="96" fill="#dbeafe" stroke="#1e3a8a"/><text x="83" y="60" font-size="10" text-anchor="middle">somatic</text><line x1="52" y1="86" x2="114" y2="86" stroke="#1e3a8a" stroke-width="2"/><text x="83" y="102" font-size="8" text-anchor="middle">single motor neuron</text>' +
          '<rect x="158" y="42" width="118" height="96" fill="#fee2e2" stroke="#991b1b"/><text x="217" y="60" font-size="10" text-anchor="middle">autonomic</text><line x1="178" y1="86" x2="214" y2="86" stroke="#991b1b" stroke-width="2"/><circle cx="220" cy="86" r="4" fill="#991b1b"/><line x1="224" y1="86" x2="254" y2="86" stroke="#991b1b" stroke-width="2"/><text x="217" y="102" font-size="8" text-anchor="middle">pregang + postgang</text>',
      ),
    },
    {
      title: 'Differentiate sympathetic and parasympathetic effects',
      formula:
        '$$\\text{net heart-rate change}=\\Delta HR_{sym}+\\Delta HR_{para}$$\n$$+18+(-10)=+8\\,\\text{bpm}$$',
      body: 'Sympathetic division (fight-or-flight) typically increases heart rate and bronchodilation. Parasympathetic division (rest-and-digest) typically decreases heart rate and supports digestive activity. If sympathetic effect = +18 bpm and parasympathetic effect = -10 bpm, net change = +8 bpm.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Autonomic divisions</text>' +
          '<rect x="24" y="44" width="118" height="90" fill="#fecaca" stroke="#991b1b"/><text x="83" y="62" font-size="10" text-anchor="middle">sympathetic</text><text x="83" y="82" font-size="9" text-anchor="middle">pupil dilation</text><text x="83" y="100" font-size="9" text-anchor="middle">HR up</text>' +
          '<rect x="158" y="44" width="118" height="90" fill="#dcfce7" stroke="#166534"/><text x="217" y="62" font-size="10" text-anchor="middle">parasympathetic</text><text x="217" y="82" font-size="9" text-anchor="middle">pupil constriction</text><text x="217" y="100" font-size="9" text-anchor="middle">HR down</text>',
      ),
    },
    {
      title: 'Link neurotransmitter release to postsynaptic signaling',
      formula:
        '$$\\text{occupancy}=\\frac{[L]}{K_d+[L]}\\;\\text{with }[L]=2\\,\\mu M,\\;K_d=1\\,\\mu M\\Rightarrow \\frac{2}{3}=0.667$$',
      body: 'Common neurotransmitters include glutamate (major excitatory), GABA (major inhibitory), acetylcholine, dopamine, serotonin, and norepinephrine. With ligand concentration = 2 uM and Kd = 1 uM, occupancy = 0.667 (66.7%), which predicts strong but not saturated receptor activation.',
      diagram: chemicalSynapse(),
    },
    {
      title: 'Explain blood-brain barrier filtering principles',
      formula:
        '$$\\text{permeability index}=\\frac{P_{drug}}{P_{water}}=\\frac{0.04}{1.00}=0.04$$',
      body: 'Blood-brain barrier structure = endothelial tight junctions, basement membrane, pericytes, and astrocyte endfeet. Molecule entry depends on lipophilicity, size, charge, and transporter access. If permeability index = 0.04, BBB passage is low and CNS exposure remains limited.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Blood-brain barrier</text>' +
          '<rect x="28" y="58" width="244" height="34" fill="#dbeafe" stroke="#1e3a8a"/><text x="150" y="78" font-size="9" text-anchor="middle">endothelial cells with tight junctions</text>' +
          '<line x1="78" y1="58" x2="78" y2="92" stroke="#334155"/><line x1="126" y1="58" x2="126" y2="92" stroke="#334155"/><line x1="174" y1="58" x2="174" y2="92" stroke="#334155"/><line x1="222" y1="58" x2="222" y2="92" stroke="#334155"/>' +
          '<ellipse cx="74" cy="120" rx="24" ry="10" fill="#dcfce7" stroke="#166534"/><ellipse cx="226" cy="120" rx="24" ry="10" fill="#dcfce7" stroke="#166534"/><text x="150" y="136" font-size="9" text-anchor="middle">astrocyte endfeet + pericyte support</text>',
      ),
    },
    {
      title: 'Synthesize CNS and PNS signaling architecture',
      body: 'Rapid protection uses spinal reflex circuits, while autonomic and neurotransmitter systems tune organ physiology over multiple timescales. BBB selectivity maintains neural microenvironment stability, which is essential for reliable synaptic transmission and brain homeostasis.',
      takeaway:
        'Exam anchors: reflex arc order, somatic vs autonomic neuron count, sympathetic/parasympathetic opposition, and BBB tight-junction barrier function.',
    },
  ],
  solution:
    'A reflex arc runs receptor -> sensory neuron -> interneuron -> motor neuron -> effector and supports rapid involuntary responses. Somatic pathways use one motor neuron to skeletal muscle, while autonomic pathways use preganglionic and postganglionic neurons. Sympathetic activity typically increases heart rate and mobilization, whereas parasympathetic activity supports rest-and-digest functions. Neurotransmission depends on ligand-receptor binding dynamics. The blood-brain barrier uses tight junctions and supporting glial/pericyte elements to restrict and regulate CNS entry of molecules.',
  verifiedPatterns: ['reflex arc', 'somatic', 'autonomic', 'sympathetic', 'parasympathetic', 'glutamate', 'GABA', 'blood-brain barrier', '66.7%'],
  minDiagramSteps: 4,
};
