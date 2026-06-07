/**
 * Reusable SVG building blocks for biology diagram steps.
 * ViewBox 0 0 300 180 (or smaller height) per core-protocol guidance.
 */

import { axesGraph } from './math-svg';

const ARROW_DEF =
  '<defs><marker id="bio-arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#1f2937"/></marker></defs>';

const BLUE = '#1d4ed8';
const GREEN = '#15803d';
const RED = '#b91c1c';

export function wrapBioSvg(inner: string, viewBox = '0 0 300 180'): string {
  return `<svg viewBox="${viewBox}">${inner}</svg>`;
}

function graphInner(opts: Parameters<typeof axesGraph>[0]): string {
  const svg = axesGraph(opts);
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

export function prokaryoticCell(): string {
  const membrane =
    '<ellipse cx="145" cy="92" rx="108" ry="64" fill="#f0fdf4" stroke="#166534" stroke-width="3"/>' +
    '<ellipse cx="145" cy="92" rx="95" ry="52" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/>';
  const nucleoid = '<path d="M95 85 C120 52, 180 58, 193 87 C172 117, 118 122, 95 85 Z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>';
  const dna = '<path d="M108 88 C124 72, 148 104, 171 84 C180 76, 183 100, 165 105 C149 111, 131 85, 118 95" fill="none" stroke="#1e40af" stroke-width="1.5"/>';
  const plasmids =
    '<circle cx="198" cy="114" r="10" fill="none" stroke="#9333ea" stroke-width="2"/>' +
    '<circle cx="85" cy="112" r="8" fill="none" stroke="#9333ea" stroke-width="2"/>';
  const ribosomeCenters: Array<[number, number]> = [
    [94, 66],
    [112, 58],
    [132, 62],
    [165, 61],
    [187, 70],
    [73, 83],
    [205, 83],
    [82, 99],
    [214, 99],
    [104, 121],
    [137, 126],
    [176, 123],
  ];
  const ribosomes = ribosomeCenters
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#0f172a"/>`)
    .join('');
  const appendages =
    '<path d="M251 99 C272 105, 286 118, 289 133" fill="none" stroke="#0f766e" stroke-width="3"/>' +
    '<line x1="60" y1="60" x2="40" y2="45" stroke="#0f766e" stroke-width="2"/>' +
    '<line x1="57" y1="88" x2="34" y2="84" stroke="#0f766e" stroke-width="2"/>' +
    '<line x1="62" y1="116" x2="39" y2="125" stroke="#0f766e" stroke-width="2"/>';
  const labels =
    '<text x="12" y="24" font-size="12">Prokaryotic cell</text>' +
    '<text x="15" y="40" font-size="11">cell wall</text>' +
    '<line x1="64" y1="36" x2="83" y2="52" stroke="#374151"/>' +
    '<text x="196" y="44" font-size="11">nucleoid DNA</text>' +
    '<line x1="208" y1="48" x2="180" y2="72" stroke="#374151"/>' +
    '<text x="208" y="128" font-size="11">plasmid</text>' +
    '<text x="228" y="147" font-size="11">flagellum</text>';
  return wrapBioSvg(membrane + nucleoid + dna + plasmids + ribosomes + appendages + labels);
}

export function bioTable(): string {
  const title = '<text x="150" y="20" font-size="13" text-anchor="middle">DNA vs RNA vs Protein</text>';
  const cols = ['Feature', 'DNA', 'RNA', 'Protein'];
  const rows: string[][] = [
    ['Monomer', 'nucleotide', 'nucleotide', 'amino acid'],
    ['Primary role', 'store genes', 'message/catalysis', 'structure/enzymes'],
    ['Location', 'nucleus', 'nucleus + cytoplasm', 'cytoplasm + membrane'],
  ];
  const cellW = 68;
  const cellH = 28;
  const ox = 14;
  const oy = 30;
  let table = title;
  cols.forEach((col, i) => {
    const x = ox + i * cellW;
    table += `<rect x="${x}" y="${oy}" width="${cellW}" height="${cellH}" fill="#e2e8f0" stroke="#334155"/>`;
    table += `<text x="${x + cellW / 2}" y="${oy + 18}" font-size="10" text-anchor="middle">${col}</text>`;
  });
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = ox + ci * cellW;
      const y = oy + (ri + 1) * cellH;
      table += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="#f8fafc" stroke="#334155"/>`;
      table += `<text x="${x + cellW / 2}" y="${y + 18}" font-size="9.5" text-anchor="middle">${cell}</text>`;
    });
  });
  return wrapBioSvg(table, '0 0 300 145');
}

export function fluidMosaicMembrane(): string {
  const headsTop = Array.from({ length: 12 }, (_, i) => 42 + i * 18)
    .map((x) => `<circle cx="${x}" cy="56" r="5" fill="#60a5fa" stroke="#1d4ed8"/>`)
    .join('');
  const headsBottom = Array.from({ length: 12 }, (_, i) => 42 + i * 18)
    .map((x) => `<circle cx="${x}" cy="124" r="5" fill="#60a5fa" stroke="#1d4ed8"/>`)
    .join('');
  const tails = Array.from({ length: 12 }, (_, i) => 42 + i * 18)
    .map(
      (x) =>
        `<line x1="${x - 2}" y1="62" x2="${x - 2}" y2="118" stroke="#0284c7" stroke-width="1.5"/>` +
        `<line x1="${x + 2}" y1="62" x2="${x + 2}" y2="118" stroke="#0284c7" stroke-width="1.5"/>`,
    )
    .join('');
  const proteins =
    '<rect x="98" y="48" width="24" height="84" rx="10" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>' +
    '<ellipse cx="182" cy="90" rx="18" ry="12" fill="#fde68a" stroke="#92400e" stroke-width="2"/>' +
    '<circle cx="146" cy="72" r="6" fill="#fca5a5" stroke="#b91c1c" stroke-width="1.5"/>' +
    '<circle cx="160" cy="104" r="6" fill="#fca5a5" stroke="#b91c1c" stroke-width="1.5"/>';
  const labels =
    '<text x="12" y="22" font-size="12">Fluid mosaic membrane</text>' +
    '<text x="12" y="42" font-size="11">extracellular</text>' +
    '<text x="12" y="154" font-size="11">cytoplasm</text>' +
    '<text x="131" y="42" font-size="10">channel protein</text>' +
    '<text x="194" y="92" font-size="10">cholesterol</text>' +
    '<text x="138" y="138" font-size="10">phospholipid tails</text>';
  return wrapBioSvg(headsTop + headsBottom + tails + proteins + labels);
}

export function reactionEnergyDiagram(): string {
  const path = 'M 40 132 C 88 128, 112 54, 154 52 C 198 54, 226 114, 272 108';
  const annotations =
    '<line x1="40" y1="132" x2="40" y2="109" stroke="#64748b" stroke-dasharray="4 3"/>' +
    '<line x1="272" y1="108" x2="272" y2="87" stroke="#64748b" stroke-dasharray="4 3"/>' +
    '<line x1="154" y1="52" x2="154" y2="24" stroke="#ef4444" stroke-dasharray="4 3"/>' +
    '<text x="28" y="106" font-size="10">reactants</text>' +
    '<text x="245" y="84" font-size="10">products</text>' +
    '<text x="162" y="26" font-size="10" fill="#ef4444">Ea</text>';
  return axesGraph({
    xLabel: 'reaction progress',
    yLabel: 'energy',
    curves: [{ d: path, stroke: RED, label: 'energy profile', labelPos: [174, 66] }],
    annotations,
  });
}

export function michaelisMentenCurve(): string {
  const curve = 'M 40 130 C 86 86, 130 63, 272 50';
  const annotations =
    '<line x1="40" y1="50" x2="272" y2="50" stroke="#64748b" stroke-dasharray="5 4"/>' +
    '<line x1="118" y1="140" x2="118" y2="76" stroke="#64748b" stroke-dasharray="5 4"/>' +
    '<line x1="40" y1="95" x2="118" y2="95" stroke="#64748b" stroke-dasharray="5 4"/>' +
    '<text x="245" y="46" font-size="10">Vmax</text>' +
    '<text x="122" y="76" font-size="10">Km</text>' +
    '<text x="44" y="93" font-size="10">1/2 Vmax</text>';
  return axesGraph({
    xLabel: '[S]',
    yLabel: 'v',
    curves: [{ d: curve, stroke: BLUE, label: 'v = Vmax[S]/(Km+[S])', labelPos: [122, 34] }],
    annotations,
  });
}

export function respirationFlowchart(): string {
  const boxes = [
    '<rect x="16" y="28" width="66" height="24" fill="#dbeafe" stroke="#1e3a8a"/>',
    '<text x="49" y="44" font-size="10" text-anchor="middle">Glucose</text>',
    '<rect x="104" y="28" width="82" height="24" fill="#dcfce7" stroke="#166534"/>',
    '<text x="145" y="44" font-size="10" text-anchor="middle">Glycolysis</text>',
    '<rect x="208" y="28" width="76" height="24" fill="#fee2e2" stroke="#991b1b"/>',
    '<text x="246" y="44" font-size="10" text-anchor="middle">Pyruvate</text>',
    '<rect x="110" y="82" width="80" height="24" fill="#fef3c7" stroke="#92400e"/>',
    '<text x="150" y="98" font-size="10" text-anchor="middle">Krebs cycle</text>',
    '<rect x="98" y="136" width="104" height="24" fill="#ede9fe" stroke="#5b21b6"/>',
    '<text x="150" y="152" font-size="10" text-anchor="middle">ETC + ATP synthase</text>',
  ].join('');
  const arrows =
    ARROW_DEF +
    '<line x1="82" y1="40" x2="104" y2="40" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="186" y1="40" x2="208" y2="40" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="246" y1="52" x2="190" y2="82" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="150" y1="106" x2="150" y2="136" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="20" y="70" font-size="10">2 ATP + 2 NADH</text>' +
    '<text x="210" y="70" font-size="10">acetyl-CoA</text>' +
    '<text x="22" y="117" font-size="10">CO2 released</text>' +
    '<text x="206" y="117" font-size="10">NADH/FADH2</text>' +
    '<text x="218" y="156" font-size="10">~30-32 ATP</text>';
  return wrapBioSvg(boxes + arrows + labels);
}

export function chloroplast(): string {
  const envelope =
    '<ellipse cx="150" cy="92" rx="110" ry="64" fill="#ecfccb" stroke="#4d7c0f" stroke-width="3"/>' +
    '<ellipse cx="150" cy="92" rx="98" ry="54" fill="#f7fee7" stroke="#65a30d" stroke-width="2"/>';
  const granumCenters: Array<[number, number]> = [
    [104, 78],
    [150, 72],
    [194, 80],
    [126, 112],
    [176, 116],
  ];
  const grana = granumCenters
    .map(
      ([x, y]) =>
        `<ellipse cx="${x}" cy="${y}" rx="20" ry="7" fill="#86efac" stroke="#15803d"/>` +
        `<ellipse cx="${x}" cy="${y + 8}" rx="20" ry="7" fill="#86efac" stroke="#15803d"/>` +
        `<ellipse cx="${x}" cy="${y + 16}" rx="20" ry="7" fill="#86efac" stroke="#15803d"/>`,
    )
    .join('');
  const labels =
    '<text x="14" y="22" font-size="12">Chloroplast</text>' +
    '<text x="20" y="39" font-size="10">double membrane</text>' +
    '<line x1="100" y1="34" x2="112" y2="46" stroke="#334155"/>' +
    '<text x="224" y="62" font-size="10">stroma</text>' +
    '<line x1="228" y1="64" x2="208" y2="83" stroke="#334155"/>' +
    '<text x="220" y="129" font-size="10">granum</text>' +
    '<line x1="220" y1="131" x2="197" y2="118" stroke="#334155"/>';
  return wrapBioSvg(envelope + grana + labels);
}

export function cellCycle(): string {
  const sectors =
    '<path d="M150 90 L150 24 A66 66 0 0 1 214 96 Z" fill="#bfdbfe" stroke="#1e3a8a"/>' +
    '<path d="M150 90 L214 96 A66 66 0 0 1 150 156 Z" fill="#bbf7d0" stroke="#166534"/>' +
    '<path d="M150 90 L150 156 A66 66 0 0 1 84 96 Z" fill="#fef08a" stroke="#a16207"/>' +
    '<path d="M150 90 L84 96 A66 66 0 0 1 150 24 Z" fill="#fecaca" stroke="#991b1b"/>';
  const arrows =
    ARROW_DEF +
    '<path d="M154 32 A58 58 0 0 1 206 96" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<path d="M206 100 A58 58 0 0 1 154 148" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<path d="M146 148 A58 58 0 0 1 94 100" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<path d="M94 92 A58 58 0 0 1 146 32" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="150" y="18" font-size="11" text-anchor="middle">Cell cycle</text>' +
    '<text x="196" y="78" font-size="11">G1</text>' +
    '<text x="176" y="132" font-size="11">S</text>' +
    '<text x="106" y="132" font-size="11">G2</text>' +
    '<text x="92" y="78" font-size="11">M</text>' +
    '<text x="150" y="95" font-size="10" text-anchor="middle">interphase</text>';
  return wrapBioSvg(sectors + arrows + labels);
}

export function proteinStructures(): string {
  const primary =
    '<circle cx="34" cy="58" r="4" fill="#f97316"/><circle cx="48" cy="58" r="4" fill="#f97316"/><circle cx="62" cy="58" r="4" fill="#f97316"/><circle cx="76" cy="58" r="4" fill="#f97316"/><line x1="34" y1="58" x2="76" y2="58" stroke="#9a3412"/>';
  const secondary =
    '<path d="M102 60 C112 44, 122 76, 132 60 C142 44, 152 76, 162 60" fill="none" stroke="#1d4ed8" stroke-width="3"/>' +
    '<text x="132" y="78" font-size="10" text-anchor="middle">alpha helix</text>';
  const tertiary =
    '<path d="M196 68 C180 48, 214 42, 220 60 C228 82, 196 94, 186 78 C178 64, 190 55, 196 68 Z" fill="#dcfce7" stroke="#15803d" stroke-width="2"/>';
  const quaternary =
    '<circle cx="78" cy="130" r="16" fill="#bfdbfe" stroke="#1d4ed8"/>' +
    '<circle cx="102" cy="130" r="16" fill="#bbf7d0" stroke="#15803d"/>' +
    '<circle cx="90" cy="150" r="16" fill="#fde68a" stroke="#a16207"/>';
  const labels =
    '<text x="20" y="30" font-size="11">Primary</text>' +
    '<text x="110" y="30" font-size="11">Secondary</text>' +
    '<text x="184" y="30" font-size="11">Tertiary</text>' +
    '<text x="50" y="108" font-size="11">Quaternary</text>' +
    '<text x="180" y="132" font-size="10">1 degree sequence</text>' +
    '<text x="180" y="148" font-size="10">2 degree motifs</text>' +
    '<text x="180" y="164" font-size="10">3 degree fold + 4 degree assembly</text>';
  return wrapBioSvg(primary + secondary + tertiary + quaternary + labels);
}

export function replicationFork(): string {
  const dna =
    '<path d="M30 50 C78 50, 108 70, 136 90" fill="none" stroke="#1d4ed8" stroke-width="3"/>' +
    '<path d="M30 70 C78 70, 108 82, 136 90" fill="none" stroke="#dc2626" stroke-width="3"/>' +
    '<path d="M136 90 C182 52, 235 42, 278 48" fill="none" stroke="#1d4ed8" stroke-width="3"/>' +
    '<path d="M136 90 C182 128, 235 136, 278 132" fill="none" stroke="#dc2626" stroke-width="3"/>';
  const synthesis =
    ARROW_DEF +
    '<line x1="166" y1="66" x2="212" y2="54" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="166" y1="116" x2="194" y2="128" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="200" y1="108" x2="228" y2="121" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  const okazaki =
    '<rect x="180" y="116" width="22" height="6" fill="#fef08a" stroke="#a16207"/>' +
    '<rect x="212" y="126" width="22" height="6" fill="#fef08a" stroke="#a16207"/>' +
    '<rect x="244" y="130" width="22" height="6" fill="#fef08a" stroke="#a16207"/>';
  const labels =
    '<text x="12" y="24" font-size="12">Replication fork</text>' +
    '<text x="206" y="40" font-size="10">leading strand</text>' +
    '<text x="208" y="160" font-size="10">lagging strand</text>' +
    '<text x="156" y="92" font-size="10">helicase</text>' +
    '<text x="236" y="112" font-size="10">Okazaki fragments</text>';
  return wrapBioSvg(dna + synthesis + okazaki + labels);
}

export function centralDogma(): string {
  const nodes =
    '<rect x="36" y="66" width="66" height="28" fill="#dbeafe" stroke="#1e3a8a"/><text x="69" y="84" font-size="11" text-anchor="middle">DNA</text>' +
    '<rect x="122" y="66" width="66" height="28" fill="#dcfce7" stroke="#166534"/><text x="155" y="84" font-size="11" text-anchor="middle">RNA</text>' +
    '<rect x="208" y="66" width="66" height="28" fill="#fee2e2" stroke="#991b1b"/><text x="241" y="84" font-size="11" text-anchor="middle">Protein</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="102" y1="80" x2="122" y2="80" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="188" y1="80" x2="208" y2="80" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<path d="M152 62 C142 38, 110 38, 102 61" fill="none" stroke="#7c3aed" marker-end="url(#bio-arr)"/>' +
    '<path d="M146 98 C137 118, 110 120, 98 101" fill="none" stroke="#7c3aed" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="150" y="22" font-size="12" text-anchor="middle">Central dogma</text>' +
    '<text x="111" y="52" font-size="10">replication</text>' +
    '<text x="124" y="108" font-size="10">transcription</text>' +
    '<text x="214" y="52" font-size="10">translation</text>' +
    '<text x="62" y="134" font-size="10" fill="#7c3aed">reverse transcription (some viruses)</text>';
  return wrapBioSvg(nodes + arrows + labels);
}

export function lacOperon(state: 'lactosePresent' | 'lactoseAbsent' = 'lactosePresent'): string {
  const induced = state === 'lactosePresent';
  const operon =
    '<line x1="18" y1="96" x2="282" y2="96" stroke="#334155" stroke-width="3"/>' +
    '<rect x="38" y="82" width="28" height="28" fill="#dbeafe" stroke="#1e3a8a"/><text x="52" y="100" font-size="9" text-anchor="middle">P</text>' +
    '<rect x="72" y="82" width="28" height="28" fill="#bfdbfe" stroke="#1e3a8a"/><text x="86" y="100" font-size="9" text-anchor="middle">O</text>' +
    '<rect x="108" y="82" width="42" height="28" fill="#dcfce7" stroke="#166534"/><text x="129" y="100" font-size="9" text-anchor="middle">lacZ</text>' +
    '<rect x="154" y="82" width="42" height="28" fill="#dcfce7" stroke="#166534"/><text x="175" y="100" font-size="9" text-anchor="middle">lacY</text>' +
    '<rect x="200" y="82" width="42" height="28" fill="#dcfce7" stroke="#166534"/><text x="221" y="100" font-size="9" text-anchor="middle">lacA</text>';
  const regulator =
    '<rect x="38" y="36" width="40" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="58" y="52" font-size="9" text-anchor="middle">lacI</text>' +
    '<ellipse cx="98" cy="48" rx="18" ry="11" fill="#fecaca" stroke="#991b1b"/>' +
    `<text x="98" y="51" font-size="9" text-anchor="middle">${induced ? 'repressor +' : 'repressor'}</text>`;
  const stateFeatures = induced
    ? '<circle cx="122" cy="48" r="7" fill="#fde68a" stroke="#a16207"/><text x="133" y="52" font-size="9">allolactose</text>' +
      '<text x="178" y="56" font-size="10" fill="#166534">operator unblocked</text>' +
      '<line x1="86" y1="48" x2="80" y2="83" stroke="#1f2937" stroke-dasharray="4 3"/>' +
      ARROW_DEF +
      '<line x1="98" y1="112" x2="232" y2="112" stroke="#166534" marker-end="url(#bio-arr)"/><text x="234" y="116" font-size="10" fill="#166534">mRNA made</text>'
    : '<line x1="98" y1="60" x2="86" y2="83" stroke="#991b1b" stroke-width="2"/>' +
      '<text x="150" y="56" font-size="10" fill="#991b1b">repressor binds operator</text>' +
      '<line x1="86" y1="112" x2="240" y2="112" stroke="#64748b" stroke-dasharray="5 4"/><text x="242" y="116" font-size="10">transcription off</text>';
  const title = `<text x="12" y="18" font-size="12">lac operon: ${induced ? 'lactose present (induced)' : 'lactose absent (repressed)'}</text>`;
  return wrapBioSvg(title + operon + regulator + stateFeatures);
}

export function motorNeuron(): string {
  const soma =
    '<circle cx="64" cy="90" r="24" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/>' +
    '<circle cx="64" cy="90" r="9" fill="#fecaca" stroke="#7f1d1d"/>';
  const dendrites =
    '<path d="M42 74 L22 62 L12 54" fill="none" stroke="#991b1b" stroke-width="2"/>' +
    '<path d="M40 88 L18 86 L8 90" fill="none" stroke="#991b1b" stroke-width="2"/>' +
    '<path d="M44 104 L20 116 L12 126" fill="none" stroke="#991b1b" stroke-width="2"/>' +
    '<path d="M58 66 L52 45 L42 34" fill="none" stroke="#991b1b" stroke-width="2"/>';
  const axon = '<line x1="88" y1="90" x2="252" y2="90" stroke="#374151" stroke-width="3"/>';
  const myelin = [108, 134, 160, 186, 212]
    .map((x) => `<rect x="${x}" y="79" width="20" height="22" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/>`)
    .join('');
  const terminals =
    '<circle cx="262" cy="80" r="5" fill="#f59e0b"/>' +
    '<circle cx="272" cy="90" r="5" fill="#f59e0b"/>' +
    '<circle cx="262" cy="100" r="5" fill="#f59e0b"/>';
  const labels =
    '<text x="12" y="22" font-size="12">Motor neuron</text>' +
    '<text x="16" y="54" font-size="10">dendrites</text>' +
    '<text x="52" y="120" font-size="10">soma</text>' +
    '<text x="138" y="118" font-size="10">myelin sheath</text>' +
    '<text x="236" y="118" font-size="10">axon terminals</text>' +
    '<text x="175" y="74" font-size="10">axon</text>';
  return wrapBioSvg(soma + dendrites + axon + myelin + terminals + labels);
}

export function actionPotentialGraph(): string {
  const curve =
    'M 40 116 C 78 116, 90 114, 101 116 C 108 116, 114 36, 130 24 C 144 32, 150 100, 166 132 C 180 142, 198 120, 272 116';
  const annotations =
    '<line x1="40" y1="116" x2="272" y2="116" stroke="#64748b" stroke-dasharray="5 4"/>' +
    '<line x1="40" y1="78" x2="272" y2="78" stroke="#64748b" stroke-dasharray="5 4"/>' +
    '<text x="44" y="112" font-size="10">-70 mV</text>' +
    '<text x="44" y="74" font-size="10">threshold</text>' +
    '<text x="114" y="20" font-size="10" fill="#dc2626">depolarization</text>' +
    '<text x="150" y="146" font-size="10" fill="#1d4ed8">repolarization / hyperpolarization</text>';
  return axesGraph({
    xLabel: 'time',
    yLabel: 'Vm',
    curves: [{ d: curve, stroke: RED, label: 'action potential', labelPos: [185, 36] }],
    annotations,
  });
}

export function chemicalSynapse(): string {
  const presynaptic =
    '<rect x="30" y="38" width="102" height="104" rx="18" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/>' +
    '<text x="81" y="54" font-size="10" text-anchor="middle">presynaptic terminal</text>';
  const vesicleCenters: Array<[number, number]> = [
    [60, 78],
    [88, 82],
    [108, 98],
    [72, 108],
  ];
  const vesicles = vesicleCenters
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#fecaca" stroke="#991b1b"/>`)
    .join('');
  const cleft = '<rect x="134" y="42" width="24" height="96" fill="#e2e8f0" stroke="#64748b"/><text x="146" y="34" font-size="10" text-anchor="middle">synaptic cleft</text>';
  const postsynaptic =
    '<rect x="160" y="38" width="110" height="104" rx="18" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>' +
    '<text x="215" y="54" font-size="10" text-anchor="middle">postsynaptic membrane</text>';
  const receptors = [186, 204, 222, 240]
    .map((x) => `<rect x="${x}" y="124" width="8" height="12" fill="#93c5fd" stroke="#1e3a8a"/>`)
    .join('');
  const neurotransmitters = [128, 136, 144, 152]
    .map((x, i) => `<circle cx="${x}" cy="${74 + i * 14}" r="3" fill="#f59e0b"/>`)
    .join('');
  const labels =
    ARROW_DEF +
    '<line x1="118" y1="108" x2="130" y2="108" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<text x="50" y="156" font-size="10">Ca2+ triggers vesicle fusion</text>' +
    '<text x="180" y="156" font-size="10">ligand-gated ion channels</text>';
  return wrapBioSvg(presynaptic + vesicles + cleft + postsynaptic + receptors + neurotransmitters + labels);
}

