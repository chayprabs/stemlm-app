/**
 * Reusable SVG building blocks for physics diagram steps.
 * ViewBox 0 0 300 180 per core-protocol guidance.
 */

export function wrapPhysicsSvg(inner: string, viewBox = '0 0 300 180'): string {
  return `<svg viewBox="${viewBox}">${inner}</svg>`;
}

const ARROW_RED =
  '<defs><marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#b91c1c"/></marker></defs>';

const ARROW_BLUE =
  '<defs><marker id="arrb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#1d4ed8"/></marker></defs>';

/** Incline + pulley + two masses (Atwood on ramp). */
export function inclinePulley(opts: {
  thetaDeg?: number;
  labelM1?: string;
  labelM2?: string;
  showFriction?: boolean;
}): string {
  const theta = opts.thetaDeg ?? 30;
  const m1 = opts.labelM1 ?? 'm1';
  const m2 = opts.labelM2 ?? 'm2';
  const incline = `<line x1="30" y1="140" x2="200" y2="60" stroke="#333" stroke-width="3"/>`;
  const pulley = `<circle cx="200" cy="55" r="14" fill="#f8fafc" stroke="#333" stroke-width="2"/>`;
  const block1 = `<rect x="115" y="88" width="36" height="28" fill="#dbeafe" stroke="#333" stroke-width="2" transform="rotate(-${theta} 133 102)"/>`;
  const block2 = `<rect x="218" y="95" width="30" height="30" fill="#fef3c7" stroke="#333" stroke-width="2"/>`;
  const string = `<path d="M 149 78 Q 175 55 200 55 L 218 95" fill="none" stroke="#333" stroke-width="1.5"/>`;
  const labels = [
    `<text x="95" y="125" font-size="12">${m1}</text>`,
    `<text x="222" y="145" font-size="12">${m2}</text>`,
    `<text x="155" y="155" font-size="11">θ=${theta}°</text>`,
    opts.showFriction
      ? `<text x="60" y="100" font-size="11" fill="#dc2626">μk</text>`
      : `<text x="55" y="75" font-size="11">frictionless</text>`,
  ].join('');
  return wrapPhysicsSvg(ARROW_RED + incline + pulley + string + block1 + block2 + labels);
}

/** Free-body diagram on incline block. */
export function fbdInclineBlock(opts: {
  showWeight?: boolean;
  showNormal?: boolean;
  showTension?: boolean;
  showFriction?: boolean;
  showParallel?: boolean;
  title?: string;
}): string {
  const ox = 130;
  const oy = 100;
  const parts = [ARROW_RED];
  if (opts.title) parts.push(`<text x="10" y="18" font-size="12">${opts.title}</text>`);
  parts.push(`<rect x="${ox - 20}" y="${oy - 15}" width="40" height="30" fill="#dbeafe" stroke="#333" stroke-width="2" transform="rotate(-30 ${ox} ${oy})"/>`);
  if (opts.showWeight)
    parts.push(`<line x1="${ox}" y1="${oy}" x2="${ox + 25}" y2="${oy + 43}" stroke="#b91c1c" stroke-width="2" marker-end="url(#arr)"/><text x="${ox + 30}" y="${oy + 48}" font-size="11" fill="#b91c1c">mg</text>`);
  if (opts.showNormal)
    parts.push(`<line x1="${ox}" y1="${oy}" x2="${ox - 22}" y2="${oy - 38}" stroke="#1d4ed8" stroke-width="2"/><text x="${ox - 55}" y="${oy - 40}" font-size="11" fill="#1d4ed8">N</text>`);
  if (opts.showTension)
    parts.push(`<line x1="${ox}" y1="${oy}" x2="${ox + 40}" y2="${oy - 23}" stroke="#16a34a" stroke-width="2"/><text x="${ox + 42}" y="${oy - 25}" font-size="11" fill="#16a34a">T</text>`);
  if (opts.showFriction)
    parts.push(`<line x1="${ox}" y1="${oy}" x2="${ox - 35}" y2="${oy + 20}" stroke="#dc2626" stroke-width="2"/><text x="${ox - 60}" y="${oy + 28}" font-size="11" fill="#dc2626">fk</text>`);
  if (opts.showParallel)
    parts.push(`<line x1="${ox}" y1="${oy}" x2="${ox - 30}" y2="${oy + 17}" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${ox - 55}" y="${oy + 12}" font-size="10" fill="#7c3aed">mg sinθ</text>`);
  return wrapPhysicsSvg(parts.join(''));
}

