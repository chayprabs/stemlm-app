#!/usr/bin/env node
/**
 * Chrome Web Store images, into store/: five 1280x800 screenshots, the 440x280 small promo tile and
 * the 1400x560 marquee. The product in every screenshot is an unedited 2x capture of the built
 * extension on the chat layout doubles (scripts/visual/hosts.mjs), framed with a headline. The
 * tiles use store/art/promo-art.png, line art made with an image model (no product UI in it).
 *
 *   pnpm build && node scripts/visual/store-shots.mjs
 */
import { BROWSER, chromium } from './browser.mjs';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hostOrigin, hostPage, hostUrl } from './hosts.mjs';
import { CIRCUIT, DIJKSTRA, INCLINE } from './capsules.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = join(root, 'store');
const extension = join(root, '.output/chrome-mv3');
const tmp = mkdtempSync(join(tmpdir(), 'stemlm-store-'));
const url = (p) => pathToFileURL(p).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INCLINE_Q = 'A 5.0 kg block is released from rest on a 30° incline with μk = 0.20. Find its acceleration and its speed after 2.0 m.';
const CIRCUIT_Q = 'A 12 V source feeds R1 = 2 kΩ in series with R2 = 4 kΩ. A 4 kΩ load is connected across R2. Find the load voltage.';
const DIJKSTRA_Q = "Run Dijkstra's algorithm from A on the graph with edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3. What is the shortest distance to E?";

/** A folder synced by OneDrive can hold a file it is uploading for a moment: try a few times. */
async function save(name, png) {
  for (let attempt = 1; ; attempt++) {
    try {
      writeFileSync(join(out, name), png);
      console.log('[store] wrote', name);
      return;
    } catch (err) {
      if (attempt === 10) throw err;
      await sleep(1000);
    }
  }
}

// 1. Captures, 2x, into a temporary folder.
const shots = {};
const ctx = await chromium.launchPersistentContext(join(tmp, 'profile'), {
  ...BROWSER,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
try {
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker', { timeout: 20_000 });
  await sleep(800);
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

  async function host(id, scheme, opt, viewport) {
    const page = await ctx.newPage();
    if (viewport) await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: scheme });
    await page.route(`${hostOrigin(id)}/**`, (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(id, { scheme, ...opt }) }));
    await page.goto(hostUrl(id), { waitUntil: 'domcontentloaded' });
    // The double's own caption is for the visual checks.
    await page.addStyleTag({ content: '.dock .foot { visibility: hidden; }' });
    await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
    return page;
  }
  async function panelOn(id, scheme, capsule, question, viewport) {
    const page = await host(id, scheme, { capsule, question }, viewport);
    const res = await sendToTab(page, 'stemlm:load-conversation');
    if (!res?.ok) throw new Error(`load-conversation: ${JSON.stringify(res)}`);
    await page.locator('.slm-panel').waitFor({ state: 'visible', timeout: 15_000 });
    await sleep(1500);
    return page;
  }
  async function capture(name, page) {
    shots[name] = { file: join(tmp, `${name}.png`), width: page.viewportSize().width * 2 };
    await page.screenshot({ path: shots[name].file });
    await page.close();
  }

  await capture('hero', await panelOn('claude', 'light', INCLINE, INCLINE_Q, { width: 1280, height: 800 }));
  await capture('panel', await panelOn('claude', 'light', INCLINE, INCLINE_Q));
  {
    const page = await host('chatgpt', 'light', { empty: true });
    await page.locator('.editor').first().click();
    await page.keyboard.type(INCLINE_Q);
    await page.mouse.move(5, 5);
    await sleep(1200);
    const b = await page.locator('[data-stemlm-inject="true"]').first().boundingBox();
    await capture('composer', page);
    shots.composer.button = { x: (b.x + b.width / 2) * 2, y: (b.y + b.height / 2) * 2, r: b.width };
  }
  await capture('circuit', await panelOn('gemini', 'dark', CIRCUIT, CIRCUIT_Q));
  {
    const page = await panelOn('chatgpt', 'light', INCLINE, INCLINE_Q);
    await page.locator('.slm-panel').focus();
    await page.keyboard.press('ArrowRight');
    await sleep(800);
    await page.locator('.slm-quickcheck-reveal, [data-slm-reveal]').first().click();
    await sleep(600);
    await capture('check', page);
  }
  {
    const page = await panelOn('grok', 'light', DIJKSTRA, DIJKSTRA_Q);
    await page.locator('#slm-tab-solution').click();
    await sleep(1200);
    await capture('solution', page);
  }
} finally {
  await ctx.close().catch(() => {});
}

