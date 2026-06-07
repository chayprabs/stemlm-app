/**
 * Reusable SVG building blocks for biology diagram steps.
 * ViewBox guidance: 0 0 300 180 (or smaller height).
 */

import { axesGraph } from './math-svg';

const ARROW_DEF =
  '<defs><marker id="bio-arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#1f2937"/></marker></defs>';

export function wrapBioSvg(inner: string, viewBox = '0 0 300 180'): string {
  return `<svg viewBox="${viewBox}">${inner}</svg>`;
}

export function prokaryoticCell(): string {
  return wrapBioSvg(
    '<ellipse cx="145" cy="90" rx="108" ry="62" fill="#dcfce7" stroke="#166534" stroke-width="3"/>' +
      '<ellipse cx="145" cy="90" rx="94" ry="50" fill="#ecfeff" stroke="#0f766e" stroke-width="2"/>' +
      '<path d="M98 86 C122 56, 178 56, 192 86 C170 116, 120 120, 98 86 Z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
      '<circle cx="86" cy="112" r="8" fill="none" stroke="#9333ea" stroke-width="2"/><circle cx="202" cy="112" r="9" fill="none" stroke="#9333ea" stroke-width="2"/>' +
      '<line x1="248" y1="96" x2="286" y2="130" stroke="#0f766e" stroke-width="3"/>' +
      '<text x="14" y="22" font-size="12">Prokaryotic cell</text><text x="14" y="40" font-size="10">cell wall + membrane</text><text x="195" y="40" font-size="10">nucleoid DNA</text><text x="224" y="150" font-size="10">flagellum</text>',
  );
}

export function bioTable(): string {
  const h = '<text x="150" y="18" font-size="12" text-anchor="middle">DNA RNA Protein summary</text>';
  const grid =
    '<rect x="16" y="28" width="268" height="108" fill="#f8fafc" stroke="#334155"/>' +
    '<line x1="84" y1="28" x2="84" y2="136" stroke="#334155"/><line x1="150" y1="28" x2="150" y2="136" stroke="#334155"/><line x1="216" y1="28" x2="216" y2="136" stroke="#334155"/>' +
    '<line x1="16" y1="56" x2="284" y2="56" stroke="#334155"/><line x1="16" y1="84" x2="284" y2="84" stroke="#334155"/><line x1="16" y1="112" x2="284" y2="112" stroke="#334155"/>';
  const txt =
    '<text x="50" y="46" font-size="10" text-anchor="middle">feature</text><text x="117" y="46" font-size="10" text-anchor="middle">DNA</text><text x="183" y="46" font-size="10" text-anchor="middle">RNA</text><text x="250" y="46" font-size="10" text-anchor="middle">protein</text>' +
    '<text x="50" y="74" font-size="9" text-anchor="middle">monomer</text><text x="117" y="74" font-size="9" text-anchor="middle">nucleotide</text><text x="183" y="74" font-size="9" text-anchor="middle">nucleotide</text><text x="250" y="74" font-size="9" text-anchor="middle">amino acid</text>' +
    '<text x="50" y="102" font-size="9" text-anchor="middle">role</text><text x="117" y="102" font-size="9" text-anchor="middle">storage</text><text x="183" y="102" font-size="9" text-anchor="middle">message</text><text x="250" y="102" font-size="9" text-anchor="middle">function</text>' +
    '<text x="50" y="130" font-size="9" text-anchor="middle">location</text><text x="117" y="130" font-size="9" text-anchor="middle">nucleus</text><text x="183" y="130" font-size="9" text-anchor="middle">nucleus/cyto</text><text x="250" y="130" font-size="9" text-anchor="middle">everywhere</text>';
  return wrapBioSvg(h + grid + txt, '0 0 300 150');
}

export function fluidMosaicMembrane(): string {
  const heads = Array.from({ length: 12 }, (_, i) => 42 + i * 18)
    .map((x) => `<circle cx="${x}" cy="54" r="5" fill="#60a5fa"/><circle cx="${x}" cy="126" r="5" fill="#60a5fa"/>`)
    .join('');
  const tails = Array.from({ length: 12 }, (_, i) => 42 + i * 18)
    .map((x) => `<line x1="${x - 2}" y1="60" x2="${x - 2}" y2="120" stroke="#0284c7"/><line x1="${x + 2}" y1="60" x2="${x + 2}" y2="120" stroke="#0284c7"/>`)
    .join('');
  return wrapBioSvg(
    heads +
      tails +
      '<rect x="98" y="46" width="24" height="88" rx="10" fill="#fde68a" stroke="#92400e" stroke-width="2"/><ellipse cx="182" cy="90" rx="18" ry="12" fill="#fca5a5" stroke="#b91c1c"/>' +
      '<text x="12" y="20" font-size="12">Fluid mosaic membrane</text><text x="12" y="40" font-size="10">extracellular</text><text x="12" y="154" font-size="10">cytoplasm</text><text x="126" y="42" font-size="10">channel</text><text x="196" y="92" font-size="10">cholesterol</text>',
  );
}

export function reactionEnergyDiagram(): string {
  return axesGraph({
    xLabel: 'reaction progress',
    yLabel: 'energy',
    curves: [{ d: 'M 40 132 C 94 126, 118 50, 152 50 C 188 50, 224 114, 272 108', stroke: '#b91c1c', label: 'energy profile', labelPos: [178, 64] }],
    annotations:
      '<line x1="152" y1="50" x2="152" y2="24" stroke="#ef4444" stroke-dasharray="4 3"/><text x="160" y="24" font-size="10">Ea</text><text x="28" y="108" font-size="10">reactants</text><text x="242" y="88" font-size="10">products</text>',
  });
}

export function michaelisMentenCurve(): string {
  return axesGraph({
    xLabel: '[S]',
    yLabel: 'v',
    curves: [{ d: 'M 40 130 C 84 90, 126 62, 272 50', stroke: '#1d4ed8', label: 'v=Vmax[S]/(Km+[S])', labelPos: [120, 34] }],
    annotations:
      '<line x1="40" y1="50" x2="272" y2="50" stroke="#64748b" stroke-dasharray="5 4"/><line x1="116" y1="140" x2="116" y2="94" stroke="#64748b" stroke-dasharray="5 4"/><text x="242" y="46" font-size="10">Vmax</text><text x="120" y="92" font-size="10">Km</text>',
  });
}

export function respirationFlowchart(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="16" y="30" width="62" height="22" fill="#dbeafe" stroke="#1e3a8a"/><text x="47" y="45" font-size="9" text-anchor="middle">glucose</text>' +
      '<rect x="96" y="30" width="80" height="22" fill="#dcfce7" stroke="#166534"/><text x="136" y="45" font-size="9" text-anchor="middle">glycolysis</text>' +
      '<rect x="196" y="30" width="86" height="22" fill="#fee2e2" stroke="#991b1b"/><text x="239" y="45" font-size="9" text-anchor="middle">pyruvate</text>' +
      '<rect x="108" y="86" width="84" height="22" fill="#fef3c7" stroke="#92400e"/><text x="150" y="101" font-size="9" text-anchor="middle">Krebs cycle</text>' +
      '<rect x="96" y="142" width="108" height="22" fill="#ede9fe" stroke="#5b21b6"/><text x="150" y="157" font-size="9" text-anchor="middle">ETC + ATP synthase</text>' +
      '<line x1="78" y1="41" x2="96" y2="41" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="176" y1="41" x2="196" y2="41" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="239" y1="52" x2="182" y2="86" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="150" y1="108" x2="150" y2="142" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="18" y="68" font-size="9">2 ATP + 2 NADH</text><text x="198" y="68" font-size="9">acetyl-CoA</text><text x="16" y="122" font-size="9">CO2 released</text><text x="210" y="122" font-size="9">NADH/FADH2</text><text x="212" y="158" font-size="9">30-32 ATP</text>',
  );
}

export function chloroplast(): string {
  return wrapBioSvg(
    '<ellipse cx="150" cy="90" rx="112" ry="64" fill="#ecfccb" stroke="#4d7c0f" stroke-width="3"/><ellipse cx="150" cy="90" rx="98" ry="54" fill="#f7fee7" stroke="#65a30d" stroke-width="2"/>' +
      '<ellipse cx="106" cy="74" rx="20" ry="7" fill="#86efac" stroke="#15803d"/><ellipse cx="106" cy="82" rx="20" ry="7" fill="#86efac" stroke="#15803d"/><ellipse cx="106" cy="90" rx="20" ry="7" fill="#86efac" stroke="#15803d"/>' +
      '<ellipse cx="154" cy="70" rx="20" ry="7" fill="#86efac" stroke="#15803d"/><ellipse cx="154" cy="78" rx="20" ry="7" fill="#86efac" stroke="#15803d"/><ellipse cx="154" cy="86" rx="20" ry="7" fill="#86efac" stroke="#15803d"/>' +
      '<ellipse cx="198" cy="82" rx="20" ry="7" fill="#86efac" stroke="#15803d"/><ellipse cx="198" cy="90" rx="20" ry="7" fill="#86efac" stroke="#15803d"/><ellipse cx="198" cy="98" rx="20" ry="7" fill="#86efac" stroke="#15803d"/>' +
      '<text x="14" y="20" font-size="12">Chloroplast</text><text x="18" y="38" font-size="10">double membrane</text><text x="222" y="62" font-size="10">stroma</text><text x="222" y="124" font-size="10">grana</text>',
  );
}

