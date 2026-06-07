import { phylogeneticTree, selectionCurve, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q24: BiologyQuestionDef = {
  id: 'q24',
  number: 24,
  topic: 'Natural Selection, Fitness, and Evidence for Evolution',
  question:
    'Using evolutionary biology, state Darwin postulates, interpret directional, stabilizing, and disruptive selection curves, calculate relative fitness, and summarize major evidence supporting evolution.',
  steps: [
    {
      title: 'State Darwin postulates in causal order',
      body: 'Darwinian evolution requires variation among individuals, heritability of traits, overproduction/competition, and differential survival or reproduction. When these conditions persist, advantageous heritable traits increase in frequency over generations.',
      diagram: wrapBioSvg(
        '<rect x="20" y="24" width="260" height="124" fill="#f8fafc" stroke="#334155"/>' +
          '<rect x="30" y="36" width="112" height="20" fill="#dbeafe" stroke="#1e3a8a"/><text x="86" y="50" font-size="9" text-anchor="middle">variation exists</text>' +
          '<rect x="158" y="36" width="112" height="20" fill="#dcfce7" stroke="#166534"/><text x="214" y="50" font-size="9" text-anchor="middle">variation heritable</text>' +
          '<rect x="30" y="76" width="112" height="20" fill="#fef3c7" stroke="#a16207"/><text x="86" y="90" font-size="9" text-anchor="middle">struggle for existence</text>' +
          '<rect x="158" y="76" width="112" height="20" fill="#fee2e2" stroke="#991b1b"/><text x="214" y="90" font-size="9" text-anchor="middle">differential fitness</text>' +
          '<text x="150" y="132" font-size="10" text-anchor="middle">population allele frequencies shift over time</text>',
      ),
    },
    {
      title: 'Interpret directional selection',
      body: 'Directional selection shifts the population mean toward one extreme phenotype, often after environmental change. Example contexts include antibiotic exposure or drought favoring one trait end.',
      diagram: selectionCurve('directional'),
    },
    {
      title: 'Interpret stabilizing and disruptive selection',
      body: 'Stabilizing selection favors intermediate phenotypes and reduces variance, whereas disruptive selection favors both extremes and can increase polymorphism. These patterns predict different trait-distribution outcomes across generations.',
      diagram: wrapBioSvg(
        '<rect x="14" y="20" width="132" height="140" fill="#f8fafc" stroke="#334155"/>' +
          '<rect x="154" y="20" width="132" height="140" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="80" y="36" font-size="10" text-anchor="middle">stabilizing</text>' +
          '<text x="220" y="36" font-size="10" text-anchor="middle">disruptive</text>' +
          '<path d="M26 132 C54 70, 106 70, 134 132" fill="none" stroke="#94a3b8"/>' +
          '<path d="M26 132 C62 58, 98 58, 134 132" fill="none" stroke="#b91c1c"/>' +
          '<path d="M166 132 C194 70, 246 70, 274 132" fill="none" stroke="#94a3b8"/>' +
          '<path d="M166 132 C188 84, 208 84, 220 132 C232 84, 252 84, 274 132" fill="none" stroke="#b91c1c"/>' +
          '<text x="34" y="148" font-size="8">variance decreases</text>' +
          '<text x="176" y="148" font-size="8">bimodal tendency</text>',
      ),
    },
    {
      title: 'Calculate absolute and relative fitness',
      formula:
        '$$W=\\frac{\\text{survivors}}{\\text{initial}},\\qquad w=\\frac{W}{W_{max}},\\qquad s=1-w$$',
      body: 'If AA has 80/100 survivors, Aa has 100/100, and aa has 60/100, then W_AA=0.80, W_Aa=1.00, W_aa=0.60. Relative fitness values are w_AA=0.80, w_Aa=1.00, w_aa=0.60, and selection coefficients are s_AA=0.20 and s_aa=0.40.',
    },
    {
      title: 'Relate microevolutionary change to measurable frequencies',
      formula:
        '$$\\Delta p\\approx\\frac{pq\\left[w_A-w_a\\right]}{\\bar{w}}$$\n$$p=0.4,\\;q=0.6,\\;w_A=1.0,\\;w_a=0.8,\\;\\bar{w}=0.88\\Rightarrow \\Delta p=\\frac{0.4\\times0.6\\times0.2}{0.88}=0.0545$$',
      body: 'With positive Delta p = 0.0545, allele A increases from p=0.4000 to p=0.4545 after one generation under the stated fitness assumptions.',
    },
    {
      title: 'Summarize converging evidence for evolution',
      body: 'Evidence includes fossils with transitional forms, homologous structures, molecular homology (DNA/protein sequence similarity), biogeography, and direct observation of evolution in contemporary populations.',
      diagram: phylogeneticTree(),
      takeaway:
        'Use Darwin postulates as mechanism and fossils plus molecular phylogeny as evidence lines in the same answer.',
    },
  ],
  solution:
    'Darwinian evolution follows from heritable variation, competition, and differential reproductive success. Selection can be directional (mean shifts), stabilizing (intermediate favored), or disruptive (extremes favored). Fitness calculations quantify selection strength; in the worked example, Aa had highest fitness and aa had selection coefficient 0.40. Evolution is supported by multiple independent evidence streams including fossils, homologous anatomy, biogeography, and phylogenetic molecular data.',
  verifiedPatterns: ['Darwin postulates', 'directional selection', 'stabilizing', 'disruptive', 'relative fitness', 'selection coefficient'],
  minDiagramSteps: 4,
};
