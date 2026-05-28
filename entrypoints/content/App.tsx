import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { OverlayButton } from '@/src/components/OverlayButton';
import { Panel } from '@/src/components/Panel';

const PANEL_WIDTH = 'min(480px, 46vw)';

/**
 * Root content-script app: the docked overlay button + the sliding study panel.
 * When the panel is open we push the host page left (margin-right) so the panel
 * sits beside the chat rather than covering it.
 */
export default function App() {
  const panelOpen = useStore((s) => s.panelOpen);

  useEffect(() => {
    const body = document.body;
    const prev = body.style.marginRight;
    const prevTransition = body.style.transition;
    body.style.transition = 'margin-right 0.32s cubic-bezier(0.22,1,0.36,1)';
    body.style.marginRight = panelOpen ? PANEL_WIDTH : '';
    return () => {
      body.style.marginRight = prev;
      body.style.transition = prevTransition;
    };
  }, [panelOpen]);

  return (
    <>
      <OverlayButton />
      <AnimatePresence>{panelOpen && <Panel />}</AnimatePresence>
    </>
  );
}
