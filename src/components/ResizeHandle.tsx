import { useEffect, useRef } from 'react';
import { useStore } from '@/src/state/store';
import { setSettings } from '@/src/lib/settings';
import { layoutSplitRatio, ratioFromPointer, viewportWidth } from '@/src/lib/split-ratio';
import { useViewportWidth } from './use-viewport-width';

/**
 * The fraction the layout can show for a requested one. A drag and the arrow keys store this,
 * not the request: a ratio kept beyond what fits would leave the keys dead until it came back
 * into range, and would be reported to assistive technology as a width the panel does not have.
 */
function shownRatio(ratio: number): number {
  return layoutSplitRatio(ratio, viewportWidth(), useStore.getState().hostSidebarPx);
}

async function saveSplitRatio() {
  try {
    useStore.getState().setSettings(await setSettings({ splitRatio: useStore.getState().splitRatio }));
  } catch {
    useStore.getState().setStatus('error', 'Could not save panel size. Try again.');
  }
}

/** A run of arrow keys is over when none has been pressed for this long. */
const KEYS_DONE_MS = 400;

/**
 * Draggable divider on the panel's left edge. Dragging, or the arrow keys, update the split
 * ratio live; when the drag or the run of keys ends the ratio is persisted to extension storage
 * (shared across tabs, so the same split is restored across sessions). Until then the store is
 * marked as dragging: a save of an earlier width echoing back from storage must not pull the
 * panel back while it is still being sized.
 *
 * Nothing is written onto the chat page: the pointer is captured, so its cursor and the page's
 * text selection need no help.
 */
export function ResizeHandle() {
  const setSplitRatio = useStore((s) => s.setSplitRatio);
  const setSplitDragging = useStore((s) => s.setSplitDragging);
  const splitRatio = useStore((s) => s.splitRatio);
  const hostSidebarPx = useStore((s) => s.hostSidebarPx);
  const viewport = useViewportWidth();
  const percent = (ratio: number) => Math.round(layoutSplitRatio(ratio, viewport, hostSidebarPx) * 100);
  const draggingRef = useRef(false);
  const keysRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function finish() {
      setSplitDragging(false);
      void saveSplitRatio();
    }

    function endDrag(e?: PointerEvent) {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (e && handleRef.current?.hasPointerCapture?.(e.pointerId)) {
        handleRef.current.releasePointerCapture(e.pointerId);
      }
      finish();
    }

    function endKeys() {
      if (keysRef.current === undefined) return;
      clearTimeout(keysRef.current);
      keysRef.current = undefined;
      if (!draggingRef.current) finish();
    }

    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      e.preventDefault();
      setSplitRatio(shownRatio(ratioFromPointer(e.clientX)));
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const step = e.shiftKey ? 0.05 : 0.02;
      setSplitDragging(true);
      setSplitRatio(shownRatio(shownRatio(useStore.getState().splitRatio) + (e.key === 'ArrowLeft' ? step : -step)));
      clearTimeout(keysRef.current);
      keysRef.current = setTimeout(endKeys, KEYS_DONE_MS);
      e.preventDefault();
      // Here the arrows size the panel; they must not also turn the step page behind it, and
      // like every key pressed in the panel they are not the chat page's to act on.
      e.stopPropagation();
    }

    const handle = handleRef.current;
    handle?.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      handle?.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      endDrag();
      endKeys();
    };
  }, [setSplitDragging, setSplitRatio]);

  return (
    <div
      ref={handleRef}
      className="slm-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={percent(0)}
      aria-valuemax={percent(1)}
      aria-valuenow={percent(splitRatio)}
      aria-valuetext={`${percent(splitRatio)}% panel width`}
      tabIndex={0}
      aria-label="Resize study panel"
      title="Drag to resize"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        draggingRef.current = true;
        setSplitDragging(true);
        setSplitRatio(shownRatio(ratioFromPointer(e.clientX)));
        handleRef.current?.setPointerCapture?.(e.pointerId);
      }}
    >
      <span className="slm-resize-grip" aria-hidden="true" />
    </div>
  );
}
