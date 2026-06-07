import {
  replicationForkDiagram,
  telomeraseDiagram,
  wrapBioSvg,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q08: BiologyQuestionDef = {
  id: 'q08',
  number: 8,
  topic: 'DNA Replication Fork Dynamics and Telomerase',
  question:
    'Draw a replication fork, justify 5\'->3\' synthesis and semiconservative replication, distinguish leading/lagging strand synthesis, and explain why telomerase is required in eukaryotes.',
  steps: [
    {
      title: 'Lay out semiconservative replication logic',
      body: 'Semiconservative replication means each daughter duplex contains one parental strand and one newly synthesized strand. Meselson-Stahl density-shift experiments classically supported this model over conservative and dispersive alternatives.',
      diagram: wrapBioSvg(
        '<rect x="24" y="44" width="74" height="84" fill="#dbeafe" stroke="#1d4ed8"/>' +
          '<rect x="114" y="44" width="74" height="84" fill="#dcfce7" stroke="#15803d"/>' +
          '<rect x="204" y="44" width="74" height="84" fill="#fee2e2" stroke="#b91c1c"/>' +
          '<text x="34" y="66" font-size="10">generation 0</text><text x="38" y="88" font-size="10">HH DNA</text>' +
          '<text x="126" y="66" font-size="10">generation 1</text><text x="124" y="88" font-size="10">HL DNA</text>' +
          '<text x="214" y="66" font-size="10">generation 2</text><text x="212" y="88" font-size="10">HL + LL</text>' +
          '<text x="28" y="116" font-size="9">density gradient pattern</text>',
      ),
    },
    {
      title: 'Read strand polarity at the replication fork',
      body: 'DNA polymerases synthesize only in 5\'->3\' direction by adding dNTPs to a free 3\'-OH. Therefore one template permits continuous leading-strand synthesis, while the opposite template produces discontinuous Okazaki fragments.',
      diagram: replicationForkDiagram(),
    },
    {
      title: 'Quantify lagging-strand fragment timing',
      formula:
        '$$\\text{If fragment length}=150\\,\\text{nt and fork polymerase speed}=50\\,\\text{nt/s},\\;t=\\frac{150}{50}=3\\,\\text{s}$$',
      body: 'In eukaryotes, Okazaki fragments are often about 100-200 nt. Using 150 nt and 50 nt/s gives about 3 s to synthesize one fragment before primer removal and ligation steps.',
    },
    {
      title: 'State replisome components and roles',
      body: 'Helicase unwinds duplex DNA, single-strand binding proteins stabilize templates, primase makes RNA primers, DNA polymerases extend DNA, RNase H/FEN1 remove primers, and ligase seals nicks. Sliding clamps and clamp loaders increase processivity.',
    },
    {
      title: 'Explain the end-replication problem and telomerase',
      formula:
        '$$\\text{Human telomere repeat}=(\\text{TTAGGG})_n$$',
      body: 'After removal of the terminal RNA primer on lagging strands, conventional polymerases cannot fully fill the 5\' end, causing progressive shortening. Telomerase extends the 3\' overhang using an internal RNA template that adds TTAGGG repeats.',
      diagram: telomeraseDiagram(),
    },
    {
      title: 'Relate telomerase activity to cell fate',
      body: 'Most somatic cells have low telomerase, so telomeres shorten with divisions and can trigger senescence checkpoints. Germline, stem, and many cancer cells maintain higher telomerase activity, supporting extended proliferative potential.',
      takeaway:
        'Core principles: semiconservative copying, universal 5\'->3\' synthesis, discontinuous lagging strand, and telomerase-mediated telomere maintenance.',
    },
  ],
  solution:
    'DNA replication is semiconservative, producing daughter molecules with one old and one new strand. Polymerases extend only 5\'->3\', so leading strand synthesis is continuous and lagging strand synthesis is discontinuous via Okazaki fragments. A simple timing estimate gives 150 nt / 50 nt s^-1 = 3 s per fragment. Telomerase solves the eukaryotic end-replication problem by extending 3\' ends with TTAGGG repeats, reducing net telomere loss in high-renewal cell types.',
  verifiedPatterns: ['semiconservative', '5\'->3\'', 'Okazaki', '150', '3 s', 'TTAGGG', 'telomerase'],
  minDiagramSteps: 3,
};
