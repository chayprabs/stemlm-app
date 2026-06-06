/**
 * Normalize AI-generated SVG for display: decode LaTeX in labels, theme strokes,
 * and keep aspect ratio sane inside the step card.
 */
import type { ResolvedTheme } from './theme';
import {
  type DiagramSizeProfile,
  computeDisplaySize,
} from './diagram-bounds';

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

function themeMuted(theme: ResolvedTheme): string {
  return theme === 'dark' ? '#94a3b8' : '#64748b';
}

function themeAccentMap(theme: ResolvedTheme): Record<string, string> {
  if (theme === 'dark') {
    return {
      '#000000': themeNeutralStroke('dark'),
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

function retintColorAttributes(svg: string, theme: ResolvedTheme): string {
  return svg.replace(/\b(stroke|fill)\s*=\s*"([^"]+)"/gi, (match, attr: string, color: string) => {
    const raw = normColor(color);
    if (!raw) return match;
    const mapped = mapColor(raw, theme, attr === 'stroke' ? 'stroke' : 'fill');
    return mapped === raw ? match : `${attr}="${mapped}"`;
  });
}

function retintAccentAttributes(svg: string, theme: ResolvedTheme): string {
  const accents = themeAccentMap(theme);
  let out = svg;
  for (const [from, to] of Object.entries(accents)) {
    const re = new RegExp(`\\b(stroke|fill)\\s*=\\s*"${from.replace('#', '#')}"`, 'gi');
    out = out.replace(re, `$1="${to}"`);
  }
  return out;
}

function themeSvgTree(root: Element, theme: ResolvedTheme): void {
  const textTags = new Set(['text', 'tspan']);

  for (const el of root.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase();
    const isText = textTags.has(tag);

    for (const attr of ['stroke', 'fill'] as const) {
      const raw = normColor(el.getAttribute(attr));
      if (!raw) continue;
      const kind: 'stroke' | 'fill' =
        attr === 'stroke' || (!isText && attr === 'fill') ? 'stroke' : 'fill';
      const mapped = mapColor(raw, theme, kind);
      if (mapped !== raw) el.setAttribute(attr, mapped);
    }

    if (isText && !normColor(el.getAttribute('fill'))) {
      el.setAttribute('fill', themeNeutralFill(theme));
    }
  }

  for (const el of root.querySelectorAll('line, polyline, path, rect, circle, ellipse')) {
    if (!normColor(el.getAttribute('stroke'))) {
      el.setAttribute('stroke', themeNeutralStroke(theme));
    }
  }
}

function decodeTextNodes(svg: string): string {
  return svg.replace(
    /<(text|tspan)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs: string, content: string) => {
      const decoded = decodeSvgText(content);
      let nextAttrs = attrs;
      if (!/\bfont-family\s*=/i.test(nextAttrs)) {
        nextAttrs += ' font-family="Inter, ui-sans-serif, system-ui, sans-serif"';
      }
      if (!/\bfont-size\s*=/i.test(nextAttrs)) {
        nextAttrs += ' font-size="11"';
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

  themeSvgTree(root, theme);

  let out = new XMLSerializer().serializeToString(root);
  out = retintAccentAttributes(out, theme);
  out = retintColorAttributes(out, theme);
  return decodeTextNodes(out);
}
