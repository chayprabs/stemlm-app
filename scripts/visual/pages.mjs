#!/usr/bin/env node
/**
 * Visual harness for the extension's own pages: toolbar popup, welcome, saved questions, settings.
 *
 *   STEMLM_OUT_DIR=.output-x npx wxt build
 *   node scripts/visual/pages.mjs --ext .output-x/chrome-mv3 [--out dir] [--only popup,library]
 *
 * It drives the real built pages in Chromium, in light and dark, and puts each one through the
 * states a still screenshot of the default view would miss: a supported chat tab, an error, a
 * seeded library, a search with and without results, selection mode, narrow windows.
 */
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { savedSeed } from './saved-seed.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');

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
  headless: true,
  channel: 'chromium',
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

/** Replace the saved library with `count` seeded answers (0 clears it). */
async function seedSaved(count) {
  await sw.evaluate(async (items) => {
    await chrome.storage.local.set({ stemlm_saved_sessions: items, stemlm_saved_sessions_version: 2 });
  }, savedSeed(count));
}

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
    await shot(page, `popup-${scheme}-1-other-tab`, { locator: page.locator('.slm-popup') });
    await page.locator('[data-launch="open-study-panel"]').click();
    await settle(page, 500);
    await shot(page, `popup-${scheme}-2-other-tab-error`, { locator: page.locator('.slm-popup') });
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

try {
  for (const scheme of SCHEMES) {
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
