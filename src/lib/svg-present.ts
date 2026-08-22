/**
 * Normalize AI-generated SVG for display: decode LaTeX in labels, theme strokes,
 * and keep aspect ratio sane inside the step card.
 */
import type { ResolvedTheme } from './theme';
import {
  type DiagramSizeProfile,
  computeDisplaySize,
  getDisplayScale,
  parseViewBox as parseViewBoxDims,
} from './diagram-bounds';
import { samplePathD } from './figure/geom';
import { FONT_SANS_SVG } from './fonts';

const LATEX_IN_TEXT: [RegExp, string][] = [
  [/\\\s*Omega\b/gi, 'Ω'],
  [/\\Omega\b/g, 'Ω'],
  [/\\\s*mu\s*F/gi, 'µF'],
  [/\\\s*mu\b/gi, 'µ'],
  [/\\cdot/g, '·'],
  [/\\times/g, '×'],
  [/\\approx/g, '≈'],
  [/\\le\b/g, '≤'],
  [/\\ge\b/g, '≥'],
  [/\\pm/g, '±'],
  [/\\text\{([^}]*)\}/g, '$1'],
  [/\$\$/g, ''],
  [/\$/g, ''],
];

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  gray: '#808080',
  grey: '#808080',
  blue: '#0000ff',
  red: '#ff0000',
  green: '#008000',
  orange: '#ffa500',
  purple: '#800080',
};

/** Decode common LaTeX fragments inside SVG <text> nodes. */
export function decodeSvgText(text: string): string {
  let s = text;
  for (const [re, rep] of LATEX_IN_TEXT) {
    s = s.replace(re, rep);
  }
  return s.replace(/\s+/g, ' ').trim();
}

