/**
 * Reusable SVG building blocks for chemistry diagram steps.
 * ViewBox 0 0 300 180 per core-protocol guidance.
 */

export function wrapChemSvg(inner: string, viewBox = '0 0 300 180'): string {
  return `<svg viewBox="${viewBox}">${inner}</svg>`;
}

const ARROW =
  '<defs><marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#b91c1c"/></marker>' +
  '<marker id="arrb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#1d4ed8"/></marker>' +
  '<marker id="arrg" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#16a34a"/></marker></defs>';

function chemAxes(xLabel = 'x', yLabel = 'y', ox = 40, oy = 140): string {
  return [
    `<line x1="${ox}" y1="${oy}" x2="280" y2="${oy}" stroke="#333" stroke-width="2"/>`,
    `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="20" stroke="#333" stroke-width="2"/>`,
    `<text x="275" y="${oy + 16}" font-size="12">${xLabel}</text>`,
    `<text x="${ox - 18}" y="28" font-size="12">${yLabel}</text>`,
  ].join('');
}

/** Generic chemistry graph with axes and curves. */
export function chemGraph(opts: {
  curves?: { d: string; stroke?: string; label?: string; labelPos?: [number, number] }[];
  points?: { x: number; y: number; label?: string; fill?: string }[];
  xLabel?: string;
  yLabel?: string;
  annotations?: string;
  fill?: string;
}): string {
  const curves = (opts.curves ?? [])
    .map(
      (c) =>
        `<path d="${c.d}" fill="none" stroke="${c.stroke ?? '#1d4ed8'}" stroke-width="2.5"/>` +
        (c.label && c.labelPos
          ? `<text x="${c.labelPos[0]}" y="${c.labelPos[1]}" font-size="11" fill="${c.stroke ?? '#1d4ed8'}">${c.label}</text>`
          : ''),
    )
    .join('');
  const points = (opts.points ?? [])
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${p.fill ?? '#dc2626'}"/>` +
        (p.label ? `<text x="${p.x + 8}" y="${p.y - 6}" font-size="11">${p.label}</text>` : ''),
    )
    .join('');
  return wrapChemSvg(
    ARROW +
      chemAxes(opts.xLabel, opts.yLabel) +
      (opts.fill ?? '') +
      curves +
      points +
      (opts.annotations ?? ''),
  );
}

/** Hydrogen atom energy level diagram n=1..5 with spectral series. */
export function hydrogenEnergyLevels(): string {
  const levels = [
    { n: 5, y: 30, label: 'n=5' },
    { n: 4, y: 50, label: 'n=4' },
    { n: 3, y: 75, label: 'n=3' },
    { n: 2, y: 105, label: 'n=2' },
    { n: 1, y: 150, label: 'n=1' },
  ];
  const lines = levels
    .map((l) => `<line x1="60" y1="${l.y}" x2="240" y2="${l.y}" stroke="#333" stroke-width="2"/><text x="20" y="${l.y + 4}" font-size="11">${l.label}</text>`)
    .join('');
  const lyman =
    '<line x1="200" y1="105" x2="200" y2="150" stroke="#dc2626" stroke-width="2" marker-end="url(#arr)"/><text x="205" y="132" font-size="10" fill="#dc2626">Lyman</text>';
  const balmer =
    '<line x1="170" y1="75" x2="170" y2="105" stroke="#1d4ed8" stroke-width="2" marker-end="url(#arrb)"/><text x="175" y="92" font-size="10" fill="#1d4ed8">Balmer</text>';
  const paschen =
    '<line x1="140" y1="50" x2="140" y2="75" stroke="#16a34a" stroke-width="2" marker-end="url(#arrg)"/><text x="145" y="66" font-size="10" fill="#16a34a">Paschen</text>';
  return wrapChemSvg(
    ARROW +
      lines +
      lyman +
      balmer +
      paschen +
      '<text x="100" y="18" font-size="12" font-weight="bold">H atom energy levels</text>' +
      '<text x="248" y="155" font-size="9">E</text>',
  );
}

/** Radial probability P(r) vs r for 2s and 2p. */
export function radialProbability2s2p(): string {
  return chemGraph({
    xLabel: 'r (a₀)',
    yLabel: 'P(r)',
    curves: [
      {
        d: 'M 50 130 C 80 125 100 90 120 70 C 140 55 160 60 180 75 C 200 90 220 110 250 125',
        stroke: '#1d4ed8',
        label: '2s',
        labelPos: [220, 115],
      },
      {
        d: 'M 50 135 C 70 130 85 100 100 75 C 115 55 140 50 170 70 C 200 90 230 120 260 130',
        stroke: '#dc2626',
        label: '2p',
        labelPos: [230, 105],
      },
    ],
    points: [
      { x: 120, y: 70, label: '2s max', fill: '#1d4ed8' },
      { x: 100, y: 75, label: '2p max', fill: '#dc2626' },
    ],
    annotations:
      '<text x="55" y="128" font-size="9" fill="#1d4ed8">radial node</text>' +
      '<line x1="55" y1="130" x2="65" y2="128" stroke="#1d4ed8" stroke-width="1"/>',
  });
}

/** 2s and three 2p orbital boundary surfaces (schematic). */
export function orbitals2s2p(): string {
  return wrapChemSvg(
    '<text x="10" y="16" font-size="11" font-weight="bold">2s and 2p boundary surfaces</text>' +
      '<circle cx="45" cy="90" r="28" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5" opacity="0.7"/>' +
      '<text x="28" y="130" font-size="10">2s</text>' +
      '<ellipse cx="120" cy="90" rx="35" ry="12" fill="#fecaca" stroke="#dc2626" stroke-width="1.5" opacity="0.7"/>' +
      '<text x="100" y="130" font-size="10">2px</text>' +
      '<ellipse cx="195" cy="90" rx="12" ry="35" fill="#bbf7d0" stroke="#16a34a" stroke-width="1.5" opacity="0.7"/>' +
      '<text x="178" y="130" font-size="10">2py</text>' +
      '<ellipse cx="260" cy="90" rx="12" ry="35" fill="#e9d5ff" stroke="#7c3aed" stroke-width="1.5" opacity="0.7" transform="rotate(90 260 90)"/>' +
      '<text x="243" y="130" font-size="10">2pz</text>' +
      '<line x1="120" y1="50" x2="120" y2="130" stroke="#64748b" stroke-width="1" stroke-dasharray="3 2"/>' +
      '<text x="108" y="48" font-size="8" fill="#64748b">nodal plane</text>',
  );
}

