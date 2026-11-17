#!/usr/bin/env node
/**
 * Position check for the composer control.
 *
 * Loads the built extension on the stand-in of every chat host, in light and dark, at several
 * window widths, walks the control through its states and measures where it sits against the
 * host's own attach button. The control has one anchor: beside that button, in its row, centred
 * on it, the same size. So in every state the offset must be the same, to the pixel.
 *
 *   pnpm build && node scripts/visual/control-check.mjs [--ext dir] [--out dir] [--only chatgpt,dark] [--quick] [--viewports 1528x732,760x720]
 *
 * Prints a table, writes control-check.json and one crop per state, and exits 1 when a rule is
 * broken: an offset that differs between states, a control over the draft or another host button,
 * a second control, a control shown where it does not belong.
 */
import { BROWSER, chromium } from './browser.mjs';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_IDS, hostOrigin, hostPage } from './hosts.mjs';
import { composerVariants } from './host-composers.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(flag('out', join(root, '.visual/control')));
const extension = resolve(flag('ext', join(root, '.output/chrome-mv3')));
const only = (flag('only', '') || '').split(',').filter(Boolean);
const quick = args.includes('--quick');
const SCHEMES = ['light', 'dark'];
/** The first is the capture's own window and gets the whole walk; the last two are a split window and a phone-wide one. */
const VIEWPORTS = flag('viewports', quick ? '1528x732' : '1528x732,1280x800,900x700,420x800')
  .split(',').map((v) => v.split('x').map(Number));
/** A new chat on each host. */
const LANDING = { chatgpt: '/', claude: '/new', gemini: '/app', grok: '/' };
const QUESTION = 'A 5.0 kg block is released from rest on a 30 degree incline with friction 0.20. Find its acceleration down the slope and its speed after it has moved 2.0 m.';
const CONTROL = '[data-stemlm-inject="true"]';
const ATTACH = '[data-hc-composer] :is([aria-label="Add files and more"], [data-testid="chat-input-attach"], [aria-label="Upload & tools"], [data-testid="attach-button"])';

mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'stemlm-control-'));
const ctx = await chromium.launchPersistentContext(profile, {
  ...BROWSER,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  viewport: { width: 1528, height: 732 },
  deviceScaleFactor: 2,
});
if (!ctx.serviceWorkers().length) await ctx.waitForEvent('serviceworker', { timeout: 20_000 });
await new Promise((r) => setTimeout(r, 600));
for (const p of ctx.pages()) if (p.url().includes('welcome.html')) await p.close();

const rows = [];
const problems = [];
const round = (n) => Math.round(n * 100) / 100;

async function open(id, scheme, viewport, opt) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: viewport[0], height: viewport[1] });
  await page.emulateMedia({ colorScheme: scheme });
  await page.route(`${hostOrigin(id)}/**`, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(id, { scheme, empty: true, ...opt }) }));
  await page.goto(hostOrigin(id) + LANDING[id], { waitUntil: 'domcontentloaded' });
  return page;
}

const control = (page) => page.locator(CONTROL);
const shown = async (page) => (await control(page).count()) > 0 && (await control(page).first().isVisible());
const waitShown = (page, ms = 8000) => control(page).first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const waitHidden = async (page, ms = 3000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!(await shown(page))) return true;
    await page.waitForTimeout(100);
  }
  return false;
};

/** Where the control sits against the host's attach button, and what it touches. */
async function measure(page) {
  if (!(await shown(page))) return null;
  const box = await control(page).first().boundingBox();
  if (!box) return null;
  const host = await page.evaluate((attachSel) => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const composer = document.querySelector('[data-hc-composer]');
    const attach = document.querySelector(attachSel);
    const editor = composer.querySelector('.editor');
    const others = [...composer.querySelectorAll('button')].filter((b) => b !== attach && b.getBoundingClientRect().width > 0);
    // Compare against the visual box: Gemini's and Grok's custom/outer element can be taller.
    const surface = composer.matches('.box') ? composer : composer.querySelector('.box');
    return { attach: rect(attach), editor: rect(editor), surface: rect(surface), others: others.map(rect), radius: getComputedStyle(attach).borderTopLeftRadius };
  }, ATTACH);
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const c = { x: box.x, y: box.y, w: box.width, h: box.height };
  const a = host.attach;
  return {
    dx: round(c.x - (a.x + a.w)),
    dy: round(c.y + c.h / 2 - (a.y + a.h / 2)),
    dw: round(c.w - a.w),
    dh: round(c.h - a.h),
    overEditor: round(overlap(c, host.editor)),
    overAttach: round(overlap(c, a)),
    overButtons: round(host.others.reduce((sum, o) => sum + overlap(c, o), 0)),
    inside: c.x >= host.surface.x && c.y >= host.surface.y && c.x + c.w <= host.surface.x + host.surface.w + 0.5 && c.y + c.h <= host.surface.y + host.surface.h + 0.5,
    surfaceH: round(host.surface.h),
    attach: a,
    surface: host.surface,
    hostRadius: host.radius,
  };
}