/** Hanging mass FBD. */
export function fbdHangingMass(opts: { label?: string }): string {
  const label = opts.label ?? 'm2';
  return wrapPhysicsSvg(
    ARROW_RED +
      `<rect x="125" y="55" width="50" height="40" fill="#fef3c7" stroke="#333" stroke-width="2"/>` +
      `<text x="142" y="80" font-size="12">${label}</text>` +
      `<line x1="150" y1="55" x2="150" y2="25" stroke="#16a34a" stroke-width="2" marker-end="url(#arr)"/><text x="158" y="30" font-size="11" fill="#16a34a">T</text>` +
      `<line x1="150" y1="95" x2="150" y2="145" stroke="#b91c1c" stroke-width="2" marker-end="url(#arr)"/><text x="158" y="155" font-size="11" fill="#b91c1c">m2g</text>`,
  );
}

/** Simple axes graph (physics plots). */
export function physicsGraph(opts: {
  curves?: { d: string; stroke?: string; label?: string; labelPos?: [number, number] }[];
  points?: { x: number; y: number; label?: string }[];
  xLabel?: string;
  yLabel?: string;
  annotations?: string;
}): string {
  const axes = [
    '<line x1="40" y1="140" x2="280" y2="140" stroke="#333" stroke-width="2"/>',
    '<line x1="40" y1="140" x2="40" y2="20" stroke="#333" stroke-width="2"/>',
    `<text x="275" y="155" font-size="12">${opts.xLabel ?? 'x'}</text>`,
    `<text x="18" y="28" font-size="12">${opts.yLabel ?? 'y'}</text>`,
  ].join('');
  const curves = (opts.curves ?? [])
    .map(
      (c) =>
        `<path d="${c.d}" fill="none" stroke="${c.stroke ?? '#1d4ed8'}" stroke-width="2.5"/>` +
        (c.label && c.labelPos
          ? `<text x="${c.labelPos[0]}" y="${c.labelPos[1]}" font-size="12" fill="${c.stroke ?? '#1d4ed8'}">${c.label}</text>`
          : ''),
    )
    .join('');
  const points = (opts.points ?? [])
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#dc2626"/>` +
        (p.label ? `<text x="${p.x + 8}" y="${p.y - 6}" font-size="11">${p.label}</text>` : ''),
    )
    .join('');
  return wrapPhysicsSvg(axes + curves + points + (opts.annotations ?? ''));
}

/** Rolling sphere on incline. */
export function rollingSphereIncline(opts: { label?: string; thetaDeg?: number }): string {
  const theta = opts.thetaDeg ?? 30;
  const label = opts.label ?? 'M, R';
  return wrapPhysicsSvg(
    `<line x1="25" y1="145" x2="275" y2="55" stroke="#333" stroke-width="3"/>` +
      `<circle cx="175" cy="82" r="22" fill="#dbeafe" stroke="#333" stroke-width="2"/>` +
      `<text x="158" y="87" font-size="11">${label}</text>` +
      `<text x="80" y="130" font-size="11">θ=${theta}°</text>` +
      `<text x="200" y="130" font-size="11">h</text>` +
      `<line x1="175" y1="104" x2="175" y2="145" stroke="#64748b" stroke-width="1" stroke-dasharray="3 3"/>`,
  );
}

/** Optical axis with lens. */
export function lensSetup(opts: {
  focalCm?: number;
  objectCm?: number;
  imageCm?: number;
}): string {
  const f = opts.focalCm ?? 10;
  const do_ = opts.objectCm ?? 15;
  const di = opts.imageCm ?? 30;
  return wrapPhysicsSvg(
    ARROW_BLUE +
      '<line x1="20" y1="100" x2="280" y2="100" stroke="#333"/>' +
      '<path d="M150,30 C130,70 130,130 150,170 C170,130 170,70 150,30" fill="none" stroke="#333" stroke-width="2"/>' +
      `<line x1="80" y1="100" x2="80" y2="55" stroke="#b91c1c" stroke-width="2.5"/>` +
      `<text x="55" y="48" font-size="11" fill="#b91c1c">do=${do_}cm</text>` +
      `<circle cx="120" cy="100" r="2" fill="#333"/><text x="105" y="118" font-size="10">F</text>` +
      `<circle cx="180" cy="100" r="2" fill="#333"/><text x="185" y="118" font-size="10">F</text>` +
      `<line x1="220" y1="100" x2="220" y2="155" stroke="#7c3aed" stroke-width="2.5"/>` +
      `<text x="195" y="168" font-size="11" fill="#7c3aed">di=${di}cm</text>` +
      `<text x="138" y="22" font-size="11">f=${f}cm</text>`,
    '0 0 300 180',
  );
}

