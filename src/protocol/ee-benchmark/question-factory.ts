/**
 * Factory helpers to build EE benchmark questions with consistent structure.
 */
import {
  wrapSvg,
  wire,
  vSource,
  ground,
  node,
  resistorH,
  resistorV,
  currentArrow,
  equationPanel,
  bodeAxesPlot,
  seriesLoopCircuit,
  inductorH,
  capacitorH,
} from './circuit-svg';
import type { EEQuestionDef, EEStepDef } from './types';

export function makeStep(
  partial: Omit<EEStepDef, 'svg'> & { svg?: string },
  defaultSvg: string,
): EEStepDef {
  return { ...partial, svg: partial.svg ?? defaultSvg };
}

export function buildStandardSteps(
  topic: string,
  defaultSvg: string,
  steps: Array<Omit<EEStepDef, 'svg'> & { svg?: string }>,
): EEStepDef[] {
  return steps.map((s) => makeStep(s, defaultSvg));
}

export function nodalCircuit3Node(
  v1Label: string,
  r12: string,
  r23: string,
  r2gnd: string,
  r3gnd: string,
  isrcLabel?: string,
): string {
  const parts = [
    vSource(40, 30, 180, v1Label),
    wire(40, 30, 80, 30),
    resistorH(80, 30, 50, r12),
    wire(130, 30, 170, 30),
    node(170, 30, 'V\u2082'),
    wire(170, 30, 210, 30),
    resistorH(210, 30, 50, r23),
    wire(260, 30, 300, 30),
    node(300, 30, 'V\u2083'),
    wire(170, 30, 170, 80),
    resistorV(170, 80, 50, r2gnd),
    wire(170, 130, 170, 180),
    wire(300, 30, 300, 80),
    resistorV(300, 80, 50, r3gnd),
    wire(300, 130, 300, 180),
    wire(40, 180, 300, 180),
    ground(170, 180),
  ];
  if (isrcLabel) {
    parts.push(
      wire(300, 30, 360, 30),
      `<circle cx="360" cy="108" r="14" fill="none" stroke="#333" stroke-width="2"/>`,
      `<line x1="360" y1="118" x2="360" y2="98" stroke="#333" stroke-width="1.5" marker-end="url(#arw)"/>`,
      wire(360, 30, 360, 94),
      wire(360, 122, 360, 180),
      `<text x="378" y="112" font-size="10">${isrcLabel}</text>`,
    );
  }
  parts.push(node(40, 30, 'V\u2081', '#2e7d32'));
  return wrapSvg(parts.join(''), 400, 220);
}

export function meshCircuit3(): string {
  const parts = [
    vSource(30, 55, 155, '20V'),
    wire(30, 55, 30, 35),
    resistorH(30, 35, 50, 'R\u2081=4\u03A9'),
    wire(80, 35, 130, 35),
    resistorH(130, 35, 50, 'R\u2082=2\u03A9'),
    wire(180, 35, 230, 35),
    wire(230, 35, 230, 105),
    resistorV(230, 105, 45, 'R\u2084=8\u03A9'),
    wire(230, 150, 230, 185),
    wire(230, 185, 30, 185),
    wire(30, 185, 30, 155),
    wire(80, 35, 80, 90),
    resistorV(80, 90, 45, 'R\u2083=6\u03A9'),
    wire(80, 135, 80, 185),
    wire(130, 35, 130, 90),
    resistorH(130, 90, 50, 'R\u2085=3\u03A9'),
    wire(180, 90, 230, 90),
    vSource(275, 55, 105, '10V'),
    wire(275, 55, 230, 55),
    wire(275, 105, 275, 185),
    ground(140, 185),
    currentArrow(45, 52, 65, 52, 'I\u2081'),
    currentArrow(140, 52, 160, 52, 'I\u2082'),
    currentArrow(222, 78, 222, 98, 'I\u2083'),
  ];
  return wrapSvg(parts.join(''), 320, 210);
}

