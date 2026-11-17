import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerBlock } from './AnswerBlock';
import { StepCard } from './StepCard';
import { SolutionView } from './SolutionView';
import { SOLUTION_DIAGRAM_TOKEN } from '@/src/protocol/parser';
import type { Capsule, Session } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FIGURE = {
  type: 'svg',
  content: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="5"/><text x="1" y="10">answer-figure</text></svg>',
} as const;

function capsule(solution: string, withFigure = false): Capsule {
  return {
    meta: { version: 2, subject: 'Physics', topic: 'Incline' },
    solution,
    solutionDiagrams: withFigure ? [{ ...FIGURE }] : [],
    steps: [
      { id: 's1', index: 1, title: 'Draw the forces', body: 'Three forces act.' },
      { id: 's2', index: 2, title: 'Apply the second law', body: 'Sum the forces.' },
    ],
  };
}

function session(solution: string, withFigure = false): Session {
  return { id: 'answer', createdAt: 0, updatedAt: 0, platform: 'claude', question: 'Find a.', raw: '', capsule: capsule(solution, withFigure) };
}

describe('AnswerBlock', () => {
  let container: HTMLElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
  });

  async function mount(ui: React.ReactNode): Promise<HTMLElement> {
    container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container!);
      root.render(ui);
    });
    for (let i = 0; i < 40; i++) {
      await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    }
    return container;
  }

  it('renders nothing when the model wrote no closing answer', () => {
    for (const empty of ['', '   ', '\n\n']) {
      expect(renderToStaticMarkup(<AnswerBlock capsule={capsule(empty)} theme="light" />)).toBe('');
      expect(renderToStaticMarkup(<AnswerBlock capsule={capsule(empty)} theme="light" figures />)).toBe('');
    }
  });

  it('sets the closing answer apart as a labelled region with the therefore sign', () => {
    const html = renderToStaticMarkup(<AnswerBlock capsule={capsule('The block accelerates at $a = 3.2$ m/s².')} theme="light" />);
    const host = document.createElement('div');
    host.innerHTML = html;
    const block = host.querySelector('section.slm-answer')!;
    expect(block.getAttribute('aria-label')).toBe('Answer');
    expect(block.querySelector('.slm-answer-label')?.textContent).toBe('Answer');
    expect(block.querySelector('.slm-answer-head svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(block.querySelector('.slm-answer-body')?.textContent).toContain('The block accelerates at');
    expect(block.querySelector('.slm-answer-body .katex')).toBeTruthy();
    // Selectable, so the student can ask about a part of the answer.
    expect(block.classList.contains('slm-selectable')).toBe(true);
  });

  it('shows prose only under the last step: an embedded figure is neither drawn nor leaked as a token', async () => {
    const solution = `Before the figure.\n${SOLUTION_DIAGRAM_TOKEN(0)}\nAfter the figure.`;
    const host = await mount(<AnswerBlock capsule={capsule(solution, true)} theme="light" />);
    expect(host.querySelector('.slm-answer')).toBeTruthy();
    expect(host.textContent).toContain('Before the figure.');
    expect(host.textContent).toContain('After the figure.');
    expect(host.querySelector('.slm-step-diagram')).toBeNull();
    expect(host.innerHTML).not.toContain('answer-figure');
    expect(host.textContent).not.toContain('stemlm-diagram');
  });

  it('draws the embedded figure where it is asked to, in the place the model put it', async () => {
    const solution = `Before the figure.\n${SOLUTION_DIAGRAM_TOKEN(0)}\nAfter the figure.`;
    const host = await mount(<AnswerBlock capsule={capsule(solution, true)} theme="dark" figures />);
    const figure = host.querySelector('.slm-answer .slm-step-diagram');
    expect(figure).toBeTruthy();
    expect(figure!.querySelector('.slm-diagram--solution')).toBeTruthy();
    expect(host.innerHTML).toContain('answer-figure');
    expect(host.textContent).not.toContain('stemlm-diagram');
    const text = host.querySelector('.slm-answer-body')!.textContent ?? '';
    expect(text.indexOf('Before the figure.')).toBeLessThan(text.indexOf('After the figure.'));
    const before = [...host.querySelectorAll('.slm-answer-body > *')];
    expect(before.findIndex((el) => el.classList.contains('slm-step-diagram'))).toBe(1);
  });

  it('renders nothing under a step when the answer is only a figure, and the figure where figures are shown', async () => {
    const onlyFigure = SOLUTION_DIAGRAM_TOKEN(0);
    expect(renderToStaticMarkup(<AnswerBlock capsule={capsule(onlyFigure, true)} theme="light" />)).toBe('');
    const host = await mount(<AnswerBlock capsule={capsule(onlyFigure, true)} theme="light" figures />);
    expect(host.querySelector('.slm-answer .slm-step-diagram')).toBeTruthy();
  });

  it('ignores a figure token that points at no figure', async () => {
    const host = await mount(<AnswerBlock capsule={capsule(`Text. ${SOLUTION_DIAGRAM_TOKEN(3)} More.`)} theme="light" figures />);
    expect(host.querySelector('.slm-step-diagram')).toBeNull();
    expect(host.textContent).toContain('Text.');
    expect(host.textContent).toContain('More.');
    expect(host.textContent).not.toContain('stemlm-diagram');
  });

  it('closes the last step, and only the last step', () => {
    const s = session('The acceleration is 3.2 m/s².');
    const first = renderToStaticMarkup(<StepCard session={s} index={0} theme="light" />);
    const last = renderToStaticMarkup(<StepCard session={s} index={1} theme="light" />);
    expect(first).not.toContain('slm-answer"');
    expect(first).not.toContain('The acceleration is 3.2');
    const host = document.createElement('div');
    host.innerHTML = last;
    const card = host.querySelector('.slm-card')!;
    const answer = card.querySelector('.slm-answer')!;
    expect(answer.textContent).toContain('The acceleration is 3.2');
    // After the step's own working, before Ask in chat.
    const work = card.querySelector('.slm-step-work')!;
    const ask = card.querySelector('.slm-followup')!;
    expect(work.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(answer.compareDocumentPosition(ask) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the Solution view, above the steps, exactly once', () => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(<SolutionView session={session('The acceleration is 3.2 m/s².')} theme="light" />);
    const answers = host.querySelectorAll('.slm-answer');
    expect(answers).toHaveLength(1);
    const steps = host.querySelector('.slm-solution-steps')!;
    expect(answers[0]!.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.querySelector('.slm-solution-full')).toBeNull();
  });
});
