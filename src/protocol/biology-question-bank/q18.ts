import { oxyhaemoglobinCurve, respiratoryPathway, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q18: BiologyQuestionDef = {
  id: 'q18',
  number: 18,
  topic: 'Respiratory Pathway, Gas Transport, Bohr Effect, and Lung Volumes',
  question:
    'In respiratory physiology of a human organism, trace air flow through the respiratory pathway to alveoli, explain oxygen and carbon dioxide transport across alveolar tissue and blood cells, interpret the oxyhaemoglobin dissociation curve including the Bohr effect, and estimate lung function indices such as FEV1/FVC for gas-exchange homeostasis.',
  steps: [
    {
      title: 'Map the respiratory pathway to alveolar exchange',
      body: 'Air travels nose/mouth -> pharynx -> larynx -> trachea -> bronchi -> bronchioles -> alveoli. Thin alveolar-capillary membranes and large surface area support rapid diffusion of O2 into blood and CO2 out of blood.',
      diagram: respiratoryPathway(),
    },
    {
      title: 'Calculate oxygen content carried by haemoglobin',
      formula:
        '$$C_{aO2}\\approx 1.34\\times Hb\\times S_{aO2}$$',
      body: 'C_aO2 is arterial oxygen content (mL O2/dL blood), Hb is haemoglobin concentration, and S_aO2 is O2 saturation fraction. With Hb = 15 g/dL and S_aO2 = 0.98, C_aO2 = 1.34 x 15 x 0.98 = 19.7 mL O2/dL.',
    },
    {
      title: 'Interpret Bohr shift on oxyhaemoglobin curve',
      formula:
        '$$\\Delta P50=P50\\_{acidotic}-P50\\_{normal}$$',
      body: 'P50 is pO2 at 50% haemoglobin saturation. If P50_normal = 26 mmHg and P50_acidotic = 30 mmHg, shift = 30 - 26 = 4 mmHg to the right, indicating lower O2 affinity and improved tissue unloading.',
      diagram: oxyhaemoglobinCurve(),
    },
    {
      title: 'Partition carbon dioxide transport forms',
      formula:
        '$$\\%CO2\\_{total}=\\%\\text{bicarbonate}+\\%\\text{carbamino}+\\%\\text{dissolved}$$',
      body: 'Using typical values, bicarbonate = 70%, carbamino compounds = 23%, dissolved CO2 = 7%, so total = 70 + 23 + 7 = 100%. Carbonic anhydrase in red blood cells accelerates bicarbonate formation.',
    },
    {
      title: 'Compute spirometry indices and obstruction screening',
      formula:
        '$$FEV1/FVC\\;ratio=\\frac{FEV1}{FVC}$$',
      body: 'FEV1 is forced expiratory volume in 1 second and FVC is forced vital capacity. If FEV1 = 2.4 L and FVC = 3.0 L, ratio = 2.4/3.0 = 0.80 = 80%.',
      diagram: wrapBioSvg(
        '<line x1="32" y1="140" x2="272" y2="140" stroke="#334155"/><line x1="32" y1="140" x2="32" y2="26" stroke="#334155"/><path d="M32 132 C64 62, 108 44, 140 44 C184 44, 220 80, 272 124" fill="none" stroke="#1d4ed8" stroke-width="3"/>' +
          '<line x1="108" y1="140" x2="108" y2="44" stroke="#64748b" stroke-dasharray="4 4"/><line x1="168" y1="140" x2="168" y2="52" stroke="#64748b" stroke-dasharray="4 4"/>' +
          '<text x="12" y="26" font-size="10">volume</text><text x="242" y="156" font-size="10">time</text><text x="84" y="38" font-size="9">FEV1</text><text x="156" y="38" font-size="9">FVC</text><text x="14" y="16" font-size="12">Forced expiratory maneuver</text>',
      ),
    },
    {
      title: 'Integrate ventilation and perfusion concepts',
      body: 'Gas exchange depends on ventilation-perfusion matching, diffusion capacity, and blood flow. Right-shifted Hb curves help O2 release during active metabolism, while alveolar ventilation controls blood CO2 and acid-base balance.',
      takeaway:
        'Use C_aO2 for oxygen-carrying capacity, P50 for affinity shifts, and FEV1/FVC for airway assessment.',
    },
  ],
  solution:
    'Respiratory physiology links airway anatomy to alveolar diffusion and blood transport chemistry. Most O2 is carried bound to haemoglobin and can be estimated with C_aO2 ~ 1.34 x Hb x saturation. Bohr effect right-shifts the oxyhaemoglobin curve (higher P50), promoting O2 unloading in metabolically active tissues. Most CO2 is transported as bicarbonate. Spirometry uses FEV1/FVC ratio to assess airflow limitation.',
  verifiedPatterns: ['alveoli', 'C_aO2', 'P50', 'Bohr', 'bicarbonate', 'FEV1/FVC', '0.80'],
  minDiagramSteps: 3,
};
