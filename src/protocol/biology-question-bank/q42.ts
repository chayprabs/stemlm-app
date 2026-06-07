import { checkpointDiagram, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q42: BiologyQuestionDef = {
  id: 'q42',
  number: 42,
  topic: 'Proto-oncogenes, Tumor Suppressors, p53, and Cancer Progression',
  question:
    'In cancer biology, distinguish proto-oncogenes from oncogenes and tumor suppressors (including p53), compare benign and malignant tumor cell behavior with metastasis, and evaluate major DNA-mutation cancer risk factors quantitatively.',
  steps: [
    {
      title: 'Classify proto-oncogene, oncogene, and tumor suppressor roles',
      body: 'proto-oncogene function = regulated growth signaling. Oncogene function = constitutively active growth signaling (gain-of-function). Tumor suppressor function = growth restraint and genome protection (loss-of-function in cancer).',
      diagram: wrapBioSvg(
        '<rect x="16" y="26" width="268" height="116" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="94" y1="26" x2="94" y2="142" stroke="#334155"/><line x1="190" y1="26" x2="190" y2="142" stroke="#334155"/><line x1="16" y1="50" x2="284" y2="50" stroke="#334155"/>' +
          '<text x="54" y="42" font-size="10" text-anchor="middle">class</text><text x="142" y="42" font-size="10" text-anchor="middle">normal role</text><text x="238" y="42" font-size="10" text-anchor="middle">cancer state</text>' +
          '<text x="54" y="74" font-size="9" text-anchor="middle">proto-oncogene</text><text x="142" y="74" font-size="9" text-anchor="middle">controlled growth</text><text x="238" y="74" font-size="9" text-anchor="middle">oncogene active</text>' +
          '<text x="54" y="102" font-size="9" text-anchor="middle">tumor suppressor</text><text x="142" y="102" font-size="9" text-anchor="middle">checkpoint/repair</text><text x="238" y="102" font-size="9" text-anchor="middle">loss inactivation</text>',
      ),
    },
    {
      title: 'Place p53 in checkpoint and apoptosis control',
      formula:
        '$$\\text{DNA damage}\\Rightarrow p53\\uparrow\\Rightarrow p21\\uparrow\\Rightarrow \\text{G1/S arrest}$$',
      body: 'p53 is a tumor suppressor transcription factor. When damage signal = high, p53 activity = high, so p21 expression = high and CDK activity = low, which blocks G1 to S transition. If damage is irreparable, p53 output can switch from arrest to apoptosis.',
      diagram: checkpointDiagram(),
    },
    {
      title: 'Compare benign and malignant tumor behavior',
      body: 'Benign tumor growth = localized and non-invasive. Malignant tumor growth = invasive, angiogenic, and metastatic. metastasis rate = near 0 for benign lesions but rate > 0 for malignant tumors that intravasate, survive circulation, extravasate, and colonize distant tissue.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Benign vs malignant spread</text>' +
          '<circle cx="84" cy="88" r="34" fill="#dcfce7" stroke="#166534" stroke-width="2"/><text x="84" y="92" font-size="10" text-anchor="middle">benign</text>' +
          '<circle cx="204" cy="88" r="34" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/><text x="204" y="92" font-size="10" text-anchor="middle">malignant</text>' +
          '<line x1="236" y1="72" x2="274" y2="44" stroke="#991b1b" stroke-width="2"/><circle cx="280" cy="40" r="6" fill="#ef4444"/>' +
          '<line x1="236" y1="102" x2="274" y2="130" stroke="#991b1b" stroke-width="2"/><circle cx="280" cy="134" r="6" fill="#ef4444"/>' +
          '<text x="246" y="164" font-size="9">metastatic foci</text>',
      ),
    },
    {
      title: 'Quantify risk-factor impact with relative risk',
      formula:
        '$$\\text{risk}_{\\text{exposed}}=\\text{risk}_{\\text{baseline}}\\times RR$$\n$$0.10\\times 2.5=0.25$$',
      body: 'If baseline lifetime risk = 0.10 and smoking-associated RR = 2.5, exposed risk = 0.25. Absolute risk increase = 0.25 - 0.10 = 0.15 (15 percentage points). This math highlights why carcinogen exposure reduction substantially lowers population burden.',
    },
    {
      title: 'Model multistep carcinogenesis probability',
      formula:
        '$$P(\\ge 1\\;\\text{driver hit})=1-(1-u)^N$$\n$$u=10^{-6},\\;N=20{,}000\\Rightarrow P\\approx1-(0.999999)^{20000}\\approx0.0198$$',
      body: 'In a simple independent-hit model, u = per-gene mutation probability and N = effective target genes/divisions. With u = 10^-6 and N = 20,000, probability = 0.0198 (about 1.98%). Additional hits plus selection are required for full malignant transformation.',
    },
    {
      title: 'Integrate mechanisms and prevention priorities',
      body: 'Cancer progression combines genome instability, dysregulated proliferation, evasion of apoptosis, angiogenesis, and immune escape. Prevention leverage = lowering mutagen exposure (tobacco, UV, carcinogens), increasing early detection, and maintaining protective behaviors such as vaccination and screening.',
      takeaway:
        'Exam anchors: proto-oncogene gain-of-function, tumor suppressor loss-of-function, p53 checkpoint control, and metastasis as a defining malignant feature.',
    },
  ],
  solution:
    'Proto-oncogenes normally promote controlled proliferation, but activating mutations convert them to oncogenes. Tumor suppressors such as p53 restrain proliferation and preserve genome integrity; loss of their function promotes tumorigenesis. Benign tumors remain localized, whereas malignant tumors invade and metastasize. Risk factors (for example smoking, radiation, carcinogens, inherited variants) shift probability of disease, and simple risk arithmetic can quantify this shift. Cancer is a multistep evolutionary process requiring accumulated genetic and epigenetic changes.',
  verifiedPatterns: ['proto-oncogene', 'oncogene', 'tumor suppressor', 'p53', 'metastasis', '2.5', '0.25', '0.0198'],
  minDiagramSteps: 3,
};
