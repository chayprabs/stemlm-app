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
  const savedPdfHtml = read('entrypoints/saved-pdf/index.html');
  const popupApp = read('entrypoints/popup/App.tsx');
  const emptyState = read('src/components/EmptyState.tsx');
  const wxt = read('wxt.config.ts');
  const contentScript = read('entrypoints/content/index.ts');
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

  it('ships dark canvas #151515, inset boxes #111111, body text #ededed, theme ≤180ms', () => {
    expect(tokens).toContain('--slm-bg: #151515');
    expect(tokens).toContain('--slm-formula-bg: #111111');
    expect(tokens).toContain('--slm-fg: #ededed');
    const duration = /--slm-theme-duration:\s*(\d+)ms/.exec(tokens);
    expect(duration).toBeTruthy();
    expect(Number(duration![1])).toBeLessThanOrEqual(180);

    expect(tokens).toContain('--slm-bg: #f5f5f5');
    expect(tokens).toContain('--slm-formula-bg: #efefef');
    expect(tokens).toContain('--slm-fg: #171717');
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
    expect(panel).toMatch(
      /\.slm-panel\[data-stemlm-theme='light'\] \.slm-stepnav--overlay\s*\{[^}]*color-mix/,
    );
    expect(panel).toMatch(/\.slm-session-switch\s*\{[^}]*overflow-x:\s*auto/);
    expect(panel).toMatch(/\.slm-session-switch\s*\{[^}]*scrollbar-width:\s*none/);
    expect(panel).toContain('.slm-session-switch::-webkit-scrollbar');
    expect(panel).toContain('scrollbar-width: none');
    expect(panel).toContain('.slm-header-leading');
    expect(panel).toMatch(/\.slm-header-leading\s*\{[\s\S]*justify-content:\s*flex-start/);
    expect(panel).toMatch(/\.slm-tabs\s*\{[\s\S]*height:\s*calc\(var\(--slm-brand-size/);
  });

  it('popup overlay uses panel tokens, a wider rounded shell, and Gemini-only hosts', () => {
    const width = /\.slm-popup\s*\{[^}]*width:\s*(\d+)px/.exec(pages);
    expect(width).toBeTruthy();
    expect(Number(width![1])).toBeGreaterThan(420);
    expect(pages).toContain('border-radius: var(--radius-xl)');
    expect(pages).toContain('--slm-bg');
    expect(pages).toContain('--slm-solid');
    expect(pages).toContain('slm-launch-grid');
    expect(pages).toContain('slm-library-overlay');
    expect(popupHtml).toContain('IBM+Plex+Sans');
    expect(optionsHtml).toContain('IBM+Plex+Sans');
    expect(savedPdfHtml).toContain('IBM+Plex+Sans');
    expect(popupApp).not.toContain('Open study panel');
    expect(popupApp).not.toContain('Load conversation from this chat');
    expect(popupApp).not.toContain('beside send');
    expect(emptyState).not.toContain('beside send');
    expect(emptyState).not.toContain('Open Gemini');
    expect(wxt).toContain('*://gemini.google.com/*');
    expect(wxt).not.toMatch(/chatgpt|claude|grok\.com/i);
    expect(contentScript).toContain("*://gemini.google.com/*");
    expect(contentScript).not.toMatch(/chatgpt|claude\.ai|grok\.com/i);
  });
});
