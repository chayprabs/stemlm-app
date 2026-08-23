import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { OverlayButton } from '@/src/components/OverlayButton';
import { Panel } from '@/src/components/Panel';
import { SavedLibraryOverlay } from '@/src/components/SavedLibraryOverlay';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { applySplit, removeSplit } from '@/src/lib/split-screen';

/**
 * Root content-script app: the docked overlay button + the split-screen study
 * panel. When the panel is open the host page is shrunk to the left so the two
 * sit side-by-side (resizable, ratio persisted).
 */
export default function App() {
  const panelOpen = useStore((s) => s.panelOpen);
  const savedLibraryOpen = useStore((s) => s.savedLibraryOpen);
  const closeSavedLibrary = useStore((s) => s.closeSavedLibrary);
  const splitRatio = useStore((s) => s.splitRatio);
  const splitDragging = useStore((s) => s.splitDragging);

  useEffect(() => {
    if (!panelOpen) return;
    applySplit(splitRatio, splitDragging);
  }, [panelOpen, splitRatio, splitDragging]);

  useEffect(() => () => removeSplit(), []);

  return (
    <ErrorBoundary>
      <OverlayButton />
      {savedLibraryOpen && <SavedLibraryOverlay onClose={closeSavedLibrary} />}
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