/** Spring-mass oscillator. */
export function springMass(opts: { label?: string; damped?: boolean }): string {
  const label = opts.label ?? 'm';
  const damp = opts.damped
    ? '<rect x="200" y="70" width="40" height="18" fill="#fecaca" stroke="#333"/><text x="206" y="83" font-size="10">dashpot</text>'
    : '';
  return wrapPhysicsSvg(
    '<line x1="40" y1="145" x2="260" y2="145" stroke="#333" stroke-width="2"/>' +
      '<path d="M130,90 L140,90 L145,75 L155,105 L165,75 L175,105 L185,75 L195,90 L205,90" fill="none" stroke="#333" stroke-width="2"/>' +
      `<rect x="205" y="75" width="40" height="35" fill="#dbeafe" stroke="#333" stroke-width="2"/>` +
      `<text x="218" y="98" font-size="12">${label}</text>` +
      damp,
  );
}

/** Wave on string (standing wave sketch). */
export function standingWave(n: number, label?: string): string {
  const nodes = n + 1;
  let path = 'M 30 90';
  for (let i = 0; i <= 20; i++) {
    const x = 30 + (i / 20) * 240;
    const y = 90 - 35 * Math.sin((n * Math.PI * i) / 20);
    path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return wrapPhysicsSvg(
    '<line x1="30" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
      `<path d="${path}" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>` +
      `<text x="120" y="25" font-size="12">${label ?? `n=${n} mode`}</text>` +
      '<text x="30" y="160" font-size="11">x=0</text><text x="245" y="160" font-size="11">x=L</text>',
  );
}

/** Carnot cycle PV diagram sketch. */
export function carnotCycle(): string {
  return wrapPhysicsSvg(
    '<line x1="40" y1="140" x2="280" y2="140" stroke="#333" stroke-width="2"/>' +
      '<line x1="40" y1="140" x2="40" y2="25" stroke="#333" stroke-width="2"/>' +
      '<text x="275" y="155" font-size="12">V</text><text x="18" y="30" font-size="12">P</text>' +
      '<rect x="90" y="50" width="140" height="70" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
      '<text x="130" y="42" font-size="11" fill="#dc2626">Th isotherm</text>' +
      '<text x="130" y="135" font-size="11" fill="#1d4ed8">Tc isotherm</text>' +
      '<text x="100" y="95" font-size="10">1→2→3→4</text>',
  );
}

/** Gaussian surface / field diagram placeholder. */
export function sphericalShell(radiusA: string, radiusB: string): string {
  return wrapPhysicsSvg(
    '<circle cx="150" cy="90" r="70" fill="none" stroke="#333" stroke-width="2"/>' +
      '<circle cx="150" cy="90" r="35" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="4 3"/>' +
      `<text x="218" y="88" font-size="11">r=${radiusB}</text>` +
      `<text x="178" y="88" font-size="11">r=${radiusA}</text>` +
      '<text x="95" y="25" font-size="11">ρ uniform</text>',
  );
}

/** Circuit-style loop for EM induction. */
export function emInductionLoop(): string {
  return wrapPhysicsSvg(
  ARROW_BLUE +
      '<rect x="60" y="60" width="120" height="70" fill="none" stroke="#333" stroke-width="2"/>' +
      '<rect x="200" y="50" width="80" height="90" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2" opacity="0.5"/>' +
      '<text x="210" y="100" font-size="11">B into page</text>' +
      '<line x1="40" y1="95" x2="60" y2="95" stroke="#333" stroke-width="2" marker-end="url(#arrb)"/><text x="10" y="90" font-size="11">v</text>',
  );
}
