import { useEffect, useRef } from 'react';
import { useStore } from '@/src/state/store';
import { setSettings } from '@/src/lib/settings';
import { ratioFromPointer } from '@/src/lib/split-ratio';

/**
 * Draggable divider on the panel's left edge. Dragging updates the split ratio
 * live; on release the ratio is persisted to extension storage (shared across
 * Gemini tabs, so the same split is restored across sessions).
 */
export function ResizeHandle() {
  const setSplitRatio = useStore((s) => s.setSplitRatio);
  const setSplitDragging = useStore((s) => s.setSplitDragging);
  const setStoreSettings = useStore((s) => s.setSettings);
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
      const updated = await setSettings({ splitRatio: ratio });
      setStoreSettings(updated);
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
      aria-valuemin={25}
      aria-valuemax={75}
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
            const updated = await setSettings({ splitRatio: ratio });
            setStoreSettings(updated);
          })();
        }
      }}
    >
      <span className="slm-resize-grip" aria-hidden="true" />
    </div>
  );
}
