import { ecgTrace, heartDiagram, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q17: BiologyQuestionDef = {
  id: 'q17',
  number: 17,
  topic: 'Cardiac Anatomy, Blood Flow, Conduction, ECG, and Cardiac Output',
  question:
    'In cardiovascular biology and organ physiology, label heart chambers and vessels, trace blood pathway through cardiac tissue and systemic tissues in the organism, explain cardiac conduction and ECG waves, and estimate cardiac output from stroke volume and heart rate for circulatory homeostasis.',
  steps: [
    {
      title: 'Label heart anatomy and major chambers',
      body: 'The right atrium (RA) and right ventricle (RV) handle deoxygenated blood, while the left atrium (LA) and left ventricle (LV) pump oxygenated blood to systemic tissues. Valves preserve one-way flow under pressure gradients.',
      diagram: heartDiagram(),
    },
    {
      title: 'Trace complete blood path through circulation',
      body: 'Flow sequence is vena cava -> RA -> RV -> pulmonary artery -> lungs -> pulmonary veins -> LA -> LV -> aorta -> systemic capillaries -> vena cava. Pulmonary circulation oxygenates blood; systemic circulation delivers oxygen and nutrients to cells.',
      diagram: wrapBioSvg(
        '<rect x="18" y="34" width="74" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="55" y="50" font-size="9" text-anchor="middle">vena cava</text>' +
          '<rect x="108" y="34" width="44" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="130" y="50" font-size="9" text-anchor="middle">RA/RV</text>' +
          '<rect x="168" y="34" width="58" height="24" fill="#dcfce7" stroke="#166534"/><text x="197" y="50" font-size="9" text-anchor="middle">lungs</text>' +
          '<rect x="234" y="34" width="52" height="24" fill="#fecaca" stroke="#991b1b"/><text x="260" y="50" font-size="9" text-anchor="middle">LA/LV</text>' +
          '<rect x="102" y="112" width="94" height="24" fill="#fef3c7" stroke="#a16207"/><text x="149" y="128" font-size="9" text-anchor="middle">systemic tissues</text>' +
          '<line x1="92" y1="46" x2="108" y2="46" stroke="#334155"/><line x1="152" y1="46" x2="168" y2="46" stroke="#334155"/><line x1="226" y1="46" x2="234" y2="46" stroke="#334155"/><line x1="260" y1="58" x2="188" y2="112" stroke="#334155"/><line x1="102" y1="124" x2="40" y2="58" stroke="#334155"/>' +
          '<text x="14" y="20" font-size="12">Cardiac blood flow pathway</text>',
      ),
    },
    {
      title: 'Summarize intrinsic cardiac conduction sequence',
      formula:
        '$$\\text{PR interval} = t\\_{AV\\,delay} + t\\_{atrial\\,conduction}$$',
      body: 't_AV delay is delay through AV node and t_atrial conduction is impulse travel through atria. If t_AV delay = 0.10 s and t_atrial conduction = 0.06 s, PR interval = 0.10 + 0.06 = 0.16 s.',
    },
    {
      title: 'Interpret ECG components with timing',
      formula:
        '$$HR=\\frac{60}{RR\\;interval\\;(s)}$$',
      body: 'HR is heart rate and RR interval is time between R peaks. If RR interval = 0.83 s, HR = 60/0.83 = 72.3 beats per minute, which is close to 72 bpm.',
      diagram: ecgTrace(),
    },
    {
      title: 'Calculate cardiac output from SV and HR',
      formula:
        '$$CO=SV\\times HR$$',
      body: 'CO is cardiac output, SV is stroke volume, and HR is heart rate. Using SV = 70 mL/beat and HR = 72 beats/min, CO = 70 x 72 = 5040 mL/min = 5.04 L/min.',
    },
    {
      title: 'Relate output to tissue perfusion needs',
      body: 'Cardiac output rises during exercise by increasing both stroke volume and heart rate, while autonomic and endocrine regulation maintain arterial pressure and organ perfusion. Persistent mismatch between demand and output leads to clinical compromise.',
      takeaway:
        'Know blood path order, ECG landmarks, and the core identity CO = SV x HR with unit conversion to L/min.',
    },
  ],
  solution:
    'The heart pumps blood in a one-way path through right heart, lungs, left heart, and systemic tissues. Electrical activation runs SA node to AV node to His-Purkinje, producing ECG waves (P, QRS, T). Heart rate can be estimated from RR interval with HR=60/RR. Use CO=SV x HR for cardiac pumping physiology. With SV=70 mL and HR=72 bpm, cardiac output = 5.04 L/min (5040 mL/min).',
  verifiedPatterns: ['RA', 'RV', 'LA', 'LV', 'HR=60/RR', 'CO=SV x HR', '5.04 L/min'],
  minDiagramSteps: 3,
};
