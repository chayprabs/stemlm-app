import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  clampSplitRatio,
  isOverlayViewport,
  layoutSplitRatio,
  MIN_HOST_PX,
  minSplitRatio,
  pageWidthVw,
  panelWidthVw,
  ratioFromPointer,
  MIN_PANEL_PX,
  MAX_SPLIT_RATIO,
  DEFAULT_SPLIT_RATIO,
  hydrateSplitRatio,
} from './split-ratio';

describe('split-ratio', () => {
  it('uses a 25% floor on wide viewports', () => {
    expect(minSplitRatio(1600)).toBe(0.25);
    expect(clampSplitRatio(0.2, 1600)).toBe(0.25);
  });

  it('raises the minimum ratio when the viewport is narrow', () => {
    const min = minSplitRatio(1000);
    expect(min).toBeCloseTo(MIN_PANEL_PX / 1000);
    expect(clampSplitRatio(0.25, 1000)).toBeCloseTo(MIN_PANEL_PX / 1000);
  });

  it('clamps to 75% maximum', () => {
    expect(clampSplitRatio(0.9, 1600)).toBe(0.75);
  });

  it('derives panel and page widths that sum to 100vw', () => {
    expect(panelWidthVw(0.5) + pageWidthVw(0.5)).toBe(100);
    expect(panelWidthVw(DEFAULT_SPLIT_RATIO) + pageWidthVw(DEFAULT_SPLIT_RATIO)).toBe(100);
  });

  it('maps pointer position to ratio', () => {
    expect(ratioFromPointer(800, 1600)).toBe(0.5);
    expect(ratioFromPointer(1200, 1600)).toBe(0.25);
  });

  it('uses the reading-first default that CSS and clamp fallbacks share', () => {
    expect(DEFAULT_SPLIT_RATIO).toBeGreaterThan(0.5);
    expect(DEFAULT_SPLIT_RATIO).toBeCloseTo(0.68);
    expect(clampSplitRatio(Number.NaN, 1600)).toBe(DEFAULT_SPLIT_RATIO);
    expect(hydrateSplitRatio(0.5)).toBe(DEFAULT_SPLIT_RATIO);
    expect(hydrateSplitRatio(0.75)).toBe(DEFAULT_SPLIT_RATIO);
    expect(hydrateSplitRatio(0.61)).toBe(0.61);

    const panelCss = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    const width = /\.slm-panel\s*\{[^}]*width:\s*([\d.]+)vw/.exec(panelCss);
    expect(width).toBeTruthy();
    expect(Number(width![1]) / 100).toBe(DEFAULT_SPLIT_RATIO);
    expect(panelCss).not.toMatch(/\.slm-panel\s*\{[^}]*width:\s*50vw/);
    expect(panelCss).toMatch(/\.slm-panel\s*\{[^}]*min-width:\s*min\(280px,/);
  });

  it('does not rewrite the stored 55/45 split using the popup window width', () => {
    expect(hydrateSplitRatio(DEFAULT_SPLIT_RATIO)).toBe(DEFAULT_SPLIT_RATIO);
    expect(clampSplitRatio(DEFAULT_SPLIT_RATIO, 312)).toBe(MAX_SPLIT_RATIO);
  });

  it('preserves an explicitly resized 75% panel', () => {
    expect(hydrateSplitRatio(0.75, undefined, { preserveLegacyValues: true })).toBe(0.75);
  });

  it('keeps a phone-width chat column beside the panel (UI-SMALL-01)', () => {
    expect(MIN_HOST_PX).toBe(320);
    for (const vw of [600, 760, 900, 1000]) {
      const ratio = layoutSplitRatio(DEFAULT_SPLIT_RATIO, vw);
      expect((1 - ratio) * vw, `chat at ${vw}px`).toBeGreaterThanOrEqual(MIN_HOST_PX - 1e-9);
      expect(ratio * vw, `panel at ${vw}px`).toBeGreaterThanOrEqual(MIN_PANEL_PX - 1e-9);
    }
    // Wide screens keep the reading-first default.
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1024)).toBe(DEFAULT_SPLIT_RATIO);
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1400)).toBe(DEFAULT_SPLIT_RATIO);
  });

  it('overlays the chat when the window cannot fit both (UI-SMALL-01)', () => {
    expect(isOverlayViewport(599)).toBe(true);
    expect(isOverlayViewport(600)).toBe(false);
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 480)).toBe(1);
  });
});
