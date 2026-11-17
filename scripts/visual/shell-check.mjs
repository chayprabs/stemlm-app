#!/usr/bin/env node
/**
 * Layout check for the study panel's shell: how it opens beside the chat, and how it leaves.
 *
 * Loads the built extension on the stand-in of every chat host, in light and dark, and measures
 * the page instead of trusting the picture. With the panel open: the panel is flush with the
 * window's right edge at full height, the page ends where the panel begins, nothing of the page
 * lies under the panel, the page cannot scroll sideways, the composer sits inside its column and
 * is centred in it, and the host's own sidebar has been folded by one press of its own control.
 * Watched frame by frame while it opens, the chat column is never squeezed on the way there.
 * After closing: the sidebar is open again and the page is exactly as it was before, compared as
 * markup and as geometry. The same rules are checked at the panel's narrowest and widest, during
 * a drag, in a narrow window (where the panel overlays), at 80% and 125% zoom, across an in-page
 * navigation and a host theme switch, while an answer streams, and after opening and closing
 * faster than the sidebar animates.
 *
 *   pnpm build && node scripts/visual/shell-check.mjs [--ext dir] [--out dir] [--only chatgpt,dark]
 *
 * Writes one screenshot per state, shell-check.json and a contact sheet per scheme, and exits 1
 * when a rule is broken.
 */
import { BROWSER, chromium } from './browser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_IDS, hostOrigin, hostPage, hostUrl } from './hosts.mjs';
import { INCLINE } from './capsules.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(flag('out', join(root, '.visual/shell')));
const extension = resolve(flag('ext', join(root, '.output/chrome-mv3')));
const only = (flag('only', '') || '').split(',').filter(Boolean);
const SCHEMES = ['light', 'dark'].filter((s) => !only.some((o) => ['light', 'dark'].includes(o)) || only.includes(s));
const HOSTS = HOST_IDS.filter((id) => !only.some((o) => HOST_IDS.includes(o)) || only.includes(id));
const WINDOW = { width: 1440, height: 900 };
/** Under the overlay threshold (760px), where the hosts have also put their sidebar away. */
const NARROW = { width: 740, height: 900 };
/** The chat column the layout keeps beside the panel (MIN_CHAT_PX), less rounding. */
const CHAT = 479.5;
const QUESTION = 'A 5.0 kg block is released from rest on a 30° incline with μk = 0.20. Find its acceleration and its speed after 2.0 m.';
const SETTING_KEYS = ['stemlm_settings', 'stemlm_setting_splitRatio', 'stemlm_split_ratio_user_set', 'stemlm_setting_collapseHostSidebar'];

mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'stemlm-shell-'));
const ctx = await chromium.launchPersistentContext(profile, {
  ...BROWSER,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  viewport: WINDOW,
  deviceScaleFactor: 2,
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 20_000 });
await new Promise((r) => setTimeout(r, 600));
for (const p of ctx.pages()) if (p.url().includes('welcome.html')) await p.close();

const problems = [];
const report = {};
const setStored = (values) => sw.evaluate((v) => chrome.storage.local.set(v), values);
const clearStored = () => sw.evaluate((k) => chrome.storage.local.remove(k), SETTING_KEYS);
// This check is about the panel's shell. Folding stemLM's answer in the chat is a chat setting that
// stays after the panel closes (the folded row reopens it), with checks of its own; with it on, the
// thread here would be shorter after closing than before opening, by design.
await setStored({ stemlm_setting_tidyChat: false });

async function sendToTab(page, type) {
  const url = page.url();
  return sw.evaluate(async ({ url, type }) => {
    const tab = (await chrome.tabs.query({})).find((t) => t.url === url);
    if (!tab?.id) return { ok: false, error: 'no-tab' };
    for (let i = 0; i < 40; i++) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, { type });
        if (res?.error !== 'content-script-starting') return res;
      } catch { /* content script not listening yet */ }
      await new Promise((r) => setTimeout(r, 250));
    }
    return { ok: false, error: 'timeout' };
  }, { url, type });
}

