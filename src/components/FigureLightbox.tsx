import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ResolvedTheme } from '@/src/lib/theme';
import { IconClose } from './icons';
import { useDialogFocus } from './use-dialog-focus';

export interface LightboxOrigin {
  /** Where the dialog mounts: the panel's app root (shadow DOM) or the page body. */
  container: Element;
  /** The figure frame as shown in the reading column, for scaling its math labels. */
  width: number;
  fontSize: number;
}

/**
 * Modal, enlarged copy of a figure. Esc, the close button, or the backdrop close
 * it; Tab stays inside; focus returns to the control that opened it. Key events
 * never reach the panel behind it (Esc would close the panel, arrows change step).
 */
export function FigureLightbox({ origin, aspect, label, caption, theme, onClose, children }: {
  origin: LightboxOrigin;
  aspect: number;
  label: string;
  caption?: string;
  theme: ResolvedTheme;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useDialogFocus<HTMLDivElement>();
  // Fit the viewport (room for the close button and caption); math labels are HTML
  // over the SVG, so their font grows by the same factor as the frame.
  const width = `max(160px, min(calc(100vw - 64px), 1200px, calc((100vh - 150px) * ${aspect})))`;
  const fontSize = origin.width > 0 ? `calc(${origin.fontSize / origin.width} * ${width})` : `${origin.fontSize}px`;

  return createPortal(
    <div className="slm-lightbox" data-stemlm-theme={theme} role="presentation">
      <button type="button" className="slm-lightbox-backdrop" aria-label="Close enlarged diagram" tabIndex={-1} onClick={onClose} />
      <div
        ref={dialogRef}
        className="slm-lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') onClose();
        }}
      >
        <button type="button" className="slm-icon-btn slm-lightbox-close" aria-label="Close" onClick={onClose}>
          <IconClose width={18} height={18} />
        </button>
        <figure className="slm-diagram slm-lightbox-figure">
          <div className="slm-diagram-frame slm-lightbox-frame" style={{ width, fontSize }}>
            {children}
          </div>
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      </div>
    </div>,
    origin.container,
  );
}
