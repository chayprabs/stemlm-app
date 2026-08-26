import { describe, it, expect, afterEach } from 'vitest';
import {
  persistThemeBoot,
  readThemeBoot,
  themeFromBootCache,
  THEME_CACHE_KEY,
  applyTheme,
} from './theme';

describe('theme boot cache', () => {
  afterEach(() => {
    localStorage.removeItem(THEME_CACHE_KEY);
  });

  it('reads an explicit light/dark preference for first paint', () => {
    persistThemeBoot('dark', 'dark');
    expect(readThemeBoot()).toEqual({ pref: 'dark', resolved: 'dark' });
    expect(themeFromBootCache()).toBe('dark');

    persistThemeBoot('light', 'light');
    expect(themeFromBootCache()).toBe('light');
  });

  it('follows the OS scheme when the stored preference is auto', () => {
    persistThemeBoot('auto', 'dark');
    const osDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    expect(themeFromBootCache()).toBe(osDark ? 'dark' : 'light');
  });

  it('does not write the boot cache from applyTheme (content-script safe)', () => {
    const host = document.createElement('div');
    applyTheme(host, 'dark');
    expect(readThemeBoot()).toBeNull();
    expect(host.getAttribute('data-stemlm-theme')).toBe('dark');
    expect(host.style.colorScheme).toBe('dark');
  });
});