/** Five 3d orbital boundary surfaces. */
export function orbitals3d(): string {
  return wrapChemSvg(
    '<text x="10" y="14" font-size="11" font-weight="bold">3d orbitals</text>' +
      '<ellipse cx="40" cy="55" rx="18" ry="8" fill="#dbeafe" stroke="#1d4ed8" opacity="0.8"/>' +
      '<ellipse cx="40" cy="55" rx="8" ry="18" fill="#dbeafe" stroke="#1d4ed8" opacity="0.8"/>' +
      '<text x="22" y="80" font-size="9">dxy</text>' +
      '<ellipse cx="105" cy="55" rx="18" ry="8" fill="#fecaca" stroke="#dc2626" opacity="0.8" transform="rotate(45 105 55)"/>' +
      '<ellipse cx="105" cy="55" rx="8" ry="18" fill="#fecaca" stroke="#dc2626" opacity="0.8" transform="rotate(45 105 55)"/>' +
      '<text x="88" y="80" font-size="9">dxz</text>' +
      '<ellipse cx="170" cy="55" rx="18" ry="8" fill="#bbf7d0" stroke="#16a34a" opacity="0.8"/>' +
      '<ellipse cx="170" cy="55" rx="8" ry="18" fill="#bbf7d0" stroke="#16a34a" opacity="0.8"/>' +
      '<text x="153" y="80" font-size="9">dyz</text>' +
      '<ellipse cx="235" cy="55" rx="20" ry="6" fill="#e9d5ff" stroke="#7c3aed" opacity="0.8"/>' +
      '<ellipse cx="235" cy="55" rx="6" ry="20" fill="#e9d5ff" stroke="#7c3aed" opacity="0.8"/>' +
      '<text x="215" y="80" font-size="9">dx²-y²</text>' +
      '<ellipse cx="150" cy="130" rx="22" ry="10" fill="#fef3c7" stroke="#d97706" opacity="0.8"/>' +
      '<ellipse cx="150" cy="130" rx="10" ry="22" fill="#fef3c7" stroke="#d97706" opacity="0.8"/>' +
      '<circle cx="150" cy="130" r="6" fill="#fff" stroke="#d97706"/>' +
      '<text x="125" y="165" font-size="9">dz² (unique: torus + axial lobe)</text>',
  );
}

/** Penetration and shielding: 3s vs 3p in multi-electron atom. */
export function penetrationShielding(): string {
  return wrapChemSvg(
    ARROW +
      '<text x="10" y="16" font-size="11" font-weight="bold">Penetration &amp; shielding (3s vs 3p)</text>' +
      '<circle cx="150" cy="95" r="18" fill="#fef3c7" stroke="#333" stroke-width="2"/>' +
      '<text x="142" y="99" font-size="10">nucleus</text>' +
      '<ellipse cx="150" cy="95" rx="55" ry="40" fill="none" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      '<text x="210" y="70" font-size="10" fill="#1d4ed8">3s (penetrates)</text>' +
      '<ellipse cx="150" cy="95" rx="75" ry="55" fill="none" stroke="#dc2626" stroke-width="1.5"/>' +
      '<text x="230" y="120" font-size="10" fill="#dc2626">3p (more shielded)</text>' +
      '<text x="30" y="160" font-size="10">3s lower E → held more tightly</text>',
  );
}

/** MO energy diagram for diatomic species. */
export function moEnergyDiagram(opts: {
  species: string;
  bondOrder: number;
  paramagnetic?: boolean;
  n2Ordering?: boolean;
}): string {
  const { species, bondOrder, paramagnetic, n2Ordering } = opts;
  const sigma2pY = n2Ordering ? 75 : 95;
  const pi2pY = n2Ordering ? 95 : 75;
  const fills = paramagnetic
    ? '<circle cx="115" cy="115" r="3" fill="#333"/><circle cx="185" cy="115" r="3" fill="#333"/>'
    : '';
  return wrapChemSvg(
    '<text x="120" y="18" font-size="12" font-weight="bold">' +
      species +
      ' MO diagram</text>' +
      '<line x1="80" y1="40" x2="80" y2="160" stroke="#333"/>' +
      '<line x1="220" y1="40" x2="220" y2="160" stroke="#333"/>' +
      '<text x="55" y="35" font-size="9">AO</text><text x="235" y="35" font-size="9">AO</text>' +
      '<line x1="70" y1="145" x2="90" y2="145" stroke="#333" stroke-width="2"/><line x1="210" y1="145" x2="230" y2="145" stroke="#333" stroke-width="2"/>' +
      '<text x="100" y="149" font-size="8">σ2s</text>' +
      '<line x1="70" y1="130" x2="90" y2="130" stroke="#dc2626" stroke-width="2"/><line x1="210" y1="130" x2="230" y2="130" stroke="#dc2626" stroke-width="2"/>' +
      '<text x="95" y="134" font-size="8" fill="#dc2626">σ*2s</text>' +
      `<line x1="70" y1="${sigma2pY}" x2="90" y2="${sigma2pY}" stroke="#333" stroke-width="2"/><line x1="210" y1="${sigma2pY}" x2="230" y2="${sigma2pY}" stroke="#333" stroke-width="2"/>` +
      `<text x="100" y="${sigma2pY + 4}" font-size="8">σ2p</text>` +
      `<line x1="105" y1="${pi2pY}" x2="115" y2="${pi2pY}" stroke="#1d4ed8" stroke-width="2"/><line x1="185" y1="${pi2pY}" x2="195" y2="${pi2pY}" stroke="#1d4ed8" stroke-width="2"/>` +
      `<text x="145" y="${pi2pY + 4}" font-size="8" fill="#1d4ed8">π2p</text>` +
      fills +
      `<text x="130" y="172" font-size="10">BO=${bondOrder}, ${paramagnetic ? 'paramagnetic' : 'diamagnetic'}</text>`,
  );
}

