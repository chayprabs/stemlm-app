import { StemMark, type BrandVariant } from './brand';

/** Inline therefore mark — works in shadow DOM without extension PNG URLs. */
export function ExtensionLogo({
  size = 32,
  variant = 'light',
}: {
  size?: number;
  variant?: BrandVariant;
}) {
  return (
    <StemMark
      className="slm-extension-logo"
      width={size}
      height={size}
      variant={variant}
      aria-hidden="true"
    />
  );
}
