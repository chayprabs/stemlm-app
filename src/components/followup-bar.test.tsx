import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FollowupBar } from './FollowupBar';
import { buildFollowupCopyText } from '@/src/protocol/builder';
import { useStore } from '@/src/state/store';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { followUpMock } = vi.hoisted(() => ({ followUpMock: vi.fn() }));

vi.mock('@/src/content/controller', () => ({
  getController: () => ({ followUp: followUpMock }),
}));

describe('FollowupBar failure recovery', () => {
  beforeEach(() => {
    followUpMock.mockReset();
    useStore.setState({ status: 'idle', errorMessage: undefined });
  });

  it('turns a rejected follow-up into an actionable panel error', async () => {
    followUpMock.mockRejectedValueOnce(new Error('transport unavailable'));
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    act(() => {
      root = createRoot(container);
      root.render(
        <FollowupBar
          followup="Explain the next step."
          subject="Math"
          stepTitle="Substitute"
        />,
      );
    });

    const button = container.querySelector('.slm-followup-action--ask') as HTMLButtonElement;
    await act(async () => {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toBe(
      'Could not send the follow-up to the chat box. Click in the chat box and try again.',
    );
    act(() => root?.unmount());
    container.remove();
  });

  it('prevents duplicate sends while pending and confirms when the prompt was added', async () => {
    let resolveFollowup: ((value: boolean) => void) | undefined;
    followUpMock.mockReturnValueOnce(new Promise<boolean>((resolve) => {
      resolveFollowup = resolve;
    }));
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<FollowupBar followup="Explain this result." subject="Physics" stepTitle="Compare" />);
    });

    const button = container.querySelector('.slm-followup-action--ask') as HTMLButtonElement;
    act(() => button.click());
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Adding');
    await act(async () => {
      resolveFollowup?.(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(button.textContent).toContain('Added to chat');
    act(() => root?.unmount());
    container.remove();
  });
});

describe('FollowupBar states and announcements', () => {
  beforeEach(() => {
    followUpMock.mockReset();
    useStore.setState({ status: 'idle', errorMessage: undefined });
  });

  function mountBar() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(
        <FollowupBar
          followup="Explain the next step."
          subject="Math"
          stepTitle="Substitute"
          intent="ask"
          anchor={{ sessionId: 'q', anchorStepId: 's2' }}
          suggestion="Why does the sign flip here?"
        />,
      );
    });
    return { container, unmount: () => act(() => { root?.unmount(); container.remove(); }) };
  }

  it('announces a successful copy through a live region', async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const mounted = mountBar();
    const copyButton = mounted.container.querySelector('.slm-followup-action') as HTMLButtonElement;
    // Named for what it copies: the follow-up message, not the step.
    expect(copyButton.textContent).toBe(' Copy prompt');

    await act(async () => {
      copyButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0]![0]).toContain('Ask your question here:');
    expect(copyButton.textContent).toContain('Copied');
    expect(copyButton.dataset.state).toBe('copied');
    const live = mounted.container.querySelector('[role="status"]') as HTMLElement;
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('copied');
    mounted.unmount();
  });

  it('reports a clipboard refusal on the control itself', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => { throw new Error('denied'); }) },
      configurable: true,
    });
    const mounted = mountBar();
    const copyButton = mounted.container.querySelector('.slm-followup-action') as HTMLButtonElement;

    await act(async () => {
      copyButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(copyButton.textContent).toContain('Copy failed');
    expect(useStore.getState().status).toBe('error');
    mounted.unmount();
  });

  it('marks the ask control busy while the prompt is being staged', async () => {
    let resolveFollowup: ((value: boolean) => void) | undefined;
    followUpMock.mockReturnValueOnce(new Promise<boolean>((resolve) => {
      resolveFollowup = resolve;
    }));
    const mounted = mountBar();
    const askButton = mounted.container.querySelector('.slm-followup-action--ask') as HTMLButtonElement;

    act(() => askButton.click());
    expect(askButton.getAttribute('aria-busy')).toBe('true');
    expect(askButton.dataset.state).toBe('sending');

    await act(async () => {
      resolveFollowup?.(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(askButton.getAttribute('aria-busy')).toBe('false');
    expect(askButton.dataset.state).toBe('added');
    mounted.unmount();
  });

  it('shows a learner-facing suggestion rather than the raw quoted context', () => {
    const mounted = mountBar();
    const text = mounted.container.querySelector('.slm-followup-text') as HTMLElement;
    expect(text.textContent).toBe('Try: Why does the sign flip here?');
    expect(text.textContent).not.toContain('Explain the next step.');
    mounted.unmount();
  });

  it('makes the suggestion a button that puts that question in the chat box, nothing to retype', async () => {
    followUpMock.mockResolvedValue(true);
    const mounted = mountBar();
    const suggest = mounted.container.querySelector('.slm-followup-suggest') as HTMLButtonElement;
    expect(suggest.tagName).toBe('BUTTON');
    expect(suggest.textContent).toBe('Try: Why does the sign flip here?');
    await act(async () => {
      suggest.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(followUpMock).toHaveBeenCalledTimes(1);
    expect(followUpMock).toHaveBeenCalledWith('Explain the next step.', 'Substitute', 'Math', {
      intent: 'ask',
      anchor: { sessionId: 'q', anchorStepId: 's2' },
      question: 'Why does the sign flip here?',
    });
    // The same confirmation as the main button, which still sends an empty slot to type in.
    const ask = mounted.container.querySelector('.slm-followup-action--ask') as HTMLButtonElement;
    expect(ask.textContent).toContain('Added to chat');
    followUpMock.mockClear();
    await act(async () => {
      ask.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(followUpMock.mock.calls[0]![3]).toEqual({ intent: 'ask', anchor: { sessionId: 'q', anchorStepId: 's2' }, question: undefined });
    mounted.unmount();
  });

  it('writes a suggested question into the slot of the message, under its label and above the context', () => {
    const base = { selection: 'Problem: a block on an incline', stepTitle: 'Normal force', intent: 'ask' as const };
    const empty = buildFollowupCopyText(base);
    const filled = buildFollowupCopyText({ ...base, question: 'Why does $N$ depend on  the angle?\n' });
    expect(empty.startsWith('Ask your question here:\n\n\n--- stemLM follow-up context')).toBe(true);
    expect(filled.startsWith('Ask your question here:\nWhy does $N$ depend on the angle?\n\n--- stemLM follow-up context')).toBe(true);
    // Nothing else of the message changes.
    expect(filled.slice(filled.indexOf('--- stemLM'))).toBe(empty.slice(empty.indexOf('--- stemLM')));
  });
});
