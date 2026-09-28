/**
 * Shipped type stack.
 *
 * IBM Plex Sans is a humanist grotesque (softer terminals, lower sharpness
 * than Inter) designed for technical reading. IBM Plex Mono replaces
 * JetBrains Mono in labels/code. Both are OFL; we cannot ship Claude /
 * Host-specific proprietary faces.
 */
export const FONT_SANS_NAME = 'IBM Plex Sans';
export const FONT_MONO_NAME = 'IBM Plex Mono';

export const FONT_SANS =
  "'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const FONT_MONO =
  "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/** SVG `font-family` attribute (unquoted family name first). */
export const FONT_SANS_SVG = 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif';

/*
 * Bundled faces (D4, PERF-02): woff2 files served from the extension, never a
 * font CDN and never base64 inside the content CSS. KaTeX's own @font-face
 * rules are stripped at build time (wxt.config.ts) and registered here instead.
 * Chat hosts that forbid `data:` fonts (grok.com) still load extension URLs.
 */
const KATEX_FONTS = [
  'AMS-Regular', 'Caligraphic-Bold', 'Caligraphic-Regular', 'Fraktur-Bold', 'Fraktur-Regular',
  'Main-Bold', 'Main-BoldItalic', 'Main-Italic', 'Main-Regular', 'Math-BoldItalic', 'Math-Italic',
  'SansSerif-Bold', 'SansSerif-Italic', 'SansSerif-Regular', 'Script-Regular',
  'Size1-Regular', 'Size2-Regular', 'Size3-Regular', 'Size4-Regular', 'Typewriter-Regular',
];

/** IBM's Latin-1 split files (@ibm/plex-sans 1.1.0, @ibm/plex-mono 2.5.0), assets/fonts/ibm-plex. */
const PLEX_FONTS = [
  'Sans-Regular', 'Sans-Italic', 'Sans-Medium', 'Sans-SemiBold', 'Mono-Regular', 'Mono-Medium',
];

/** The unicode-range IBM declares for its Latin1 split. */
const PLEX_LATIN1 =
  'U+0000, U+000D, U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2013-2014, ' +
  'U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2039-203A, U+2044, U+20AC, U+2122, U+2212, U+FB01-FB02';

function fontFace(family: string, variant: string, src: string, display: string, range?: string): string {
  const weight = variant.includes('SemiBold') ? 600 : variant.includes('Medium') ? 500 : variant.includes('Bold') ? 700 : 400;
  const style = variant.includes('Italic') ? 'italic' : 'normal';
  return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:${display};` +
    `src:url("${src}") format("woff2")${range ? `;unicode-range:${range}` : ''}}`;
}

/** Every bundled face; `url` maps an extension path to a loadable URL. */
export function fontFaceCss(url: (path: string) => string = (path) => path): string {
  const katex = KATEX_FONTS.map((name) => {
    const [family, variant] = name.split('-') as [string, string];
    return fontFace(`KaTeX_${family}`, variant, url(`/fonts/katex/KaTeX_${name}.woff2`), 'block');
  });
  const plex = PLEX_FONTS.map((name) => {
    const [family, variant] = name.split('-') as [string, string];
    return fontFace(family === 'Mono' ? FONT_MONO_NAME : FONT_SANS_NAME, variant,
      url(`/fonts/ibm-plex/IBMPlex${name}-Latin1.woff2`), 'swap', PLEX_LATIN1);
  });
  return [...katex, ...plex].join('\n');
}

/**
 * Register the faces at document level: shadow roots ignore their own
 * @font-face, so the chat page's <head> must hold them for the panel.
 */
export function installFontFaces(doc: Document, url: (path: string) => string): HTMLStyleElement {
  const style = doc.querySelector<HTMLStyleElement>('style[data-stemlm-fonts]') ?? doc.createElement('style');
  style.dataset.stemlmFonts = '';
  style.textContent = fontFaceCss(url);
  if (!style.isConnected) (doc.head ?? doc.documentElement).append(style);
  return style;
}
