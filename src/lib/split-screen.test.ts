import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applySplit, removeSplit, SPLIT_STYLE_ID } from './split-screen';
import { DEFAULT_SPLIT_RATIO } from './split-ratio';

const sheet = () => document.getElementById(SPLIT_STYLE_ID)?.textContent ?? '';

function atWidth(px: number, run: () => void) {
  const previous = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: px });
  try {
    run();
  } finally {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previous });
  }
}

/** Layout the test DOM does not compute: where `el`'s right edge is. */
function rightEdge(el: Element, right: number) {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right, bottom: 600, width: right, height: 600, x: 0, y: 0, toJSON: () => ({}) });
}

describe('split-screen', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body></body>';
  });

  afterEach(() => {
    removeSplit();
  });

  it('narrows the page by exactly the panel width, with no page scrollbar', () => {
    atWidth(1600, () => {
      applySplit(0.5);
      expect(sheet()).toContain('html>body{width:calc(100% - 50vw)!important;min-width:0!important');
      expect(sheet()).toContain('html{overflow-x:hidden!important}');
    });
  });

  it('uses the default majority fraction, not 50vw, for a fresh open on a wide window', () => {
    atWidth(1920, () => {
      applySplit(DEFAULT_SPLIT_RATIO);
      expect(DEFAULT_SPLIT_RATIO * 100).toBeGreaterThan(50);
      expect(sheet()).toContain(`calc(100% - ${DEFAULT_SPLIT_RATIO * 100}vw)`);
    });
  });

  it('changes the page column in one pass: nothing about the host layout is animated', () => {
    atWidth(1600, () => {
      applySplit(0.5);
      expect(sheet()).not.toMatch(/transition|animation/);
    });
  });

  it('overlays instead of crushing the chat on a narrow viewport (UI-SMALL-01, D29)', () => {
    atWidth(759, () => {
      applySplit(0.75);
      expect(document.getElementById(SPLIT_STYLE_ID)).toBeNull();
    });
  });

  it('drops the split when an open window is narrowed past the overlay threshold', () => {
    atWidth(1200, () => applySplit(0.5));
    expect(document.getElementById(SPLIT_STYLE_ID)).not.toBeNull();
    atWidth(700, () => applySplit(0.5));
    expect(document.getElementById(SPLIT_STYLE_ID)).toBeNull();
  });

  it('shrinks the host only down to its minimum column at medium widths (UI-SMALL-01)', () => {
    atWidth(1000, () => {
      applySplit(0.75);
      // 1000px - 480px for the chat - 60px for a sidebar rail leaves the panel 46vw.
      expect(sheet()).toContain('calc(100% - 46vw)');
    });
  });

  it('gives way to what the host sidebar is showing', () => {
    atWidth(1440, () => {
      applySplit(DEFAULT_SPLIT_RATIO, 288);
      // 1440 - 480 - 288 = 672px of panel.
      expect(sheet()).toContain('calc(100% - 46.667vw)');
    });
  });

  it('clamps a page container only when it still reaches under the panel', () => {
    atWidth(1600, () => {
      document.body.innerHTML = '<main></main>';
      const main = document.querySelector('main')!;
      rightEdge(main, 800);
      applySplit(0.5);
      expect(sheet()).not.toContain('main{');

      rightEdge(main, 1600);
      applySplit(0.5);
      expect(sheet()).toContain('main{max-width:calc(100vw - 50vw)!important');
      // Once found, it stays clamped as the panel is resized, and never loses its own overflow or width.
      rightEdge(main, 800);
      applySplit(0.4);
      expect(sheet()).toContain('main{max-width:calc(100vw - 40vw)!important');
      expect(sheet()).not.toMatch(/main\{[^}]*(?:overflow|[^-]width:100%)/);
    });
  });

  it('puts the host document back exactly as it was', () => {
    document.documentElement.innerHTML =
      '<head><title>chat</title><style>body{margin:0}</style></head><body class="dark" style="color: red"><main><p>hi</p></main></body>';
    document.documentElement.className = 'theme-dark';
    const before = document.documentElement.outerHTML;
    atWidth(1600, () => {
      applySplit(0.5);
      rightEdge(document.querySelector('main')!, 1600);
      applySplit(0.6, 288);
      // While open the page's own elements carry nothing of ours: no class, attribute or inline style.
      const open = document.documentElement.cloneNode(true) as HTMLElement;
      open.querySelector(`#${SPLIT_STYLE_ID}`)!.remove();
      expect(open.outerHTML).toBe(before);
      removeSplit();
    });
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it('keeps the split when the host rewrites the class of <html> (a theme switch)', () => {
    atWidth(1600, () => {
      applySplit(0.5);
      document.documentElement.className = 'light';
      document.body.className = '';
      expect(document.getElementById(SPLIT_STYLE_ID)).not.toBeNull();
      expect(sheet()).not.toMatch(/[.#\[]stemlm|html\.|body\./);
    });
  });

  it('keeps its stylesheet in the stemlm root, which outlives a replaced <head>', () => {
    atWidth(1600, () => {
      const root = document.documentElement.appendChild(document.createElement('stemlm-root'));
      applySplit(0.5);
      expect(document.getElementById(SPLIT_STYLE_ID)?.parentElement).toBe(root);
      document.head.replaceChildren();
      expect(sheet()).toContain('calc(100% - 50vw)');
      root.remove();
    });
  });

  it('disables the resize grip transition under reduced motion', () => {
    const css = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.slm-resize-grip');
    expect(reduced).toContain('transition: none');
  });

  it('does not apply a transform on html/body that would trap position:fixed popovers', () => {
    atWidth(1600, () => {
      applySplit(0.5);
      const css = sheet();
      expect(css).not.toMatch(/transform\s*:/);
      expect(css).not.toContain('translateZ');
      expect(css).not.toContain('translate3d');
      expect(css).not.toContain('will-change');
      expect(css).not.toContain('perspective:');
      expect(css).not.toMatch(/contain\s*:/);
    });
  });

  it('content-script host is not a full-viewport hit target', () => {
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/content/style.css'), 'utf8');
    expect(css).toMatch(/:host[\s\S]*pointer-events:\s*none\s*!important/);
    expect(css).toMatch(/:host[\s\S]*width:\s*0\s*!important/);
    expect(css).toMatch(/:host[\s\S]*height:\s*0\s*!important/);
    expect(css).toMatch(/#stemlm-app[\s\S]*pointer-events:\s*none/);
    expect(css).toMatch(/\.slm-panel[\s\S]*pointer-events:\s*auto/);
    expect(css).toMatch(/\.slm-fab-wrap[\s\S]*pointer-events:\s*auto/);
  });
});
