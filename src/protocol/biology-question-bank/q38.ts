import { glucoseFeedback, hpaAxis, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q38: BiologyQuestionDef = {
  id: 'q38',
  number: 38,
  topic: 'Nervous vs Endocrine Signaling, HPA Axis, and Diabetes',
  question:
    'Compare nervous and endocrine communication, contrast steroid and peptide hormones, interpret the HPA axis diagram, and distinguish type 1 from type 2 diabetes.',
  steps: [
    {
      title: 'Compare nervous and endocrine control systems',
      body: 'Nervous signaling is rapid and targeted via action potentials and synapses, while endocrine signaling is slower and systemic via circulating hormones. Response profile = milliseconds in neural pathways versus minutes to hours in many endocrine pathways.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Nervous vs endocrine</text>' +
          '<rect x="24" y="34" width="116" height="118" fill="#dbeafe" stroke="#1e3a8a"/><text x="34" y="54" font-size="10">nervous</text><text x="34" y="74" font-size="9">electrical spikes</text><text x="34" y="92" font-size="9">synaptic neurotransmitter</text><text x="34" y="110" font-size="9">fast, precise</text>' +
          '<rect x="160" y="34" width="116" height="118" fill="#dcfce7" stroke="#166534"/><text x="170" y="54" font-size="10">endocrine</text><text x="170" y="74" font-size="9">hormones in blood</text><text x="170" y="92" font-size="9">widespread targets</text><text x="170" y="110" font-size="9">slower, sustained</text>',
      ),
    },
    {
      title: 'Differentiate steroid and peptide hormones',
      body: 'Steroid hormones are lipid-soluble and often bind intracellular receptors to regulate transcription, whereas peptide hormones are water-soluble and bind membrane receptors with second-messenger cascades. Signaling mode = genomic for many steroids and rapid phospho-signaling for many peptides.',
    },
    {
      title: 'Interpret HPA axis negative feedback',
      formula:
        '$$\\text{Hypothalamus (CRH)} \\rightarrow \\text{Pituitary (ACTH)} \\rightarrow \\text{Adrenal cortex (cortisol)}$$',
      body: 'Stress elevates CRH then ACTH then cortisol, while cortisol feeds back to suppress CRH/ACTH release. If cortisol output = persistently high, upstream drive is normally reduced by negative feedback.',
      diagram: hpaAxis(),
    },
    {
      title: 'Apply glucose homeostasis to endocrine pathology',
      body: 'Insulin from beta cells lowers blood glucose by promoting uptake/storage, while glucagon from alpha cells raises glucose by mobilizing hepatic stores. Homeostatic setpoint = dynamic balance between these counter-regulatory hormones.',
      diagram: glucoseFeedback(),
    },
    {
      title: 'Distinguish diabetes type 1 and type 2',
      formula:
        '$$\\text{mmol/L} = \\frac{\\text{mg/dL}}{18}$$\n$$126\\,\\text{mg/dL} = 7.0\\,\\text{mmol/L}$$',
      body: 'Type 1 diabetes is autoimmune beta-cell destruction causing absolute insulin deficiency, while type 2 diabetes features insulin resistance with relative secretory failure over time. Diagnostic conversion = 126 mg/dL fasting glucose equivalent to 7.0 mmol/L.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Type 1 vs Type 2 diabetes</text>' +
          '<rect x="24" y="36" width="114" height="114" fill="#fee2e2" stroke="#991b1b"/><text x="34" y="56" font-size="10">Type 1</text><text x="34" y="76" font-size="9">autoimmune</text><text x="34" y="94" font-size="9">low insulin</text><text x="34" y="112" font-size="9">often early onset</text>' +
          '<rect x="162" y="36" width="114" height="114" fill="#fef3c7" stroke="#a16207"/><text x="172" y="56" font-size="10">Type 2</text><text x="172" y="76" font-size="9">insulin resistance</text><text x="172" y="94" font-size="9">relative deficiency</text><text x="172" y="112" font-size="9">often metabolic syndrome</text>',
      ),
    },
    {
      title: 'Integrate endocrine-neural coordination in physiology',
      body: 'The hypothalamus links neural inputs to endocrine outputs, coordinating stress, metabolism, and circadian physiology. Clinical interpretation = combine hormone labs, feedback logic, and target-organ effects instead of single-value reasoning.',
      takeaway:
        'Remember contrast pairs: nervous-fast/local vs endocrine-slower/systemic, steroid-intracellular vs peptide-membrane receptor, and type 1 autoimmunity vs type 2 resistance.',
    },
  ],
  solution:
    'Nervous and endocrine systems both regulate physiology but differ in speed, range, and signaling medium. Steroid hormones usually act through intracellular receptors and transcriptional effects, while peptide hormones act via membrane receptors and signaling cascades. The HPA axis proceeds CRH -> ACTH -> cortisol with negative feedback. Glucose control depends on insulin and glucagon. Type 1 diabetes is primarily autoimmune insulin deficiency, whereas type 2 is dominated by insulin resistance and progressive beta-cell dysfunction.',
  verifiedPatterns: ['nervous', 'endocrine', 'steroid hormone', 'peptide hormone', 'HPA axis', 'cortisol', 'type 1 diabetes', 'type 2 diabetes'],
  minDiagramSteps: 4,
};