/** P-V diagram with thermodynamic processes. */
export function pvDiagram(): string {
  return chemGraph({
    xLabel: 'V',
    yLabel: 'P',
    curves: [
      { d: 'M 60 120 C 120 115 180 100 250 95', stroke: '#1d4ed8', label: 'isothermal', labelPos: [200, 88] },
      { d: 'M 60 120 C 120 90 180 60 250 45', stroke: '#dc2626', label: 'adiabatic', labelPos: [200, 40] },
      { d: 'M 60 80 L 250 80', stroke: '#16a34a', label: 'isobaric', labelPos: [180, 72] },
      { d: 'M 80 120 L 80 50', stroke: '#7c3aed', label: 'isochoric', labelPos: [55, 85] },
    ],
    annotations: '<text x="100" y="30" font-size="11">W = area under curve</text>',
  });
}

/** Born-Haber cycle for MgCl2. */
export function bornHaberCycle(): string {
  return wrapChemSvg(
    ARROW +
      '<text x="70" y="18" font-size="11" font-weight="bold">Born-Haber cycle: MgCl₂</text>' +
      '<text x="30" y="50" font-size="10">Mg(s)</text>' +
      '<text x="30" y="80" font-size="10">Mg(g)</text>' +
      '<text x="30" y="110" font-size="10">Mg⁺(g)</text>' +
      '<text x="30" y="140" font-size="10">Mg²⁺(g)</text>' +
      '<text x="200" y="50" font-size="10">½Cl₂(g)</text>' +
      '<text x="200" y="110" font-size="10">Cl⁻(g)</text>' +
      '<text x="130" y="165" font-size="10">MgCl₂(s)</text>' +
      '<line x1="70" y1="48" x2="170" y2="48" stroke="#333" marker-end="url(#arr)"/><text x="100" y="42" font-size="8">ΔH_sub</text>' +
      '<line x1="50" y1="55" x2="50" y2="75" stroke="#333" marker-end="url(#arr)"/><text x="8" y="68" font-size="8">IE₁</text>' +
      '<line x1="50" y1="85" x2="50" y2="105" stroke="#333" marker-end="url(#arr)"/><text x="8" y="98" font-size="8">IE₂</text>' +
      '<line x1="220" y1="55" x2="220" y2="105" stroke="#333" marker-end="url(#arr)"/><text x="228" y="82" font-size="8">EA×2</text>' +
      '<line x1="60" y1="140" x2="190" y2="110" stroke="#dc2626" marker-end="url(#arr)"/><text x="100" y="130" font-size="8" fill="#dc2626">U_lattice</text>',
  );
}

/** Gibbs energy vs reaction coordinate (four cases). */
export function gibbsEnergyCurves(): string {
  return chemGraph({
    xLabel: 'ξ',
    yLabel: 'G',
    curves: [
      { d: 'M 50 100 Q 150 60 250 100', stroke: '#16a34a', label: 'ΔH&lt;0, ΔS&gt;0', labelPos: [130, 55] },
      { d: 'M 50 60 Q 150 100 250 60', stroke: '#dc2626', label: 'ΔH&gt;0, ΔS&lt;0', labelPos: [130, 105] },
      { d: 'M 50 90 Q 150 70 250 55', stroke: '#1d4ed8', label: 'ΔH&gt;0, ΔS&gt;0 (high T)', labelPos: [200, 48] },
      { d: 'M 50 55 Q 150 75 250 90', stroke: '#7c3aed', label: 'ΔH&lt;0, ΔS&lt;0 (low T)', labelPos: [200, 95] },
    ],
  });
}

/** T-S diagram for Carnot cycle. */
export function tsDiagram(): string {
  return wrapChemSvg(
    chemAxes('S', 'T') +
      '<rect x="90" y="50" width="130" height="70" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2" opacity="0.4"/>' +
      '<path d="M 90 50 L 220 50 L 220 120 L 90 120 Z" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="130" y="42" font-size="10">Th (isothermal exp)</text>' +
      '<text x="130" y="135" font-size="10">Tc (isothermal comp)</text>' +
      '<text x="100" y="88" font-size="10">1→2→3→4</text>' +
      '<text x="180" y="88" font-size="9" fill="#16a34a">W_net = shaded area</text>',
  );
}

/** Water phase diagram with CO2 overlay. */
export function phaseDiagramWaterCo2(): string {
  return chemGraph({
    xLabel: 'T (°C)',
    yLabel: 'P (atm)',
    curves: [
      { d: 'M 50 130 L 120 100 L 180 60 L 250 40', stroke: '#1d4ed8', label: 'H₂O liq-gas', labelPos: [200, 50] },
      { d: 'M 50 120 L 100 115 L 140 100', stroke: '#1d4ed8', label: 'solid-liq (neg slope)', labelPos: [80, 108] },
      { d: 'M 80 130 L 60 50', stroke: '#dc2626', label: 'CO₂ sublimation', labelPos: [35, 90] },
    ],
    points: [
      { x: 120, y: 100, label: 'triple H₂O', fill: '#1d4ed8' },
      { x: 180, y: 60, label: 'critical', fill: '#1d4ed8' },
      { x: 80, y: 130, label: 'CO₂ triple', fill: '#dc2626' },
    ],
    annotations:
      '<text x="200" y="130" font-size="9">CO₂: no liquid at 1 atm</text>',
  });
}

/** Maxwell-Boltzmann speed distribution at three temperatures. */
export function maxwellBoltzmann(): string {
  return chemGraph({
    xLabel: 'u',
    yLabel: 'f(u)',
    curves: [
      { d: 'M 40 130 Q 100 120 140 80 Q 160 50 200 30', stroke: '#1d4ed8', label: 'T₁', labelPos: [190, 28] },
      { d: 'M 40 130 Q 110 115 160 70 Q 190 40 230 25', stroke: '#16a34a', label: 'T₂', labelPos: [220, 22] },
      { d: 'M 40 130 Q 120 110 180 55 Q 220 30 260 20', stroke: '#dc2626', label: 'T₃', labelPos: [250, 18] },
    ],
    annotations:
      '<text x="130" y="165" font-size="9">u_mp &lt; ū &lt; u_rms; all shift right with T</text>',
  });
}