export function rcCircuit(Rlabel: string, Clabel: string, Vs: string): string {
  const parts = [
    vSource(40, 40, 160, Vs),
    wire(40, 40, 80, 40),
    resistorH(80, 40, 60, Rlabel),
    wire(140, 40, 180, 40),
    wire(180, 40, 180, 80),
    `<line x1="172" y1="80" x2="188" y2="80" stroke="#333" stroke-width="2"/>`,
    `<line x1="172" y1="68" x2="172" y2="92" stroke="#333" stroke-width="2"/>`,
    `<line x1="188" y1="68" x2="188" y2="92" stroke="#333" stroke-width="2"/>`,
    `<text x="180" y="58" font-size="11" text-anchor="middle">${Clabel}</text>`,
    wire(180, 80, 180, 160),
    wire(180, 160, 40, 160),
    ground(110, 160),
  ];
  return wrapSvg(parts.join(''), 220, 190);
}

/** Two magnetically coupled coils with dot convention (coil 2 open). */
export function coupledCoilsCircuit(): string {
  const coilV = (x: number, y1: number, len: number, label: string, dotY: number): string => {
    const coils = 4;
    const dy = len / coils;
    const parts: string[] = [`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y1 + 6}" stroke="#333" stroke-width="2"/>`];
    for (let i = 0; i < coils; i++) {
      const cy = y1 + 6 + i * dy + dy / 2;
      parts.push(
        `<path d="M${x},${y1 + 6 + i * dy} Q${x - 12},${cy - dy / 4} ${x},${cy} Q${x + 12},${cy + dy / 4} ${x},${y1 + 6 + (i + 1) * dy}" fill="none" stroke="#333" stroke-width="2"/>`,
      );
    }
    parts.push(`<line x1="${x}" y1="${y1 + len + 6}" x2="${x}" y2="${y1 + len + 16}" stroke="#333" stroke-width="2"/>`);
    parts.push(`<text x="${x + 18}" y="${y1 + len / 2 + 6}" font-size="11">${label}</text>`);
    parts.push(`<circle cx="${x}" cy="${dotY}" r="3" fill="#333"/>`);
    return parts.join('');
  };

  const parts = [
    vSource(40, 45, 155, 'V_s'),
    wire(40, 45, 40, 35),
    wire(40, 35, 70, 35),
    coilV(70, 35, 70, 'L\u2081=4H', 38),
    wire(70, 121, 70, 155),
    wire(70, 155, 40, 155),
    wire(40, 155, 40, 45),
    wire(70, 35, 200, 35),
    coilV(200, 35, 70, 'L\u2082=9H', 38),
    wire(200, 121, 200, 155),
    wire(200, 155, 70, 155),
    `<line x1="95" y1="55" x2="175" y2="55" stroke="#1565c0" stroke-width="1.5" stroke-dasharray="5,4"/>`,
    `<text x="135" y="48" font-size="10" text-anchor="middle" fill="#1565c0">M=3H</text>`,
    `<text x="200" y="145" font-size="10" text-anchor="middle" fill="#888">open</text>`,
    currentArrow(48, 95, 48, 115, 'I\u2081'),
    `<text x="248" y="58" font-size="10" fill="#2e7d32">V\u2082</text>`,
    ground(135, 155),
  ];
  return wrapSvg(parts.join(''), 280, 185);
}

export function rlcSeries(R: string, L: string, C: string, Vs: string): string {
  const parts = [
    vSource(30, 40, 170, Vs),
    wire(30, 40, 60, 40),
    resistorH(60, 40, 50, R),
    wire(110, 40, 140, 40),
    inductorH(140, 40, 50, L),
    wire(190, 40, 220, 40),
    capacitorH(220, 40, 20, C),
    wire(240, 40, 270, 40),
    wire(270, 40, 270, 170),
    wire(270, 170, 30, 170),
    ground(150, 170),
  ];
  return wrapSvg(parts.join(''), 300, 200);
}

export { equationPanel, bodeAxesPlot, seriesLoopCircuit, wrapSvg };
