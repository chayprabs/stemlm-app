import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
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

import {
  ANALYTICS_HINT,
  ANALYTICS_LABEL,
  SETTINGS_LEGAL_LINKS,
  SettingsOverlay,
} from './SettingsOverlay';

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
      settingsOpen: true,
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

  it('offers the usage-data toggle, on by default, in the same style as the others', async () => {
    const { container, unmount } = await renderOverlay();

    const switches = [...container.querySelectorAll<HTMLButtonElement>('.slm-set-switch')];
    const analytics = switches.find((el) => el.getAttribute('aria-label') === ANALYTICS_LABEL);
    expect(analytics).toBeTruthy();
    expect(analytics!.getAttribute('role')).toBe('switch');
    expect(analytics!.getAttribute('aria-checked')).toBe('true');
    // Same markup as the shipped toggles, so it inherits their look exactly.
    expect(analytics!.querySelector('.slm-set-knob')).toBeTruthy();
    expect(analytics!.classList.contains('is-on')).toBe(true);
    expect(container.textContent).toContain(ANALYTICS_LABEL);
    expect(container.textContent).toContain(ANALYTICS_HINT);

    // It flips so both states are visible; persistence is deliberately not wired.
    act(() => {
      analytics!.click();
    });
    expect(analytics!.getAttribute('aria-checked')).toBe('false');
    expect(analytics!.classList.contains('is-on')).toBe(false);
    expect(localStore.stemlm_settings).not.toHaveProperty('shareUsageData');

    unmount();
  });

  it('puts the three about links on one row at the bottom', async () => {
    const { container, unmount } = await renderOverlay();

    const nav = container.querySelector('.slm-settings-links');
    expect(nav).toBeTruthy();
    const links = [...container.querySelectorAll<HTMLButtonElement>('.slm-settings-link')];
    expect(links.map((el) => el.textContent)).toEqual(
      SETTINGS_LEGAL_LINKS.map((item) => item.label),
    );
    expect(links.map((el) => el.dataset.link)).toEqual(SETTINGS_LEGAL_LINKS.map((i) => i.id));
    // Buttons, not dead anchors, while the destinations are still to come.
    for (const el of links) {
      expect(el.tagName).toBe('BUTTON');
      expect(el.getAttribute('type')).toBe('button');
      expect(el.hasAttribute('href')).toBe(false);
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
