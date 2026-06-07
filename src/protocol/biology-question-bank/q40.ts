import { lymphocytes, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q40: BiologyQuestionDef = {
  id: 'q40',
  number: 40,
  topic: 'Vaccine Platforms, mRNA Mechanism, Herd Immunity, and Autoimmunity',
  question:
    'Classify common vaccine types using MMR, flu, mRNA, and hepatitis B examples, explain mRNA vaccine mechanism, calculate herd immunity thresholds from R0, and relate immunity to autoimmune disease concepts.',
  steps: [
    {
      title: 'Classify major vaccine types with examples',
      body: 'MMR is a live attenuated vaccine, many seasonal flu products are inactivated or subunit formulations, mRNA COVID platforms deliver genetic instructions, and HepB vaccine is recombinant HBsAg protein. Platform choice = trade-off among immunogenicity, safety profile, and manufacturing speed.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Vaccine type examples</text>' +
          '<rect x="20" y="34" width="260" height="118" fill="#f8fafc" stroke="#334155"/><line x1="84" y1="34" x2="84" y2="152" stroke="#334155"/><line x1="166" y1="34" x2="166" y2="152" stroke="#334155"/><line x1="20" y1="58" x2="280" y2="58" stroke="#334155"/><line x1="20" y1="84" x2="280" y2="84" stroke="#cbd5e1"/><line x1="20" y1="110" x2="280" y2="110" stroke="#cbd5e1"/><line x1="20" y1="136" x2="280" y2="136" stroke="#cbd5e1"/>' +
          '<text x="38" y="50" font-size="9">vaccine</text><text x="106" y="50" font-size="9">type</text><text x="186" y="50" font-size="9">example</text>' +
          '<text x="30" y="76" font-size="9">MMR</text><text x="92" y="76" font-size="9">live attenuated</text><text x="172" y="76" font-size="9">measles-mumps-rubella</text>' +
          '<text x="30" y="102" font-size="9">Flu</text><text x="92" y="102" font-size="9">inactivated/subunit</text><text x="172" y="102" font-size="9">seasonal influenza</text>' +
          '<text x="30" y="128" font-size="9">mRNA</text><text x="92" y="128" font-size="9">nucleic acid</text><text x="172" y="128" font-size="9">SARS-CoV-2 spike</text>' +
          '<text x="30" y="150" font-size="9">HepB</text><text x="92" y="150" font-size="9">recombinant protein</text><text x="172" y="150" font-size="9">HBsAg</text>',
      ),
    },
    {
      title: 'Explain mRNA vaccine cellular mechanism',
      formula:
        '$$\\text{mRNA} \\rightarrow \\text{antigen protein} \\rightarrow \\text{B/T cell activation}$$',
      body: 'Lipid nanoparticles deliver mRNA into host cells, ribosomes translate antigen, and antigen presentation triggers adaptive immunity. For example, if 1,000 translated antigen units trigger 300 activated lymphocytes, activation ratio = 300/1000 = 0.30. Antigen expression = transient because mRNA is degraded after translation and does not integrate into genomic DNA.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">mRNA vaccine mechanism</text>' +
          '<rect x="24" y="64" width="64" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="56" y="80" font-size="9" text-anchor="middle">LNP-mRNA</text>' +
          '<rect x="112" y="64" width="70" height="24" fill="#dcfce7" stroke="#166534"/><text x="147" y="80" font-size="9" text-anchor="middle">translation</text>' +
          '<rect x="206" y="64" width="72" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="242" y="80" font-size="9" text-anchor="middle">immune memory</text>' +
          '<line x1="88" y1="76" x2="112" y2="76" stroke="#1f2937"/><line x1="182" y1="76" x2="206" y2="76" stroke="#1f2937"/>' +
          '<text x="20" y="114" font-size="10">MHC presentation activates B cells and T cells</text>',
      ),
    },
    {
      title: 'Calculate herd immunity threshold from R0',
      formula:
        '$$HIT = 1 - \\frac{1}{R_0}$$\n$$R_0=5\\Rightarrow HIT=1-0.2=0.8=80\\%$$',
      body: 'In the simple homogeneous model, critical immune fraction = 1 - 1/R0. With R0 = 5, threshold immunity = 80%, though real-world targets can be higher due to heterogeneity and waning protection.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Herd-immunity threshold math</text>' +
          '<rect x="24" y="44" width="252" height="92" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="40" y="72" font-size="11">R0 = 5</text>' +
          '<text x="40" y="96" font-size="11">HIT = 1 - (1/5) = 0.8</text>' +
          '<text x="40" y="120" font-size="11">Required immune share = 80%</text>',
      ),
    },
    {
      title: 'Relate vaccine protection to population risk reduction',
      body: 'As immune coverage rises, effective reproduction number Re declines and chains of transmission are interrupted. Public-health impact = strongest when high-risk groups and high-contact groups both achieve robust coverage.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">coverage vs transmission</text>' +
          '<rect x="24" y="40" width="252" height="110" fill="#e0f2fe" stroke="#0369a1"/>' +
          '<line x1="40" y1="130" x2="260" y2="130" stroke="#334155"/><line x1="40" y1="130" x2="40" y2="54" stroke="#334155"/>' +
          '<path d="M40 66 C90 74, 130 90, 170 108 C210 120, 238 126, 260 128" fill="none" stroke="#15803d" stroke-width="3"/>' +
          '<text x="46" y="58" font-size="9">Re</text><text x="208" y="146" font-size="9">immune coverage</text><text x="96" y="84" font-size="9">higher coverage -> lower Re</text>',
      ),
    },
    {
      title: 'Differentiate protective immunity from autoimmunity',
      body: 'Autoimmune disease reflects loss of self-tolerance, where immune effectors target host tissues rather than pathogens. Mechanistically, autoimmune pathology = dysregulated B/T cell responses, not the intended antigen-specific memory generated by vaccines.',
      diagram: lymphocytes(),
    },
    {
      title: 'Integrate platform selection with immunological context',
      body: 'Vaccine strategy depends on pathogen biology, target population, dosing logistics, and risk-benefit analysis. Immunization programs succeed when efficacy, safety monitoring, booster policy, and communication all align.',
      takeaway:
        'Key anchors: MMR live attenuated, flu commonly inactivated/subunit, mRNA transient antigen expression, HepB recombinant protein, and HIT = 1 - 1/R0.',
    },
  ],
  solution:
    'Vaccine platforms include live attenuated (for example MMR), inactivated/subunit (many influenza formulations), nucleic-acid vaccines (mRNA), and recombinant protein vaccines (for example HepB HBsAg). mRNA vaccines deliver transient instructions for antigen production, leading to B- and T-cell memory. Herd immunity threshold in a simple model is HIT = 1 - 1/R0, so R0 = 5 gives 80%. Autoimmune disease involves self-reactive immunity and differs from intended vaccine-induced protective immune memory.',
  verifiedPatterns: ['MMR', 'flu', 'mRNA', 'HepB', 'HIT = 1 - 1/R0', 'R0', 'immune memory', 'autoimmune'],
  minDiagramSteps: 5,
};
