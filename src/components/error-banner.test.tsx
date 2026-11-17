/**
 * The panel's status line can be put away, and the notice left by removing a question from the
 * strip carries the way to put it back.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { REMOVED_NOTICE, useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import type { Session } from '@/src/protocol/types';
import { ErrorBanner } from './ErrorBanner';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function session(id: string): Session {
  return {
    id, createdAt: 1, updatedAt: 1, platform: 'claude', question: `Question ${id}`, raw: '',
    capsule: {
      meta: { version: 2, subject: 'Math', topic: `Topic ${id}` },
      steps: [{ id: 's1', index: 1, title: 'Work', body: 'show work' }],
      solution: 'done', solutionDiagrams: [],
    },
  };
}

/** The banner as the panel mounts it: only while there is a message, inside the panel's root. */
function Status() {
  const message = useStore((s) => s.errorMessage);
  const status = useStore((s) => s.status);
  return (
    <aside className="slm-panel" tabIndex={-1}>
      {message && <ErrorBanner message={message} tone={status === 'error' ? 'error' : 'info'} />}
    </aside>
  );
}

let root: Root;
let container: HTMLElement;
const banner = () => container.querySelector<HTMLElement>('.slm-banner');
const dismiss = () => container.querySelector<HTMLButtonElement>('.slm-banner-dismiss');
const undo = () => container.querySelector<HTMLButtonElement>('.slm-banner-undo');
const ids = () => useStore.getState().sessions.map((s) => s.id);

beforeEach(() => {
  useStore.setState({
    sessions: [], activeSessionId: undefined, activeStepIndex: 0, status: 'idle', errorMessage: undefined,
    removed: undefined, settings: DEFAULT_SETTINGS, view: 'steps',
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<Status />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('dismissing the status line', () => {
  it('puts an error away and returns the panel to the answer it was showing', () => {
    act(() => {
      useStore.getState().setSessions([session('a')]);
      useStore.getState().setStatus('error', 'Could not copy to clipboard. Select the text and copy manually.');
    });
    expect(banner()?.getAttribute('role')).toBe('alert');
    expect(dismiss()?.getAttribute('aria-label')).toBe('Dismiss message');
    // An icon only: the message stays the banner's whole text.
    expect(banner()?.textContent).toBe('Could not copy to clipboard. Select the text and copy manually.');

    dismiss()!.focus();
    act(() => dismiss()!.click());
    expect(banner()).toBeNull();
    expect(useStore.getState()).toMatchObject({ status: 'ready', errorMessage: undefined });
    // The button left with the banner: the panel takes focus so its keys keep working.
    expect(document.activeElement).toBe(container.querySelector('.slm-panel'));
  });

  it('returns an empty panel to idle, so it can offer this chat\'s answers again', () => {
    act(() => useStore.getState().setStatus('error', 'stemlm could not read this answer.\nParser code: missing_end.'));
    act(() => dismiss()!.click());
    expect(useStore.getState()).toMatchObject({ status: 'idle', errorMessage: undefined });
  });

  it('puts a notice away without disturbing an answer that is still being waited for', () => {
    act(() => useStore.getState().setStatus('loading', 'The chat is still writing its answer.'));
    expect(banner()?.getAttribute('role')).toBe('status');
    act(() => dismiss()!.click());
    expect(useStore.getState()).toMatchObject({ status: 'loading', errorMessage: undefined });
  });
});

describe('removing a question from the strip', () => {
  it('says so and offers Undo, which returns the question to its place and opens it', () => {
    act(() => useStore.getState().setSessions([session('a'), session('b'), session('c')]));
    act(() => useStore.getState().removeSession('b'));
    expect(ids()).toEqual(['a', 'c']);
    expect(banner()?.textContent).toBe(`${REMOVED_NOTICE}Undo`);
    expect(banner()?.getAttribute('role')).toBe('status');

    act(() => undo()!.click());
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(useStore.getState()).toMatchObject({ activeSessionId: 'b', status: 'ready', errorMessage: undefined });
    expect(banner()).toBeNull();
  });

  it('brings back the only question of a panel that removing it had emptied', () => {
    act(() => useStore.getState().addSession(session('only')));
    act(() => useStore.getState().removeSession('only'));
    expect(useStore.getState()).toMatchObject({ sessions: [], status: 'idle', errorMessage: REMOVED_NOTICE });
    act(() => undo()!.click());
    expect(ids()).toEqual(['only']);
    expect(useStore.getState().activeSessionId).toBe('only');
  });

  it('replaces an error that was showing, and does not hold up an answer being waited for', () => {
    act(() => useStore.getState().setSessions([session('a'), session('b')]));
    act(() => useStore.getState().setStatus('error', 'Could not save the question. Try again.'));
    act(() => useStore.getState().removeSession('a'));
    expect(useStore.getState()).toMatchObject({ status: 'ready', errorMessage: REMOVED_NOTICE });

    // A follow-up answer is on its way: neither the removal nor its undo stops the wait.
    act(() => useStore.getState().setSessions([session('a'), session('b')]));
    act(() => useStore.getState().setStatus('loading'));
    act(() => useStore.getState().removeSession('a'));
    expect(useStore.getState()).toMatchObject({ status: 'loading', errorMessage: REMOVED_NOTICE });
    act(() => undo()!.click());
    expect(useStore.getState().status).toBe('loading');
    expect(ids()).toEqual(['a', 'b']);
  });

  it('offers no Undo once the notice has been replaced or dismissed', () => {
    act(() => useStore.getState().setSessions([session('a'), session('b')]));
    act(() => useStore.getState().removeSession('a'));
    act(() => useStore.getState().setStatus('error', 'Could not start the PDF export. Reload this tab and try again.'));
    expect(undo()).toBeNull();
    act(() => dismiss()!.click());
    // A stale Undo must not resurrect it later either.
    act(() => useStore.getState().setStatus('idle', 'Some other notice.'));
    expect(undo()).toBeNull();
    expect(ids()).toEqual(['b']);
  });

  it('does not offer what it cannot do: with sessions shared across tabs a removal is final', () => {
    act(() => useStore.setState({ settings: { ...DEFAULT_SETTINGS, shareAcrossTabs: true } }));
    act(() => useStore.getState().setSessions([session('a'), session('b')]));
    act(() => useStore.getState().removeSession('a'));
    expect(ids()).toEqual(['b']);
    expect(useStore.getState().removed).toBeUndefined();
    expect(banner()).toBeNull();
  });

  it('does not duplicate a question that came back another way before Undo was pressed', () => {
    act(() => useStore.getState().setSessions([session('a'), session('b')]));
    act(() => useStore.getState().removeSession('a'));
    act(() => useStore.setState({ sessions: [session('a'), session('b')] }));
    act(() => undo()!.click());
    expect(ids()).toEqual(['a', 'b']);
  });
});
