/**
 * Central UI + session state for the study panel. Lives in the content-script
 * JS context, so it is shared by the orchestration controller and the React
 * components, and is naturally isolated per browser tab.
 */
import { create } from 'zustand';
import type { Session, StepFollowup } from '@/src/protocol/types';
import {
  buildStepEntries,
  findFollowupEntryIndex,
  SOLUTION_ANCHOR_ID,
} from '@/src/lib/step-entries';
import type { ResolvedTheme } from '@/src/lib/theme';
import { DEFAULT_SETTINGS, type Settings } from '@/src/lib/settings';
import { clampSplitRatio } from '@/src/lib/split-ratio';

export type PanelStatus = 'idle' | 'loading' | 'ready' | 'error';

/** The status line after a question is removed from the strip; Undo is offered beside it. */
export const REMOVED_NOTICE = 'Question removed from the panel.';
export type PanelView = 'steps' | 'solution';

export interface StoreState {
  // UI
  panelOpen: boolean;
  /** False for a panel that opened by itself, on an answer: the keyboard stays where the student left it. */
  panelTakesFocus: boolean;
  status: PanelStatus;
  errorMessage?: string;
  view: PanelView;
  theme: ResolvedTheme;
  /** True once we've injected a prompt and are waiting / showing the answer. */
  buttonInjected: boolean;

  // Settings (mirrored from storage for reactive UI)
  settings: Settings;

  /** Split-screen width of the panel as a fraction of the viewport [0.25, 0.75]. */
  splitRatio: number;
  /** True while the user is dragging the resize handle. */
  splitDragging: boolean;
  /** Width in px that the chat site's own sidebar shows beside the open panel (its rail, when folded); not kept up while the panel is closed. */
  hostSidebarPx: number;

  // Data
  sessions: Session[];
  activeSessionId?: string;
  /**
   * The answer the chat is still writing. That session holds only the steps finished so far and is
   * replaced by the whole answer when it ends. Set by the controller and never stored.
   */
  writingId?: string;
  /** Index into the flattened rail entries (steps + inline follow-up answers). */
  activeStepIndex: number;
  /**
   * The question last removed from the strip. While the status line still reads REMOVED_NOTICE
   * it offers to put this back. Not kept when sessions are shared across tabs: a removal is
   * broadcast there and cannot be taken back (src/lib/session-sync.ts).
   */
  removed?: { session: Session; index: number };

  // Actions
  /** `takeFocus: false` when nobody asked for the panel: it opens on an answer and leaves focus alone. */
  openPanel: (takeFocus?: boolean) => void;
  closePanel: () => void;
  togglePanel: () => void;
  setStatus: (status: PanelStatus, errorMessage?: string) => void;
  setView: (view: PanelView) => void;
  setTheme: (theme: ResolvedTheme) => void;
  setSettings: (settings: Settings) => void;
  setButtonInjected: (v: boolean) => void;
  setSplitRatio: (ratio: number) => void;
  setSplitDragging: (dragging: boolean) => void;

  addSession: (session: Session) => void;
  /** Drop a session from the question strip. */
  removeSession: (id: string) => void;
  /** Undo the last `removeSession`: the question returns to its place and opens. */
  restoreRemoved: () => void;
  /** Attach an Ask-in-chat answer inline after its anchor step and focus it. */
  addFollowup: (sessionId: string, followup: StepFollowup) => void;
  /** Replace all sessions (used by "Load conversation"). */
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (id: string) => void;
  setActiveStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetSessions: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  panelOpen: false,
  panelTakesFocus: true,
  status: 'idle',
  view: 'steps',
  theme: 'light',
  buttonInjected: false,
  settings: DEFAULT_SETTINGS,
  splitRatio: DEFAULT_SETTINGS.splitRatio,
  splitDragging: false,
  hostSidebarPx: 0,
  sessions: [],
  activeStepIndex: 0,