// 2. The screenshots. One template: light canvas, a 52px headline with one word in brand orange
// (*starred*), a 24px line, and frames that all start at FRAME_TOP and run off the bottom edge.
// Crops are in capture pixels; scale is capture pixels to canvas pixels (default: fill WIDTH).
const LEFT = 64;
const WIDTH = 1152;
const FRAME_TOP = 176;
const GAP = 72;
const BAR = 38;
const btn = shots.composer.button;
const SCREENSHOTS = [
  ['screenshot-1-steps', 'Turn AI answers into *steps* you can study', 'Opens beside ChatGPT, Claude, Gemini and Grok.', [
    { shot: 'hero', crop: { x: 120, y: 0, w: 2440 }, window: 'claude.ai' },
  ]],
  ['screenshot-2-start', 'Press *stemlm*, then send', 'It adds a short guide, so the answer comes back in steps.', [
    { shot: 'composer', crop: { x: 860, y: 868, w: 1680 }, height: 214, window: 'chatgpt.com', callout: { ...btn, label: 'The stemlm button' } },
    { shot: 'panel', crop: { x: 1080, y: 0, w: 1800 }, scale: 0.563 },
  ]],
  ['screenshot-3-diagrams', '*Diagrams* that match each step', 'Free-body diagrams, circuits, graphs and truth tables. Light or dark.', [
    { shot: 'circuit', crop: { x: 1150, y: 350, w: 1720 }, dark: true },
  ]],
  ['screenshot-4-check', '*Check* yourself as you go', 'Each step ends with a question. Reveal the answer when ready.', [
    { shot: 'check', crop: { x: 1110, y: 400, w: 1770 } },
  ]],
  ['screenshot-5-solution', 'The whole solution, *answer first*', 'Every step on one page. Save it or export a PDF.', [
    { shot: 'solution', crop: { x: 1110, y: 0, w: 1770 }, scale: 0.56 },
  ]],
];

function frame(p, top) {
  const s = p.scale ?? WIDTH / p.crop.w;
  const w = Math.round(p.crop.w * s);
  const bar = p.window ? BAR : 0;
  const h = p.height ?? 800 - top + 24;
  const line = p.dark ? '#33332f' : '#dcdcd6';
  let html = `<div class="frame" style="left:${LEFT}px;top:${top}px;width:${w}px;height:${h}px;border-color:${line};
      background:${p.dark ? '#1e1e1e' : '#fff'};border-radius:${top + h > 800 ? '14px 14px 0 0' : '14px'}">
    ${p.window ? `<div class="bar"><span class="dots"><i></i><i></i><i></i></span><span class="url">${p.window}</span></div>` : ''}
    <div class="view" style="height:${h - bar}px"><img src="${url(shots[p.shot].file)}" style="left:${-p.crop.x * s}px;top:${-p.crop.y * s}px;width:${shots[p.shot].width * s}px"></div>
  </div>`;
  if (p.callout) {
    const cx = LEFT + (p.callout.x - p.crop.x) * s;
    const cy = top + bar + (p.callout.y - p.crop.y) * s;
    const r = p.callout.r * s + 9;
    const labelTop = top + h + 14;
    html += `<div class="ring" style="left:${cx - r}px;top:${cy - r}px;width:${2 * r}px;height:${2 * r}px"></div>
      <div class="lead" style="left:${cx - 1}px;top:${cy + r}px;height:${labelTop - cy - r}px"></div>
      <div class="tag" style="left:${cx - 22}px;top:${labelTop}px">${p.callout.label}</div>`;
  }
  return { html, bottom: top + h };
}

const font = (w, file) => `@font-face{font-family:'IBM Plex Sans';font-weight:${w};src:url('${url(join(root, 'assets/fonts/ibm-plex', file))}') format('woff2')}`;
const FONTS = `${font(400, 'IBMPlexSans-Regular-Latin1.woff2')}${font(600, 'IBMPlexSans-SemiBold-Latin1.woff2')}`;

