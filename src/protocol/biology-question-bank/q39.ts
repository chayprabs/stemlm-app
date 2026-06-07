import { dicotRoot, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q39: BiologyQuestionDef = {
  id: 'q39',
  number: 39,
  topic: 'Dicot Root Anatomy, Transport Pathways, and Plant Reproduction',
  question:
    'Interpret a dicot root cross-section, compare apoplast and symplast movement, explain phloem translocation, and differentiate pollination from double fertilisation.',
  steps: [
    {
      title: 'Identify tissues in a dicot root cross-section',
      body: 'A typical dicot root shows epidermis, cortex, endodermis, pericycle, xylem, and phloem. Radial vascular arrangement = central xylem with phloem between xylem arms.',
      diagram: dicotRoot(),
    },
    {
      title: 'Compare apoplast and symplast pathways',
      body: 'Apoplast transport follows cell walls/intercellular spaces, while symplast transport follows cytoplasm connected by plasmodesmata. At endodermis, Casparian strip blocks apoplast so mandatory membrane crossing = selective uptake checkpoint.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">apoplast vs symplast</text>' +
          '<rect x="24" y="36" width="116" height="112" fill="#dbeafe" stroke="#1e3a8a"/><text x="34" y="56" font-size="10">apoplast</text><text x="34" y="76" font-size="9">cell wall route</text><text x="34" y="94" font-size="9">no membrane crossing</text><line x1="34" y1="114" x2="120" y2="114" stroke="#1e3a8a" stroke-width="3"/>' +
          '<rect x="160" y="36" width="116" height="112" fill="#dcfce7" stroke="#166534"/><text x="170" y="56" font-size="10">symplast</text><text x="170" y="76" font-size="9">cytoplasm route</text><text x="170" y="94" font-size="9">via plasmodesmata</text><circle cx="192" cy="116" r="8" fill="#86efac" stroke="#15803d"/><circle cx="222" cy="116" r="8" fill="#86efac" stroke="#15803d"/><line x1="200" y1="116" x2="214" y2="116" stroke="#166534" stroke-width="2"/>',
      ),
    },
    {
      title: 'Apply pressure-flow model to phloem translocation',
      formula:
        '$$\\Delta P = P_{source} - P_{sink}$$\n$$J = k\\Delta P$$',
      body: 'Sucrose loading raises osmotic influx and turgor pressure in source phloem, while unloading lowers pressure at sinks. If P_source = 1.2 MPa and P_sink = 0.6 MPa, Delta P = 0.6 MPa driving mass flow from source to sink.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">phloem pressure-flow</text>' +
          '<rect x="24" y="60" width="80" height="38" fill="#dcfce7" stroke="#166534"/><text x="64" y="82" font-size="10" text-anchor="middle">source leaf</text>' +
          '<rect x="198" y="60" width="80" height="38" fill="#fee2e2" stroke="#991b1b"/><text x="238" y="82" font-size="10" text-anchor="middle">sink root/fruit</text>' +
          '<line x1="104" y1="79" x2="198" y2="79" stroke="#1f2937" stroke-width="3"/><text x="124" y="70" font-size="9">sucrose flow</text><text x="44" y="118" font-size="9">P=1.2</text><text x="216" y="118" font-size="9">P=0.6</text>',
      ),
    },
    {
      title: 'Differentiate pollination from double fertilisation',
      body: 'Pollination is pollen transfer from anther to stigma, while fertilisation occurs later in the ovule after pollen tube growth. In angiosperms, double fertilisation = one sperm fuses with egg and the other with central cell nuclei.',
      diagram: wrapBioSvg(
        '<text x="14" y="20" font-size="12">pollination and double fertilisation</text>' +
          '<rect x="20" y="40" width="120" height="112" fill="#fef3c7" stroke="#a16207"/><text x="30" y="60" font-size="10">pollination</text><text x="30" y="80" font-size="9">anther -> stigma</text><line x1="42" y1="94" x2="112" y2="94" stroke="#a16207" stroke-width="2"/>' +
          '<rect x="160" y="40" width="120" height="112" fill="#dbeafe" stroke="#1e3a8a"/><text x="170" y="60" font-size="10">double fertilisation</text><text x="170" y="80" font-size="9">sperm1 + egg</text><text x="170" y="98" font-size="9">sperm2 + central cell</text>',
      ),
    },
    {
      title: 'Compute ploidy outcomes in double fertilisation',
      formula:
        '$$1n\\;(\\text{sperm}) + 1n\\;(\\text{egg}) = 2n\\;(\\text{zygote})$$\n$$1n\\;(\\text{sperm}) + 2n\\;(\\text{central cell}) = 3n\\;(\\text{endosperm})$$',
      body: 'Angiosperm reproduction simultaneously forms embryo and nutritive tissue. Resulting ploidy = 2n embryo plus 3n endosperm in the same ovule after successful double fertilisation.',
    },
    {
      title: 'Integrate transport and reproduction into plant function',
      body: 'Root uptake pathways support xylem delivery, phloem reallocates photoassimilates, and reproductive success depends on pollination followed by fertilisation events. Whole-plant performance = coordinated anatomy, transport physics, and reproductive biology.',
      takeaway:
        'Key distinctions: apoplast vs symplast, pollination vs fertilisation, and embryo 2n vs endosperm 3n after double fertilisation.',
    },
  ],
  solution:
    'Dicot roots contain epidermis, cortex, endodermis, and vascular tissues with central xylem. Water/solute movement occurs through apoplast and symplast routes, with endodermal control at the Casparian strip. Phloem translocation follows pressure-flow logic where source pressure exceeds sink pressure (Delta P = P_source - P_sink). Pollination is pollen transfer, whereas double fertilisation in angiosperms produces a 2n zygote and 3n endosperm via two sperm fusion events.',
  verifiedPatterns: ['dicot root', 'apoplast', 'symplast', 'phloem translocation', 'pollination', 'double fertilisation', '2n zygote', '3n endosperm'],
  minDiagramSteps: 4,
};