export function heartDiagram(): string {
  const chambers =
    '<path d="M110 55 C96 46, 76 52, 72 72 C68 88, 82 102, 98 110 C96 126, 102 142, 118 146 C128 134, 136 119, 136 102 C136 78, 125 63, 110 55 Z" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/>' +
    '<path d="M190 55 C204 46, 224 52, 228 72 C232 88, 218 102, 202 110 C204 126, 198 142, 182 146 C172 134, 164 119, 164 102 C164 78, 175 63, 190 55 Z" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>';
  const septum = '<line x1="150" y1="56" x2="150" y2="140" stroke="#334155" stroke-width="2"/>';
  const vessels =
    '<path d="M118 54 C118 30, 132 20, 150 18 C168 20, 182 30, 182 54" fill="none" stroke="#dc2626" stroke-width="4"/>' +
    '<path d="M102 72 C76 62, 56 66, 40 84" fill="none" stroke="#1d4ed8" stroke-width="4"/>' +
    '<path d="M198 72 C224 62, 244 66, 262 84" fill="none" stroke="#1d4ed8" stroke-width="4"/>';
  const labels =
    '<text x="150" y="14" font-size="12" text-anchor="middle">Heart (simplified frontal section)</text>' +
    '<text x="84" y="78" font-size="10">RA</text>' +
    '<text x="90" y="118" font-size="10">RV</text>' +
    '<text x="206" y="78" font-size="10">LA</text>' +
    '<text x="202" y="118" font-size="10">LV</text>' +
    '<text x="190" y="30" font-size="10">aorta</text>' +
    '<text x="16" y="92" font-size="10">vena cava</text>' +
    '<text x="248" y="92" font-size="10">pulmonary artery</text>';
  return wrapBioSvg(chambers + septum + vessels + labels);
}

