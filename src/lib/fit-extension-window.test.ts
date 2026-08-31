import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { availableHeightCap, windowSizeForContent } from './fit-extension-window';

describe('windowSizeForContent', () => {
  it('adds the window frame and respects min/max', () => {
    expect(
      windowSizeForContent({ width: 640, height: 420 }, { width: 16, height: 40 }),
    ).toEqual({ width: 664, height: 468 });

    expect(
      windowSizeForContent(
        { width: 200, height: 200 },
        { width: 0, height: 0 },
        { minWidth: 680, minHeight: 440 },
      ),
    ).toEqual({ width: 680, height: 440 });

    expect(
      windowSizeForContent(
        { width: 1200, height: 900 },
        { width: 0, height: 0 },
        { maxWidth: 720, maxHeight: 520 },
      ),
    ).toEqual({ width: 720, height: 520 });
  });
});

describe('availableHeightCap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves room for the taskbar and window chrome', () => {
    vi.stubGlobal('screen', { availHeight: 1000 });
    expect(availableHeightCap(900)).toBe(920);
  });

  it('falls back when the screen is unreadable or implausible', () => {
    vi.stubGlobal('screen', { availHeight: 0 });
    expect(availableHeightCap(640)).toBe(640);
    vi.stubGlobal('screen', undefined);
    expect(availableHeightCap(640)).toBe(640);
  });
});

describe('the settings sheet is never taller than its window', () => {
  it('asks for enough height to show every group and the footer links', () => {
    const app = readFileSync(resolve(process.cwd(), 'entrypoints/options/App.tsx'), 'utf8');
    const max = Number(/maxHeight:\s*(\d+)/.exec(app)?.[1]);
    // Measured in a browser at the shipped 440px width: head + three groups +
    // footer comes to ~690px. A 640 cap cut the Privacy group off entirely.
    expect(max).toBeGreaterThanOrEqual(760);
  });

  it('keeps overflow reachable without ever drawing a scrollbar', () => {
    const css = readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');
    const page = css.slice(css.indexOf('html.slm-settings-page,'));
    const block = page.slice(0, page.indexOf('}'));
    expect(block).toMatch(/overflow-y:\s*auto/);
    expect(block).toMatch(/scrollbar-width:\s*none/);
    expect(block).not.toMatch(/overflow:\s*hidden/);
    expect(css).toMatch(/body\.slm-settings-page::-webkit-scrollbar/);

    // Anchor to line start: `.slm-settings-overlay--page .slm-settings-body`
    // contains the same substring and comes first in the file.
    const body = css.slice(css.indexOf('\n.slm-settings-body {'));
    const bodyBlock = body.slice(0, body.indexOf('}'));
    expect(bodyBlock).toMatch(/overflow-y:\s*auto/);
    expect(bodyBlock).toMatch(/scrollbar-width:\s*none/);
  });
});
