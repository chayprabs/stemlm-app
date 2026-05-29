/**
 * Central UI + session state for the study panel. Lives in the content-script
 * JS context, so it is shared by the orchestration controller and the React
 * components, and is naturally isolated per browser tab.
 */
import { create } from 'zustand';
import type { Session } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { DEFAULT_SETTINGS, type Settings } from '@/src/lib/settings';

export type PanelStatus = 'idle' | 'loading' | 'ready' | 'error';
export type PanelView = 'steps' | 'solution';

export interface StoreState {
  // UI
  panelOpen: boolean;
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

  // Data
  sessions: Session[];
  activeSessionId?: string;
  activeStepIndex: number;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setStatus: (status: PanelStatus, errorMessage?: string) => void;
  setView: (view: PanelView) => void;
  setTheme: (theme: ResolvedTheme) => void;
  setSettings: (settings: Settings) => void;
  setButtonInjected: (v: boolean) => void;
  setSplitRatio: (ratio: number) => void;

  addSession: (session: Session) => void;
  /** Replace all sessions (used by "Load conversation"). */
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (id: string) => void;
  setActiveStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  toggleReviewed: (stepId: string) => void;
  resetSessions: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  panelOpen: false,
  status: 'idle',
  view: 'steps',
  theme: 'light',
  buttonInjected: false,
  settings: DEFAULT_SETTINGS,
  splitRatio: DEFAULT_SETTINGS.splitRatio,
  sessions: [],
  activeStepIndex: 0,

  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setStatus: (status, errorMessage) => set({ status, errorMessage }),
  setView: (view) => set({ view }),
  setTheme: (theme) => set({ theme }),
  setSettings: (settings) => set({ settings }),
  setButtonInjected: (buttonInjected) => set({ buttonInjected }),
  setSplitRatio: (ratio) =>
    set({ splitRatio: Math.min(0.75, Math.max(0.25, ratio)) }),

  addSession: (session) =>
    set((s) => ({
      sessions: [...s.sessions, session],
      activeSessionId: session.id,
      activeStepIndex: 0,
      status: 'ready',
      view: 'steps',
    })),

  setSessions: (sessions) =>
    set(() => ({
      sessions,
      activeSessionId: sessions[sessions.length - 1]?.id,
      activeStepIndex: 0,
      status: sessions.length ? 'ready' : 'idle',
    })),

  setActiveSession: (id) => set({ activeSessionId: id, activeStepIndex: 0, view: 'steps' }),

  setActiveStep: (index) => {
    const session = getActiveSession(get());
    const max = session ? session.capsule.steps.length - 1 : 0;
    set({ activeStepIndex: Math.max(0, Math.min(index, Math.max(0, max))) });
  },

  nextStep: () => get().setActiveStep(get().activeStepIndex + 1),
  prevStep: () => get().setActiveStep(get().activeStepIndex - 1),

  toggleReviewed: (stepId) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => {
        if (sess.id !== s.activeSessionId) return sess;
        const has = sess.reviewedStepIds.includes(stepId);
        return {
          ...sess,
          updatedAt: Date.now(),
          reviewedStepIds: has
            ? sess.reviewedStepIds.filter((id) => id !== stepId)
            : [...sess.reviewedStepIds, stepId],
        };
      }),
    })),

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
