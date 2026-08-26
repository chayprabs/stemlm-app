import { describe, it, expect } from 'vitest';
import { windowSizeForContent } from './fit-extension-window';

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
