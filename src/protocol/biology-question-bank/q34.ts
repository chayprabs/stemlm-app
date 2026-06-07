import { phylogeneticTree, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q34: BiologyQuestionDef = {
  id: 'q34',
  number: 34,
  topic: 'Phylogenetic Trees, Molecular Clock, and Homology Concepts',
  question:
    'Construct a five-species phylogenetic interpretation for DNA/protein evolution, apply molecular clock reasoning, use cytochrome c comparisons, and distinguish homologous from analogous traits across species.',
  steps: [
    {
      title: 'Read topology from a five-species tree',
      body: 'A phylogenetic tree topology represents branching order, not ladder-like progression. Sister taxa = pairs sharing the most recent common ancestor before joining deeper nodes.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Five-species phylogenetic tree</text>' +
          '<line x1="34" y1="150" x2="34" y2="34" stroke="#334155" stroke-width="3"/>' +
          '<line x1="34" y1="52" x2="94" y2="52" stroke="#334155" stroke-width="2"/><line x1="34" y1="84" x2="120" y2="84" stroke="#334155" stroke-width="2"/><line x1="34" y1="118" x2="150" y2="118" stroke="#334155" stroke-width="2"/><line x1="34" y1="146" x2="180" y2="146" stroke="#334155" stroke-width="2"/>' +
          '<line x1="94" y1="52" x2="94" y2="36" stroke="#334155" stroke-width="2"/><line x1="94" y1="52" x2="94" y2="68" stroke="#334155" stroke-width="2"/>' +
          '<line x1="120" y1="84" x2="120" y2="68" stroke="#334155" stroke-width="2"/><line x1="150" y1="118" x2="150" y2="102" stroke="#334155" stroke-width="2"/><line x1="180" y1="146" x2="180" y2="130" stroke="#334155" stroke-width="2"/>' +
          '<text x="100" y="40" font-size="9">A</text><text x="100" y="72" font-size="9">B</text><text x="126" y="72" font-size="9">C</text><text x="156" y="106" font-size="9">D</text><text x="186" y="134" font-size="9">E</text>',
      ),
    },
    {
      title: 'Apply molecular clock equation to divergence time',
      formula:
        '$$t = \\frac{d}{2r}$$\n$$d=0.12\\;\\text{substitutions/site},\\;r=0.01\\;\\text{site}^{-1}\\text{Myr}^{-1}\\Rightarrow t=\\frac{0.12}{0.02}=6\\;\\text{Myr}$$',
      body: 'With a roughly constant substitution rate, divergence time = distance divided by twice the lineage rate. Using d = 0.12 and r = 0.01 per Myr, time estimate = 6 Myr.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Molecular clock calculation</text>' +
          '<line x1="40" y1="84" x2="260" y2="84" stroke="#334155" stroke-width="2"/>' +
          '<circle cx="86" cy="84" r="8" fill="#dbeafe" stroke="#1e3a8a"/><text x="86" y="88" font-size="8" text-anchor="middle">A</text>' +
          '<circle cx="214" cy="84" r="8" fill="#dcfce7" stroke="#166534"/><text x="214" y="88" font-size="8" text-anchor="middle">B</text>' +
          '<text x="96" y="64" font-size="10">d = 0.12 substitutions/site</text>' +
          '<text x="96" y="112" font-size="10">r = 0.01 per lineage per Myr</text>' +
          '<text x="96" y="136" font-size="10">t = d/(2r) = 6 Myr</text>',
      ),
    },
    {
      title: 'Use cytochrome c as a comparative molecular marker',
      formula:
        '$$\\%\\text{difference}=\\frac{\\text{amino-acid mismatches}}{\\text{alignment length}}\\times100\\%$$',
      body: 'Cytochrome c is widely conserved, so sequence differences can estimate evolutionary distance. Example: mismatches = 8 in length = 104 residues gives percent difference = 7.7%, supporting closer relatedness than a pair with 20/104 = 19.2%.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">Cytochrome c comparison matrix</text>' +
          '<rect x="24" y="32" width="252" height="120" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="84" y1="32" x2="84" y2="152" stroke="#334155"/><line x1="154" y1="32" x2="154" y2="152" stroke="#334155"/><line x1="214" y1="32" x2="214" y2="152" stroke="#334155"/><line x1="24" y1="58" x2="276" y2="58" stroke="#334155"/><line x1="24" y1="88" x2="276" y2="88" stroke="#cbd5e1"/><line x1="24" y1="118" x2="276" y2="118" stroke="#cbd5e1"/>' +
          '<text x="54" y="50" font-size="9">pair</text><text x="116" y="50" font-size="9">mismatch</text><text x="176" y="50" font-size="9">length</text><text x="230" y="50" font-size="9">% diff</text>' +
          '<text x="38" y="80" font-size="9">A-B</text><text x="116" y="80" font-size="9">8</text><text x="176" y="80" font-size="9">104</text><text x="230" y="80" font-size="9">7.7</text>' +
          '<text x="38" y="110" font-size="9">A-E</text><text x="116" y="110" font-size="9">20</text><text x="176" y="110" font-size="9">104</text><text x="230" y="110" font-size="9">19.2</text>',
      ),
    },
    {
      title: 'Separate homologous from analogous traits',
      body: 'homologous structures share ancestry (for example vertebrate forelimbs), while analogous structures share function through convergent evolution (for example bird wing and insect wing). Trait similarity = not always evidence of close ancestry.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">homology vs analogy</text>' +
          '<rect x="22" y="34" width="120" height="112" fill="#dbeafe" stroke="#1e3a8a"/><text x="32" y="52" font-size="10">homologous</text><text x="32" y="72" font-size="9">same origin</text><text x="32" y="92" font-size="9">different functions possible</text>' +
          '<rect x="158" y="34" width="120" height="112" fill="#fee2e2" stroke="#991b1b"/><text x="168" y="52" font-size="10">analogous</text><text x="168" y="72" font-size="9">different origin</text><text x="168" y="92" font-size="9">similar function</text>',
      ),
    },
    {
      title: 'Use ortholog/paralog labels on gene trees',
      body: 'Orthologs diverge after species split and are preferred for cross-species function inference, whereas paralogs arise by duplication and may neofunctionalize. Functional transfer confidence = generally higher for ortholog than distant paralog.',
      diagram: phylogeneticTree(),
    },
    {
      title: 'Integrate topology, branch length, and markers',
      body: 'Robust evolutionary inference combines branching order, molecular distances, calibration points, and conserved proteins such as cytochrome c. Best practice = treat molecular clock as an approximation and test for lineage-rate variation.',
      takeaway:
        'Topological relatedness, molecular clock arithmetic, and careful homology terminology together produce defensible phylogenetic conclusions.',
    },
  ],
  solution:
    'Phylogenetic trees encode branching relationships among taxa and should be interpreted by shared ancestors, not tip order. Molecular clock estimates use t = d/(2r), so with d = 0.12 and r = 0.01 site^-1 Myr^-1, divergence time is 6 Myr. Cytochrome c sequence differences provide practical evolutionary distance signals. Homologous traits reflect shared ancestry, while analogous traits reflect convergent function. Orthologs arise by speciation and paralogs by duplication, informing function prediction reliability.',
  verifiedPatterns: ['phylogenetic tree', 'molecular clock', 't = d/(2r)', 'cytochrome c', 'homologous', 'analogous', 'ortholog', 'paralog'],
  minDiagramSteps: 5,
};
