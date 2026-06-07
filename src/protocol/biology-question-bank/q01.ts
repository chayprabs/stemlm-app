import {
  endosymbiosisDiagram,
  eukaryoteCellDiagram,
  prokaryoteCellDiagram,
  wrapBioSvg,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q01: BiologyQuestionDef = {
  id: 'q01',
  number: 1,
  topic: 'Prokaryote vs Eukaryote and Endosymbiosis',
  question:
    'Compare prokaryotic and eukaryotic cells using a structured table and labeled diagrams. Then explain the endosymbiotic origin of mitochondria (and chloroplasts) with key molecular evidence.',
  steps: [
    {
      title: 'Build a comparison table for major cell features',
      body: 'At UG Year 1 level, key contrasts are: nucleus absent vs present, circular vs linear chromosomes, 70S vs 80S cytosolic ribosomes, and binary fission vs mitosis/meiosis. Typical bacterial cells are about 1-5 um, while many animal/plant cells are about 10-100 um.',
      diagram: wrapBioSvg(
        '<rect x="18" y="20" width="264" height="136" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="106" y1="20" x2="106" y2="156" stroke="#334155"/>' +
          '<line x1="194" y1="20" x2="194" y2="156" stroke="#334155"/>' +
          '<line x1="18" y1="44" x2="282" y2="44" stroke="#334155"/>' +
          '<line x1="18" y1="70" x2="282" y2="70" stroke="#cbd5e1"/>' +
          '<line x1="18" y1="96" x2="282" y2="96" stroke="#cbd5e1"/>' +
          '<line x1="18" y1="122" x2="282" y2="122" stroke="#cbd5e1"/>' +
          '<text x="44" y="36" font-size="10">feature</text>' +
          '<text x="122" y="36" font-size="10">prokaryote</text>' +
          '<text x="214" y="36" font-size="10">eukaryote</text>' +
          '<text x="24" y="60" font-size="9">nucleus</text><text x="126" y="60" font-size="9">absent</text><text x="214" y="60" font-size="9">present</text>' +
          '<text x="24" y="86" font-size="9">DNA form</text><text x="126" y="86" font-size="9">circular</text><text x="214" y="86" font-size="9">linear + histones</text>' +
          '<text x="24" y="112" font-size="9">ribosome</text><text x="126" y="112" font-size="9">70S</text><text x="214" y="112" font-size="9">80S cytosolic</text>' +
          '<text x="24" y="138" font-size="9">division</text><text x="126" y="138" font-size="9">binary fission</text><text x="214" y="138" font-size="9">mitosis/meiosis</text>',
      ),
    },
    {
      title: 'Read the prokaryotic cell diagram',
      body: 'A bacterial cell diagram should show capsule, cell wall, plasma membrane, nucleoid DNA, 70S ribosomes, and often flagellum. The absence of membrane-bound organelles is a defining criterion for prokaryotes.',
      diagram: prokaryoteCellDiagram(),
    },
    {
      title: 'Read the eukaryotic cell diagram',
      body: 'A eukaryotic cell includes nucleus and membrane-bound organelles such as mitochondria, ER, and Golgi-associated vesicles. Cytosolic ribosomes are 80S, while mitochondria/chloroplasts contain 70S-like ribosomes.',
      diagram: eukaryoteCellDiagram(),
    },
    {
      title: 'State endosymbiosis and timeline logic',
      body: 'Endosymbiotic theory proposes that an archaeal-like host engulfed an aerobic alpha-proteobacterium about 1.5-2.0 billion years ago, forming mitochondria. Later in plant/algal lineages, cyanobacterial endosymbiosis gave rise to chloroplasts.',
      diagram: endosymbiosisDiagram(),
    },
    {
      title: 'Use molecular evidence to support endosymbiosis',
      body: 'Evidence includes: (1) double membranes, (2) circular organelle DNA, (3) 70S-like ribosomes, (4) fission-like division independent of host mitosis, and (5) bacterial phylogenetic clustering of organelle genes. These independent lines are mutually reinforcing.',
    },
    {
      title: 'Synthesize exam-ready contrasts and exceptions',
      body: 'Not all prokaryotes are bacteria (archaea are prokaryotic too), and not all eukaryotes are multicellular. Also, ribosome notation 70S/80S is sedimentation behavior, not arithmetic subunit sums (50S+30S and 60S+40S).',
      takeaway:
        'Core answer: prokaryotes lack a nucleus and membrane-bound organelles; mitochondria/chloroplasts in eukaryotes are best explained by endosymbiotic origin.',
    },
  ],
  solution:
    'Prokaryotes (typically 1-5 um) lack a membrane-bound nucleus, usually contain circular DNA in a nucleoid, use 70S ribosomes, and divide by binary fission. Eukaryotes (often 10-100 um) have a true nucleus, linear chromosomes with histones, membrane-bound organelles, and cytosolic 80S ribosomes. Endosymbiosis explains mitochondrial and chloroplast origin from bacteria: organelles have double membranes, circular genomes, 70S-like ribosomes, and bacterial-like phylogenetic signatures.',
  verifiedPatterns: ['70S', '80S', 'binary fission', 'mitosis', 'endosymbiosis', 'double membrane'],
  minDiagramSteps: 3,
};
