import { wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q45: BiologyQuestionDef = {
  id: 'q45',
  number: 45,
  topic: 'Cell Signalling: Reception, Transduction, RTK Pathway, and Amplification',
  question:
    'In cell signalling biology, describe reception-transduction-response stages, map a receptor tyrosine kinase (RTK) pathway, compare cAMP and Ca2+ second messengers, and compute signal amplification quantitatively.',
  steps: [
    {
      title: 'Define reception, transduction, and response modules',
      body: 'Reception = ligand binds receptor, transduction = intracellular relay modifies proteins/second messengers, response = measurable output such as gene expression or metabolism. Signalling logic = input-specific and context-dependent because the same ligand can trigger different responses in different cell types.',
      diagram: wrapBioSvg(
        '<rect x="20" y="64" width="74" height="28" fill="#dbeafe" stroke="#1e3a8a"/><text x="57" y="82" font-size="10" text-anchor="middle">reception</text>' +
          '<rect x="112" y="64" width="86" height="28" fill="#dcfce7" stroke="#166534"/><text x="155" y="82" font-size="10" text-anchor="middle">transduction</text>' +
          '<rect x="214" y="64" width="66" height="28" fill="#fee2e2" stroke="#991b1b"/><text x="247" y="82" font-size="10" text-anchor="middle">response</text>' +
          '<line x1="94" y1="78" x2="112" y2="78" stroke="#334155"/><line x1="198" y1="78" x2="214" y2="78" stroke="#334155"/>' +
          '<text x="14" y="26" font-size="12">Core signalling architecture</text>',
      ),
    },
    {
      title: 'Trace RTK activation through MAPK cascade',
      formula:
        '$$\\text{ligand}+2\\,\\text{RTK}\\Rightarrow \\text{dimer}$$\n$$\\text{RTK-P}\\Rightarrow \\text{RAS-GTP}\\Rightarrow \\text{RAF}\\Rightarrow \\text{MEK}\\Rightarrow \\text{ERK}$$',
      body: 'RTK signaling starts when ligand concentration is sufficient for receptor dimerization = active autophosphorylation. For example, if ligand-bound dimers = 40 and 75% autophosphorylate, active RTK-P dimers = 30 before downstream RAS recruitment. Phosphotyrosine docking recruits adaptor proteins, leading to RAS activation and MAPK cascade. Nuclear ERK activity = altered transcription factor phosphorylation and gene expression.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">RTK-MAPK pathway</text>' +
          '<line x1="150" y1="34" x2="150" y2="152" stroke="#334155" stroke-width="3"/>' +
          '<rect x="100" y="42" width="100" height="20" fill="#dbeafe" stroke="#1e3a8a"/><text x="150" y="56" font-size="9" text-anchor="middle">RTK dimer (P)</text>' +
          '<rect x="110" y="72" width="80" height="18" fill="#bbf7d0" stroke="#15803d"/><text x="150" y="84" font-size="9" text-anchor="middle">RAS-GTP</text>' +
          '<rect x="110" y="98" width="80" height="18" fill="#fef3c7" stroke="#a16207"/><text x="150" y="110" font-size="9" text-anchor="middle">RAF-MEK</text>' +
          '<rect x="110" y="124" width="80" height="18" fill="#fee2e2" stroke="#991b1b"/><text x="150" y="136" font-size="9" text-anchor="middle">ERK -> nucleus</text>',
      ),
    },
    {
      title: 'Differentiate cAMP and Ca2+ second messengers',
      formula:
        '$$\\text{ATP}\\xrightarrow{\\text{adenylyl cyclase}}\\text{cAMP}+\\text{PP}_i$$\n$$[\\text{Ca}^{2+}]_i:\\;100\\,\\text{nM}\\to1\\,\\mu\\text{M}=10\\times$$',
      body: 'cAMP is produced from ATP by adenylyl cyclase and activates PKA-dependent phosphorylation. Cytosolic Ca2+ rises from about 100 nM to about 1 uM in many signals, so fold change = 10x. Ca2+ effectors include calmodulin and CaMK pathways, while cAMP effectors include PKA and EPAC.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Second messengers</text>' +
          '<rect x="24" y="42" width="114" height="92" fill="#dbeafe" stroke="#1e3a8a"/><text x="81" y="60" font-size="10" text-anchor="middle">cAMP branch</text><text x="81" y="80" font-size="9" text-anchor="middle">ATP -> cAMP</text><text x="81" y="100" font-size="9" text-anchor="middle">PKA activation</text>' +
          '<rect x="162" y="42" width="114" height="92" fill="#fee2e2" stroke="#991b1b"/><text x="219" y="60" font-size="10" text-anchor="middle">Ca2+ branch</text><text x="219" y="80" font-size="9" text-anchor="middle">ER release / channels</text><text x="219" y="100" font-size="9" text-anchor="middle">calmodulin/CaMK</text>',
      ),
    },
    {
      title: 'Compute cascade amplification magnitude',
      formula:
        '$$1\\,\\text{receptor}\\times50\\,G\\text{-proteins}\\times100\\,\\text{cAMP s}^{-1}\\times10\\,\\text{s}=50{,}000\\,\\text{cAMP}$$',
      body: 'Amplification is multiplicative: receptor count = 1, activated G proteins per receptor = 50, cAMP molecules per second per cyclase = 100, and duration = 10 s. Total output = 50,000 cAMP molecules (50000), showing how weak extracellular signals become strong intracellular responses.',
    },
    {
      title: 'Include signal termination and adaptation',
      formula:
        '$$\\text{remaining signal}=\\left(\\frac{1}{2}\\right)^{t/t_{1/2}},\\;t_{1/2}=20\\,\\text{s},\\;t=60\\,\\text{s}\\Rightarrow \\frac{1}{8}=12.5\\%$$',
      body: 'Phosphodiesterases reduce cAMP, phosphatases reverse kinase marks, and receptor internalization lowers sensitivity. With half-life = 20 s and elapsed time = 60 s, remaining signal fraction = 12.5%, which prevents chronic overactivation.',
    },
    {
      title: 'Integrate pathway logic with quantitative reasoning',
      body: 'High-quality signalling answers specify molecules, directionality, and numbers. The full chain is ligand-receptor coupling, second messenger production, kinase cascades, target modification, and controlled shutdown. Pathology often reflects imbalance where gain > loss of signal control.',
      takeaway:
        'Memorize the sequence reception -> transduction -> response, RTK-MAPK logic, cAMP/Ca2+ messengers, and amplification as a product of stepwise gains.',
    },
  ],
  solution:
    'Cell signalling proceeds through reception, transduction, and response. RTK pathways activate through ligand-induced dimerization and phosphorylation, then propagate signals via RAS and MAPK modules to alter gene expression. cAMP and Ca2+ are major second messengers with distinct enzymes and effectors. Signalling cascades amplify strongly; for example, 1 receptor x 50 G proteins x 100 cAMP per second x 10 seconds yields 50,000 cAMP molecules. Termination systems such as phosphodiesterases and phosphatases restore baseline and prevent prolonged signaling.',
  verifiedPatterns: ['reception', 'transduction', 'response', 'RTK', 'RAS', 'cAMP', 'Ca2+', '50000', '12.5%'],
  minDiagramSteps: 3,
};
