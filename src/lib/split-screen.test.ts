import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applySplit, removeSplit, SPLIT_STYLE_ID } from './split-screen';
import { DEFAULT_SPLIT_RATIO, pageWidthVw, panelWidthVw } from './split-ratio';

describe('split-screen', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body></body>';
  });

  afterEach(() => {
    removeSplit();
  });

  it('applies host-page shrink styles when the panel is open', () => {
    applySplit(0.5, false);
    expect(document.documentElement.classList.contains('stemlm-split')).toBe(true);
    const style = document.getElementById(SPLIT_STYLE_ID);
    expect(style?.textContent).toContain('calc(50vw - 8px)');
    expect(style?.textContent).toContain('transition: width 0.28s');
    expect(style?.textContent).toContain('html.stemlm-split { overflow-x: hidden !important; }');
    expect(style?.textContent).toContain('overflow-x:hidden!important');
  });

  it('uses the default majority fraction, not 50vw, for a fresh open', () => {
    applySplit(DEFAULT_SPLIT_RATIO, false);
    const style = document.getElementById(SPLIT_STYLE_ID);
    const panelVw = panelWidthVw(DEFAULT_SPLIT_RATIO);
    const pageVw = pageWidthVw(DEFAULT_SPLIT_RATIO);
    expect(panelVw).toBeGreaterThan(50);
    expect(panelVw).toBe(DEFAULT_SPLIT_RATIO * 100);
    expect(style?.textContent).toContain(`calc(${pageVw}vw - 8px)`);
    expect(style?.textContent).not.toContain('calc(50vw - 8px)');
  });

  it('disables body transition while dragging', () => {
    applySplit(0.5, true);
    const style = document.getElementById(SPLIT_STYLE_ID);
    expect(style?.textContent).toContain('transition: none');
    expect(document.documentElement.classList.contains('stemlm-split-dragging')).toBe(true);
  });

  it('shrinks the host far enough for the minimum panel on a narrow viewport', () => {
    const previous = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    try {
      applySplit(0.75, false);
      const style = document.getElementById(SPLIT_STYLE_ID)?.textContent ?? '';
      expect(style).toContain('calc(12.5vw - 8px)');
      expect(style).toContain('max-width:calc(100vw - 87.5vw - 8px)');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previous });
    }
  });

  it('disables the resize grip transition under reduced motion', () => {
    const css = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.slm-resize-grip');
    expect(reduced).toContain('transition: none');
  });

  it('removes split classes and styles on teardown', () => {
    applySplit(0.4, false);
    removeSplit();
    expect(document.documentElement.classList.contains('stemlm-split')).toBe(false);
    expect(document.getElementById(SPLIT_STYLE_ID)).toBeNull();
  });

  it('does not apply a transform on html/body that would trap position:fixed popovers', () => {
    applySplit(0.5, false);
    const css = document.getElementById(SPLIT_STYLE_ID)?.textContent ?? '';
    expect(css).not.toMatch(/transform\s*:/);
    expect(css).not.toContain('translateZ');
    expect(css).not.toContain('translate3d');
    expect(css).not.toContain('will-change: transform');
    expect(css).not.toContain('perspective:');
    expect(css).not.toContain('contain: paint');
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
