import { describe, it, expect } from 'vitest';
import { normalizeFollowupSelection, readPanelSelection } from './followup-selection';

describe('normalizeFollowupSelection', () => {
  it('trims and collapses whitespace per line', () => {
    expect(normalizeFollowupSelection('  hello   world \n  foo  ')).toBe('hello world\nfoo');
  });

  it('strips zero-width and nbsp characters', () => {
    expect(normalizeFollowupSelection('a\u00a0b\u200b')).toBe('a b');
  });
});

describe('readPanelSelection', () => {
  it('returns null when selection is outside the panel', () => {
    document.body.innerHTML = '<main id="outside">outside text</main><aside id="panel"></aside>';
    const panel = document.getElementById('panel')!;
    const main = document.getElementById('outside')!;
    const range = document.createRange();
    range.selectNodeContents(main);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(readPanelSelection(panel)).toBeNull();
  });

  it('reads normalized text inside a selectable region', () => {
    document.body.innerHTML =
      '<aside id="panel"><div class="slm-selectable">  spaced   text  </div></aside>';
    const panel = document.getElementById('panel')!;
    const block = panel.querySelector('.slm-selectable')!;
    const range = document.createRange();
    range.selectNodeContents(block);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    const picked = readPanelSelection(panel);
    expect(picked?.text).toBe('spaced text');
    expect(picked).not.toBeNull();
  });
});