/** Compressibility factor Z vs P. */
export function compressibilityFactor(): string {
  return chemGraph({
    xLabel: 'P',
    yLabel: 'Z = PV/nRT',
    curves: [
      { d: 'M 50 90 L 250 90', stroke: '#333', label: 'ideal', labelPos: [220, 85] },
      { d: 'M 50 90 C 80 75 100 70 120 72 C 150 78 200 90 250 100', stroke: '#1d4ed8', label: 'attraction', labelPos: [100, 65] },
      { d: 'M 50 90 C 100 95 150 105 200 120 L 250 135', stroke: '#dc2626', label: 'repulsion', labelPos: [210, 125] },
    ],
  });
}

/** Periodic table trend arrows schematic. */
export function periodicTrends(): string {
  return wrapChemSvg(
    '<rect x="20" y="25" width="260" height="130" fill="#f8fafc" stroke="#333" stroke-width="1.5"/>' +
      '<text x="100" y="20" font-size="11" font-weight="bold">Periodic trends</text>' +
      '<text x="30" y="50" font-size="9">s</text><rect x="45" y="38" width="40" height="20" fill="#dbeafe" stroke="#333"/>' +
      '<text x="95" y="50" font-size="9">p</text><rect x="110" y="38" width="80" height="20" fill="#bbf7d0" stroke="#333"/>' +
      '<text x="200" y="50" font-size="9">d</text><rect x="215" y="38" width="55" height="20" fill="#fecaca" stroke="#333"/>' +
      '<text x="30" y="80" font-size="9">f</text><rect x="45" y="68" width="225" height="12" fill="#e9d5ff" stroke="#333"/>' +
      '<text x="50" y="110" font-size="9">→ period: radius↓ IE↑ EN↑</text>' +
      '<text x="50" y="130" font-size="9">↓ group: radius↑ IE↓ EN↓</text>' +
      '<text x="50" y="150" font-size="9">cations smaller; anions larger</text>',
  );
}

/** Ionization energy bar chart for Na, Mg, Al. */
export function ionizationEnergyBars(): string {
  const bars = [
    { x: 50, scaled: [0.35, 0.55, 0.78, 0.82, 0.85, 0.88], label: 'Na' },
    { x: 130, scaled: [0.32, 0.52, 0.82, 0.87, 0.89, 0.91], label: 'Mg' },
    { x: 210, scaled: [0.30, 0.50, 0.75, 0.80, 0.83, 0.85], label: 'Al' },
  ];
  const maxH = 90;
  const baseY = 140;
  const colors = ['#1d4ed8', '#16a34a', '#dc2626', '#7c3aed', '#d97706', '#64748b'];
  const barSvg = bars
    .flatMap((b) =>
      b.scaled.map((s, i) => {
        const h = s * maxH;
        return `<rect x="${b.x + i * 12}" y="${baseY - h}" width="10" height="${h}" fill="${colors[i]}" stroke="#333"/>`;
      }),
    )
    .join('');
  return wrapChemSvg(
    chemAxes('IE', 'Energy') +
      barSvg +
      '<text x="65" y="155" font-size="10">Na</text>' +
      '<text x="145" y="155" font-size="10">Mg</text>' +
      '<text x="225" y="155" font-size="10">Al</text>' +
      '<text x="70" y="22" font-size="10">Sudden jumps at core electrons</text>',
  );
}

/** Crystal structure unit cell (generic cubic). */
export function crystalUnitCell(opts: {
  type: 'nacl' | 'cscl' | 'zns' | 'fluorite';
  label: string;
}): string {
  const { type, label } = opts;
  let atoms = '';
  if (type === 'nacl') {
    atoms =
      '<circle cx="80" cy="80" r="8" fill="#1d4ed8"/><circle cx="120" cy="120" r="8" fill="#dc2626"/>' +
      '<circle cx="80" cy="120" r="6" fill="#1d4ed8" opacity="0.5"/><circle cx="120" cy="80" r="6" fill="#dc2626" opacity="0.5"/>';
  } else if (type === 'cscl') {
    atoms = '<circle cx="100" cy="100" r="12" fill="#dc2626"/><circle cx="60" cy="60" r="8" fill="#1d4ed8"/>';
  } else if (type === 'zns') {
    atoms =
      '<circle cx="70" cy="70" r="7" fill="#1d4ed8"/><circle cx="130" cy="130" r="7" fill="#1d4ed8"/>' +
      '<circle cx="100" cy="100" r="5" fill="#dc2626"/>';
  } else {
    atoms =
      '<circle cx="100" cy="100" r="10" fill="#1d4ed8"/><circle cx="70" cy="70" r="6" fill="#dc2626"/>' +
      '<circle cx="130" cy="70" r="6" fill="#dc2626"/><circle cx="70" cy="130" r="6" fill="#dc2626"/><circle cx="130" cy="130" r="6" fill="#dc2626"/>';
  }
  return wrapChemSvg(
    '<line x1="50" y1="50" x2="150" y2="50" stroke="#333"/><line x1="50" y1="50" x2="50" y2="150" stroke="#333"/>' +
      '<line x1="150" y1="50" x2="150" y2="150" stroke="#333"/><line x1="50" y1="150" x2="150" y2="150" stroke="#333"/>' +
      '<line x1="50" y1="50" x2="70" y2="35" stroke="#333"/><line x1="150" y1="50" x2="170" y2="35" stroke="#333"/>' +
      '<line x1="150" y1="150" x2="170" y2="135" stroke="#333"/><line x1="50" y1="150" x2="70" y2="135" stroke="#333"/>' +
      '<line x1="70" y1="35" x2="170" y2="35" stroke="#333"/><line x1="170" y1="35" x2="170" y2="135" stroke="#333"/>' +
      atoms +
      `<text x="180" y="100" font-size="10">${label}</text>`,
    '0 0 300 180',
  );
}

