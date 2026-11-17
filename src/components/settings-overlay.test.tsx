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

import { READING_SIZE_PX, SETTINGS_LEGAL_LINKS, SettingsOverlay } from './SettingsOverlay';

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

  /** Move a React-controlled range input the way a drag or an arrow key does. */
  async function setRange(input: HTMLInputElement, value: string, settle = true) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (!settle) return;
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('sets the reading size on one five-stop scale, saves it and previews it live', async () => {
    const { container, unmount } = await renderOverlay();
    const scale = container.querySelector('input[type="range"][aria-label="Reading size"]') as HTMLInputElement;
    expect([scale.min, scale.max, scale.step, scale.value]).toEqual(['1', '5', '1', '2']);
    expect(scale.getAttribute('aria-valuetext')).toBe('Level 2 of 5');
    const preview = container.querySelector('.slm-set-preview') as HTMLElement;
    expect(preview.style.fontSize).toBe('15px');
    expect(container.querySelectorAll('.slm-set-scale-tick')).toHaveLength(5);
    expect(container.querySelectorAll('.slm-set-scale-tick.is-on')).toHaveLength(2);

    await setRange(scale, '4');
    expect((await getSettings()).contentScale).toBe(4);
    expect(useStore.getState().settings.contentScale).toBe(4);
    expect(scale.getAttribute('aria-valuetext')).toBe('Level 4 of 5');
    expect(preview.style.fontSize).toBe('17px');
    expect(container.querySelectorAll('.slm-set-scale-tick.is-on')).toHaveLength(4);
    unmount();
  });

  it('keeps every step of a quick run of changes, so arrow keys never fall behind', async () => {
    const { container, unmount } = await renderOverlay();
    const scale = container.querySelector('input[type="range"]') as HTMLInputElement;
    // Three changes land before the first write has finished.
    await setRange(scale, '3', false);
    expect(scale.value).toBe('3');
    await setRange(scale, '4', false);
    expect(scale.value).toBe('4');
    await setRange(scale, '5');
    expect(scale.value).toBe('5');
    expect((await getSettings()).contentScale).toBe(5);
    unmount();
  });

  it('previews answer text at the sizes the study panel really uses', () => {
    const panel = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    const base = Number(/--slm-read-size:\s*(\d+)px/.exec(panel)?.[1]);
    expect(base).toBeGreaterThan(0);
    expect(READING_SIZE_PX[2]).toBe(base);
    for (const level of [1, 3, 4, 5] as const) {
      const rule = new RegExp(
        `\\.slm-panel\\[data-content-scale='${level}'\\]\\s*\\{[^}]*--slm-content-read-size:\\s*calc\\(var\\(--slm-read-size\\)\\s*([+-])\\s*(\\d+)px\\)`,
      ).exec(panel);
      expect(rule, `level ${level}`).toBeTruthy();
      const offset = Number(rule![2]) * (rule![1] === '-' ? -1 : 1);
      expect(READING_SIZE_PX[level], `level ${level}`).toBe(base + offset);
    }
  });

  it('slides the segment thumb to the chosen option and says what Auto means', async () => {
    const { container, unmount } = await renderOverlay();
    const theme = container.querySelector('[role="group"][aria-label="Theme"]') as HTMLElement;
    expect(theme.querySelector('.slm-set-seg-thumb')?.getAttribute('aria-hidden')).toBe('true');
    expect(theme.style.getPropertyValue('--slm-seg-count')).toBe('3');
    expect(theme.style.getPropertyValue('--slm-seg-index')).toBe('1');
    await clickControl(container, 'Dark');
    expect(theme.style.getPropertyValue('--slm-seg-index')).toBe('2');
    expect(theme.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    await clickControl(container, 'Auto');
    expect(theme.style.getPropertyValue('--slm-seg-index')).toBe('0');
    expect(container.textContent).toContain('Follows your system.');
    unmount();
  });

  it('gives every setting a title and a one-line description, and announces each save', async () => {
    const { container, unmount } = await renderOverlay();
    const rows = [...container.querySelectorAll('.slm-set-copy')];
    expect(rows.map((row) => row.querySelector('.slm-settings-label')?.textContent)).toEqual([
      'Theme',
      'Reading size',
      'Answers open on',
      'Share sessions across tabs',
      'Open the panel automatically',
    ]);
    for (const row of rows) {
      expect(row.querySelector('.slm-settings-hint')?.textContent?.length, row.textContent ?? '').toBeGreaterThan(10);
    }
    const live = container.querySelector('.slm-settings-foot [role="status"]') as HTMLElement;
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('');
    await clickControl(container, 'Solution');
    expect(live.textContent).toBe('Answers open on solution. Saved.');
    await clickControl(container, 'Share sessions across tabs');
    expect(live.textContent).toBe('Share sessions across tabs: on. Saved.');
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
