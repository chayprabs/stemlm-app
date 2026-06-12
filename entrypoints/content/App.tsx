import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { OverlayButton } from '@/src/components/OverlayButton';
import { Panel } from '@/src/components/Panel';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { applySplit, removeSplit } from '@/src/lib/split-screen';
import { shortcutActionFromEvent } from '@/src/lib/keyboard-shortcuts';

/**
 * Root content-script app: the docked overlay button + the split-screen study
 * panel. When the panel is open the host page is shrunk to the left so the two
 * sit side-by-side (resizable, ratio persisted).
 */
export default function App() {
  const panelOpen = useStore((s) => s.panelOpen);
  const splitRatio = useStore((s) => s.splitRatio);
  const splitDragging = useStore((s) => s.splitDragging);

  useEffect(() => {
    if (!panelOpen) return;
    applySplit(splitRatio, splitDragging);
  }, [panelOpen, splitRatio, splitDragging]);

  useEffect(() => () => removeSplit(), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shortcutActionFromEvent(e) !== 'toggle-panel') return;
      useStore.getState().togglePanel();
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return (
    <ErrorBoundary>
      <OverlayButton />
      <AnimatePresence
        onExitComplete={() => {
          if (!useStore.getState().panelOpen) removeSplit();
        }}
      >
        {panelOpen && <Panel key="stemlm-panel" />}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
