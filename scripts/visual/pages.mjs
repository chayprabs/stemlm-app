#!/usr/bin/env node
/**
 * Visual harness for the extension's own pages: toolbar popup, welcome, saved questions, settings,
 * and the PDF export window with a saved answer opened from the library.
 *
 *   STEMLM_OUT_DIR=.output-x npx wxt build
 *   node scripts/visual/pages.mjs --ext .output-x/chrome-mv3 [--out dir] [--only popup,library,pdf]
 *
 * It drives the real built pages in Chromium, in light and dark, and puts each one through the
 * states a still screenshot of the default view would miss: a supported chat tab, an error, a
 * seeded library, a search with and without results, selection mode, a delete and its undo,
 * damaged records, unreadable storage, an export in progress and one that fails, narrow windows.
 */
import { BROWSER, chromium } from './browser.mjs';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { savedEdgeCases, savedLongAnswer, savedSeed } from './saved-seed.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(flag('out', join(root, '.visual')));
const only = (flag('only', '') || '').split(',').filter(Boolean);
const want = (name) => only.length === 0 || only.includes(name);
const extension = resolve(flag('ext', join(root, '.output/chrome-mv3')));
const SCHEMES = ['light', 'dark'];

mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'stemlm-pages-'));
const log = (...a) => console.log('[pages]', ...a);

const ctx = await chromium.launchPersistentContext(profile, {
  ...BROWSER,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 20_000 });
const extId = new URL(sw.url()).host;
const extUrl = (path) => `chrome-extension://${extId}/${path}`;

await new Promise((r) => setTimeout(r, 600));
for (const p of ctx.pages()) if (p.url().includes('welcome.html')) await p.close();

const failures = [];
async function shot(page, name, opt = {}) {
  const file = join(out, `${name}.png`);
  try {
    if (opt.locator) await opt.locator.screenshot({ path: file });
    else await page.screenshot({ path: file, fullPage: Boolean(opt.fullPage), clip: opt.clip });
    log('wrote', `${name}.png`);
  } catch (err) {
    failures.push(`${name}: ${err.message.split('\n')[0]}`);
    log('FAILED', name, err.message.split('\n')[0]);
  }
}
const settle = (page, ms = 450) => page.waitForTimeout(ms);

/** Replace the saved library with these stored records. */
async function seedRecords(items) {
  await sw.evaluate(async (list) => {
    await chrome.storage.local.set({ stemlm_saved_sessions: list, stemlm_saved_sessions_version: 2 });
  }, items);
}

/** Replace the saved library with `count` seeded answers (0 clears it). */
const seedSaved = (count) => seedRecords(savedSeed(count));

async function openPage(path, scheme, viewport, init) {
  const page = await ctx.newPage();
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme: scheme });
  if (init) await page.addInitScript(init.fn, init.arg);
  page.on('pageerror', (err) => failures.push(`${path} page error: ${err.message.split('\n')[0]}`));
  await page.goto(extUrl(path), { waitUntil: 'load' });
  await settle(page, 700);
  return page;
}

/** Make the popup believe it was opened over `url`: in a tab it would otherwise only see itself. */
const overTab = (url) => ({
  fn: (tabUrl) => {
    const real = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = (info, ...rest) =>
      info && info.active ? Promise.resolve([{ id: 1, windowId: 1, url: tabUrl }]) : real(info, ...rest);
  },
  arg: url,
});

async function popupSuite(scheme) {
  const viewport = { width: 312, height: 480 };
  await seedSaved(0);
  {
    const page = await openPage('popup.html', scheme, viewport);
    // Off a chat the panel button is not on offer and says why; the guide can still be copied by hand.
    if (!(await page.locator('[data-launch="open-study-panel"]').isDisabled())) throw new Error('"Open study panel" is enabled off a chat');
    await shot(page, `popup-${scheme}-1-other-tab`, { locator: page.locator('.slm-popup') });
    await page.locator('[data-launch="copy-guide"]').click();
    await settle(page, 500);
    await shot(page, `popup-${scheme}-2-guide-copied`, { locator: page.locator('.slm-popup') });
    await page.close();
  }
  await seedSaved(12);
  for (const [host, url] of [['chatgpt', 'https://chatgpt.com/c/demo'], ['gemini', 'https://gemini.google.com/app/demo']]) {
    const page = await openPage('popup.html', scheme, viewport, overTab(url));
    await shot(page, `popup-${scheme}-3-on-${host}`, { locator: page.locator('.slm-popup') });
    if (host === 'chatgpt') {
      await page.locator('[data-launch="stemlm-enabled"]').click();
      await settle(page, 400);
      await shot(page, `popup-${scheme}-4-on-chatgpt-off`, { locator: page.locator('.slm-popup') });
      await page.locator('[data-launch="stemlm-enabled"]').click();
      await page.keyboard.press('Tab');
      await settle(page, 300);
      await shot(page, `popup-${scheme}-5-focus-ring`, { locator: page.locator('.slm-popup') });
    }
    await page.close();
  }
}

