import { browser } from 'wxt/browser';

function extensionIconUrl(path: string): string {
  const runtime = browser?.runtime as
    | (typeof browser.runtime & { getURL: (p: string) => string })
    | undefined;
  return runtime?.getURL?.(path) ?? path;
}

function iconPathForSize(size: number): string {
  if (size <= 18) return 'icon/16.png';
  if (size <= 28) return 'icon/32.png';
  return 'icon/48.png';
}

/** Same raster as the Chrome toolbar / extensions-menu icon (`public/icon/*.png`). */
export function ExtensionLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      className="slm-extension-logo"
      src={extensionIconUrl(iconPathForSize(size))}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      draggable={false}
    />
  );
}