export function cellCycle(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<path d="M150 90 L150 24 A66 66 0 0 1 214 96 Z" fill="#bfdbfe" stroke="#1e3a8a"/><path d="M150 90 L214 96 A66 66 0 0 1 150 156 Z" fill="#bbf7d0" stroke="#166534"/><path d="M150 90 L150 156 A66 66 0 0 1 84 96 Z" fill="#fef08a" stroke="#a16207"/><path d="M150 90 L84 96 A66 66 0 0 1 150 24 Z" fill="#fecaca" stroke="#991b1b"/>' +
      '<path d="M154 32 A58 58 0 0 1 206 96" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/><path d="M206 100 A58 58 0 0 1 154 148" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/><path d="M146 148 A58 58 0 0 1 94 100" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/><path d="M94 92 A58 58 0 0 1 146 32" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="150" y="16" font-size="12" text-anchor="middle">Cell cycle</text><text x="196" y="78" font-size="11">G1</text><text x="176" y="132" font-size="11">S</text><text x="106" y="132" font-size="11">G2</text><text x="92" y="78" font-size="11">M</text>',
  );
}

export function proteinStructures(): string {
  return wrapBioSvg(
    '<text x="16" y="24" font-size="11">Primary</text><circle cx="42" cy="56" r="4" fill="#f97316"/><circle cx="56" cy="56" r="4" fill="#f97316"/><circle cx="70" cy="56" r="4" fill="#f97316"/><circle cx="84" cy="56" r="4" fill="#f97316"/><line x1="42" y1="56" x2="84" y2="56" stroke="#9a3412"/>' +
      '<text x="108" y="24" font-size="11">Secondary</text><path d="M102 60 C112 44, 122 76, 132 60 C142 44, 152 76, 162 60" fill="none" stroke="#1d4ed8" stroke-width="3"/>' +
      '<text x="188" y="24" font-size="11">Tertiary</text><path d="M196 68 C180 48, 214 42, 220 60 C228 82, 196 94, 186 78 Z" fill="#dcfce7" stroke="#15803d" stroke-width="2"/>' +
      '<text x="18" y="108" font-size="11">Quaternary</text><circle cx="70" cy="136" r="15" fill="#bfdbfe" stroke="#1d4ed8"/><circle cx="92" cy="136" r="15" fill="#bbf7d0" stroke="#15803d"/><circle cx="81" cy="154" r="15" fill="#fde68a" stroke="#a16207"/>' +
      '<text x="172" y="132" font-size="10">1 degree sequence</text><text x="172" y="148" font-size="10">2 degree motifs</text><text x="172" y="164" font-size="10">3 degree fold, 4 degree complex</text>',
  );
}

export function replicationFork(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<path d="M30 52 C78 52, 108 72, 136 90" fill="none" stroke="#1d4ed8" stroke-width="3"/><path d="M30 70 C78 70, 108 82, 136 90" fill="none" stroke="#dc2626" stroke-width="3"/><path d="M136 90 C182 52, 236 42, 276 48" fill="none" stroke="#1d4ed8" stroke-width="3"/><path d="M136 90 C182 128, 236 136, 276 132" fill="none" stroke="#dc2626" stroke-width="3"/>' +
      '<line x1="166" y1="66" x2="212" y2="54" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="166" y1="116" x2="194" y2="128" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="200" y1="108" x2="228" y2="121" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<rect x="180" y="116" width="22" height="6" fill="#fef08a" stroke="#a16207"/><rect x="212" y="126" width="22" height="6" fill="#fef08a" stroke="#a16207"/>' +
      '<text x="12" y="22" font-size="12">Replication fork</text><text x="206" y="38" font-size="10">leading strand</text><text x="206" y="160" font-size="10">lagging strand</text><text x="236" y="112" font-size="10">Okazaki</text>',
  );
}

export function centralDogma(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="36" y="66" width="66" height="28" fill="#dbeafe" stroke="#1e3a8a"/><text x="69" y="84" font-size="11" text-anchor="middle">DNA</text>' +
      '<rect x="122" y="66" width="66" height="28" fill="#dcfce7" stroke="#166534"/><text x="155" y="84" font-size="11" text-anchor="middle">RNA</text>' +
      '<rect x="208" y="66" width="66" height="28" fill="#fee2e2" stroke="#991b1b"/><text x="241" y="84" font-size="11" text-anchor="middle">Protein</text>' +
      '<line x1="102" y1="80" x2="122" y2="80" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="188" y1="80" x2="208" y2="80" stroke="#1f2937" marker-end="url(#bio-arr)"/><path d="M150 62 C134 38, 110 38, 102 61" fill="none" stroke="#7c3aed" marker-end="url(#bio-arr)"/>' +
      '<text x="150" y="22" font-size="12" text-anchor="middle">Central dogma</text><text x="110" y="52" font-size="10">replication</text><text x="124" y="108" font-size="10">transcription</text><text x="214" y="52" font-size="10">translation</text>',
  );
}

export function lacOperon(state: 'lactosePresent' | 'lactoseAbsent' = 'lactosePresent'): string {
  const on = state === 'lactosePresent';
  return wrapBioSvg(
    ARROW_DEF +
      `<text x="12" y="18" font-size="12">lac operon: ${on ? 'lactose present (induced)' : 'lactose absent (repressed)'}</text>` +
      '<line x1="18" y1="96" x2="282" y2="96" stroke="#334155" stroke-width="3"/><rect x="40" y="82" width="26" height="28" fill="#dbeafe" stroke="#1e3a8a"/><text x="53" y="100" font-size="9" text-anchor="middle">P</text><rect x="72" y="82" width="26" height="28" fill="#bfdbfe" stroke="#1e3a8a"/><text x="85" y="100" font-size="9" text-anchor="middle">O</text><rect x="104" y="82" width="42" height="28" fill="#dcfce7" stroke="#166534"/><text x="125" y="100" font-size="9" text-anchor="middle">lacZ</text><rect x="150" y="82" width="42" height="28" fill="#dcfce7" stroke="#166534"/><text x="171" y="100" font-size="9" text-anchor="middle">lacY</text><rect x="196" y="82" width="42" height="28" fill="#dcfce7" stroke="#166534"/><text x="217" y="100" font-size="9" text-anchor="middle">lacA</text>' +
      '<rect x="40" y="36" width="38" height="22" fill="#fee2e2" stroke="#991b1b"/><text x="59" y="50" font-size="9" text-anchor="middle">lacI</text><ellipse cx="100" cy="47" rx="18" ry="10" fill="#fecaca" stroke="#991b1b"/>' +
      (on
        ? '<circle cx="124" cy="47" r="7" fill="#fde68a" stroke="#a16207"/><text x="136" y="51" font-size="9">allolactose</text><line x1="98" y1="112" x2="232" y2="112" stroke="#166534" marker-end="url(#bio-arr)"/><text x="236" y="116" font-size="10" fill="#166534">mRNA made</text>'
        : '<line x1="100" y1="57" x2="85" y2="82" stroke="#991b1b" stroke-width="2"/><text x="150" y="56" font-size="10" fill="#991b1b">repressor blocks operator</text><line x1="88" y1="112" x2="240" y2="112" stroke="#64748b" stroke-dasharray="5 4"/><text x="244" y="116" font-size="10">off</text>'),
  );
}

export function motorNeuron(): string {
  return wrapBioSvg(
    '<circle cx="64" cy="90" r="24" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/><circle cx="64" cy="90" r="9" fill="#fecaca" stroke="#7f1d1d"/><path d="M42 74 L22 62 L12 54" fill="none" stroke="#991b1b" stroke-width="2"/><path d="M44 104 L20 116 L12 126" fill="none" stroke="#991b1b" stroke-width="2"/><line x1="88" y1="90" x2="252" y2="90" stroke="#374151" stroke-width="3"/>' +
      '<rect x="108" y="79" width="20" height="22" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/><rect x="136" y="79" width="20" height="22" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/><rect x="164" y="79" width="20" height="22" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/><rect x="192" y="79" width="20" height="22" rx="8" fill="#bfdbfe" stroke="#1e3a8a"/>' +
      '<circle cx="262" cy="80" r="5" fill="#f59e0b"/><circle cx="272" cy="90" r="5" fill="#f59e0b"/><circle cx="262" cy="100" r="5" fill="#f59e0b"/>' +
      '<text x="12" y="22" font-size="12">Motor neuron</text><text x="16" y="54" font-size="10">dendrites</text><text x="138" y="118" font-size="10">myelin sheath</text><text x="236" y="118" font-size="10">axon terminals</text>',
  );
}

