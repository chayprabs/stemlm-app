import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  clampSplitRatio,
  minSplitRatio,
  pageWidthVw,
  panelWidthVw,
  ratioFromPointer,
  MIN_PANEL_PX,
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

  it('uses a modest-majority default that CSS and clamp fallbacks share', () => {
    expect(DEFAULT_SPLIT_RATIO).toBeGreaterThan(0.5);
    expect(DEFAULT_SPLIT_RATIO).toBeLessThanOrEqual(0.58);
    expect(clampSplitRatio(Number.NaN, 1600)).toBe(DEFAULT_SPLIT_RATIO);
    expect(hydrateSplitRatio(0.5)).toBe(DEFAULT_SPLIT_RATIO);
    expect(hydrateSplitRatio(0.61)).toBe(0.61);

    const panelCss = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    const width = /\.slm-panel\s*\{[^}]*width:\s*([\d.]+)vw/.exec(panelCss);
    expect(width).toBeTruthy();
    expect(Number(width![1]) / 100).toBe(DEFAULT_SPLIT_RATIO);
    expect(panelCss).not.toMatch(/\.slm-panel\s*\{[^}]*width:\s*50vw/);
  });
});
