import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import { applyTheme } from '@/src/lib/theme';
import type { Session } from '@/src/protocol/types';

const { saveSessionMock, deleteSavedSessionMock, isSessionSavedMock, refreshSavedSessionMock, setSettingsMock, exportSessionPdfMock } =
  vi.hoisted(() => ({
    saveSessionMock: vi.fn(async () => ({ prunedCount: 0 })),
    deleteSavedSessionMock: vi.fn(async () => undefined),
    isSessionSavedMock: vi.fn(async () => false),
    refreshSavedSessionMock: vi.fn(async () => false),
    setSettingsMock: vi.fn(async (patch: Record<string, unknown>) => ({
      theme: 'auto',
      shareAcrossTabs: false,
      autoOpenOnAnswer: true,
      stemlmEnabled: true,
      promptVariant: 'balanced',
      analyticsOptOut: false,
      splitRatio: 0.5,
      ...patch,
    })),
    exportSessionPdfMock: vi.fn(async () => ({ ok: true, method: 'print' as const })),
  }));

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: saveSessionMock,
  deleteSavedSession: deleteSavedSessionMock,
  isSessionSaved: isSessionSavedMock,
  refreshSavedSession: refreshSavedSessionMock,
}));

vi.mock('@/src/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/settings')>();
  return { ...actual, setSettings: setSettingsMock };
});