export function actionPotentialGraph(): string {
  return axesGraph({
    xLabel: 'time',
    yLabel: 'Vm',
    curves: [{ d: 'M 40 116 C 84 116, 100 116, 110 80 C 120 30, 136 24, 146 44 C 156 82, 166 132, 184 132 C 202 124, 224 116, 272 116', stroke: '#b91c1c', label: 'action potential', labelPos: [184, 36] }],
    annotations:
      '<line x1="40" y1="116" x2="272" y2="116" stroke="#64748b" stroke-dasharray="5 4"/><line x1="40" y1="78" x2="272" y2="78" stroke="#64748b" stroke-dasharray="5 4"/><text x="44" y="112" font-size="10">-70 mV</text><text x="44" y="74" font-size="10">threshold</text>',
  });
}

export function chemicalSynapse(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="30" y="38" width="102" height="104" rx="18" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/><text x="81" y="54" font-size="10" text-anchor="middle">presynaptic</text>' +
      '<circle cx="60" cy="78" r="9" fill="#fecaca" stroke="#991b1b"/><circle cx="88" cy="82" r="9" fill="#fecaca" stroke="#991b1b"/><circle cx="108" cy="98" r="9" fill="#fecaca" stroke="#991b1b"/>' +
      '<rect x="134" y="42" width="24" height="96" fill="#e2e8f0" stroke="#64748b"/><text x="146" y="34" font-size="10" text-anchor="middle">cleft</text>' +
      '<rect x="160" y="38" width="110" height="104" rx="18" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/><text x="215" y="54" font-size="10" text-anchor="middle">postsynaptic</text>' +
      '<rect x="186" y="124" width="8" height="12" fill="#93c5fd" stroke="#1e3a8a"/><rect x="206" y="124" width="8" height="12" fill="#93c5fd" stroke="#1e3a8a"/><rect x="226" y="124" width="8" height="12" fill="#93c5fd" stroke="#1e3a8a"/>' +
      '<circle cx="128" cy="74" r="3" fill="#f59e0b"/><circle cx="136" cy="88" r="3" fill="#f59e0b"/><circle cx="144" cy="102" r="3" fill="#f59e0b"/><line x1="118" y1="108" x2="130" y2="108" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="46" y="156" font-size="10">vesicle release</text><text x="182" y="156" font-size="10">ligand-gated channels</text>',
  );
}

export function heartDiagram(): string {
  return wrapBioSvg(
    '<path d="M110 55 C96 46, 76 52, 72 72 C68 88, 82 102, 98 110 C96 126, 102 142, 118 146 C128 134, 136 119, 136 102 C136 78, 125 63, 110 55 Z" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/>' +
      '<path d="M190 55 C204 46, 224 52, 228 72 C232 88, 218 102, 202 110 C204 126, 198 142, 182 146 C172 134, 164 119, 164 102 C164 78, 175 63, 190 55 Z" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>' +
      '<line x1="150" y1="56" x2="150" y2="140" stroke="#334155" stroke-width="2"/><path d="M118 54 C118 30, 132 20, 150 18 C168 20, 182 30, 182 54" fill="none" stroke="#dc2626" stroke-width="4"/><path d="M102 72 C76 62, 56 66, 40 84" fill="none" stroke="#1d4ed8" stroke-width="4"/><path d="M198 72 C224 62, 244 66, 262 84" fill="none" stroke="#1d4ed8" stroke-width="4"/>' +
      '<text x="150" y="14" font-size="12" text-anchor="middle">Heart diagram</text><text x="84" y="78" font-size="10">RA</text><text x="90" y="118" font-size="10">RV</text><text x="206" y="78" font-size="10">LA</text><text x="202" y="118" font-size="10">LV</text><text x="188" y="30" font-size="10">aorta</text>',
  );
}

export function ecgTrace(): string {
  return axesGraph({
    xLabel: 'time',
    yLabel: 'mV',
    curves: [{ d: 'M 40 102 L 68 102 L 78 90 L 92 102 L 108 102 L 120 62 L 130 136 L 146 70 L 158 102 L 186 102 L 198 92 L 214 102 L 272 102', stroke: '#15803d', label: 'ECG', labelPos: [236, 38] }],
    annotations:
      '<line x1="40" y1="102" x2="272" y2="102" stroke="#64748b" stroke-dasharray="4 4"/><text x="74" y="84" font-size="10">P</text><text x="118" y="58" font-size="10">Q</text><text x="129" y="150" font-size="10">R</text><text x="148" y="66" font-size="10">S</text><text x="196" y="88" font-size="10">T</text>',
  });
}

export function respiratoryPathway(): string {
  return wrapBioSvg(
    '<rect x="132" y="18" width="36" height="22" rx="10" fill="#e0f2fe" stroke="#0369a1"/><rect x="134" y="40" width="32" height="30" rx="12" fill="#bae6fd" stroke="#0369a1"/><rect x="142" y="70" width="16" height="28" fill="#93c5fd" stroke="#1d4ed8"/>' +
      '<path d="M150 98 C126 108, 114 124, 104 142" fill="none" stroke="#1d4ed8" stroke-width="4"/><path d="M150 98 C174 108, 186 124, 196 142" fill="none" stroke="#1d4ed8" stroke-width="4"/><circle cx="98" cy="148" r="14" fill="#fef9c3" stroke="#ca8a04"/><circle cx="188" cy="148" r="14" fill="#fef9c3" stroke="#ca8a04"/>' +
      '<text x="150" y="16" font-size="11" text-anchor="middle">Respiratory pathway</text><text x="178" y="33" font-size="10">nasal cavity</text><text x="174" y="59" font-size="10">pharynx/larynx</text><text x="174" y="85" font-size="10">trachea</text><text x="206" y="126" font-size="10">bronchi</text><text x="210" y="160" font-size="10">alveoli</text>',
  );
}

export function digestiveTract(): string {
  return wrapBioSvg(
    '<ellipse cx="150" cy="26" rx="14" ry="10" fill="#fde68a" stroke="#a16207"/><rect x="144" y="36" width="12" height="42" fill="#fcd34d" stroke="#a16207"/><ellipse cx="166" cy="88" rx="32" ry="18" fill="#fecaca" stroke="#991b1b"/>' +
      '<path d="M178 95 C214 102, 218 124, 190 136 C164 146, 136 146, 118 132 C102 120, 112 106, 132 100" fill="none" stroke="#ea580c" stroke-width="5"/><path d="M132 100 C94 106, 86 128, 96 152" fill="none" stroke="#a16207" stroke-width="4"/><rect x="84" y="150" width="22" height="18" fill="#b45309" stroke="#7c2d12"/><ellipse cx="210" cy="82" rx="20" ry="12" fill="#fbbf24" stroke="#a16207"/>' +
      '<text x="12" y="20" font-size="12">Digestive tract</text><text x="170" y="28" font-size="10">mouth</text><text x="170" y="52" font-size="10">esophagus</text><text x="170" y="102" font-size="10">stomach</text><text x="202" y="136" font-size="10">small intestine</text><text x="84" y="176" font-size="10">rectum</text>',
  );
}

export function glucoseFeedback(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="16" y="20" width="86" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="59" y="36" font-size="9" text-anchor="middle">high glucose</text><rect x="112" y="20" width="78" height="24" fill="#dcfce7" stroke="#166534"/><text x="151" y="36" font-size="9" text-anchor="middle">beta cells</text><rect x="204" y="20" width="80" height="24" fill="#fef3c7" stroke="#92400e"/><text x="244" y="36" font-size="9" text-anchor="middle">insulin</text>' +
      '<rect x="16" y="106" width="86" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="59" y="122" font-size="9" text-anchor="middle">low glucose</text><rect x="112" y="106" width="78" height="24" fill="#fecaca" stroke="#991b1b"/><text x="151" y="122" font-size="9" text-anchor="middle">alpha cells</text><rect x="204" y="106" width="80" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="244" y="122" font-size="9" text-anchor="middle">glucagon</text>' +
      '<rect x="106" y="146" width="92" height="24" fill="#e2e8f0" stroke="#334155"/><text x="152" y="162" font-size="9" text-anchor="middle">homeostasis</text>' +
      '<line x1="102" y1="32" x2="112" y2="32" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="190" y1="32" x2="204" y2="32" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="244" y1="44" x2="188" y2="146" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="102" y1="118" x2="112" y2="118" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="190" y1="118" x2="204" y2="118" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="244" y1="130" x2="198" y2="150" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="14" y="92" font-size="9">negative feedback</text>',
  );
}

