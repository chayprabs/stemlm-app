import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  persistThemeBoot,
  readThemeBoot,
  themeFromBootCache,
  THEME_CACHE_KEY,
  applyTheme,
  resolveHostTheme,
  watchHostScheme,
} from './theme';

describe('the panel beside a chat site', () => {
  afterEach(() => {
    document.body.removeAttribute('style');
    vi.useRealTimers();
  });

  it('resolves "auto" to the site\'s scheme, whatever the operating system says', () => {
    const osDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.style.backgroundColor = osDark ? 'rgb(255, 255, 255)' : 'rgb(33, 33, 33)';
    expect(resolveHostTheme('auto')).toBe(osDark ? 'light' : 'dark');
    expect(resolveHostTheme('light')).toBe('light');
    expect(resolveHostTheme('dark')).toBe('dark');
  });

  it('follows the site when it switches theme, once, after it has repainted', async () => {
    vi.useFakeTimers();
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';
    const onChange = vi.fn();
    const stop = watchHostScheme(onChange);
    document.body.style.backgroundColor = 'rgb(33, 33, 33)';
    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('dark');
    // An attribute change that leaves the scheme as it is says nothing.
    document.documentElement.setAttribute('data-x', '1');
    await vi.advanceTimersByTimeAsync(300);
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
    document.documentElement.removeAttribute('data-x');
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';
    await vi.advanceTimersByTimeAsync(300);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

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