export function ecgTrace(): string {
  const ecg = 'M 40 102 L 68 102 L 78 90 L 92 102 L 108 102 L 120 62 L 130 136 L 146 70 L 158 102 L 186 102 L 198 92 L 214 102 L 272 102';
  const annotations =
    '<line x1="40" y1="102" x2="272" y2="102" stroke="#64748b" stroke-dasharray="4 4"/>' +
    '<text x="74" y="84" font-size="10">P</text>' +
    '<text x="118" y="58" font-size="10">Q</text>' +
    '<text x="129" y="150" font-size="10">R</text>' +
    '<text x="148" y="66" font-size="10">S</text>' +
    '<text x="196" y="88" font-size="10">T</text>' +
    '<text x="196" y="126" font-size="10">ventricular repolarization</text>';
  return axesGraph({
    xLabel: 'time',
    yLabel: 'mV',
    curves: [{ d: ecg, stroke: GREEN, label: 'ECG', labelPos: [236, 38] }],
    annotations,
  });
}

export function respiratoryPathway(): string {
  const tract =
    '<rect x="132" y="18" width="36" height="22" rx="10" fill="#e0f2fe" stroke="#0369a1"/>' +
    '<rect x="134" y="40" width="32" height="30" rx="12" fill="#bae6fd" stroke="#0369a1"/>' +
    '<rect x="142" y="70" width="16" height="28" fill="#93c5fd" stroke="#1d4ed8"/>' +
    '<path d="M150 98 C126 108, 114 124, 104 142" fill="none" stroke="#1d4ed8" stroke-width="4"/>' +
    '<path d="M150 98 C174 108, 186 124, 196 142" fill="none" stroke="#1d4ed8" stroke-width="4"/>' +
    '<circle cx="98" cy="148" r="14" fill="#fef9c3" stroke="#ca8a04"/>' +
    '<circle cx="112" cy="156" r="11" fill="#fef9c3" stroke="#ca8a04"/>' +
    '<circle cx="188" cy="148" r="14" fill="#fef9c3" stroke="#ca8a04"/>' +
    '<circle cx="202" cy="156" r="11" fill="#fef9c3" stroke="#ca8a04"/>';
  const labels =
    ARROW_DEF +
    '<text x="150" y="16" font-size="11" text-anchor="middle">Respiratory pathway</text>' +
    '<text x="178" y="33" font-size="10">nasal cavity</text>' +
    '<text x="174" y="59" font-size="10">pharynx/larynx</text>' +
    '<text x="174" y="85" font-size="10">trachea</text>' +
    '<text x="206" y="126" font-size="10">bronchi</text>' +
    '<text x="210" y="160" font-size="10">alveoli</text>' +
    '<line x1="136" y1="166" x2="168" y2="166" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<text x="172" y="170" font-size="10">airflow</text>';
  return wrapBioSvg(tract + labels);
}

export function digestiveTract(): string {
  const organs =
    '<ellipse cx="150" cy="26" rx="14" ry="10" fill="#fde68a" stroke="#a16207"/>' +
    '<rect x="144" y="36" width="12" height="42" fill="#fcd34d" stroke="#a16207"/>' +
    '<ellipse cx="166" cy="88" rx="32" ry="18" fill="#fecaca" stroke="#991b1b"/>' +
    '<path d="M178 95 C214 102, 218 124, 190 136 C164 146, 136 146, 118 132 C102 120, 112 106, 132 100" fill="none" stroke="#ea580c" stroke-width="5"/>' +
    '<path d="M132 100 C94 106, 86 128, 96 152" fill="none" stroke="#a16207" stroke-width="4"/>' +
    '<rect x="84" y="150" width="22" height="18" fill="#b45309" stroke="#7c2d12"/>';
  const accessory =
    '<ellipse cx="210" cy="82" rx="20" ry="12" fill="#fbbf24" stroke="#a16207"/>' +
    '<ellipse cx="206" cy="104" rx="10" ry="6" fill="#84cc16" stroke="#4d7c0f"/>';
  const labels =
    '<text x="12" y="20" font-size="12">Digestive tract</text>' +
    '<text x="170" y="28" font-size="10">mouth</text>' +
    '<text x="170" y="52" font-size="10">esophagus</text>' +
    '<text x="204" y="88" font-size="10">liver</text>' +
    '<text x="220" y="108" font-size="10">gallbladder</text>' +
    '<text x="202" y="136" font-size="10">small intestine</text>' +
    '<text x="84" y="176" font-size="10">rectum</text>' +
    '<text x="170" y="102" font-size="10">stomach</text>';
  return wrapBioSvg(organs + accessory + labels);
}