async function snap(page, name) {
  const m = await page.evaluate((attachSel) => {
    const r = document.querySelector(attachSel).getBoundingClientRect();
    const s = document.querySelector('[data-hc-composer]').getBoundingClientRect();
    return { x: s.left, y: r.top, bottom: s.bottom };
  }, ATTACH);
  const size = page.viewportSize();
  const x = Math.max(0, Math.min(m.x - 14, size.width - 440));
  const y = Math.max(0, Math.min(m.y - 78, size.height - 150));
  await page.screenshot({ path: join(out, `${name}.png`), clip: { x, y, width: Math.min(440, size.width - x), height: 150 } });
}

const state = (page) => control(page).first().evaluate((el) =>
  el.getAttribute('data-state') || (el.getAttribute('aria-busy') === 'true' ? 'busy' : el.getAttribute('aria-pressed') === 'true' ? 'attached' : 'idle')).catch(() => 'none');

async function waitState(page, want, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await state(page) === want) return true;
    await page.waitForTimeout(80);
  }
  return false;
}

async function walk(id, variant, scheme, viewport, shots) {
  const tag = `${id}${variant === 'out' ? '-out' : ''}-${scheme}-${viewport[0]}`;
  const record = { tag, id, variant, scheme, viewport: viewport.join('x'), states: {}, notes: [] };
  rows.push(record);
  const fail = (text) => { record.notes.push(text); problems.push(`${tag}: ${text}`); };
  const take = async (page, name) => {
    const m = await measure(page);
    record.states[name] = m ? { dx: m.dx, dy: m.dy, dw: m.dw, dh: m.dh } : null;
    if (!m) return fail(`${name}: the control is not shown`);
    if (m.overEditor > 0) fail(`${name}: covers ${m.overEditor} px2 of the draft`);
    if (m.overAttach > 0) fail(`${name}: covers ${m.overAttach} px2 of the host attach button`);
    if (m.overButtons > 0) fail(`${name}: covers ${m.overButtons} px2 of another host button`);
    if (!m.inside) fail(`${name}: outside the composer`);
    if (shots) await snap(page, `${tag}-${name}`);
    return m;
  };

  // A slow upload, so the control can be measured and photographed while it is at work.
  const page = await open(id, scheme, viewport, { variant, uploadMs: 2500 });
  try {
    if (!(await waitShown(page))) {
      fail('the control never appeared');
      return;
    }
    await page.waitForTimeout(500);
    // The composer must be as tall as it is without stemlm: read it, drop what stemlm added, read again.
    const heights = await page.evaluate(() => {
      const surface = document.querySelector('[data-hc-composer]');
      const withControl = surface.getBoundingClientRect().height;
      for (const el of document.querySelectorAll('*')) {
        for (const a of [...el.attributes]) if (a.name.startsWith('data-stemlm')) el.removeAttribute(a.name);
      }
      return { withControl, without: surface.getBoundingClientRect().height };
    });
    record.composerHeight = heights;
    if (Math.abs(heights.withControl - heights.without) > 0.5) fail(`composer is ${heights.withControl} px tall with the control, ${heights.without} without`);
    await page.waitForTimeout(700);

    const idle = await take(page, 'idle');
    if (idle) record.size = { control: idle.attach.w + idle.dw, host: idle.attach.w, hostRadius: idle.hostRadius };
    if ((await control(page).count()) !== 1) fail(`${await control(page).count()} controls on the page`);

    await control(page).first().hover();
    await page.waitForTimeout(700);
    await take(page, 'hover');
    await page.mouse.move(4, 4);

    // Keyboard: Tab from the host's attach button reaches the control.
    await page.locator(ATTACH).first().focus();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(250);
    record.tabReaches = await control(page).first().evaluate((el) => el.matches(':focus')).catch(() => false);
    if (!record.tabReaches) await control(page).first().focus();
    await page.waitForTimeout(250);
    await take(page, 'focus');

    await page.locator('.editor').first().click();
    await page.keyboard.type(QUESTION);
    await page.waitForTimeout(700);
    await take(page, 'draft');

    await control(page).first().click();
    if (await waitState(page, 'busy', 600)) {
      await page.waitForTimeout(250);
      await take(page, 'busy');
    } else if (variant !== 'out') {
      record.notes.push('busy was too short to photograph');
    }
    if (!(await waitState(page, 'attached', 12_000))) fail(`never reached attached (state ${await state(page)})`);
    await page.waitForTimeout(700);
    await take(page, 'attached');
    record.panelAtAttach = await page.locator('.slm-panel').count();
    if (record.panelAtAttach) fail('the panel opened when the guide was attached');
    record.uploads = await page.evaluate(() => window.__standin.uploads);
    record.loginWalls = await page.evaluate(() => window.__standin.loginWalls);
    if (record.loginWalls) fail('the host showed its login wall');
    if (variant !== 'out' && record.uploads !== 1) fail(`the host received ${record.uploads} files`);
    if (variant === 'out' && record.uploads !== 0) fail('a file was sent to a composer that cannot take one');

    if (variant !== 'out') {
      // The student removes the guide chip: the control returns to idle, in the same place.
      await page.locator('.hc-x').first().click();
      const back = await waitState(page, 'idle', 5000);
      if (!back) fail(`still ${await state(page)} after the guide chip was removed`);
      await page.waitForTimeout(400);
      await take(page, 'chip-removed');
    }

    // The host re-renders its composer and navigates between chats without a reload.
    await page.evaluate(() => window.__standin.rerender());
    await page.waitForTimeout(500);
    await take(page, 'rerendered');
    await page.evaluate(() => window.__standin.send());
    await page.waitForTimeout(900);
    await take(page, 'sent');
    if (await state(page) !== 'idle') fail(`${await state(page)} after the message was sent`);
    if (!shots) return;

    // A later question in the same chat: stemlm is on for it at once, without waiting for a file.
    await page.locator('.editor').first().click();
    await page.keyboard.type('Now find how long it takes to cover those 2.0 m.');
    await page.waitForTimeout(300);
    await control(page).first().click();
    if (!(await waitState(page, 'attached', 8000))) fail(`later question: never reached attached (state ${await state(page)})`);
    await page.waitForTimeout(500);
    await take(page, 'later-question');
    record.uploadsAfterLater = await page.evaluate(() => window.__standin.uploads);

    await page.evaluate(() => window.__standin.navigate('/c/next-chat'));
    await page.waitForTimeout(900);
    await take(page, 'navigated');
    if ((await control(page).count()) !== 1) fail(`${await control(page).count()} controls after navigation`);

    // Other editors and covered composers, once per host and theme.
    await page.evaluate(() => { window.__standin.editMessage(); window.__standin.openCanvas(); });
    await page.waitForTimeout(900);
    await take(page, 'other-editors');
    if ((await control(page).count()) !== 1) fail(`${await control(page).count()} controls beside other editors`);
    await page.evaluate(() => document.querySelector('.hc-canvas')?.remove());

    await page.evaluate(() => { window.__standin.openDialog(); });
    record.hiddenUnderDialog = await waitHidden(page);
    if (!record.hiddenUnderDialog) fail('shown over a host dialog');
    await page.evaluate(() => window.__standin.closeDialog());
    if (!(await waitShown(page, 4000))) fail('did not return when the dialog closed');

    await page.evaluate(() => window.__standin.navigate('/settings', { settings: true }));
    record.hiddenOnSettings = await waitHidden(page);
    if (!record.hiddenOnSettings) fail('shown on the settings page');
    await page.evaluate(() => window.__standin.navigate('/c/back-again'));
    if (!(await waitShown(page, 4000))) fail('did not return after leaving the settings page');
  } catch (err) {
    fail(`walk stopped: ${err.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

/**
 * What a press ends in when the chat does not cooperate, once per host and theme.
 * `refuse`: the chat takes the file and never shows it. The guide goes into the message as text,
 * stemlm is on, and one line beside the control says so.
 * `fickle`: the chat rebuilds its composer while the guide is attaching. The press is abandoned:
 * the control shows its error state, in place, and nothing was written.
 */
async function unhappy(id, scheme, kind) {
  const tag = `${id}-${scheme}-1528`;
  const record = rows.find((r) => r.tag === tag);
  const want = kind === 'refuse' ? 'attached' : 'error';
  const name = kind === 'refuse' ? 'as-text' : 'error';
  const page = await open(id, scheme, [1528, 732], { [kind]: true });
  try {
    if (!(await waitShown(page))) return;
    await page.locator('.editor').first().click();
    await page.keyboard.type('Why does a capacitor block direct current?');
    const started = Date.now();
    await control(page).first().click();
    const reached = await waitState(page, want, 90_000);
    record[`${name}AfterMs`] = Date.now() - started;
    if (!reached) {
      problems.push(`${tag}: ${kind}: expected ${want}, the control is ${await state(page)}`);
      record.states[name] = null;
      return;
    }
    await page.waitForTimeout(400);
    const line = await page.locator('.slm-inject-tip.is-open').first().textContent().catch(() => null);
    record[`${name}Line`] = line;
    if (!line) problems.push(`${tag}: ${kind}: no line beside the control`);
    if (await page.locator('.slm-panel').count()) problems.push(`${tag}: ${kind}: the panel opened`);
    const m = await measure(page);
    record.states[name] = m ? { dx: m.dx, dy: m.dy, dw: m.dw, dh: m.dh } : null;
    await snap(page, `${tag}-${name}`);
  } catch (err) {
    problems.push(`${tag}: ${kind} walk stopped: ${err.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

/** Gemini's first-run screen covers a composer that is already in the page. */
async function consent(scheme) {
  const page = await open('gemini', scheme, [1528, 732], { consent: true });
  try {
    await page.waitForTimeout(3500);
    const under = await shown(page);
    if (under) problems.push(`gemini-${scheme}: shown under the consent screen`);
    await page.locator('[data-hc-close]').first().click();
    const after = await waitShown(page, 5000);
    if (!after) problems.push(`gemini-${scheme}: did not appear once the consent screen closed`);
    rows.push({ tag: `gemini-consent-${scheme}`, hiddenUnderConsent: !under, shownAfterConsent: after });
  } finally {
    await page.close();
  }
}

try {
  for (const id of HOST_IDS) {
    for (const variant of composerVariants(id)) {
      for (const scheme of SCHEMES) {
        if (only.length && !only.every((o) => `${id}-${variant}-${scheme}`.includes(o))) continue;
        for (const [i, viewport] of VIEWPORTS.entries()) await walk(id, variant, scheme, viewport, i === 0);
        if (variant === 'in' && !quick) for (const kind of ['fickle', 'refuse']) await unhappy(id, scheme, kind);
      }
    }
  }
  if (!only.length || only.includes('gemini')) for (const scheme of SCHEMES) await consent(scheme);
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}

/** Largest difference of an offset between the states of one page. */
let worst = 0;
const line = (cells) => cells.map((cell, i) => String(cell).padEnd(i ? 9 : 26)).join('');
console.log(line(['page', 'dx', 'dy', 'size', 'spread', 'states']));
for (const r of rows) {
  if (!r.states) continue;
  const seen = Object.values(r.states).filter(Boolean);
  if (!seen.length) {
    console.log(line([r.tag, '-', '-', '-', '-', 'not shown']));
    continue;
  }
  const spread = (key) => Math.max(...seen.map((s) => s[key])) - Math.min(...seen.map((s) => s[key]));
  r.spread = round(Math.max(spread('dx'), spread('dy'), spread('dw'), spread('dh')));
  worst = Math.max(worst, r.spread);
  if (r.spread > 0) problems.push(`${r.tag}: the offset differs by ${r.spread} px between states`);
  const first = seen[0];
  console.log(line([r.tag, first.dx, first.dy, `${r.size?.control ?? '?'}/${r.size?.host ?? '?'}`, r.spread, `${seen.length}/${Object.keys(r.states).length}`]));
}
writeFileSync(join(out, 'control-check.json'), JSON.stringify({ worst, problems, rows }, null, 2));
console.log(`\nlargest difference between states: ${worst} px`);
if (problems.length) {
  console.log(`\n${problems.length} problems:\n - ${problems.join('\n - ')}`);
  process.exitCode = 1;
}