  openPanel: (takeFocus = true) => set({ panelOpen: true, panelTakesFocus: takeFocus }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen, panelTakesFocus: true })),
  setStatus: (status, errorMessage) => set({ status, errorMessage }),
  setView: (view) => set({ view }),
  setTheme: (theme) => set({ theme }),
  setSettings: (settings) => set({ settings }),
  setButtonInjected: (buttonInjected) => set({ buttonInjected }),
  setSplitRatio: (ratio) => set({ splitRatio: clampSplitRatio(ratio) }),
  setSplitDragging: (splitDragging) => set({ splitDragging }),

  addSession: (session) =>
    set((s) => ({
      sessions: [...s.sessions, session],
      activeSessionId: session.id,
      activeStepIndex: 0,
      status: 'ready',
      errorMessage: undefined,
      view: s.settings.defaultView,
    })),

  removeSession: (id) =>
    set((s) => {
      const idx = s.sessions.findIndex((sess) => sess.id === id);
      const session = s.sessions[idx];
      if (!session) return s;
      const sessions = s.sessions.filter((sess) => sess.id !== id);
      // The remove control sits on every chip, a click away from switching to it: say what
      // happened and keep the question so the status line can put it back.
      const undo = s.settings.shareAcrossTabs
        ? {}
        : { removed: { session, index: idx }, errorMessage: REMOVED_NOTICE };
      if (sessions.length === 0) {
        return {
          sessions,
          activeSessionId: undefined,
          activeStepIndex: 0,
          status: 'idle' as const,
          errorMessage: undefined,
          ...undo,
        };
      }
      // A notice is not an error: it takes the place of one that was showing.
      const status = s.status === 'error' && 'removed' in undo ? ('ready' as const) : s.status;
      if (s.activeSessionId !== id) {
        return { sessions, status, ...undo };
      }
      const neighbor = sessions[Math.min(idx, sessions.length - 1)];
      return {
        sessions,
        activeSessionId: neighbor?.id,
        activeStepIndex: 0,
        view: s.settings.defaultView,
        status,
        errorMessage: undefined,
        ...undo,
      };
    }),

  restoreRemoved: () =>
    set((s) => {
      const removed = s.removed;
      if (!removed) return s;
      if (s.sessions.some((sess) => sess.id === removed.session.id)) return { removed: undefined };
      const sessions = [...s.sessions];
      sessions.splice(Math.min(removed.index, sessions.length), 0, removed.session);
      return {
        sessions,
        removed: undefined,
        activeSessionId: removed.session.id,
        activeStepIndex: 0,
        view: s.settings.defaultView,
        status: s.status === 'loading' ? ('loading' as const) : ('ready' as const),
        errorMessage: undefined,
      };
    }),

  setSessions: (sessions) =>
    set((s) => ({
      sessions,
      activeSessionId: sessions[sessions.length - 1]?.id,
      activeStepIndex: 0,
      status: sessions.length ? 'ready' : 'idle',
      errorMessage: undefined,
      view: s.settings.defaultView,
    })),

  addFollowup: (sessionId, followup) =>
    set((s) => {
      const sessions = s.sessions.map((sess) =>
        sess.id === sessionId
          ? { ...sess, updatedAt: Date.now(), followups: [...(sess.followups ?? []), followup] }
          : sess,
      );
      // Solution-tab asks stay in the solution view; step asks focus the new
      // rail entry. Neither leaks into the other.
      if (followup.anchorStepId === SOLUTION_ANCHOR_ID) {
        return {
          sessions,
          activeSessionId: sessionId,
          view: 'solution',
          status: 'ready',
          errorMessage: undefined,
        };
      }
      const target = sessions.find((sess) => sess.id === sessionId);
      const entries = buildStepEntries(target);
      const idx = findFollowupEntryIndex(entries, followup.id);
      return {
        sessions,
        activeSessionId: sessionId,
        activeStepIndex: idx >= 0 ? idx : s.activeStepIndex,
        view: 'steps',
        status: 'ready',
        errorMessage: undefined,
      };
    }),

  setActiveSession: (id) =>
    set((s) => ({ activeSessionId: id, activeStepIndex: 0, view: s.settings.defaultView })),

  setActiveStep: (index) => {
    const session = getActiveSession(get());
    const max = session ? buildStepEntries(session).length - 1 : 0;
    set({ activeStepIndex: Math.max(0, Math.min(index, Math.max(0, max))) });
  },

  nextStep: () => get().setActiveStep(get().activeStepIndex + 1),
  prevStep: () => get().setActiveStep(get().activeStepIndex - 1),

  resetSessions: () =>
    set({ sessions: [], activeSessionId: undefined, activeStepIndex: 0, status: 'idle' }),
}));

export function getActiveSession(state: StoreState): Session | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

/** Hook helper for components. */
export function useActiveSession(): Session | undefined {
  return useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId));
}