export function glucoseFeedback(): string {
  const boxes =
    '<rect x="16" y="20" width="86" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="59" y="36" font-size="10" text-anchor="middle">High blood glucose</text>' +
    '<rect x="112" y="20" width="78" height="24" fill="#dcfce7" stroke="#166534"/><text x="151" y="36" font-size="10" text-anchor="middle">Pancreas beta</text>' +
    '<rect x="204" y="20" width="80" height="24" fill="#fef3c7" stroke="#92400e"/><text x="244" y="36" font-size="10" text-anchor="middle">Insulin release</text>' +
    '<rect x="16" y="106" width="86" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="59" y="122" font-size="10" text-anchor="middle">Low blood glucose</text>' +
    '<rect x="112" y="106" width="78" height="24" fill="#fecaca" stroke="#991b1b"/><text x="151" y="122" font-size="10" text-anchor="middle">Pancreas alpha</text>' +
    '<rect x="204" y="106" width="80" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="244" y="122" font-size="10" text-anchor="middle">Glucagon release</text>' +
    '<rect x="106" y="146" width="92" height="24" fill="#e2e8f0" stroke="#334155"/><text x="152" y="162" font-size="10" text-anchor="middle">Homeostasis restored</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="102" y1="32" x2="112" y2="32" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="190" y1="32" x2="204" y2="32" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="244" y1="44" x2="188" y2="146" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="102" y1="118" x2="112" y2="118" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="190" y1="118" x2="204" y2="118" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="244" y1="130" x2="198" y2="150" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="14" y="92" font-size="10">negative feedback loops</text>' +
    '<text x="206" y="84" font-size="10">liver/muscle uptake</text>';
  return wrapBioSvg(boxes + arrows + labels);
}

export function populationGrowth(): string {
  const logistic = 'M 40 136 C 82 132, 112 108, 148 78 C 180 56, 214 50, 272 50';
  const exponential = 'M 40 136 C 98 134, 140 120, 178 86 C 212 58, 236 34, 272 22';
  return axesGraph({
    xLabel: 'time',
    yLabel: 'population',
    curves: [
      { d: logistic, stroke: BLUE, label: 'logistic', labelPos: [206, 62] },
      { d: exponential, stroke: RED, label: 'exponential', labelPos: [196, 30] },
    ],
    annotations:
      '<line x1="40" y1="50" x2="272" y2="50" stroke="#64748b" stroke-dasharray="5 4"/><text x="246" y="46" font-size="10">K</text>',
  });
}

export function foodWeb(): string {
  const nodes =
    '<rect x="120" y="12" width="60" height="20" fill="#fef3c7" stroke="#a16207"/><text x="150" y="26" font-size="10" text-anchor="middle">Sun</text>' +
    '<rect x="24" y="52" width="72" height="22" fill="#dcfce7" stroke="#166534"/><text x="60" y="67" font-size="10" text-anchor="middle">Producers</text>' +
    '<rect x="112" y="52" width="76" height="22" fill="#bbf7d0" stroke="#15803d"/><text x="150" y="67" font-size="10" text-anchor="middle">Herbivores</text>' +
    '<rect x="206" y="52" width="70" height="22" fill="#dbeafe" stroke="#1e3a8a"/><text x="241" y="67" font-size="10" text-anchor="middle">Carnivores</text>' +
    '<rect x="90" y="106" width="120" height="22" fill="#e2e8f0" stroke="#334155"/><text x="150" y="121" font-size="10" text-anchor="middle">Decomposers</text>' +
    '<rect x="112" y="146" width="76" height="22" fill="#fee2e2" stroke="#991b1b"/><text x="150" y="161" font-size="10" text-anchor="middle">Nutrients</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="150" y1="32" x2="60" y2="52" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="60" y1="74" x2="150" y2="52" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="150" y1="74" x2="241" y2="52" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="60" y1="74" x2="120" y2="106" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="150" y1="74" x2="150" y2="106" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="241" y1="74" x2="180" y2="106" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="150" y1="128" x2="150" y2="146" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="150" y1="168" x2="60" y2="74" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  return wrapBioSvg(nodes + arrows);
}

export function nitrogenCycle(): string {
  const pools =
    '<ellipse cx="150" cy="20" rx="42" ry="14" fill="#dbeafe" stroke="#1e3a8a"/><text x="150" y="24" font-size="10" text-anchor="middle">Atmospheric N2</text>' +
    '<rect x="26" y="74" width="86" height="22" fill="#dcfce7" stroke="#166534"/><text x="69" y="89" font-size="10" text-anchor="middle">NH4+ ammonium</text>' +
    '<rect x="114" y="74" width="72" height="22" fill="#bbf7d0" stroke="#15803d"/><text x="150" y="89" font-size="10" text-anchor="middle">NO2- nitrite</text>' +
    '<rect x="196" y="74" width="82" height="22" fill="#86efac" stroke="#15803d"/><text x="237" y="89" font-size="10" text-anchor="middle">NO3- nitrate</text>' +
    '<rect x="100" y="136" width="100" height="24" fill="#fef3c7" stroke="#a16207"/><text x="150" y="152" font-size="10" text-anchor="middle">Plant / biomass N</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="124" y1="32" x2="78" y2="74" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="112" y1="85" x2="114" y2="85" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="186" y1="85" x2="196" y2="85" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="237" y1="96" x2="188" y2="136" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="112" y1="148" x2="64" y2="96" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="278" y1="85" x2="192" y2="24" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="24" y="64" font-size="9">nitrogen fixation</text>' +
    '<text x="126" y="64" font-size="9">nitrification I</text>' +
    '<text x="202" y="64" font-size="9">nitrification II</text>' +
    '<text x="214" y="112" font-size="9">assimilation</text>' +
    '<text x="10" y="126" font-size="9">ammonification</text>' +
    '<text x="196" y="40" font-size="9">denitrification</text>';
  return wrapBioSvg(pools + arrows + labels);
}

export function selectionCurve(type: 'stabilizing' | 'directional' | 'disruptive' = 'stabilizing'): string {
  const base = 'M 40 132 C 100 54, 210 54, 272 132';
  let selected = base;
  let label = 'stabilizing';
  if (type === 'directional') {
    selected = 'M 40 136 C 110 120, 178 84, 272 44';
    label = 'directional';
  } else if (type === 'disruptive') {
    selected = 'M 40 132 C 88 70, 118 70, 152 132 C 188 70, 216 70, 272 132';
    label = 'disruptive';
  }
  return axesGraph({
    xLabel: 'trait value',
    yLabel: 'frequency',
    curves: [
      { d: base, stroke: '#94a3b8', label: 'original', labelPos: [200, 118] },
      { d: selected, stroke: RED, label, labelPos: [186, 34] },
    ],
  });
}

export function bacterialGrowthCurve(): string {
  const curve =
    'M 40 132 C 66 130, 90 130, 108 112 C 126 78, 152 50, 182 46 C 210 44, 228 56, 242 84 C 252 108, 262 120, 272 130';
  const annotations =
    '<line x1="88" y1="140" x2="88" y2="30" stroke="#cbd5e1" stroke-dasharray="4 3"/>' +
    '<line x1="132" y1="140" x2="132" y2="30" stroke="#cbd5e1" stroke-dasharray="4 3"/>' +
    '<line x1="214" y1="140" x2="214" y2="30" stroke="#cbd5e1" stroke-dasharray="4 3"/>' +
    '<text x="56" y="30" font-size="10">lag</text>' +
    '<text x="104" y="30" font-size="10">log</text>' +
    '<text x="168" y="30" font-size="10">stationary</text>' +
    '<text x="234" y="30" font-size="10">death</text>';
  return axesGraph({
    xLabel: 'time',
    yLabel: 'cell number',
    curves: [{ d: curve, stroke: GREEN, label: 'batch culture', labelPos: [186, 152] }],
    annotations,
  });
}

export function virusStructures(): string {
  const enveloped =
    '<circle cx="86" cy="92" r="34" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/>' +
    '<circle cx="86" cy="92" r="20" fill="#fecaca" stroke="#7f1d1d" stroke-width="1.5"/>' +
    Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 10;
      const x1 = 86 + Math.cos(a) * 34;
      const y1 = 92 + Math.sin(a) * 34;
      const x2 = 86 + Math.cos(a) * 46;
      const y2 = 92 + Math.sin(a) * 46;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#991b1b" stroke-width="2"/>`;
    }).join('');
  const phage =
    '<polygon points="214,52 230,62 230,82 214,92 198,82 198,62" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>' +
    '<line x1="214" y1="92" x2="214" y2="122" stroke="#1e3a8a" stroke-width="3"/>' +
    '<line x1="202" y1="122" x2="226" y2="122" stroke="#1e3a8a" stroke-width="2"/>' +
    '<line x1="204" y1="122" x2="194" y2="136" stroke="#1e3a8a" stroke-width="2"/>' +
    '<line x1="212" y1="122" x2="206" y2="138" stroke="#1e3a8a" stroke-width="2"/>' +
    '<line x1="220" y1="122" x2="228" y2="138" stroke="#1e3a8a" stroke-width="2"/>' +
    '<line x1="226" y1="122" x2="238" y2="136" stroke="#1e3a8a" stroke-width="2"/>';
  const labels =
    '<text x="22" y="26" font-size="12">Virus structures</text>' +
    '<text x="58" y="146" font-size="10">enveloped RNA virus</text>' +
    '<text x="186" y="26" font-size="10">bacteriophage</text>' +
    '<text x="44" y="44" font-size="10">spike proteins</text>' +
    '<text x="170" y="152" font-size="10">tail fibers</text>';
  return wrapBioSvg(enveloped + phage + labels);
}