async function open(id, scheme, opt = {}, viewport = WINDOW) {
  const page = await ctx.newPage();
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme: scheme });
  page.on('pageerror', (err) => problems.push(`${id}-${scheme}: page error: ${err.message.split('\n')[0]}`));
  await page.route(`${hostOrigin(id)}/**`, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(id, { scheme, question: QUESTION, capsule: INCLINE, ...opt }) }));
  await page.goto(hostUrl(id), { waitUntil: 'domcontentloaded' });
  await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
  await page.waitForTimeout(700);
  return page;
}

const panel = (page) => page.locator('.slm-panel');
/** Long enough for the host's 200ms fold and for stemLM to confirm it. */
const settle = (page, ms = 900) => page.waitForTimeout(ms);

async function openPanel(page, type = 'stemlm:load-conversation') {
  const res = await sendToTab(page, type);
  if (!res?.ok) throw new Error(`${type}: ${JSON.stringify(res)}`);
  await panel(page).waitFor({ state: 'visible', timeout: 15_000 });
  await settle(page);
}

async function closePanel(page) {
  await panel(page).locator('.slm-icon-btn--close').click();
  await panel(page).waitFor({ state: 'detached', timeout: 5000 });
  await settle(page);
}

/** The page as the host left it: its markup without stemLM's own root and composer control, and where things sit. */
const hostState = (page) => page.evaluate(() => {
  const clone = document.documentElement.cloneNode(true);
  for (const el of clone.querySelectorAll('stemlm-root, [data-stemlm-composer-slot]')) el.remove();
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 10) / 10).join(',');
  };
  return {
    markup: clone.outerHTML,
    geometry: { body: box('body'), main: box('main'), header: box('header.top'), thread: box('#thread'), composer: box('[data-hc-composer]'), sidebar: box('[data-sb]') },
    scroll: document.querySelector('.scroll')?.scrollTop ?? 0,
  };
});

const measure = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const stemlm = document.querySelector('stemlm-root');
  const panelEl = stemlm?.shadowRoot?.querySelector('.slm-panel');
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  };
  const p = rect(panelEl);
  const under = new Set();
  if (p) {
    for (const fx of [0.01, 0.5, 0.99]) {
      for (const fy of [0.01, 0.25, 0.5, 0.75, 0.99]) {
        for (const el of document.elementsFromPoint(p.left + p.width * fx, p.top + p.height * fy)) {
          if (el === document.documentElement || el === stemlm) continue;
          under.add(el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className ? `.${el.className.split(' ')[0]}` : ''));
        }
      }
    }
  }
  window.scrollTo(400, 0);
  const sideways = window.scrollX !== 0;
  window.scrollTo(0, 0);
  const scroller = document.querySelector('.scroll');
  // The column the sidebar takes from the page (Grok's wrapper has no box of its own).
  const sidebarBox = document.querySelector('[data-sidebar="sidebar"]') ?? document.querySelector('[data-sb]');
  return {
    vw,
    vh,
    panel: p,
    body: rect(document.body),
    main: rect(document.querySelector('main')),
    header: rect(document.querySelector('header.top')),
    composer: rect(document.querySelector('[data-hc-composer]')),
    under: [...under],
    sideways,
    threadSideways: scroller ? scroller.scrollWidth > scroller.clientWidth + 1 : false,
    split: document.getElementById('stemlm-split-style') !== null,
    bodyStyle: document.body.getAttribute('style'),
    htmlClass: document.documentElement.getAttribute('class'),
    sidebar: window.__sidebar ? { open: window.__sidebar.isOpen(), presses: window.__sidebar.presses, width: Math.round(sidebarBox?.getBoundingClientRect().width ?? 0) } : null,
  };
});

const near = (a, b, slack = 0.75) => Math.abs(a - b) <= slack;