function expandShortHex(color: string): string {
  if (/^#[0-9a-f]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return color;
}

function normColor(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v || v === 'none' || v === 'transparent' || v === 'currentcolor' || v.startsWith('url(')) {
    return null;
  }
  const named = NAMED_COLORS[v];
  if (named) return named;
  if (/^#[0-9a-f]{3}$/.test(v) || /^#[0-9a-f]{6}$/.test(v)) return expandShortHex(v);
  return v;
}

function rgbChannels(color: string): { r: number; g: number; b: number } | null {
  const hex = normColor(color);
  if (!hex || !/^#[0-9a-f]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function isNeutralColor(color: string): boolean {
  const rgb = rgbChannels(color);
  if (!rgb) return false;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 36 && max < 230;
}

function isLightColor(color: string): boolean {
  const rgb = rgbChannels(color);
  if (!rgb) return false;
  const { r, g, b } = rgb;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min > 175 && max > 210;
}

function isDarkColor(color: string): boolean {
  const rgb = rgbChannels(color);
  if (!rgb) return color === 'black' || color === '#000000';
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  return max < 100;
}

function themeNeutralStroke(theme: ResolvedTheme): string {
  return theme === 'dark' ? '#cbd5e1' : '#334155';
}

function themeNeutralFill(theme: ResolvedTheme): string {
  return theme === 'dark' ? '#e2e8f0' : '#1e293b';
}

/** Interior fill for schematic symbols (resistor boxes, etc.) on dark backgrounds. */
function themeSchematicFill(theme: ResolvedTheme): string {
  return theme === 'dark' ? '#2a2a38' : '#ffffff';
}

function themeMuted(theme: ResolvedTheme): string {
  return theme === 'dark' ? '#94a3b8' : '#64748b';
}

function themeAccentMap(theme: ResolvedTheme): Record<string, string> {
  if (theme === 'dark') {
    return {
      '#ffffff': themeSchematicFill('dark'),
      '#fff': themeSchematicFill('dark'),
      '#000000': themeNeutralStroke('dark'),
      '#000': themeNeutralStroke('dark'),
      '#d32f2f': '#f87171',
      '#c62828': '#f87171',
      '#ff0000': '#f87171',
      '#dc2626': '#f87171',
      '#1565c0': '#60a5fa',
      '#1976d2': '#60a5fa',
      '#2563eb': '#60a5fa',
      '#3b82f6': '#60a5fa',
      '#3182ce': '#60a5fa',
      '#0000ff': '#60a5fa',
      '#2e7d32': '#4ade80',
      '#388e3c': '#4ade80',
      '#008000': '#4ade80',
      '#16a34a': '#4ade80',
      '#7b1fa2': '#c084fc',
      '#6a1b9a': '#c084fc',
      '#800080': '#c084fc',
      '#7c3aed': '#c084fc',
      '#ffa500': '#fb923c',
      '#e67700': '#fb923c',
    };
  }
  return {
    '#ffffff': themeNeutralFill('light'),
    '#f87171': '#dc2626',
    '#60a5fa': '#2563eb',
    '#4ade80': '#16a34a',
    '#c084fc': '#7c3aed',
    '#fb923c': '#ea580c',
  };
}

function mapColor(color: string, theme: ResolvedTheme, kind: 'stroke' | 'fill'): string {
  const normalized = normColor(color);
  if (!normalized) return color;

  const accent = themeAccentMap(theme)[normalized];
  if (accent) return accent;

  if (theme === 'dark' && (isNeutralColor(normalized) || isDarkColor(normalized))) {
    return kind === 'stroke' ? themeNeutralStroke(theme) : themeNeutralFill(theme);
  }

  if (theme === 'light' && (isNeutralColor(normalized) || isLightColor(normalized))) {
    return kind === 'stroke' ? themeNeutralStroke(theme) : themeNeutralFill(theme);
  }

  if (normalized === '#999999' || normalized === '#aaaaaa' || normalized === '#bbbbbb') {
    return themeMuted(theme);
  }

  return color;
}

const MARKER_REF_ATTRS = ['marker-end', 'marker-start', 'marker-mid'] as const;
const DEFAULT_ARROW_POINTS = '0,0 6,3 0,6';
const DEFAULT_MARKER_WIDTH = '6';
const DEFAULT_MARKER_HEIGHT = '6';
const DEFAULT_MARKER_REF_X = '6';
const DEFAULT_MARKER_REF_Y = '3';

function generateIdPrefix(): string {
  return `slm${Math.random().toString(36).slice(2, 9)}`;
}

/** Namespace SVG ids so multiple diagrams on one page never share marker/gradient refs. */
function prefixSvgIds(root: Element): void {
  const prefix = generateIdPrefix();
  const idMap = new Map<string, string>();

  for (const el of root.querySelectorAll('[id]')) {
    const id = el.getAttribute('id');
    if (id) idMap.set(id, `${prefix}-${id}`);
  }
  if (idMap.size === 0) return;

  for (const el of root.querySelectorAll('[id]')) {
    const id = el.getAttribute('id');
    if (id && idMap.has(id)) el.setAttribute('id', idMap.get(id)!);
  }

  for (const el of root.querySelectorAll('*')) {
    for (const attr of Array.from(el.attributes)) {
      let val = attr.value;
      if (/url\(#/.test(val)) {
        val = val.replace(/url\(#([^)]+)\)/g, (_, id: string) => {
          const mapped = idMap.get(id);
          return mapped ? `url(#${mapped})` : `url(#${id})`;
        });
        el.setAttribute(attr.name, val);
        continue;
      }
      if ((attr.name === 'href' || attr.name.endsWith(':href')) && val.startsWith('#')) {
        const mapped = idMap.get(val.slice(1));
        if (mapped) el.setAttribute(attr.name, `#${mapped}`);
      }
    }
  }
}

function extractMarkerId(value: string | null): string | null {
  if (!value) return null;
  const m = /url\(#([^)]+)\)/i.exec(value);
  return m?.[1] ?? null;
}

function findById(root: Element, id: string): Element | null {
  return root.querySelector(`[id="${CSS.escape(id)}"]`);
}

function isTrianglePolygon(points: string): boolean {
  const pairs = points.trim().split(/\s+/).filter(Boolean);
  return pairs.length === 3;
}

function replaceMarkerShape(marker: Element): SVGPolygonElement {
  const ns = 'http://www.w3.org/2000/svg';
  const existing = marker.querySelector('polygon, path');
  const poly = marker.ownerDocument!.createElementNS(ns, 'polygon');
  poly.setAttribute('points', DEFAULT_ARROW_POINTS);
  if (existing) {
    const fill = existing.getAttribute('fill');
    if (fill) poly.setAttribute('fill', fill);
    existing.replaceWith(poly);
  } else {
    marker.appendChild(poly);
  }
  return poly;
}

/** Force compact stroke-scaled arrowheads; models often emit userSpace stars/diamonds. */
function normalizeMarkerShape(marker: Element): void {
  marker.setAttribute('markerUnits', 'strokeWidth');
  marker.setAttribute('markerWidth', DEFAULT_MARKER_WIDTH);
  marker.setAttribute('markerHeight', DEFAULT_MARKER_HEIGHT);
  marker.setAttribute('refX', DEFAULT_MARKER_REF_X);
  marker.setAttribute('refY', DEFAULT_MARKER_REF_Y);
  if (!marker.getAttribute('orient')) marker.setAttribute('orient', 'auto');

  const shape = marker.querySelector('polygon, path');
  if (!shape) {
    replaceMarkerShape(marker);
    return;
  }

  const tag = shape.tagName.toLowerCase();
  if (tag === 'path' || (tag === 'polygon' && !isTrianglePolygon(shape.getAttribute('points') ?? ''))) {
    replaceMarkerShape(marker);
  }
}

/** Match arrowhead fills to line strokes; clone markers when one id serves multiple colors. */
function syncMarkerFills(root: Element): void {
  type MarkerRef = { el: Element; attr: (typeof MARKER_REF_ATTRS)[number] };
  const refsByMarker = new Map<string, MarkerRef[]>();

  for (const el of root.querySelectorAll('line, path, polyline')) {
    const stroke = el.getAttribute('stroke');
    if (!stroke || stroke === 'none') continue;
    for (const attr of MARKER_REF_ATTRS) {
      const markerId = extractMarkerId(el.getAttribute(attr));
      if (!markerId) continue;
      const list = refsByMarker.get(markerId) ?? [];
      list.push({ el, attr });
      refsByMarker.set(markerId, list);
    }
  }

  for (const [markerId, refs] of refsByMarker) {
    const marker = findById(root, markerId);
    if (!marker || marker.tagName.toLowerCase() !== 'marker') continue;

    normalizeMarkerShape(marker);

    const strokes = [
      ...new Set(
        refs.map((r) => r.el.getAttribute('stroke')).filter((s): s is string => Boolean(s)),
      ),
    ];
    if (strokes.length === 0) continue;

    const applyFill = (target: Element, stroke: string) => {
      normalizeMarkerShape(target);
      const shape = target.querySelector('polygon, path');
      if (shape) shape.setAttribute('fill', stroke);
    };

    if (strokes.length === 1) {
      applyFill(marker, strokes[0]!);
      continue;
    }

    const parent = marker.parentElement;
    if (!parent) continue;

    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i]!;
      const newId = i === 0 ? markerId : `${markerId}-c${i}`;
      const targetMarker =
        i === 0 ? marker : (() => {
          const clone = marker.cloneNode(true) as Element;
          clone.setAttribute('id', newId);
          parent.appendChild(clone);
          return clone;
        })();

      applyFill(targetMarker, stroke);

      for (const ref of refs) {
        if (ref.el.getAttribute('stroke') === stroke) {
          ref.el.setAttribute(ref.attr, `url(#${newId})`);
        }
      }
    }
  }
}

function isInsideMarker(el: Element): boolean {
  return Boolean(el.closest('marker'));
}

const SHAPE_TAGS = 'line, polyline, path, rect, circle, ellipse, polygon';

function inheritedStroke(el: Element, root: Element): string | null {
  let node: Element | null = el.parentElement;
  while (node && node !== root) {
    const stroke = node.getAttribute('stroke');
    if (stroke && stroke !== 'none') return stroke;
    node = node.parentElement;
  }
  return null;
}

/** Ensure every shape has an explicit themed stroke (models often set stroke only on <g>). */
function ensureShapeStrokes(root: Element, theme: ResolvedTheme): void {
  for (const el of root.querySelectorAll(SHAPE_TAGS)) {
    if (isInsideMarker(el)) continue;
    const attrStroke = el.getAttribute('stroke');
    if (attrStroke && attrStroke !== 'none') continue;
    const fromGroup = inheritedStroke(el, root);
    el.setAttribute('stroke', fromGroup ?? themeNeutralStroke(theme));
  }
}

function themeSvgTree(root: Element, theme: ResolvedTheme): void {
  const textTags = new Set(['text', 'tspan']);

  for (const el of root.querySelectorAll('*')) {
    if (isInsideMarker(el)) continue;
    const tag = el.tagName.toLowerCase();
    const isText = textTags.has(tag);

    for (const attr of ['stroke', 'fill'] as const) {
      const raw = normColor(el.getAttribute(attr));
      if (!raw) continue;
      const mapped = mapColor(raw, theme, attr);
      if (mapped !== raw) el.setAttribute(attr, mapped);
    }

    if (isText && !normColor(el.getAttribute('fill'))) {
      el.setAttribute('fill', themeNeutralFill(theme));
    }
  }

  ensureShapeStrokes(root, theme);
}

/** Normalize every marker in defs — not only those referenced at sync time. */
function normalizeAllMarkers(root: Element): void {
  for (const marker of root.querySelectorAll('marker')) {
    normalizeMarkerShape(marker);
  }
}

interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function viewBoxRect(value: string | null): ViewBoxRect {
  const parsed = parseViewBoxDims(value);
  if (!parsed) return { x: 0, y: 0, width: 100, height: 100 };
  return { x: parsed.x, y: parsed.y, width: parsed.w, height: parsed.h };
}

interface WireSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function textFontSize(el: Element): number {
  const raw = el.getAttribute('font-size') ?? el.parentElement?.getAttribute('font-size');
  const size = Number(raw);
  return Number.isFinite(size) && size > 0 ? size : 14;
}

function textPosition(el: Element): { x: number; y: number } | null {
  const x = Number(el.getAttribute('x'));
  const y = Number(el.getAttribute('y'));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function labelText(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Numeric / phasor component values — leave placement alone. */
function isCoordinateLabel(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^(Re|Im)$/i.test(t)) return true;
  return (
    /^[+-]?j?\d/.test(t) ||
    /\d\s*\/\s*\d+/.test(t) ||
    /[∠°]/.test(t) ||
    /^[+-]?j[\d./]+$/.test(t)
  );
}

function isAxisName(text: string): boolean {
  return /^(Re|Im|θ|phi|ω)$/i.test(text.trim());
}

function isProtectedLabel(text: string): boolean {
  return isCoordinateLabel(text) || isAxisName(text);
}

function isAxisLine(wire: WireSegment, vb: ViewBoxRect): boolean {
  const cx = vb.x + vb.width / 2;
  const cy = vb.y + vb.height / 2;
  const horiz = Math.abs(wire.y1 - wire.y2) <= 2;
  const vert = Math.abs(wire.x1 - wire.x2) <= 2;
  if (horiz) {
    const span = Math.abs(wire.x2 - wire.x1);
    const y = (wire.y1 + wire.y2) / 2;
    return span >= vb.width * 0.5 && Math.abs(y - cy) <= vb.height * 0.2;
  }
  if (vert) {
    const span = Math.abs(wire.y2 - wire.y1);
    const x = (wire.x1 + wire.x2) / 2;
    return span >= vb.height * 0.5 && Math.abs(x - cx) <= vb.width * 0.2;
  }
  return false;
}

function pathLineSegments(d: string): WireSegment[] {
  return samplePathD(d);
}

function collectGraphicSegments(root: Element, vb: ViewBoxRect): WireSegment[] {
  const segments: WireSegment[] = [];
  for (const line of root.querySelectorAll('line')) {
    if (line.closest('marker')) continue;
    const seg: WireSegment = {
      x1: Number(line.getAttribute('x1') ?? 0),
      y1: Number(line.getAttribute('y1') ?? 0),
      x2: Number(line.getAttribute('x2') ?? 0),
      y2: Number(line.getAttribute('y2') ?? 0),
    };
    if (!isAxisLine(seg, vb)) segments.push(seg);
  }
  for (const poly of root.querySelectorAll('polyline, polygon')) {
    if (poly.closest('marker')) continue;
    const pts = (poly.getAttribute('points') ?? '')
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    for (let i = 0; i + 3 < pts.length; i += 2) {
      segments.push({ x1: pts[i]!, y1: pts[i + 1]!, x2: pts[i + 2]!, y2: pts[i + 3]! });
    }
    if (poly.tagName.toLowerCase() === 'polygon' && pts.length >= 4) {
      segments.push({
        x1: pts[pts.length - 2]!,
        y1: pts[pts.length - 1]!,
        x2: pts[0]!,
        y2: pts[1]!,
      });
    }
  }
  for (const path of root.querySelectorAll('path')) {
    if (path.closest('marker')) continue;
    const d = path.getAttribute('d');
    if (d) segments.push(...pathLineSegments(d));
  }
  return segments;
}

function distancePointToSegment(px: number, py: number, seg: WireSegment): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - seg.x1, py - seg.y1);
  const t = Math.max(0, Math.min(1, ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq));
  return Math.hypot(px - (seg.x1 + t * dx), py - (seg.y1 + t * dy));
}

function nudgePointOffSegment(
  x: number,
  y: number,
  seg: WireSegment,
  fontSize: number,
  vb: ViewBoxRect,
): { x: number; y: number } {
  const cx = vb.x + vb.width / 2;
  const gap = Math.max(6, fontSize * 0.55);
  if (Math.abs(seg.y1 - seg.y2) <= 2) {
    const lineY = (seg.y1 + seg.y2) / 2;
    const cy = vb.y + vb.height / 2;
    return { x, y: lineY < cy ? lineY - gap : lineY + gap };
  }
  if (Math.abs(seg.x1 - seg.x2) <= 2) {
    const lineX = (seg.x1 + seg.x2) / 2;
    return { x: lineX < cx ? lineX - gap : lineX + gap, y };
  }
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cy = vb.y + vb.height / 2;
  const side = (x - cx) * nx + (y - cy) * ny >= 0 ? 1 : -1;
  return { x: x + nx * gap * side, y: y + ny * gap * side };
}

function normalizeLabelTypography(root: Element): void {
  for (const text of root.querySelectorAll('text')) {
    if (text.closest('marker')) continue;
    const content = labelText(text);
    if (!content) continue;
    if (!text.getAttribute('dominant-baseline')) {
      text.setAttribute('dominant-baseline', 'middle');
    }
    if (isProtectedLabel(content)) continue;
    if (!text.getAttribute('text-anchor') && /^I[_\d]/i.test(content)) {
      text.setAttribute('text-anchor', 'start');
    }
  }
}

/** Nudge identifier labels off wires/paths; skip phasor axes and coordinate values. */
function nudgeLabelsAwayFromGraphics(root: Element): void {
  const viewBox = viewBoxRect(root.getAttribute('viewBox'));
  const segments = collectGraphicSegments(root, viewBox);

  for (const text of root.querySelectorAll('text')) {
    if (text.closest('marker')) continue;
    if (isProtectedLabel(labelText(text))) continue;
    const pos = textPosition(text);
    if (!pos) continue;

    const fontSize = textFontSize(text);
    const hitDist = Math.max(5, fontSize * 0.45);
    let { x, y } = pos;
    let nudged = false;

    for (const seg of segments) {
      if (distancePointToSegment(x, y, seg) > hitDist) continue;
      const next = nudgePointOffSegment(x, y, seg, fontSize, viewBox);
      x = next.x;
      y = next.y;
      nudged = true;
      if (Math.abs(seg.y1 - seg.y2) <= 2 && !text.getAttribute('text-anchor')) {
        text.setAttribute('text-anchor', 'middle');
      } else if (Math.abs(seg.x1 - seg.x2) <= 2 && !text.getAttribute('text-anchor')) {
        const lineX = (seg.x1 + seg.x2) / 2;
        text.setAttribute('text-anchor', lineX < viewBox.x + viewBox.width / 2 ? 'end' : 'start');
      }
      break;
    }

    if (nudged) {
      text.setAttribute('x', String(Math.round(x)));
      text.setAttribute('y', String(Math.round(y)));
    }
  }
}

function spreadOverlappingLabels(root: Element): void {
  const items: { el: Element; x: number; y: number; fontSize: number; protected: boolean }[] = [];
  for (const el of root.querySelectorAll('text')) {
    if (el.closest('marker')) continue;
    const pos = textPosition(el);
    if (!pos) continue;
    items.push({
      el,
      x: pos.x,
      y: pos.y,
      fontSize: textFontSize(el),
      protected: isProtectedLabel(labelText(el)),
    });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);

  const threshold = 5;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      if (a.protected || b.protected) continue;
      if (Math.abs(a.x - b.x) >= threshold || Math.abs(a.y - b.y) >= threshold) continue;
      b.y = a.y + Math.max(a.fontSize, b.fontSize, 12) + 6;
      b.el.setAttribute('y', String(Math.round(b.y)));
      if (!b.el.getAttribute('text-anchor')) b.el.setAttribute('text-anchor', 'middle');
    }
  }
}