export function lymphocytes(): string {
  const bCell = '<circle cx="56" cy="90" r="24" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/><text x="56" y="94" font-size="11" text-anchor="middle">B</text>';
  const tHelper = '<circle cx="130" cy="90" r="24" fill="#dcfce7" stroke="#166534" stroke-width="2"/><text x="130" y="94" font-size="11" text-anchor="middle">Th</text>';
  const tCyt = '<circle cx="204" cy="90" r="24" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/><text x="204" y="94" font-size="11" text-anchor="middle">Tc</text>';
  const nk = '<circle cx="268" cy="90" r="20" fill="#fef3c7" stroke="#a16207" stroke-width="2"/><text x="268" y="94" font-size="11" text-anchor="middle">NK</text>';
  const labels =
    '<text x="150" y="22" font-size="12" text-anchor="middle">Major lymphocyte classes</text>' +
    '<text x="26" y="130" font-size="10">B cell: antibody production</text>' +
    '<text x="96" y="146" font-size="10">Helper T: cytokine signaling</text>' +
    '<text x="170" y="162" font-size="10">Cytotoxic T + NK: kill infected cells</text>';
  return wrapBioSvg(bCell + tHelper + tCyt + nk + labels);
}

export function pcrCycle(step: 'denaturation' | 'annealing' | 'extension' = 'denaturation'): string {
  const den = step === 'denaturation';
  const ann = step === 'annealing';
  const ext = step === 'extension';
  const strands =
    den
      ? '<line x1="70" y1="80" x2="230" y2="52" stroke="#1d4ed8" stroke-width="3"/><line x1="70" y1="100" x2="230" y2="128" stroke="#dc2626" stroke-width="3"/>'
      : '<line x1="70" y1="84" x2="230" y2="84" stroke="#1d4ed8" stroke-width="3"/><line x1="70" y1="96" x2="230" y2="96" stroke="#dc2626" stroke-width="3"/>';
  const primers = ann
    ? '<rect x="86" y="78" width="20" height="4" fill="#f59e0b"/><rect x="194" y="98" width="20" height="4" fill="#f59e0b"/>'
    : '';
  const polymerase = ext
    ? '<circle cx="110" cy="82" r="7" fill="#15803d"/><circle cx="188" cy="98" r="7" fill="#15803d"/>' +
      '<line x1="117" y1="82" x2="146" y2="82" stroke="#15803d" stroke-width="2"/><line x1="181" y1="98" x2="154" y2="98" stroke="#15803d" stroke-width="2"/>'
    : '';
  const tempLabel = den ? '95 C' : ann ? '50-65 C' : '72 C';
  const name = den ? 'Denaturation' : ann ? 'Annealing' : 'Extension';
  const description = den
    ? 'double strand separates'
    : ann
      ? 'primers bind template strands'
      : 'Taq polymerase extends DNA';
  const labels =
    '<text x="14" y="24" font-size="12">PCR cycle step</text>' +
    `<text x="14" y="44" font-size="11">${name}</text>` +
    `<text x="14" y="60" font-size="10">temperature: ${tempLabel}</text>` +
    `<text x="14" y="76" font-size="10">${description}</text>` +
    '<text x="210" y="148" font-size="10">5&apos; to 3&apos; synthesis</text>';
  return wrapBioSvg(strands + primers + polymerase + labels);
}

export function gelElectrophoresis(): string {
  const tray =
    '<rect x="40" y="24" width="220" height="132" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/>' +
    '<rect x="40" y="24" width="220" height="22" fill="#bae6fd" stroke="#0369a1"/>';
  const wells = [66, 94, 122, 150, 178, 206, 234]
    .map((x) => `<rect x="${x - 7}" y="30" width="14" height="8" fill="#0c4a6e"/>`)
    .join('');
  const laneBands: Array<{ x: number; ys: number[] }> = [
    { x: 66, ys: [60, 80, 106, 128] },
    { x: 94, ys: [72, 104, 138] },
    { x: 122, ys: [86, 116] },
    { x: 150, ys: [64, 96, 122, 146] },
    { x: 178, ys: [92, 126] },
    { x: 206, ys: [68, 90, 130] },
    { x: 234, ys: [82, 114, 142] },
  ];
  const lanes = laneBands
    .map(({ x, ys }) => ys.map((y) => `<rect x="${x - 8}" y="${y}" width="16" height="4" fill="#1d4ed8" opacity="0.75"/>`).join(''))
    .join('');
  const labels =
    ARROW_DEF +
    '<text x="150" y="16" font-size="12" text-anchor="middle">Gel electrophoresis</text>' +
    '<text x="50" y="170" font-size="10">DNA ladder</text>' +
    '<line x1="72" y1="164" x2="66" y2="150" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<text x="212" y="170" font-size="10">migration to + electrode</text>' +
    '<line x1="232" y1="164" x2="250" y2="150" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  return wrapBioSvg(tray + wells + lanes + labels);
}

export function phylogeneticTree(): string {
  const trunk = '<line x1="42" y1="150" x2="42" y2="40" stroke="#334155" stroke-width="3"/>';
  const branches =
    '<line x1="42" y1="120" x2="108" y2="120" stroke="#334155" stroke-width="2"/>' +
    '<line x1="108" y1="120" x2="108" y2="88" stroke="#334155" stroke-width="2"/>' +
    '<line x1="108" y1="120" x2="108" y2="148" stroke="#334155" stroke-width="2"/>' +
    '<line x1="108" y1="88" x2="188" y2="88" stroke="#334155" stroke-width="2"/>' +
    '<line x1="108" y1="148" x2="188" y2="148" stroke="#334155" stroke-width="2"/>' +
    '<line x1="188" y1="88" x2="188" y2="62" stroke="#334155" stroke-width="2"/>' +
    '<line x1="188" y1="88" x2="188" y2="114" stroke="#334155" stroke-width="2"/>' +
    '<line x1="188" y1="62" x2="264" y2="62" stroke="#334155" stroke-width="2"/>' +
    '<line x1="188" y1="114" x2="264" y2="114" stroke="#334155" stroke-width="2"/>' +
    '<line x1="188" y1="148" x2="264" y2="148" stroke="#334155" stroke-width="2"/>';
  const labels =
    '<text x="14" y="26" font-size="12">Phylogenetic tree</text>' +
    '<text x="270" y="66" font-size="10">Species A</text>' +
    '<text x="270" y="118" font-size="10">Species B</text>' +
    '<text x="270" y="152" font-size="10">Species C</text>' +
    '<text x="120" y="82" font-size="10">common ancestor</text>' +
    '<text x="14" y="164" font-size="10">time</text>';
  return wrapBioSvg(trunk + branches + labels);
}

export function cloningSteps(): string {
  const step1 =
    '<rect x="16" y="26" width="74" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="53" y="42" font-size="9" text-anchor="middle">gene + plasmid cut</text>';
  const step2 =
    '<rect x="108" y="26" width="74" height="24" fill="#dcfce7" stroke="#166534"/><text x="145" y="42" font-size="9" text-anchor="middle">ligation</text>';
  const step3 =
    '<rect x="200" y="26" width="84" height="24" fill="#fef3c7" stroke="#a16207"/><text x="242" y="42" font-size="9" text-anchor="middle">recombinant plasmid</text>';
  const step4 =
    '<rect x="108" y="86" width="82" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="149" y="102" font-size="9" text-anchor="middle">transform bacteria</text>';
  const step5 =
    '<rect x="108" y="144" width="82" height="24" fill="#ede9fe" stroke="#5b21b6"/><text x="149" y="160" font-size="9" text-anchor="middle">screen colonies</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="90" y1="38" x2="108" y2="38" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="182" y1="38" x2="200" y2="38" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="242" y1="50" x2="170" y2="86" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="149" y1="110" x2="149" y2="144" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  const labels = '<text x="12" y="18" font-size="12">Molecular cloning workflow</text>';
  return wrapBioSvg(step1 + step2 + step3 + step4 + step5 + arrows + labels);
}

export function meiosisOverview(): string {
  const cells =
    '<circle cx="64" cy="56" r="22" fill="#dbeafe" stroke="#1e3a8a"/>' +
    '<text x="64" y="60" font-size="10" text-anchor="middle">2n</text>' +
    '<circle cx="132" cy="56" r="20" fill="#dcfce7" stroke="#166534"/><text x="132" y="60" font-size="10" text-anchor="middle">MI</text>' +
    '<circle cx="204" cy="46" r="16" fill="#bbf7d0" stroke="#15803d"/><text x="204" y="50" font-size="9" text-anchor="middle">n</text>' +
    '<circle cx="244" cy="46" r="16" fill="#bbf7d0" stroke="#15803d"/><text x="244" y="50" font-size="9" text-anchor="middle">n</text>' +
    '<circle cx="204" cy="112" r="16" fill="#fee2e2" stroke="#991b1b"/><text x="204" y="116" font-size="9" text-anchor="middle">n</text>' +
    '<circle cx="244" cy="112" r="16" fill="#fee2e2" stroke="#991b1b"/><text x="244" y="116" font-size="9" text-anchor="middle">n</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="86" y1="56" x2="112" y2="56" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="152" y1="52" x2="188" y2="46" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="152" y1="60" x2="188" y2="112" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="204" y1="62" x2="204" y2="96" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="244" y1="62" x2="244" y2="96" stroke="#1f2937" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="14" y="20" font-size="12">Meiosis overview</text>' +
    '<text x="110" y="84" font-size="10">homologs separate</text>' +
    '<text x="198" y="84" font-size="10">sister chromatids separate</text>' +
    '<text x="166" y="164" font-size="10">4 haploid gametes</text>';
  return wrapBioSvg(cells + arrows + labels);
}

