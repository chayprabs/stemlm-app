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
export type PanelView = 'steps' | 'solution';

export interface StoreState {
  // UI
  panelOpen: boolean;
  savedLibraryOpen: boolean;
  settingsOpen: boolean;
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

  // Data
  sessions: Session[];
  activeSessionId?: string;
  /** Index into the flattened rail entries (steps + inline follow-up answers). */
  activeStepIndex: number;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  openSavedLibrary: () => void;
  closeSavedLibrary: () => void;
  openSettings: () => void;
  closeSettings: () => void;
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
  savedLibraryOpen: false,
  settingsOpen: false,
  status: 'idle',
  view: 'steps',
  theme: 'light',
  buttonInjected: false,
  settings: DEFAULT_SETTINGS,
  splitRatio: DEFAULT_SETTINGS.splitRatio,
  splitDragging: false,
  sessions: [],
  activeStepIndex: 0,

  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  openSavedLibrary: () => set({ savedLibraryOpen: true, settingsOpen: false }),
  closeSavedLibrary: () => set({ savedLibraryOpen: false }),
  openSettings: () => set({ settingsOpen: true, savedLibraryOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),
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
      if (idx < 0) return s;
      const sessions = s.sessions.filter((sess) => sess.id !== id);
      if (sessions.length === 0) {
        return {
          sessions,
          activeSessionId: undefined,
          activeStepIndex: 0,
          status: 'idle' as const,
          errorMessage: undefined,
        };
      }
      if (s.activeSessionId !== id) {
        return { sessions };
      }
      const neighbor = sessions[Math.min(idx, sessions.length - 1)];
      return {
        sessions,
        activeSessionId: neighbor?.id,
        activeStepIndex: 0,
        view: s.settings.defaultView,
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