/** The rules that hold whenever the panel is open. `overlay`: the window is too narrow to split. */
function rules(label, m, { overlay = false } = {}) {
  const fail = (text) => problems.push(`${label}: ${text}`);
  if (!m.panel) return fail('the panel is not open');
  if (!near(m.panel.right, m.vw) || !near(m.panel.top, 0) || !near(m.panel.bottom, m.vh)) {
    fail(`the panel is not flush right at full height (${JSON.stringify(m.panel)} in ${m.vw}x${m.vh})`);
  }
  if (m.sideways) fail('the page scrolls sideways');
  if (overlay) {
    if (!near(m.panel.left, 0)) fail(`the overlay panel starts at ${m.panel.left}px, not the window edge`);
    if (m.split) fail('the page is narrowed although the panel overlays it');
    return;
  }
  if (!m.split) return fail('the page is not narrowed beside the panel');
  if (!near(m.body.right, m.panel.left, 1)) fail(`the page ends at ${m.body.right}px but the panel begins at ${m.panel.left}px`);
  if (m.under.length) fail(`under the panel: ${m.under.join(', ')}`);
  if (m.threadSideways) fail('the thread scrolls sideways');
  if (m.header.right > m.panel.left + 0.5) fail(`the host header reaches ${m.header.right}px, under the panel at ${m.panel.left}px`);
  if (m.composer.left < m.main.left - 0.5 || m.composer.right > m.main.right + 0.5) fail(`the composer (${m.composer.left} to ${m.composer.right}) leaves its column (${m.main.left} to ${m.main.right})`);
  const off = (m.composer.left + m.composer.right) / 2 - (m.main.left + m.main.right) / 2;
  if (Math.abs(off) > 1) fail(`the composer is ${off.toFixed(1)}px off the centre of its column`);
  if (m.panel.width < 280 - 0.5) fail(`the panel is ${m.panel.width}px wide, under its minimum`);
}

async function shot(page, name) {
  // Playwright hides the text caret by writing an inline style on every input, and leaves an
  // empty style attribute behind: that would be reported as a change to the page.
  await page.screenshot({ path: join(out, `${name}.png`), caret: 'initial' });
}

const widths = (m) => ({ window: m.vw, panel: Math.round(m.panel?.width ?? 0), page: Math.round(m.body.width), chat: Math.round(m.main.width), composer: Math.round(m.composer.width), sidebar: m.sidebar?.width ?? 0 });

