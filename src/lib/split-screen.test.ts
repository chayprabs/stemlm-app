import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applySplit, removeSplit, SPLIT_STYLE_ID } from './split-screen';

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
  });

  it('disables body transition while dragging', () => {
    applySplit(0.5, true);
    const style = document.getElementById(SPLIT_STYLE_ID);
    expect(style?.textContent).toContain('transition: none');
    expect(document.documentElement.classList.contains('stemlm-split-dragging')).toBe(true);
  });

  it('removes split classes and styles on teardown', () => {
    applySplit(0.4, false);
    removeSplit();
    expect(document.documentElement.classList.contains('stemlm-split')).toBe(false);
    expect(document.getElementById(SPLIT_STYLE_ID)).toBeNull();
  });
});