export function hpaAxis(): string {
  const nodes =
    '<rect x="92" y="14" width="116" height="22" fill="#dbeafe" stroke="#1e3a8a"/><text x="150" y="29" font-size="10" text-anchor="middle">Hypothalamus (CRH)</text>' +
    '<rect x="92" y="68" width="116" height="22" fill="#dcfce7" stroke="#166534"/><text x="150" y="83" font-size="10" text-anchor="middle">Anterior pituitary (ACTH)</text>' +
    '<rect x="92" y="122" width="116" height="22" fill="#fee2e2" stroke="#991b1b"/><text x="150" y="137" font-size="10" text-anchor="middle">Adrenal cortex (cortisol)</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="150" y1="36" x2="150" y2="68" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="150" y1="90" x2="150" y2="122" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<path d="M208 133 C252 126, 252 34, 208 26" fill="none" stroke="#7c3aed" stroke-width="2" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="16" y="18" font-size="12">HPA axis</text>' +
    '<text x="216" y="78" font-size="10" fill="#7c3aed">negative feedback</text>' +
    '<text x="16" y="96" font-size="10">stress response</text>' +
    '<text x="16" y="112" font-size="10">glucose regulation</text>' +
    '<text x="16" y="128" font-size="10">immune modulation</text>';
  return wrapBioSvg(nodes + arrows + labels);
}

export function dicotRoot(): string {
  const layers =
    '<circle cx="150" cy="92" r="62" fill="#fef3c7" stroke="#a16207" stroke-width="2"/>' +
    '<circle cx="150" cy="92" r="48" fill="#fde68a" stroke="#a16207" stroke-width="2"/>' +
    '<circle cx="150" cy="92" r="34" fill="#fef9c3" stroke="#a16207" stroke-width="2"/>' +
    '<circle cx="150" cy="92" r="20" fill="#fff7ed" stroke="#9a3412" stroke-width="2"/>';
  const vascular =
    '<path d="M150 72 L160 92 L150 112 L140 92 Z" fill="#bfdbfe" stroke="#1e3a8a"/>' +
    '<path d="M130 92 L150 84 L170 92 L150 100 Z" fill="#bfdbfe" stroke="#1e3a8a"/>' +
    '<circle cx="150" cy="64" r="6" fill="#fecaca" stroke="#991b1b"/>' +
    '<circle cx="178" cy="92" r="6" fill="#fecaca" stroke="#991b1b"/>' +
    '<circle cx="150" cy="120" r="6" fill="#fecaca" stroke="#991b1b"/>' +
    '<circle cx="122" cy="92" r="6" fill="#fecaca" stroke="#991b1b"/>';
  const labels =
    '<text x="14" y="18" font-size="12">Dicot root cross section</text>' +
    '<text x="224" y="50" font-size="10">epidermis</text><line x1="218" y1="52" x2="208" y2="60" stroke="#334155"/>' +
    '<text x="224" y="70" font-size="10">cortex</text><line x1="218" y1="72" x2="197" y2="78" stroke="#334155"/>' +
    '<text x="224" y="90" font-size="10">endodermis</text><line x1="218" y1="92" x2="184" y2="92" stroke="#334155"/>' +
    '<text x="224" y="110" font-size="10">phloem</text><line x1="218" y1="112" x2="178" y2="92" stroke="#334155"/>' +
    '<text x="224" y="130" font-size="10">xylem</text><line x1="218" y1="132" x2="160" y2="92" stroke="#334155"/>';
  return wrapBioSvg(layers + vascular + labels);
}

export function biomesLatitude(): string {
  const globe =
    '<circle cx="110" cy="90" r="62" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>' +
    '<line x1="48" y1="90" x2="172" y2="90" stroke="#334155" stroke-width="1.5"/>' +
    '<line x1="56" y1="66" x2="164" y2="66" stroke="#64748b" stroke-width="1"/>' +
    '<line x1="56" y1="114" x2="164" y2="114" stroke="#64748b" stroke-width="1"/>' +
    '<line x1="64" y1="44" x2="156" y2="44" stroke="#94a3b8" stroke-width="1"/>' +
    '<line x1="64" y1="136" x2="156" y2="136" stroke="#94a3b8" stroke-width="1"/>';
  const belts =
    '<rect x="180" y="36" width="100" height="18" fill="#bfdbfe" stroke="#1e3a8a"/><text x="230" y="49" font-size="10" text-anchor="middle">polar tundra</text>' +
    '<rect x="180" y="58" width="100" height="18" fill="#bbf7d0" stroke="#15803d"/><text x="230" y="71" font-size="10" text-anchor="middle">temperate forest</text>' +
    '<rect x="180" y="80" width="100" height="18" fill="#fef3c7" stroke="#a16207"/><text x="230" y="93" font-size="10" text-anchor="middle">desert / savanna</text>' +
    '<rect x="180" y="102" width="100" height="18" fill="#86efac" stroke="#15803d"/><text x="230" y="115" font-size="10" text-anchor="middle">tropical rainforest</text>' +
    '<rect x="180" y="124" width="100" height="18" fill="#bfdbfe" stroke="#1e3a8a"/><text x="230" y="137" font-size="10" text-anchor="middle">southern temperate</text>';
  const labels =
    '<text x="14" y="20" font-size="12">Biomes by latitude</text>' +
    '<text x="18" y="46" font-size="10">60-90 N</text>' +
    '<text x="18" y="68" font-size="10">30-60 N</text>' +
    '<text x="18" y="92" font-size="10">0-30</text>' +
    '<text x="18" y="116" font-size="10">30-60 S</text>' +
    '<text x="18" y="138" font-size="10">60-90 S</text>';
  return wrapBioSvg(globe + belts + labels);
}

export function reflexArc(): string {
  const nodes =
    '<rect x="16" y="24" width="70" height="24" fill="#fef3c7" stroke="#a16207"/><text x="51" y="40" font-size="10" text-anchor="middle">Receptor</text>' +
    '<rect x="104" y="24" width="74" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="141" y="40" font-size="10" text-anchor="middle">Sensory neuron</text>' +
    '<rect x="198" y="24" width="84" height="24" fill="#dcfce7" stroke="#166534"/><text x="240" y="40" font-size="10" text-anchor="middle">Spinal cord</text>' +
    '<rect x="104" y="92" width="74" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="141" y="108" font-size="10" text-anchor="middle">Motor neuron</text>' +
    '<rect x="16" y="92" width="70" height="24" fill="#fde68a" stroke="#a16207"/><text x="51" y="108" font-size="10" text-anchor="middle">Effector</text>';
  const arrows =
    ARROW_DEF +
    '<line x1="86" y1="36" x2="104" y2="36" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="178" y1="36" x2="198" y2="36" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="240" y1="48" x2="178" y2="92" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<line x1="104" y1="104" x2="86" y2="104" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
    '<path d="M240 50 C246 76, 224 100, 178 104" fill="none" stroke="#7c3aed" marker-end="url(#bio-arr)"/>';
  const labels =
    '<text x="14" y="14" font-size="12">Reflex arc</text>' +
    '<text x="198" y="70" font-size="10">interneuron</text>' +
    '<text x="180" y="132" font-size="10">fast, involuntary response</text>';
  return wrapBioSvg(nodes + arrows + labels);
}

export function punnettSquare(): string {
  const grid =
    '<rect x="92" y="34" width="120" height="120" fill="#f8fafc" stroke="#334155" stroke-width="2"/>' +
    '<line x1="152" y1="34" x2="152" y2="154" stroke="#334155"/>' +
    '<line x1="92" y1="94" x2="212" y2="94" stroke="#334155"/>' +
    '<text x="122" y="28" font-size="11" text-anchor="middle">A</text>' +
    '<text x="182" y="28" font-size="11" text-anchor="middle">a</text>' +
    '<text x="82" y="68" font-size="11" text-anchor="middle">A</text>' +
    '<text x="82" y="128" font-size="11" text-anchor="middle">a</text>';
  const genotypes =
    '<text x="122" y="68" font-size="11" text-anchor="middle">AA</text>' +
    '<text x="182" y="68" font-size="11" text-anchor="middle">Aa</text>' +
    '<text x="122" y="128" font-size="11" text-anchor="middle">Aa</text>' +
    '<text x="182" y="128" font-size="11" text-anchor="middle">aa</text>';
  const labels =
    '<text x="14" y="20" font-size="12">Punnett square (Aa x Aa)</text>' +
    '<text x="14" y="44" font-size="10">genotype ratio: 1 AA : 2 Aa : 1 aa</text>' +
    '<text x="14" y="60" font-size="10">phenotype ratio (dominant): 3 : 1</text>';
  return wrapBioSvg(grid + genotypes + labels);
}

export function oxyhaemoglobinCurve(): string {
  const curve = 'M 40 136 C 84 132, 112 118, 138 96 C 164 70, 196 42, 272 34';
  const annotations =
    '<line x1="120" y1="140" x2="120" y2="96" stroke="#64748b" stroke-dasharray="5 4"/>' +
    '<line x1="40" y1="96" x2="120" y2="96" stroke="#64748b" stroke-dasharray="5 4"/>' +
    '<text x="126" y="94" font-size="10">P50</text>' +
    '<text x="44" y="92" font-size="10">50% sat.</text>' +
    '<text x="188" y="56" font-size="10">cooperative binding</text>';
  return axesGraph({
    xLabel: 'pO2',
    yLabel: '% saturation',
    curves: [{ d: curve, stroke: RED, label: 'oxyhaemoglobin', labelPos: [176, 32] }],
    annotations,
  });
}

export function summationSketch(): string {
  const neuron =
    '<circle cx="62" cy="92" r="20" fill="#fee2e2" stroke="#991b1b"/>' +
    '<line x1="82" y1="92" x2="164" y2="92" stroke="#374151" stroke-width="3"/>' +
    '<rect x="164" y="82" width="56" height="20" fill="#dbeafe" stroke="#1e3a8a"/><text x="192" y="95" font-size="9" text-anchor="middle">axon hillock</text>';
  const epspIpsp =
    ARROW_DEF +
    '<line x1="20" y1="64" x2="44" y2="80" stroke="#15803d" marker-end="url(#bio-arr)"/><text x="10" y="62" font-size="9" fill="#15803d">EPSP1</text>' +
    '<line x1="20" y1="88" x2="44" y2="90" stroke="#15803d" marker-end="url(#bio-arr)"/><text x="10" y="88" font-size="9" fill="#15803d">EPSP2</text>' +
    '<line x1="20" y1="116" x2="44" y2="102" stroke="#b91c1c" marker-end="url(#bio-arr)"/><text x="10" y="118" font-size="9" fill="#b91c1c">IPSP</text>';
  const graph = graphInner({
    xLabel: 'time',
    yLabel: 'Vm',
    curves: [
      {
        d: 'M 40 146 C 66 144, 74 122, 96 126 C 116 130, 120 110, 142 112 C 160 114, 172 132, 188 132 C 206 132, 226 132, 272 132',
        stroke: BLUE,
        label: 'summed PSP',
        labelPos: [194, 114],
      },
    ],
    annotations:
      '<line x1="40" y1="132" x2="272" y2="132" stroke="#64748b" stroke-dasharray="5 4"/><line x1="40" y1="112" x2="272" y2="112" stroke="#64748b" stroke-dasharray="5 4"/><text x="44" y="108" font-size="9">threshold</text>',
  });
  return wrapBioSvg(
    '<text x="14" y="16" font-size="12">Spatial and temporal summation</text>' +
      neuron +
      epspIpsp +
      '<g transform="translate(0,0) scale(1)">' +
      graph +
      '</g>',
  );
}
/**
 * Reusable SVG helpers for biology diagrams.
 */