/** Before, open, after, then the panel's two extremes, a drag and a narrow window. */
async function mainRun(id, scheme) {
  const tag = `${id}-${scheme}`;
  const fail = (text) => problems.push(`${tag}: ${text}`);
  const record = (report[tag] = {});
  const page = await open(id, scheme);
  try {
    const before = await hostState(page);
    const m0 = await measure(page);
    if (!m0.sidebar?.open) fail('the stand-in sidebar is not open to begin with');
    record.before = { sidebar: m0.sidebar?.width, chat: Math.round(m0.main.width) };
    await shot(page, `${tag}-01-before`);

    await openPanel(page);
    const m1 = await measure(page);
    rules(`${tag} open`, m1);
    if (m1.sidebar.open) fail('the host sidebar is still open beside the panel');
    if (m1.sidebar.presses !== 1) fail(`the host's sidebar control was pressed ${m1.sidebar.presses} times to fold it`);
    if (m1.main.width < CHAT) fail(`the chat column is ${m1.main.width}px wide beside the panel`);
    if (m1.bodyStyle !== m0.bodyStyle || m1.htmlClass !== m0.htmlClass) fail('the page\'s <html> or <body> carries something of stemlm\'s while the panel is open');
    record.open = widths(m1);
    await shot(page, `${tag}-02-open`);

    await closePanel(page);
    const after = await hostState(page);
    const m2 = await measure(page);
    if (!m2.sidebar.open) fail('the host sidebar was not opened again after the panel closed');
    if (m2.sidebar.presses !== 2) fail(`${m2.sidebar.presses} presses of the host's sidebar control after one open and close`);
    if (after.markup !== before.markup) fail(`the page's markup differs after closing (first difference at ${firstDifference(before.markup, after.markup)})`);
    if (JSON.stringify(after.geometry) !== JSON.stringify(before.geometry)) fail(`the page's layout differs after closing: ${JSON.stringify(before.geometry)} became ${JSON.stringify(after.geometry)}`);
    if (after.scroll !== before.scroll) fail(`the thread is scrolled to ${after.scroll}, was ${before.scroll}`);
    await shot(page, `${tag}-03-after`);

    // Opening again, watched frame by frame: the chat column goes to its place beside the panel
    // and is never squeezed narrower on the way, while the host is still folding its sidebar.
    await page.evaluate(() => {
      const main = document.querySelector('main');
      window.__chat = [];
      const frame = () => {
        window.__chat.push(Math.round(main.getBoundingClientRect().width));
        window.__watching = requestAnimationFrame(frame);
      };
      frame();
    });
    await openPanel(page, 'stemlm:open-panel');
    const frames = await page.evaluate(() => (cancelAnimationFrame(window.__watching), window.__chat));
    record.narrowestChatWhileOpening = Math.min(...frames);
    if (record.narrowestChatWhileOpening < CHAT) fail(`the chat column was squeezed to ${record.narrowestChatWhileOpening}px while the panel opened`);

    // The panel at its narrowest and widest, from the keyboard.
    const handle = panel(page).locator('.slm-resize-handle');
    await handle.focus();
    for (let i = 0; i < 16; i++) await page.keyboard.press('Shift+ArrowRight');
    await settle(page, 400);
    const min = await measure(page);
    rules(`${tag} narrowest`, min);
    record.narrowest = widths(min);
    await shot(page, `${tag}-04-narrowest`);
    // From the floor one step back up must show: the keys are never dead.
    await page.keyboard.press('ArrowLeft');
    await settle(page, 200);
    if (!((await measure(page)).panel.width > min.panel.width + 1)) fail('an arrow key on the resize handle did nothing at the narrowest width');
    for (let i = 0; i < 16; i++) await page.keyboard.press('Shift+ArrowLeft');
    await settle(page, 400);
    const max = await measure(page);
    rules(`${tag} widest`, max);
    if (max.main.width < CHAT) fail(`the chat column is ${max.main.width}px wide beside the widest panel`);
    record.widest = widths(max);
    await shot(page, `${tag}-05-widest`);
    await page.keyboard.press('ArrowRight');
    await settle(page, 200);
    if (!((await measure(page)).panel.width < max.panel.width - 1)) fail('an arrow key on the resize handle did nothing at the widest width');
    const step = await panel(page).locator('.slm-step-rail [aria-current="step"]').first().getAttribute('aria-label');
    if (!step?.startsWith('Step 1:')) fail(`resizing from the keyboard also turned the step page (now on "${step}")`);

    // A drag: the rules hold at every point of it, and nothing is left on the page afterwards.
    const grip = await handle.boundingBox();
    await page.mouse.move(grip.x + 4, grip.y + grip.height / 2);
    await page.mouse.down();
    for (const x of [520, 700, 900, 1100, 760]) {
      await page.mouse.move(x, 420, { steps: 4 });
      rules(`${tag} dragging to ${x}px`, await measure(page));
    }
    await page.mouse.up();
    await settle(page, 300);
    const dragged = await measure(page);
    rules(`${tag} after the drag`, dragged);
    if (dragged.bodyStyle !== m0.bodyStyle) fail(`a drag left style="${dragged.bodyStyle}" on <body>`);

    // A narrow window: the panel overlays, the page keeps its width underneath.
    await page.setViewportSize(NARROW);
    await settle(page, 500);
    rules(`${tag} narrow window`, await measure(page), { overlay: true });
    await shot(page, `${tag}-06-narrow`);
    await page.setViewportSize(WINDOW);
    await settle(page, 500);
    rules(`${tag} widened again`, await measure(page));
    await closePanel(page);
    const end = await measure(page);
    if (!end.sidebar.open) fail('the sidebar was not opened again after a resize through the narrow window');
    if (end.split || end.bodyStyle !== m0.bodyStyle) fail('the page was not given back after the last close');
  } catch (err) {
    fail(`stopped: ${err.message.split('\n')[0]}`);
    await shot(page, `${tag}-ERROR`);
  } finally {
    await page.close();
    await clearStored();
  }
}

function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `char ${i}: "${a.slice(Math.max(0, i - 40), i + 60)}" became "${b.slice(Math.max(0, i - 40), i + 60)}"`;
}

