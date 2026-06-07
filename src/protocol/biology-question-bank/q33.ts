import { gelElectrophoresis, pcrCycle, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q33: BiologyQuestionDef = {
  id: 'q33',
  number: 33,
  topic: 'PCR Amplification, Gel Electrophoresis, and RT-PCR',
  question:
    'Describe PCR cycle stages for DNA amplification, calculate expected copy number after 30 cycles, interpret gel electrophoresis output, and explain RT-PCR workflow from RNA to cDNA and interpretation.',
  steps: [
    {
      title: 'State the three core PCR thermal phases',
      body: 'A standard cycle includes denaturation, primer annealing, and extension. Temperature program = 95 C (strand separation), 50-65 C (primer binding), and 72 C (polymerase extension).',
      diagram: pcrCycle('denaturation'),
    },
    {
      title: 'Visualize primer binding and extension logic',
      body: 'Annealing positions set target specificity, and extension from primer 3\' ends defines amplicon boundaries. Product length = distance between primer-binding sites on opposite strands.',
      diagram: pcrCycle('annealing'),
    },
    {
      title: 'Compute ideal copy number after 30 cycles',
      formula:
        '$$N = N_0 \\times 2^n$$\n$$N_0=1,\\;n=30\\Rightarrow N=2^{30}=1{,}073{,}741{,}824$$',
      body: 'Under ideal efficiency, each cycle doubles DNA so N = N0 x 2^n. With N0 = 1 template and n = 30, final copies = 1,073,741,824 (about 1.07 x 10^9).',
    },
    {
      title: 'Interpret DNA band patterns on agarose gels',
      body: 'In gel electrophoresis, DNA migrates toward the positive electrode and smaller fragments run farther than larger fragments. Amplicon size = band position relative to ladder bands of known base-pair length.',
      diagram: gelElectrophoresis(),
    },
    {
      title: 'Explain RT-PCR from RNA to amplifiable cDNA',
      formula:
        '$$\\text{RNA} \\xrightarrow{\\text{reverse transcriptase}} \\text{cDNA} \\xrightarrow{\\text{PCR}} \\text{amplicon}$$',
      body: 'Reverse transcription converts RNA into cDNA first, then standard PCR amplifies that cDNA. For example, if starting RNA copies = 2,000 and reverse-transcription efficiency = 80%, cDNA copies = 1,600 before PCR cycling. In expression studies, starting template = RNA abundance, so higher mRNA generally yields earlier detection in quantitative setups.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">RT-PCR workflow</text>' +
          '<rect x="24" y="62" width="62" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="55" y="78" font-size="10" text-anchor="middle">RNA</text>' +
          '<rect x="118" y="62" width="78" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="157" y="78" font-size="10" text-anchor="middle">cDNA</text>' +
          '<rect x="224" y="62" width="62" height="24" fill="#dcfce7" stroke="#166534"/><text x="255" y="78" font-size="10" text-anchor="middle">PCR</text>' +
          '<line x1="86" y1="74" x2="118" y2="74" stroke="#1f2937"/><line x1="196" y1="74" x2="224" y2="74" stroke="#1f2937"/>' +
          '<text x="88" y="56" font-size="9">reverse transcriptase</text><text x="212" y="56" font-size="9">Taq polymerase</text>',
      ),
    },
    {
      title: 'Connect qPCR cycle threshold to starting template',
      formula:
        '$$\\Delta Ct = Ct_{target} - Ct_{reference}$$',
      body: 'In real-time PCR, lower Ct means higher starting template because fewer cycles are needed to cross threshold fluorescence. For example, if Ct_target = 22 and Ct_reference = 18, Delta Ct = 4, indicating lower relative target abundance.',
      takeaway:
        'PCR doubles target DNA each cycle in ideal conditions, gels verify amplicon size, and RT-PCR links RNA biology to DNA amplification.',
    },
  ],
  solution:
    'PCR cycles through denaturation, annealing, and extension to exponentially amplify DNA. Ideal amplification follows N = N0 x 2^n, so one starting template gives 2^30 = 1,073,741,824 copies after 30 cycles. Gel electrophoresis separates fragments by size, allowing amplicon validation against a ladder. RT-PCR first reverse-transcribes RNA into cDNA, then amplifies by PCR, enabling transcript detection and quantification (with Ct-based interpretation in qPCR).',
  verifiedPatterns: ['PCR', '2^30', '1,073,741,824', 'gel electrophoresis', 'RT-PCR', 'cDNA', 'Ct'],
  minDiagramSteps: 4,
};
