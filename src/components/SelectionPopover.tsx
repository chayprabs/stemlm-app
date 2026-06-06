import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconReply } from './icons';
import { getController } from '@/src/content/controller';
import { readPanelSelection } from '@/src/lib/followup-selection';
import type { Subject } from '@/src/protocol/types';

interface Sel {
  text: string;
  x: number;
  y: number;
}

/**
 * When the student selects text inside the panel, show a small "Ask follow-up"
 * action. Clicking it injects a quote-reply into the chatbot (via the
 * controller) so the deeper answer comes back into the panel.
 */
export function SelectionPopover({
  containerRef,
  subject,
  stepTitle,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  subject: Subject;
  stepTitle?: string;
}) {
  const [sel, setSel] = useState<Sel | null>(null);
  const selRef = useRef<Sel | null>(null);
  selRef.current = sel;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const refresh = () => {
      setSel(readPanelSelection(root));
    };

    const onPointerUp = () => {
      // Read selection after the browser finalizes it.
      setTimeout(refresh, 0);
    };

    const onSelectionChange = () => {
      refresh();
    };

    const onScroll = () => setSel(null);

    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('keyup', onPointerUp);
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('keyup', onPointerUp);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [containerRef]);

  async function ask() {
    const current = selRef.current;
    if (!current) return;
    setSel(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }
    await getController()?.followUp(current.text, stepTitle, subject);
  }

  const left = sel ? Math.min(Math.max(sel.x - 80, 8), window.innerWidth - 168) : 0;
  const top = sel ? Math.min(sel.y + 10, window.innerHeight - 48) : 0;

  return (
    <AnimatePresence>
      {sel && (
        <motion.div
          className="slm-selpop"
          style={{ left, top }}
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.14 }}
          onMouseDown={(e) => e.preventDefault() /* keep the text selection */}
        >
          <button
            type="button"
            className="slm-btn slm-btn-soft slm-selpop-btn"
            onClick={() => void ask()}
            aria-label="Ask about selected text in chat"
          >
            <IconReply /> Ask in chat
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
