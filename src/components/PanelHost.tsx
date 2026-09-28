import { AnimatePresence } from 'framer-motion';
import { Panel } from './Panel';

/**
 * The study panel with its enter / exit animation. It is the root of
 * study-panel.js, loaded the first time the panel opens (PERF-03).
 */
export function PanelHost({ open, onExitComplete }: { open: boolean; onExitComplete: () => void }) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && <Panel key="stemlm-panel" />}
    </AnimatePresence>
  );
}
