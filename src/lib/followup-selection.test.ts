import { describe, it, expect } from 'vitest';
import {
  buildLastStepFollowupSelection,
  buildSolutionFollowupSelection,
  normalizeFollowupSelection,
  readPanelSelection,
} from './followup-selection';
import { SOLUTION_ANCHOR_ID } from './step-entries';
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

describe('buildSolutionFollowupSelection', () => {
  it('quotes the problem, route, and final answer — not a single step id', () => {
    const session: Session = {
      id: 's1',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Find the RLC impedance at 60 Hz.',
      raw: '',
      capsule: {
        meta: { version: 1, subject: 'Electrical', topic: 'RLC impedance' },
        solution: 'Z is capacitive at 60 Hz.',
        solutionDiagrams: [],
        steps: [
          { id: 's1', index: 1, title: 'Compute XL', body: 'XL = 2 pi f L.' },
          { id: 's2', index: 2, title: 'Compare reactances', body: 'XC exceeds XL.' },
        ],
      },
    };
    const selection = buildSolutionFollowupSelection(session);
    expect(selection).toContain('Find the RLC impedance at 60 Hz.');
    expect(selection).toContain('Solution route (2 steps)');
    expect(selection).toContain('Compute XL');
    expect(selection).toContain('Z is capacitive at 60 Hz.');
    expect(selection).not.toContain('s1');
  });

  it('chains earlier solution-tab follow-ups, ignoring step-rail ones', () => {
    const session: Session = {
      id: 's1',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Find I',
      raw: '',
      capsule: {
        meta: { version: 1, subject: 'Electrical', topic: 'Ohm' },
        solution: 'I = 2 A',
        solutionDiagrams: [],
        steps: [{ id: 's1', index: 1, title: 'Ohm', body: 'I = V/R' }],
      },
      followups: [
        {
          id: 'f-step',
          anchorStepId: 's1',
          question: 'Why this formula?',
          capsule: {
            meta: { version: 1, subject: 'Electrical', topic: 'Ohm' },
            steps: [{ id: 'a1', index: 1, title: 'Because Ohm', body: 'definition' }],
            solution: 'because Ohm',
            solutionDiagrams: [],
          },
          createdAt: 1,
        },
        {
          id: 'f-sol',
          anchorStepId: SOLUTION_ANCHOR_ID,
          question: 'What if V doubles?',
          capsule: {
            meta: { version: 1, subject: 'Electrical', topic: 'Ohm' },
            steps: [{ id: 'a1', index: 1, title: 'Scale', body: 'I doubles' }],
            solution: 'I becomes 4 A',
            solutionDiagrams: [],
          },
          createdAt: 2,
        },
      ],
    };
    const selection = buildSolutionFollowupSelection(session);
    expect(selection).toContain('What if V doubles?');
    expect(selection).toContain('I becomes 4 A');
    expect(selection).not.toContain('Why this formula?');
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
