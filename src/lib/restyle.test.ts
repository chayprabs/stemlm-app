import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { printStyles } from './pdf';
import { FONT_CSS_HREF, FONT_MONO, FONT_SANS, FONT_SANS_SVG } from './fonts';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('restyle: IBM Plex + Claude-dark tokens', () => {
  const tokens = read('assets/tokens.css');
  const tailwind = read('assets/tailwind.css');
  const pages = read('assets/pages.css');
  const panel = read('assets/panel.css');
  const contentStyle = read('entrypoints/content/style.css');
  const popupHtml = read('entrypoints/popup/index.html');
  const optionsHtml = read('entrypoints/options/index.html');
  const savedPdfHtml = read('entrypoints/pdf/index.html');
  const savedLibraryHtml = read('entrypoints/saved-library/index.html');
  const savedLibraryMain = read('entrypoints/saved-library/main.tsx');
  const popupApp = read('entrypoints/popup/App.tsx');
  const emptyState = read('src/components/EmptyState.tsx');
  const wxt = read('wxt.config.ts');
  const contentScript = read('entrypoints/content/index.ts');
  const hosts = read('src/platforms/hosts.ts');
  const mermaid = read('src/lib/mermaid.ts');
  const svgPresent = read('src/lib/svg-present.ts');
  const emit = read('src/lib/figure/emit.ts');
  const composer = read('src/lib/composer-slot.ts');
  const pdf = read('src/lib/pdf.ts');

  const shipped = [
    tokens,
    tailwind,
    pages,
    contentStyle,
    popupHtml,
    optionsHtml,
    savedPdfHtml,
    mermaid,
    svgPresent,
    emit,
    composer,
    pdf,
    printStyles(),
  ];

  it('uses IBM Plex Sans / IBM Plex Mono and does not keep Inter or JetBrains in UI stacks', () => {
    expect(FONT_SANS).toContain('IBM Plex Sans');
    expect(FONT_MONO).toContain('IBM Plex Mono');
    expect(FONT_SANS_SVG).toContain('IBM Plex Sans');
    expect(FONT_CSS_HREF).toContain('IBM+Plex+Sans');
    expect(FONT_CSS_HREF).toContain('IBM+Plex+Mono');

    for (const text of shipped) {
      expect(text).not.toMatch(/['"]Inter['"]|family=Inter|font-family:\s*Inter\b|font-family="Inter/);
      expect(text).not.toMatch(/JetBrains Mono|family=JetBrains/);
    }

    expect(tokens).toContain('IBM Plex Sans');
    expect(tokens).toContain('IBM Plex Mono');
    expect(tailwind).toContain('IBM Plex Sans');
    expect(tailwind).toContain('IBM Plex Mono');
    expect(printStyles()).toContain('IBM Plex Sans');
    expect(printStyles()).toContain('IBM Plex Mono');
    expect(svgPresent).toContain('FONT_SANS_SVG');
    expect(emit).toContain('FONT_SANS_SVG');
    expect(composer).toContain('FONT_SANS');
    expect(mermaid).toContain('FONT_SANS');
  });

  it('ships dark canvas #151515, canvas-family formula wells, body text #ededed, theme ≤180ms', () => {
    expect(tokens).toContain('--slm-bg: #151515');
    expect(tokens).toContain('--slm-fg: #ededed');
    const duration = /--slm-theme-duration:\s*(\d+)ms/.exec(tokens);
    expect(duration).toBeTruthy();
    expect(Number(duration![1])).toBeLessThanOrEqual(180);

    expect(tokens).toContain('--slm-bg: #f5f5f5');
    expect(tokens).toContain('--slm-formula-bg: #efefef');
    expect(tokens).not.toContain('--slm-formula-bg: #111111');
    expect(tokens).not.toContain('--slm-fg: #171717');

    const darkBlock = tokens.slice(tokens.indexOf("[data-stemlm-theme='dark']"));
    const formulaBg = /--slm-formula-bg:\s*(#[0-9a-fA-F]{6})/.exec(darkBlock)?.[1]?.toLowerCase();
    const canvas = /--slm-bg:\s*(#[0-9a-fA-F]{6})/.exec(darkBlock)?.[1]?.toLowerCase();
    expect(formulaBg).toBeTruthy();
    expect(canvas).toBe('#151515');
    expect(hexLuma(formulaBg!)).toBeGreaterThanOrEqual(hexLuma('#151515') - 0.5);

    const lightFg = /--slm-fg:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1]?.toLowerCase();
    expect(lightFg).toBeTruthy();
    expect(lightFg).not.toBe('#000000');
    expect(lightFg).not.toBe('#000');
    expect(hexLuma(lightFg!)).toBeLessThan(hexLuma('#171717'));
  });

  it('caps the question row and rounds the study panel on all corners', () => {
    expect(panel).toContain('.slm-topic-scroll');
    expect(panel).toContain('max-height: 9.25rem');
    expect(panel).toContain('overflow-y: auto');
    expect(panel).toContain('--slm-panel-radius');
    expect(panel).toContain('border-radius: var(--slm-panel-radius');
    expect(panel).toContain('--slm-panel-inset');
    expect(panel).not.toContain('-webkit-line-clamp: 3');
    expect(panel).not.toContain('.slm-subject-chip');
    expect(panel).not.toContain('.slm-progress-count');
    expect(panel).not.toContain('.slm-review ');
    expect(panel).not.toContain('.slm-solution-q');
    expect(panel).toContain('.slm-stepnav--overlay');
    expect(panel).toMatch(/\.slm-stepnav--overlay\s*\{[^}]*width:\s*auto/);
    expect(panel).not.toMatch(/\.slm-stepnav--overlay\s*\{[^}]*width:\s*50%/);
    expect(panel).not.toMatch(/\.slm-stepnav\s*\{[^}]*justify-content:\s*space-between/);
    expect(panel).not.toContain('#3c3b3b');
    expect(panel).not.toContain('#2f2e2e');
    expect(panel).not.toContain('#3f3e3e');
    expect(panel).not.toMatch(/\.slm-stepnav--overlay\s*\{[^}]*left:\s*50%/);
    expect(panel).not.toMatch(/translateX\(-50%\)/);
    expect(panel).toMatch(/\.slm-stepnav--overlay\s*\{[^}]*right:\s*var\(--slm-pad-x\)/);
    expect(panel).not.toMatch(/\.slm-stepnav--overlay\s*\{[^}]*border-radius:\s*999px/);
    expect(panel).not.toMatch(/\.slm-stepnav-btn\s*\{[^}]*border-radius:\s*999px/);
    expect(panel).toMatch(/\.slm-stepnav--overlay\s*\{[^}]*background:\s*var\(--slm-nav-shell\)/);
    expect(tokens).toContain('--slm-nav-shell');
    expect(tokens).toMatch(/--slm-nav-shell var\(--slm-theme-duration\)/);
    expect(panel).toMatch(/\.slm-session-switch\s*\{[^}]*overflow-x:\s*auto/);
    expect(panel).toMatch(/\.slm-session-switch\s*\{[^}]*border-bottom:\s*1px solid var\(--slm-border-subtle\)/);
    expect(panel).toMatch(/\.slm-session-switch\s*\{[^}]*scrollbar-width:\s*none/);
    expect(panel).toContain('.slm-session-switch::-webkit-scrollbar');
    expect(panel).toContain('scrollbar-width: none');
    expect(panel).toContain('.slm-header-leading');
    expect(panel).toMatch(/\.slm-header-leading\s*\{[\s\S]*justify-content:\s*flex-start/);
    expect(panel).toMatch(/\.slm-tabs\s*\{[\s\S]*height:\s*calc\(var\(--slm-brand-size/);
  });

  it('popup overlay uses panel tokens, a compact action shell, and the four shipped chat hosts', () => {
    const width = /\.slm-popup\s*\{[^}]*width:\s*(\d+)px/.exec(pages);
    expect(width).toBeTruthy();
    expect(Number(width![1])).toBeLessThan(420);
    expect(Number(width![1])).toBeLessThanOrEqual(340);
    expect(pages).toContain('border-radius: var(--radius-xl)');
    expect(pages).toContain('--slm-bg');
    expect(pages).toContain('--slm-solid');
    expect(pages).not.toContain('slm-launch-grid');
    expect(pages).toContain('slm-popup-actions');
    expect(pages).not.toContain('.slm-popup.is-settings');
    expect(pages).not.toContain('.slm-popup.is-library');
    expect(pages).toMatch(/html\.slm-popup-page[\s\S]{0,180}width:\s*312px/);
    expect(popupApp).toContain('window.close');
    expect(popupApp).not.toContain('is-sheet');
    expect(pages).not.toMatch(/\.slm-popup \.slm-settings-body\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(pages).not.toMatch(/\.slm-popup \.slm-library-body\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(pages).toMatch(/\.slm-popup-actions\s*\{[^}]*flex-direction:\s*column/);
    expect(pages).toContain('slm-library-overlay');
    expect(pages).toContain('slm-settings-overlay');
    expect(pages).not.toContain('slm-options');
    expect(pages).not.toContain('slm-opt-card');
    const libWidth = /\.slm-library-dialog\s*\{[^}]*width:\s*min\((\d+(?:\.\d+)?)rem/.exec(pages);
    const libHeight = /\.slm-library-dialog\s*\{[^}]*max-height:\s*min\((\d+(?:\.\d+)?)rem/.exec(
      pages,
    );
    expect(libWidth).toBeTruthy();
    expect(libHeight).toBeTruthy();
    expect(Number(libWidth![1])).toBeGreaterThanOrEqual(36 * 1.4);
    expect(Number(libHeight![1])).toBeGreaterThanOrEqual(40 * 1.4);
    const settingsWidth = /\.slm-settings-dialog\s*\{[^}]*width:\s*min\((\d+(?:\.\d+)?)rem/.exec(
      pages,
    );
    const settingsHeight =
      /\.slm-settings-dialog\s*\{[^}]*max-height:\s*min\((\d+(?:\.\d+)?)rem/.exec(pages);
    expect(settingsWidth).toBeTruthy();
    expect(settingsHeight).toBeTruthy();
    // Settings sheet is a portrait single-column list.
    expect(Number(settingsHeight![1])).toBeGreaterThan(Number(settingsWidth![1]));
    const libraryCss = pages.slice(
      pages.indexOf('.slm-library-dialog {'),
      pages.indexOf('.slm-settings-overlay {'),
    );
    expect(libraryCss).not.toMatch(/--slm-accent/);
    expect(pages).toContain('-webkit-line-clamp: 2');
    expect(popupHtml).toContain('IBM+Plex+Sans');
    expect(popupHtml).toContain('stemlm_theme_boot');
    expect(popupHtml).toContain('color-scheme');
    expect(popupHtml).not.toMatch(/<body[^>]*data-stemlm-theme=/);
    expect(pages).toContain('--slm-popup-tile');
    expect(pages).toContain('slm-popup-toggle');
    expect(pages).toContain('slm-popup-switch');
    expect(pages).toMatch(/\.slm-popup-toggle-copy\s*\{[^}]*min-width:\s*0/);
    expect(pages).toMatch(/html\.slm-popup-page[\s\S]*?transition:\s*none/);
    expect(pages).not.toMatch(/html\.slm-popup-page[\s\S]{0,80}background:\s*transparent/);
    expect(optionsHtml).toContain('IBM+Plex+Sans');
    expect(savedPdfHtml).toContain('IBM+Plex+Sans');
    expect(savedLibraryHtml).toContain('IBM+Plex+Sans');
    expect(savedLibraryMain).toContain("katex/dist/katex.min.css");
    expect(popupApp).toContain('Open study panel');
    expect(popupApp).toContain('stemlm-enabled');
    expect(popupApp).toContain('STEMLM_TOGGLE_LABEL');
    expect(popupApp).not.toContain('openOptionsPage');
    expect(popupApp).not.toContain('Start here');
    expect(popupApp).not.toContain('beside send');
    expect(emptyState).toContain('Load conversation from this chat');
    expect(emptyState).not.toContain('beside send');
    expect(emptyState).not.toContain('Open Gemini');
    expect(wxt).toContain('*://chatgpt.com/*');
    expect(wxt).toContain('*://chat.openai.com/*');
    expect(wxt).toContain('*://claude.ai/*');
    expect(wxt).toContain('*://gemini.google.com/*');
    expect(wxt).toContain('*://grok.com/*');
    expect(hosts).toContain('*://chatgpt.com/*');
    expect(hosts).toContain('*://claude.ai/*');
    expect(hosts).toContain('*://gemini.google.com/*');
    expect(hosts).toContain('*://grok.com/*');
    expect(contentScript).toContain('CHAT_CONTENT_MATCHES');
    expect(contentScript).toContain("@/src/platforms/hosts");
  });

  it('interpolates theme tokens once — no nested bg/color transitions on rail, solution, formula, overlay', () => {
    const duration = /--slm-theme-duration:\s*(\d+)ms/.exec(tokens);
    expect(Number(duration![1])).toBeLessThanOrEqual(180);

    for (const selector of [
      '.slm-step-rail-btn',
      '.slm-tab',
      '.slm-stepnav-btn',
      '.slm-formula',
      '.slm-takeaway',
      '.slm-solution-step',
      '.slm-step-work-body',
    ]) {
      const block = cssRule(panel, selector);
      expect(block.length, selector).toBeGreaterThan(0);
      expect(transitionedProps(block), selector).not.toContain('background');
      expect(transitionedProps(block), selector).not.toContain('color');
    }

    const headerSrc = read('src/components/PanelHeader.tsx');
    expect(headerSrc).not.toMatch(/key=\{themeToBrandVariant/);

    const darkNav = /\[data-stemlm-theme='dark'\][\s\S]*?--slm-nav-shell:\s*(#[0-9a-fA-F]{6})/.exec(
      tokens,
    )?.[1]?.toLowerCase();
    expect(darkNav).toBeTruthy();
    expect(hexLuma(darkNav!)).toBeLessThan(hexLuma('#2f2e2e'));

    expect(panel).toMatch(/\.slm-step-work-body\s*\{[^}]*color:\s*var\(--slm-fg\)/);
    expect(panel).toMatch(/\.slm-card-body\s*\{[^}]*color:\s*var\(--slm-fg\)/);
    expect(panel).toMatch(/\.slm-solution\s*\{[^}]*color:\s*var\(--slm-fg\)/);
  });
});

function hexLuma(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function cssRule(source: string, selector: string): string {
  const needle = `${selector} {`;
  const at = source.indexOf(needle);
  if (at < 0) return '';
  const open = source.indexOf('{', at);
  const close = source.indexOf('}', open);
  if (open < 0 || close < 0) return '';
  return source.slice(open + 1, close);
}

function transitionedProps(block: string): string[] {
  const m = /(?:^|;)\s*transition:\s*([^;]+)/.exec(block);
  if (!m) return [];
  return m[1]!
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean);
}
