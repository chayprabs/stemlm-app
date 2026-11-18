#!/usr/bin/env node
/**
 * Chrome Web Store images, into store/: five 1280x800 screenshots of the built extension on the
 * layout doubles of the chat hosts, and the 440x280 small promo tile from store/promo-tile.html.
 *
 *   pnpm build && node scripts/visual/store-shots.mjs
 */
import { BROWSER, chromium } from './browser.mjs';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hostOrigin, hostPage, hostUrl } from './hosts.mjs';
import { CIRCUIT, INCLINE } from './capsules.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const extension = join(root, '.output/chrome-mv3');
const out = join(root, 'store');
const SIZE = { width: 1280, height: 800 };
const INCLINE_Q = 'A 5.0 kg block is released from rest on a 30° incline with μk = 0.20. Find its acceleration and its speed after 2.0 m.';
const CIRCUIT_Q = 'A 12 V source feeds R1 = 2 kΩ in series with R2 = 4 kΩ. A 4 kΩ load is connected across R2. Find the load voltage.';

const profile = mkdtempSync(join(tmpdir(), 'stemlm-store-'));
const ctx = await chromium.launchPersistentContext(profile, {
  ...BROWSER,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  viewport: SIZE,
  deviceScaleFactor: 1,
});
const failures = [];
const settle = (page, ms) => page.waitForTimeout(ms);

/** A folder synced by OneDrive can hold a file it is uploading for a moment: try a few times. */
async function save(page, name) {
  const png = await page.screenshot();
  for (let attempt = 1; ; attempt++) {
    try {
      writeFileSync(join(out, name), png);
      console.log('[store] wrote', name);
      return;
    } catch (err) {
      if (attempt === 10) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

try {
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker', { timeout: 20_000 });
  await settle(ctx.pages()[0] ?? await ctx.newPage(), 600);
  for (const p of ctx.pages()) if (p.url().includes('welcome.html')) await p.close();
  await sw.evaluate(() => chrome.storage.local.remove('stemlm_first_run_hint'));

  const sendToTab = (page, type) => sw.evaluate(async ({ url, type }) => {
    const tab = (await chrome.tabs.query({})).find((t) => t.url === url);
    for (let i = 0; tab?.id && i < 40; i++) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, { type });
        if (res?.error !== 'content-script-starting') return res;
      } catch { /* not listening yet */ }
      await new Promise((r) => setTimeout(r, 250));
    }
    return { ok: false };
  }, { url: page.url(), type });

  /** A chat double with an answer, its panel open on the first step. */
  async function panelOn(id, scheme, capsule, question) {
    const page = await ctx.newPage();
    await page.emulateMedia({ colorScheme: scheme });
    await page.route(`${hostOrigin(id)}/**`, (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(id, { scheme, capsule, question }) }));
    await page.goto(hostUrl(id), { waitUntil: 'domcontentloaded' });
    // The double's own caption ("Layout double for stemLM visual checks") is for the visual checks.
    await page.addStyleTag({ content: '.dock .foot { visibility: hidden; }' });
    await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
    const res = await sendToTab(page, 'stemlm:load-conversation');
    if (!res?.ok) throw new Error(`load-conversation: ${JSON.stringify(res)}`);
    await page.locator('.slm-panel').waitFor({ state: 'visible', timeout: 15_000 });
    await settle(page, 1500);
    return page;
  }

  const step = async (page, presses) => {
    for (let i = 0; i < presses; i++) {
      await page.locator('.slm-panel').focus();
      await page.keyboard.press('ArrowRight');
      await settle(page, 800);
    }
  };

  const shots = [
    ['screenshot-1-steps', async () => panelOn('claude', 'light', INCLINE, INCLINE_Q)],
    ['screenshot-2-circuit-dark', async () => panelOn('gemini', 'dark', CIRCUIT, CIRCUIT_Q)],
    ['screenshot-3-quick-check', async () => {
      const page = await panelOn('chatgpt', 'light', INCLINE, INCLINE_Q);
      await step(page, 1);
      const reveal = page.locator('.slm-quickcheck-reveal, [data-slm-reveal]').first();
      if (await reveal.count()) { await reveal.click(); await settle(page, 600); }
      return page;
    }],
    ['screenshot-4-solution', async () => {
      const page = await panelOn('grok', 'light', INCLINE, INCLINE_Q);
      await page.locator('#slm-tab-solution').click();
      await settle(page, 1000);
      return page;
    }],
    // Step 4 draws a graph. (Not the welcome page: its chat buttons carry the chat sites' logos.)
    ['screenshot-5-graph-dark', async () => {
      const page = await panelOn('claude', 'dark', INCLINE, INCLINE_Q);
      await step(page, 3);
      // Down far enough that the graph's axis title shows whole.
      await page.mouse.move(900, 500);
      await page.mouse.wheel(0, 120);
      await settle(page, 600);
      return page;
    }],
  ];

  for (const [name, open] of shots) {
    try {
      const page = await open();
      await save(page, `${name}.png`);
      await page.close();
    } catch (err) {
      failures.push(`${name}: ${err.message.split('\n')[0]}`);
    }
  }

  const tile = await ctx.newPage();
  await tile.setViewportSize({ width: 440, height: 280 });
  await tile.goto(pathToFileURL(join(out, 'promo-tile.html')).href, { waitUntil: 'load' });
  await tile.evaluate(() => document.fonts.ready);
  await save(tile, 'promo-tile-440x280.png');
} finally {
  await ctx.close().catch(() => {});
  rmSync(profile, { recursive: true, force: true });
}

if (failures.length) {
  console.error('[store] FAILED:\n' + failures.join('\n'));
  process.exit(1);
}
