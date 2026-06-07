import { digestiveTract, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q19: BiologyQuestionDef = {
  id: 'q19',
  number: 19,
  topic: 'Digestive Tract Function, Enzyme Digestion, Absorption, and Liver Roles',
  question:
    'In human digestive biology, trace food through the digestive tract, quantify enzyme digestion of carbohydrates, proteins, and lipids, explain villus-based nutrient absorption, and summarize major liver functions in metabolism and homeostasis.',
  steps: [
    {
      title: 'Trace digestive tract pathway and organ roles',
      body: 'Food pathway is mouth -> esophagus -> stomach -> small intestine -> large intestine -> rectum. Mechanical processing and enzyme secretion progressively convert macromolecules to absorbable monomers across intestinal epithelium.',
      diagram: digestiveTract(),
    },
    {
      title: 'Quantify carbohydrate digestion to absorbable monosaccharides',
      formula:
        '$$\\text{Starch yield}\\to\\text{glucose units}$$',
      body: 'If one starch fragment hydrolyzes into 120 glucose monomers and intestinal absorption efficiency is 85%, absorbed glucose = 120 x 0.85 = 102 monomers-equivalent units.',
    },
    {
      title: 'Estimate protein digestion and amino acid release',
      formula:
        '$$\\text{Amino acids released}=\\text{peptide residues}\\times\\text{hydrolysis fraction}$$',
      body: 'If dietary peptide residues = 300 and protease hydrolysis fraction = 0.90, amino acids released = 300 x 0.90 = 270 residues equivalent. Trypsin, chymotrypsin, and peptidases contribute sequential cleavage steps.',
    },
    {
      title: 'Compute lipid digestion and micelle-assisted uptake',
      formula:
        '$$\\text{Triglyceride}\\xrightarrow{lipase}\\text{monoglyceride}+2\\,\\text{fatty acids}$$',
      body: 'If 40 triglyceride molecules are fully hydrolyzed, fatty acids produced = 40 x 2 = 80 and monoglycerides produced = 40 x 1 = 40. Bile salts emulsify lipids and increase effective enzyme-substrate interface.',
      diagram: wrapBioSvg(
        '<ellipse cx="54" cy="86" rx="26" ry="18" fill="#fde68a" stroke="#a16207"/><text x="54" y="90" font-size="9" text-anchor="middle">fat droplet</text>' +
          '<circle cx="124" cy="78" r="12" fill="#dcfce7" stroke="#166534"/><text x="124" y="82" font-size="8" text-anchor="middle">lipase</text><line x1="80" y1="86" x2="112" y2="80" stroke="#334155"/>' +
          '<rect x="168" y="64" width="110" height="44" fill="#dbeafe" stroke="#1e3a8a"/><text x="223" y="82" font-size="9" text-anchor="middle">micelle products</text><text x="223" y="98" font-size="9" text-anchor="middle">FA + monoglyceride</text>' +
          '<line x1="136" y1="80" x2="168" y2="86" stroke="#334155"/><text x="14" y="20" font-size="12">Lipid digestion and absorption prep</text>',
      ),
    },
    {
      title: 'Relate villus geometry to absorption capacity',
      formula:
        '$$\\text{Surface amplification}=\\frac{A\\_{villus\\,+\\,microvilli}}{A\\_{smooth\\,tube}}$$',
      body: 'A_villus+microvilli is absorptive surface area with folds, villi, and microvilli. If A_villus+microvilli = 180 m^2 and A_smooth tube = 0.30 m^2, amplification = 180/0.30 = 600-fold.',
      diagram: wrapBioSvg(
        '<rect x="22" y="38" width="256" height="110" fill="#f8fafc" stroke="#334155"/><path d="M34 120 C46 78, 58 78, 70 120 C82 78, 94 78, 106 120 C118 78, 130 78, 142 120 C154 78, 166 78, 178 120 C190 78, 202 78, 214 120 C226 78, 238 78, 250 120" fill="#dcfce7" stroke="#166534" stroke-width="2"/>' +
          '<line x1="70" y1="94" x2="70" y2="66" stroke="#1d4ed8"/><line x1="142" y1="94" x2="142" y2="66" stroke="#1d4ed8"/><line x1="214" y1="94" x2="214" y2="66" stroke="#1d4ed8"/>' +
          '<text x="16" y="20" font-size="12">Small intestinal villi and absorption surface</text><text x="80" y="62" font-size="9">capillaries</text><text x="206" y="62" font-size="9">lacteal region</text>',
      ),
    },
    {
      title: 'Summarize liver integration of digestion products',
      body: 'The liver regulates glucose storage/release, amino acid metabolism, lipid packaging, bile production, detoxification, and plasma protein synthesis. Portal blood delivers absorbed nutrients first to liver cells for metabolic routing.',
      takeaway:
        'Digestive enzymes create absorbable units, villi maximize uptake, and liver metabolism coordinates whole-body nutrient homeostasis.',
    },
  ],
  solution:
    'Digestion proceeds through coordinated organ and enzyme functions: carbohydrates to monosaccharides, proteins to amino acids, and lipids to fatty acids plus monoglycerides. Absorption occurs mainly in the small intestine where villi and microvilli expand surface area dramatically. The liver then processes portal nutrients for storage, distribution, detoxification, and biosynthesis, integrating digestive output with systemic metabolic needs.',
  verifiedPatterns: ['mouth', 'small intestine', 'lipase', 'villus', '600-fold', 'liver'],
  minDiagramSteps: 3,
};
