import { wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q31: BiologyQuestionDef = {
  id: 'q31',
  number: 31,
  topic: 'Sanger Sequencing, NGS, and WGS vs WES',
  question:
    'Explain Sanger sequencing chain termination using ddNTPs, compare next-generation sequencing (NGS) advantages, estimate the protein-coding fraction of the human genome, and contrast whole-genome sequencing (WGS) with whole-exome sequencing (WES).',
  steps: [
    {
      title: 'Explain ddNTP chain termination in Sanger sequencing',
      body: 'Sanger chemistry mixes dNTPs with fluorescent ddNTPs; once a ddNTP is incorporated, extension stops because ddNTP has no 3\'-OH. Chain termination position = base position where ddNTP is added, so a ladder of fragments is produced for base calling.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Sanger chain termination</text>' +
          '<line x1="26" y1="56" x2="274" y2="56" stroke="#1d4ed8" stroke-width="3"/>' +
          '<line x1="26" y1="84" x2="238" y2="84" stroke="#16a34a" stroke-width="3"/>' +
          '<line x1="26" y1="112" x2="214" y2="112" stroke="#f59e0b" stroke-width="3"/>' +
          '<line x1="26" y1="140" x2="184" y2="140" stroke="#dc2626" stroke-width="3"/>' +
          '<circle cx="274" cy="56" r="5" fill="#1d4ed8"/><circle cx="238" cy="84" r="5" fill="#16a34a"/><circle cx="214" cy="112" r="5" fill="#f59e0b"/><circle cx="184" cy="140" r="5" fill="#dc2626"/>' +
          '<text x="14" y="168" font-size="10">different ddNTP colors mark terminal base</text>',
      ),
    },
    {
      title: 'Connect fragment lengths to sequence readout',
      formula:
        '$$\\text{read order} = \\text{smallest fragment} \\rightarrow \\text{largest fragment}$$',
      body: 'After capillary electrophoresis, migration distance is inversely related to fragment size, so shortest fragment arrives first. Example ladder sizes = 80 bp, 120 bp, 170 bp, and 220 bp, so read order = 80 -> 120 -> 170 -> 220, and base order = detector color order from shortest to longest fragments.',
      diagram: wrapBioSvg(
        '<rect x="40" y="24" width="220" height="130" fill="#e0f2fe" stroke="#0369a1"/>' +
          '<line x1="70" y1="38" x2="70" y2="148" stroke="#0f172a"/><line x1="120" y1="54" x2="120" y2="148" stroke="#0f172a"/><line x1="170" y1="78" x2="170" y2="148" stroke="#0f172a"/><line x1="220" y1="104" x2="220" y2="148" stroke="#0f172a"/>' +
          '<text x="18" y="20" font-size="12">capillary separation</text><text x="48" y="166" font-size="10">short</text><text x="202" y="166" font-size="10">long</text>',
      ),
    },
    {
      title: 'Summarize why NGS outscales classic Sanger',
      body: 'NGS runs massive parallel sequencing, so throughput per run is much higher and cost per base is much lower. Typical output = millions to billions of reads in one run, enabling population studies, transcriptomics, and deep variant detection.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Sanger vs NGS throughput</text>' +
          '<rect x="24" y="34" width="94" height="120" fill="#dbeafe" stroke="#1e3a8a"/><text x="71" y="52" font-size="10" text-anchor="middle">Sanger</text><rect x="52" y="138" width="38" height="10" fill="#1e3a8a"/><text x="36" y="132" font-size="9">~10^3 bp/run</text>' +
          '<rect x="182" y="34" width="94" height="120" fill="#dcfce7" stroke="#166534"/><text x="229" y="52" font-size="10" text-anchor="middle">NGS</text>' +
          '<rect x="196" y="124" width="10" height="24" fill="#15803d"/><rect x="210" y="112" width="10" height="36" fill="#15803d"/><rect x="224" y="98" width="10" height="50" fill="#15803d"/><rect x="238" y="84" width="10" height="64" fill="#15803d"/><rect x="252" y="70" width="10" height="78" fill="#15803d"/>' +
          '<text x="188" y="164" font-size="9">massive parallel reads</text>',
      ),
    },
    {
      title: 'Estimate the human protein-coding fraction',
      formula:
        '$$\\text{coding fraction} = \\frac{\\text{coding bases}}{\\text{genome bases}} \\times 100\\%$$\n$$\\approx \\frac{4.8\\times10^7}{3.2\\times10^9}\\times100\\% = 1.5\\%$$',
      body: 'Using coding bases = 4.8x10^7 and genome size = 3.2x10^9, fraction = 0.015 and percentage = 1.5%. This means about 98.5% is non-protein-coding (regulatory, intronic, repetitive, and other functional noncoding DNA).',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Human genome composition</text>' +
          '<circle cx="110" cy="96" r="60" fill="#e2e8f0" stroke="#334155"/>' +
          '<path d="M110 96 L110 36 A60 60 0 0 1 116 36 Z" fill="#1d4ed8" stroke="#1d4ed8"/>' +
          '<text x="190" y="86" font-size="10">protein-coding = 1.5%</text><text x="190" y="108" font-size="10">noncoding = 98.5%</text>',
      ),
    },
    {
      title: 'Compare WGS and WES with coverage arithmetic',
      formula:
        '$$\\text{WGS data} = 3.2\\,\\text{Gb} \\times 30 = 96\\,\\text{Gb}$$\n$$\\text{WES data} = 50\\,\\text{Mb} \\times 100 = 5\\,\\text{Gb}$$',
      body: 'For the same sample, data volume = target size x depth, and coverage depth = reads mapped per base. WGS gives 96 Gb at 30x coverage across the genome, while WES gives 5 Gb at 100x coverage across exons, so WES is cheaper for coding-variant detection but misses most noncoding variants.',
    },
    {
      title: 'Choose technology based on the biological question',
      body: 'Use Sanger for small targeted confirmation, NGS panels for focused diagnostics, WES for exon-centered disease discovery, and WGS for comprehensive variant discovery including structural variants and regulatory regions.',
      takeaway:
        'Core anchors: ddNTP terminates synthesis, NGS increases throughput, coding DNA is about 1.5%, and WGS vs WES is a breadth-versus-cost trade-off.',
    },
  ],
  solution:
    'Sanger sequencing relies on ddNTP incorporation to terminate DNA extension at specific bases, producing size-separated fragments for sequence calling. NGS provides major advantages in parallelization, throughput, and cost per base. In humans, protein-coding DNA is about 1.5% of the 3.2 Gb genome. WGS surveys nearly all genomic regions (for example 3.2 Gb x 30 = 96 Gb data), while WES targets exons only (for example 50 Mb x 100 = 5 Gb), and coverage choices determine sensitivity for rare variants. This makes WES efficient for coding variants but less comprehensive for noncoding and structural variation.',
  verifiedPatterns: ['ddNTP', 'Sanger', 'NGS', '1.5%', 'WGS', 'WES', 'coverage'],
  minDiagramSteps: 4,
};
