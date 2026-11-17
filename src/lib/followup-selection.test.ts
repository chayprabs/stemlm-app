import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  buildLastStepFollowupSelection,
  buildSolutionFollowupSelection,
  normalizeFollowupSelection,
  panelSelectionRange,
  readPanelSelection,
  selectionText,
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

describe('selectionText', () => {
  /** A formula the way KaTeX leaves it: the source in the MathML, the drawing in positioned spans. */
  const katex = (tex: string, drawn: string) =>
    `<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">${tex}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">${[...drawn].map((c) => `<span class="mord">${c}</span>`).join('')}</span></span>`;
  const display = (tex: string, drawn: string) => `<span class="katex-display">${katex(tex, drawn)}</span>`;

  function selectAll(html: string): Range {
    document.body.innerHTML = `<div id="text">${html}</div>`;
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('text')!);
    return range;
  }

  it('gives each formula as its LaTeX: in a line between dollars, on its own line between double dollars', () => {
    const range = selectAll(
      `<p>The weight is ${katex('W = mg', 'W=mg')}, so</p><p>${display('a = \\frac{F}{m}', 'a=Fm')}</p><p>and the mass cancels.</p>`,
    );
    expect(selectionText(range)).toEqual({
      text: 'The weight is $W = mg$, so\n\n$$a = \\frac{F}{m}$$\n\nand the mass cancels.',
      hasMath: true,
    });
  });

  it('takes a formula whole when the selection starts or ends inside it', () => {
    document.body.innerHTML = `<p id="text">before ${katex('x^2 + 1', 'x2+1')} after</p>`;
    const drawn = document.querySelectorAll('.katex-html .mord');
    const range = document.createRange();
    range.setStart(drawn[1]!.firstChild!, 0);
    range.setEnd(document.getElementById('text')!.lastChild!, 4);
    expect(selectionText(range).text).toBe('$x^2 + 1$ aft');

    // Inside one display formula: still the whole formula, still on its own line.
    document.body.innerHTML = `<div id="text">${display('E = mc^2', 'E=mc2')}</div>`;
    const inside = document.createRange();
    inside.setStart(document.querySelectorAll('.mord')[1]!.firstChild!, 0);
    inside.setEnd(document.querySelectorAll('.mord')[3]!.firstChild!, 1);
    expect(selectionText(inside).text).toBe('$$E = mc^2$$');
  });

  it('does not take a formula the selection only touches the edge of', () => {
    // A triple click on the paragraph: the selection ends at the very start of the equation below.
    document.body.innerHTML = `<div id="text"><p>So the forces cancel.</p><p>${display('N = mg', 'N=mg')}</p></div>`;
    const range = document.createRange();
    range.setStart(document.querySelector('p')!.firstChild!, 0);
    range.setEnd(document.querySelector('.katex-mathml mi')!.firstChild!, 0);
    expect(selectionText(range)).toEqual({ text: 'So the forces cancel.', hasMath: false });
  });

  it('says when there is no maths, and still breaks the text where the blocks break', () => {
    const range = selectAll('<p>First.</p><ul><li>one</li><li>two</li></ul><table><tr><th>n</th><th>x</th></tr><tr><td>0</td><td>2.0</td></tr></table>');
    expect(selectionText(range)).toEqual({ text: 'First.\n\none\ntwo\n\nn\tx\n0\t2.0', hasMath: false });
  });

  it('leaves out controls and text that is only for screen readers', () => {
    const range = selectAll(`<p>Formula <button>Copy LaTeX</button><span class="slm-sr-only">copied</span>${katex('F = ma', 'F=ma')}</p>`);
    expect(selectionText(range).text).toBe('Formula $F = ma$');
  });

  it('quotes a formula as LaTeX in "Ask in chat"', () => {
    document.body.innerHTML = `<aside id="panel"><div class="slm-selectable"><p>Friction is ${katex('f_k = \\mu_k N', 'fk=μkN')}.</p></div></aside>`;
    const panel = document.getElementById('panel')!;
    const range = document.createRange();
    range.selectNodeContents(panel.querySelector('p')!);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(readPanelSelection(panel)?.text).toBe('Friction is $f_k = \\mu_k N$.');
  });
});

