import { useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/** The panel's status line when the browser refuses the clipboard. */
export const COPY_FAILED = 'Could not copy to clipboard. Select the text and copy manually.';

const RESET_MS = 1400;

/**
 * Put text on the clipboard and say so for a moment: `copied` or `failed`, then `idle` again.
 * `text` may be a function, read (or awaited) at the press. `onFail` reports a refusal where
 * the button's own label is not enough.
 */
export function useCopy(onFail?: () => void): [CopyState, (text: string | (() => string | Promise<string>)) => Promise<void>] {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy(text: string | (() => string | Promise<string>)) {
    let next: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(typeof text === 'function' ? await text() : text);
    } catch {
      next = 'failed';
      onFail?.();
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), RESET_MS);
  }

  return [state, copy];
}
