import { useEffect, useRef } from 'react';
import { useStore } from '@/src/state/store';
import { setSettings } from '@/src/lib/settings';
import { MAX_SPLIT_RATIO, layoutSplitRatio, minSplitRatio, ratioFromPointer } from '@/src/lib/split-ratio';
import { useViewportWidth } from './use-viewport-width';

/**
 * Draggable divider on the panel's left edge. Dragging updates the split ratio
 * live; on release the ratio is persisted to extension storage (shared across
 * Gemini tabs, so the same split is restored across sessions).
 */
export function ResizeHandle() {
  const setSplitRatio = useStore((s) => s.setSplitRatio);
  const setSplitDragging = useStore((s) => s.setSplitDragging);
  const setStoreSettings = useStore((s) => s.setSettings);
  const splitRatio = useStore((s) => s.splitRatio);
  const currentViewport = useViewportWidth();
  const effectiveRatio = layoutSplitRatio(splitRatio, currentViewport);
  const minimumPercent = Math.round(minSplitRatio(currentViewport) * 100);
  const maximumPercent = Math.max(Math.round(MAX_SPLIT_RATIO * 100), minimumPercent);
  const draggingRef = useRef(false);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function endDrag(e?: PointerEvent) {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setSplitDragging(false);

      if (e && handleRef.current?.hasPointerCapture?.(e.pointerId)) {
        handleRef.current.releasePointerCapture(e.pointerId);
      }

      const ratio = useStore.getState().splitRatio;
      try {
        const updated = await setSettings({ splitRatio: ratio });
        setStoreSettings(updated);
      } catch {
        useStore.getState().setStatus('error', 'Could not save panel size. Try again.');
      }
    }

    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      e.preventDefault();
      setSplitRatio(ratioFromPointer(e.clientX));
    }

    function onEnd(e: PointerEvent) {
      void endDrag(e);
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      if (draggingRef.current) void endDrag();
    };
  }, [setSplitDragging, setSplitRatio, setStoreSettings]);

  return (
    <div
      ref={handleRef}
      className="slm-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={minimumPercent}
      aria-valuemax={maximumPercent}
      aria-valuenow={Math.round(effectiveRatio * 100)}
      aria-valuetext={`${Math.round(effectiveRatio * 100)}% panel width`}
      tabIndex={0}
      aria-label="Resize study panel"
      title="Drag to resize"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        draggingRef.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        setSplitDragging(true);
        setSplitRatio(ratioFromPointer(e.clientX));
        handleRef.current?.setPointerCapture?.(e.pointerId);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.05 : 0.02;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const delta = e.key === 'ArrowLeft' ? step : -step;
          setSplitRatio(useStore.getState().splitRatio + delta);
          e.preventDefault();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          void (async () => {
            const ratio = useStore.getState().splitRatio;
            try {
              const updated = await setSettings({ splitRatio: ratio });
              setStoreSettings(updated);
            } catch {
              useStore.getState().setStatus('error', 'Could not save panel size. Try again.');
            }
          })();
        }
      }}
    >
      <span className="slm-resize-grip" aria-hidden="true" />
    </div>
  );
}
