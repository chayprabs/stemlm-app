import { applyTheme, themeFromBootCache } from './theme';

/** Apply the cached extension-page theme before React mounts, without inline JS. */
export function bootExtensionPageTheme(): void {
  const theme = themeFromBootCache();
  applyTheme(document.documentElement, theme);
  if (document.body) applyTheme(document.body, theme);
}
