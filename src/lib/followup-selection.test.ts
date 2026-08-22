import { describe, it, expect } from 'vitest';
import {
  buildLastStepFollowupSelection,
  normalizeFollowupSelection,
  readPanelSelection,
} from './followup-selection';
import type { Session } from '@/src/protocol/types';

describe('normalizeFollowupSelection', () => {
  it('trims and collapses whitespace per line', () => {
    expect(normalizeFollowupSelection('  hello   world \n  foo  ')).toBe('hello world\nfoo');
  });

  it('strips zero-width and nbsp characters', () => {
    expect(normalizeFollowupSelection('a\u00a0b\u200b')).toBe('a b');
  });
});

describe('buildLastStepFollowupSelection', () => {
  it('quotes the problem and final step when the model omits @followup', () => {
    const session: Session = {
      id: 's1',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Find the RLC impedance at 60 Hz.',
      raw: '',
      capsule: {
        meta: { version: 1, subject: 'Electrical', topic: 'RLC impedance' },
        solution: '',
        solutionDiagrams: [],
        steps: [
          {
            id: 'step-7',
            index: 7,
            title: 'Determine circuit nature via reactance comparison',
            body: 'Compare XL and XC.',
            takeaway: 'Capacitive when XC exceeds XL.',
          },
        ],
      },
    };
    const step = session.capsule.steps[0]!;
    const selection = buildLastStepFollowupSelection(session, step);
    expect(selection).toContain('Find the RLC impedance at 60 Hz.');
    expect(selection).toContain('Determine circuit nature');
    expect(selection).toContain('Capacitive when XC exceeds XL.');
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