/** VSEPR molecular geometry (wedge-dash schematic). */
export function vseprMolecule(opts: {
  name: string;
  geometry: string;
  angle?: string;
  hybrid?: string;
  lonePairs?: number;
}): string {
  const { name, geometry, angle, hybrid, lonePairs } = opts;
  const lp = lonePairs
    ? `<text x="200" y="100" font-size="10" fill="#dc2626">${lonePairs} LP</text>`
    : '';
  return wrapChemSvg(
    '<circle cx="150" cy="90" r="12" fill="#fef3c7" stroke="#333" stroke-width="2"/>' +
      '<line x1="150" y1="78" x2="150" y2="40" stroke="#333" stroke-width="2"/>' +
      '<line x1="138" y1="90" x2="100" y2="90" stroke="#333" stroke-width="2"/>' +
      '<line x1="162" y1="90" x2="200" y2="90" stroke="#333" stroke-width="2"/>' +
      '<line x1="150" y1="102" x2="150" y2="140" stroke="#333" stroke-width="2" stroke-dasharray="4 3"/>' +
      `<text x="10" y="20" font-size="11" font-weight="bold">${name}</text>` +
      `<text x="10" y="38" font-size="10">${geometry}</text>` +
      (angle ? `<text x="10" y="55" font-size="10">∠=${angle}</text>` : '') +
      (hybrid ? `<text x="10" y="72" font-size="10">${hybrid}</text>` : '') +
      lp,
  );
}

/** Daniell cell diagram. */
export function daniellCell(): string {
  return wrapChemSvg(
    ARROW +
      '<rect x="30" y="40" width="100" height="120" fill="#dbeafe" stroke="#333" stroke-width="2" opacity="0.5"/>' +
      '<rect x="170" y="40" width="100" height="120" fill="#fef3c7" stroke="#333" stroke-width="2" opacity="0.5"/>' +
      '<text x="50" y="60" font-size="10">Zn | Zn²⁺</text>' +
      '<text x="185" y="60" font-size="10">Cu²⁺ | Cu</text>' +
      '<line x1="80" y1="70" x2="80" y2="130" stroke="#333" stroke-width="3"/><text x="60" y="145" font-size="9">Zn anode</text>' +
      '<line x1="220" y1="70" x2="220" y2="130" stroke="#b45309" stroke-width="3"/><text x="200" y="145" font-size="9">Cu cathode</text>' +
      '<rect x="130" y="80" width="40" height="60" fill="#f1f5f9" stroke="#333"/><text x="133" y="115" font-size="8">salt bridge</text>' +
      '<path d="M 80 30 L 220 30" fill="none" stroke="#dc2626" stroke-width="2" marker-end="url(#arr)"/><text x="130" y="25" font-size="9" fill="#dc2626">e⁻ flow</text>',
  );
}

/** Cyclic voltammogram sketch. */
export function cyclicVoltammogram(): string {
  return chemGraph({
    xLabel: 'E (V)',
    yLabel: 'i (A)',
    curves: [
      {
        d: 'M 60 90 C 100 90 120 40 150 50 C 180 60 200 90 240 90',
        stroke: '#1d4ed8',
        label: 'reversible',
        labelPos: [100, 35],
      },
      {
        d: 'M 60 90 C 100 90 130 50 170 55 C 210 60 240 90 260 90',
        stroke: '#dc2626',
        label: 'irreversible',
        labelPos: [200, 45],
      },
    ],
    annotations:
      '<text x="140" y="75" font-size="8">ΔEp≈59/n mV</text>' +
      '<text x="120" y="110" font-size="8">E₁/₂=(Epa+Epc)/2</text>',
  });
}

/** Jablonski diagram. */
export function jablonskiDiagram(): string {
  return wrapChemSvg(
    '<line x1="80" y1="150" x2="80" y2="30" stroke="#333" stroke-width="3"/><text x="60" y="25" font-size="10">S₀</text>' +
      '<line x1="150" y1="130" x2="150" y2="20" stroke="#1d4ed8" stroke-width="2"/><text x="135" y="15" font-size="10" fill="#1d4ed8">S₁</text>' +
      '<line x1="220" y1="110" x2="220" y2="10" stroke="#7c3aed" stroke-width="2"/><text x="205" y="8" font-size="10" fill="#7c3aed">S₂</text>' +
      '<line x1="190" y1="100" x2="190" y2="50" stroke="#dc2626" stroke-width="2"/><text x="195" y="75" font-size="9" fill="#dc2626">T₁</text>' +
      '<line x1="70" y1="30" x2="145" y2="25" stroke="#16a34a" stroke-width="1.5" marker-end="url(#arrg)"/><text x="95" y="18" font-size="8">absorb</text>' +
      '<line x1="145" y1="40" x2="75" y2="50" stroke="#d97706" stroke-width="1.5" marker-end="url(#arr)"/><text x="100" y="48" font-size="8">fluor (~ns)</text>' +
      '<line x1="185" y1="60" x2="145" y2="70" stroke="#64748b" stroke-width="1" stroke-dasharray="3 2"/><text x="155" y="62" font-size="7">IC</text>',
  );
}

/** Electrochemical series ladder. */
export function electrochemicalSeries(): string {
  const entries = [
    { y: 30, e: 'Au³⁺/Au', val: '+1.50' },
    { y: 50, e: 'Ag⁺/Ag', val: '+0.80' },
    { y: 70, e: 'Cu²⁺/Cu', val: '+0.34' },
    { y: 90, e: 'H⁺/H₂', val: '0.00' },
    { y: 110, e: 'Fe²⁺/Fe', val: '-0.44' },
    { y: 130, e: 'Zn²⁺/Zn', val: '-0.76' },
    { y: 150, e: 'Li⁺/Li', val: '-3.04' },
  ];
  const lines = entries
    .map(
      (e) =>
        `<line x1="60" y1="${e.y}" x2="200" y2="${e.y}" stroke="#333"/><text x="65" y="${e.y - 3}" font-size="9">${e.e}</text><text x="210" y="${e.y + 4}" font-size="9">E°=${e.val}</text>`,
    )
    .join('');
  return wrapChemSvg(
    '<text x="80" y="18" font-size="11" font-weight="bold">Electrochemical series</text>' +
      lines +
      '<text x="60" y="172" font-size="9">Li, Zn, Fe displace H⁺ from acid</text>',
  );
}