export function wrapBioSvg(inner: string, viewBox = '0 0 300 180'): string {
  return `<svg viewBox="${viewBox}">${inner}</svg>`;
}

export function prokaryoteCellDiagram(): string {
  return wrapBioSvg(
    '<ellipse cx="145" cy="92" rx="108" ry="58" fill="#ecfeff" stroke="#0f766e" stroke-width="2"/>' +
      '<ellipse cx="145" cy="92" rx="92" ry="44" fill="#cffafe" stroke="#0f766e" stroke-dasharray="4 3"/>' +
      '<path d="M110 85 Q145 50 182 88 Q145 122 110 85 Z" fill="#a7f3d0" stroke="#047857" stroke-width="2"/>' +
      '<circle cx="124" cy="90" r="3" fill="#0369a1"/><circle cx="167" cy="103" r="3" fill="#0369a1"/>' +
      '<line x1="250" y1="92" x2="282" y2="92" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="14" y="38" font-size="10">capsule/cell wall/membrane</text>' +
      '<text x="182" y="34" font-size="10">nucleoid DNA</text><text x="198" y="128" font-size="10">70S ribosomes</text>',
  );
}

export function eukaryoteCellDiagram(): string {
  return wrapBioSvg(
    '<ellipse cx="150" cy="92" rx="110" ry="62" fill="#f8fafc" stroke="#334155" stroke-width="2"/>' +
      '<circle cx="126" cy="88" r="30" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
      '<circle cx="126" cy="88" r="10" fill="#93c5fd" stroke="#1d4ed8"/>' +
      '<ellipse cx="188" cy="72" rx="20" ry="12" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<ellipse cx="192" cy="109" rx="22" ry="13" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="100" y="140" font-size="10">nucleus</text><text x="174" y="56" font-size="10">mitochondria</text>',
  );
}

export function endosymbiosisDiagram(): string {
  return wrapBioSvg(
    '<rect x="22" y="34" width="74" height="56" rx="22" fill="#cffafe" stroke="#0e7490" stroke-width="2"/>' +
      '<rect x="112" y="42" width="36" height="32" rx="14" fill="#fde68a" stroke="#a16207" stroke-width="2"/>' +
      '<rect x="186" y="34" width="92" height="56" rx="24" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>' +
      '<line x1="96" y1="62" x2="112" y2="58" stroke="#1d4ed8" stroke-width="2"/>' +
      '<line x1="148" y1="58" x2="186" y2="58" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="28" y="105" font-size="10">host</text><text x="108" y="88" font-size="10">bacterium</text><text x="188" y="106" font-size="10">mitochondrion-bearing cell</text>',
  );
}

export function membraneFluidMosaicDiagram(): string {
  return wrapBioSvg(
    '<rect x="28" y="54" width="244" height="26" fill="#bae6fd" stroke="#0369a1"/>' +
      '<rect x="28" y="102" width="244" height="26" fill="#bae6fd" stroke="#0369a1"/>' +
      '<rect x="90" y="70" width="30" height="44" rx="8" fill="#1d4ed8"/>' +
      '<rect x="166" y="66" width="20" height="52" rx="7" fill="#0f766e"/>' +
      '<text x="34" y="26" font-size="10">fluid bilayer with proteins/cholesterol</text>',
  );
}

export function membraneTransportDiagram(): string {
  return wrapBioSvg(
    '<line x1="150" y1="30" x2="150" y2="150" stroke="#334155" stroke-width="4"/>' +
      '<rect x="128" y="54" width="44" height="70" rx="8" fill="#bfdbfe" stroke="#1d4ed8"/>' +
      '<circle cx="90" cy="68" r="5" fill="#16a34a"/><circle cx="210" cy="70" r="5" fill="#dc2626"/>' +
      '<line x1="102" y1="68" x2="128" y2="68" stroke="#15803d" stroke-width="2"/>' +
      '<line x1="198" y1="94" x2="172" y2="94" stroke="#b91c1c" stroke-width="2"/>' +
      '<text x="35" y="26" font-size="10">facilitated diffusion vs active transport</text>',
  );
}

export function rbcOsmosisDiagram(): string {
  return wrapBioSvg(
    '<circle cx="70" cy="86" r="26" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/>' +
      '<circle cx="150" cy="86" r="34" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/>' +
      '<path d="M230 56 L240 74 L260 74 L244 88 L250 108 L230 96 L210 108 L216 88 L200 74 L220 74 Z" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/>' +
      '<text x="34" y="130" font-size="10">0.9%</text><text x="126" y="130" font-size="10">0.2% swollen</text><text x="206" y="130" font-size="10">2% crenated</text>',
  );
}

export function enzymeEnergyDiagram(): string {
  return wrapBioSvg(
    '<line x1="34" y1="144" x2="276" y2="144" stroke="#334155" stroke-width="2"/>' +
      '<line x1="34" y1="144" x2="34" y2="28" stroke="#334155" stroke-width="2"/>' +
      '<path d="M40 128 Q105 38 160 82 T270 72" fill="none" stroke="#b91c1c" stroke-width="2.5"/>' +
      '<path d="M40 128 Q98 64 156 94 T270 72" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
      '<text x="164" y="54" font-size="10" fill="#b91c1c">uncatalyzed Ea</text><text x="166" y="98" font-size="10" fill="#1d4ed8">catalyzed Ea</text>',
  );
}

export function michaelisMentenDiagram(): string {
  return wrapBioSvg(
    '<line x1="36" y1="142" x2="276" y2="142" stroke="#334155" stroke-width="2"/>' +
      '<line x1="36" y1="142" x2="36" y2="22" stroke="#334155" stroke-width="2"/>' +
      '<path d="M42 130 C82 84 128 56 180 48 C220 44 250 44 272 44" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
      '<line x1="36" y1="94" x2="272" y2="94" stroke="#64748b" stroke-dasharray="4 3"/>' +
      '<line x1="148" y1="142" x2="148" y2="94" stroke="#64748b" stroke-dasharray="4 3"/>' +
      '<text x="244" y="36" font-size="10">Vmax</text><text x="152" y="156" font-size="10">Km</text>',
  );
}

export function inhibitorComparisonDiagram(): string {
  return wrapBioSvg(
    '<line x1="36" y1="142" x2="276" y2="142" stroke="#334155" stroke-width="2"/>' +
      '<line x1="36" y1="142" x2="36" y2="22" stroke="#334155" stroke-width="2"/>' +
      '<path d="M42 130 C82 84 128 56 182 48 C224 44 250 44 272 44" fill="none" stroke="#1d4ed8" stroke-width="2.2"/>' +
      '<path d="M42 132 C86 98 140 74 196 62 C228 55 250 55 272 55" fill="none" stroke="#15803d" stroke-width="2.2"/>' +
      '<path d="M42 138 C88 102 140 80 196 72 C228 69 250 69 272 69" fill="none" stroke="#b91c1c" stroke-width="2.2"/>' +
      '<text x="188" y="40" font-size="10">none</text><text x="186" y="58" font-size="10">competitive</text><text x="186" y="76" font-size="10">noncompetitive</text>',
  );
}

export function respirationFlowchartDiagram(): string {
  return wrapBioSvg(
    '<rect x="20" y="56" width="62" height="34" rx="8" fill="#dbeafe" stroke="#1d4ed8"/>' +
      '<rect x="106" y="56" width="62" height="34" rx="8" fill="#dcfce7" stroke="#15803d"/>' +
      '<rect x="190" y="56" width="78" height="34" rx="8" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="32" y="76" font-size="10">glycolysis</text><text x="114" y="76" font-size="10">TCA</text><text x="198" y="76" font-size="10">ETC</text>' +
      '<line x1="82" y1="73" x2="106" y2="73" stroke="#1d4ed8" stroke-width="2"/><line x1="168" y1="73" x2="190" y2="73" stroke="#1d4ed8" stroke-width="2"/>',
  );
}

export function etcChemiosmosisDiagram(): string {
  return wrapBioSvg(
    '<rect x="24" y="36" width="252" height="26" fill="#bfdbfe" stroke="#1d4ed8"/>' +
      '<rect x="24" y="120" width="252" height="26" fill="#fde68a" stroke="#a16207"/>' +
      '<rect x="56" y="76" width="26" height="44" fill="#93c5fd" stroke="#1d4ed8"/>' +
      '<rect x="110" y="74" width="26" height="46" fill="#93c5fd" stroke="#1d4ed8"/>' +
      '<rect x="164" y="72" width="26" height="48" fill="#93c5fd" stroke="#1d4ed8"/>' +
      '<circle cx="236" cy="96" r="18" fill="#86efac" stroke="#15803d"/><text x="220" y="100" font-size="10">ATP synthase</text>',
  );
}

export function fermentationDiagram(): string {
  return wrapBioSvg(
    '<rect x="34" y="60" width="74" height="34" rx="8" fill="#dbeafe" stroke="#1d4ed8"/>' +
      '<rect x="136" y="36" width="62" height="30" rx="8" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<rect x="136" y="104" width="62" height="30" rx="8" fill="#fef3c7" stroke="#a16207"/>' +
      '<line x1="108" y1="74" x2="136" y2="51" stroke="#b91c1c" stroke-width="2"/><line x1="108" y1="80" x2="136" y2="118" stroke="#b91c1c" stroke-width="2"/>' +
      '<text x="42" y="81" font-size="10">pyruvate</text><text x="142" y="55" font-size="10">lactate</text><text x="140" y="124" font-size="10">ethanol + CO2</text>',
  );
}

