import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_SETTINGS, getSettings } from '@/src/lib/settings';
import { SETTINGS_LABEL } from '@/src/lib/saved-library';
import { useStore } from '@/src/state/store';

const localStore: Record<string, unknown> = {};
const sessionStore = new Map<string, unknown>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (key: string) =>
          localStore[key] === undefined ? {} : { [key]: localStore[key] },
        ),
        set: vi.fn(async (data: Record<string, unknown>) => {
          Object.assign(localStore, data);
        }),
      },
      session: {
        get: vi.fn(async (key: string) => {
          const value = sessionStore.get(key);
          return value === undefined ? {} : { [key]: value };
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(data)) sessionStore.set(k, v);
        }),
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    runtime: { id: 'test' },
  },
}));

import { SETTINGS_LEGAL_LINKS, SettingsOverlay } from './SettingsOverlay';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

async function renderOverlay() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(<SettingsOverlay onClose={() => undefined} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return {
    container,
    unmount() {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

async function clickControl(container: HTMLElement, text: string) {
  const el =
    (container.querySelector(`button[aria-label="${text}"]`) as HTMLButtonElement | null) ??
    [...container.querySelectorAll('button')].find((btn) => btn.textContent?.trim() === text) ??
    null;
  expect(el, `control "${text}"`).toBeTruthy();
  await act(async () => {
    el!.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SettingsOverlay', () => {
  beforeEach(() => {
    for (const key of Object.keys(localStore)) delete localStore[key];
    sessionStore.clear();
    localStore.stemlm_settings = { ...DEFAULT_SETTINGS, theme: 'light' };
    useStore.setState({
      settings: { ...DEFAULT_SETTINGS, theme: 'light' },
      theme: 'light',
      sessions: [],
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders the landscape settings sheet with current controls', async () => {
    const { container, unmount } = await renderOverlay();

    expect(container.querySelector('[role="dialog"][aria-labelledby="slm-settings-title"]')).toBeTruthy();
    expect(container.querySelector('.slm-settings-overlay-backdrop')).toBeTruthy();
    expect(container.textContent).toContain(SETTINGS_LABEL);
    expect(container.textContent).toContain('Appearance');
    expect(container.textContent).toContain('Behaviour');
    expect(container.textContent).not.toContain('Protocol');
    expect(container.textContent).toContain('Privacy');
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toBe('Light');

    unmount();
  });

  it('SET-FAKE-01 shows no usage-data switch while analytics is disabled', async () => {
    const { container, unmount } = await renderOverlay();
    const switches = [...container.querySelectorAll<HTMLElement>('[role="switch"]')];
    expect(switches.map((el) => el.getAttribute('aria-label'))).toEqual([
      'Share sessions across tabs',
      'Open the panel automatically',
    ]);
    expect(container.textContent).not.toMatch(/usage data|analytics/i);
    unmount();
  });

  it('SET-LINKS-01 opens every footer link at its real destination in a new tab', async () => {
    const { container, unmount } = await renderOverlay();
    const links = [...container.querySelectorAll<HTMLAnchorElement>('.slm-settings-link')];
    expect(links.map((el) => [el.textContent, el.getAttribute('href')])).toEqual([
      ['Privacy Policy', 'https://www.stemlm.app/privacy'],
      ['Terms & Conditions', 'https://www.stemlm.app/terms'],
      ['Contact Us', 'https://github.com/chayprabs/stemlm-app/issues'],
    ]);
    for (const el of links) {
      expect(el.tagName).toBe('A');
      expect(el.getAttribute('target')).toBe('_blank');
      expect(el.getAttribute('rel')).toBe('noopener noreferrer');
    }
    unmount();
  });

  it('SET-CLOSE-01 never clips the page-layout header controls or their focus rings', () => {
    const css = readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');
    const rule = css.slice(css.indexOf('.slm-settings-overlay--page .slm-settings-dialog {'));
    expect(rule.slice(0, rule.indexOf('}'))).toMatch(/overflow:\s*visible/);
  });

  it('puts the three about links on one row at the bottom', async () => {
    const { container, unmount } = await renderOverlay();

    const nav = container.querySelector('.slm-settings-links');
    expect(nav).toBeTruthy();
    const links = [...container.querySelectorAll<HTMLAnchorElement>('.slm-settings-link')];
    expect(links.map((el) => el.textContent)).toEqual(
      SETTINGS_LEGAL_LINKS.map((item) => item.label),
    );
    expect(links.map((el) => el.dataset.link)).toEqual(SETTINGS_LEGAL_LINKS.map((i) => i.id));
    // D6 (2026-09-24): the destinations exist, so these are real links, never dead ones.
    for (const el of links) {
      expect(el.tagName).toBe('A');
      expect(el.getAttribute('href')).toMatch(/^https:\/\//);
    }
    // Separators are decorative dots, never part of the reading order.
    const seps = [...container.querySelectorAll('.slm-settings-links-sep')];
    expect(seps).toHaveLength(2);
    for (const el of seps) expect(el.getAttribute('aria-hidden')).toBe('true');

    // One horizontal row, and the note still sits above it.
    const css = readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');
    const rule = css.slice(css.indexOf('.slm-settings-links {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/align-items:\s*center/);
    expect(container.querySelector('.slm-settings-foot-note')?.textContent).toBe(
      'Changes save automatically',
    );

    unmount();
  });

  it('closes from the header X and the backdrop', async () => {
    const onClose = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<SettingsOverlay onClose={onClose} />);
    });

    act(() => {
      (container.querySelector('.slm-settings-close') as HTMLButtonElement).click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      (container.querySelector('.slm-settings-overlay-backdrop') as HTMLButtonElement).click();
    });
    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('restores focus to an opener inside the panel shadow root after Escape', async () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open settings';
    shadow.appendChild(opener);
    const container = document.createElement('div');
    shadow.appendChild(container);
    document.body.appendChild(host);
    opener.focus();
    expect(shadow.activeElement).toBe(opener);

    function Wrapper() {
      const [open, setOpen] = useState(true);
      return open ? <SettingsOverlay onClose={() => setOpen(false)} /> : null;
    }

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<Wrapper />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(shadow.activeElement).toBe(opener);
    act(() => root?.unmount());
  });

  it('advances through shadow-root dialog controls and wraps reverse Tab', async () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open settings';
    shadow.appendChild(opener);
    const container = document.createElement('div');
    shadow.appendChild(container);
    document.body.appendChild(host);
    opener.focus();

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<SettingsOverlay onClose={() => undefined} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const dialog = container.querySelector('[role="dialog"]') as HTMLDivElement;
    // Buttons plus the footer links (anchors since D6) — every Tab stop in the dialog.
    const controls = [...dialog.querySelectorAll<HTMLElement>('button, a[href]')];
    expect(controls.length).toBeGreaterThan(2);
    if (controls.length < 3) throw new Error('settings dialog needs at least three controls');
    const firstControl = controls[0]!;
    const secondControl = controls[1]!;
    const thirdControl = controls[2]!;
    const lastControl = controls[controls.length - 1]!;
    // happy-dom has no layout, so make the rendered controls visible to the hook's
    // production visibility check without changing the component or its behavior.
    for (const control of controls) {
      Object.defineProperty(control, 'offsetParent', { configurable: true, value: dialog });
    }

    const pressTab = (shiftKey = false) => {
      const active = shadow.activeElement as HTMLElement;
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey,
      });
      active.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      return shadow.activeElement;
    };

    firstControl.focus();
    expect(shadow.activeElement).toBe(firstControl);
    expect(pressTab()).toBe(secondControl);
    expect(pressTab()).toBe(thirdControl);

    firstControl.focus();
    expect(pressTab(true)).toBe(lastControl);

    act(() => root?.unmount());
  });

  it('persists theme and behaviour into extension storage and the live store', async () => {
    const { container, unmount } = await renderOverlay();

    await clickControl(container, 'Dark');
    expect((localStore.stemlm_settings as { theme: string }).theme).toBe('dark');
    expect((await getSettings()).theme).toBe('dark');
    expect(useStore.getState().settings.theme).toBe('dark');
    expect(useStore.getState().theme).toBe('dark');

    await clickControl(container, 'Share sessions across tabs');
    expect((await getSettings()).shareAcrossTabs).toBe(true);
    expect(useStore.getState().settings.shareAcrossTabs).toBe(true);

    await clickControl(container, 'Solution');
    expect((await getSettings()).defaultView).toBe('solution');
    expect(useStore.getState().settings.defaultView).toBe('solution');

    await clickControl(container, 'Open the panel automatically');
    const saved = await getSettings();
    expect(saved).toMatchObject({
      theme: 'dark',
      shareAcrossTabs: true,
      autoOpenOnAnswer: false,
      defaultView: 'solution',
    });
    expect(useStore.getState().settings).toMatchObject(saved);

    unmount();
  });

  it('opens new answers and session switches on the saved default view', () => {
    const makeSession = (id: string) =>
      ({
        id,
        createdAt: 1,
        updatedAt: 1,
        platform: 'gemini',
        question: 'Q',
        raw: '',
        capsule: { meta: {}, steps: [], solution: '' },
      }) as never;
    useStore.setState({
      settings: { ...DEFAULT_SETTINGS, defaultView: 'solution' },
      sessions: [],
      view: 'steps',
    });
    useStore.getState().addSession(makeSession('a'));
    expect(useStore.getState().view).toBe('solution');

    useStore.getState().setView('steps');
    useStore.getState().addSession(makeSession('b'));
    expect(useStore.getState().view).toBe('solution');

    useStore.getState().setView('steps');
    useStore.getState().setActiveSession('a');
    expect(useStore.getState().view).toBe('solution');
  });
});
