import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconReply } from './icons';
import { getController } from '@/src/content/controller';
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

    const onMouseUp = (e: MouseEvent) => {
      // Read selection after the browser finalizes it.
      setTimeout(() => {
        const selection = (root.getRootNode() as Document | ShadowRoot & { getSelection?: () => Selection })
          .getSelection?.() ?? window.getSelection();
        const text = selection?.toString().trim() ?? '';
        const target = e.target as HTMLElement | null;
        const inSelectable = target?.closest?.('.slm-selectable');
        if (text.length >= 3 && inSelectable) {
          setSel({ text, x: e.clientX, y: e.clientY });
        } else {
          setSel(null);
        }
      }, 0);
    };

    root.addEventListener('mouseup', onMouseUp as EventListener);
    return () => root.removeEventListener('mouseup', onMouseUp as EventListener);
  }, [containerRef]);

  function ask() {
    const current = selRef.current;
    if (!current) return;
    getController()?.followUp(current.text, stepTitle, subject);
    setSel(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence>
      {sel && (
        <motion.div
          className="slm-selpop"
          style={{ left: Math.min(sel.x, window.innerWidth - 160), top: sel.y + 12 }}
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.14 }}
          onMouseDown={(e) => e.preventDefault() /* keep the text selection */}
        >
          <button type="button" className="slm-selpop-btn" onClick={ask}>
            <IconReply /> Ask follow-up
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
