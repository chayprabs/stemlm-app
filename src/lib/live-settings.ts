/**
 * Push persisted settings into the in-tab study session.
 * Overlay / options writes call this directly so the live panel does not wait
 * on storage.onChanged in the same JS context. The content script also uses it
 * when another surface (popup fallback, another tab) changes storage.
 */
import { useStore } from '@/src/state/store';
import { resolveTheme } from '@/src/lib/theme';
import {
  loadMirroredSessions,
  mergeMirroredSessions,
  mirrorActiveSessions,
  sessionsMirrorFingerprint,
} from '@/src/lib/session-sync';
import type { Settings } from '@/src/lib/settings';

export function applyLiveSettings(next: Settings, prev: Settings = useStore.getState().settings): void {
  useStore.getState().setSettings(next);
  useStore.getState().setTheme(resolveTheme(next.theme));

  const state = useStore.getState();
  if (!state.splitDragging && Math.abs(state.splitRatio - next.splitRatio) > 0.001) {
    state.setSplitRatio(next.splitRatio);
  }

  if (next.shareAcrossTabs && !prev.shareAcrossTabs) {
    // Merge with whatever other tabs already mirrored — never clobber it.
    void loadMirroredSessions().then((shared) => {
      const local = useStore.getState().sessions;
      const merged = mergeMirroredSessions(local, shared);
      if (sessionsMirrorFingerprint(merged) !== sessionsMirrorFingerprint(local)) {
        useStore.getState().setSessions(merged);
      }
      if (merged.length) void mirrorActiveSessions(merged);
    });
  } else if (!next.shareAcrossTabs && prev.shareAcrossTabs) {
    void mirrorActiveSessions([]);
  }
}
