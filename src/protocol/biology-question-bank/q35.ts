import { cloningSteps, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q35: BiologyQuestionDef = {
  id: 'q35',
  number: 35,
  topic: 'Recombinant DNA, Insulin Cloning, CRISPR, and GMOs',
  question:
    'Explain recombinant DNA construction with restriction enzymes, outline an insulin plasmid cloning workflow, summarize CRISPR editing logic, and evaluate GMO applications.',
  steps: [
    {
      title: 'Define restriction enzymes and sticky-end logic',
      formula:
        '$$\\text{expected cut frequency for 6-bp site} = \\left(\\frac{1}{4}\\right)^6 = \\frac{1}{4096}$$',
      body: 'Type II restriction endonucleases (for example EcoRI) recognize specific palindromic sites and cut DNA reproducibly. For a random sequence, expected EcoRI-site frequency = 1/4096 bp, which guides fragment planning.',
    },
    {
      title: 'Map human insulin gene insertion into plasmid',
      body: 'A bacterial plasmid with origin of replication and antibiotic marker is cut with the same enzyme as the insulin insert. Compatible sticky ends = efficient ligation into a recombinant plasmid carrying insulin coding sequence.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Insulin recombinant plasmid concept</text>' +
          '<circle cx="88" cy="92" r="50" fill="none" stroke="#1e3a8a" stroke-width="3"/><text x="60" y="94" font-size="9">plasmid</text><text x="58" y="112" font-size="9">ori + ampR</text>' +
          '<rect x="168" y="74" width="106" height="34" fill="#dcfce7" stroke="#166534"/><text x="221" y="95" font-size="10" text-anchor="middle">human insulin cDNA</text>' +
          '<line x1="136" y1="92" x2="168" y2="92" stroke="#1f2937"/><text x="140" y="84" font-size="9">EcoRI</text>',
      ),
    },
    {
      title: 'Sequence the cloning workflow end-to-end',
      body: 'Workflow order = digest vector + digest insert + ligate + transform E. coli + select colonies + verify by colony PCR/sequencing. Correct clone fraction = positive colonies divided by screened colonies.',
      diagram: cloningSteps(),
    },
    {
      title: 'Explain CRISPR-Cas9 editing outcomes',
      formula:
        '$$\\text{editing efficiency} = \\frac{\\text{edited alleles}}{\\text{total alleles}}\\times100\\%$$',
      body: 'Guide RNA directs Cas9 to a target adjacent to a PAM site, then a double-strand break is repaired by NHEJ or HDR. If edited alleles = 72 out of 120, efficiency = 60%, and product type depends on repair pathway.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">CRISPR-Cas9 editing</text>' +
          '<line x1="24" y1="78" x2="276" y2="78" stroke="#1d4ed8" stroke-width="3"/>' +
          '<rect x="104" y="60" width="40" height="36" fill="#fde68a" stroke="#a16207"/><text x="124" y="82" font-size="9" text-anchor="middle">Cas9</text>' +
          '<line x1="146" y1="78" x2="166" y2="78" stroke="#dc2626" stroke-width="3"/><text x="170" y="84" font-size="9">DSB</text>' +
          '<text x="24" y="114" font-size="10">NHEJ = indels</text><text x="164" y="114" font-size="10">HDR = precise edit with donor</text>',
      ),
    },
    {
      title: 'Evaluate GMO applications and biosafety concerns',
      body: 'GMOs include insect-resistant crops, herbicide-tolerant lines, and engineered microbes producing insulin or vaccines. Risk assessment = trait-specific analysis of off-target effects, gene flow, resistance evolution, and ecological impact.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">GMO benefit-risk framing</text>' +
          '<rect x="24" y="36" width="114" height="114" fill="#dcfce7" stroke="#166534"/><text x="34" y="56" font-size="10">benefits</text><text x="34" y="76" font-size="9">yield stability</text><text x="34" y="94" font-size="9">reduced pesticide use</text><text x="34" y="112" font-size="9">biopharmaceuticals</text>' +
          '<rect x="162" y="36" width="114" height="114" fill="#fee2e2" stroke="#991b1b"/><text x="172" y="56" font-size="10">risks to monitor</text><text x="172" y="76" font-size="9">resistance evolution</text><text x="172" y="94" font-size="9">gene flow</text><text x="172" y="112" font-size="9">ecological trade-offs</text>',
      ),
    },
    {
      title: 'Integrate recombinant tools into modern biotechnology',
      body: 'Restriction cloning, PCR verification, sequencing validation, and CRISPR editing are complementary toolkit components. Industrial bioproduction quality = controlled expression systems plus rigorous molecular confirmation at each stage.',
      takeaway:
        'Key sequence: restriction digest -> ligation -> transformation -> screening, with CRISPR extending from gene insertion to targeted editing.',
    },
  ],
  solution:
    'Recombinant DNA technology uses sequence-specific restriction enzymes and ligase to join DNA fragments, commonly into plasmid vectors for bacterial propagation or expression. In insulin cloning, insert and vector are cut with compatible enzymes, ligated, transformed, selected, and sequence-verified. CRISPR-Cas9 introduces targeted breaks repaired by NHEJ or HDR, and editing efficiency can be quantified as edited/total alleles. GMOs provide major agricultural and medical benefits but require careful biosafety and ecological risk assessment.',
  verifiedPatterns: ['restriction enzyme', 'EcoRI', 'plasmid', 'insulin', 'ligation', 'CRISPR', 'Cas9', 'GMO'],
  minDiagramSteps: 5,
};
