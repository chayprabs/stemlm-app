import { wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q29: BiologyQuestionDef = {
  id: 'q29',
  number: 29,
  topic: 'Innate Immunity, Inflammation, Phagocytosis, and Complement',
  question:
    'In immunology, describe innate immunity barriers, explain the cardinal signs of inflammation, outline phagocytosis, and summarize complement-system antimicrobial actions.',
  steps: [
    {
      title: 'Map first-line innate immune barriers',
      body: 'Innate barriers include intact skin, mucous membranes, ciliary clearance, gastric acid, lysozyme in secretions, and normal microbiota. These defenses act immediately and nonspecifically before adaptive immunity develops.',
      diagram: wrapBioSvg(
        '<rect x="18" y="24" width="264" height="124" fill="#f8fafc" stroke="#334155"/>' +
          '<circle cx="64" cy="68" r="22" fill="#dbeafe" stroke="#1e3a8a"/><text x="64" y="72" font-size="9" text-anchor="middle">skin</text>' +
          '<circle cx="122" cy="68" r="22" fill="#dcfce7" stroke="#166534"/><text x="122" y="72" font-size="9" text-anchor="middle">mucus</text>' +
          '<circle cx="180" cy="68" r="22" fill="#fef3c7" stroke="#a16207"/><text x="180" y="72" font-size="9" text-anchor="middle">acid</text>' +
          '<circle cx="238" cy="68" r="22" fill="#fee2e2" stroke="#991b1b"/><text x="238" y="72" font-size="9" text-anchor="middle">microbiota</text>' +
          '<text x="150" y="20" font-size="11" text-anchor="middle">innate physical and chemical barriers</text>',
      ),
    },
    {
      title: 'List and explain cardinal inflammation signs',
      body: 'Classical signs are rubor (redness), calor (heat), tumor (swelling), dolor (pain), and functio laesa (loss of function). Vasodilation and increased vascular permeability produce most visible signs, while mediators such as prostaglandins and bradykinin contribute to pain.',
      diagram: wrapBioSvg(
        '<rect x="24" y="30" width="252" height="118" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="42" y="58" font-size="10">rubor</text><text x="102" y="58" font-size="10">calor</text><text x="162" y="58" font-size="10">tumor</text><text x="222" y="58" font-size="10">dolor</text>' +
          '<line x1="42" y1="66" x2="42" y2="116" stroke="#ef4444"/><line x1="102" y1="66" x2="102" y2="116" stroke="#f97316"/><line x1="162" y1="66" x2="162" y2="116" stroke="#3b82f6"/><line x1="222" y1="66" x2="222" y2="116" stroke="#8b5cf6"/>' +
          '<text x="150" y="136" font-size="10" text-anchor="middle">+ functio laesa (loss of function)</text>',
      ),
    },
    {
      title: 'Calculate phagocyte demand for bacterial clearance',
      formula:
        '$$\\text{required phagocytes}=\\frac{\\text{bacterial load}}{\\text{bacteria cleared per phagocyte}}$$\n$$2.0\\times10^5\\;\\text{bacteria}/20\\;\\text{per neutrophil}=1.0\\times10^4\\;\\text{neutrophils}$$',
      body: 'If each activated neutrophil clears 20 bacteria, clearing 200,000 bacteria needs 10,000 neutrophils, and 10000x20 = 200000 confirms the estimate. Opsonization by C3b or IgG can increase per-cell uptake and reduce the number of phagocytes required.',
      diagram: wrapBioSvg(
        '<circle cx="72" cy="90" r="28" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>' +
          '<circle cx="64" cy="82" r="4" fill="#ef4444"/><circle cx="82" cy="96" r="4" fill="#ef4444"/><circle cx="72" cy="102" r="4" fill="#ef4444"/>' +
          '<line x1="120" y1="90" x2="186" y2="90" stroke="#334155"/>' +
          '<circle cx="232" cy="90" r="24" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/><circle cx="224" cy="90" r="4" fill="#1d4ed8"/><circle cx="234" cy="98" r="4" fill="#1d4ed8"/>' +
          '<text x="72" y="134" font-size="9" text-anchor="middle">phagocyte engulfs</text><text x="232" y="134" font-size="9" text-anchor="middle">phagolysosome kill</text>',
      ),
    },
    {
      title: 'Summarize complement pathways and outcomes',
      formula:
        '$$\\text{effective survivors}=N_0(1-k)$$\n$$N_0=50000,\\;k=0.70\\Rightarrow N=50000(0.30)=15000$$',
      body: 'Complement activation (classical, lectin, alternative) converges on C3 convertase, generating C3b opsonization and C5b-9 membrane attack complex formation. If complement kills 70% of 50,000 bacteria, survivors = 15,000 before additional phagocytic clearance.',
      diagram: wrapBioSvg(
        '<rect x="24" y="40" width="74" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="61" y="56" font-size="9" text-anchor="middle">classical</text>' +
          '<rect x="24" y="74" width="74" height="24" fill="#dcfce7" stroke="#166534"/><text x="61" y="90" font-size="9" text-anchor="middle">lectin</text>' +
          '<rect x="24" y="108" width="74" height="24" fill="#fef3c7" stroke="#a16207"/><text x="61" y="124" font-size="9" text-anchor="middle">alternative</text>' +
          '<rect x="122" y="74" width="72" height="24" fill="#e2e8f0" stroke="#334155"/><text x="158" y="90" font-size="9" text-anchor="middle">C3 convertase</text>' +
          '<rect x="214" y="50" width="62" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="245" y="66" font-size="9" text-anchor="middle">C3b opsonin</text>' +
          '<rect x="214" y="98" width="62" height="24" fill="#fecaca" stroke="#991b1b"/><text x="245" y="114" font-size="9" text-anchor="middle">MAC lysis</text>' +
          '<line x1="98" y1="52" x2="122" y2="84" stroke="#334155"/><line x1="98" y1="86" x2="122" y2="84" stroke="#334155"/><line x1="98" y1="120" x2="122" y2="84" stroke="#334155"/><line x1="194" y1="84" x2="214" y2="62" stroke="#334155"/><line x1="194" y1="84" x2="214" y2="110" stroke="#334155"/>' +
          '<text x="150" y="24" font-size="11" text-anchor="middle">complement convergence and effector functions</text>',
      ),
    },
    {
      title: 'Give an exam-ready synthesis line',
      body: 'For full-credit answers, connect mechanism to outcome across time: barrier breach triggers inflammatory mediators, recruited phagocytes and complement lower pathogen load, and reduced load limits tissue damage. Innate immunity is rapid and broad but lacks antigen-specific memory.',
      takeaway:
        'Key terms: rubor, calor, tumor, dolor, phagocytosis, C3b opsonization, and MAC.',
    },
  ],
  solution:
    'Innate immunity begins with physical and chemical barriers, then deploys inflammation, phagocytes, and complement after breach. Cardinal inflammation signs are rubor, calor, tumor, dolor, and often functio laesa. Phagocytosis involves recognition, engulfment, and intracellular killing; in the worked example 200,000 bacteria required about 10,000 neutrophils at 20 bacteria per cell. Complement pathways converge on C3 activation, producing opsonization and lytic MAC formation that further reduce pathogen burden.',
  verifiedPatterns: ['innate immunity', 'rubor', 'calor', 'phagocytosis', 'complement', 'MAC'],
  minDiagramSteps: 4,
};