export function populationGrowth(): string {
  return axesGraph({
    xLabel: 'time',
    yLabel: 'population',
    curves: [
      { d: 'M 40 136 C 82 132, 112 108, 148 78 C 180 56, 214 50, 272 50', stroke: '#1d4ed8', label: 'logistic', labelPos: [206, 62] },
      { d: 'M 40 136 C 98 134, 140 120, 178 86 C 212 58, 236 34, 272 22', stroke: '#b91c1c', label: 'exponential', labelPos: [196, 30] },
    ],
    annotations: '<line x1="40" y1="50" x2="272" y2="50" stroke="#64748b" stroke-dasharray="5 4"/><text x="246" y="46" font-size="10">K</text>',
  });
}

export function foodWeb(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="120" y="12" width="60" height="20" fill="#fef3c7" stroke="#a16207"/><text x="150" y="26" font-size="10" text-anchor="middle">Sun</text><rect x="24" y="52" width="72" height="22" fill="#dcfce7" stroke="#166534"/><text x="60" y="67" font-size="10" text-anchor="middle">Producers</text><rect x="112" y="52" width="76" height="22" fill="#bbf7d0" stroke="#15803d"/><text x="150" y="67" font-size="10" text-anchor="middle">Herbivores</text><rect x="206" y="52" width="70" height="22" fill="#dbeafe" stroke="#1e3a8a"/><text x="241" y="67" font-size="10" text-anchor="middle">Carnivores</text><rect x="90" y="106" width="120" height="22" fill="#e2e8f0" stroke="#334155"/><text x="150" y="121" font-size="10" text-anchor="middle">Decomposers</text>' +
      '<line x1="150" y1="32" x2="60" y2="52" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="60" y1="74" x2="150" y2="52" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="150" y1="74" x2="241" y2="52" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="60" y1="74" x2="120" y2="106" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="241" y1="74" x2="180" y2="106" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="12" y="160" font-size="10">energy flow and nutrient recycling</text>',
  );
}

export function nitrogenCycle(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<ellipse cx="150" cy="20" rx="42" ry="14" fill="#dbeafe" stroke="#1e3a8a"/><text x="150" y="24" font-size="10" text-anchor="middle">atmospheric N2</text><rect x="26" y="74" width="86" height="22" fill="#dcfce7" stroke="#166534"/><text x="69" y="89" font-size="10" text-anchor="middle">NH4+</text><rect x="114" y="74" width="72" height="22" fill="#bbf7d0" stroke="#15803d"/><text x="150" y="89" font-size="10" text-anchor="middle">NO2-</text><rect x="196" y="74" width="82" height="22" fill="#86efac" stroke="#15803d"/><text x="237" y="89" font-size="10" text-anchor="middle">NO3-</text><rect x="100" y="136" width="100" height="24" fill="#fef3c7" stroke="#a16207"/><text x="150" y="152" font-size="10" text-anchor="middle">biomass N</text>' +
      '<line x1="124" y1="32" x2="78" y2="74" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="112" y1="85" x2="114" y2="85" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="186" y1="85" x2="196" y2="85" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="237" y1="96" x2="188" y2="136" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="112" y1="148" x2="64" y2="96" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="278" y1="85" x2="192" y2="24" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="24" y="64" font-size="9">fixation</text><text x="126" y="64" font-size="9">nitrification</text><text x="214" y="112" font-size="9">assimilation</text><text x="196" y="40" font-size="9">denitrification</text>',
  );
}

export function selectionCurve(type: 'stabilizing' | 'directional' | 'disruptive' = 'stabilizing'): string {
  const original = 'M 40 132 C 100 54, 210 54, 272 132';
  const selected =
    type === 'directional'
      ? 'M 40 136 C 110 120, 178 84, 272 44'
      : type === 'disruptive'
        ? 'M 40 132 C 88 70, 118 70, 152 132 C 188 70, 216 70, 272 132'
        : original;
  return axesGraph({
    xLabel: 'trait value',
    yLabel: 'frequency',
    curves: [
      { d: original, stroke: '#94a3b8', label: 'original', labelPos: [200, 118] },
      { d: selected, stroke: '#b91c1c', label: type, labelPos: [186, 34] },
    ],
  });
}

export function bacterialGrowthCurve(): string {
  return axesGraph({
    xLabel: 'time',
    yLabel: 'cell number',
    curves: [{ d: 'M 40 132 C 66 130, 90 130, 108 112 C 126 78, 152 50, 182 46 C 210 44, 228 56, 242 84 C 252 108, 262 120, 272 130', stroke: '#15803d', label: 'batch culture', labelPos: [184, 152] }],
    annotations:
      '<line x1="88" y1="140" x2="88" y2="30" stroke="#cbd5e1" stroke-dasharray="4 3"/><line x1="132" y1="140" x2="132" y2="30" stroke="#cbd5e1" stroke-dasharray="4 3"/><line x1="214" y1="140" x2="214" y2="30" stroke="#cbd5e1" stroke-dasharray="4 3"/><text x="56" y="30" font-size="10">lag</text><text x="104" y="30" font-size="10">log</text><text x="168" y="30" font-size="10">stationary</text><text x="234" y="30" font-size="10">death</text>',
  });
}

export function virusStructures(): string {
  return wrapBioSvg(
    '<circle cx="86" cy="92" r="34" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/><circle cx="86" cy="92" r="20" fill="#fecaca" stroke="#7f1d1d"/><line x1="86" y1="58" x2="86" y2="46" stroke="#991b1b" stroke-width="2"/><line x1="112" y1="92" x2="124" y2="92" stroke="#991b1b" stroke-width="2"/><line x1="60" y1="92" x2="48" y2="92" stroke="#991b1b" stroke-width="2"/><line x1="86" y1="126" x2="86" y2="138" stroke="#991b1b" stroke-width="2"/>' +
      '<polygon points="214,52 230,62 230,82 214,92 198,82 198,62" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/><line x1="214" y1="92" x2="214" y2="122" stroke="#1e3a8a" stroke-width="3"/><line x1="202" y1="122" x2="226" y2="122" stroke="#1e3a8a" stroke-width="2"/><line x1="204" y1="122" x2="194" y2="136" stroke="#1e3a8a" stroke-width="2"/><line x1="220" y1="122" x2="228" y2="138" stroke="#1e3a8a" stroke-width="2"/>' +
      '<text x="22" y="26" font-size="12">Virus structures</text><text x="52" y="146" font-size="10">enveloped virus</text><text x="186" y="26" font-size="10">bacteriophage</text>',
  );
}

export function lymphocytes(): string {
  return wrapBioSvg(
    '<circle cx="56" cy="90" r="24" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/><text x="56" y="94" font-size="11" text-anchor="middle">B</text><circle cx="130" cy="90" r="24" fill="#dcfce7" stroke="#166534" stroke-width="2"/><text x="130" y="94" font-size="11" text-anchor="middle">Th</text><circle cx="204" cy="90" r="24" fill="#fee2e2" stroke="#991b1b" stroke-width="2"/><text x="204" y="94" font-size="11" text-anchor="middle">Tc</text><circle cx="268" cy="90" r="20" fill="#fef3c7" stroke="#a16207" stroke-width="2"/><text x="268" y="94" font-size="11" text-anchor="middle">NK</text>' +
      '<text x="150" y="22" font-size="12" text-anchor="middle">Major lymphocyte classes</text><text x="24" y="130" font-size="10">B: antibodies</text><text x="102" y="146" font-size="10">Helper T: cytokines</text><text x="170" y="162" font-size="10">Cytotoxic T + NK: killing</text>',
  );
}

export function pcrCycle(step: 'denaturation' | 'annealing' | 'extension' = 'denaturation'): string {
  const den = step === 'denaturation';
  const ann = step === 'annealing';
  const ext = step === 'extension';
  return wrapBioSvg(
    '<text x="14" y="22" font-size="12">PCR cycle step</text>' +
      `<text x="14" y="40" font-size="11">${den ? 'Denaturation' : ann ? 'Annealing' : 'Extension'}</text>` +
      `<text x="14" y="56" font-size="10">temperature: ${den ? '95 C' : ann ? '50-65 C' : '72 C'}</text>` +
      (den
        ? '<line x1="70" y1="80" x2="230" y2="52" stroke="#1d4ed8" stroke-width="3"/><line x1="70" y1="100" x2="230" y2="128" stroke="#dc2626" stroke-width="3"/><text x="14" y="74" font-size="10">strands separate</text>'
        : ann
          ? '<line x1="70" y1="84" x2="230" y2="84" stroke="#1d4ed8" stroke-width="3"/><line x1="70" y1="96" x2="230" y2="96" stroke="#dc2626" stroke-width="3"/><rect x="86" y="78" width="20" height="4" fill="#f59e0b"/><rect x="194" y="98" width="20" height="4" fill="#f59e0b"/><text x="14" y="74" font-size="10">primers bind</text>'
          : '<line x1="70" y1="84" x2="230" y2="84" stroke="#1d4ed8" stroke-width="3"/><line x1="70" y1="96" x2="230" y2="96" stroke="#dc2626" stroke-width="3"/><circle cx="110" cy="82" r="7" fill="#15803d"/><circle cx="188" cy="98" r="7" fill="#15803d"/><line x1="117" y1="82" x2="146" y2="82" stroke="#15803d" stroke-width="2"/><line x1="181" y1="98" x2="154" y2="98" stroke="#15803d" stroke-width="2"/><text x="14" y="74" font-size="10">polymerase extends DNA</text>'),
  );
}