function clampLabelsToViewBox(root: Element): void {
  const vb = viewBoxRect(root.getAttribute('viewBox'));
  const pad = 4;
  const minX = vb.x + pad;
  const maxX = vb.x + vb.width - pad;
  const minY = vb.y + pad;
  const maxY = vb.y + vb.height - pad;

  for (const text of root.querySelectorAll('text')) {
    if (text.closest('marker')) continue;
    if (isProtectedLabel(labelText(text))) continue;
    const pos = textPosition(text);
    if (!pos) continue;
    const fontSize = textFontSize(text);
    let { x, y } = pos;
    const out =
      x < minX || x > maxX || y < minY + fontSize * 0.2 || y > maxY - fontSize * 0.2;
    if (!out) continue;
    x = Math.min(maxX, Math.max(minX, x));
    y = Math.min(maxY - fontSize * 0.2, Math.max(minY + fontSize * 0.5, y));
    text.setAttribute('x', String(Math.round(x)));
    text.setAttribute('y', String(Math.round(y)));
  }
}
/**
 * When the SVG is scaled down for display, bump label font-size in user units
 * so rendered text stays ~11-13px on screen and in PDF.
 */
function compensateScaledText(root: Element, profile: DiagramSizeProfile): void {
  const scale = getDisplayScale(root.getAttribute('viewBox'), profile);
  if (scale >= 0.98) return;
  const factor = Math.min(1 / scale, 1.75);
  for (const el of root.querySelectorAll('text, tspan')) {
    if (el.closest('marker')) continue;
    const size = textFontSize(el);
    const next = Math.round(size * factor * 10) / 10;
    el.setAttribute('font-size', String(next));
  }
}

