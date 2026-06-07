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
    'In an integrative biology scenario (Biocius comprehensivus), calculate guanine count for a 500 Mb genome at 40% GC, identify key eukaryotic autotroph organelles, solve a Hardy-Weinberg bioluminescence case with 80 of 420 recessive individuals, compute lake energy flow from 100000 kcal, and explain allopatric speciation.',
  steps: [
    {
      title: 'Compute guanine count from genome size and GC content',
      formula:
        '$$\\text{genome size}=500\\,\\text{Mb}=500{,}000{,}000\\,\\text{bp}$$\n$$\\text{GC fraction}=40\\%=0.40\\Rightarrow G\\text{ fraction}=0.20$$\n$$G\\text{ count}=0.20\\times1{,}000{,}000{,}000=200{,}000{,}000\\;\\text{nucleotides}$$',
      body: 'For double-stranded DNA, total nucleotides = 2 x 500,000,000 = 1,000,000,000. With GC = 40%, each of G and C = 20%. Therefore guanine count = 0.20 x 1,000,000,000 = 200,000,000 nucleotides.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Genome composition arithmetic</text>' +
          '<rect x="20" y="42" width="120" height="96" fill="#dbeafe" stroke="#1e3a8a"/><text x="80" y="62" font-size="9" text-anchor="middle">500,000,000 bp</text><text x="80" y="80" font-size="9" text-anchor="middle">1,000,000,000 nt</text>' +
          '<rect x="158" y="42" width="122" height="96" fill="#dcfce7" stroke="#166534"/><text x="219" y="62" font-size="9" text-anchor="middle">GC = 40%</text><text x="219" y="80" font-size="9" text-anchor="middle">G = 20%</text><text x="219" y="98" font-size="9" text-anchor="middle">G = 200,000,000</text>',
      ),
    },
    {
      title: 'Identify organelles expected in a eukaryotic autotroph',
      formula:
        '$$\\text{core autotroph organelle set}=\\{\\text{chloroplast},\\text{mitochondrion},\\text{nucleus},\\text{vacuole}\\}$$',
      body: 'A eukaryotic autotroph cell includes chloroplasts for photosynthesis, mitochondria for ATP production, nucleus for genome regulation, and typically a large vacuole plus cell wall (in plants/algae contexts). Photosynthetic carbon fixation location = chloroplast stroma and thylakoid systems.',
      diagram: chloroplastDiagram(),
    },
    {
      title: 'Solve Hardy-Weinberg bioluminescence from 80 of 420 recessive',
      formula:
        '$$q^2=\\frac{80}{420}=0.190476\\Rightarrow q=\\sqrt{0.190476}=0.4364$$\n$$p=1-q=0.5636$$\n$$2pq=2(0.5636)(0.4364)=0.4919$$',
      body: 'Given recessive non-bioluminescent phenotype count = 80 of 420, q^2 = 0.190476 and q = 0.4364. Then p = 0.5636 and heterozygote frequency = 2pq = 0.4919. Expected heterozygote count = 0.4919 x 420 = 206.6 individuals (about 207).',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Hardy-Weinberg (bioluminescence locus)</text>' +
          '<rect x="24" y="42" width="80" height="90" fill="#fee2e2" stroke="#991b1b"/><text x="64" y="60" font-size="9" text-anchor="middle">q^2</text><text x="64" y="78" font-size="9" text-anchor="middle">80/420</text><text x="64" y="96" font-size="9" text-anchor="middle">0.1905</text>' +
          '<rect x="112" y="42" width="80" height="90" fill="#dbeafe" stroke="#1e3a8a"/><text x="152" y="60" font-size="9" text-anchor="middle">q</text><text x="152" y="78" font-size="9" text-anchor="middle">0.4364</text>' +
          '<rect x="200" y="42" width="80" height="90" fill="#dcfce7" stroke="#166534"/><text x="240" y="60" font-size="9" text-anchor="middle">2pq</text><text x="240" y="78" font-size="9" text-anchor="middle">0.4919</text><text x="240" y="96" font-size="9" text-anchor="middle">206.6/420</text>',
      ),
    },
    {
      title: 'Compute trophic energy flow from 100000 kcal in a lake',
      formula:
        '$$E_{n+1}=0.1\\times E_n$$\n$$100{,}000\\to10{,}000\\to1{,}000\\to100\\to10\\;\\text{kcal}$$',
      body: 'Applying the 10% transfer rule: producer energy = 100,000 kcal, primary consumer energy = 10,000 kcal, secondary = 1,000 kcal, tertiary = 100 kcal, and quaternary = 10 kcal. Energy loss per transfer = about 90% as heat, respiration, and waste.',
      diagram: foodWeb(),
    },
    {
      title: 'Explain allopatric speciation mechanism',
      formula:
        '$$\\text{gene flow }m\\to0\\Rightarrow \\text{divergence }D\\uparrow\\Rightarrow \\text{reproductive isolation}=1$$',
      body: 'Allopatric speciation begins with geographic barrier formation so migration rate m = 0 or near 0. Over time, mutation, selection, and drift increase divergence D. When reproductive isolation completes (isolation index = 1 in a simplified binary model), distinct species are formed.',
      diagram: phylogeneticTree(),
    },
    {
      title: 'Integrate molecular, cellular, population, ecosystem, and evolutionary scales',
      body: 'This synthesis links genome composition arithmetic, cell-organelle function, allele-frequency population genetics, ecosystem energetics, and macroevolutionary lineage splitting. Quantitative consistency is crucial: each subproblem includes explicit equals-sign calculations and biologically meaningful interpretation.',
      takeaway:
        'Integrated biology answer set: G = 200,000,000; p = 0.5636, q = 0.4364, 2pq = 0.4919 (about 207 heterozygotes); lake energy cascade = 100,000 -> 10,000 -> 1,000 -> 100 -> 10 kcal.',
    },
  ],
  solution:
    'For a 500 Mb double-stranded genome with 40% GC, total nucleotides are 1,000,000,000 and guanine is 20%, giving 200,000,000 G bases. A eukaryotic autotroph characteristically contains chloroplasts plus other eukaryotic organelles such as nucleus and mitochondria. In the Hardy-Weinberg case with 80 recessive individuals out of 420, q^2=80/420=0.190476, so q=0.4364, p=0.5636, and heterozygotes 2pq=0.4919 (about 206.6 of 420, approximately 207). With 100,000 kcal at producers, the 10% rule gives 10,000, 1,000, 100, and 10 kcal at successive trophic levels. Allopatric speciation occurs when geographic separation suppresses gene flow and divergence accumulates to reproductive isolation.',
  verifiedPatterns: [
    '500,000,000',
    '1,000,000,000',
    '200,000,000',
    '80/420',
    '0.190476',
    '0.4364',
    '0.5636',
    '0.4919',
    '206.6',
    '100,000',
    '10,000',
    '1,000',
    '100',
    '10',
    'allopatric speciation',
  ],
  minDiagramSteps: 4,
};
