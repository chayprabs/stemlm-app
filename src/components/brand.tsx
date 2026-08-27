/** stemLM therefore-mark + outlined lockup. Inline SVG for shadow DOM. */
import { useEffect, useState, type SVGProps } from 'react';
import type { ResolvedTheme } from '@/src/lib/theme';
import logoLight from '@/temp-icon/stemlm-logo.svg?raw';
import logoDark from '@/temp-icon/stemlm-logo-dark.svg?raw';
import logoMono from '@/temp-icon/stemlm-logo-mono.svg?raw';

export const BRAND_INK = '#0E1013';
export const BRAND_SIGNAL = '#FF6B2C';
export const BRAND_SITE = 'https://stemlm.app';
export const BRAND_MARK_TILE_MAX_PX = 28;

const LOCKUP_VIEW_W = 226.7;
const LOCKUP_VIEW_H = 64;

export type BrandVariant = 'light' | 'dark' | 'mono';

export function themeToBrandVariant(theme: ResolvedTheme | 'mono'): BrandVariant {
  if (theme === 'dark') return 'dark';
  if (theme === 'mono') return 'mono';
  return 'light';
}

type MarkProps = SVGProps<SVGSVGElement> & { variant?: BrandVariant; size?: number };

function markSize(
  size: number | undefined,
  width: SVGProps<SVGSVGElement>['width'],
  height: SVGProps<SVGSVGElement>['height'],
) {
  const n = Number(size ?? height ?? width ?? 32);
  return Number.isFinite(n) && n > 0 ? n : 32;
}

function premiseFill(variant: BrandVariant): string {
  if (variant === 'dark') return '#FFFFFF';
  return BRAND_INK;
}

function apexFill(variant: BrandVariant): string {
  return variant === 'mono' ? BRAND_INK : BRAND_SIGNAL;
}

/** Two baseline dots + boxed Signal apex. Tile below 28px; bare mark at 28px+. */
export function StemMark({
  width,
  height,
  size: sizeProp,
  variant = 'light',
  className,
  ...rest
}: MarkProps) {
  const size = markSize(sizeProp, width, height);
  const useTile = size < BRAND_MARK_TILE_MAX_PX && variant !== 'mono';

  if (useTile) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={className}
        {...rest}
      >
        <rect width="64" height="64" rx="14.5" fill={BRAND_INK} />
        <circle cx="18" cy="44" r="7.4" fill="#FFFFFF" />
        <circle cx="46" cy="44" r="7.4" fill="#FFFFFF" />
        <rect x="24.7" y="14.7" width="14.6" height="14.6" rx="4.4" fill={BRAND_SIGNAL} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <circle cx="18" cy="45" r="7" fill={premiseFill(variant)} />
      <circle cx="46" cy="45" r="7" fill={premiseFill(variant)} />
      <rect x="25" y="15" width="14" height="14" rx="4.2" fill={apexFill(variant)} />
    </svg>
  );
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    setReduced(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** SMIL therefore-mark. Swap to the static mark when reduced motion is set. */
export function AnimatedStemMark({
  width,
  height,
  size: sizeProp,
  variant = 'light',
  className,
  ...rest
}: MarkProps) {
  const reduced = usePrefersReducedMotion();
  const size = markSize(sizeProp, width, height);
  if (reduced) {
    return <StemMark width={size} height={size} variant={variant} className={className} {...rest} />;
  }

  const premise = premiseFill(variant === 'mono' ? 'light' : variant);
  const fillValues = `${premise};${premise};${BRAND_SIGNAL};${BRAND_SIGNAL};${premise}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <circle cx="12" cy="45" r="7" fill={premise}>
        <animate
          attributeName="cy"
          values="45;40;45;45;45"
          keyTimes="0;0.05;0.11;0.9;1"
          dur="3.6s"
          calcMode="spline"
          keySplines=".4 0 .2 1;.4 0 .2 1;0 0 1 1;0 0 1 1"
          repeatCount="indefinite"
        />
        <animate
          attributeName="cx"
          values="12;12;18;18;12"
          keyTimes="0;0.36;0.52;0.9;1"
          dur="3.6s"
          calcMode="spline"
          keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="52" cy="45" r="7" fill={premise}>
        <animate
          attributeName="cy"
          values="45;45;40;45;45;45"
          keyTimes="0;0.09;0.14;0.20;0.9;1"
          dur="3.6s"
          calcMode="spline"
          keySplines="0 0 1 1;.4 0 .2 1;.4 0 .2 1;0 0 1 1;0 0 1 1"
          repeatCount="indefinite"
        />
        <animate
          attributeName="cx"
          values="52;52;46;46;52"
          keyTimes="0;0.36;0.52;0.9;1"
          dur="3.6s"
          calcMode="spline"
          keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1"
          repeatCount="indefinite"
        />
      </circle>
      <rect x="25" y="38" width="14" height="14" rx="7" fill={premise}>
        <animate
          attributeName="y"
          values="38;33;38;38;15;15;38"
          keyTimes="0;0.07;0.13;0.36;0.52;0.9;1"
          dur="3.6s"
          calcMode="spline"
          keySplines=".4 0 .2 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1"
          repeatCount="indefinite"
        />
        <animate
          attributeName="rx"
          values="7;7;4.2;4.2;7"
          keyTimes="0;0.42;0.58;0.9;1"
          dur="3.6s"
          calcMode="spline"
          keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1"
          repeatCount="indefinite"
        />
        <animate
          attributeName="fill"
          values={fillValues}
          keyTimes="0;0.42;0.58;0.9;1"
          dur="3.6s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
}

function sizedLockup(svg: string, width: number, height: number): string {
  return svg
    .replace(/\swidth="[^"]*"/, ` width="${width}"`)
    .replace(/\sheight="[^"]*"/, ` height="${height}"`);
}

const LOCKUPS: Record<BrandVariant, string> = {
  light: logoLight,
  dark: logoDark,
  mono: logoMono,
};

/**
 * Outlined lockup (mark + stemLM). Never a live font.
 * Pass `height` for a fixed pixel size (popup / options / PDF). Omit it to let
 * CSS size the SVG (panel header).
 */
export function BrandWordmark({
  className,
  variant = 'light',
  height,
}: {
  className?: string;
  variant?: BrandVariant;
  height?: number;
}) {
  const sized = height != null && Number.isFinite(height) && height > 0;
  const width = sized ? (height * LOCKUP_VIEW_W) / LOCKUP_VIEW_H : undefined;
  return (
    <span className={['slm-wordmark', className].filter(Boolean).join(' ')}>
      <span
        className="slm-wordmark-svg"
        style={
          sized
            ? { display: 'inline-flex', width, height, flexShrink: 0, lineHeight: 0 }
            : undefined
        }
        dangerouslySetInnerHTML={{
          __html: sized
            ? sizedLockup(LOCKUPS[variant], width as number, height as number)
            : LOCKUPS[variant],
        }}
      />
    </span>
  );
}