export function gelElectrophoresis(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="40" y="24" width="220" height="132" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/><rect x="40" y="24" width="220" height="22" fill="#bae6fd" stroke="#0369a1"/>' +
      '<rect x="59" y="30" width="14" height="8" fill="#0c4a6e"/><rect x="87" y="30" width="14" height="8" fill="#0c4a6e"/><rect x="115" y="30" width="14" height="8" fill="#0c4a6e"/><rect x="143" y="30" width="14" height="8" fill="#0c4a6e"/><rect x="171" y="30" width="14" height="8" fill="#0c4a6e"/>' +
      '<rect x="58" y="60" width="16" height="4" fill="#1d4ed8"/><rect x="58" y="80" width="16" height="4" fill="#1d4ed8"/><rect x="58" y="106" width="16" height="4" fill="#1d4ed8"/><rect x="58" y="128" width="16" height="4" fill="#1d4ed8"/>' +
      '<rect x="86" y="72" width="16" height="4" fill="#1d4ed8"/><rect x="86" y="104" width="16" height="4" fill="#1d4ed8"/><rect x="142" y="64" width="16" height="4" fill="#1d4ed8"/><rect x="142" y="96" width="16" height="4" fill="#1d4ed8"/><rect x="142" y="122" width="16" height="4" fill="#1d4ed8"/>' +
      '<text x="150" y="16" font-size="12" text-anchor="middle">Gel electrophoresis</text><text x="48" y="170" font-size="10">DNA ladder</text><text x="210" y="170" font-size="10">migration to +</text><line x1="232" y1="164" x2="250" y2="150" stroke="#1f2937" marker-end="url(#bio-arr)"/>',
  );
}

export function phylogeneticTree(): string {
  return wrapBioSvg(
    '<line x1="42" y1="150" x2="42" y2="40" stroke="#334155" stroke-width="3"/><line x1="42" y1="120" x2="108" y2="120" stroke="#334155" stroke-width="2"/><line x1="108" y1="120" x2="108" y2="88" stroke="#334155" stroke-width="2"/><line x1="108" y1="120" x2="108" y2="148" stroke="#334155" stroke-width="2"/><line x1="108" y1="88" x2="188" y2="88" stroke="#334155" stroke-width="2"/><line x1="108" y1="148" x2="188" y2="148" stroke="#334155" stroke-width="2"/><line x1="188" y1="88" x2="188" y2="62" stroke="#334155" stroke-width="2"/><line x1="188" y1="88" x2="188" y2="114" stroke="#334155" stroke-width="2"/><line x1="188" y1="62" x2="264" y2="62" stroke="#334155" stroke-width="2"/><line x1="188" y1="114" x2="264" y2="114" stroke="#334155" stroke-width="2"/><line x1="188" y1="148" x2="264" y2="148" stroke="#334155" stroke-width="2"/>' +
      '<text x="14" y="24" font-size="12">Phylogenetic tree</text><text x="270" y="66" font-size="10">Species A</text><text x="270" y="118" font-size="10">Species B</text><text x="270" y="152" font-size="10">Species C</text><text x="120" y="82" font-size="10">common ancestor</text>',
  );
}

export function cloningSteps(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="16" y="26" width="74" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="53" y="42" font-size="9" text-anchor="middle">cut gene + plasmid</text><rect x="108" y="26" width="74" height="24" fill="#dcfce7" stroke="#166534"/><text x="145" y="42" font-size="9" text-anchor="middle">ligation</text><rect x="200" y="26" width="84" height="24" fill="#fef3c7" stroke="#a16207"/><text x="242" y="42" font-size="9" text-anchor="middle">recombinant plasmid</text><rect x="108" y="86" width="82" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="149" y="102" font-size="9" text-anchor="middle">transform bacteria</text><rect x="108" y="144" width="82" height="24" fill="#ede9fe" stroke="#5b21b6"/><text x="149" y="160" font-size="9" text-anchor="middle">screen colonies</text>' +
      '<line x1="90" y1="38" x2="108" y2="38" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="182" y1="38" x2="200" y2="38" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="242" y1="50" x2="170" y2="86" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="149" y1="110" x2="149" y2="144" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="12" y="18" font-size="12">Molecular cloning workflow</text>',
  );
}

export function meiosisOverview(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<circle cx="64" cy="56" r="22" fill="#dbeafe" stroke="#1e3a8a"/><text x="64" y="60" font-size="10" text-anchor="middle">2n</text><circle cx="132" cy="56" r="20" fill="#dcfce7" stroke="#166534"/><text x="132" y="60" font-size="10" text-anchor="middle">MI</text><circle cx="204" cy="46" r="16" fill="#bbf7d0" stroke="#15803d"/><text x="204" y="50" font-size="9" text-anchor="middle">n</text><circle cx="244" cy="46" r="16" fill="#bbf7d0" stroke="#15803d"/><text x="244" y="50" font-size="9" text-anchor="middle">n</text><circle cx="204" cy="112" r="16" fill="#fee2e2" stroke="#991b1b"/><text x="204" y="116" font-size="9" text-anchor="middle">n</text><circle cx="244" cy="112" r="16" fill="#fee2e2" stroke="#991b1b"/><text x="244" y="116" font-size="9" text-anchor="middle">n</text>' +
      '<line x1="86" y1="56" x2="112" y2="56" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="152" y1="52" x2="188" y2="46" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="152" y1="60" x2="188" y2="112" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="204" y1="62" x2="204" y2="96" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="244" y1="62" x2="244" y2="96" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="14" y="20" font-size="12">Meiosis overview</text><text x="104" y="84" font-size="10">homologs separate</text><text x="192" y="84" font-size="10">chromatids separate</text><text x="166" y="164" font-size="10">4 haploid gametes</text>',
  );
}

export function hpaAxis(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="92" y="14" width="116" height="22" fill="#dbeafe" stroke="#1e3a8a"/><text x="150" y="29" font-size="10" text-anchor="middle">Hypothalamus CRH</text><rect x="92" y="68" width="116" height="22" fill="#dcfce7" stroke="#166534"/><text x="150" y="83" font-size="10" text-anchor="middle">Pituitary ACTH</text><rect x="92" y="122" width="116" height="22" fill="#fee2e2" stroke="#991b1b"/><text x="150" y="137" font-size="10" text-anchor="middle">Adrenal cortisol</text><line x1="150" y1="36" x2="150" y2="68" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="150" y1="90" x2="150" y2="122" stroke="#1f2937" marker-end="url(#bio-arr)"/><path d="M208 133 C252 126, 252 34, 208 26" fill="none" stroke="#7c3aed" stroke-width="2" marker-end="url(#bio-arr)"/>' +
      '<text x="16" y="18" font-size="12">HPA axis</text><text x="216" y="78" font-size="10" fill="#7c3aed">negative feedback</text><text x="16" y="96" font-size="10">stress response</text>',
  );
}

export function dicotRoot(): string {
  return wrapBioSvg(
    '<circle cx="150" cy="92" r="62" fill="#fef3c7" stroke="#a16207" stroke-width="2"/><circle cx="150" cy="92" r="48" fill="#fde68a" stroke="#a16207" stroke-width="2"/><circle cx="150" cy="92" r="34" fill="#fef9c3" stroke="#a16207" stroke-width="2"/><circle cx="150" cy="92" r="20" fill="#fff7ed" stroke="#9a3412" stroke-width="2"/>' +
      '<path d="M150 72 L160 92 L150 112 L140 92 Z" fill="#bfdbfe" stroke="#1e3a8a"/><path d="M130 92 L150 84 L170 92 L150 100 Z" fill="#bfdbfe" stroke="#1e3a8a"/><circle cx="150" cy="64" r="6" fill="#fecaca" stroke="#991b1b"/><circle cx="178" cy="92" r="6" fill="#fecaca" stroke="#991b1b"/><circle cx="150" cy="120" r="6" fill="#fecaca" stroke="#991b1b"/><circle cx="122" cy="92" r="6" fill="#fecaca" stroke="#991b1b"/>' +
      '<text x="14" y="18" font-size="12">Dicot root cross section</text><text x="224" y="50" font-size="10">epidermis</text><text x="224" y="70" font-size="10">cortex</text><text x="224" y="90" font-size="10">endodermis</text><text x="224" y="110" font-size="10">phloem</text><text x="224" y="130" font-size="10">xylem</text>',
  );
}