/** d-orbital splitting (octahedral). */
export function crystalFieldSplitting(opts: {
  metal: string;
  ligand: string;
  strongField?: boolean;
  d5?: boolean;
}): string {
  const { metal, ligand, strongField, d5 } = opts;
  const egY = 55;
  const t2gY = 95;
  const electrons = d5
    ? strongField
      ? '<circle cx="115" cy="95" r="3" fill="#333"/><circle cx="135" cy="95" r="3" fill="#333"/><circle cx="155" cy="95" r="3" fill="#333"/><circle cx="175" cy="95" r="3" fill="#333"/><circle cx="195" cy="95" r="3" fill="#333"/>'
      : '<circle cx="115" cy="55" r="3" fill="#333"/><circle cx="135" cy="55" r="3" fill="#333"/><circle cx="115" cy="95" r="3" fill="#333"/><circle cx="135" cy="95" r="3" fill="#333"/><circle cx="155" cy="95" r="3" fill="#333"/>'
    : '';
  return wrapChemSvg(
    `<text x="70" y="18" font-size="11" font-weight="bold">[${metal}(${ligand})₆] CFT</text>` +
      `<line x1="100" y1="${egY}" x2="220" y2="${egY}" stroke="#dc2626" stroke-width="2"/><text x="225" y="${egY + 4}" font-size="9">eg</text>` +
      `<line x1="100" y1="${t2gY}" x2="220" y2="${t2gY}" stroke="#1d4ed8" stroke-width="2"/><text x="225" y="${t2gY + 4}" font-size="9">t2g</text>` +
      `<line x1="160" y1="${egY}" x2="160" y2="${t2gY}" stroke="#333" stroke-dasharray="4 2"/><text x="165" y="78" font-size="9">Δo</text>` +
      electrons +
      `<text x="80" y="160" font-size="9">${strongField ? 'low-spin' : 'high-spin'}</text>`,
  );
}

/** Arrhenius plot ln k vs 1/T. */
export function arrheniusPlot(): string {
  return chemGraph({
    xLabel: '1/T (K⁻¹)',
    yLabel: 'ln k',
    curves: [
      { d: 'M 50 130 L 250 50', stroke: '#1d4ed8', label: 'slope = -Ea/R', labelPos: [150, 70] },
    ],
    annotations:
      '<text x="55" y="55" font-size="9">intercept = ln A</text>' +
      '<text x="180" y="130" font-size="9">Ea = 75 kJ/mol</text>',
  });
}

/** Michaelis-Menten and Lineweaver-Burk. */
export function michaelisMenten(): string {
  return wrapChemSvg(
    '<line x1="30" y1="140" x2="150" y2="140" stroke="#333"/><line x1="30" y1="140" x2="30" y2="30" stroke="#333"/>' +
      '<path d="M 30 130 C 60 100 100 60 150 45" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="100" y="25" font-size="9">v₀ vs [S]</text>' +
      '<line x1="90" y1="45" x2="150" y2="45" stroke="#dc2626" stroke-dasharray="3 2"/><text x="152" y="48" font-size="8">Vmax</text>' +
      '<line x1="80" y1="140" x2="80" y2="100" stroke="#16a34a" stroke-dasharray="3 2"/><text x="82" y="120" font-size="8">Km</text>' +
      '<line x1="170" y1="140" x2="170" y2="30" stroke="#333"/><line x1="170" y1="140" x2="290" y2="140" stroke="#333"/>' +
      '<line x1="170" y1="80" x2="290" y2="30" stroke="#7c3aed" stroke-width="2"/>' +
      '<line x1="190" y1="100" x2="260" y2="70" stroke="#7c3aed" stroke-width="1" stroke-dasharray="4 2"/>' +
      '<text x="220" y="25" font-size="9">1/v₀ vs 1/[S] (+ inhibitor)</text>',
    '0 0 300 180',
  );
}

/** Newman projection (butane conformations). */
export function newmanProjection(opts: { conformation: string; energy?: string }): string {
  const { conformation, energy } = opts;
  return wrapChemSvg(
    '<circle cx="150" cy="90" r="20" fill="#fef3c7" stroke="#333" stroke-width="2"/>' +
      '<circle cx="150" cy="90" r="5" fill="#333"/>' +
      '<line x1="150" y1="90" x2="150" y2="40" stroke="#333" stroke-width="2"/>' +
      '<line x1="150" y1="90" x2="200" y2="90" stroke="#333" stroke-width="2"/>' +
      '<line x1="150" y1="90" x2="100" y2="90" stroke="#333" stroke-width="2"/>' +
      '<line x1="150" y1="90" x2="150" y2="140" stroke="#333" stroke-width="2"/>' +
      `<text x="10" y="20" font-size="11" font-weight="bold">${conformation}</text>` +
      (energy ? `<text x="10" y="38" font-size="10">E: ${energy}</text>` : '') +
      '<text x="142" y="35" font-size="9">CH₃</text><text x="205" y="94" font-size="9">H</text>',
  );
}

/** Cyclohexane chair conformation. */
export function cyclohexaneChair(): string {
  return wrapChemSvg(
    '<path d="M 60 100 L 100 70 L 140 100 L 180 70 L 220 100 L 180 130 L 140 100 L 100 130 Z" fill="none" stroke="#333" stroke-width="2"/>' +
      '<text x="10" y="20" font-size="11" font-weight="bold">Chair cyclohexane</text>' +
      '<text x="55" y="65" font-size="9" fill="#1d4ed8">axial</text>' +
      '<line x1="100" y1="70" x2="100" y2="50" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="55" y="145" font-size="9" fill="#16a34a">equatorial</text>' +
      '<line x1="100" y1="130" x2="130" y2="145" stroke="#16a34a" stroke-width="2"/>',
  );
}

