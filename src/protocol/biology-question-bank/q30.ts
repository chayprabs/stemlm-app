import { lymphocytes, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q30: BiologyQuestionDef = {
  id: 'q30',
  number: 30,
  topic: 'Adaptive Immunity: B Cells, T Cells, MHC, and Immunization',
  question:
    'In adaptive immunity, interpret B-cell and T-cell roles, compare antigen presentation by MHC I and MHC II, explain clonal selection, and distinguish active versus passive immunity.',
  steps: [
    {
      title: 'Identify major lymphocyte classes and functions',
      body: 'B cells mediate humoral immunity through antibody production, helper T cells coordinate immune responses via cytokines, and cytotoxic T cells kill infected cells. NK cells are lymphocytes of innate-like cytotoxic defense.',
      diagram: lymphocytes(),
    },
    {
      title: 'Compare MHC I and MHC II antigen presentation',
      formula:
        '$$\\text{MHC I}\\to\\text{CD8}^+\\text{ T cells},\\qquad \\text{MHC II}\\to\\text{CD4}^+\\text{ T cells}$$',
      body: 'MHC I is on nearly all nucleated cells and presents endogenous peptides (for example viral proteins) to CD8+ T cells, while MHC II is on professional APCs and presents exogenous peptides to CD4+ T cells. Example count: if 120 peptide-MHC I complexes and 80 peptide-MHC II complexes are detected, total presented complexes = 120+80 = 200.',
      diagram: wrapBioSvg(
        '<rect x="20" y="30" width="118" height="120" fill="#f8fafc" stroke="#334155"/>' +
          '<rect x="162" y="30" width="118" height="120" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="79" y="22" font-size="10" text-anchor="middle">MHC I pathway</text>' +
          '<text x="221" y="22" font-size="10" text-anchor="middle">MHC II pathway</text>' +
          '<text x="30" y="52" font-size="9">all nucleated cells</text><text x="30" y="72" font-size="9">endogenous peptide</text><text x="30" y="92" font-size="9">presents to CD8+</text><text x="30" y="112" font-size="9">cytotoxic killing</text>' +
          '<text x="172" y="52" font-size="9">APCs (DC/macrophage/B)</text><text x="172" y="72" font-size="9">exogenous peptide</text><text x="172" y="92" font-size="9">presents to CD4+</text><text x="172" y="112" font-size="9">helper activation</text>',
      ),
    },
    {
      title: 'Quantify clonal selection and expansion',
      formula:
        '$$N_t=N_0\\times2^n$$\n$$N_0=1\\;\\text{naive clone},\\;n=12\\Rightarrow N_t=2^{12}=4096$$',
      body: 'If one antigen-specific lymphocyte completes 12 successful divisions, clone size reaches 4096 cells. If 20% become long-lived memory cells, memory pool = 0.20x4096 = 819.2 about 819 cells.',
      diagram: wrapBioSvg(
        '<circle cx="44" cy="88" r="14" fill="#dbeafe" stroke="#1e3a8a"/><text x="44" y="92" font-size="9" text-anchor="middle">1</text>' +
          '<circle cx="94" cy="64" r="12" fill="#dcfce7" stroke="#166534"/><circle cx="94" cy="112" r="12" fill="#dcfce7" stroke="#166534"/>' +
          '<circle cx="144" cy="52" r="10" fill="#bbf7d0" stroke="#15803d"/><circle cx="144" cy="76" r="10" fill="#bbf7d0" stroke="#15803d"/><circle cx="144" cy="100" r="10" fill="#bbf7d0" stroke="#15803d"/><circle cx="144" cy="124" r="10" fill="#bbf7d0" stroke="#15803d"/>' +
          '<rect x="188" y="58" width="92" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="234" y="74" font-size="9" text-anchor="middle">effector pool</text>' +
          '<rect x="188" y="96" width="92" height="24" fill="#fef3c7" stroke="#a16207"/><text x="234" y="112" font-size="9" text-anchor="middle">memory pool</text>' +
          '<text x="150" y="20" font-size="11" text-anchor="middle">clonal selection and differentiation</text>',
      ),
    },
    {
      title: 'Contrast active and passive immunity with timeline',
      formula:
        '$$\\text{active immunity: response latency}\\approx 7\\text{ days initial},\\;\\text{faster on booster}$$\n$$\\text{passive IgG half-life}\\approx21\\text{ days}:\\;100\\to50\\to25\\;\\text{units in }42\\text{ days}$$',
      body: 'Active immunity (infection or vaccination) induces memory and long-term protection. Passive immunity (maternal antibodies or antiserum) provides immediate protection but decays as antibodies are catabolized: day 0 titer = 100 units, day 21 = 50 units, and day 42 = 25 units without new production.',
    },
    {
      title: 'Apply primary versus secondary response numerically',
      formula:
        '$$\\text{primary titer}=1:80,\\;\\text{secondary titer}=1:640\\Rightarrow \\text{fold rise}=\\frac{640}{80}=8$$',
      body: 'Fold rise = 640/80 = 8, so the booster response is eight times higher than the primary titer. This faster, stronger secondary response reflects memory B-cell activation and supports booster vaccination schedules.',
    },
    {
      title: 'Write a complete adaptive-immunity summary',
      body: 'Antigen presentation through MHC determines which T-cell subset is activated, clonal selection amplifies specific lymphocytes, and immunity type determines durability. Active immunity is slower to start but durable; passive immunity is immediate but transient.',
      takeaway:
        'High-yield chain: antigen presentation -> clonal expansion -> effector function -> memory protection.',
    },
  ],
  solution:
    'Adaptive immunity involves coordinated B-cell antibody responses and T-cell mediated cellular responses. MHC I presents endogenous peptides to CD8+ cytotoxic T cells, while MHC II presents exogenous peptides to CD4+ helper T cells. Clonal selection amplifies antigen-specific lymphocytes (for example 1 to 4096 after 12 divisions) and generates memory subsets. Active immunity (infection/vaccination) builds immune memory, whereas passive immunity gives immediate but short-lived protection as transferred antibodies decay.',
  verifiedPatterns: ['B cells', 'T cells', 'MHC I', 'MHC II', 'clonal selection', 'active immunity', 'passive immunity'],
  minDiagramSteps: 3,
};