export function biomesLatitude(): string {
  return wrapBioSvg(
    '<circle cx="110" cy="90" r="62" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/><line x1="48" y1="90" x2="172" y2="90" stroke="#334155"/><line x1="56" y1="66" x2="164" y2="66" stroke="#64748b"/><line x1="56" y1="114" x2="164" y2="114" stroke="#64748b"/><line x1="64" y1="44" x2="156" y2="44" stroke="#94a3b8"/><line x1="64" y1="136" x2="156" y2="136" stroke="#94a3b8"/>' +
      '<rect x="180" y="36" width="100" height="18" fill="#bfdbfe" stroke="#1e3a8a"/><text x="230" y="49" font-size="10" text-anchor="middle">polar tundra</text><rect x="180" y="58" width="100" height="18" fill="#bbf7d0" stroke="#15803d"/><text x="230" y="71" font-size="10" text-anchor="middle">temperate forest</text><rect x="180" y="80" width="100" height="18" fill="#fef3c7" stroke="#a16207"/><text x="230" y="93" font-size="10" text-anchor="middle">desert savanna</text><rect x="180" y="102" width="100" height="18" fill="#86efac" stroke="#15803d"/><text x="230" y="115" font-size="10" text-anchor="middle">rainforest</text>' +
      '<text x="14" y="20" font-size="12">Biomes by latitude</text><text x="18" y="46" font-size="10">60 to 90 N</text><text x="18" y="68" font-size="10">30 to 60 N</text><text x="18" y="92" font-size="10">0 to 30</text><text x="18" y="116" font-size="10">30 to 60 S</text>',
  );
}

export function reflexArc(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="16" y="24" width="70" height="24" fill="#fef3c7" stroke="#a16207"/><text x="51" y="40" font-size="10" text-anchor="middle">Receptor</text><rect x="104" y="24" width="74" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="141" y="40" font-size="10" text-anchor="middle">Sensory neuron</text><rect x="198" y="24" width="84" height="24" fill="#dcfce7" stroke="#166534"/><text x="240" y="40" font-size="10" text-anchor="middle">Spinal cord</text><rect x="104" y="92" width="74" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="141" y="108" font-size="10" text-anchor="middle">Motor neuron</text><rect x="16" y="92" width="70" height="24" fill="#fde68a" stroke="#a16207"/><text x="51" y="108" font-size="10" text-anchor="middle">Effector</text>' +
      '<line x1="86" y1="36" x2="104" y2="36" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="178" y1="36" x2="198" y2="36" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="240" y1="48" x2="178" y2="92" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="104" y1="104" x2="86" y2="104" stroke="#1f2937" marker-end="url(#bio-arr)"/>' +
      '<text x="14" y="14" font-size="12">Reflex arc</text><text x="196" y="70" font-size="10">interneuron</text><text x="170" y="132" font-size="10">rapid involuntary response</text>',
  );
}

export function punnettSquare(): string {
  return wrapBioSvg(
    '<rect x="92" y="34" width="120" height="120" fill="#f8fafc" stroke="#334155" stroke-width="2"/><line x1="152" y1="34" x2="152" y2="154" stroke="#334155"/><line x1="92" y1="94" x2="212" y2="94" stroke="#334155"/>' +
      '<text x="122" y="28" font-size="11" text-anchor="middle">A</text><text x="182" y="28" font-size="11" text-anchor="middle">a</text><text x="82" y="68" font-size="11" text-anchor="middle">A</text><text x="82" y="128" font-size="11" text-anchor="middle">a</text>' +
      '<text x="122" y="68" font-size="11" text-anchor="middle">AA</text><text x="182" y="68" font-size="11" text-anchor="middle">Aa</text><text x="122" y="128" font-size="11" text-anchor="middle">Aa</text><text x="182" y="128" font-size="11" text-anchor="middle">aa</text>' +
      '<text x="14" y="20" font-size="12">Punnett square (Aa x Aa)</text><text x="14" y="44" font-size="10">genotype ratio 1:2:1</text><text x="14" y="60" font-size="10">phenotype ratio 3:1</text>',
  );
}

export function oxyhaemoglobinCurve(): string {
  return axesGraph({
    xLabel: 'pO2',
    yLabel: '% saturation',
    curves: [{ d: 'M 40 136 C 84 132, 112 118, 138 96 C 164 70, 196 42, 272 34', stroke: '#b91c1c', label: 'oxyhaemoglobin', labelPos: [174, 32] }],
    annotations:
      '<line x1="120" y1="140" x2="120" y2="96" stroke="#64748b" stroke-dasharray="5 4"/><line x1="40" y1="96" x2="120" y2="96" stroke="#64748b" stroke-dasharray="5 4"/><text x="126" y="94" font-size="10">P50</text><text x="44" y="92" font-size="10">50% sat.</text>',
  });
}

export function summationSketch(): string {
  const graph = axesGraph({
    xLabel: 'time',
    yLabel: 'Vm',
    curves: [{ d: 'M 40 146 C 66 144, 74 122, 96 126 C 116 130, 120 110, 142 112 C 160 114, 172 132, 188 132 C 206 132, 226 132, 272 132', stroke: '#1d4ed8', label: 'summed PSP', labelPos: [194, 114] }],
    annotations:
      '<line x1="40" y1="132" x2="272" y2="132" stroke="#64748b" stroke-dasharray="5 4"/><line x1="40" y1="112" x2="272" y2="112" stroke="#64748b" stroke-dasharray="5 4"/><text x="44" y="108" font-size="9">threshold</text>',
  })
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');
  return wrapBioSvg(
    ARROW_DEF +
      '<text x="14" y="16" font-size="12">Spatial and temporal summation</text><circle cx="62" cy="92" r="20" fill="#fee2e2" stroke="#991b1b"/><line x1="82" y1="92" x2="164" y2="92" stroke="#374151" stroke-width="3"/><rect x="164" y="82" width="56" height="20" fill="#dbeafe" stroke="#1e3a8a"/><text x="192" y="95" font-size="9" text-anchor="middle">axon hillock</text><line x1="20" y1="64" x2="44" y2="80" stroke="#15803d" marker-end="url(#bio-arr)"/><text x="10" y="62" font-size="9" fill="#15803d">EPSP1</text><line x1="20" y1="88" x2="44" y2="90" stroke="#15803d" marker-end="url(#bio-arr)"/><text x="10" y="88" font-size="9" fill="#15803d">EPSP2</text><line x1="20" y1="116" x2="44" y2="102" stroke="#b91c1c" marker-end="url(#bio-arr)"/><text x="10" y="118" font-size="9" fill="#b91c1c">IPSP</text>' +
      graph,
  );
}

// Backward-compatible exports used by existing biology-question-bank modules.
export function prokaryoteCellDiagram(): string {
  return prokaryoticCell();
}

export function eukaryoteCellDiagram(): string {
  return wrapBioSvg(
    '<ellipse cx="150" cy="92" rx="110" ry="62" fill="#f8fafc" stroke="#334155" stroke-width="2"/><circle cx="126" cy="88" r="30" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/><circle cx="126" cy="88" r="11" fill="#93c5fd" stroke="#1d4ed8"/><ellipse cx="190" cy="72" rx="20" ry="12" fill="#fee2e2" stroke="#b91c1c"/><ellipse cx="192" cy="109" rx="22" ry="13" fill="#fee2e2" stroke="#b91c1c"/><rect x="72" y="116" width="44" height="20" rx="8" fill="#fef3c7" stroke="#a16207"/><text x="102" y="140" font-size="10">nucleus</text><text x="176" y="56" font-size="10">mitochondria</text><text x="62" y="154" font-size="10">ER Golgi vesicle</text>',
  );
}

export function endosymbiosisDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="22" y="34" width="74" height="56" rx="22" fill="#cffafe" stroke="#0e7490" stroke-width="2"/><text x="30" y="104" font-size="10">host</text><rect x="112" y="42" width="36" height="32" rx="14" fill="#fde68a" stroke="#a16207" stroke-width="2"/><text x="106" y="88" font-size="10">aerobic bacterium</text><rect x="186" y="34" width="92" height="56" rx="24" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><ellipse cx="220" cy="61" rx="20" ry="12" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/><text x="186" y="106" font-size="10">mitochondrion eukaryote</text><line x1="96" y1="62" x2="112" y2="58" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="148" y1="58" x2="186" y2="58" stroke="#1f2937" marker-end="url(#bio-arr)"/>',
  );
}

