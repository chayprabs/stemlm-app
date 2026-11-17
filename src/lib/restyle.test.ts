import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { printStyles } from './pdf';
import { FONT_MONO, FONT_SANS, FONT_SANS_SVG, fontFaceCss } from './fonts';
import { MOTION_DUR, MOTION_EASE_OUT } from '@/src/components/step-motion';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('restyle: one design system across the panel', () => {
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
  const svgPresent = read('src/lib/svg-present.ts');
  const emit = read('src/lib/figure/emit.ts');
  const composer = read('src/lib/inject-control-css.ts');
  const pdf = read('src/lib/pdf.ts');

  const shipped = [
    tokens,
    tailwind,
    pages,
    contentStyle,
    popupHtml,
    optionsHtml,
    savedPdfHtml,
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
    // D4: both families ship with the extension (was: a Google Fonts stylesheet URL).
    expect(fontFaceCss()).toContain('font-family:"IBM Plex Sans"');
    expect(fontFaceCss()).toContain('font-family:"IBM Plex Mono"');

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
  });

  it('defines every token in both themes, and the panel uses only tokens that exist', () => {
    const light = declarations(lightBlock(tokens));
    const dark = declarations(darkBlock(tokens));
    const themed = [...light.keys()].filter((name) => /^--slm-(?!text-|leading-|tracking-|panel-|ease-|dur-|theme-)/.test(name));
    expect(themed.length).toBeGreaterThan(30);
    // Both themes are designed, not derived: the dark block restates every colour and shadow.
    for (const name of themed) expect(dark.has(name), `${name} has no dark value`).toBe(true);
    for (const name of dark.keys()) expect(light.has(name), `${name} is dark-only`).toBe(true);

    // A registered colour interpolates on a theme change; one that is not registered snaps.
    const registered = new Set([...tokens.matchAll(/@property (--slm-[\w-]+) \{ syntax: '<color>'/g)].map((m) => m[1]!));
    for (const name of themed) {
      if (/shadow|scrim/.test(name)) continue;
      expect(registered.has(name), `${name} is not registered with @property`).toBe(true);
    }

    const defined = new Set([
      ...light.keys(),
      ...[...tokens.matchAll(/@property (--slm-[\w-]+)/g)].map((m) => m[1]!),
      ...[...panel.matchAll(/(--slm-[\w-]+)\s*:/g)].map((m) => m[1]!),
      // Set per label by DiagramRenderer: the label kernel's size in frame-width units.
      '--slm-math-size',
    ]);
    for (const [, name] of panel.matchAll(/var\((--(?:slm|radius|font)-[\w-]+)/g)) {
      expect(defined.has(name!), `panel.css uses ${name}, which nothing defines`).toBe(true);
    }
  });

  it('keeps text and meaningful icons at WCAG AA on the surfaces they sit on, in both themes', () => {
    for (const [theme, block] of [['light', lightBlock(tokens)], ['dark', `${lightBlock(tokens)}\n${darkBlock(tokens)}`]] as const) {
      const value = (name: string) => {
        const hex = lastHex(block, name);
        expect(hex, `${theme} ${name}`).toBeTruthy();
        return hex!;
      };
      const ratio = (fg: string, bg: string) => contrast(value(fg), value(bg));

      // Reading text, labels and signal-coloured text on the three page surfaces.
      for (const fg of ['--slm-fg', '--slm-fg-muted', '--slm-fg-subtle', '--slm-signal-ink']) {
        for (const bg of ['--slm-bg', '--slm-bg-subtle', '--slm-bg-elevated']) {
          expect(ratio(fg, bg), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      // Text on the tinted and filled objects: formula well, figure plate, answer, solid buttons,
      // the "copied" and "failed" states, the answer-level flags.
      for (const [fg, bg] of [
        ['--slm-formula-fg', '--slm-formula-bg'],
        ['--slm-fg', '--slm-plate'],
        ['--slm-fg-subtle', '--slm-plate'],
        ['--slm-fg', '--slm-signal-soft'],
        ['--slm-signal-ink', '--slm-signal-soft'],
        ['--slm-fg', '--slm-bg-muted'],
        ['--slm-solid-fg', '--slm-solid'],
        ['--slm-solid-fg', '--slm-solid-hover'],
        ['--slm-success', '--slm-success-soft'],
        ['--slm-error', '--slm-error-soft'],
        ['--slm-fg', '--slm-error-soft'],
        ['--slm-amber', '--slm-amber-dim'],
      ] as const) {
        expect(ratio(fg, bg), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
      // The current step: a white numeral on the strong signal fill, and that fill on the page.
      // Graphics need 3:1; the brand orange itself does not reach it under white, hence the token.
      expect(contrast('#ffffff', value('--slm-signal-strong')), `${theme}: numeral on the current mark`).toBeGreaterThanOrEqual(3);
      expect(ratio('--slm-signal-strong', '--slm-bg'), `${theme}: current mark on the page`).toBeGreaterThanOrEqual(3);
      expect(ratio('--slm-ring', '--slm-bg'), `${theme}: focus ring`).toBeGreaterThanOrEqual(3);
      // Ink is never pure black or pure white: it is set a step back from the extremes.
      expect(['#000000', '#ffffff']).not.toContain(value('--slm-fg').toLowerCase());
    }
    // The formula well is a surface of the page family, never a dark slab on a light page.
    expect(Math.abs(luma(lastHex(lightBlock(tokens), '--slm-formula-bg')!) - luma(lastHex(lightBlock(tokens), '--slm-bg')!))).toBeLessThan(12);
    expect(Math.abs(luma(lastHex(darkBlock(tokens), '--slm-formula-bg')!) - luma(lastHex(darkBlock(tokens), '--slm-bg')!))).toBeLessThan(12);
  });

  it('draws the panel from tokens: no raw colour in panel.css but white on the signal fill', () => {
    const css = withoutComments(panel);
    const hexes = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    expect(hexes.filter((hex) => hex !== '#ffffff')).toEqual([]);
    // Each white is the glyph on the strong signal fill, in the same rule.
    for (const rule of css.split('}')) {
      if (/#ffffff/i.test(rule)) expect(rule).toMatch(/background:\s*var\(--slm-signal-strong\)/);
    }
    expect(css).not.toMatch(/\b(?:rgba?|hsla?)\(/);
    // One accent: nothing in the panel is teal or blue, and primary buttons are solid ink.
    expect(css).not.toMatch(/--slm-(?:teal|blue|accent-hover)\b/);
    expect(cssRule(panel, '.slm-btn-soft')).toMatch(/background:\s*var\(--slm-solid\)/);
    expect(cssRule(panel, '.slm-stepnav-btn--next')).toMatch(/background:\s*var\(--slm-solid\)/);
    expect(cssRule(panel, '.slm-followup-action--ask')).toMatch(/background:\s*var\(--slm-solid\)/);
  });

  it('gives every control of the panel the same visible focus ring', () => {
    const ring = /outline:\s*2px solid var\(--slm-ring\)/;
    for (const selector of [
      '.slm-btn',
      '.slm-icon-btn',
      '.slm-content-scale-btn',
      '.slm-followup-action',
      '.slm-tab',
      '.slm-session-pill',
      '.slm-session-pill-remove',
      '.slm-question-toggle',
      '.slm-quickcheck-hide',
      '.slm-stepnav-btn',
      '.slm-resize-handle',
      '.slm-banner-details summary',
      '.slm-banner-undo',
    ]) {
      expect(ruleFor(panel, `${selector}:focus-visible`), `${selector} has no focus ring`).toMatch(ring);
    }
    // The step marks are round and sit in a scroller, so their ring is drawn on the mark itself.
    expect(ruleFor(panel, '.slm-step-rail-btn:focus-visible .slm-step-rail-mark')).toMatch(ring);
    // A ring is only ever removed from things that take focus without being controls.
    const removed = [...withoutComments(panel).matchAll(/([^{}]+)\{[^}]*outline:\s*none[^}]*\}/g)].map((m) => m[1]!.trim());
    expect(removed.sort()).toEqual([
      '.slm-lightbox-dialog:focus',
      '.slm-panel:focus',
      '.slm-quickcheck-a-inner:focus',
      '.slm-step-rail-btn:focus-visible',
    ]);
  });

  it('has no sidebar: the steps are one row of marks above the page', () => {
    expect(cssRule(panel, '.slm-steps-layout')).toMatch(/flex-direction:\s*column/);
    expect(cssRule(panel, '.slm-step-rail-track')).toMatch(/flex-direction:\s*row/);
    const strip = cssRule(panel, '.slm-step-rail');
    expect(strip).toMatch(/overflow-x:\s*auto/);
    expect(strip).toMatch(/overflow-y:\s*hidden/);
    expect(strip).toMatch(/scrollbar-width:\s*none/);
    expect(strip).not.toMatch(/(?:^|[\s;])width:/);
    // No titles, no outline column, no connector between the marks.
    for (const gone of ['.slm-step-rail-label', '.slm-step-rail-title', '.slm-step-rail-line', '--slm-rail-size', '.slm-outline', '.slm-toc']) {
      expect(panel, gone).not.toContain(gone);
    }
    expect(panel).not.toMatch(/\.slm-step-rail-(?:item|btn|track)[^{,]*::(?:before|after)/);
    // The first mark shares the reading column's left edge, whatever the panel's width.
    const track = cssRule(panel, '.slm-step-rail-track');
    expect(track).toMatch(/padding-left:\s*max\(/);
    expect(track).toContain('var(--slm-measure)');
    expect(track).toContain('var(--slm-scroll-gutter)');
    expect(read('src/components/StepList.tsx')).not.toMatch(/slm-step-rail-(?:label|title)/);
  });

  it('caps the question, docks the sheet and keeps the questions of a chat on one scrolling row', () => {
    // Collapsed to two lines; opened, a very long question scrolls inside a cap instead of
    // pushing the working off the panel.
    expect(panel).toMatch(/\.slm-topic-scroll\.is-single \.slm-topic\s*\{[^}]*-webkit-line-clamp:\s*2/);
    const question = cssRule(panel, '.slm-topic-scroll');
    expect(question).toMatch(/max-height:\s*9\.25rem/);
    expect(question).toMatch(/overflow-y:\s*auto/);

    const sheet = cssRule(panel, '.slm-panel');
    // A column flush with the window's right edge at full height: a hairline where it meets the
    // chat, and nothing that floats it over the page (no inset, rounding or shadow).
    for (const edge of ['top', 'right', 'bottom']) expect(sheet).toMatch(new RegExp(`[\\s;]${edge}:\\s*0;`));
    expect(sheet).toMatch(/border-left:\s*1px solid var\(--slm-border\)/);
    expect(sheet).not.toMatch(/border-radius|box-shadow|inset/);
    expect(sheet).toMatch(/container-type:\s*inline-size/);

    const sessions = cssRule(panel, '.slm-session-switch');
    expect(sessions).toMatch(/overflow-x:\s*auto/);
    expect(sessions).toMatch(/flex-wrap:\s*nowrap/);
    expect(sessions).toMatch(/scrollbar-width:\s*none/);
    expect(sessions).toMatch(/border-bottom:\s*1px solid var\(--slm-border-subtle\)/);
    expect(panel).toContain('.slm-session-switch::-webkit-scrollbar');

    expect(cssRule(panel, '.slm-header-leading')).toMatch(/justify-content:\s*flex-start/);
    // The view switch is sized from the wordmark, so the two always line up.
    expect(cssRule(panel, '.slm-tabs')).toMatch(/height:\s*calc\(var\(--slm-brand-size/);
    // Removed chrome stays removed.
    for (const gone of ['.slm-subject-chip', '.slm-progress-count', '.slm-review ', '.slm-solution-q', '.slm-question-icon']) {
      expect(panel, gone).not.toContain(gone);
    }
  });

  it('popup overlay uses panel tokens, a compact action shell, and the four shipped chat hosts', () => {
    const settings = read('assets/settings.css');
    const sheets = withoutComments(pages) + withoutComments(settings);

    // Chrome sizes the popup window from its document and cannot shrink it again, so the width is
    // one fixed number on every box, and nothing animates it.
    expect(Number(/\.slm-popup\s*\{[^}]*width:\s*(\d+)px/.exec(pages)?.[1])).toBe(312);
    expect(pages).toMatch(/html\.slm-popup-page[\s\S]{0,180}width:\s*312px/);
    expect(pages).toMatch(/html\.slm-popup-page[\s\S]*?transition:\s*none/);
    expect(pages).not.toMatch(/html\.slm-popup-page[\s\S]{0,80}background:\s*transparent/);
    expect(popupApp).toContain('window.close');
    expect(popupApp).not.toContain('is-sheet');

    // The pages are drawn from the same tokens as the panel: no raw colour, no theme fork, and no
    // second accent. Every custom property they read is a token or is declared beside its use.
    expect(sheets.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
    expect(sheets).not.toMatch(/\b(?:rgba?|hsla?)\(/);
    expect(sheets).not.toMatch(/--slm-(?:teal|blue|accent)\b/);
    expect(sheets).not.toContain("[data-stemlm-theme='dark']");
    const declared = new Set(
      [...(tokens + panel + sheets).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!),
    );
    // Set inline by the segmented control (src/components/SettingsOverlay.tsx).
    for (const inline of ['--slm-seg-count', '--slm-seg-index']) declared.add(inline);
    const read_ = [...new Set([...sheets.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!))];
    expect(read_.filter((name) => !declared.has(name))).toEqual([]);

    // Solid ink for the primary action; orange only where the one accent belongs.
    expect(cssRule(pages, '.slm-popup-open.is-primary')).toMatch(/background:\s*var\(--slm-solid\)/);
    expect(cssRule(pages, '.slm-library-merge.is-primary')).toMatch(/background:\s*var\(--slm-solid\)/);
    expect(cssRule(pages, '.slm-library-chip.is-active')).toMatch(/background:\s*var\(--slm-solid\)/);
    const signal = [...sheets.matchAll(/([^{}]+)\{[^}]*var\(--slm-signal[\w-]*\)[^}]*\}/g)].map((m) => m[1]!.trim());
    expect(signal).toEqual(['.slm-welcome-kicker']);

    // One neutral switch for the popup and settings: ink when on, an outline when off.
    expect(ruleFor(pages, '.slm-popup-toggle.is-on .slm-popup-switch')).toMatch(/background:\s*var\(--slm-solid\)/);
    expect(ruleFor(pages, '.slm-set-switch.is-on')).toMatch(/background:\s*var\(--slm-solid\)/);
    expect(ruleFor(pages, '.slm-set-switch')).toMatch(/border:\s*1\.5px solid var\(--slm-fg-subtle\)/);
    expect(optionsHtml).not.toMatch(/slm-set-switch|#0e7c76|#3dcdc4/);
    // A long label can never push the switch out of the row.
    expect(pages).toMatch(/\.slm-popup-toggle \.slm-popup-row-title\s*\{[^}]*min-width:\s*0/);
    expect(pages).toMatch(/\.slm-popup-actions\s*\{[^}]*flex-direction:\s*column/);

    // Every interactive thing on the pages shows the shared 2px ring on keyboard focus.
    for (const scope of ['.slm-popup', '.slm-library-dialog', '.slm-settings-dialog']) {
      expect(pages, scope).toContain(`:where(${scope}) button:focus-visible`);
    }
    expect(pages.match(/outline:\s*2px solid var\(--slm-ring\)/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(pages).not.toMatch(/outline:\s*1(?:\.5)?px solid/);

    // Type and motion stay on the token scales.
    // (An `em` is relative to that scale: it only keeps KaTeX in proportion to the text around it.)
    expect(sheets.match(/font-size:\s*[\d.]+(?:px|rem)\b/g) ?? []).toEqual([]);
    for (const [, value] of sheets.matchAll(/transition:\s*([^;]+);/g)) {
      if (value!.trim() === 'none' || value!.includes('none !important')) continue;
      expect(value, value).toMatch(/var\(--slm-dur-\d\)/);
      expect(value, value).toMatch(/var\(--slm-ease-out\)/);
    }

    // The library and settings are also dialogs; their sheets stay large enough to work in.
    expect(pages).toContain('slm-library-overlay');
    expect(pages).toContain('slm-settings-overlay');
    const libWidth = /\.slm-library-dialog\s*\{[^}]*width:\s*min\((\d+(?:\.\d+)?)rem/.exec(pages);
    const libHeight = /\.slm-library-dialog\s*\{[^}]*max-height:\s*min\((\d+(?:\.\d+)?)rem/.exec(pages);
    expect(Number(libWidth?.[1])).toBeGreaterThanOrEqual(36 * 1.4);
    expect(Number(libHeight?.[1])).toBeGreaterThanOrEqual(40 * 1.4);
    const settingsWidth = /\.slm-settings-dialog\s*\{[^}]*width:\s*min\((\d+(?:\.\d+)?)rem/.exec(pages);
    const settingsHeight = /\.slm-settings-dialog\s*\{[^}]*max-height:\s*min\((\d+(?:\.\d+)?)rem/.exec(pages);
    // Settings is a portrait single-column list.
    expect(Number(settingsHeight?.[1])).toBeGreaterThan(Number(settingsWidth?.[1]));
    expect(pages).toContain('-webkit-line-clamp: 2');

    // D4: each page registers the bundled faces (was: a Google Fonts <link> in its HTML).
    for (const main of [
      'entrypoints/popup/main.tsx',
      'entrypoints/options/main.tsx',
      'entrypoints/pdf/main.ts',
      'entrypoints/saved-library/main.tsx',
      'entrypoints/welcome/main.tsx',
    ]) {
      expect(read(main), main).toContain('installFontFaces(document, extensionAssetUrl)');
    }
    // Pages that typeset math load KaTeX's sheet; the welcome demo also needs the panel's own.
    expect(savedLibraryMain).toContain('katex/dist/katex.min.css');
    const welcomeMain = read('entrypoints/welcome/main.tsx');
    expect(welcomeMain).toContain('katex/dist/katex.min.css');
    expect(welcomeMain).toContain('assets/panel.css');

    // First paint: the theme comes from the boot cache, never from a hard-coded attribute, and
    // the page colours before the sheet arrives are the canvas tokens of each theme.
    expect(popupHtml).toContain('stemlm_theme_boot');
    for (const html of [popupHtml, optionsHtml, savedLibraryHtml, read('entrypoints/welcome/index.html')]) {
      expect(html).toContain('color-scheme');
      expect(html).not.toMatch(/<body[^>]*data-stemlm-theme=/);
      expect(html).toContain(/--slm-bg:\s*(#[0-9a-f]{6})/.exec(tokens)![1]!);
      expect(html).toContain('#151515');
    }

    expect(popupApp).toContain('Open study panel');
    expect(popupApp).toContain('stemlm-enabled');
    expect(popupApp).toContain('STEMLM_TOGGLE_LABEL');
    expect(popupApp).not.toContain('openOptionsPage');
    expect(popupApp).not.toContain('Start here');
    expect(popupApp).not.toContain('beside send');
    expect(emptyState).toContain('Load conversation from this chat');
    expect(emptyState).not.toContain('beside send');
    expect(emptyState).not.toContain('Open Gemini');
    for (const source of [wxt, hosts]) {
      expect(source).not.toContain('*://');
      expect(source).toContain('https://chatgpt.com/*');
      expect(source).not.toContain('https://chat.openai.com/*');
      expect(source).toContain('https://claude.ai/*');
      expect(source).toContain('https://gemini.google.com/*');
      expect(source).toContain('https://grok.com/*');
    }
    expect(contentScript).toContain('CHAT_CONTENT_MATCHES');
    expect(contentScript).toContain("@/src/platforms/hosts");
  });

  it('changes theme by interpolating the tokens once, within budget', () => {
    const duration = /--slm-theme-duration:\s*(\d+)ms/.exec(tokens);
    expect(duration).toBeTruthy();
    expect(Number(duration![1])).toBeLessThanOrEqual(180);

    // Every colour that differs between the themes is in the one transition on the theme root.
    const transition = /transition:\s*([\s\S]*?);/.exec(lightBlock(tokens))?.[1] ?? '';
    const light = declarations(lightBlock(tokens));
    const dark = declarations(darkBlock(tokens));
    for (const [name, value] of dark) {
      if (/shadow|scrim/.test(name) || light.get(name) === value) continue;
      expect(transition, `${name} changes with the theme but is not transitioned`).toContain(`${name} var(--slm-theme-duration)`);
    }

    // So no element transitions its own background or colour on top of that.
    for (const selector of [
      '.slm-step-rail-btn',
      '.slm-step-rail-mark',
      '.slm-tab',
      '.slm-stepnav-btn',
      '.slm-formula',
      '.slm-takeaway',
      '.slm-quickcheck',
      '.slm-answer',
      '.slm-solution-step',
      '.slm-step-work-body',
    ]) {
      const block = cssRule(panel, selector);
      expect(block.length, selector).toBeGreaterThan(0);
      expect(transitionedProps(block), selector).not.toContain('background');
      expect(transitionedProps(block), selector).not.toContain('color');
    }
    expect(read('src/components/PanelHeader.tsx')).not.toMatch(/key=\{themeToBrandVariant/);

    expect(panel).toMatch(/\.slm-step-work-body\s*\{[^}]*color:\s*var\(--slm-fg\)/);
    expect(panel).toMatch(/\.slm-card-body\s*\{[^}]*color:\s*var\(--slm-fg\)/);
    expect(panel).toMatch(/\.slm-solution\s*\{[^}]*color:\s*var\(--slm-fg\)/);
  });

  it('keeps motion on the token scale and switches all of it off for reduced motion', () => {
    const css = withoutComments(panel);
    // Durations come from tokens. The two exceptions are the loading skeleton, the one thing
    // allowed to loop, and the equation fade, which follows the scroll position, not the clock.
    const timed = [...css.matchAll(/(?:transition|animation):\s*([^;]+);/g)].map((m) => m[1]!.replace(/\s+/g, ' '));
    const offScale = timed.filter((value) => value !== 'none' && /(?<![\w-])\d*\.?\d+m?s\b/.test(value.replace(/var\([^)]*\)/g, '')));
    expect(offScale).toEqual(['slm-sk-pulse 1.6s var(--slm-ease-in-out) infinite']);
    const looping = timed.filter((value) => /\binfinite\b/.test(value));
    expect(looping).toEqual(['slm-sk-pulse 1.6s var(--slm-ease-in-out) infinite']);

    // The scripted motion repeats the same scale in numbers.
    const ms = (step: number) => Number(new RegExp(`--slm-dur-${step}:\\s*(\\d+)ms`).exec(tokens)?.[1]);
    expect(MOTION_DUR[1] * 1000).toBe(ms(1));
    expect(MOTION_DUR[2] * 1000).toBe(ms(2));
    expect(MOTION_DUR[3] * 1000).toBe(ms(3));
    expect(tokens).toContain(`--slm-ease-out: cubic-bezier(${MOTION_EASE_OUT.join(', ')})`);

    // Reduced motion: the tokens zero every duration and the theme no longer fades,
    const reducedTokens = tokens.slice(tokens.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const step of [1, 2, 3, 4]) expect(reducedTokens).toMatch(new RegExp(`--slm-dur-${step}:\\s*0ms`));
    expect(reducedTokens).toMatch(/transition:\s*none/);
    // and the panel names everything that animates or shifts, so nothing depends on the tokens alone.
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/animation:\s*none/);
    for (const [, selector, body] of css.slice(0, css.indexOf('@media (prefers-reduced-motion: reduce)')).matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const animation = /animation:\s*(slm-[\w-]+)/.exec(body!)?.[1];
      if (!animation || animation === 'slm-scroll-fade') continue;
      const subject = selector!.trim().split(',')[0]!.trim().split(/\s+/).pop()!.replace(/:[\w-]+(?:\([^)]*\))?$/, '');
      expect(reduced, `${selector!.trim()} animates (${animation}) but is not stilled`).toContain(subject);
    }
    for (const pressed of ['.slm-btn:active', '.slm-icon-btn:active', '.slm-step-rail-btn:active', '.slm-stepnav-btn:active', '.slm-followup-action:active']) {
      expect(reduced, pressed).toContain(pressed);
    }
    expect(reduced).toMatch(/transform:\s*none/);
    expect(reduced).toMatch(/scroll-behavior:\s*auto/);
  });
});

function lightBlock(tokens: string): string {
  return tokens.slice(tokens.indexOf(':where([data-stemlm-theme])'), tokens.indexOf("[data-stemlm-theme='dark'],"));
}

function darkBlock(tokens: string): string {
  const from = tokens.indexOf("[data-stemlm-theme='dark'],");
  return tokens.slice(from, tokens.indexOf('@media (prefers-reduced-motion: reduce)', from));
}

/** Custom properties declared in a block, by name. */
function declarations(block: string): Map<string, string> {
  return new Map([...block.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!.trim()]));
}

function lastHex(block: string, name: string): string | undefined {
  const all = [...block.matchAll(new RegExp(`^\\s*${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`, 'gm'))];
  return all[all.length - 1]?.[1];
}

function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** WCAG 2 relative luminance and contrast ratio of two #rrggbb colours. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Perceived lightness on a 0 to 255 scale, for "same family of surface" comparisons. */
function luma(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * parseInt(h.slice(0, 2), 16) + 0.7152 * parseInt(h.slice(2, 4), 16) + 0.0722 * parseInt(h.slice(4, 6), 16);
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

/** Body of the first rule whose selector list contains `selector`, alone or among others. */
function ruleFor(source: string, selector: string): string {
  for (const [, selectors, body] of withoutComments(source).matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (selectors!.split(',').some((item) => item.trim() === selector)) return body!;
  }
  return '';
}

function transitionedProps(block: string): string[] {
  const m = /(?:^|;)\s*transition:\s*([^;]+)/.exec(block);
  if (!m) return [];
  return m[1]!
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean);
}
