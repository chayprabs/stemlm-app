import { wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q44: BiologyQuestionDef = {
  id: 'q44',
  number: 44,
  topic: 'CRISPR Editing: NHEJ vs HDR, Applications, Ethics, and Next-Generation Editors',
  question:
    'In genome engineering, explain CRISPR-Cas target recognition, compare non-homologous end joining (NHEJ) versus homology-directed repair (HDR), evaluate medical/agricultural/research applications, discuss germline ethics, and distinguish base editing from prime editing.',
  steps: [
    {
      title: 'Map CRISPR-Cas target recognition and cleavage',
      body: 'CRISPR-Cas9 target selection requires guide RNA complementarity and a PAM sequence (for SpCas9, PAM = NGG). DNA double-strand break position = typically 3 bp upstream of PAM, creating a repair decision point between NHEJ and HDR.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">CRISPR target and PAM</text>' +
          '<line x1="22" y1="78" x2="278" y2="78" stroke="#1d4ed8" stroke-width="3"/><line x1="22" y1="96" x2="278" y2="96" stroke="#dc2626" stroke-width="3"/>' +
          '<rect x="120" y="66" width="58" height="42" fill="#dcfce7" stroke="#166534"/><text x="149" y="84" font-size="9" text-anchor="middle">gRNA match</text><text x="149" y="98" font-size="9" text-anchor="middle">20 nt</text>' +
          '<rect x="186" y="66" width="30" height="42" fill="#fde68a" stroke="#a16207"/><text x="201" y="88" font-size="9" text-anchor="middle">PAM</text>' +
          '<line x1="178" y1="70" x2="178" y2="104" stroke="#991b1b" stroke-width="2"/><text x="154" y="60" font-size="9">cut site</text>',
      ),
    },
    {
      title: 'Compare NHEJ and HDR repair outcomes quantitatively',
      formula:
        '$$\\text{editing outcomes}\\;\\% = \\text{NHEJ} + \\text{HDR} + \\text{unedited}$$\n$$62 + 18 + 20 = 100$$',
      body: 'If edited cells = 100 total, one dataset can show NHEJ = 62 cells, HDR = 18 cells, and unedited = 20 cells. NHEJ tends to create indels (frameshift knockouts), while HDR can install precise sequence changes when donor template = available.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Repair pathway split after DSB</text>' +
          '<rect x="116" y="36" width="70" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="151" y="52" font-size="9" text-anchor="middle">DSB</text>' +
          '<line x1="151" y1="60" x2="92" y2="102" stroke="#334155" stroke-width="2"/><line x1="151" y1="60" x2="210" y2="102" stroke="#334155" stroke-width="2"/>' +
          '<rect x="48" y="102" width="88" height="30" fill="#fecaca" stroke="#991b1b"/><text x="92" y="118" font-size="9" text-anchor="middle">NHEJ 62%</text><text x="92" y="128" font-size="8" text-anchor="middle">indels</text>' +
          '<rect x="166" y="102" width="88" height="30" fill="#dbeafe" stroke="#1e3a8a"/><text x="210" y="118" font-size="9" text-anchor="middle">HDR 18%</text><text x="210" y="128" font-size="8" text-anchor="middle">precise edit</text>',
      ),
    },
    {
      title: 'Organize applications across medicine, agriculture, and research',
      body: 'Medicine use = somatic editing for monogenic disease, oncology, and cell therapy. Agriculture use = trait improvement (yield, disease resistance, stress tolerance). Research use = knockout/knock-in models and pooled functional genomics screens where guide abundance readout = phenotype proxy.',
      diagram: wrapBioSvg(
        '<rect x="20" y="34" width="80" height="96" fill="#fee2e2" stroke="#991b1b"/><text x="60" y="52" font-size="10" text-anchor="middle">medicine</text><text x="60" y="72" font-size="8" text-anchor="middle">somatic therapy</text>' +
          '<rect x="110" y="34" width="80" height="96" fill="#dcfce7" stroke="#166534"/><text x="150" y="52" font-size="10" text-anchor="middle">agriculture</text><text x="150" y="72" font-size="8" text-anchor="middle">crop traits</text>' +
          '<rect x="200" y="34" width="80" height="96" fill="#dbeafe" stroke="#1e3a8a"/><text x="240" y="52" font-size="10" text-anchor="middle">research</text><text x="240" y="72" font-size="8" text-anchor="middle">functional genomics</text>' +
          '<text x="14" y="20" font-size="12">CRISPR application domains</text>',
      ),
    },
    {
      title: 'Evaluate germline-editing ethics with risk-benefit framing',
      formula:
        '$$\\text{net utility}=\\text{benefit score}-\\text{risk score}$$\n$$8-6=2$$',
      body: 'A simple framework can score expected clinical benefit = 8 and unresolved intergenerational risk = 6, giving net utility = 2, but ethical acceptability still depends on consent limits, justice, reversibility, and governance. Germline edits are heritable, so societal externalities = nontrivial.',
    },
    {
      title: 'Distinguish base editing and prime editing outcomes',
      formula:
        '$$\\text{base-edit efficiency}=\\frac{48}{60}=0.80=80\\%$$\n$$\\text{prime-edit efficiency}=\\frac{21}{60}=0.35=35\\%$$',
      body: 'Base editing performs direct nucleotide transitions without double-strand breaks (for example C to T or A to G depending on editor). Prime editing uses reverse transcriptase plus pegRNA to write short edits; if precise edits = 21/60, efficiency = 35%, and if indels = 2/60, indel rate = 3.3%.',
      diagram: wrapBioSvg(
        '<text x="14" y="18" font-size="12">Base editing vs prime editing</text>' +
          '<rect x="24" y="44" width="118" height="90" fill="#fef3c7" stroke="#a16207"/><text x="83" y="62" font-size="10" text-anchor="middle">base editor</text><text x="83" y="80" font-size="9" text-anchor="middle">C -> T</text><text x="83" y="98" font-size="9" text-anchor="middle">A -> G</text><text x="83" y="116" font-size="8" text-anchor="middle">no DSB</text>' +
          '<rect x="158" y="44" width="118" height="90" fill="#ede9fe" stroke="#5b21b6"/><text x="217" y="62" font-size="10" text-anchor="middle">prime editor</text><text x="217" y="80" font-size="9" text-anchor="middle">Cas nickase + RT</text><text x="217" y="98" font-size="9" text-anchor="middle">pegRNA template</text><text x="217" y="116" font-size="8" text-anchor="middle">small insert/delete/substitute</text>',
      ),
    },
    {
      title: 'Integrate repair biology with translational decisions',
      body: 'Practical editing strategy = match mechanism to goal: NHEJ for knockout, HDR for precise replacement, base editors for transition mutations, and prime editors for versatile short edits. Safety profile depends on off-target frequency, on-target byproducts, and delivery constraints.',
      takeaway:
        'CRISPR mastery requires knowing repair pathway probabilities, application context, and ethical boundaries for somatic versus germline editing.',
    },
  ],
  solution:
    'CRISPR-Cas editing uses guide RNA and PAM recognition to generate targeted DNA breaks or nicks. After cleavage, NHEJ usually dominates and introduces indels, while HDR can install precise changes when donor templates are present. CRISPR applications span medicine, agriculture, and research, but germline editing raises special ethical concerns because edits are heritable. Base editing enables direct base transitions without double-strand breaks, whereas prime editing uses reverse transcriptase-guided writing for broader precise edits.',
  verifiedPatterns: ['PAM', 'NHEJ', 'HDR', '62', '18', 'base editing', 'prime editing', 'germline'],
  minDiagramSteps: 4,
};
