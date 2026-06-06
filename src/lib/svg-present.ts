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

/** Decode common LaTeX fragments inside SVG <text> nodes. */
export function decodeSvgText(text: string): string {
  let s = text;
  for (const [re, rep] of LATEX_IN_TEXT) {
    s = s.replace(re, rep);
  }
  return s.replace(/\s+/g, ' ').trim();
}

function normColor(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v || v === 'none' || v === 'transparent' || v.startsWith('url(')) return null;
  return v;
}

function isNeutralColor(color: string): boolean {
  if (color === 'black') return true;
  if (/^#[0-9a-f]{3}$/.test(color)) {
    const expanded = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    return isNeutralColor(expanded);
  }
  if (!/^#[0-9a-f]{6}$/.test(color)) return false;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 28 && max < 220;
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
      '#d32f2f': '#f87171',
      '#c62828': '#f87171',
      '#1565c0': '#60a5fa',
      '#1976d2': '#60a5fa',
      '#2e7d32': '#4ade80',
      '#388e3c': '#4ade80',
      '#7b1fa2': '#c084fc',
      '#6a1b9a': '#c084fc',
    };
  }
  return {
    '#f87171': '#dc2626',
    '#60a5fa': '#2563eb',
    '#4ade80': '#16a34a',
    '#c084fc': '#7c3aed',
  };
}

function mapColor(color: string, theme: ResolvedTheme, kind: 'stroke' | 'fill'): string {
  const accent = themeAccentMap(theme)[color];
  if (accent) return accent;
  if (isNeutralColor(color)) {
    return kind === 'stroke' ? themeNeutralStroke(theme) : themeNeutralFill(theme);
  }
  if (color === '#999' || color === '#aaa' || color === '#bbb') return themeMuted(theme);
  return color;
}

function retintColorAttributes(svg: string, theme: ResolvedTheme): string {
  return svg.replace(/\b(stroke|fill)\s*=\s*"([^"]+)"/gi, (match, attr: string, color: string) => {
    const raw = normColor(color);
    if (!raw || !isNeutralColor(raw)) return match;
    const mapped = mapColor(raw, theme, attr === 'stroke' ? 'stroke' : 'fill');
    return `${attr}="${mapped}"`;
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
  root.setAttribute('data-stemlm-theme', theme);
  root.setAttribute('data-stemlm-size', profile);
  if (!root.getAttribute('preserveAspectRatio')) {
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  let out = new XMLSerializer().serializeToString(root);
  out = retintAccentAttributes(out, theme);
  out = retintColorAttributes(out, theme);
  return decodeTextNodes(out);
}
