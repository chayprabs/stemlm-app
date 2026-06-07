import {
  chloroplastDiagram,
  foodWeb,
  phylogeneticTree,
  wrapBioSvg,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q50: BiologyQuestionDef = {
  id: 'q50',
  number: 50,
  topic: 'Biocius comprehensivus: Integrated Quantitative Biology Synthesis',
  question:
    'In an integrative biology scenario (Biocius comprehensivus), calculate guanine count for a 500 Mb genome at 40% GC, identify key eukaryotic autotroph organelles, solve Hardy-Weinberg bioluminescence in 500 organisms (80 luminescent, 420 not; L dominant), compute lake energy flow from 100,000 kcal solar input with 1% fixation and 60% respiration, and explain allopatric speciation.',
  steps: [
    {
      title: 'Compute guanine count from genome size and GC content',
      formula:
        '$$\\text{genome size}=500\\,\\text{Mb}=500{,}000{,}000\\,\\text{nt}$$\n$$\\text{GC fraction}=40\\%=0.40\\Rightarrow G\\text{ fraction}=0.20$$\n$$G\\text{ count}=0.20\\times500{,}000{,}000=100{,}000{,}000\\;\\text{nt}=100\\,\\text{Mb}$$',
      body: 'Treating the genome size as total nucleotide count = 500,000,000 nt, with GC = 40% each of G and C = 20%. Therefore guanine count = 0.20 x 500,000,000 = 100,000,000 nt, which is 100 Mb of guanine.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Genome composition arithmetic</text>' +
          '<rect x="20" y="42" width="120" height="96" fill="#dbeafe" stroke="#1e3a8a"/><text x="80" y="62" font-size="9" text-anchor="middle">500,000,000 nt</text><text x="80" y="80" font-size="9" text-anchor="middle">GC = 40%</text>' +
          '<rect x="158" y="42" width="122" height="96" fill="#dcfce7" stroke="#166534"/><text x="219" y="62" font-size="9" text-anchor="middle">G fraction = 20%</text><text x="219" y="80" font-size="9" text-anchor="middle">G count = 100,000,000</text><text x="219" y="98" font-size="9" text-anchor="middle">= 100 Mb</text>',
      ),
    },
    {
      title: 'Identify organelles expected in a eukaryotic autotroph',
      formula:
        '$$\\text{core autotroph organelle set}=\\{\\text{chloroplast},\\text{mitochondrion},\\text{nucleus},\\text{vacuole}\\}$$',
      body: 'A eukaryotic autotroph cell includes chloroplasts for photosynthesis, mitochondria for ATP production, nucleus for genome regulation, and typically a large vacuole plus cell wall (in plants/algae contexts). The core set size = 4 organelles in this formula summary. Photosynthetic carbon fixation location = chloroplast stroma and thylakoid systems.',
      diagram: chloroplastDiagram(),
    },
    {
      title: 'Solve Hardy-Weinberg bioluminescence (L dominant, 500 organisms)',
      formula:
        '$$N=500,\\;\\text{non-luminescent}=420\\Rightarrow q^2=\\frac{420}{500}=0.84$$\n$$q=\\sqrt{0.84}=0.9165,\\;p=1-q=0.0835$$\n$$2pq=2(0.0835)(0.9165)=0.153$$',
      body: 'L is dominant (bioluminescent), so the 420 non-luminescent organisms are homozygous recessive (ll). Thus q^2 = 420/500 = 0.84 and q = 0.9165. Allele frequency p = 1 - 0.9165 = 0.0835. Carrier heterozygotes (Ll) have frequency 2pq = 0.153, so expected carriers = 0.153 x 500 = 76.5 organisms (about 77).',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Hardy-Weinberg (bioluminescence locus)</text>' +
          '<rect x="24" y="42" width="80" height="90" fill="#fee2e2" stroke="#991b1b"/><text x="64" y="60" font-size="9" text-anchor="middle">q^2</text><text x="64" y="78" font-size="9" text-anchor="middle">420/500</text><text x="64" y="96" font-size="9" text-anchor="middle">0.84</text>' +
          '<rect x="112" y="42" width="80" height="90" fill="#dbeafe" stroke="#1e3a8a"/><text x="152" y="60" font-size="9" text-anchor="middle">q</text><text x="152" y="78" font-size="9" text-anchor="middle">0.9165</text>' +
          '<rect x="200" y="42" width="80" height="90" fill="#dcfce7" stroke="#166534"/><text x="240" y="60" font-size="9" text-anchor="middle">2pq</text><text x="240" y="78" font-size="9" text-anchor="middle">0.153</text><text x="240" y="96" font-size="9" text-anchor="middle">76.5/500</text>',
      ),
    },
    {
      title: 'Compute trophic energy flow from 100,000 kcal solar input',
      formula:
        '$$\\text{GPP}=100{,}000\\times0.01=1{,}000\\;\\text{kcal}$$\n$$\\text{NPP}=1{,}000\\times(1-0.60)=400\\;\\text{kcal}$$\n$$\\text{secondary}=400\\times0.10=40\\;\\text{kcal}$$',
      body: 'Only 1% of solar energy is fixed by photosynthesis, so GPP = 100,000 x 0.01 = 1,000 kcal. With 60% lost to producer respiration, NPP = 1,000 x 0.40 = 400 kcal available to primary consumers. At 10% transfer efficiency, secondary consumers receive 400 x 0.10 = 40 kcal.',
      diagram: foodWeb(),
    },
    {
      title: 'Explain allopatric speciation mechanism',
      formula:
        '$$\\text{gene flow }m\\to0\\Rightarrow \\text{divergence }D\\uparrow\\Rightarrow \\text{reproductive isolation}=1$$',
      body: 'allopatric speciation begins with geographic barrier formation so migration rate m = 0 or near 0. Over time, mutation, selection, and drift increase divergence D. When reproductive isolation completes (isolation index = 1 in a simplified binary model), distinct species are formed.',
      diagram: phylogeneticTree(),
    },
    {
      title: 'Integrate molecular, cellular, population, ecosystem, and evolutionary scales',
      body: 'This synthesis links genome composition arithmetic, cell-organelle function, allele-frequency population genetics, ecosystem energetics, and macroevolutionary lineage splitting. Quantitative consistency is crucial: each subproblem includes explicit equals-sign calculations and biologically meaningful interpretation.',
      takeaway:
        'Integrated biology answer set: G = 100,000,000 (100 Mb); q = 0.9165, p = 0.0835, carriers ≈ 77; lake NPP = 400 kcal to primary consumers, 40 kcal to secondary consumers.',
    },
  ],
  solution:
    'For a 500 Mb genome at 40% GC, guanine is 20%, so G = 0.20 x 500,000,000 = 100,000,000 bases (100 Mb). A eukaryotic autotroph uses chloroplasts (thylakoid light reactions, stromal Calvin cycle) and mitochondria (matrix Krebs cycle, inner membrane oxidative phosphorylation) for energy metabolism. In 500 organisms with 420 non-luminescent (recessive) phenotypes, q^2=420/500=0.84, q=0.9165, p=0.0835, and carriers 2pq=0.153 (about 77 organisms). From 100,000 kcal solar input, GPP=1,000 kcal, NPP=400 kcal to primary consumers, and about 40 kcal to secondary consumers (10% rule). allopatric speciation occurs when geographic separation suppresses gene flow and divergence accumulates to reproductive isolation.',
  verifiedPatterns: [
    '500,000,000',
    '100,000,000',
    '100 Mb',
    '420/500',
    '0.84',
    '0.9165',
    '0.0835',
    '0.153',
    '76.5',
    '1,000',
    '400',
    '40',
    'allopatric speciation',
  ],
  minDiagramSteps: 4,
};