export function chloroplastDiagram(): string {
  return wrapBioSvg(
    '<ellipse cx="150" cy="92" rx="112" ry="62" fill="#dcfce7" stroke="#15803d" stroke-width="2"/>' +
      '<ellipse cx="150" cy="92" rx="96" ry="48" fill="#bbf7d0" stroke="#15803d" stroke-dasharray="4 3"/>' +
      '<rect x="84" y="66" width="36" height="14" rx="4" fill="#16a34a"/><rect x="84" y="84" width="36" height="14" rx="4" fill="#16a34a"/><rect x="138" y="92" width="36" height="14" rx="4" fill="#16a34a"/>' +
      '<text x="188" y="72" font-size="10">stroma</text><text x="188" y="102" font-size="10">thylakoid</text>',
  );
}

export function photosystemZDiagram(): string {
  return wrapBioSvg(
    '<line x1="34" y1="142" x2="276" y2="142" stroke="#334155" stroke-width="2"/>' +
      '<line x1="34" y1="142" x2="34" y2="24" stroke="#334155" stroke-width="2"/>' +
      '<path d="M44 118 L90 80 L130 104 L174 66 L220 88 L262 54" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
      '<text x="74" y="72" font-size="10">PSII</text><text x="160" y="58" font-size="10">PSI</text>',
  );
}

export function calvinCycleDiagram(): string {
  return wrapBioSvg(
    '<circle cx="150" cy="92" r="54" fill="none" stroke="#15803d" stroke-width="2.5"/>' +
      '<text x="118" y="33" font-size="10">carboxylation</text><text x="208" y="90" font-size="10">reduction</text><text x="82" y="112" font-size="10">regeneration</text>' +
      '<text x="108" y="167" font-size="10">3 CO2 + 9 ATP + 6 NADPH -> G3P</text>',
  );
}

export function c3c4camDiagram(): string {
  return wrapBioSvg(
    '<rect x="18" y="36" width="82" height="96" fill="#dcfce7" stroke="#15803d"/>' +
      '<rect x="110" y="36" width="82" height="96" fill="#dbeafe" stroke="#1d4ed8"/>' +
      '<rect x="202" y="36" width="82" height="96" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="48" y="52" font-size="11">C3</text><text x="138" y="52" font-size="11">C4</text><text x="230" y="52" font-size="11">CAM</text>' +
      '<text x="24" y="72" font-size="9">direct Rubisco</text><text x="116" y="72" font-size="9">bundle sheath</text><text x="208" y="72" font-size="9">night/day split</text>',
  );
}

export function cellCycleCircleDiagram(): string {
  return wrapBioSvg(
    '<circle cx="150" cy="92" r="60" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
      '<text x="165" y="44" font-size="10">G1</text><text x="216" y="98" font-size="10">S</text><text x="144" y="168" font-size="10">G2</text><text x="70" y="98" font-size="10">M</text>',
  );
}

export function mitosisStagesDiagram(): string {
  return wrapBioSvg(
    '<rect x="16" y="50" width="62" height="78" rx="10" fill="#dbeafe" stroke="#1d4ed8"/><rect x="88" y="50" width="62" height="78" rx="10" fill="#dcfce7" stroke="#15803d"/><rect x="160" y="50" width="62" height="78" rx="10" fill="#fef3c7" stroke="#a16207"/><rect x="232" y="50" width="62" height="78" rx="10" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="23" y="44" font-size="9">prophase</text><text x="94" y="44" font-size="9">metaphase</text><text x="165" y="44" font-size="9">anaphase</text><text x="238" y="44" font-size="9">telophase</text>',
  );
}

export function checkpointDiagram(): string {
  return wrapBioSvg(
    '<rect x="30" y="72" width="54" height="28" rx="8" fill="#dbeafe" stroke="#1d4ed8"/><rect x="122" y="72" width="54" height="28" rx="8" fill="#dcfce7" stroke="#15803d"/><rect x="214" y="72" width="54" height="28" rx="8" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="44" y="90" font-size="10">G1/S</text><text x="136" y="90" font-size="10">G2/M</text><text x="226" y="90" font-size="10">spindle</text>',
  );
}

export function proteinStructureDiagram(): string {
  return wrapBioSvg(
    '<rect x="14" y="50" width="62" height="80" fill="#dbeafe" stroke="#1d4ed8"/><rect x="86" y="50" width="62" height="80" fill="#dcfce7" stroke="#15803d"/><rect x="158" y="50" width="62" height="80" fill="#fef3c7" stroke="#a16207"/><rect x="230" y="50" width="62" height="80" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="18" y="44" font-size="9">primary</text><text x="90" y="44" font-size="9">secondary</text><text x="164" y="44" font-size="9">tertiary</text><text x="236" y="44" font-size="9">quaternary</text>',
  );
}

export function dnaRnaDiagram(): string {
  return wrapBioSvg(
    '<rect x="18" y="40" width="118" height="98" fill="#dbeafe" stroke="#1d4ed8"/><rect x="164" y="40" width="118" height="98" fill="#dcfce7" stroke="#15803d"/>' +
      '<text x="64" y="58" font-size="11">DNA</text><text x="210" y="58" font-size="11">RNA</text>' +
      '<text x="30" y="153" font-size="10">deoxyribose + thymine</text><text x="182" y="153" font-size="10">ribose + uracil</text>',
  );
}

export function replicationForkDiagram(): string {
  return wrapBioSvg(
    '<line x1="30" y1="90" x2="130" y2="90" stroke="#334155" stroke-width="2.4"/><line x1="130" y1="90" x2="246" y2="44" stroke="#334155" stroke-width="2.4"/><line x1="130" y1="90" x2="246" y2="136" stroke="#334155" stroke-width="2.4"/>' +
      '<line x1="138" y1="86" x2="220" y2="56" stroke="#16a34a" stroke-width="2"/><line x1="146" y1="96" x2="176" y2="108" stroke="#16a34a" stroke-width="2"/>' +
      '<text x="150" y="48" font-size="10">leading 5\'->3\'</text><text x="148" y="148" font-size="10">lagging Okazaki</text>',
  );
}

export function telomeraseDiagram(): string {
  return wrapBioSvg(
    '<line x1="32" y1="92" x2="246" y2="92" stroke="#334155" stroke-width="2.2"/><line x1="32" y1="106" x2="214" y2="106" stroke="#334155" stroke-width="2.2"/>' +
      '<rect x="214" y="78" width="34" height="42" rx="8" fill="#fde68a" stroke="#a16207"/>' +
      '<text x="216" y="74" font-size="10">telomerase</text><text x="250" y="94" font-size="10">TTAGGG</text>',
  );
}

export function centralDogmaDiagram(): string {
  return wrapBioSvg(
    '<rect x="26" y="64" width="58" height="36" rx="9" fill="#dbeafe" stroke="#1d4ed8"/><rect x="118" y="64" width="58" height="36" rx="9" fill="#dcfce7" stroke="#15803d"/><rect x="210" y="64" width="58" height="36" rx="9" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="46" y="86" font-size="11">DNA</text><text x="138" y="86" font-size="11">RNA</text><text x="226" y="86" font-size="11">protein</text>' +
      '<line x1="84" y1="82" x2="118" y2="82" stroke="#1d4ed8" stroke-width="2"/><line x1="176" y1="82" x2="210" y2="82" stroke="#1d4ed8" stroke-width="2"/>',
  );
}

export function transcriptionTranslationDiagram(): string {
  return wrapBioSvg(
    '<rect x="20" y="42" width="116" height="40" fill="#dbeafe" stroke="#1d4ed8"/><rect x="20" y="106" width="116" height="36" fill="#dcfce7" stroke="#15803d"/>' +
      '<text x="34" y="65" font-size="10">DNA: 3\'-TACGGA-5\'</text><text x="30" y="128" font-size="10">mRNA: 5\'-AUGCCU-3\'</text>' +
      '<circle cx="202" cy="92" r="28" fill="#fde68a" stroke="#a16207"/><text x="184" y="95" font-size="10">ribosome</text>',
  );
}

export function geneticCodeDiagram(): string {
  return wrapBioSvg(
    '<rect x="24" y="38" width="252" height="104" fill="#f8fafc" stroke="#334155"/>' +
      '<line x1="24" y1="66" x2="276" y2="66" stroke="#334155"/><line x1="84" y1="38" x2="84" y2="142" stroke="#334155"/><line x1="164" y1="38" x2="164" y2="142" stroke="#334155"/>' +
      '<text x="34" y="84" font-size="10">AUG</text><text x="102" y="84" font-size="10">Met start</text><text x="172" y="84" font-size="10">initiation</text>' +
      '<text x="34" y="124" font-size="10">UAA/UAG/UGA</text><text x="102" y="124" font-size="10">Stop</text><text x="172" y="124" font-size="10">termination</text>',
  );
}

export function punnettDihybridDiagram(): string {
  return wrapBioSvg(
    '<rect x="24" y="24" width="252" height="132" fill="#f8fafc" stroke="#334155"/>' +
      '<line x1="84" y1="24" x2="84" y2="156" stroke="#334155"/><line x1="24" y1="64" x2="276" y2="64" stroke="#334155"/>' +
      '<line x1="132" y1="24" x2="132" y2="156" stroke="#cbd5e1"/><line x1="180" y1="24" x2="180" y2="156" stroke="#cbd5e1"/><line x1="228" y1="24" x2="228" y2="156" stroke="#cbd5e1"/>' +
      '<text x="38" y="50" font-size="10">gametes</text><text x="100" y="50" font-size="10">RY</text><text x="148" y="50" font-size="10">Ry</text><text x="196" y="50" font-size="10">rY</text><text x="244" y="50" font-size="10">ry</text>',
  );
}

export function testCrossDiagram(): string {
  return wrapBioSvg(
    '<rect x="30" y="44" width="104" height="92" rx="10" fill="#dbeafe" stroke="#1d4ed8"/><rect x="166" y="44" width="104" height="92" rx="10" fill="#fee2e2" stroke="#b91c1c"/>' +
      '<text x="48" y="70" font-size="10">unknown dominant</text><text x="186" y="70" font-size="10">tester rryy</text>' +
      '<text x="176" y="116" font-size="10">1:1:1:1 => RrYy</text><text x="176" y="132" font-size="10">all dominant => RRYY</text>',
  );
}
