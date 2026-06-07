/**
 * Reusable SVG building blocks for mathematics diagram steps.
 * ViewBox 0 0 300 180 per core-protocol guidance.
 */

const AXES = (opts?: { xLabel?: string; yLabel?: string; origin?: [number, number] }) => {
  const [ox, oy] = opts?.origin ?? [40, 140];
  const xLabel = opts?.xLabel ?? 'x';
  const yLabel = opts?.yLabel ?? 'y';
  return [
    `<line x1="${ox}" y1="${oy}" x2="280" y2="${oy}" stroke="#333" stroke-width="2"/>`,
    `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="20" stroke="#333" stroke-width="2"/>`,
    `<text x="275" y="${oy + 16}" font-size="13">${xLabel}</text>`,
    `<text x="${ox - 18}" y="28" font-size="13">${yLabel}</text>`,
  ].join('');
};

export function wrapMathSvg(inner: string, viewBox = '0 0 300 180'): string {
  return `<svg viewBox="${viewBox}">${inner}</svg>`;
}

/** Standard Cartesian axes with optional curve path and labels. */
export function axesGraph(opts: {
  curves?: { d: string; stroke?: string; label?: string; labelPos?: [number, number] }[];
  points?: { x: number; y: number; label?: string; fill?: string }[];
  annotations?: string;
  xLabel?: string;
  yLabel?: string;
  highlight?: string;
}): string {
  const curves = (opts.curves ?? [])
    .map(
      (c) =>
        `<path d="${c.d}" fill="none" stroke="${c.stroke ?? '#1d4ed8'}" stroke-width="2.5"/>` +
        (c.label && c.labelPos
          ? `<text x="${c.labelPos[0]}" y="${c.labelPos[1]}" font-size="13" fill="${c.stroke ?? '#1d4ed8'}">${c.label}</text>`
          : ''),
    )
    .join('');
  const points = (opts.points ?? [])
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${p.fill ?? '#dc2626'}"/>` +
        (p.label ? `<text x="${p.x + 8}" y="${p.y - 6}" font-size="12">${p.label}</text>` : ''),
    )
    .join('');
  return wrapMathSvg(
    AXES({ xLabel: opts.xLabel, yLabel: opts.yLabel }) +
      curves +
      points +
      (opts.highlight ?? '') +
      (opts.annotations ?? ''),
  );
}

/** Number line with marked points. */
export function numberLine(
  marks: { pos: number; label: string; color?: string }[],
  range: [number, number] = [-1, 1],
): string {
  const [lo, hi] = range;
  const scale = (v: number) => 40 + ((v - lo) / (hi - lo)) * 220;
  const line = `<line x1="30" y1="90" x2="270" y2="90" stroke="#333" stroke-width="2"/>`;
  const ticks = marks
    .map((m) => {
      const x = scale(m.pos);
      return [
        `<line x1="${x}" y1="82" x2="${x}" y2="98" stroke="#333" stroke-width="2"/>`,
        `<text x="${x}" y="72" font-size="13" text-anchor="middle" fill="${m.color ?? '#333'}">${m.label}</text>`,
      ].join('');
    })
    .join('');
  return wrapMathSvg(line + ticks, '0 0 300 120');
}

/** 2D region shading (polar/rectangular). */
export function shadedRegion(paths: string[], labels?: string[]): string {
  const regions = paths.map((p, i) => `<path d="${p}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2" opacity="0.7"/>`).join('');
  const lbls = (labels ?? [])
    .map((l, i) => `<text x="150" y="${30 + i * 18}" font-size="13" text-anchor="middle">${l}</text>`)
    .join('');
  return wrapMathSvg(AXES() + regions + lbls);
}

/** Matrix/table display for linear algebra steps. */
export function matrixDisplay(
  rows: string[][],
  title?: string,
  highlight?: [number, number][],
): string {
  const cellW = 44;
  const cellH = 28;
  const ox = 60;
  const oy = title ? 50 : 30;
  let svg = title ? `<text x="150" y="22" font-size="14" text-anchor="middle">${title}</text>` : '';
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = ox + ci * cellW;
      const y = oy + ri * cellH;
      const isHi = highlight?.some(([r, c]) => r === ri && c === ci);
      svg += `<rect x="${x}" y="${y}" width="${cellW - 4}" height="${cellH - 4}" fill="${isHi ? '#fef3c7' : '#f8fafc'}" stroke="#333"/>`;
      svg += `<text x="${x + (cellW - 4) / 2}" y="${y + 18}" font-size="12" text-anchor="middle">${cell}</text>`;
    });
  });
  const w = ox + (rows[0]?.length ?? 1) * cellW + 20;
  const h = oy + rows.length * cellH + 20;
  return wrapMathSvg(svg, `0 0 ${Math.max(300, w)} ${Math.max(120, h)}`);
}

/** Phase plane / vector field sketch. */
export function phasePlane(
  trajectories: string[],
  equilibrium?: [number, number],
  labels?: string[],
): string {
  const axes = AXES({ xLabel: 'x', yLabel: 'y' });
  const paths = trajectories.map((d) => `<path d="${d}" fill="none" stroke="#1d4ed8" stroke-width="2"/>`).join('');
  const eq =
    equilibrium != null
      ? `<circle cx="${equilibrium[0]}" cy="${equilibrium[1]}" r="5" fill="#dc2626"/><text x="${equilibrium[0] + 10}" y="${equilibrium[1] - 4}" font-size="12">(0,0)</text>`
      : '';
  const lbls = (labels ?? []).map((l, i) => `<text x="200" y="${30 + i * 16}" font-size="12">${l}</text>`).join('');
  return wrapMathSvg(axes + paths + eq + lbls);
}

/** Contour / gradient sketch for multivariable calculus. */
export function contourSketch(
  contours: string[],
  gradient?: { x1: number; y1: number; x2: number; y2: number; label?: string },
): string {
  const axes = AXES({ xLabel: 'x', yLabel: 'y' });
  const cs = contours.map((d) => `<path d="${d}" fill="none" stroke="#64748b" stroke-width="1.5"/>`).join('');
  let grad = '';
  if (gradient) {
    grad = [
      `<defs><marker id="g" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="#dc2626"/></marker></defs>`,
      `<line x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}" stroke="#dc2626" stroke-width="2.5" marker-end="url(#g)"/>`,
      gradient.label ? `<text x="${gradient.x2 + 6}" y="${gradient.y2}" font-size="12" fill="#dc2626">${gradient.label}</text>` : '',
    ].join('');
  }
  return wrapMathSvg(axes + cs + grad);
}