vi.mock('@/src/lib/pdf', () => ({
  exportSessionPdf: exportSessionPdfMock,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function buildTwoDiagramSession(): Session {
  return {
    id: 'panel-diagrams',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Show progressive diagrams',
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Physics', topic: 'Progressive diagrams' },
      solution: 'Done.',
      solutionDiagrams: [],
      steps: [
        {
          id: 's1',
          index: 0,
          title: 'First visual state',
          body: 'First.',
          diagram: {
            type: 'svg',
            content: '<svg viewBox="0 0 20 20"><text x="1" y="10">first-diagram</text></svg>',
          },
        },
        {
          id: 's2',
          index: 1,
          title: 'Second visual state',
          body: 'Second.',
          diagram: {
            type: 'svg',
            content: '<svg viewBox="0 0 20 20"><text x="1" y="10">second-diagram</text></svg>',
          },
        },
      ],
    },
  };
}

const SCRATCH = resolve(
  process.env.SLM_SCRATCH || 'C:\\Users\\chait\\AppData\\Local\\Temp\\grok-goal-6889acceb8d4\\implementer',
);
const TOKENS_CSS = readFileSync(resolve(process.cwd(), 'assets/tokens.css'), 'utf8');
const PANEL_CSS = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');

function installShippedStyles() {
  let style = document.getElementById('slm-shipped-styles') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'slm-shipped-styles';
    document.head.appendChild(style);
  }
  style.textContent = `${TOKENS_CSS}\n${PANEL_CSS}`;
}

function cssVar(el: HTMLElement, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function mountPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(<Panel />);
  });
  return {
    container,
    unmount() {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function buildStudySession(): Session {
  const session = buildTwoDiagramSession();
  session.id = 'panel-study';
  session.capsule.steps[0] = {
    ...session.capsule.steps[0]!,
    body: 'Newton second law relates force to acceleration.',
    formula: '$$F = ma$$',
    takeaway: 'Force is mass times acceleration.',
    quickCheck: { question: 'What does F equal?', answer: 'mass times acceleration' },
    followup: 'Why is force a vector?',
  };
  session.capsule.solution = 'The net force equals mass times acceleration.';
  return session;
}

beforeEach(() => {
  saveSessionMock.mockClear();
  deleteSavedSessionMock.mockClear();
  isSessionSavedMock.mockReset();
  isSessionSavedMock.mockResolvedValue(false);
  refreshSavedSessionMock.mockReset();
  refreshSavedSessionMock.mockResolvedValue(false);
  setSettingsMock.mockClear();
  exportSessionPdfMock.mockClear();
  useStore.setState({
    panelOpen: false,
    status: 'idle',
    errorMessage: undefined,
    view: 'steps',
    theme: 'light',
    splitRatio: 0.5,
    splitDragging: false,
    sessions: [],
    activeSessionId: undefined,
    activeStepIndex: 0,
  });
});

afterEach(() => {
  useStore.getState().resetSessions();
  useStore.setState({
    panelOpen: false,
    status: 'idle',
    errorMessage: undefined,
    view: 'steps',
    theme: 'light',
    splitRatio: 0.5,
  });
});

describe('Panel step diagram', () => {
  it('shows the active step diagram inside the step card', async () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.getState().setActiveStep(1);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const html = container.innerHTML;
    expect(html).toContain('slm-step-diagram');
    expect(html).toContain('second-diagram');
    expect(html).not.toContain('first-diagram');
    expect(html).not.toContain('slm-diagram-well');

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('shows Ask in chat on the last step even without a model @followup block', () => {
    const session = buildTwoDiagramSession();
    session.capsule.steps[1]!.followup = undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.getState().setActiveStep(1);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    expect(container.querySelector('.slm-followup')).toBeTruthy();
    expect(container.textContent).toContain('Ask in chat');

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('keeps the question in the header when the active step changes', () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.getState().setActiveStep(0);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    expect(container.querySelector('.slm-topic')?.textContent).toBe('Show progressive diagrams');

    act(() => {
      useStore.getState().setActiveStep(1);
    });

    expect(container.querySelector('.slm-topic')?.textContent).toBe('Show progressive diagrams');

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('renders LaTeX vectors in the panel question heading', () => {
    const session = buildTwoDiagramSession();
    session.question =
      'Q.5 Three vectors \\vec{P}, \\vec{Q} and \\vec{R} are shown in the figure. Let S be any point on the vector \\vec{R}.';
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    const topic = container.querySelector('.slm-topic');
    expect(topic?.textContent).toContain('Three vectors');
    expect(container.querySelector('.slm-topic .katex')).toBeTruthy();
    expect(container.querySelector('.slm-topic .katex-mathml')).toBeTruthy();

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('moves one step per arrow key press', () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
      activeStepIndex: 0,
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    const panel = container.querySelector('.slm-panel') as HTMLElement;
    panel.focus();

    act(() => {
      panel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(useStore.getState().activeStepIndex).toBe(1);

    act(() => {
      panel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(useStore.getState().activeStepIndex).toBe(1);

    act(() => {
      panel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
    });
    expect(useStore.getState().activeStepIndex).toBe(0);

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});

describe('Panel save toggle', () => {
  it('saves on first click and unsaves on second click', async () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const saveBtn = container.querySelector(
      'button[aria-label="Save session"]',
    ) as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();

    await act(async () => {
      saveBtn.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(saveSessionMock).toHaveBeenCalledOnce();
    expect(saveSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        question: session.question,
        capsule: expect.objectContaining({ solution: session.capsule.solution }),
      }),
    );
    expect(container.querySelector('button[aria-label="Remove from saved sessions"]')).toBeTruthy();

    isSessionSavedMock.mockResolvedValue(true);
    const savedBtn = container.querySelector(
      'button[aria-label="Remove from saved sessions"]',
    ) as HTMLButtonElement;

    await act(async () => {
      savedBtn.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(deleteSavedSessionMock).toHaveBeenCalledOnce();

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('refreshes an already-saved session when the capsule updates', async () => {
    isSessionSavedMock.mockResolvedValue(true);
    refreshSavedSessionMock.mockResolvedValue(true);

    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(refreshSavedSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        capsule: expect.objectContaining({ solution: 'Done.' }),
      }),
    );

    const updated = {
      ...session,
      updatedAt: 99,
      capsule: { ...session.capsule, solution: 'The latest closed-form answer.' },
    };
    act(() => {
      useStore.setState({ sessions: [updated], activeSessionId: updated.id });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(refreshSavedSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        capsule: expect.objectContaining({ solution: 'The latest closed-form answer.' }),
      }),
    );

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});

describe('Panel empty / loading / banner states', () => {
  it('renders empty copy when there is no session', () => {
    useStore.setState({ panelOpen: true, status: 'idle' });
    const { container, unmount } = mountPanel();

    const panel = container.querySelector('[role="complementary"]');
    expect(panel?.getAttribute('aria-label')).toBe('stemLM study panel');
    expect(container.textContent).toContain('Study workspace');
    expect(container.textContent).toContain('Type a question in the chat, then start stemLM.');
    expect(container.textContent).not.toContain('beside send');
    expect(container.textContent).not.toContain('Open Gemini');
    expect(container.textContent).not.toContain('Load conversation from this chat');
    expect(container.querySelector('.slm-empty')).toBeTruthy();
    expect(container.querySelector('.slm-tabs')).toBeNull();
    unmount();
  });

  it('renders loading copy when status is loading and there is no session', () => {
    useStore.setState({ panelOpen: true, status: 'loading' });
    const { container, unmount } = mountPanel();

    expect(container.textContent).toContain('Reading response');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Reading response');
    expect(container.querySelector('.slm-loading')).toBeTruthy();
    expect(container.textContent).not.toContain('Study workspace');
    unmount();
  });

  it('renders an error banner as an alert', () => {
    useStore.setState({
      panelOpen: true,
      status: 'error',
      errorMessage: 'Could not parse this answer.',
    });
    const { container, unmount } = mountPanel();

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Could not parse this answer.');
    expect(container.textContent).toContain('Study workspace');
    unmount();
  });

  it('renders an info banner as status', () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      errorMessage: 'Saved. Removed 1 older save to free storage.',
    });
    const { container, unmount } = mountPanel();

    const status = [...container.querySelectorAll('[role="status"]')].find((el) =>
      el.textContent?.includes('Removed 1 older save'),
    );
    expect(status).toBeTruthy();
    unmount();
  });
});

describe('Panel ready session', () => {
  it('shows question, step content, and switches Steps/Solution', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const panel = container.querySelector('[role="complementary"]') as HTMLElement;
    expect(panel.getAttribute('aria-label')).toBe('stemLM study panel');
    expect(container.querySelector('.slm-topic')?.textContent).toContain('Show progressive diagrams');
    expect(container.querySelector('.slm-question-icon')?.textContent).toMatch(/Q\./);
    expect(container.querySelector('.slm-question-icon')?.innerHTML).not.toContain('<svg');
    expect(container.querySelector('.slm-question-icon')?.innerHTML).not.toContain('M9.09 9');
    const header = container.querySelector('.slm-header') as HTMLElement;
    const bar = header.querySelector('.slm-header-bar') as HTMLElement;
    const brandEl = header.querySelector('.slm-brand') as HTMLElement;
    const tabsEl = header.querySelector('.slm-tabs') as HTMLElement;
    const questionEl = header.querySelector('.slm-topic') as HTMLElement;
    expect(bar.contains(tabsEl)).toBe(true);
    expect(bar.contains(brandEl)).toBe(true);
    expect(header.querySelector('.slm-header-leading')?.contains(tabsEl)).toBe(true);
    expect(brandEl.compareDocumentPosition(tabsEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const actionsEl = header.querySelector('.slm-header-actions') as HTMLElement;
    expect(tabsEl.compareDocumentPosition(actionsEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tabsEl.compareDocumentPosition(questionEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.contains(questionEl)).toBe(false);
    expect(container.querySelector('.slm-step-badge')).toBeNull();
    expect(container.querySelector('.slm-card-head')?.textContent).not.toMatch(/\b0\d\b/);
    expect(container.querySelector('.slm-stepnav-count')).toBeNull();
    expect(container.textContent).not.toMatch(/\b1\s*\/\s*[0-9]+\b/);
    expect(container.querySelector('.slm-stepnav--overlay')).toBeTruthy();
    expect(container.querySelector('.slm-steps-layout')).toBeTruthy();
    expect(container.querySelector('.slm-step-rail')).toBeTruthy();
    expect(container.querySelector('.slm-read')).toBeTruthy();
    expect(container.querySelector('.slm-subject-chip')).toBeNull();
    expect(container.textContent).not.toMatch(/\bPhysics\b/);
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).toContain('Newton second law');
    expect(container.textContent).toContain('Force is mass times acceleration.');
    expect(container.textContent).toContain('What does F equal?');
    expect(container.textContent).toContain('Why is force a vector?');
    expect(container.innerHTML).toContain('first-diagram');
    expect(container.querySelector('.slm-step-diagram')).toBeTruthy();

    const next = container.querySelector('button[aria-label="Next step"]') as HTMLButtonElement;
    const prev = container.querySelector('button[aria-label="Previous step"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    act(() => {
      next.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(container.textContent).toContain('Second visual state');
    expect(container.querySelector('.slm-card-title')?.textContent).toBe('Second visual state');
    expect(container.innerHTML).toContain('second-diagram');
    act(() => {
      prev.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(0);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });

    const solutionTab = container.querySelector('#slm-tab-solution') as HTMLButtonElement;
    act(() => {
      solutionTab.click();
    });
    expect(useStore.getState().view).toBe('solution');
    expect(container.querySelector('#slm-panel-solution')).toBeTruthy();
    expect(container.textContent).not.toContain('Step-by-step');
    expect(container.querySelector('.slm-solution-q')).toBeNull();
    expect(container.querySelector('.slm-solution-step-head .slm-step-index')).toBeTruthy();
    expect(container.textContent).not.toContain('Full solution');
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).toContain('Newton second law');
    expect(container.textContent).not.toContain('The net force equals mass times acceleration.');
    expect(container.querySelector('#slm-panel-steps')).toBeNull();

    const stepsTab = container.querySelector('#slm-tab-steps') as HTMLButtonElement;
    act(() => {
      stepsTab.click();
    });
    expect(useStore.getState().view).toBe('steps');
    expect(container.querySelector('#slm-panel-steps')).toBeTruthy();
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).not.toContain('Mark reviewed');
    expect(container.textContent).not.toMatch(/reviewed/i);

    unmount();
  });

  it('fires save, PDF, theme, and close from the header', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const saveBtn = container.querySelector('button[aria-label="Save session"]') as HTMLButtonElement;
    await act(async () => {
      saveBtn.click();
      await Promise.resolve();
    });
    expect(saveSessionMock).toHaveBeenCalledOnce();

    const pdfBtn = container.querySelector('button[aria-label="Export PDF"]') as HTMLButtonElement;
    expect(pdfBtn.innerHTML).toContain('M15 2H6');
    expect(pdfBtn.innerHTML).not.toContain('M6.4 20.4h11.2');
    await act(async () => {
      pdfBtn.click();
      await Promise.resolve();
    });
    expect(exportSessionPdfMock).toHaveBeenCalledOnce();

    const themeBtn = container.querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    await act(async () => {
      themeBtn.click();
      await Promise.resolve();
    });
    expect(useStore.getState().theme).toBe('dark');
    expect(setSettingsMock).toHaveBeenCalled();

    const closeBtn = container.querySelector('button[aria-label="Close panel"]') as HTMLButtonElement;
    act(() => {
      closeBtn.click();
    });
    expect(useStore.getState().panelOpen).toBe(false);

    unmount();
  });

  it('keeps the step rail as index tiles without titles or a connector', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const rail = container.querySelector('.slm-step-rail') as HTMLElement;
    expect(rail).toBeTruthy();
    expect(rail.querySelector('.slm-step-rail-label')).toBeNull();
    expect(rail.textContent?.includes('First visual state')).toBe(false);
    expect(rail.querySelectorAll('.slm-step-index')).toHaveLength(2);

    const buttons = [...rail.querySelectorAll<HTMLButtonElement>('.slm-step-rail-btn')];
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Step 1: First visual state');
    expect(buttons[1]?.getAttribute('aria-label')).toBe('Step 2: Second visual state');
    expect(buttons[0]?.getAttribute('title')).toBe('First visual state');
    expect(buttons[1]?.getAttribute('title')).toBe('Second visual state');
    expect(buttons[0]?.getAttribute('aria-label')).not.toMatch(/\bs1\b/);
    expect(buttons[0]?.getAttribute('title')).not.toMatch(/\bs1\b/);
    expect(getComputedStyle(buttons[0]!).borderRadius).not.toBe('50%');

    act(() => {
      buttons[1]!.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(1);
    expect(buttons[1]?.getAttribute('aria-current')).toBe('step');

    unmount();
  });

  it('uses one morphing theme glyph and a bookmark save that fills when active', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const themeBtn = container.querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    expect(themeBtn.classList.contains('slm-theme-btn')).toBe(true);
    expect(themeBtn.classList.contains('is-dark')).toBe(false);
    expect(themeBtn.querySelector('.slm-theme-glyph')).toBeTruthy();
    expect(themeBtn.querySelector('.slm-theme-disc')).toBeTruthy();
    expect(themeBtn.querySelector('.slm-theme-crescent')).toBeTruthy();
    expect(themeBtn.querySelector('.slm-theme-rays')).toBeTruthy();
    expect(container.querySelectorAll('.slm-theme-glyph')).toHaveLength(1);

    await act(async () => {
      themeBtn.click();
      await Promise.resolve();
    });

    const darkBtn = container.querySelector(
      'button[aria-label="Switch to light theme"]',
    ) as HTMLButtonElement;
    expect(darkBtn.classList.contains('is-dark')).toBe(true);
    expect(darkBtn.querySelector('.slm-theme-glyph')).toBeTruthy();
    expect(container.querySelectorAll('.slm-theme-glyph')).toHaveLength(1);

    const saveBtn = container.querySelector(
      'button[aria-label="Save session"]',
    ) as HTMLButtonElement;
    expect(saveBtn.querySelector('.slm-icon-save')).toBeTruthy();
    expect(saveBtn.getAttribute('data-active')).toBeNull();
    expect(saveBtn.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      saveBtn.click();
      await Promise.resolve();
    });

    const savedBtn = container.querySelector(
      'button[aria-label="Remove from saved sessions"]',
    ) as HTMLButtonElement;
    expect(savedBtn.getAttribute('data-active')).toBe('true');
    expect(savedBtn.getAttribute('aria-pressed')).toBe('true');
    expect(savedBtn.querySelector('.slm-icon-save')).toBeTruthy();
    expect(savedBtn.querySelector('.slm-save-glyph')).toBeTruthy();

    unmount();
  });

  it('closes on Escape and moves steps with arrow keys', () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
      activeStepIndex: 0,
    });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;
    panel.focus();

    act(() => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(useStore.getState().activeStepIndex).toBe(1);

    act(() => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    });
    expect(useStore.getState().activeStepIndex).toBe(0);

    act(() => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(useStore.getState().panelOpen).toBe(false);

    unmount();
  });

  it('switches between multiple sessions', () => {
    const first = buildStudySession();
    const second = buildStudySession();
    second.id = 'panel-study-2';
    second.question = 'A different question';
    second.capsule = {
      ...second.capsule,
      meta: { ...second.capsule.meta, topic: 'Other topic' },
    };
    useStore.getState().addSession(first);
    useStore.getState().addSession(second);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();

    const pills = container.querySelectorAll('.slm-session-pill');
    expect(pills).toHaveLength(2);
    expect(container.querySelector('.slm-topic')?.textContent).toContain('A different question');

    act(() => {
      (pills[0] as HTMLButtonElement).click();
    });
    expect(useStore.getState().activeSessionId).toBe(first.id);
    expect(container.querySelector('.slm-topic')?.textContent).toContain('Show progressive diagrams');

    unmount();
  });
});

describe('Panel theme, split, and width density', () => {
  beforeEach(() => {
    installShippedStyles();
  });

  it('applies light then dark through the real theme path', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const panel = container.querySelector('.slm-panel') as HTMLElement;
    expect(panel.getAttribute('data-stemlm-theme')).toBe('light');
    applyTheme(panel, 'light');
    const lightBg = cssVar(panel, '--slm-bg');
    const lightFg = cssVar(panel, '--slm-fg');
    expect(lightBg).toBeTruthy();
    expect(lightFg).toBeTruthy();

    const themeBtn = container.querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    await act(async () => {
      themeBtn.click();
      await Promise.resolve();
    });

    expect(useStore.getState().theme).toBe('dark');
    expect(panel.getAttribute('data-stemlm-theme')).toBe('dark');
    applyTheme(panel, 'dark');
    const darkBg = cssVar(panel, '--slm-bg');
    const darkFg = cssVar(panel, '--slm-fg');
    expect(darkBg).toBeTruthy();
    expect(darkFg).toBeTruthy();
    expect(darkBg).not.toBe(lightBg);
    expect(darkFg).not.toBe(lightFg);
    expect(panel.style.colorScheme).toBe('dark');

    unmount();
  });

  it('sizes the open panel from splitRatio', () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      splitRatio: 0.37,
    });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;
    expect(parseFloat(panel.style.width)).toBeCloseTo(37, 3);
    expect(panel.style.width.endsWith('vw')).toBe(true);
    unmount();
  });

  it('keeps step content visible in narrow and wide width bands', () => {
    type ROCb = ResizeObserverCallback;
    let roCb: ROCb | undefined;
    const PrevRO = globalThis.ResizeObserver;
    class FakeRO {
      constructor(cb: ROCb) {
        roCb = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = FakeRO as unknown as typeof ResizeObserver;

    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 360 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('narrow');
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).toContain('Newton second law');
    expect(container.querySelector('.slm-read')?.textContent).toContain('First visual state');
    const header = container.querySelector('.slm-header') as HTMLElement;
    const stepsTab = container.querySelector('#slm-tab-steps') as HTMLButtonElement;
    const solutionTab = container.querySelector('#slm-tab-solution') as HTMLButtonElement;
    expect(header.contains(stepsTab)).toBe(true);
    expect(header.contains(solutionTab)).toBe(true);
    act(() => {
      solutionTab.click();
    });
    expect(useStore.getState().view).toBe('solution');
    act(() => {
      stepsTab.click();
    });
    expect(useStore.getState().view).toBe('steps');

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 720 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('wide');
    expect(container.textContent).toContain('First visual state');
    expect(container.querySelector('.slm-read')?.textContent).toContain('Newton second law');
    expect(container.querySelector('.slm-step-rail-label')).toBeNull();
    const stepBtn = container.querySelector(
      '.slm-step-rail-btn[aria-current="step"]',
    ) as HTMLButtonElement;
    expect(stepBtn.getAttribute('aria-label')).toContain('First visual state');
    expect(stepBtn.getAttribute('title')).toBe('First visual state');
    expect(container.querySelector('.slm-step-index')).toBeTruthy();
    expect(cssVar(panel, '--slm-rail-size')).not.toBe('13.25rem');
    expect(getComputedStyle(container.querySelector('.slm-brand-name') as HTMLElement).height).toBe(
      '25px',
    );

    globalThis.ResizeObserver = PrevRO;
    unmount();
  });

  it('sizes the header lockup at 25px, 22px when the panel is narrow', () => {
    type ROCb = ResizeObserverCallback;
    let roCb: ROCb | undefined;
    const PrevRO = globalThis.ResizeObserver;
    class FakeRO {
      constructor(cb: ROCb) {
        roCb = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = FakeRO as unknown as typeof ResizeObserver;

    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;
    const brand = () => container.querySelector('.slm-brand-name') as HTMLElement;

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 720 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('wide');
    expect(cssVar(panel, '--slm-brand-size')).toBe('25px');
    expect(getComputedStyle(brand()).height).toBe('25px');

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 360 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('narrow');
    expect(cssVar(panel, '--slm-brand-size')).toBe('22px');

    globalThis.ResizeObserver = PrevRO;
    unmount();
  });

  it('applies plex fonts, dark canvas, question scroll, and a rounded shell', async () => {
    installShippedStyles();
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'dark' });
    const { container, unmount } = mountPanel();
    await flush();

    const panel = container.querySelector('.slm-panel') as HTMLElement;
    expect(cssVar(panel, '--font-sans')).toContain('IBM Plex Sans');
    expect(cssVar(panel, '--font-mono')).toContain('IBM Plex Mono');
    expect(cssVar(panel, '--slm-bg').toLowerCase()).toBe('#151515');
    expect(hexLuma(cssVar(panel, '--slm-formula-bg'))).toBeGreaterThanOrEqual(
      hexLuma('#151515') - 0.5,
    );
    expect(cssVar(panel, '--slm-formula-bg').toLowerCase()).not.toBe('#111111');
    expect(cssVar(panel, '--slm-fg').toLowerCase()).toBe('#ededed');
    expect(parseInt(cssVar(panel, '--slm-theme-duration'), 10)).toBeLessThanOrEqual(180);

    expect(container.querySelector('.slm-question-icon')?.textContent).toMatch(/Q\./);
    expect(container.querySelector('.slm-subject-chip')).toBeNull();
    const rail = container.querySelector('.slm-step-rail') as HTMLElement;
    const article = container.querySelector('.slm-read') as HTMLElement;
    expect(getComputedStyle(rail).overflowY).toBe('auto');
    expect(getComputedStyle(article).overflowY).toBe('auto');
    expect(PANEL_CSS).toMatch(/\.slm-step-rail\s*\{[\s\S]*scrollbar-width:\s*none/);
    const scroll = container.querySelector('.slm-topic-scroll') as HTMLElement;
    expect(scroll).toBeTruthy();
    expect(scroll.classList.contains('is-single')).toBe(true);
    expect(getComputedStyle(scroll).overflowY).toBe('hidden');
    expect(getComputedStyle(scroll).maxHeight).toBe('none');
    expect(PANEL_CSS).toMatch(/\.slm-topic-scroll\s*\{[\s\S]*max-height:\s*9\.25rem/);
    expect(PANEL_CSS).toMatch(/\.slm-topic-scroll\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(PANEL_CSS).toMatch(/\.slm-topic-scroll\.is-single \.slm-topic(?: p)?\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(getComputedStyle(panel).borderRadius).not.toBe('0px');

    const leading = container.querySelector('.slm-header-leading') as HTMLElement;
    const tabs = container.querySelector('.slm-tabs') as HTMLElement;
    expect(getComputedStyle(leading).justifyContent).toBe('flex-start');
    expect(getComputedStyle(leading).display).toBe('flex');
    expect(getComputedStyle(tabs).borderStyle).not.toBe('none');
    expect(getComputedStyle(tabs).borderWidth).not.toBe('0px');
    expect(PANEL_CSS).toMatch(
      /\.slm-tabs\s*\{[\s\S]*height:\s*calc\(var\(--slm-brand-size,\s*25px\)\s*\+\s*6px\)/,
    );

    const pdfBtn = container.querySelector('button[aria-label="Export PDF"]') as HTMLButtonElement;
    expect(pdfBtn.innerHTML).toContain('M15 2H6');
    expect(pdfBtn.innerHTML).not.toContain('M6.4 20.4h11.2');

    unmount();
  });
});

function cssBlock(source: string, selector: string): string {
  const needle = `${selector} {`;
  const at = source.indexOf(needle);
  if (at < 0) return '';
  const open = source.indexOf('{', at);
  const close = source.indexOf('}', open);
  if (open < 0 || close < 0) return '';
  return source.slice(open + 1, close);
}

function remToken(value: string | undefined): number {
  const m = /([\d.]+)rem/.exec(value ?? '');
  return m ? Number(m[1]) : NaN;
}

function hexLuma(hex: string): number {
  const h = hex.trim().replace('#', '');
  if (h.length < 6) return Number.NaN;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('Panel chrome: overlay, theme glyph, close motion, session strip', () => {
  beforeEach(() => {
    installShippedStyles();
  });

  it('packs the Prev/Next overlay as a right-docked rounded rect with shafted arrows', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'dark', activeStepIndex: 0 });
    const { container, unmount } = mountPanel();
    await flush();

    const overlay = container.querySelector('.slm-stepnav--overlay') as HTMLElement;
    const prev = container.querySelector('button[aria-label="Previous step"]') as HTMLButtonElement;
    const next = container.querySelector('button[aria-label="Next step"]') as HTMLButtonElement;
    expect(overlay).toBeTruthy();
    expect(prev).toBeTruthy();
    expect(next).toBeTruthy();
    expect(overlay.contains(prev)).toBe(true);
    expect(overlay.contains(next)).toBe(true);

    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    act(() => {
      next.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(1);
    act(() => {
      prev.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(0);
    act(() => {
      prev.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(0);
    expect(prev.disabled).toBe(true);

    const navCss = cssBlock(PANEL_CSS, '.slm-stepnav');
    const overlayCss = cssBlock(PANEL_CSS, '.slm-stepnav--overlay');
    const btnCss = cssBlock(PANEL_CSS, '.slm-stepnav-btn');
    expect(navCss).toMatch(/justify-content:\s*center/);
    expect(navCss).not.toMatch(/space-between/);
    expect(navCss).toMatch(/width:\s*auto/);
    expect(overlayCss).toMatch(/width:\s*auto/);
    expect(overlayCss).not.toMatch(/width:\s*50%/);
    expect(overlayCss).toMatch(/right:\s*var\(--slm-pad-x\)/);
    expect(overlayCss).toMatch(/left:\s*auto/);
    expect(overlayCss).not.toMatch(/left:\s*50%/);
    expect(overlayCss).not.toMatch(/translateX\(-50%\)/);
    expect(overlayCss).not.toMatch(/border-radius:\s*999px/);
    expect(overlayCss).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(btnCss).not.toMatch(/border-radius:\s*999px/);
    expect(remToken(/padding-block:\s*([\d.]+rem)/.exec(overlayCss)?.[1])).toBeLessThan(0.44);
    expect(remToken(/padding-block:\s*([\d.]+rem)/.exec(overlayCss)?.[1])).toBeGreaterThan(0.08);
    expect(remToken(/padding:\s*([\d.]+rem)/.exec(btnCss)?.[1])).toBeLessThan(0.5);
    expect(remToken(/bottom:\s*calc\(([\d.]+rem)/.exec(overlayCss)?.[1])).toBeGreaterThan(0.85);
    expect(overlayCss).not.toContain('#2f2e2e');
    expect(overlayCss).not.toContain('#3f3e3e');
    expect(overlayCss).not.toContain('#3c3b3b');
    expect(overlayCss).toMatch(/background:\s*var\(--slm-nav-shell\)/);

    const cs = getComputedStyle(overlay);
    expect(cs.justifyContent).not.toBe('space-between');
    expect(cs.width).not.toBe('50%');
    const padTop = parseFloat(cs.paddingTop);
    if (Number.isFinite(padTop) && padTop > 0) {
      expect(padTop).toBeLessThan(0.44 * 16);
    }

    expect(prev.innerHTML).not.toContain('m15 18-6-6 6-6');
    expect(next.innerHTML).not.toContain('m9 18 6-6-6-6');
    expect(prev.innerHTML).toContain('M19 12H5');
    expect(prev.innerHTML).toContain('m12 19-7-7 7-7');
    expect(next.innerHTML).toContain('M5 12h14');
    expect(next.innerHTML).toContain('m12 5 7 7-7 7');

    const darkShell = cssVar(overlay, '--slm-nav-shell').toLowerCase();
    expect(darkShell).not.toBe('#2f2e2e');
    if (darkShell.startsWith('#')) {
      expect(hexLuma(darkShell)).toBeLessThan(hexLuma('#2f2e2e'));
    }

    const panel = container.querySelector('.slm-panel') as HTMLElement;
    act(() => {
      useStore.getState().setTheme('light');
    });
    applyTheme(panel, 'light');
    const lightOverlay = container.querySelector('.slm-stepnav--overlay') as HTMLElement;
    const lightChip = cssVar(lightOverlay, '--slm-nav-chip').toLowerCase();
    const lightShell = cssVar(lightOverlay, '--slm-nav-shell').toLowerCase();
    expect(lightChip).not.toBe('#efefef');
    expect(lightShell).not.toBe('#ffffff');
    expect(lightShell).not.toBe('#efefef');

    unmount();
  });

  it('uses an upright filled crescent in dark theme and a centered ease-out close rotate', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const themeBtn = container.querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    expect(themeBtn.querySelector('.slm-theme-crescent')?.getAttribute('d')).toBe(
      'M20.15 14.2A8.2 8.2 0 1 1 10.35 3.85 6.25 6.25 0 0 0 20.15 14.2Z',
    );
    expect(themeBtn.innerHTML).not.toContain(
      'M13.15 6.05a6.15 6.15 0 1 0 4.2 10.85 5.05 5.05 0 1 1-4.2-10.85Z',
    );
    expect(themeBtn.classList.contains('is-dark')).toBe(false);

    await act(async () => {
      themeBtn.click();
      await Promise.resolve();
    });
    const darkBtn = container.querySelector(
      'button[aria-label="Switch to light theme"]',
    ) as HTMLButtonElement;
    expect(darkBtn.classList.contains('is-dark')).toBe(true);
    expect(useStore.getState().theme).toBe('dark');
    expect(darkBtn.querySelector('.slm-theme-disc')).toBeTruthy();
    expect(darkBtn.querySelector('.slm-theme-rays')).toBeTruthy();

    const closeCss = cssBlock(PANEL_CSS, '.slm-icon-btn--close svg');
    const closeHoverCss = cssBlock(PANEL_CSS, '.slm-icon-btn--close:hover:not(:disabled) svg');
    expect(closeCss).toMatch(/transform-origin:\s*center/);
    expect(closeCss).toMatch(/cubic-bezier\(/);
    expect(closeCss).not.toMatch(/transition:\s*[^;]*\s+linear\b/);
    expect(closeHoverCss).toMatch(/rotate\(/);
    expect(PANEL_CSS).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\.slm-icon-btn--close svg/,
    );
    expect(PANEL_CSS).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\.slm-icon-btn--close:hover:not\(:disabled\) svg[\s\S]*transform:\s*none/,
    );

    const closeBtn = container.querySelector('.slm-icon-btn--close') as HTMLElement;
    const closeSvg = closeBtn.querySelector('svg') as SVGElement;
    const origin = getComputedStyle(closeSvg).transformOrigin;
    expect(origin).toBeTruthy();
    expect(origin).not.toBe('0px 0px');

    unmount();
  });

  it('scrolls many session pills on one row without a visible scrollbar and still switches', () => {
    const sessions = Array.from({ length: 24 }, (_, i) => {
      const s = buildStudySession();
      s.id = `session-strip-${i}`;
      s.question = `Question ${i + 1}`;
      s.capsule = {
        ...s.capsule,
        meta: { ...s.capsule.meta, topic: `${i + 1}. Long session topic ${i + 1} about circular motion` },
      };
      return s;
    });
    useStore.getState().setSessions(sessions);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();

    const strip = container.querySelector('.slm-session-switch') as HTMLElement;
    expect(strip).toBeTruthy();
    const pills = [...strip.querySelectorAll<HTMLButtonElement>('.slm-session-pill')];
    expect(pills).toHaveLength(24);

    const stripCss = cssBlock(PANEL_CSS, '.slm-session-switch');
    expect(stripCss).toMatch(/overflow-x:\s*auto/);
    expect(stripCss).toMatch(/flex-wrap:\s*nowrap/);
    expect(stripCss).toMatch(/scrollbar-width:\s*none/);
    expect(PANEL_CSS).toMatch(/\.slm-session-switch::-webkit-scrollbar\s*\{[^}]*display:\s*none/);

    const cs = getComputedStyle(strip);
    expect(cs.overflowX).toMatch(/auto|scroll/);
    expect(cs.flexWrap).toBe('nowrap');
    const scrollbarWidth = cs.getPropertyValue('scrollbar-width').trim();
    if (scrollbarWidth) expect(scrollbarWidth).toBe('none');

    const last = pills[pills.length - 1]!;
    act(() => {
      last.click();
    });
    expect(useStore.getState().activeSessionId).toBe(sessions[23]!.id);

    act(() => {
      pills[0]!.click();
    });
    expect(useStore.getState().activeSessionId).toBe(sessions[0]!.id);

    unmount();
  });

  it('draws a header/body rule and a matching rule under the session strip', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();
    await flush();

    const headerCss = cssBlock(PANEL_CSS, '.slm-header');
    const stripCss = cssBlock(PANEL_CSS, '.slm-session-switch');
    expect(headerCss).toMatch(/border-bottom:\s*1px solid var\(--slm-border-subtle\)/);
    expect(stripCss).toMatch(/border-bottom:\s*1px solid var\(--slm-border-subtle\)/);
    expect(container.querySelector('.slm-session-switch')).toBeNull();
    const header = container.querySelector('.slm-header') as HTMLElement;
    const body = container.querySelector('.slm-body') as HTMLElement;
    expect(header).toBeTruthy();
    expect(body).toBeTruthy();
    const headerBorder = getComputedStyle(header).borderBottomWidth;
    if (headerBorder && headerBorder !== '') {
      expect(headerBorder).not.toBe('0px');
    }

    const second = buildStudySession();
    second.id = 'panel-study-2';
    second.question = 'Second question';
    await act(async () => {
      useStore.getState().addSession(second);
    });
    await flush();
    const strip = container.querySelector('.slm-session-switch') as HTMLElement;
    expect(strip).toBeTruthy();
    const stripBorder = getComputedStyle(strip).borderBottomWidth;
    if (stripBorder && stripBorder !== '') {
      expect(stripBorder).not.toBe('0px');
    }
    unmount();
  });

  it('keeps rail/formula/solution on interpolating tokens after a dark theme apply', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const panelEl = container.querySelector('.slm-panel') as HTMLElement;
    act(() => {
      useStore.getState().setTheme('dark');
    });
    applyTheme(panelEl, 'dark');

    expect(cssVar(panelEl, '--slm-bg').toLowerCase()).toBe('#151515');
    expect(cssVar(panelEl, '--slm-fg').toLowerCase()).toBe('#ededed');
    const formulaBg = cssVar(panelEl, '--slm-formula-bg').toLowerCase();
    expect(formulaBg).not.toMatch(/#f|#e[0-9a-f]{5}|#ffffff|#efefef|#f5f5f5/i);
    expect(hexLuma(formulaBg)).toBeGreaterThanOrEqual(hexLuma('#151515') - 0.5);

    const railBtn = container.querySelector('.slm-step-rail-btn') as HTMLElement;
    const formula = container.querySelector('.slm-formula') as HTMLElement;
    expect(railBtn).toBeTruthy();
    expect(getComputedStyle(railBtn).backgroundColor).not.toMatch(/rgb\(\s*245/);
    if (formula) {
      expect(getComputedStyle(formula).backgroundColor).not.toMatch(/rgb\(\s*245/);
    }

    const duration = cssVar(panelEl, '--slm-theme-duration');
    expect(parseInt(duration, 10)).toBeLessThanOrEqual(180);
    unmount();
  });

  it('uses slightly darker-than-#171717 light answer ink, not pure black', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const panelEl = container.querySelector('.slm-panel') as HTMLElement;
    applyTheme(panelEl, 'light');
    const fg = cssVar(panelEl, '--slm-fg').toLowerCase();
    expect(fg).not.toBe('#000000');
    expect(fg).not.toBe('#000');
    expect(fg).not.toBe('black');
    expect(hexLuma(fg)).toBeLessThan(hexLuma('#171717'));

    expect(cssBlock(PANEL_CSS, '.slm-step-work-body')).toMatch(/color:\s*var\(--slm-fg\)/);
    expect(cssBlock(PANEL_CSS, '.slm-card-body')).toMatch(/color:\s*var\(--slm-fg\)/);
    expect(cssBlock(PANEL_CSS, '.slm-solution')).toMatch(/color:\s*var\(--slm-fg\)/);
    unmount();
  });
});

describe('Panel html dumps', () => {
  function writeDump(name: string, innerHTML: string, theme: 'light' | 'dark') {
    mkdirSync(SCRATCH, { recursive: true });
    const markup = innerHTML.replaceAll('data-width="narrow"', 'data-width="mid"');
    const page = `<!doctype html>
<html data-stemlm-theme="${theme}">
<head>
<meta charset="utf-8">
<title>${name}</title>
<style>
html, body { margin: 0; height: 100%; background: ${theme === 'dark' ? '#111113' : '#e8e8ea'}; }
${TOKENS_CSS}
${PANEL_CSS}
.slm-panel { position: relative !important; height: 100vh; width: 520px; max-width: 100%; margin-left: auto; transform: none !important; }
</style>
</head>
<body>${markup}</body>
</html>`;
    writeFileSync(resolve(SCRATCH, `${name}.html`), page, 'utf8');
  }

  it('writes empty, loading, ready-steps, and ready-solution dumps in light and dark', async () => {
    installShippedStyles();

    async function settle() {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 320));
      });
    }

    useStore.setState({ panelOpen: true, status: 'idle', theme: 'light' });
    let mounted = mountPanel();
    await settle();
    writeDump('panel-empty-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'idle', theme: 'dark' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-empty-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'loading', theme: 'light', sessions: [] });
    mounted = mountPanel();
    await settle();
    writeDump('panel-loading-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'loading', theme: 'dark', sessions: [] });
    mounted = mountPanel();
    await settle();
    writeDump('panel-loading-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();

    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    mounted = mountPanel();
    await settle();
    expect(mounted.container.innerHTML.length).toBeGreaterThan(200);
    writeDump('panel-ready-steps-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'dark' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-ready-steps-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'ready', view: 'solution', theme: 'light' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-ready-solution-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'ready', view: 'solution', theme: 'dark' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-ready-solution-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();
  });
});

function verifyFailSession(): Session {
  return {
    id: 'verify-fail',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Find the current',
    raw: '',
    capsule: {
      meta: { version: 2, subject: 'Electrical', topic: 'Series current', qid: 'q1' },
      solution: 'I = 2 A after correction.',
      solutionDiagrams: [],
      steps: [
        {
          id: 's1',
          index: 1,
          title: 'Add the resistors',
          body: '$R_T$ is 6 ohm.',
        },
        {
          id: 's2',
          index: 2,
          title: 'Correct the unit of I',
          body: 'Wrong value was 2 mA. Units check failed. Corrected $I=2\\,\\text{A}$.',
        },
      ],
      verification: {
        methods: ['units', 'backsub'],
        status: 'fail',
        notes: 'mA vs A',
        correction: 'I is 2 A, not 2 mA',
      },
      uncertainty: {
        assumptions: ['g = 9.81 if used', 'rms not peak'],
        lowConfidenceSteps: ['s2'],
        studentChecks: ['photo labels for current units'],
      },
    },
  };
}

function nonStemSession(): Session {
  return {
    id: 'non-stem',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Write a haiku about autumn',
    raw: '',
    capsule: {
      meta: {
        version: 2,
        subject: 'General',
        topic: 'Not a STEM question',
        archetype: 'conceptual',
      },
      solution: 'This is not a STEM solve.',
      solutionDiagrams: [],
      steps: [
        {
          id: 's1',
          index: 1,
          title: 'Name why it is not STEM',
          body: 'The prompt is a poem, not a STEM question.',
        },
      ],
      uncertainty: {
        assumptions: ['insufficient data for a numeric solve'],
        lowConfidenceSteps: ['s1'],
        studentChecks: ['confirm they wanted a poem'],
      },
    },
  };
}

const BACK_SUB_NOTE =
  'Back-substitution yields (1/2)^6 = 1/64, matching the factor 64 in 108 days.';
const HALFLIFE_STUDENT_CHECK =
  'Verify that half-life is 18 days and radiation factor is 64.';
const GOAL_SCRATCH = resolve(
  'C:\\Users\\chait\\AppData\\Local\\Temp\\grok-goal-b5a9895ff4e4\\implementer',
);

function screenshotHalfLifeSession(): Session {
  return {
    id: 'half-life',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'A sample has half-life 18 days. After 108 days the radiation factor is 64. Why?',
    raw: '',
    capsule: {
      meta: { version: 2, subject: 'Physics', topic: 'Radioactive decay', qid: 'q1' },
      solution: 'Six half-lives give remaining fraction 1/64.',
      solutionDiagrams: [],
      steps: [
        {
          id: 's1',
          index: 1,
          title: 'Count the half-lives',
          body: '108 days / 18 days = 6 half-lives.',
        },
        {
          id: 's2',
          index: 2,
          title: 'Apply the decay factor',
          body: 'After 6 half-lives the remaining fraction is $(1/2)^6 = 1/64$.',
        },
      ],
      verification: {
        methods: ['units', 'backsub', 'oom'],
        status: 'pass',
        notes: BACK_SUB_NOTE,
      },
      uncertainty: {
        assumptions: ['none'],
        lowConfidenceSteps: ['none'],
        studentChecks: [HALFLIFE_STUDENT_CHECK],
      },
    },
  };
}

function assertNoProtocolChrome(html: string, text: string) {
  expect(html).not.toContain('slm-verify');
  expect(html).not.toContain('slm-uncertainty');
  expect(html).not.toContain('slm-step-id');
  expect(html).not.toContain('slm-signals-title');
  expect(html).not.toMatch(/>Verification</i);
  expect(html).not.toMatch(/>Uncertainty</i);
  expect(html).not.toMatch(/>assumptions</i);
  expect(text).not.toMatch(/\bstatus:\s*(pass|fail)\b/i);
  expect(text).not.toMatch(/\bmethods:\s/i);
  expect(text).not.toMatch(/student check/i);
  expect(text).not.toMatch(/low-confidence/i);
  expect(text).not.toContain('Verify that ');
}

function assertNoStepIdLeaks(root: HTMLElement) {
  expect(root.querySelector('.slm-step-id')).toBeNull();
  for (const el of root.querySelectorAll('[title], [aria-label]')) {
    const blob = `${el.getAttribute('title') ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
    expect(blob).not.toMatch(/\(\s*s\d+\s*\)/);
    expect(blob).not.toMatch(/\bs\d+\s*:/);
  }
}

describe('Panel verification and uncertainty', () => {
  it('hides screenshot verification/uncertainty chrome and s1/s2 chips', async () => {
    const session = screenshotHalfLifeSession();
    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
      activeStepIndex: 0,
    });
    const { container, unmount } = mountPanel();
    await flush();

    const stepsHtml = container.innerHTML;
    const stepsText = container.textContent ?? '';
    assertNoProtocolChrome(stepsHtml, stepsText);
    assertNoStepIdLeaks(container);
    expect(stepsText).toContain('Back-substitution yields');
    expect(stepsText).toContain('matching the factor 64');
    expect(stepsText).not.toMatch(/\bnone\b/i);
    expect(container.querySelector('.slm-answer-notes')?.textContent).toContain(
      'Back-substitution yields',
    );
    expect(container.querySelector('.slm-answer-notes h2, .slm-answer-notes h3')).toBeNull();
    mkdirSync(GOAL_SCRATCH, { recursive: true });
    writeFileSync(resolve(GOAL_SCRATCH, 'panel-steps.html'), stepsHtml, 'utf8');

    const solutionTab = container.querySelector('#slm-tab-solution') as HTMLButtonElement;
    act(() => {
      solutionTab.click();
    });
    await flush();
    const solutionHtml = container.innerHTML;
    const solutionText = container.textContent ?? '';
    assertNoProtocolChrome(solutionHtml, solutionText);
    assertNoStepIdLeaks(container);
    expect(solutionText).toContain('Back-substitution yields');
    expect(solutionText).not.toContain('Verify that ');
    writeFileSync(resolve(GOAL_SCRATCH, 'panel-solution.html'), solutionHtml, 'utf8');
    unmount();
  });

  it('shows real assumptions and fail corrections as unlabeled answer lines', async () => {
    const session = verifyFailSession();
    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();
    const html = container.innerHTML;
    const text = container.textContent ?? '';
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.katex-mathml').forEach((n) => n.remove());
    const vis = clone.textContent ?? '';
    assertNoProtocolChrome(html, text);
    assertNoStepIdLeaks(container);
    expect(text).toContain('I is 2 A, not 2 mA');
    expect(vis).toMatch(/g\s*=\s*9\.81/);
    expect(vis).toContain('if used');
    expect(text).toContain('rms not peak');
    expect(text).toContain('mA vs A');
    expect(text).not.toContain('photo labels for current units');
    expect(html).not.toContain('correction:');
    const notes = container.querySelector('.slm-answer-notes');
    const notesClone = notes?.cloneNode(true) as HTMLElement | undefined;
    notesClone?.querySelectorAll('.katex-mathml').forEach((n) => n.remove());
    expect(notesClone?.textContent).toMatch(/g\s*=\s*9\.81/);
    expect(notesClone?.textContent).toContain('if used');
    expect(notes?.querySelector('h2, h3, h4')).toBeNull();
    expect(notes?.querySelector('.katex')).toBeTruthy();
    unmount();
  });

  it('flags a General non-STEM / insufficient-data capsule without step-id chips', async () => {
    const session = nonStemSession();
    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();
    const text = container.textContent ?? '';
    expect(text).toMatch(/Not a STEM question/i);
    expect(text).toMatch(/Insufficient data/i);
    expect(text).toContain('insufficient data for a numeric solve');
    expect(text).not.toContain('confirm they wanted a poem');
    assertNoProtocolChrome(container.innerHTML, text);
    assertNoStepIdLeaks(container);
    unmount();
  });
});

