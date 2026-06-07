/**
 * Reusable SVG circuit diagram primitives for EE benchmark fixtures.
 */

const ARROW_DEFS = [
  '<defs>',
  '<marker id="arw" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">',
  '<polygon points="0,0 6,2 0,4" fill="#333"/>',
  '</marker>',
  '</defs>',
].join('');

export function wrapSvg(content: string, w = 400, h = 220): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${ARROW_DEFS}${content}</svg>`;
}

export function resistorH(x1: number, y: number, length: number, label: string, id = ''): string {
  const segs = 7;
  const dx = length / segs;
  const amp = 12;
  const pts: string[] = [`${x1},${y}`];
  for (let i = 1; i <= segs; i++) {
    const x = x1 + i * dx;
    const yy = y + (i % 2 === 0 ? amp : -amp);
    pts.push(`${x},${yy}`);
  }
  const lx = x1 + length / 2;
  return [
    `<polyline points="${pts.join(' ')}" fill="none" stroke="#333" stroke-width="2"/>`,
    `<text x="${lx}" y="${y - 16}" font-size="11" text-anchor="middle"${id ? ` id="${id}"` : ''}>${label}</text>`,
  ].join('');
}

export function resistorV(x: number, y1: number, length: number, label: string): string {
  const segs = 7;
  const dy = length / segs;
  const amp = 10;
  const pts: string[] = [`${x},${y1}`];
  for (let i = 1; i <= segs; i++) {
    const y = y1 + i * dy;
    const xx = x + (i % 2 === 0 ? amp : -amp);
    pts.push(`${xx},${y}`);
  }
  const ly = y1 + length / 2;
  return [
    `<polyline points="${pts.join(' ')}" fill="none" stroke="#333" stroke-width="2"/>`,
    `<text x="${x + 18}" y="${ly + 4}" font-size="11">${label}</text>`,
  ].join('');
}

export function vSource(x: number, yTop: number, yBot: number, label: string): string {
  const cy = (yTop + yBot) / 2;
  const r = 16;
  return [
    `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${cy - r}" stroke="#333" stroke-width="2"/>`,
    `<circle cx="${x}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="2"/>`,
    `<text x="${x + r + 16}" y="${cy + 4}" font-size="10" text-anchor="start">${label}</text>`,
    `<text x="${x - r - 8}" y="${cy - 8}" font-size="10" text-anchor="end">+</text>`,
    `<text x="${x - r - 8}" y="${cy + 12}" font-size="10" text-anchor="end">\u2212</text>`,
    `<line x1="${x}" y1="${cy + r}" x2="${x}" y2="${yBot}" stroke="#333" stroke-width="2"/>`,
  ].join('');
}

export function ground(x: number, y: number): string {
  return [
    `<line x1="${x - 12}" y1="${y}" x2="${x + 12}" y2="${y}" stroke="#333" stroke-width="2"/>`,
    `<line x1="${x - 8}" y1="${y + 5}" x2="${x + 8}" y2="${y + 5}" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="${x - 4}" y1="${y + 10}" x2="${x + 4}" y2="${y + 10}" stroke="#333" stroke-width="1"/>`,
    `<text x="${x + 16}" y="${y + 4}" font-size="9" fill="#888">GND</text>`,
  ].join('');
}

export function node(x: number, y: number, label: string, color = '#1565c0'): string {
  return [
    `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`,
    `<text x="${x}" y="${y - 10}" font-size="11" font-weight="bold" text-anchor="middle" fill="${color}">${label}</text>`,
  ].join('');
}

export function wire(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="2"/>`;
}

export function currentArrow(x1: number, y1: number, x2: number, y2: number, label = ''): string {
  const parts = [
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d32f2f" stroke-width="1.5" marker-end="url(#arw)"/>`,
  ];
  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    parts.push(`<text x="${mx}" y="${my - 6}" font-size="9" text-anchor="middle" fill="#d32f2f">${label}</text>`);
  }
  return parts.join('');
}

export function capacitorH(x1: number, y: number, gap: number, label: string): string {
  const mx = (x1 + x1 + gap) / 2;
  return [
    `<line x1="${x1}" y1="${y}" x2="${mx - 4}" y2="${y}" stroke="#333" stroke-width="2"/>`,
    `<line x1="${mx - 4}" y1="${y - 12}" x2="${mx - 4}" y2="${y + 12}" stroke="#333" stroke-width="2"/>`,
    `<line x1="${mx + 4}" y1="${y - 12}" x2="${mx + 4}" y2="${y + 12}" stroke="#333" stroke-width="2"/>`,
    `<line x1="${mx + 4}" y1="${y}" x2="${x1 + gap}" y2="${y}" stroke="#333" stroke-width="2"/>`,
    `<text x="${mx}" y="${y - 18}" font-size="11" text-anchor="middle">${label}</text>`,
  ].join('');
}