/** The ways a session goes wrong: speed, navigation, zoom, theme, streaming, keys, focus, and sidebars stemLM must leave alone. */
async function stressRun(id, scheme) {
  const tag = `${id}-${scheme}`;
  const fail = (text) => problems.push(`${tag}: ${text}`);
  const record = report[tag] ?? (report[tag] = {});
  const stage = async (name, opt, run, viewport) => {
    const page = await open(id, scheme, opt, viewport);
    try {
      await run(page);
    } catch (err) {
      fail(`${name} stopped: ${err.message.split('\n')[0]}`);
      await shot(page, `${tag}-${name}-ERROR`);
    } finally {
      await page.close();
      await clearStored();
    }
  };

  await stage('fast', {}, async (page) => {
    const before = await hostState(page);
    await openPanel(page);
    await closePanel(page);
    // Open and close faster than the sidebar animates, six times over.
    for (let i = 0; i < 6; i++) {
      await sendToTab(page, 'stemlm:open-panel');
      await page.waitForTimeout(i % 2 ? 40 : 140);
      await page.evaluate(() => document.querySelector('stemlm-root').shadowRoot.querySelector('.slm-icon-btn--close')?.click());
      await page.waitForTimeout(i % 3 ? 30 : 120);
    }
    await settle(page, 3000);
    const m = await measure(page);
    const after = await hostState(page);
    if (m.panel) fail('fast: the panel is still open');
    if (!m.sidebar.open) fail('fast: the sidebar was left folded');
    if (m.sidebar.presses % 2) fail(`fast: ${m.sidebar.presses} presses of the sidebar control, an odd number`);
    if (after.markup !== before.markup || JSON.stringify(after.geometry) !== JSON.stringify(before.geometry)) fail('fast: the page is not as it was');
    record.fastPresses = m.sidebar.presses;
  });

  await stage('session', {}, async (page) => {
    await openPanel(page);
    // The student moves to another chat inside the site.
    await page.evaluate(() => (window.__standin?.navigate ? window.__standin.navigate('/c/another-chat') : history.pushState({}, '', '/c/another-chat')));
    await settle(page);
    rules(`${tag} after an in-page navigation`, await measure(page));
    // The host switches theme by rewriting the class of <html>.
    await page.evaluate(() => { document.documentElement.className = 'dark theme-switched'; document.documentElement.style.colorScheme = 'dark'; });
    await settle(page, 300);
    rules(`${tag} after a host theme switch`, await measure(page));
    // An answer streams in while the panel is open, and grows long.
    await page.evaluate(() => {
      const thread = document.getElementById('thread');
      let n = 0;
      window.__stream = setInterval(() => {
        const p = document.createElement('p');
        p.textContent = `Streaming line ${++n}: the block accelerates down the incline while friction opposes the motion, so the net force along the slope is smaller than the weight component.`;
        thread.append(p);
        document.querySelector('.scroll').scrollTop = 1e9;
      }, 30);
    });
    await closePanel(page);
    await openPanel(page, 'stemlm:open-panel');
    rules(`${tag} opened while an answer streams`, await measure(page));
    await page.evaluate(() => clearInterval(window.__stream));
    await settle(page, 300);
    rules(`${tag} beside a long answer`, await measure(page));
    await shot(page, `${tag}-07-long-answer`);

    // Keys pressed in the panel stay in the panel; Escape closes it and nothing else.
    await page.evaluate(() => { window.__hostKeys = []; for (const type of ['keydown', 'keyup']) document.addEventListener(type, (e) => window.__hostKeys.push(`${type}:${e.key}`)); });
    await panel(page).focus();
    for (const key of ['a', 'ArrowRight', 'Escape']) await page.keyboard.press(key);
    await panel(page).waitFor({ state: 'detached', timeout: 5000 });
    const leaked = await page.evaluate(() => window.__hostKeys);
    if (leaked.length) fail(`keys pressed in the panel reached the page: ${leaked.join(' ')}`);
  });

  await stage('focus', { empty: true }, async (page) => {
    const editor = page.locator('[data-hc-composer] .editor').first();
    await editor.click();
    await page.keyboard.type('and what if the incline');
    await openPanel(page, 'stemlm:open-panel');
    const typing = await page.evaluate(() => document.activeElement?.closest('[data-hc-composer]') !== null);
    if (!typing) fail('focus: opening the panel took the keyboard from a half-typed message');
    await closePanel(page);
    if (!(await page.evaluate(() => document.activeElement?.closest('[data-hc-composer]') !== null))) fail('focus: closing the panel moved focus out of the chat box');
    // With nothing typed the panel takes focus, and gives it back.
    await editor.fill('').catch(() => editor.evaluate((el) => { el.textContent = ''; }));
    await editor.click();
    await openPanel(page, 'stemlm:open-panel');
    if (!(await page.evaluate(() => document.activeElement?.tagName === 'STEMLM-ROOT'))) fail('focus: the open panel does not have focus');
    await page.keyboard.press('Escape');
    await panel(page).waitFor({ state: 'detached', timeout: 5000 });
    if (!(await page.evaluate(() => document.activeElement?.closest('[data-hc-composer]') !== null))) fail('focus: Escape did not return focus to the chat box');
  });

  for (const [name, zoom] of [['zoom-125', 1.25], ['zoom-80', 0.8]]) {
    // Browser zoom changes the window's size in CSS pixels; that is all the layout sees of it.
    await stage(name, {}, async (page) => {
      await openPanel(page);
      rules(`${tag} at ${zoom * 100}% zoom`, await measure(page));
      if (id === 'chatgpt') await shot(page, `${tag}-08-${name}`);
      await closePanel(page);
    }, { width: Math.round(WINDOW.width / zoom), height: Math.round(WINDOW.height / zoom) });
  }

  // Read when a page starts, so switched off before this one opens; the stage clears it again.
  await setStored({ stemlm_setting_collapseHostSidebar: false });
  await stage('setting-off', {}, async (page) => {
    await openPanel(page);
    const m = await measure(page);
    rules(`${tag} with the sidebar setting off`, m);
    if (!m.sidebar.open || m.sidebar.presses !== 0) fail('setting off: the host sidebar was touched');
    if (m.main.width < CHAT) fail(`setting off: the chat column is ${m.main.width}px wide beside an open sidebar`);
    record.settingOff = widths(m);
    await shot(page, `${tag}-09-setting-off`);
    await closePanel(page);
  });

  await stage('already-folded', { sidebar: 'folded' }, async (page) => {
    await openPanel(page);
    rules(`${tag} with a sidebar the student folded`, await measure(page));
    await closePanel(page);
    const m = await measure(page);
    if (m.sidebar.open || m.sidebar.presses !== 0) fail('already folded: the sidebar was touched');
  });

  await stage('no-sidebar', { sidebar: false }, async (page) => {
    await openPanel(page);
    rules(`${tag} on a page without a sidebar`, await measure(page));
    await closePanel(page);
  });
}