function screenshotPage(title, sub, parts) {
  let top = FRAME_TOP;
  const body = parts.map((p) => {
    const f = frame(p, top);
    top = f.bottom + GAP;
    return f.html;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box}html,body{margin:0}
body{width:1280px;height:800px;overflow:hidden;position:relative;font-family:'IBM Plex Sans',sans-serif;background:#f4f4f2;color:#121212}
h1{position:absolute;left:${LEFT}px;top:44px;margin:0;font-size:52px;line-height:1.05;font-weight:600;letter-spacing:-0.028em;white-space:nowrap}
h1 em{font-style:normal;color:#c2410c}
p{position:absolute;left:${LEFT}px;top:110px;margin:0;font-size:24px;line-height:1.3;color:#55555c;white-space:nowrap}
.frame{position:absolute;overflow:hidden;border:1px solid;box-shadow:0 22px 56px rgba(70,58,40,.14)}
.bar{height:${BAR}px;display:flex;align-items:center;gap:14px;padding:0 16px;background:#f7f7f5;border-bottom:1px solid #e6e6e1}
.dots{display:flex;gap:7px}.dots i{width:10px;height:10px;border-radius:50%;background:#d9d9d4}
.url{flex:0 1 420px;height:24px;border-radius:12px;background:#ecece8;font-size:12.5px;line-height:24px;padding:0 14px;color:#6f6f76}
.view{position:relative;overflow:hidden}.view img{position:absolute}
.ring{position:absolute;border:3px solid #c2410c;border-radius:50%}
.lead{position:absolute;width:2px;background:#c2410c}
.tag{position:absolute;height:36px;line-height:36px;padding:0 16px;border-radius:18px;background:#c2410c;color:#fff;font-size:17px;font-weight:600;white-space:nowrap}
</style></head><body><h1>${title.replace(/\*(.+?)\*/, '<em>$1</em>')}</h1><p>${sub}</p>${body}</body></html>`;
}

// 3. The tiles: Google asks for saturated colour, the whole area filled and almost no text.
// The art's background is #be4208; its incline spans x 830..1470, y 165..780 of 1536x1024.
const ART = url(join(out, 'art/promo-art.png'));
const ICON = url(join(root, 'public/icon/light-128.png'));
function tilePage(w, h, s, artRight, mark) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box}html,body{margin:0}
body{width:${w}px;height:${h}px;position:relative;overflow:hidden;background:#be4208;color:#fbfbfa;font-family:'IBM Plex Sans',sans-serif}
h1{margin:0;font-weight:600;letter-spacing:-0.03em;line-height:1}p{margin:0}</style></head><body>
<img src="${ART}" style="position:absolute;width:${1536 * s}px;left:${artRight - 1470 * s}px;top:${h / 2 - 472 * s}px">${mark}</body></html>`;
}
const TILES = [
  ['promo-tile-440x280', 440, 280, tilePage(440, 280, 0.36, 422, `
    <div style="position:absolute;left:30px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:14px">
      <img src="${ICON}" style="width:64px;height:64px;border-radius:15px;box-shadow:0 6px 18px rgba(80,20,0,.25)">
      <h1 style="font-size:46px">stemlm</h1>
    </div>`)],
  ['marquee-1400x560', 1400, 560, tilePage(1400, 560, 0.75, 1310, `
    <div style="position:absolute;left:96px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:26px">
      <div style="display:flex;align-items:center;gap:20px"><img src="${ICON}" style="width:84px;height:84px;border-radius:19px;box-shadow:0 8px 24px rgba(80,20,0,.25)"><h1 style="font-size:88px">stemlm</h1></div>
      <p style="font-size:30px;line-height:1.3">Turn AI answers into steps<br>you can study.</p>
      <p style="font-size:19px;color:#ffe2d2">For ChatGPT, Claude, Gemini and Grok</p>
    </div>`)],
];

const browser = await chromium.launch(BROWSER);
try {
  const pages = [
    ...SCREENSHOTS.map(([name, title, sub, parts]) => [name, 1280, 800, screenshotPage(title, sub, parts)]),
    ...TILES,
  ];
  for (const [name, w, h, html] of pages) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const file = join(tmp, `${name}.html`);
    writeFileSync(file, html);
    await page.goto(url(file), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await save(`${name}.png`, await page.screenshot());
    await page.close();
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