function decodeTextNodes(svg: string): string {
  return svg.replace(
    /<(text|tspan)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs: string, content: string) => {
      const decoded = decodeSvgText(content);
      let nextAttrs = attrs;
      if (!/\bfont-family\s*=/i.test(nextAttrs)) {
        nextAttrs += ` font-family="${FONT_SANS_SVG}"`;
      }
      if (!/\bfont-size\s*=/i.test(nextAttrs)) {
        nextAttrs += ' font-size="14"';
      }
      return decoded === content && nextAttrs === attrs
        ? full
        : `<${tag}${nextAttrs}>${decoded}</${tag}>`;
    },
  );
}

/** Prepare sanitized SVG markup for themed, proportional panel display. */
export function presentSvg(
  svg: string,
  theme: ResolvedTheme,
  profile: DiagramSizeProfile = 'step',
): string {
  if (!svg.trim()) return svg;

  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') return svg;

  if (!root.getAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!root.getAttribute('viewBox')) {
    root.setAttribute('viewBox', '0 0 100 100');
  }

  const { width, height } = computeDisplaySize(root.getAttribute('viewBox'), profile);
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  root.setAttribute(
    'style',
    `display:block;width:${width}px;height:${height}px;max-width:100%;`,
  );
  root.setAttribute('data-stemlm-theme', theme);
  root.setAttribute('data-stemlm-size', profile);
  if (!root.getAttribute('preserveAspectRatio')) {
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  prefixSvgIds(root);
  normalizeAllMarkers(root);
  themeSvgTree(root, theme);
  syncMarkerFills(root);
  normalizeLabelTypography(root);
  nudgeLabelsAwayFromGraphics(root);
  spreadOverlappingLabels(root);
  compensateScaledText(root, profile);
  clampLabelsToViewBox(root);

  let out = new XMLSerializer().serializeToString(root);
  return decodeTextNodes(out);
}
