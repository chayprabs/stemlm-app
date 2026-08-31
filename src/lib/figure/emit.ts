import type { Scene, SemanticColor } from './types';
import type { LayoutResult } from './slk';
import { FONT_SANS_SVG } from '@/src/lib/fonts';

const COLOR: Record<SemanticColor, string> = {
  neutral: '#334155',
  accent: '#2563eb',
  muted: '#64748b',
  danger: '#dc2626',
  guide: '#64748b',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function colorOf(scene: Scene, id: string, semantic: SemanticColor): string {
  const hi = scene.highlights.some((h) => h.toLowerCase() === id.toLowerCase());
  return COLOR[hi ? 'accent' : semantic];
}

function pts(points: number[]): string {
  const out: string[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) out.push(`${points[i]},${points[i + 1]}`);
  return out.join(' ');
}

/** Emit SVG from a laid-out scene. Never uses #000. One compiler-owned marker. */
export function emitSvg(scene: Scene, layout: LayoutResult): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" data-stemlm-family="${esc(scene.family)}" font-family="${FONT_SANS_SVG}">`,
  );
  parts.push(
    `<defs><marker id="slm-arrow" markerUnits="strokeWidth" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="${COLOR.neutral}"/></marker><pattern id="slm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><line x1="0" y1="0" x2="0" y2="8" stroke="${COLOR.muted}" stroke-width="1"/></pattern><pattern id="slm-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${COLOR.muted}"/></pattern></defs>`,
  );

  for (const n of scene.nodes) {
    if (n.glyph) parts.push(n.glyph);
  }

  for (const s of scene.strokes) {
    const stroke = colorOf(scene, s.id, s.semanticColor);
    const w = s.width ?? 1.6;
    const dash = s.dash || s.semanticColor === 'guide' ? ' stroke-dasharray="4 3"' : '';
    const fill = s.pattern
      ? `url(#slm-${s.pattern})`
      : s.fill === 'none' || !s.fill
        ? 'none'
        : s.fill === 'solid'
          ? '#ffffff'
          : COLOR[s.fill];
    const mark = s.markerEnd ? ' marker-end="url(#slm-arrow)"' : '';
    const markS = s.markerStart ? ' marker-start="url(#slm-arrow)"' : '';
    const common = `id="${esc(s.id)}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash}${mark}${markS}`;
    if (s.kind === 'line' && s.points.length >= 4) {
      parts.push(
        `<line ${common} x1="${s.points[0]}" y1="${s.points[1]}" x2="${s.points[2]}" y2="${s.points[3]}"/>`,
      );
    } else if (s.kind === 'polyline') {
      parts.push(`<polyline ${common} points="${pts(s.points)}"/>`);
    } else if (s.kind === 'polygon') {
      parts.push(`<polygon ${common} points="${pts(s.points)}"/>`);
    } else if ((s.kind === 'path' || s.kind === 'arc') && s.d) {
      parts.push(`<path ${common} d="${esc(s.d)}"/>`);
    } else if (s.kind === 'circle' && s.points.length >= 3) {
      parts.push(`<circle ${common} cx="${s.points[0]}" cy="${s.points[1]}" r="${s.points[2]}"/>`);
    } else if (s.kind === 'ellipse' && s.points.length >= 4) {
      parts.push(
        `<ellipse ${common} cx="${s.points[0]}" cy="${s.points[1]}" rx="${s.points[2]}" ry="${s.points[3]}"/>`,
      );
    } else if (s.kind === 'rect' && s.points.length >= 4) {
      parts.push(
        `<rect ${common} x="${s.points[0]}" y="${s.points[1]}" width="${s.points[2]}" height="${s.points[3]}"/>`,
      );
    }
  }

  for (const p of layout.placed) {
    if (p.leader) {
      parts.push(
        `<line id="${esc(p.label.id)}-leader" x1="${p.leader.x1}" y1="${p.leader.y1}" x2="${p.leader.x2}" y2="${p.leader.y2}" stroke="${COLOR.muted}" stroke-width="0.8"/>`,
      );
    }
    if (p.overlay) continue;
    const text = p.label.text ?? '';
    parts.push(
      `<text id="${esc(p.label.id)}" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${layout.fontSize}" fill="${COLOR.neutral}">${esc(text)}</text>`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}
