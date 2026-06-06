import { browser } from 'wxt/browser';

function extensionIconUrl(path: string): string {
  const runtime = browser?.runtime as
    | (typeof browser.runtime & { getURL: (p: string) => string })
    | undefined;
  return runtime?.getURL?.(path) ?? path;
}

/** Same raster as the Chrome toolbar / extensions-menu icon (`public/icon/*.png`). */
export function ExtensionLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      className="slm-extension-logo"
      src={extensionIconUrl('icon/48.png')}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      draggable={false}
    />
  );
}
