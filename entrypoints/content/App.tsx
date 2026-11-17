import { useEffect, useLayoutEffect, useState } from 'react';
import { useStore } from '@/src/state/store';
import { OverlayButton } from '@/src/components/OverlayButton';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { applySplit, removeSplit } from '@/src/lib/split-screen';
import { syncHostSidebar } from '@/src/platforms/host-sidebar';
import { loadPanelHost, type PanelHostComponent } from '@/src/content/load-panel';
import { useViewportWidth } from '@/src/components/use-viewport-width';

function reportHostSidebar(px: number) {
  if (useStore.getState().hostSidebarPx !== px) useStore.setState({ hostSidebarPx: px });
}

/**
 * Root content-script app: the docked overlay button + the split-screen study
 * panel. When the panel is open the host page is shrunk to the left so the two
 * sit side-by-side (resizable, ratio persisted). The panel code loads the first
 * time it opens, so a chat page that never opens it does not pay for it (PERF-03).
 */
export default function App() {
  const panelOpen = useStore((s) => s.panelOpen);
  const splitRatio = useStore((s) => s.splitRatio);
  const hostSidebarPx = useStore((s) => s.hostSidebarPx);
  const foldHostSidebar = useStore((s) => s.settings.collapseHostSidebar);
  const [PanelHost, setPanelHost] = useState<PanelHostComponent | null>(null);
  // D34: a panel that could not load is explained on the + until the next try.
  const [panelUnavailable, setPanelUnavailable] = useState(false);
  const viewport = useViewportWidth();

  useEffect(() => {
    if (!panelOpen || PanelHost) return;
    let live = true;
    setPanelUnavailable(false);
    loadPanelHost().then(
      (host) => { if (live) setPanelHost(() => host); },
      (err: unknown) => {
        console.warn('[stemLM] study panel failed to load', err);
        if (!live) return;
        setPanelUnavailable(true);
        useStore.getState().closePanel();
      },
    );
    return () => { live = false; };
  }, [panelOpen, PanelHost]);

  // Layout effects, so the page column, the host's sidebar and the panel all change in the frame
  // the panel appears in. The page is given back as the panel starts to leave, not once it has
  // gone: one motion, and no bare strip where the panel was.
  const panelShown = panelOpen && PanelHost !== null;
  useLayoutEffect(() => {
    syncHostSidebar(panelShown, foldHostSidebar, reportHostSidebar);
  }, [panelShown, foldHostSidebar]);

  useLayoutEffect(() => {
    if (panelShown) applySplit(splitRatio, hostSidebarPx);
    else removeSplit();
  }, [panelShown, splitRatio, hostSidebarPx, viewport]);

  useEffect(
    () => () => {
      removeSplit();
      syncHostSidebar(false, false, reportHostSidebar);
    },
    [],
  );

  return (
    <ErrorBoundary>
      <OverlayButton panelUnavailable={panelUnavailable} />
      {PanelHost && <PanelHost open={panelOpen} />}
    </ErrorBoundary>
  );
}