/** Scroll the whole page once so lazily compiled figures are drawn before a full-page shot. */
async function visitWholePage(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await settle(page, 900);
}

async function welcomeSuite(scheme) {
  for (const [name, width, height] of [['desktop', 1440, 900], ['laptop', 1100, 800], ['tablet', 768, 900], ['phone', 360, 760], ['wide', 1600, 1000]]) {
    // The narrow and very wide passes check layout only; one theme is enough for them.
    if (scheme === 'dark' && (name === 'laptop' || name === 'wide')) continue;
    const page = await openPage('welcome.html', scheme, { width, height });
    await visitWholePage(page);
    await shot(page, `welcome-${scheme}-${name}`, { fullPage: true });
    if (name === 'desktop') {
      const frame = page.locator('.slm-demo-frame');
      await frame.scrollIntoViewIfNeeded();
      await shot(page, `welcome-${scheme}-demo-step1`, { locator: frame });
      await page.locator('.slm-demo-panel .slm-diagram-enlarge').click();
      await settle(page, 600);
      await shot(page, `welcome-${scheme}-demo-figure-enlarged`);
      await page.keyboard.press('Escape');
      await settle(page, 400);
      const panel = page.locator('.slm-demo-panel');
      await panel.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await settle(page, 700);
      await shot(page, `welcome-${scheme}-demo-step3-keyboard`, { locator: frame });
      await page.locator('.slm-demo-panel .slm-quickcheck-reveal').click();
      await settle(page, 600);
      await shot(page, `welcome-${scheme}-demo-step3-revealed`, { locator: frame });
      await page.locator('.slm-demo-panel .slm-step-rail-btn').last().click();
      await settle(page, 700);
      await shot(page, `welcome-${scheme}-demo-step5-answer`, { locator: frame });
      await shot(page, `welcome-${scheme}-steps`, { locator: page.locator('.slm-welcome-steps') });
      await shot(page, `welcome-${scheme}-gallery`, { locator: page.locator('.slm-welcome-gallery') });
    }
    await page.close();
  }
}