export function membraneFluidMosaicDiagram(): string {
  return fluidMosaicMembrane();
}

export function membraneTransportDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<line x1="150" y1="30" x2="150" y2="150" stroke="#334155" stroke-width="4"/><rect x="128" y="54" width="44" height="70" rx="8" fill="#bfdbfe" stroke="#1d4ed8"/><circle cx="90" cy="68" r="5" fill="#16a34a"/><circle cx="86" cy="92" r="5" fill="#16a34a"/><circle cx="210" cy="70" r="5" fill="#dc2626"/><circle cx="214" cy="94" r="5" fill="#dc2626"/><line x1="102" y1="68" x2="128" y2="68" stroke="#15803d" marker-end="url(#bio-arr)"/><line x1="198" y1="94" x2="172" y2="94" stroke="#b91c1c" marker-end="url(#bio-arr)"/><text x="35" y="26" font-size="10">facilitated diffusion</text><text x="176" y="26" font-size="10">active transport ATP</text>',
  );
}

export function rbcOsmosisDiagram(): string {
  return wrapBioSvg(
    '<circle cx="70" cy="86" r="26" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/><circle cx="70" cy="86" r="10" fill="#fca5a5" stroke="#b91c1c"/><text x="34" y="130" font-size="10">0.9% isotonic</text><circle cx="150" cy="86" r="34" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/><text x="126" y="130" font-size="10">0.2% hypotonic</text><path d="M230 56 L240 74 L260 74 L244 88 L250 108 L230 96 L210 108 L216 88 L200 74 L220 74 Z" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/><text x="206" y="130" font-size="10">2% hypertonic</text>',
  );
}

export function enzymeEnergyDiagram(): string {
  return reactionEnergyDiagram();
}

export function michaelisMentenDiagram(): string {
  return michaelisMentenCurve();
}

export function inhibitorComparisonDiagram(): string {
  return axesGraph({
    xLabel: '[S]',
    yLabel: 'v',
    curves: [
      { d: 'M 42 130 C82 84 128 56 182 48 C224 44 250 44 272 44', stroke: '#1d4ed8', label: 'no inhibitor', labelPos: [184, 40] },
      { d: 'M 42 132 C86 98 140 74 196 62 C228 55 250 55 272 55', stroke: '#15803d', label: 'competitive', labelPos: [184, 58] },
      { d: 'M 42 138 C88 102 140 80 196 72 C228 69 250 69 272 69', stroke: '#b91c1c', label: 'noncompetitive', labelPos: [184, 76] },
    ],
  });
}

export function respirationFlowchartDiagram(): string {
  return respirationFlowchart();
}

export function etcChemiosmosisDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="24" y="36" width="252" height="26" fill="#bfdbfe" stroke="#1d4ed8"/><rect x="24" y="120" width="252" height="26" fill="#fde68a" stroke="#a16207"/><rect x="56" y="76" width="26" height="44" fill="#93c5fd" stroke="#1d4ed8"/><rect x="110" y="74" width="26" height="46" fill="#93c5fd" stroke="#1d4ed8"/><rect x="164" y="72" width="26" height="48" fill="#93c5fd" stroke="#1d4ed8"/><rect x="220" y="70" width="30" height="56" fill="#86efac" stroke="#15803d"/><line x1="58" y1="30" x2="58" y2="20" stroke="#ef4444" marker-end="url(#bio-arr)"/><line x1="76" y1="30" x2="76" y2="20" stroke="#ef4444" marker-end="url(#bio-arr)"/><line x1="114" y1="30" x2="114" y2="20" stroke="#ef4444" marker-end="url(#bio-arr)"/><line x1="132" y1="30" x2="132" y2="20" stroke="#ef4444" marker-end="url(#bio-arr)"/><text x="28" y="18" font-size="10">intermembrane space</text><text x="28" y="164" font-size="10">matrix</text><text x="194" y="164" font-size="10">ATP synthase</text>',
  );
}

export function fermentationDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="20" y="66" width="64" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="52" y="82" font-size="10" text-anchor="middle">glucose</text><rect x="108" y="66" width="76" height="24" fill="#dcfce7" stroke="#166534"/><text x="146" y="82" font-size="10" text-anchor="middle">pyruvate</text><rect x="210" y="46" width="74" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="247" y="62" font-size="10" text-anchor="middle">lactate</text><rect x="210" y="102" width="74" height="24" fill="#fef3c7" stroke="#a16207"/><text x="247" y="118" font-size="10" text-anchor="middle">ethanol + CO2</text><line x1="84" y1="78" x2="108" y2="78" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="184" y1="78" x2="210" y2="58" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="184" y1="78" x2="210" y2="114" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="20" y="42" font-size="11">Fermentation pathways</text><text x="18" y="150" font-size="10">NAD+ regenerated in anaerobic conditions</text>',
  );
}

export function chloroplastDiagram(): string {
  return chloroplast();
}

export function photosystemZDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<line x1="30" y1="120" x2="272" y2="120" stroke="#334155" stroke-width="2"/><line x1="30" y1="120" x2="30" y2="24" stroke="#334155" stroke-width="2"/><text x="12" y="24" font-size="10">energy</text><text x="246" y="136" font-size="10">electron transfer</text><circle cx="64" cy="90" r="7" fill="#fde68a" stroke="#a16207"/><circle cx="118" cy="44" r="7" fill="#fde68a" stroke="#a16207"/><circle cx="170" cy="94" r="7" fill="#fde68a" stroke="#a16207"/><circle cx="224" cy="48" r="7" fill="#fde68a" stroke="#a16207"/><line x1="64" y1="90" x2="118" y2="44" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="118" y1="44" x2="170" y2="94" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="170" y1="94" x2="224" y2="48" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="46" y="82" font-size="9">PSII</text><text x="106" y="36" font-size="9">ETC</text><text x="156" y="86" font-size="9">PSI</text><text x="214" y="40" font-size="9">NADPH</text>',
  );
}

export function c3c4camDiagram(): string {
  return wrapBioSvg(
    '<rect x="14" y="28" width="86" height="124" fill="#dcfce7" stroke="#166534"/><text x="57" y="44" font-size="11" text-anchor="middle">C3</text><text x="57" y="64" font-size="9" text-anchor="middle">Rubisco in mesophyll</text><text x="57" y="82" font-size="9" text-anchor="middle">photorespiration high</text>' +
      '<rect x="108" y="28" width="86" height="124" fill="#dbeafe" stroke="#1e3a8a"/><text x="151" y="44" font-size="11" text-anchor="middle">C4</text><text x="151" y="64" font-size="9" text-anchor="middle">PEP + bundle sheath</text><text x="151" y="82" font-size="9" text-anchor="middle">photorespiration low</text>' +
      '<rect x="202" y="28" width="84" height="124" fill="#fef3c7" stroke="#a16207"/><text x="244" y="44" font-size="11" text-anchor="middle">CAM</text><text x="244" y="64" font-size="9" text-anchor="middle">night CO2 uptake</text><text x="244" y="82" font-size="9" text-anchor="middle">day Calvin cycle</text>' +
      '<text x="150" y="18" font-size="12" text-anchor="middle">C3 C4 CAM comparison</text>',
  );
}

export function calvinCycleDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<circle cx="150" cy="92" r="58" fill="none" stroke="#15803d" stroke-width="3"/><path d="M150 34 A58 58 0 0 1 205 98" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/><path d="M205 98 A58 58 0 0 1 95 98" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/><path d="M95 98 A58 58 0 0 1 150 34" fill="none" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="150" y="20" font-size="12" text-anchor="middle">Calvin cycle</text><text x="176" y="62" font-size="10">fixation</text><text x="168" y="132" font-size="10">reduction</text><text x="90" y="132" font-size="10">regeneration</text><text x="218" y="90" font-size="10">ATP NADPH in</text><text x="24" y="90" font-size="10">G3P out</text>',
  );
}

export function cellCycleCircleDiagram(): string {
  return cellCycle();
}

export function checkpointDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="24" y="74" width="52" height="24" fill="#bfdbfe" stroke="#1e3a8a"/><text x="50" y="90" font-size="10" text-anchor="middle">G1</text><rect x="102" y="74" width="52" height="24" fill="#bbf7d0" stroke="#15803d"/><text x="128" y="90" font-size="10" text-anchor="middle">S</text><rect x="180" y="74" width="52" height="24" fill="#fef08a" stroke="#a16207"/><text x="206" y="90" font-size="10" text-anchor="middle">G2</text><rect x="244" y="74" width="42" height="24" fill="#fecaca" stroke="#991b1b"/><text x="265" y="90" font-size="10" text-anchor="middle">M</text>' +
      '<line x1="76" y1="86" x2="102" y2="86" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="154" y1="86" x2="180" y2="86" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="232" y1="86" x2="244" y2="86" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="62" y="64" font-size="9">G1/S checkpoint</text><text x="148" y="64" font-size="9">DNA replication check</text><text x="224" y="64" font-size="9">G2/M checkpoint</text><text x="14" y="20" font-size="12">Cell-cycle checkpoints</text>',
  );
}