export function inductorH(x1: number, y: number, length: number, label: string): string {
  const coils = 4;
  const dx = length / coils;
  const parts: string[] = [`<line x1="${x1}" y1="${y}" x2="${x1 + 4}" y2="${y}" stroke="#333" stroke-width="2"/>`];
  for (let i = 0; i < coils; i++) {
    const cx = x1 + 4 + i * dx + dx / 2;
    parts.push(
      `<path d="M${cx - dx / 2},${y} Q${cx - dx / 4},${y - 10} ${cx},${y} Q${cx + dx / 4},${y + 10} ${cx + dx / 2},${y}" fill="none" stroke="#333" stroke-width="2"/>`,
    );
  }
  parts.push(`<line x1="${x1 + length}" y1="${y}" x2="${x1 + length + 4}" y2="${y}" stroke="#333" stroke-width="2"/>`);
  parts.push(`<text x="${x1 + length / 2}" y="${y - 16}" font-size="11" text-anchor="middle">${label}</text>`);
  return parts.join('');
}

/** Series loop: Vs on left, R1, R2, R3 in series on top, return on bottom */
export function seriesLoopCircuit(
  vs: string,
  resistors: { label: string; vDrop?: string }[],
): string {
  const x0 = 40;
  const yTop = 40;
  const yBot = 180;
  const parts: string[] = [];
  parts.push(vSource(x0, yTop, yBot, vs));
  let x = x0;
  const rW = 60;
  for (let i = 0; i < resistors.length; i++) {
    parts.push(wire(x, yTop, x + 10, yTop));
    x += 10;
    parts.push(resistorH(x, yTop, rW, resistors[i]!.label));
    x += rW;
    if (resistors[i]!.vDrop) {
      parts.push(
        `<text x="${x - rW / 2}" y="${yTop + 28}" font-size="10" text-anchor="middle" fill="green">${resistors[i]!.vDrop}</text>`,
      );
    }
  }
  const xEnd = x;
  parts.push(wire(xEnd, yTop, xEnd, yBot));
  parts.push(wire(xEnd, yBot, x0, yBot));
  parts.push(currentArrow(x0 + 60, yBot - 12, x0 + 100, yBot - 12, 'I'));
  return wrapSvg(parts.join(''), xEnd + 60, 220);
}

/** Equation / result panel diagram */
export function equationPanel(lines: string[], w = 320, h = 140): string {
  const display =
    lines.length >= 2 ? lines : [lines[0] ?? 'Result', 'from this step'];
  const inner = [
    `<rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="8" fill="none" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="20" y1="32" x2="${w - 20}" y2="32" stroke="#ccc" stroke-width="1"/>`,
    `<line x1="20" y1="${h - 26}" x2="${w - 20}" y2="${h - 26}" stroke="#ccc" stroke-width="1"/>`,
    `<line x1="24" y1="14" x2="24" y2="${h - 14}" stroke="#eee" stroke-width="1"/>`,
    `<line x1="${w - 24}" y1="14" x2="${w - 24}" y2="${h - 14}" stroke="#eee" stroke-width="1"/>`,
    `<text x="${w / 2}" y="28" font-size="10" text-anchor="middle" fill="#666">Key relation</text>`,
    ...display.map((line, i) => {
      const y = 52 + i * 28;
      return `<text x="${w / 2}" y="${y}" font-size="12" text-anchor="middle">${line}</text>`;
    }),
  ].join('');
  return wrapSvg(inner, w, h);
}

/** Bode / plot placeholder with axes */
export function bodeAxesPlot(
  title: string,
  annotations: string[],
  w = 400,
  h = 200,
): string {
  const parts = [
    `<line x1="50" y1="160" x2="370" y2="160" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="50" y1="30" x2="50" y2="160" stroke="#333" stroke-width="1.5"/>`,
    `<polyline points="60,140 120,100 200,80 300,50 360,40" fill="none" stroke="#1565c0" stroke-width="1.5"/>`,
    `<line x1="50" y1="100" x2="370" y2="100" stroke="#ddd" stroke-width="1" stroke-dasharray="4,3"/>`,
    `<text x="210" y="185" font-size="10" text-anchor="middle">\u03c9 (rad/s)</text>`,
    `<text x="20" y="100" font-size="10" text-anchor="middle" transform="rotate(-90,20,100)">|H| dB</text>`,
    `<text x="210" y="18" font-size="12" text-anchor="middle" font-weight="bold">${title}</text>`,
    ...annotations.map((a, i) => {
      const y = 44 + i * 18;
      return `<text x="60" y="${y}" font-size="10">${a}</text>`;
    }),
  ];
  return wrapSvg(parts.join(''), w, h);
}