/** The library opens in a 700 x 600 window (src/lib/saved-library.ts); less the title bar, it is shot at that size first. */
async function librarySuite(scheme) {
  const windowSize = { width: 700, height: 562 };
  const page = async (count, viewport = windowSize) => {
    await seedSaved(count);
    return openPage('saved-library.html', scheme, viewport);
  };
  const search = 'input[aria-label="Search saved questions"]';

  let p = await page(0);
  await shot(p, `library-${scheme}-1-empty`);
  await p.close();

  p = await page(1);
  await shot(p, `library-${scheme}-2-one`);
  await p.close();

  p = await page(7);
  await shot(p, `library-${scheme}-3-seven`);
  await p.locator('.slm-library-row').nth(1).hover();
  await settle(p, 250);
  await shot(p, `library-${scheme}-4-row-hover`);
  await p.locator('[data-action="download"]').first().focus();
  await p.keyboard.press('Tab');
  await settle(p, 250);
  await shot(p, `library-${scheme}-5-action-focus`);
  await p.locator(search).fill('incline');
  await settle(p, 400);
  await shot(p, `library-${scheme}-6-search-results`);
  await p.locator(search).fill('organic stereochemistry');
  await settle(p, 400);
  await shot(p, `library-${scheme}-7-search-none`);
  await p.locator('[data-library="clear-filters"]').click();
  await p.locator('button[aria-label="Filter by time"]').click();
  await settle(p, 300);
  await shot(p, `library-${scheme}-8-time-menu`);
  await p.keyboard.press('Escape');
  await p.locator('[data-merge="start"]').click();
  await p.locator('.slm-library-check').nth(0).click();
  await p.locator('.slm-library-check').nth(2).click();
  await p.mouse.move(690, 450);
  await settle(p, 400);
  await shot(p, `library-${scheme}-9-selecting`);
  await p.close();

  p = await page(300);
  await shot(p, `library-${scheme}-10-three-hundred`);
  await p.close();

  // Deleting: the row goes at once, the bar under the list brings it back.
  p = await page(7);
  await p.locator('[data-action="delete"]').nth(1).click();
  await p.mouse.move(690, 20);
  await settle(p, 500);
  await shot(p, `library-${scheme}-14-deleted-one`);
  await p.locator('[data-action="delete"]').nth(0).focus();
  await p.keyboard.press('Enter');
  await settle(p, 500);
  await shot(p, `library-${scheme}-15-deleted-two-focus-follows`);
  await p.keyboard.press('Control+z');
  await settle(p, 600);
  await shot(p, `library-${scheme}-16-undone`);
  // The time menu from the keyboard: it opens on the current choice and the arrows move from it.
  await p.locator('button[aria-label="Filter by time"]').focus();
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  await settle(p, 300);
  await shot(p, `library-${scheme}-17-time-menu-keyboard`);
  await p.keyboard.press('Escape');
  // One PDF at a time: the row says what is happening where its date was, then that it is saved.
  await p.locator('[data-action="download"]').nth(0).click();
  await p.mouse.move(690, 20);
  await p.waitForSelector('.slm-library-row-note', { timeout: 5_000 }).catch(() => {});
  await shot(p, `library-${scheme}-18-building-pdf`);
  await p.locator('.slm-library-row-note', { hasText: 'Saved' }).waitFor({ timeout: 30_000 }).catch(() => {});
  await shot(p, `library-${scheme}-19-pdf-saved`);
  await p.close();

  // Records a library has to survive (scripts/visual/saved-seed.mjs).
  await seedRecords(savedEdgeCases());
  p = await openPage('saved-library.html', scheme, windowSize);
  await shot(p, `library-${scheme}-20-edge-cases`);
  await p.locator('.slm-library-feed').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await settle(p, 300);
  await shot(p, `library-${scheme}-21-edge-cases-end`);
  await p.close();

  // Storage that cannot be read is not an empty library.
  p = await openPage('saved-library.html', scheme, windowSize, {
    // The library reads everything (`get(null)`); settings read their own keys and still work.
    fn: () => {
      const read = chrome.storage.local.get.bind(chrome.storage.local);
      chrome.storage.local.get = (keys, ...rest) =>
        keys === null ? Promise.reject(new Error('storage unavailable')) : read(keys, ...rest);
    },
  });
  await shot(p, `library-${scheme}-22-read-failed`);
  await p.close();

  if (scheme === 'light') {
    p = await page(7, { width: 1280, height: 860 });
    await shot(p, `library-${scheme}-11-large-window`);
    await p.close();
    p = await page(7, { width: 400, height: 620 });
    await shot(p, `library-${scheme}-12-narrow-window`);
    await p.locator('[data-merge="start"]').click();
    await p.locator('.slm-library-check').nth(1).click();
    await settle(p, 400);
    await shot(p, `library-${scheme}-13-narrow-selecting`);
    await p.close();
  }
  await seedSaved(0);
}

/** Forget every stored setting, so each settings pass starts from the defaults. */
async function resetSettings() {
  await sw.evaluate(async () => {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((key) => key.startsWith('stemlm_setting') || key === 'stemlm_enabled');
    if (keys.length) await chrome.storage.local.remove(keys);
  });
}

