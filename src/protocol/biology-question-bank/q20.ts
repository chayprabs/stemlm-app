import { glucoseFeedback, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q20: BiologyQuestionDef = {
  id: 'q20',
  number: 20,
  topic: 'Homeostasis, Feedback Control, and Thermoregulation',
  question:
    'In physiology, explain homeostasis using blood glucose regulation as negative feedback, compare positive versus negative feedback systems in cells and organs, and quantify basic thermoregulation responses around a temperature set point.',
  steps: [
    {
      title: 'Define homeostasis as dynamic set-point regulation',
      body: 'Homeostasis maintains internal variables such as blood glucose, temperature, pH, and osmolarity near target ranges through sensors, integrating centers, and effectors. Control is dynamic, not static, and continuously adjusts to disturbance.',
    },
    {
      title: 'Map blood glucose negative feedback pathways',
      formula:
        '$$\\text{Error}=\\text{Set point}-\\text{Measured value}$$',
      body: 'Error is the control deviation from target. If set point = 90 mg/dL and measured glucose after fasting = 70 mg/dL, error = 90 - 70 = 20 mg/dL, promoting glucagon response.',
      diagram: glucoseFeedback(),
    },
    {
      title: 'Compute correction after insulin release',
      formula:
        '$$\\Delta G=G_{after}-G_{before}$$',
      body: 'G_before is pre-correction glucose and G_after is post-correction glucose. If G_before = 160 mg/dL and G_after = 105 mg/dL, change = 105 - 160 = -55 mg/dL, indicating reduction toward set point.',
    },
    {
      title: 'Contrast positive and negative feedback numerically',
      formula:
        '$$\\text{Output}_{next}=\\text{Output}_{current}\\times k$$',
      body: 'k is feedback gain. In positive feedback, if k = 1.4 and output_current = 10 units, output_next = 10 x 1.4 = 14 units (amplification). In negative feedback, if k = 0.6 and output_current = 10 units, output_next = 10 x 0.6 = 6 units (damping).',
      diagram: wrapBioSvg(
        '<rect x="24" y="42" width="110" height="38" fill="#dcfce7" stroke="#166534"/><text x="79" y="58" font-size="10" text-anchor="middle">negative feedback</text><text x="79" y="73" font-size="9" text-anchor="middle">stabilizes variable</text>' +
          '<rect x="166" y="42" width="110" height="38" fill="#fee2e2" stroke="#991b1b"/><text x="221" y="58" font-size="10" text-anchor="middle">positive feedback</text><text x="221" y="73" font-size="9" text-anchor="middle">amplifies variable</text>' +
          '<line x1="79" y1="80" x2="79" y2="126" stroke="#166534"/><line x1="221" y1="80" x2="221" y2="126" stroke="#991b1b"/><text x="44" y="142" font-size="9">error reduced</text><text x="188" y="142" font-size="9">error increased</text>' +
          '<text x="14" y="20" font-size="12">Feedback loop comparison</text>',
      ),
    },
    {
      title: 'Estimate heat exchange in thermoregulation',
      formula:
        '$$Q=mc\\Delta T$$',
      body: 'Q is heat energy, m is body mass of heated tissue, c is specific heat, and DeltaT is temperature change. If m = 2 kg, c = 3500 J/(kg degC), and DeltaT = 0.5 degC, heat change Q = 2 x 3500 x 0.5 = 3500 J.',
      diagram: wrapBioSvg(
        '<circle cx="86" cy="88" r="34" fill="#dbeafe" stroke="#1e3a8a"/><text x="86" y="92" font-size="10" text-anchor="middle">cold</text><circle cx="214" cy="88" r="34" fill="#fee2e2" stroke="#991b1b"/><text x="214" y="92" font-size="10" text-anchor="middle">hot</text>' +
          '<line x1="120" y1="88" x2="180" y2="88" stroke="#334155"/><text x="136" y="80" font-size="9">vasoconstriction</text><text x="134" y="104" font-size="9">vasodilation</text>' +
          '<text x="14" y="20" font-size="12">Thermoregulatory effector responses</text><text x="14" y="156" font-size="10">sweating, shivering, vascular tone changes</text>',
      ),
    },
    {
      title: 'Integrate endocrine and neural control',
      body: 'Pancreatic hormones stabilize blood glucose, while hypothalamic circuits coordinate temperature regulation through autonomic and behavioral outputs. Effective homeostasis depends on intact sensors, signaling pathways, and effector organs.',
      takeaway:
        'Negative feedback reduces error toward set point, while positive feedback amplifies a process until an external stop condition occurs.',
    },
  ],
  solution:
    'Homeostasis uses feedback control to maintain internal biological variables near set points. Blood glucose regulation is a classic negative feedback system using insulin and glucagon. Positive feedback, by contrast, amplifies change temporarily (for example in specific physiological events) until interrupted. thermoregulation uses neural and vascular effectors plus heat transfer physics (Q=mcDeltaT) to counter deviations from temperature targets.',
  verifiedPatterns: ['homeostasis', 'negative feedback', 'insulin', 'glucagon', 'Q=mc', 'thermoregulation'],
  minDiagramSteps: 3,
};
