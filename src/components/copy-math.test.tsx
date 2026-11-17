/**
 * Copying maths out of the panel: the "Copy LaTeX" control on a formula block, in each view that
 * shows one, and Ctrl+C on a selection that holds a formula.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Panel } from './Panel';
import { FormulaBlock } from './FormulaBlock';
import { COPY_FAILED } from './use-copy';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import type { Capsule, Session } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSession: vi.fn(async () => undefined),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));
vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } } }));
vi.mock('@/src/content/controller', () => ({ getController: () => null }));

const step = { id: 's1', index: 1, title: 'Second law', formula: '$$F = ma$$', body: 'The net force is $F_{net} = 15.5\\ \\text{N}$ down the slope.' };
const answer: Capsule = {
  meta: { version: 2, subject: 'Physics', topic: 'Incline' },
  solution: 'Done.',
  solutionDiagrams: [],
  steps: [step, { id: 's2', index: 2, title: 'Kinematics', formula: '$$v^2 = 2a\\,\\Delta x$$', body: 'Substitute the numbers.' }],
};
const session: Session = {
  id: 'copy',
  createdAt: 0,
  updatedAt: 0,
  platform: 'claude',
  question: 'Find the acceleration.',
  raw: '',
  capsule: answer,
  followups: [{
    id: 'f1',
    anchorStepId: 's1',
    question: 'Why the second law?',
    createdAt: 1,
    capsule: { ...answer, steps: [{ id: 'a1', index: 1, title: 'Because', formula: '$$\\sum F = ma$$', body: 'It relates force and motion.' }], solution: '' },
  }],
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;
const writeText = vi.fn(async (_text: string) => undefined);

async function mount(node: React.ReactNode): Promise<HTMLDivElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root!.render(node); });
  return host;
}
const press = async (button: Element) => act(async () => { (button as HTMLButtonElement).click(); });
const copyButtons = (within: Element) => [...within.querySelectorAll<HTMLButtonElement>('.slm-formula-copy')];

beforeEach(() => {
  writeText.mockReset();
  writeText.mockImplementation(async () => undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  useStore.getState().resetSessions();
  useStore.getState().addSession(session);
  useStore.setState({ panelOpen: true, status: 'ready', errorMessage: undefined, view: 'steps', theme: 'light', settings: DEFAULT_SETTINGS, activeStepIndex: 0 });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  window.getSelection()?.removeAllRanges();
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: false, status: 'idle', errorMessage: undefined });
});

describe('the formula block', () => {
  it('copies the formula as LaTeX, without delimiters, and says so', async () => {
    const el = await mount(<FormulaBlock step={step} />);
    const [button] = copyButtons(el);
    expect(button!.textContent).toBe('Copy LaTeX');
    await press(button!);
    expect(writeText).toHaveBeenCalledWith('F = ma');
    expect(button!.textContent).toBe('Copied');
    expect(el.querySelector('[role="status"]')!.textContent).toBe('Formula copied as LaTeX.');
  });

  it('reports a clipboard the browser refuses, on the control and in the status line', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    const el = await mount(<FormulaBlock step={step} />);
    await press(copyButtons(el)[0]!);
    expect(copyButtons(el)[0]!.textContent).toBe('Copy failed');
    expect(useStore.getState()).toMatchObject({ status: 'error', errorMessage: COPY_FAILED });
  });

  it('is not drawn for a step without a formula of its own', async () => {
    const el = await mount(<FormulaBlock step={{ id: 's', index: 1, title: 'No formula', body: 'Only words.' }} />);
    expect(el.innerHTML).toBe('');
  });

  it('is the same block, with its copy control, on the step page, in a follow-up answer and in the Solution view', async () => {
    const el = await mount(<Panel />);
    expect(copyButtons(el)).toHaveLength(1);
    await press(copyButtons(el)[0]!);
    expect(writeText).toHaveBeenLastCalledWith('F = ma');

    // The follow-up answer sits after the step it was asked about.
    act(() => useStore.getState().setActiveStep(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    expect(el.querySelector('.slm-card--followup')).not.toBeNull();
    await press(copyButtons(el)[0]!);
    expect(writeText).toHaveBeenLastCalledWith('\\sum F = ma');

    act(() => useStore.getState().setView('solution'));
    const all = copyButtons(el);
    expect(all).toHaveLength(2);
    await press(all[1]!);
    expect(writeText).toHaveBeenLastCalledWith('v^2 = 2a\\,\\Delta x');
  });
});

describe('copying a selection', () => {
  function copyEvent() {
    const setData = vi.fn();
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { setData } });
    return { event, setData };
  }
  function select(node: Node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    act(() => {
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
    });
  }

  it('puts LaTeX on the clipboard for the formulas in it, not their drawn glyphs', async () => {
    const el = await mount(<Panel />);
    const body = el.querySelector('.slm-step-work-body p')!;
    select(body);
    const { event, setData } = copyEvent();
    act(() => { body.dispatchEvent(event); });
    expect(setData).toHaveBeenCalledWith('text/plain', 'The net force is $F_{net} = 15.5\\ \\text{N}$ down the slope.');
    expect(event.defaultPrevented).toBe(true);

    // The key relation is set on its own line.
    const formula = el.querySelector('.slm-formula .slm-prose')!;
    select(formula);
    const second = copyEvent();
    act(() => { formula.dispatchEvent(second.event); });
    expect(second.setData).toHaveBeenCalledWith('text/plain', '$$F = ma$$');
  });

  it('leaves a selection without maths to the browser', async () => {
    const el = await mount(<Panel />);
    const title = el.querySelector('.slm-card-title')!;
    select(title);
    const { event, setData } = copyEvent();
    act(() => { title.dispatchEvent(event); });
    expect(setData).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
