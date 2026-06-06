import { browser } from 'wxt/browser';

function extensionAsset(path: string): string {
  const runtime = browser.runtime as typeof browser.runtime & {
    getURL: (path: string) => string;
  };
  return runtime.getURL(path);
}

/** Same raster as the Chrome toolbar / extensions-menu icon (`public/icon/*.png`). */
const ICON_48 = extensionAsset('icon/48.png');

export function ExtensionLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      className="slm-extension-logo"
      src={ICON_48}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      draggable={false}
    />
  );
}