export function mitosisStagesDiagram(): string {
  return wrapBioSvg(
    '<rect x="10" y="42" width="66" height="90" fill="#dbeafe" stroke="#1e3a8a"/><text x="43" y="56" font-size="10" text-anchor="middle">prophase</text><circle cx="43" cy="88" r="16" fill="none" stroke="#1e3a8a"/><line x1="34" y1="80" x2="52" y2="96" stroke="#1e3a8a"/>' +
      '<rect x="82" y="42" width="66" height="90" fill="#dcfce7" stroke="#166534"/><text x="115" y="56" font-size="10" text-anchor="middle">metaphase</text><line x1="98" y1="88" x2="132" y2="88" stroke="#166534"/><line x1="115" y1="70" x2="115" y2="106" stroke="#166534"/>' +
      '<rect x="154" y="42" width="66" height="90" fill="#fef3c7" stroke="#a16207"/><text x="187" y="56" font-size="10" text-anchor="middle">anaphase</text><line x1="170" y1="80" x2="162" y2="96" stroke="#a16207"/><line x1="204" y1="80" x2="212" y2="96" stroke="#a16207"/>' +
      '<rect x="226" y="42" width="66" height="90" fill="#fee2e2" stroke="#991b1b"/><text x="259" y="56" font-size="10" text-anchor="middle">telophase</text><circle cx="248" cy="92" r="10" fill="none" stroke="#991b1b"/><circle cx="270" cy="92" r="10" fill="none" stroke="#991b1b"/><text x="14" y="20" font-size="12">Mitosis stages</text>',
  );
}

export function dnaRnaDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<path d="M56 38 C76 56, 76 124, 56 142 M84 38 C64 56, 64 124, 84 142" fill="none" stroke="#1d4ed8" stroke-width="2"/><line x1="60" y1="58" x2="80" y2="58" stroke="#1d4ed8"/><line x1="60" y1="82" x2="80" y2="82" stroke="#1d4ed8"/><line x1="60" y1="106" x2="80" y2="106" stroke="#1d4ed8"/><line x1="60" y1="130" x2="80" y2="130" stroke="#1d4ed8"/><text x="42" y="24" font-size="11">DNA double strand</text>' +
      '<path d="M170 40 C190 56, 190 124, 170 140" fill="none" stroke="#b91c1c" stroke-width="2"/><text x="156" y="24" font-size="11">RNA single strand</text><line x1="104" y1="90" x2="150" y2="90" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="110" y="82" font-size="10">transcription</text>',
  );
}

export function proteinStructureDiagram(): string {
  return proteinStructures();
}

export function replicationForkDiagram(): string {
  return replicationFork();
}

export function telomeraseDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<line x1="36" y1="74" x2="236" y2="74" stroke="#1d4ed8" stroke-width="3"/><line x1="36" y1="94" x2="236" y2="94" stroke="#dc2626" stroke-width="3"/><rect x="232" y="66" width="40" height="36" rx="8" fill="#fde68a" stroke="#a16207"/><text x="252" y="86" font-size="9" text-anchor="middle">telomerase</text><line x1="236" y1="84" x2="272" y2="84" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="186" y="122" font-size="10">adds repetitive telomere DNA</text><text x="14" y="22" font-size="12">Telomerase action</text>',
  );
}

export function centralDogmaDiagram(): string {
  return centralDogma();
}

export function geneticCodeDiagram(): string {
  return wrapBioSvg(
    '<rect x="20" y="26" width="260" height="128" fill="#f8fafc" stroke="#334155"/><line x1="20" y1="58" x2="280" y2="58" stroke="#334155"/><line x1="106" y1="26" x2="106" y2="154" stroke="#334155"/><line x1="192" y1="26" x2="192" y2="154" stroke="#334155"/>' +
      '<text x="63" y="46" font-size="11" text-anchor="middle">codon</text><text x="149" y="46" font-size="11" text-anchor="middle">amino acid</text><text x="236" y="46" font-size="11" text-anchor="middle">note</text>' +
      '<text x="63" y="78" font-size="10" text-anchor="middle">AUG</text><text x="149" y="78" font-size="10" text-anchor="middle">Methionine</text><text x="236" y="78" font-size="10" text-anchor="middle">start</text><text x="63" y="100" font-size="10" text-anchor="middle">UUU</text><text x="149" y="100" font-size="10" text-anchor="middle">Phenylalanine</text><text x="236" y="100" font-size="10" text-anchor="middle">sense</text><text x="63" y="122" font-size="10" text-anchor="middle">UAA</text><text x="149" y="122" font-size="10" text-anchor="middle">stop</text><text x="236" y="122" font-size="10" text-anchor="middle">termination</text>' +
      '<text x="150" y="18" font-size="12" text-anchor="middle">Genetic code examples</text>',
  );
}

export function transcriptionTranslationDiagram(): string {
  return wrapBioSvg(
    ARROW_DEF +
      '<rect x="18" y="66" width="62" height="24" fill="#dbeafe" stroke="#1e3a8a"/><text x="49" y="82" font-size="10" text-anchor="middle">DNA</text><rect x="108" y="66" width="62" height="24" fill="#dcfce7" stroke="#166534"/><text x="139" y="82" font-size="10" text-anchor="middle">mRNA</text><rect x="198" y="66" width="84" height="24" fill="#fee2e2" stroke="#991b1b"/><text x="240" y="82" font-size="10" text-anchor="middle">polypeptide</text><line x1="80" y1="78" x2="108" y2="78" stroke="#1f2937" marker-end="url(#bio-arr)"/><line x1="170" y1="78" x2="198" y2="78" stroke="#1f2937" marker-end="url(#bio-arr)"/><text x="90" y="66" font-size="9">transcription</text><text x="176" y="66" font-size="9">translation</text><text x="14" y="20" font-size="12">Gene expression</text>',
  );
}

export function punnettDihybridDiagram(): string {
  return wrapBioSvg(
    '<text x="14" y="18" font-size="12">Dihybrid Punnett (RrYy x RrYy)</text><rect x="62" y="30" width="176" height="132" fill="#f8fafc" stroke="#334155"/><line x1="106" y1="30" x2="106" y2="162" stroke="#334155"/><line x1="150" y1="30" x2="150" y2="162" stroke="#334155"/><line x1="194" y1="30" x2="194" y2="162" stroke="#334155"/><line x1="62" y1="63" x2="238" y2="63" stroke="#334155"/><line x1="62" y1="96" x2="238" y2="96" stroke="#334155"/><line x1="62" y1="129" x2="238" y2="129" stroke="#334155"/>' +
      '<text x="84" y="26" font-size="9" text-anchor="middle">RY</text><text x="128" y="26" font-size="9" text-anchor="middle">Ry</text><text x="172" y="26" font-size="9" text-anchor="middle">rY</text><text x="216" y="26" font-size="9" text-anchor="middle">ry</text><text x="50" y="50" font-size="9" text-anchor="middle">RY</text><text x="50" y="83" font-size="9" text-anchor="middle">Ry</text><text x="50" y="116" font-size="9" text-anchor="middle">rY</text><text x="50" y="149" font-size="9" text-anchor="middle">ry</text>' +
      '<text x="84" y="50" font-size="8" text-anchor="middle">RRYY</text><text x="128" y="50" font-size="8" text-anchor="middle">RRYy</text><text x="172" y="50" font-size="8" text-anchor="middle">RrYY</text><text x="216" y="50" font-size="8" text-anchor="middle">RrYy</text><text x="14" y="174" font-size="10">classic phenotype ratio 9:3:3:1</text>',
  );
}

export function testCrossDiagram(): string {
  return wrapBioSvg(
    '<text x="14" y="20" font-size="12">Test cross</text><rect x="24" y="52" width="110" height="26" fill="#dbeafe" stroke="#1e3a8a"/><text x="79" y="69" font-size="10" text-anchor="middle">unknown dominant</text><rect x="168" y="52" width="108" height="26" fill="#fee2e2" stroke="#991b1b"/><text x="222" y="69" font-size="10" text-anchor="middle">homozygous recessive</text><line x1="134" y1="65" x2="168" y2="65" stroke="#334155"/><text x="150" y="60" font-size="9" text-anchor="middle">x</text><rect x="62" y="110" width="176" height="42" fill="#f8fafc" stroke="#334155"/><text x="150" y="128" font-size="10" text-anchor="middle">all dominant offspring -> parent likely homozygous</text><text x="150" y="144" font-size="10" text-anchor="middle">1:1 dominant:recessive -> parent heterozygous</text>',
  );
}
