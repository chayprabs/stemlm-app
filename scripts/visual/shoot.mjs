#!/usr/bin/env node
/**
 * Visual harness: load the built extension in Chromium and photograph every
 * surface, in light and dark, on a layout double of each chat host.
 *
 *   pnpm build && node scripts/visual/shoot.mjs [--out dir] [--only chatgpt,popup]
 *   Panel states (narrow, many steps, sessions, banners, lightbox, ...): --only state, or --only state-narrow
 *   Plain (non-stemLM) answers on every host, figures from fences, the capture fallback: --only plain, or --only plain-capture
 *
 * It drives the real content script, panel bundle and extension pages; only the
 * chat sites themselves are doubles (scripts/visual/hosts.mjs).
 */
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_IDS, hostOrigin, hostPage, hostUrl } from './hosts.mjs';
import { CIRCUIT, DIJKSTRA, INCLINE } from './capsules.mjs';
import { panelStateSuites } from './panel-states.mjs';
import { plainSuites } from './plain-suite.mjs';

// Playwright is a machine-level tool here, not a project dependency: resolve it the CommonJS way
// (NODE_PATH or a global install) so the harness adds nothing to the extension's lockfile.
const { chromium } = createRequire(import.meta.url)('playwright');

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(flag('out', join(root, '.visual')));
const only = (flag('only', '') || '').split(',').filter(Boolean);
const want = (name) => only.length === 0 || only.some((o) => name.includes(o));
const extension = resolve(flag('ext', join(root, '.output/chrome-mv3')));
const SCHEMES = ['light', 'dark'];

mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'stemlm-visual-'));
const log = (...a) => console.log('[visual]', ...a);

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

// First install opens the welcome tab; it is photographed on purpose below.
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

async function sendToTab(page, type) {
  const url = page.url();
  return sw.evaluate(async ({ url, type }) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url === url);
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

async function openHost(id, scheme, opt) {
  const page = await ctx.newPage();
  if (opt?.viewport) await page.setViewportSize(opt.viewport);
  await page.emulateMedia({ colorScheme: scheme });
  await page.route(`${hostOrigin(id)}/**`, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(id, { scheme, ...opt }) }));
  await page.goto(hostUrl(id), { waitUntil: 'domcontentloaded' });
  return page;
}

const settle = (page, ms = 450) => page.waitForTimeout(ms);

/** Seed or clear extension settings, as the options page would, before a page is opened. */
const setStored = (values) => sw.evaluate((v) => chrome.storage.local.set(v), values);
const clearStored = (keys) => sw.evaluate((k) => chrome.storage.local.remove(k), keys);

async function hostSuite(id, scheme) {
  const tag = `${id}-${scheme}`;

  // 1. Composer control at rest, then after attaching the guide.
  {
    const page = await openHost(id, scheme, { empty: true });
    try {
      const btn = page.locator('[data-stemlm-inject="true"]').first();
      await btn.waitFor({ state: 'visible', timeout: 15_000 });
      await settle(page, 700);
      const box = await page.locator('.dock').boundingBox();
      const clip = box && { x: Math.max(0, box.x), y: Math.max(0, box.y - 70), width: Math.min(1440, box.width), height: box.height + 70 };
      await shot(page, `${tag}-01-composer-idle`, { clip });
      await btn.hover();
      await settle(page, 250);
      await shot(page, `${tag}-02-composer-hover`, { clip });
      const editor = page.locator('.editor').first();
      await editor.click();
      await page.keyboard.type('A 5.0 kg block slides down a 30 degree incline with friction 0.20. Find its acceleration.');
      await btn.click();
      await settle(page, 2600);
      const box2 = await page.locator('.dock').boundingBox();
      const clip2 = box2 && { x: Math.max(0, box2.x), y: Math.max(0, box2.y - 70), width: Math.min(1440, box2.width), height: box2.height + 70 };
      await shot(page, `${tag}-03-composer-attached`, { clip: clip2 });
    } catch (err) {
      failures.push(`${tag} composer: ${err.message.split('\n')[0]}`);
      await shot(page, `${tag}-01-composer-ERROR`);
    }
    await page.close();
  }

  // 2. Study panel on a captured answer.
  {
    const page = await openHost(id, scheme, {
      question: 'A 5.0 kg block is released from rest on a 30° incline with μk = 0.20. Find its acceleration and its speed after 2.0 m.',
      capsule: INCLINE,
    });
    try {
      await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
      const res = await sendToTab(page, 'stemlm:load-conversation');
      if (!res?.ok) throw new Error(`load-conversation: ${JSON.stringify(res)}`);
      await page.locator('.slm-panel').waitFor({ state: 'visible', timeout: 15_000 });
      await settle(page, 1200);
      await shot(page, `${tag}-10-panel-step1`);
      const panel = page.locator('.slm-panel');
      await shot(page, `${tag}-11-panel-step1-crop`, { locator: panel });
      // Walk the steps with the keyboard, as a student would.
      for (let n = 2; n <= 5; n++) {
        await panel.focus();
        await page.keyboard.press('ArrowRight');
        await settle(page, 700);
        await shot(page, `${tag}-1${n}-panel-step${n}-crop`, { locator: panel });
      }
      const reveal = page.locator('.slm-quickcheck-reveal, [data-slm-reveal]').first();
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await settle(page, 600);
      if (await reveal.count()) {
        await reveal.click();
        await settle(page, 500);
        await shot(page, `${tag}-16-panel-quickcheck-revealed`, { locator: panel });
      }
      const solutionTab = page.locator('#slm-tab-solution');
      if (await solutionTab.count()) {
        await solutionTab.click();
        await settle(page, 900);
        await shot(page, `${tag}-20-panel-solution`);
        await shot(page, `${tag}-21-panel-solution-crop`, { locator: panel });
      }
    } catch (err) {
      failures.push(`${tag} panel: ${err.message.split('\n')[0]}`);
      await shot(page, `${tag}-10-panel-ERROR`);
    }
    await page.close();
  }
}

