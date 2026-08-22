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

export const IconChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 12, height: 12, ...p })}>
    <path d="m6 9 6 6 6-6" />
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

/** Geometric nav arrows — used on the floating Prev/Next overlay. */
export const IconNavPrev = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 14, height: 14, strokeWidth: 2, ...p })}>
    <path d="M12.5 12 7 8l5.5-4" />
  </svg>
);

export const IconNavNext = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 14, height: 14, strokeWidth: 2, ...p })}>
    <path d="M7.5 4 13 8l-5.5 4" />
  </svg>
);

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" />
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

/** Lucide FileDown — document + down arrow. PDF export, not session bookmark. */
export const IconPdf = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 1.75, ...p })}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M12 18v-6" />
    <path d="m9 15 3 3 3-3" />
  </svg>
);

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
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
      d="M13.15 6.05a6.15 6.15 0 1 0 4.2 10.85 5.05 5.05 0 1 1-4.2-10.85Z"
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

export const IconReply = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
    <path d="m9 17 4-4-4-4M15 17h5" />
  </svg>
);
