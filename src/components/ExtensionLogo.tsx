import { StemMark } from './icons';

/** Inline stem mark — works in shadow DOM without extension PNG URLs. */
export function ExtensionLogo({ size = 32 }: { size?: number }) {
  return (
    <StemMark
      className="slm-extension-logo"
      width={size}
      height={size}
      aria-hidden="true"
    />
  );
}
