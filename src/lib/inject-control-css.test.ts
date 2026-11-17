import { describe, it, expect } from 'vitest';
import { INJECT_RADIUS, INJECT_SIGNAL, INJECT_SIGNAL_STRONG, INJECT_SIZE_PX, injectControlCss } from './inject-control-css';
import { _slotCss } from './composer-slot';

const SLOT = '[data-stemlm-composer-slot] ';
/** The control docked in the chat page's own DOM. */
const pageCss = injectControlCss(SLOT, (scheme) => `[data-stemlm-composer-slot][data-scheme="${scheme}"]`);
/** The control fixed inside stemLM's shadow root. */
const shadowCss = injectControlCss('', (scheme) => `.slm-fab-wrap--${scheme}`);

/** Every selector of every style rule, including those inside @media; keyframe steps are skipped. */
function selectors(css: string): string[] {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
  return [...plain.matchAll(/([^{}@]+)\{[^{}]*\}/g)]
    .flatMap((m) => m[1]!.split(','))
    .map((selector) => selector.trim())
    .filter(Boolean);
}

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

describe('composer control stylesheet', () => {
  it('scopes every rule to the composer slot when it is written into the chat page', () => {
    const all = selectors(pageCss);
    expect(all.length).toBeGreaterThan(20);
    // Nothing here may reach an element of the host page: each selector starts at the slot.
    for (const selector of all) {
      expect(selector.startsWith('[data-stemlm-composer-slot]'), selector).toBe(true);
      expect(selector, selector).toMatch(/\.slm-/);
    }
    // The page's light or dark scheme is read from the slot itself.
    expect(pageCss).toContain('[data-stemlm-composer-slot][data-scheme="dark"] .slm-inject-btn {');
    expect(pageCss).toContain('[data-stemlm-composer-slot][data-scheme="light"] .slm-inject-btn {');
    // The slot's own stylesheet carries exactly these rules.
    expect(_slotCss).toContain(pageCss);
  });

  it('needs no scope inside the shadow root, where the scheme is a class on the wrapper', () => {
    const all = selectors(shadowCss);
    for (const selector of all) {
      expect(selector.startsWith('.slm-'), selector).toBe(true);
      expect(selector, selector).not.toContain('data-stemlm-composer-slot');
    }
    expect(shadowCss).toContain('.slm-fab-wrap--dark .slm-inject-btn {');
    expect(shadowCss).toContain('.slm-fab-wrap--light .slm-inject-btn {');
  });

  it('draws the same control in both worlds: the two sheets differ only by their scope', () => {
    const unscoped = pageCss
      .replaceAll('[data-stemlm-composer-slot][data-scheme="dark"]', '.slm-fab-wrap--dark')
      .replaceAll('[data-stemlm-composer-slot][data-scheme="light"]', '.slm-fab-wrap--light')
      .replaceAll(SLOT, '');
    expect(unscoped).toBe(shadowCss);
  });

  it('depends on nothing from the page it lands in', () => {
    for (const css of [pageCss, shadowCss]) {
      // Its custom properties are its own, or fall back: the chat page has none of stemLM's tokens.
      const own = new Set([...css.matchAll(/(--slm-inject-[\w-]+)\s*:/g)].map((m) => m[1]!));
      for (const [, name, fallback] of css.matchAll(/var\((--[\w-]+)(,[^)]*)?\)/g)) {
        expect(own.has(name!) || Boolean(fallback), `${name} is undefined on a chat page`).toBe(true);
      }
      expect(css).not.toMatch(/var\(--(?:slm-(?!inject-)|font-|radius-)/);
      expect(css).not.toMatch(/url\(|@import/);
    }
  });

  it('is a rounded square at a comfortable hit size, showing the mark and not a plus', () => {
    const base = shadowCss.slice(shadowCss.indexOf('.slm-inject-btn {'), shadowCss.indexOf('.slm-fab-wrap--dark'));
    expect(base).toContain(`width: var(--slm-inject-size, ${INJECT_SIZE_PX}px)`);
    expect(base).toContain(`height: var(--slm-inject-size, ${INJECT_SIZE_PX}px)`);
    expect(INJECT_SIZE_PX).toBeGreaterThanOrEqual(32);
    expect(base).toContain(`border-radius: ${INJECT_RADIUS}`);
    expect(base).not.toContain('border-radius: 50%');
    expect(shadowCss).toContain('.slm-inject-mark .slm-inject-apex');
    expect(shadowCss).not.toContain('slm-inject-plus');
    // Idle shows the mark; attached and panel-open swap it for the tick.
    expect(shadowCss).toMatch(/\.slm-inject-btn\.is-attached \.slm-inject-mark,\s*\.slm-inject-btn\.is-panel-open \.slm-inject-mark\s*\{[^}]*opacity:\s*0/);
    expect(shadowCss).toMatch(/\.slm-inject-btn\.is-attached \.slm-inject-tick,\s*\.slm-inject-btn\.is-panel-open \.slm-inject-tick\s*\{[^}]*opacity:\s*1/);
  });

  it('keeps its states legible in both schemes and its focus ring visible', () => {
    expect(INJECT_SIGNAL.toLowerCase()).toBe('#ff6b2c');
    // Panel open: a white tick on the strong signal fill.
    expect(shadowCss).toMatch(new RegExp(`\\.slm-inject-btn\\.is-panel-open\\s*\\{[^}]*background:\\s*${INJECT_SIGNAL_STRONG};[^}]*color:\\s*#ffffff`));
    expect(contrast('#ffffff', INJECT_SIGNAL_STRONG)).toBeGreaterThanOrEqual(3);
    // Attached: the tick is the signal as ink, chosen per scheme against that scheme's surface.
    const ink = (scheme: 'light' | 'dark') =>
      new RegExp(`\\.slm-fab-wrap--${scheme} \\.slm-inject-btn\\s*\\{[^}]*--slm-inject-signal-ink:\\s*(#[0-9a-f]{6})`).exec(shadowCss)?.[1];
    expect(shadowCss).toMatch(/\.slm-inject-btn\.is-attached\s*\{[^}]*color:\s*var\(--slm-inject-signal-ink\)/);
    expect(contrast(ink('light')!, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink('dark')!, '#222224')).toBeGreaterThanOrEqual(4.5);
    // The ring is ink, not orange, so it shows on any chat page behind it.
    expect(shadowCss).toMatch(/\.slm-inject-btn:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--slm-inject-ink\);[^}]*outline-offset:\s*2px/);
  });

  it('moves only while attaching, and not at all under reduced motion', () => {
    for (const css of [pageCss, shadowCss]) {
      const looping = [...css.matchAll(/animation:\s*([^;]+);/g)].map((m) => m[1]!).filter((value) => /infinite/.test(value));
      expect(looping.every((value) => value.startsWith('slm-inject-think'))).toBe(true);
      expect(looping.length).toBeGreaterThan(0);
      const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
      expect(reduced).toMatch(/transition:\s*none\s*!important/);
      expect(reduced).toMatch(/animation:\s*none/);
      expect(reduced).toMatch(/transform:\s*none/);
      // Transitions run on the panel's three steps, written out because the page has no tokens.
      const transitions = [...css.matchAll(/transition:\s*([^;]+);/g)].flatMap((m) => [...m[1]!.matchAll(/(\d*\.\d+)s/g)].map((d) => d[1]!));
      expect(transitions.length).toBeGreaterThan(0);
      for (const value of transitions) expect(['0.12', '0.18', '0.26'], `${value}s`).toContain(value);
    }
  });
});