/** Settings opens in a window fitted to the sheet (about 480px wide); it is shot at that width. */
async function settingsSuite(scheme) {
  await resetSettings();
  const page = await openPage('options.html', scheme, { width: 480, height: 640 });
  const sheet = page.locator('.slm-settings-page-shell');
  await shot(page, `settings-${scheme}-1-default`, { locator: sheet });
  await page.locator('.slm-set-seg-btn', { hasText: 'Solution' }).click();
  await page.locator('[role="switch"]').first().click();
  const scale = page.locator('.slm-set-scale-input');
  await scale.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await settle(page, 500);
  await shot(page, `settings-${scheme}-2-changed-scale-focus`, { locator: sheet });
  await page.locator('.slm-set-seg-btn', { hasText: 'Light' }).focus();
  await page.keyboard.press('Tab');
  await settle(page, 300);
  await shot(page, `settings-${scheme}-3-segment-focus`, { locator: sheet });
  await page.close();
  await resetSettings();
  if (scheme === 'light') {
    const narrow = await openPage('options.html', scheme, { width: 360, height: 700 });
    await shot(narrow, `settings-${scheme}-4-narrow`, { locator: narrow.locator('.slm-settings-page-shell') });
    await narrow.close();
  }
}

/**
 * pdf.html: the small export window the panel opens (420 x 240, src/lib/pdf-export-request.ts),
 * and a saved answer opened from the library. The export is caught mid-build by stopping the
 * page from closing itself and photographing it as its status changes.
 */
async function pdfSuite(scheme) {
  const exportWindow = { width: 404, height: 201 };
  const keepOpen = { fn: () => { window.close = () => {}; } };
  await seedRecords([savedLongAnswer(), ...savedEdgeCases()]);

  let p = await openPage('pdf.html?mode=download&job=expired-0000', scheme, exportWindow, keepOpen);
  await shot(p, `pdf-${scheme}-1-export-expired`);
  await p.close();

  p = await ctx.newPage();
  await p.setViewportSize(exportWindow);
  await p.emulateMedia({ colorScheme: scheme });
  await p.addInitScript(keepOpen.fn);
  await p.goto(extUrl('pdf.html?mode=download&id=seed-long'), { waitUntil: 'load' });
  await shot(p, `pdf-${scheme}-2-export-preparing`);
  await p.locator('.slm-saved-pdf-status', { hasText: 'page' }).waitFor({ timeout: 60_000 }).catch(() => {});
  await shot(p, `pdf-${scheme}-3-export-rendering`);
  await p.locator('#app[data-state="done"], #app[data-state="error"]').waitFor({ timeout: 120_000 }).catch(() => {});
  await shot(p, `pdf-${scheme}-4-export-saved`);
  await p.close();

  // A build that cannot run: html2canvas needs a frame to render in, and here it gets none.
  p = await ctx.newPage();
  await p.setViewportSize(exportWindow);
  await p.emulateMedia({ colorScheme: scheme });
  await p.addInitScript(() => {
    window.close = () => {};
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function (tag, ...rest) {
      if (String(tag).toLowerCase() === 'iframe') throw new Error('frames are blocked');
      return create.call(this, tag, ...rest);
    };
  });
  await p.goto(extUrl('pdf.html?mode=download&id=edge-ingest'), { waitUntil: 'load' });
  await p.locator('#app[data-state="error"]').waitFor({ timeout: 30_000 }).catch(() => {});
  await settle(p, 300);
  await shot(p, `pdf-${scheme}-5-export-failed`);
  await p.close();

  // A saved answer opened from the library (820px wide), and one that is no longer there.
  const viewer = { width: 804, height: 900 };
  p = await openPage('pdf.html?id=edge-ingest', scheme, viewer);
  await settle(p, 900);
  await shot(p, `pdf-${scheme}-6-saved-answer-from-chat`);
  await p.close();
  p = await openPage('pdf.html?id=edge-token', scheme, viewer);
  await settle(p, 900);
  await shot(p, `pdf-${scheme}-7-saved-answer-long-token`);
  await p.close();
  p = await openPage('pdf.html?id=gone', scheme, viewer);
  await shot(p, `pdf-${scheme}-8-saved-answer-missing`);
  await p.close();
  await seedSaved(0);
}

try {
  for (const scheme of SCHEMES) {
    if (want('settings')) await settingsSuite(scheme);
    if (want('library')) await librarySuite(scheme);
    if (want('pdf')) await pdfSuite(scheme);
    if (want('popup')) await popupSuite(scheme);
    if (want('welcome')) await welcomeSuite(scheme);
  }
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}

if (failures.length) {
  console.log('\n[pages] problems:\n - ' + failures.join('\n - '));
  process.exitCode = 1;
} else {
  log('all page states captured in', out);
}