async function subjectSuite() {
  // One host is enough to audit subject-specific figures.
  for (const [name, capsule] of [['circuit', CIRCUIT], ['dijkstra', DIJKSTRA]]) {
    for (const scheme of SCHEMES) {
      const page = await openHost('claude', scheme, { capsule, question: 'Solve this.' });
      try {
        await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
        await sendToTab(page, 'stemlm:load-conversation');
        const panel = page.locator('.slm-panel');
        await panel.waitFor({ state: 'visible', timeout: 15_000 });
        await settle(page, 1200);
        await shot(page, `subject-${name}-${scheme}-step1`, { locator: panel });
        await panel.focus();
        await page.keyboard.press('ArrowRight');
        await settle(page, 800);
        await shot(page, `subject-${name}-${scheme}-step2`, { locator: panel });
      } catch (err) {
        failures.push(`subject ${name} ${scheme}: ${err.message.split('\n')[0]}`);
        await shot(page, `subject-${name}-${scheme}-ERROR`);
      }
      await page.close();
    }
  }
}

async function emptyPanelSuite() {
  for (const scheme of SCHEMES) {
    const page = await openHost('gemini', scheme, { empty: true });
    try {
      await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
      await sendToTab(page, 'stemlm:open-panel');
      const panel = page.locator('.slm-panel');
      await panel.waitFor({ state: 'visible', timeout: 15_000 });
      await settle(page, 900);
      await shot(page, `panel-empty-${scheme}`);
    } catch (err) {
      failures.push(`empty ${scheme}: ${err.message.split('\n')[0]}`);
    }
    await page.close();
  }
}

async function extensionPages() {
  const pages = [
    ['popup', 'popup.html', { width: 380, height: 600 }],
    ['welcome', 'welcome.html', { width: 1440, height: 900 }],
    ['options', 'options.html', { width: 1100, height: 820 }],
    ['library', 'saved-library.html', { width: 1280, height: 860 }],
  ];
  for (const [name, path, viewport] of pages) {
    if (!want(name)) continue;
    for (const scheme of SCHEMES) {
      const page = await ctx.newPage();
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: scheme });
      try {
        await page.goto(extUrl(path), { waitUntil: 'load' });
        await settle(page, 900);
        await shot(page, `page-${name}-${scheme}`, { fullPage: name !== 'popup' });
      } catch (err) {
        failures.push(`${name} ${scheme}: ${err.message.split('\n')[0]}`);
      }
      await page.close();
    }
  }
}

try {
  for (const id of HOST_IDS) {
    if (!want(id)) continue;
    for (const scheme of SCHEMES) await hostSuite(id, scheme);
  }
  if (want('subject')) await subjectSuite();
  await plainSuites({ openHost, sendToTab, shot, settle, failures, only, schemes: SCHEMES });
  if (want('empty')) await emptyPanelSuite();
  await panelStateSuites({ openHost, sendToTab, shot, settle, setStored, clearStored, failures, want, schemes: SCHEMES });
  await extensionPages();
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}

if (failures.length) {
  console.log('\n[visual] problems:\n - ' + failures.join('\n - '));
  process.exitCode = 1;
} else {
  log('all surfaces captured in', out);
}