/** Reaction coordinate / energy profile. */
export function energyProfile(opts: {
  title: string;
  hasIntermediate?: boolean;
  compareSn?: boolean;
}): string {
  const { title, hasIntermediate, compareSn } = opts;
  const paths = compareSn
    ? '<path d="M 40 120 C 90 120 120 80 160 50 L 260 50" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
      '<path d="M 40 120 C 70 115 90 90 130 82 C 155 75 175 100 200 68 L 255 58" fill="none" stroke="#dc2626" stroke-width="2"/>'
    : '<path d="M 40 120 C 80 120 100 60 130 70 C 160 80 180 50 220 50 L 260 50" fill="none" stroke="#1d4ed8" stroke-width="2"/>';
  const intermediate = hasIntermediate
    ? '<circle cx="160" cy="75" r="4" fill="#dc2626"/><text x="165" y="78" font-size="8">carbocation</text>'
    : '';
  return wrapChemSvg(
    paths +
      intermediate +
      `<text x="10" y="18" font-size="11" font-weight="bold">${title}</text>` +
      '<text x="40" y="135" font-size="9">R</text><text x="255" y="45" font-size="9">P</text>' +
      (compareSn
        ? '<text x="100" y="100" font-size="8" fill="#1d4ed8">SN2 (1 step)</text><text x="100" y="112" font-size="8" fill="#dc2626">SN1 (2 step)</text>'
        : ''),
  );
}

/** IR spectrum schematic. */
export function irSpectrum(opts: { title: string; peaks: { x: number; label: string }[] }): string {
  const { title, peaks } = opts;
  const peakLines = peaks
    .map((p) => `<line x1="${p.x}" y1="140" x2="${p.x}" y2="60" stroke="#1d4ed8" stroke-width="2"/><text x="${p.x - 15}" y="55" font-size="8">${p.label}</text>`)
    .join('');
  return wrapChemSvg(
    chemAxes('cm⁻¹', '%T') +
      '<line x1="40" y1="140" x2="280" y2="140" stroke="#333"/>' +
      peakLines +
      `<text x="100" y="18" font-size="10" font-weight="bold">${title}</text>` +
      '<text x="200" y="155" font-size="8">fingerprint</text>',
  );
}

/** UV-Vis absorption curves. */
export function uvVisCurves(): string {
  return chemGraph({
    xLabel: 'λ (nm)',
    yLabel: 'Absorbance',
    curves: [
      { d: 'M 50 120 Q 80 80 110 70 Q 130 65 150 80', stroke: '#1d4ed8', label: 'butadiene', labelPos: [100, 65] },
      { d: 'M 50 120 Q 100 70 140 55 Q 170 45 200 65', stroke: '#16a34a', label: 'hexatriene', labelPos: [150, 42] },
      { d: 'M 50 120 Q 130 50 180 35 Q 220 30 250 50', stroke: '#dc2626', label: 'β-carotene', labelPos: [200, 28] },
    ],
    annotations: '<text x="100" y="18" font-size="10">Bathochromic shift with conjugation</text>',
  });
}

/** Haber process flow diagram. */
export function haberProcessFlow(): string {
  return wrapChemSvg(
    ARROW +
      '<rect x="30" y="60" width="60" height="40" fill="#dbeafe" stroke="#333"/><text x="38" y="85" font-size="8">N₂+H₂</text>' +
      '<line x1="90" y1="80" x2="120" y2="80" stroke="#333" marker-end="url(#arr)"/>' +
      '<rect x="120" y="55" width="70" height="50" fill="#fef3c7" stroke="#333"/><text x="125" y="75" font-size="8">Reactor</text><text x="125" y="88" font-size="7">450°C, 200atm</text>' +
      '<line x1="190" y1="80" x2="220" y2="80" stroke="#333" marker-end="url(#arr)"/>' +
      '<rect x="220" y="60" width="50" height="40" fill="#bbf7d0" stroke="#333"/><text x="228" y="85" font-size="8">NH₃</text>' +
      '<path d="M 155 55 Q 155 30 90 30 L 90 60" fill="none" stroke="#dc2626" stroke-dasharray="4 2" marker-end="url(#arr)"/><text x="100" y="25" font-size="8" fill="#dc2626">recycle</text>',
  );
}

/** Solubility curves. */
export function solubilityCurves(): string {
  return chemGraph({
    xLabel: 'T (°C)',
    yLabel: 'Solubility (g/100g)',
    curves: [
      { d: 'M 50 130 C 100 100 150 60 250 30', stroke: '#1d4ed8', label: 'KNO₃', labelPos: [220, 28] },
      { d: 'M 50 110 L 250 100', stroke: '#16a34a', label: 'NaCl', labelPos: [220, 95] },
      { d: 'M 50 80 C 100 90 150 110 250 125', stroke: '#dc2626', label: 'Ce₂(SO₄)₃', labelPos: [200, 120] },
    ],
    annotations: '<text x="100" y="18" font-size="10">Retrograde solubility (Ce salt)</text>',
  });
}

/** Frost diagram for manganese. */
export function frostDiagram(): string {
  return chemGraph({
    xLabel: 'Oxidation state',
    yLabel: 'nE° (V)',
    curves: [
      { d: 'M 50 100 L 80 80 L 110 90 L 140 70 L 170 85 L 200 95 L 230 110', stroke: '#1d4ed8', label: 'Mn species', labelPos: [180, 65] },
    ],
    points: [
      { x: 80, y: 80, label: 'Mn²⁺ stable', fill: '#16a34a' },
      { x: 140, y: 70, label: 'MnO₄⁻ oxidant', fill: '#dc2626' },
    ],
  });
}