describe('a paragraph selected by triple click', () => {
  it('is read although the selection ends at the start of the block after the answer text', () => {
    document.body.innerHTML =
      '<aside id="panel"><div class="slm-selectable"><p>Tilt the axes with the incline.</p></div><div class="next">Ask in chat</div></aside>';
    const panel = document.getElementById('panel')!;
    const range = document.createRange();
    range.setStart(panel.querySelector('p')!.firstChild!, 0);
    range.setEnd(panel.querySelector('.next')!, 0);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(readPanelSelection(panel)?.text).toBe('Tilt the axes with the incline.');
  });

  it('is not read when neither end is in the answer text', () => {
    document.body.innerHTML =
      '<aside id="panel"><h2>Step title</h2><div class="slm-selectable"><p>Body.</p></div></aside>';
    const panel = document.getElementById('panel')!;
    const range = document.createRange();
    range.selectNodeContents(panel.querySelector('h2')!);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(readPanelSelection(panel)).toBeNull();
  });
});

describe('a selection inside the panel\'s shadow root', () => {
  /** The panel as it is mounted on a chat page, and the document selection as Chromium reports it there. */
  function shadowPanel() {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host')!;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<aside id="panel"><div class="slm-selectable"><p>The net force is 15.5 N down the slope.</p></div></aside>';
    const panel = root.getElementById('panel') as HTMLElement;
    const text = panel.querySelector('p')!.firstChild!;
    // From the document the selection is collapsed and its range is re-scoped to the host.
    const rescoped = document.createRange();
    rescoped.setStart(document.body, 0);
    rescoped.setEnd(document.body, 0);
    const selection = {
      isCollapsed: true,
      rangeCount: 1,
      anchorNode: document.body,
      getRangeAt: () => rescoped,
      toString: () => '',
    };
    return { root, panel, text, selection };
  }

  afterEach(() => vi.restoreAllMocks());

  it('is read through the composed range, which the document selection hides', () => {
    const { root, panel, text, selection } = shadowPanel();
    const asked: ShadowRoot[][] = [];
    vi.spyOn(window, 'getSelection').mockReturnValue({
      ...selection,
      getComposedRanges: (opt: { shadowRoots: ShadowRoot[] }) => {
        asked.push(opt.shadowRoots);
        return [{ startContainer: text, startOffset: 4, endContainer: text, endOffset: 13, collapsed: false }];
      },
    } as unknown as Selection);

    expect(readPanelSelection(panel)?.text).toBe('net force');
    expect(panelSelectionRange(panel)?.toString()).toBe('net force');
    expect(asked[0]).toEqual([root]);
  });

  it('falls back to the shadow root\'s own selection where composed ranges do not exist', () => {
    const { root, panel, text, selection } = shadowPanel();
    const own = document.createRange();
    own.setStart(text, 0);
    own.setEnd(text, 13);
    vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection);
    (root as unknown as { getSelection: () => unknown }).getSelection = () => ({ rangeCount: 1, getRangeAt: () => own });

    expect(readPanelSelection(panel)?.text).toBe('The net force');
  });

  it('is nothing when the composed range is a caret, or lies outside the panel', () => {
    const { panel, text, selection } = shadowPanel();
    const outside = document.createElement('p');
    outside.textContent = 'chat text outside the panel';
    document.body.append(outside);
    const ranges = [
      { startContainer: text, startOffset: 4, endContainer: text, endOffset: 4, collapsed: true },
      { startContainer: outside.firstChild!, startOffset: 0, endContainer: outside.firstChild!, endOffset: 9, collapsed: false },
    ];
    for (const range of ranges) {
      vi.spyOn(window, 'getSelection').mockReturnValue({ ...selection, getComposedRanges: () => [range] } as unknown as Selection);
      expect(panelSelectionRange(panel)).toBeNull();
      expect(readPanelSelection(panel)).toBeNull();
    }
  });
});
