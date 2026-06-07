import { wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q46: BiologyQuestionDef = {
  id: 'q46',
  number: 46,
  topic: 'Differentiation, Stem Cell Potency, Hox Patterning, and Intrinsic Apoptosis',
  question:
    'In developmental biology, explain differentiation by transcription factors and epigenetics, compare stem cell potency classes, interpret Hox gene patterning including Antennapedia, and map intrinsic apoptosis signaling.',
  steps: [
    {
      title: 'Connect transcription factors with epigenetic states in differentiation',
      body: 'Differentiation outcome = transcription factor network state + chromatin accessibility state. For example, if lineage TF expression = high and promoter methylation = low at target genes, transcription output = high and cell identity stabilizes through positive feedback loops.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Differentiation control layers</text>' +
          '<rect x="24" y="42" width="112" height="92" fill="#dbeafe" stroke="#1e3a8a"/><text x="80" y="62" font-size="10" text-anchor="middle">transcription factors</text><text x="80" y="82" font-size="9" text-anchor="middle">SOX/OCT/MYO etc</text>' +
          '<rect x="164" y="42" width="112" height="92" fill="#dcfce7" stroke="#166534"/><text x="220" y="62" font-size="10" text-anchor="middle">epigenetics</text><text x="220" y="82" font-size="9" text-anchor="middle">DNA methylation</text><text x="220" y="100" font-size="9" text-anchor="middle">histone marks</text>' +
          '<line x1="136" y1="88" x2="164" y2="88" stroke="#334155"/>',
      ),
    },
    {
      title: 'Compare stem cell potency classes',
      formula:
        '$$\\text{potency breadth: totipotent} > \\text{pluripotent} > \\text{multipotent} > \\text{unipotent}$$',
      body: 'Totipotent cells can generate embryo + extraembryonic tissue. Pluripotent cells can generate three germ layers but not full placenta. Multipotent cells are lineage-restricted, and unipotent cells generate one mature type. Breadth ranking = totipotent > pluripotent > multipotent > unipotent.',
      diagram: wrapBioSvg(
        '<rect x="18" y="28" width="264" height="122" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="98" y1="28" x2="98" y2="150" stroke="#334155"/><line x1="196" y1="28" x2="196" y2="150" stroke="#334155"/><line x1="18" y1="52" x2="282" y2="52" stroke="#334155"/>' +
          '<text x="58" y="44" font-size="10" text-anchor="middle">class</text><text x="147" y="44" font-size="10" text-anchor="middle">developmental range</text><text x="238" y="44" font-size="10" text-anchor="middle">example</text>' +
          '<text x="58" y="74" font-size="9" text-anchor="middle">totipotent</text><text x="147" y="74" font-size="9" text-anchor="middle">embryo + placenta</text><text x="238" y="74" font-size="9" text-anchor="middle">zygote</text>' +
          '<text x="58" y="98" font-size="9" text-anchor="middle">pluripotent</text><text x="147" y="98" font-size="9" text-anchor="middle">three germ layers</text><text x="238" y="98" font-size="9" text-anchor="middle">ESC/iPSC</text>' +
          '<text x="58" y="122" font-size="9" text-anchor="middle">multipotent</text><text x="147" y="122" font-size="9" text-anchor="middle">lineage-restricted</text><text x="238" y="122" font-size="9" text-anchor="middle">HSC</text>',
      ),
    },
    {
      title: 'Interpret Hox positional identity and Antennapedia phenotype',
      formula:
        '$$\\text{ectopic Antennapedia expression in head}\\Rightarrow \\text{leg identity program in antenna segment}$$',
      body: 'Hox genes assign anterior-posterior segment identity. In Drosophila, Antennapedia misexpression in antennal primordia causes homeotic transformation where antenna fate = leg-like fate. Colinearity means Hox genomic order often correlates with expression domains.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Hox patterning and Antennapedia</text>' +
          '<rect x="24" y="42" width="252" height="28" fill="#dbeafe" stroke="#1e3a8a"/><text x="150" y="60" font-size="9" text-anchor="middle">anterior -------------------------------- posterior</text>' +
          '<rect x="40" y="84" width="46" height="20" fill="#fde68a" stroke="#a16207"/><text x="63" y="98" font-size="8" text-anchor="middle">head</text>' +
          '<rect x="96" y="84" width="46" height="20" fill="#bbf7d0" stroke="#15803d"/><text x="119" y="98" font-size="8" text-anchor="middle">thorax</text>' +
          '<rect x="152" y="84" width="46" height="20" fill="#fecaca" stroke="#991b1b"/><text x="175" y="98" font-size="8" text-anchor="middle">abdomen</text>' +
          '<text x="24" y="130" font-size="9">Antennapedia ectopic in head = antenna to leg transformation</text>',
      ),
    },
    {
      title: 'Map intrinsic apoptosis cascade quantitatively',
      formula:
        '$$\\text{stress}\\Rightarrow \\text{BAX/BAK activation}\\Rightarrow \\text{cytochrome c release}\\Rightarrow \\text{apoptosome}\\Rightarrow \\text{caspase-9}\\Rightarrow \\text{caspase-3}$$\n$$1\\,\\text{apoptosome}\\times9\\,\\text{caspase-9}\\times100\\,\\text{caspase-3}=900\\,\\text{active caspase-3}$$',
      body: 'Mitochondrial outer membrane permeabilization triggers cytochrome c release. Apaf-1 apoptosome recruits procaspase-9, then executioner caspase-3 activation amplifies proteolysis. In this simplified example, active caspase-3 count = 900 downstream molecules per apoptosome seed.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Intrinsic apoptosis pathway</text>' +
          '<rect x="20" y="44" width="68" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="54" y="60" font-size="9" text-anchor="middle">stress</text>' +
          '<rect x="104" y="44" width="84" height="24" fill="#fecaca" stroke="#991b1b"/><text x="146" y="60" font-size="9" text-anchor="middle">BAX/BAK</text>' +
          '<rect x="204" y="44" width="78" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="243" y="60" font-size="9" text-anchor="middle">cytochrome c</text>' +
          '<rect x="104" y="98" width="84" height="24" fill="#dcfce7" stroke="#166534"/><text x="146" y="114" font-size="9" text-anchor="middle">caspase-9</text>' +
          '<rect x="204" y="98" width="78" height="24" fill="#fef3c7" stroke="#a16207"/><text x="243" y="114" font-size="9" text-anchor="middle">caspase-3</text>' +
          '<line x1="88" y1="56" x2="104" y2="56" stroke="#334155"/><line x1="188" y1="56" x2="204" y2="56" stroke="#334155"/><line x1="243" y1="68" x2="188" y2="98" stroke="#334155"/><line x1="188" y1="110" x2="204" y2="110" stroke="#334155"/>',
      ),
    },
    {
      title: 'Relate differentiation and apoptosis to disease',
      body: 'Cancer can arise when differentiation programs are dysregulated and apoptosis threshold = pathologically high. Degenerative disease can arise when apoptosis threshold = pathologically low. Tissue homeostasis requires balanced cell production and programmed cell removal.',
    },
    {
      title: 'Synthesize developmental logic for exam answers',
      body: 'A strong response links lineage commitment (TF + chromatin), positional coding (Hox), and quality control (apoptosis). These systems are mathematically and mechanistically connected because developmental robustness = controlled gene expression plus selective cell survival.',
      takeaway:
        'Remember potency hierarchy, Antennapedia as a homeotic example, and intrinsic apoptosis through cytochrome c to caspase cascade.',
    },
  ],
  solution:
    'Differentiation is controlled by transcription-factor networks and epigenetic regulation of chromatin accessibility. Stem cell potency declines from totipotent to pluripotent to multipotent to unipotent states. Hox genes pattern body axes, and Antennapedia misexpression demonstrates homeotic transformation by assigning leg identity to antennal segments. Intrinsic apoptosis proceeds through mitochondrial cytochrome c release, apoptosome formation, initiator caspase-9 activation, and executioner caspase-3 activation.',
  verifiedPatterns: ['totipotent', 'pluripotent', 'Antennapedia', 'cytochrome c', 'caspase-9', 'caspase-3', '900'],
  minDiagramSteps: 4,
};
