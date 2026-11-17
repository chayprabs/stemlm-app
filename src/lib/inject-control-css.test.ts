import { describe, it, expect } from 'vitest';
import { INJECT_RADIUS, INJECT_SIGNAL, INJECT_SIGNAL_STRONG, INJECT_SIZE_PX, injectControlCss } from './inject-control-css';

const SCOPE = '.slm-welcome ';
/** The control as a crop on the welcome page. */
const pageCss = injectControlCss(SCOPE, (scheme) => `[data-stemlm-theme="${scheme}"]`);
/** The control in stemLM's shadow root on a chat page: the scheme is the measured one, on its wrapper. */
const shadowCss = injectControlCss('', (scheme) => `.slm-fab-wrap[data-scheme="${scheme}"]`);

/** Every selector of every style rule, including those inside @media; keyframe steps are skipped. */
function selectors(css: string): string[] {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
  return [...plain.matchAll(/([^{}@]+)\{[^{}]*\}/g)]
    .flatMap((m) => m[1]!.split(','))
    .map((selector) => selector.trim())
    .filter(Boolean);
}

/** The declarations of the first rule whose selector list is exactly `selector`. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
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
  it('scopes every rule when it is written into a page', () => {
    const all = selectors(pageCss);
    expect(all.length).toBeGreaterThan(20);
    for (const selector of all) {
      expect(selector.startsWith('.slm-welcome ') || selector.startsWith('[data-stemlm-theme="dark"] '), selector).toBe(true);
      expect(selector, selector).toMatch(/\.slm-/);
    }
  });

  it('needs no scope inside the shadow root, where the scheme is on the wrapper', () => {
    for (const selector of selectors(shadowCss)) expect(selector.startsWith('.slm-'), selector).toBe(true);
    expect(shadowCss).toContain('.slm-fab-wrap[data-scheme="dark"] .slm-inject-btn {');
  });

  it('draws the same control in both worlds: the two sheets differ only by their scope', () => {
    const unscoped = pageCss.replaceAll('[data-stemlm-theme="dark"]', '.slm-fab-wrap[data-scheme="dark"]').replaceAll(SCOPE, '');
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

  it('is the neighbour of the chat\'s attach button: its size, corner and ink, and no surface at rest', () => {
    const base = rule(shadowCss, '.slm-inject-btn');
    // Measured from the attach button at run time; the fallbacks draw the welcome page's crops.
    expect(base).toContain(`width: var(--slm-inject-size, ${INJECT_SIZE_PX}px)`);
    expect(base).toContain(`height: var(--slm-inject-size, ${INJECT_SIZE_PX}px)`);
    expect(base).toContain(`border-radius: var(--slm-inject-radius, ${INJECT_RADIUS})`);
    expect(base).toContain('--slm-inject-ink: var(--slm-inject-host-ink, #16161a)');
    expect(rule(shadowCss, '.slm-fab-wrap[data-scheme="dark"] .slm-inject-btn')).toContain('--slm-inject-ink: var(--slm-inject-host-ink, #f2f2f2)');
    // A ghost button, like the chat's own: nothing painted until it is pointed at.
    expect(base).toMatch(/background:\s*transparent/);
    expect(base).toMatch(/border:\s*0/);
    expect(base).not.toMatch(/box-shadow/);
    expect(rule(shadowCss, '.slm-inject-btn:hover')).toMatch(/background:\s*color-mix\(in srgb, var\(--slm-inject-ink\) \d+%, transparent\)/);
    // Drawn as small as a 28 px neighbour, it still takes a 32 px press.
    expect(rule(shadowCss, '.slm-inject-btn::after')).toContain('inset: min(0px, calc((var(--slm-inject-size, 32px) - 32px) / 2))');
    // No glow anywhere, in any state.
    expect(shadowCss).not.toMatch(/box-shadow:\s*0 0 0/);
    // Its box is placed by measurement, with no easing that could trail the composer.
    const wrap = rule(shadowCss, '.slm-fab-wrap');
    expect(wrap).toMatch(/position:\s*fixed/);
    expect(wrap).not.toMatch(/transition|z-index/);
  });

  it('shows the mark, not a plus, and swaps it for a tick or a stop mark in the same box', () => {
    expect(shadowCss).toContain('.slm-inject-mark .slm-inject-apex');
    expect(shadowCss).not.toContain('slm-inject-plus');
    expect(rule(shadowCss, '.slm-inject-glyph svg')).toMatch(/opacity:\s*0/);
    const visible = shadowCss.slice(shadowCss.indexOf('.slm-inject-glyph.is-mark .slm-inject-mark'));
    expect(visible).toMatch(/^\.slm-inject-glyph\.is-mark \.slm-inject-mark,\s*\.slm-inject-glyph\.is-tick \.slm-inject-tick,\s*\.slm-inject-glyph\.is-alert \.slm-inject-alert\s*\{[^}]*opacity:\s*1/);
    // Every glyph fills the one glyph box: nothing about the control's size depends on its state.
    expect(rule(shadowCss, '.slm-inject-glyph svg')).toMatch(/inset:\s*0/);
    for (const state of ['is-attached', 'is-panel-open', 'is-error', 'is-loading']) {
      const stateRules = [...shadowCss.matchAll(new RegExp(`\\.slm-inject-btn\\.${state}[^{]*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]!).join('');
      expect(stateRules, state).not.toMatch(/width|height|padding|margin|border(?!-radius)/);
    }
  });

  it('keeps its states legible in both schemes and its focus ring visible', () => {
    expect(INJECT_SIGNAL.toLowerCase()).toBe('#ff6b2c');
    // Panel open: a white tick on the strong signal fill.
    expect(shadowCss).toMatch(new RegExp(`\\.slm-inject-btn\\.is-panel-open:hover\\s*\\{[^}]*background:\\s*${INJECT_SIGNAL_STRONG};[^}]*color:\\s*#ffffff`));
    expect(contrast('#ffffff', INJECT_SIGNAL_STRONG)).toBeGreaterThanOrEqual(3);
    // On for this question: the tick is the signal as ink; could not be: the error ink. Each is
    // chosen per scheme against the lightest and darkest composer it lands on.
    const ink = (scheme: 'light' | 'dark', name: string) => {
      const block = scheme === 'dark' ? rule(shadowCss, '.slm-fab-wrap[data-scheme="dark"] .slm-inject-btn') : rule(shadowCss, '.slm-inject-btn');
      return new RegExp(`--slm-inject-${name}:\\s*(#[0-9a-f]{6})`).exec(block)?.[1];
    };
    expect(rule(shadowCss, '.slm-inject-btn.is-attached')).toMatch(/color:\s*var\(--slm-inject-signal-ink\)/);
    expect(rule(shadowCss, '.slm-inject-btn.is-error')).toMatch(/color:\s*var\(--slm-inject-error\)/);
    for (const name of ['signal-ink', 'error']) {
      expect(contrast(ink('light', name)!, '#ffffff'), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink('light', name)!, '#f0f4f9'), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink('dark', name)!, '#303030'), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink('dark', name)!, '#1f1f1f'), name).toBeGreaterThanOrEqual(4.5);
    }
    // The ring is ink, not orange, so it shows on any chat page behind it.
    expect(shadowCss).toMatch(/\.slm-inject-btn:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--slm-inject-ink\);[^}]*outline-offset:\s*2px/);
  });

  it('says what it does beside itself, without taking the pointer', () => {
    const tip = rule(shadowCss, '.slm-inject-tip');
    expect(tip).toMatch(/pointer-events:\s*none/);
    expect(tip).toMatch(/opacity:\s*0/);
    expect(tip).toMatch(/position:\s*absolute/);
    // Shown on hover after a beat, at once for the keyboard and after a press.
    expect(rule(shadowCss, '.slm-inject-btn:hover + .slm-inject-tip')).toMatch(/opacity:\s*1;[^}]*transition-delay:\s*0\.4s/);
    expect(shadowCss).toMatch(/\.slm-inject-btn:focus-visible \+ \.slm-inject-tip,\s*\.slm-inject-tip\.is-open\s*\{[^}]*opacity:\s*1/);
    // Light text on a dark slip in a light chat, the reverse in a dark one.
    const colours = (block: string) => [/--slm-inject-tip-bg:\s*(#[0-9a-f]{6})/, /--slm-inject-tip-fg:\s*(#[0-9a-f]{6})/].map((re) => re.exec(block)![1]!);
    for (const block of [tip, rule(shadowCss, '.slm-fab-wrap[data-scheme="dark"] .slm-inject-tip')]) {
      const [bg, fg] = colours(block);
      expect(contrast(bg!, fg!)).toBeGreaterThanOrEqual(7);
    }
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