try {
  for (const scheme of SCHEMES) {
    for (const id of HOSTS) {
      await mainRun(id, scheme);
      console.log('[shell]', `${id}-${scheme}`, JSON.stringify(report[`${id}-${scheme}`]));
    }
  }
  if (!args.includes('--quick')) {
    for (const id of HOSTS) {
      const scheme = SCHEMES[0];
      await stressRun(id, scheme);
      console.log('[shell]', `${id}-${scheme} stress`, JSON.stringify(report[`${id}-${scheme}`]));
    }
  }
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}

writeFileSync(join(out, 'shell-check.json'), JSON.stringify({ problems, report }, null, 2));
const sheet = (name, cols, suffixes) => {
  for (const scheme of SCHEMES) {
    const files = HOSTS.flatMap((id) => suffixes.map((s) => join(out, `${id}-${scheme}-${s}.png`)));
    try {
      execFileSync(process.execPath, [join(root, 'scripts/visual/sheet.mjs'), join(out, `sheet-${scheme}-${name}.png`), '--cols', String(cols), '--width', '720', ...files], { stdio: 'inherit' });
    } catch (err) {
      problems.push(`contact sheet ${name} ${scheme}: ${err.message.split('\n')[0]}`);
    }
  }
};
sheet('before-open-after', 3, ['01-before', '02-open', '03-after']);
sheet('narrow-narrowest-widest', 3, ['06-narrow', '04-narrowest', '05-widest']);

if (problems.length) {
  console.log('\n[shell] problems:\n - ' + problems.join('\n - '));
  process.exitCode = 1;
} else {
  console.log('[shell] every rule holds; images in', out);
}