/** Particle in a box wavefunctions. */
export function particleInBox(n: number): string {
  const paths: Record<number, string> = {
    1: 'M 50 90 Q 100 50 150 90 Q 200 130 250 90',
    2: 'M 50 90 C 80 50 120 50 150 90 C 180 130 220 130 250 90',
    3: 'M 50 90 C 70 60 90 60 110 90 C 130 120 150 120 170 90 C 190 60 210 60 230 90 C 250 120 270 120 290 90',
    4: 'M 50 90 C 65 70 80 70 95 90 C 110 110 125 110 140 90 C 155 70 170 70 185 90 C 200 110 215 110 230 90 C 245 70 260 70 275 90',
  };
  return chemGraph({
    xLabel: 'x',
    yLabel: 'ψ',
    curves: [{ d: paths[n] ?? paths[1]!, stroke: '#1d4ed8', label: `n=${n}`, labelPos: [220, 40] }],
    annotations: '<text x="100" y="18" font-size="10">Nodes and max probability marked</text>',
  });
}

/** Langmuir isotherm. */
export function langmuirIsotherm(): string {
  return chemGraph({
    xLabel: 'P',
    yLabel: 'θ',
    curves: [
      { d: 'M 50 130 C 100 90 150 60 250 45', stroke: '#1d4ed8', label: 'Langmuir', labelPos: [200, 40] },
      { d: 'M 50 130 C 120 100 180 70 250 35', stroke: '#dc2626', label: 'BET', labelPos: [200, 30] },
    ],
    annotations: '<text x="80" y="18" font-size="10">θ=KP/(1+KP); monolayer saturation</text>',
  });
}

/** p-n junction band diagram. */
export function pnJunction(): string {
  return wrapChemSvg(
    '<text x="80" y="18" font-size="11" font-weight="bold">Si p-n junction</text>' +
      '<rect x="30" y="40" width="110" height="100" fill="#fecaca" opacity="0.4" stroke="#333"/>' +
      '<rect x="140" y="40" width="110" height="100" fill="#dbeafe" opacity="0.4" stroke="#333"/>' +
      '<text x="60" y="55" font-size="9">p-type</text><text x="170" y="55" font-size="9">n-type</text>' +
      '<line x1="30" y1="80" x2="140" y2="80" stroke="#1d4ed8" stroke-width="2"/><line x1="140" y1="100" x2="250" y2="100" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="50" y="75" font-size="8">VB</text><text x="50" y="105" font-size="8">CB</text>' +
      '<line x1="145" y1="90" x2="145" y2="130" stroke="#dc2626" stroke-width="2" marker-end="url(#arr)"/><text x="150" y="125" font-size="8" fill="#dc2626">E_field</text>',
  );
}

/** DNA base pairing schematic. */
export function dnaBasePairs(): string {
  return wrapChemSvg(
    '<text x="80" y="18" font-size="11" font-weight="bold">Watson-Crick base pairs</text>' +
      '<rect x="60" y="50" width="50" height="30" fill="#dbeafe" stroke="#333"/><text x="68" y="70" font-size="9">A</text>' +
      '<rect x="60" y="100" width="50" height="30" fill="#fef3c7" stroke="#333"/><text x="68" y="120" font-size="9">T</text>' +
      '<line x1="85" y1="80" x2="85" y2="100" stroke="#16a34a" stroke-width="1.5"/><text x="90" y="92" font-size="7">2 H-bonds</text>' +
      '<rect x="170" y="50" width="50" height="30" fill="#bbf7d0" stroke="#333"/><text x="178" y="70" font-size="9">G</text>' +
      '<rect x="170" y="100" width="50" height="30" fill="#fecaca" stroke="#333"/><text x="178" y="120" font-size="9">C</text>' +
      '<line x1="195" y1="80" x2="195" y2="100" stroke="#1d4ed8" stroke-width="1.5"/><text x="200" y="92" font-size="7">3 H-bonds</text>' +
      '<text x="60" y="155" font-size="9">Major groove ↑  Minor groove ↓</text>',
  );
}

/** Grubbs catalyst ROMP cycle (simplified). */
export function grubbsROMP(): string {
  return wrapChemSvg(
    ARROW +
      '<text x="60" y="18" font-size="11" font-weight="bold">Grubbs ROMP cycle</text>' +
      '<circle cx="80" cy="90" r="15" fill="#fef3c7" stroke="#333"/><text x="72" y="94" font-size="8">Ru</text>' +
      '<line x1="80" y1="75" x2="80" y2="50" stroke="#333"/><line x1="95" y1="90" x2="120" y2="90" stroke="#333"/>' +
      '<path d="M 130 90 L 180 90" stroke="#333" marker-end="url(#arr)"/>' +
      '<ellipse cx="200" cy="90" rx="25" ry="12" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="175" y="75" font-size="8">metallacyclobutane</text>' +
      '<text x="100" y="130" font-size="9">[2+2] / retro-[2+2]</text>',
  );
}

/** Vitamin B12 corrin ring (simplified). */
export function cobalaminStructure(): string {
  return wrapChemSvg(
    '<text x="70" y="18" font-size="11" font-weight="bold">Cyanocobalamin (B₁₂)</text>' +
      '<circle cx="150" cy="95" r="45" fill="none" stroke="#7c3aed" stroke-width="3"/>' +
      '<circle cx="120" cy="75" r="4" fill="#1d4ed8"/><circle cx="180" cy="75" r="4" fill="#1d4ed8"/>' +
      '<circle cx="110" cy="110" r="4" fill="#1d4ed8"/><circle cx="190" cy="110" r="4" fill="#1d4ed8"/>' +
      '<text x="105" y="65" font-size="7">N</text><text x="185" y="65" font-size="7">N</text>' +
      '<circle cx="150" cy="95" r="8" fill="#dc2626" stroke="#333"/><text x="142" y="99" font-size="8">Co³⁺</text>' +
      '<line x1="150" y1="140" x2="150" y2="160" stroke="#333"/><text x="130" y="168" font-size="8">DMB (α)</text>' +
      '<line x1="150" y1="50" x2="150" y2="30" stroke="#333"/><text x="135" y="25" font-size="8">CN⁻ (β)</text>' +
      '<text x="30" y="95" font-size="8">corrin (vs porphyrin: reduced)</text>',
  );
}
