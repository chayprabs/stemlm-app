import { virusStructures, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q28: BiologyQuestionDef = {
  id: 'q28',
  number: 28,
  topic: 'Virus Structure, Viral Replication, and Antimicrobial Strategy',
  question:
    'In virology, compare bacteriophage and animal virus structures, distinguish lytic and lysogenic cycles, outline HIV replication steps, and explain why antibiotics differ from antivirals.',
  steps: [
    {
      title: 'Compare bacteriophage and animal virus architecture',
      body: 'Animal viruses are often enveloped and enter cells by membrane fusion or endocytosis, whereas bacteriophages typically inject nucleic acid through a tail apparatus into bacteria. Both require host-cell machinery for replication.',
      diagram: virusStructures(),
    },
    {
      title: 'Separate lytic and lysogenic replication logic',
      body: 'Lytic infection immediately produces virions and lyses host cells. Lysogenic infection integrates viral DNA as a prophage/provirus, replicates with the host genome, and can later switch to lytic production after induction.',
      diagram: wrapBioSvg(
        '<rect x="20" y="28" width="116" height="124" fill="#f8fafc" stroke="#334155"/>' +
          '<rect x="164" y="28" width="116" height="124" fill="#f8fafc" stroke="#334155"/>' +
          '<text x="78" y="20" font-size="10" text-anchor="middle">lytic cycle</text>' +
          '<text x="222" y="20" font-size="10" text-anchor="middle">lysogenic cycle</text>' +
          '<text x="30" y="50" font-size="9">attachment</text><text x="30" y="70" font-size="9">entry and synthesis</text><text x="30" y="90" font-size="9">assembly</text><text x="30" y="110" font-size="9">lysis and release</text>' +
          '<text x="174" y="50" font-size="9">attachment and entry</text><text x="174" y="70" font-size="9">genome integration</text><text x="174" y="90" font-size="9">host replication</text><text x="174" y="110" font-size="9">induction to lytic</text>',
      ),
    },
    {
      title: 'Compute burst-size output in a lytic event',
      formula:
        '$$\\text{virions produced}=\\text{infected cells}\\times\\text{burst size}$$\n$$100\\;\\text{infected bacteria}\\times50\\;\\text{virions/cell}=5000\\;\\text{virions}$$',
      body: 'With 100 infected cells and burst size 50, total release = 5000 virions. If only 60% of released particles are infectious, infectious count = 0.60x5000 = 3000 PFU-equivalent particles.',
    },
    {
      title: 'Outline HIV replication with key enzymes',
      body: 'HIV binds CD4 plus coreceptor (CCR5/CXCR4), fuses, reverse transcribes RNA to DNA, integrates via integrase, transcribes/translates viral components, assembles, buds, and matures through protease cleavage.',
      diagram: wrapBioSvg(
        '<rect x="14" y="30" width="272" height="118" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="52" y1="58" x2="252" y2="58" stroke="#334155"/><line x1="52" y1="86" x2="252" y2="86" stroke="#334155"/><line x1="52" y1="114" x2="252" y2="114" stroke="#334155"/>' +
          '<text x="30" y="58" font-size="9">1</text><text x="62" y="58" font-size="9">entry (CD4/CCR5)</text>' +
          '<text x="30" y="86" font-size="9">2</text><text x="62" y="86" font-size="9">reverse transcription</text>' +
          '<text x="30" y="114" font-size="9">3</text><text x="62" y="114" font-size="9">integration -> transcription</text>' +
          '<text x="30" y="142" font-size="9">4</text><text x="62" y="142" font-size="9">assembly, budding, protease maturation</text>' +
          '<text x="150" y="20" font-size="11" text-anchor="middle">HIV replication overview</text>',
      ),
    },
    {
      title: 'Quantify why antibiotics do not treat viral infections',
      formula:
        '$$\\text{Bacterial load reduction}=10^8\\to10^4\\Rightarrow 4\\text{-log drop}$$\n$$\\text{Viral load with antibiotic}=10^6\\to10^6\\Rightarrow 0\\text{-log change}$$',
      body: 'Antibiotics target bacterial structures (cell wall, ribosomes, DNA gyrase) absent in viruses. If an antiviral lowers HIV RNA from 1,000,000 to 10,000 copies/mL, that is 100-fold = 2-log reduction, whereas an antibiotic would typically show no direct antiviral effect.',
    },
    {
      title: 'Match antiviral class to viral lifecycle stage',
      body: 'Entry inhibitors block attachment/fusion, reverse-transcriptase inhibitors block cDNA synthesis, integrase inhibitors block genome integration, and protease inhibitors block maturation. Combination therapy reduces resistance emergence by targeting multiple replication steps.',
      takeaway:
        'Core distinction: viruses are obligate intracellular particles; antibiotics target bacteria, while antivirals target virus-specific lifecycle steps.',
    },
  ],
  solution:
    'Bacteriophages and animal viruses differ in structure and entry mode but both depend on host machinery. Lytic cycles produce immediate virion release; lysogenic cycles integrate viral genomes and can later induce lysis. In the worked burst-size example, 100 infected cells with burst size 50 produce 5000 virions. HIV replication requires reverse transcriptase, integrase, and protease, providing major antiviral drug targets. Antibiotics act on bacterial targets and generally do not reduce viral load, unlike antivirals.',
  verifiedPatterns: ['bacteriophage', 'animal virus', 'lytic', 'lysogenic', 'HIV', 'antivirals'],
  minDiagramSteps: 3,
};
