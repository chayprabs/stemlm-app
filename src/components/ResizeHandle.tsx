import { useEffect, useRef } from 'react';
import { useStore } from '@/src/state/store';
import { setSettings } from '@/src/lib/settings';

/**
 * Draggable divider on the panel's left edge. Dragging updates the split ratio
 * live; on release the ratio is persisted to extension storage (shared across
 * all chatbot sites, so the same split is restored everywhere).
 */
export function ResizeHandle() {
  const setSplitRatio = useStore((s) => s.setSplitRatio);
  const setStoreSettings = useStore((s) => s.setSettings);
  const draggingRef = useRef(false);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      e.preventDefault();
      // Panel is docked right; ratio = fraction of viewport to its right.
      const ratio = 1 - e.clientX / window.innerWidth;
      setSplitRatio(ratio);
    }
    async function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = '';
      const ratio = useStore.getState().splitRatio;
      const updated = await setSettings({ splitRatio: ratio });
      setStoreSettings(updated);
    }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [setSplitRatio, setStoreSettings]);

  return (
    <div
      className="slm-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize study panel"
      title="Drag to resize"
      onPointerDown={(e) => {
        draggingRef.current = true;
        document.body.style.userSelect = 'none';
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
    >
      <span className="slm-resize-grip" />
    </div>
  );
}
