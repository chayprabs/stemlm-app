/**
 * Shrink-wrap a chrome.windows popup to its content. Chrome action popups
 * cannot shrink after they grow; these dedicated windows can.
 */
import { browser } from 'wxt/browser';

export interface FitWindowOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Extra pixels so OS chrome / scrollbars do not clip the last line. */
  padding?: number;
}

export function windowSizeForContent(
  content: { width: number; height: number },
  frame: { width: number; height: number },
  opt: FitWindowOptions = {},
): { width: number; height: number } {
  const maxWidth = opt.maxWidth ?? 800;
  const maxHeight = opt.maxHeight ?? 640;
  const pad = opt.padding ?? 8;
  const width = Math.min(
    maxWidth,
    Math.max(opt.minWidth ?? 0, Math.ceil(content.width) + Math.max(0, frame.width) + pad),
  );
  const height = Math.min(
    maxHeight,
    Math.max(opt.minHeight ?? 0, Math.ceil(content.height) + Math.max(0, frame.height) + pad),
  );
  return { width, height };
}

export async function fitCurrentWindowToContent(
  root: Element,
  opt: FitWindowOptions = {},
): Promise<void> {
  try {
    const win = await browser.windows.getCurrent();
    if (win.id == null) return;
    const rect = root.getBoundingClientRect();
    const next = windowSizeForContent(
      { width: rect.width, height: rect.height },
      {
        // Cap OS chrome. If html hugs content, innerHeight can match the
        // document instead of the viewport and the "frame" would include
        // empty window space — then each fit grows toward maxHeight.
        width: Math.min(24, Math.max(0, (win.width ?? window.innerWidth) - window.innerWidth)),
        height: Math.min(48, Math.max(0, (win.height ?? window.innerHeight) - window.innerHeight)),
      },
      opt,
    );
    if (next.width === win.width && next.height === win.height) return;
    await browser.windows.update(win.id, next);
  } catch {
    /* windows API may be unavailable in tests */
  }
}

/** Measure after layout/fonts and shrink-wrap once — do not observe resizes. */
export function watchFitCurrentWindowToContent(
  root: Element,
  opt: FitWindowOptions = {},
): () => void {
  let cancelled = false;
  const run = () => {
    if (!cancelled) void fitCurrentWindowToContent(root, opt);
  };
  const afterLayout = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(run);
      });
    });
  };
  const fonts = document.fonts?.ready;
  if (fonts) void fonts.then(afterLayout);
  else afterLayout();
  return () => {
    cancelled = true;
  };
}
