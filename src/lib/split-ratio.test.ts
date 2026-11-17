import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  clampSplitRatio,
  isOverlayViewport,
  layoutSplitRatio,
  MIN_CHAT_PX,
  layoutPanelWidthVw,
  minSplitRatio,
  ratioFromPointer,
  MIN_PANEL_PX,
  MAX_SPLIT_RATIO,
  DEFAULT_SPLIT_RATIO,
  hydrateSplitRatio,
  viewportWidth,
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

  it('gives the panel its fraction of the window where both columns have room', () => {
    expect(layoutPanelWidthVw(0.5, 1600)).toBe(50);
    expect(layoutPanelWidthVw(DEFAULT_SPLIT_RATIO, 1920)).toBe(68);
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

  it('keeps a readable chat column beside the panel (UI-SMALL-01)', () => {
    // The narrowest the hosts give the chat beside their own sidebar: 768px less 288px.
    expect(MIN_CHAT_PX).toBe(480);
    for (const vw of [760, 900, 1000, 1280, 1440]) {
      const ratio = layoutSplitRatio(DEFAULT_SPLIT_RATIO, vw);
      expect((1 - ratio) * vw, `chat at ${vw}px`).toBeGreaterThanOrEqual(MIN_CHAT_PX - 1e-9);
      expect(ratio * vw, `panel at ${vw}px`).toBeGreaterThanOrEqual(MIN_PANEL_PX - 1e-9);
    }
    // Wide screens keep the reading-first default.
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1700)).toBe(DEFAULT_SPLIT_RATIO);
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1920)).toBe(DEFAULT_SPLIT_RATIO);
  });

  it('keeps that column beside whatever the host sidebar is showing, down to the panel minimum', () => {
    // 1440 - 480 - 288 leaves the panel 672px beside an open sidebar, 888px beside a 72px rail.
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1440, 288) * 1440).toBeCloseTo(672);
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1440, 72) * 1440).toBeCloseTo(888);
    // Room for a 60px rail is kept even where none was measured: some hosts draw theirs apart
    // from the sidebar that was folded.
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1440, 52) * 1440).toBeCloseTo(900);
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1440) * 1440).toBeCloseTo(900);
    // No room for both minimums: the panel keeps its own rather than vanishing.
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 1000, 288) * 1000).toBeCloseTo(MIN_PANEL_PX);
    // A narrower request than the cap is honoured as asked.
    expect(layoutSplitRatio(0.3, 1440, 288)).toBe(0.3);
  });

  it('never lays the panel out wider than the stored 75% cap or narrower than its floor', () => {
    expect(layoutSplitRatio(0.95, 4000)).toBe(MAX_SPLIT_RATIO);
    expect(layoutSplitRatio(0, 1600)).toBe(0.25);
    expect(layoutSplitRatio(Number.NaN, 1920)).toBe(DEFAULT_SPLIT_RATIO);
  });

  it('measures the window the page is laid out in, not the part a pinch zoom shows', () => {
    const innerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    const visualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { width: 720 } });
    try {
      // Zoomed in twice over, the layout is unchanged: still a split, with the same columns.
      expect(viewportWidth()).toBe(1440);
      expect(isOverlayViewport()).toBe(false);
      expect(ratioFromPointer(720)).toBe(0.5);
    } finally {
      if (innerWidth) Object.defineProperty(window, 'innerWidth', innerWidth);
      else Reflect.deleteProperty(window, 'innerWidth');
      if (visualViewport) Object.defineProperty(window, 'visualViewport', visualViewport);
      else Reflect.deleteProperty(window, 'visualViewport');
    }
  });

  it('overlays the chat when the window cannot fit both (UI-SMALL-01)', () => {
    // 480px of chat + 280px of panel: just under the hosts' own 768px breakpoint.
    expect(isOverlayViewport(759)).toBe(true);
    expect(isOverlayViewport(760)).toBe(false);
    expect(layoutSplitRatio(DEFAULT_SPLIT_RATIO, 480)).toBe(1);
  });
});
