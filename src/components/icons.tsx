/** Inline icons — stroke 1.5 to match stemlm.app / Lucide style. */
import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export { StemMark } from './brand';

/** Compact dropdown caret — Lucide’s 24-grid chevron is optically tiny at 12–16px. */
export const IconChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 16, height: 16, viewBox: '0 0 16 16', strokeWidth: 1.75, ...p })}>
    <path d="m3.2 5.7 4.8 4.8 4.8-4.8" />
  </svg>
);

export const IconSpark = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/** Shafted Lucide arrows for floating Prev/Next (same 1.5 stroke as the header set). */
export const IconNavPrev = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

export const IconNavNext = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" />
  </svg>
);

/** Lucide Trash2 — remove a saved question without looking like window close. */
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

/** Bookmark — library keep. Fill is driven by `.slm-icon-save` + parent `data-active`. */
export const IconSave = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 18, height: 18, strokeWidth: 1.75, ...p })}>
    <path
      className="slm-icon-save"
      d="M7.2 3.2h9.6c.88 0 1.6.72 1.6 1.6v16.1L12 17.4 5.6 20.9V4.8c0-.88.72-1.6 1.6-1.6Z"
    />
  </svg>
);

/** Lucide FileText — saved report document. */
export const IconPdf = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M8 13h8" />
    <path d="M8 17h6" />
  </svg>
);

/** Arrow into tray — start a file download. */
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

/** Open in another tab. */
export const IconOpen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M14 4h6v6" />
    <path d="M10 14 20 4" />
    <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
  </svg>
);

/** Study panel (sidebar). */
export const IconPanel = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/** Lucide Clock — time-window filter. */
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

/** Lucide CircleHelp. */
export const IconHelp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 18, height: 18, strokeWidth: 1.75, ...p })}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

/** Lucide ListFilter — three staggered lines. */
export const IconFilter = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 16, height: 16, strokeWidth: 1.75, ...p })}>
    <path d="M3 6h18" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </svg>
);

export const IconMoon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

/** Single sun–moon glyph. Parent `.slm-theme-btn.is-dark` morphs rays → crescent. */
export const IconTheme = ({ className, ...p }: SVGProps<SVGSVGElement>) => (
  <svg
    {...base({ width: 18, height: 18, strokeWidth: 1.75, ...p })}
    className={['slm-theme-glyph', className].filter(Boolean).join(' ')}
  >
    <g className="slm-theme-sun">
      <circle className="slm-theme-disc" cx="12" cy="12" r="4.2" />
      <g className="slm-theme-rays">
        <path d="M12 2.6v2.2" />
        <path d="M12 19.2v2.2" />
        <path d="M2.6 12h2.2" />
        <path d="M19.2 12h2.2" />
        <path d="m5.22 5.22 1.56 1.56" />
        <path d="m17.22 17.22 1.56 1.56" />
        <path d="m5.22 18.78 1.56-1.56" />
        <path d="m17.22 6.78 1.56-1.56" />
      </g>
    </g>
    <path
      className="slm-theme-crescent"
      fill="currentColor"
      stroke="none"
      d="M20.15 14.2A8.2 8.2 0 1 1 10.35 3.85 6.25 6.25 0 0 0 20.15 14.2Z"
    />
  </svg>
);

export const IconLayers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" />
    <path d="m12 11 8-4.5M12 11v9M12 11 4 6.5" />
  </svg>
);

export const IconBook = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);

/** Lucide Settings cog — same stroke language as the rest of the set. */
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 18, height: 18, strokeWidth: 1.75, ...p })}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Lucide Power — on/off for the popup stemlm switch. */
export const IconPower = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M12 2v10" />
    <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
  </svg>
);

export const IconReply = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
    <path d="m9 17 4-4-4-4M15 17h5" />
  </svg>
);

export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

/** Lucide Eye — reveal a hidden answer. */
export const IconEye = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconHistory = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l3 2" />
  </svg>
);
