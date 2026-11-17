#!/usr/bin/env node
/**
 * Behaviour check for reading an answer in the study panel, in a real browser.
 *
 * The panel lives in a shadow root on someone else's page, and several things only go wrong
 * there: a text selection reads as empty from the document, keys reach the wrong scroller, the
 * clipboard gets KaTeX's layout spans. The unit tests run in happy-dom, which has none of that,
 * so each stage here loads the built extension on a stand-in chat page, does what a student does
 * with the mouse and keyboard, and checks the result.
 *
 *   pnpm build && node scripts/visual/reading-check.mjs [--ext dir] [--out dir] [--only selection,dark]
 *
 * Writes a screenshot per stage and scheme and reading-check.json, and exits 1 when a rule is broken.
 */
import { BROWSER, chromium } from './browser.mjs';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostOrigin, hostPage, hostUrl } from './hosts.mjs';
import { INCLINE } from './capsules.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(flag('out', join(root, '.visual/reading')));
const extension = resolve(flag('ext', join(root, '.output/chrome-mv3')));
const only = (flag('only', '') || '').split(',').filter(Boolean);
const SCHEMES = ['light', 'dark'].filter((s) => !only.some((o) => ['light', 'dark'].includes(o)) || only.includes(s));
const HOST = 'claude';
const WINDOW = { width: 1440, height: 900 };
const QUESTION = 'A 5.0 kg block is released from rest on a 30° incline with μk = 0.20. Find its acceleration and its speed after 2.0 m.';

mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'stemlm-reading-'));
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
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: hostOrigin(HOST) });

const problems = [];
const report = {};

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

const panel = (page) => page.locator('.slm-panel');

/** A stand-in chat page with one answer on it, and the panel open on that answer. */
async function openAnswer(scheme, opt = {}, viewport = WINDOW) {
  const page = await ctx.newPage();
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme: scheme });
  page.on('pageerror', (err) => problems.push(`${scheme}: page error: ${err.message.split('\n')[0]}`));
  await page.route(`${hostOrigin(HOST)}/**`, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(HOST, { scheme, question: QUESTION, capsule: INCLINE, ...opt }) }));
  await page.goto(hostUrl(HOST), { waitUntil: 'domcontentloaded' });
  await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
  await page.waitForTimeout(600);
  const res = await sendToTab(page, 'stemlm:load-conversation');
  if (!res?.ok) throw new Error(`load-conversation: ${JSON.stringify(res)}`);
  await panel(page).waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(900);
  return page;
}

const shot = (page, name) => panel(page).screenshot({ path: join(out, `${name}.png`) });
const kicker = (page) => page.locator('.slm-card-kicker').first().innerText();
const editorText = (page) => page.evaluate(() => {
  const editor = document.querySelector('[data-hc-composer] .editor');
  return editor ? (editor.tagName === 'TEXTAREA' ? editor.value : editor.innerText) : '';
});

/**
 * Selecting text in the panel offers "Ask in chat": by dragging (either way), by double click and
 * by triple click. The offer goes when the selection does, quotes what was selected, and while
 * text is selected the arrow keys do not turn the page.
 */
async function selection(scheme) {
  const tag = `selection-${scheme}`;
  const fail = (text) => problems.push(`${tag}: ${text}`);
  const page = await openAnswer(scheme);
  const popover = page.locator('.slm-selpop');
  const offered = async (how) => {
    await page.waitForTimeout(350);
    const shown = await popover.isVisible();
    if (!shown) fail(`${how}: no "Ask in chat" offer`);
    return shown;
  };
  const cleared = async () => {
    await page.locator('.slm-card-title').first().click();
    await page.waitForTimeout(350);
    if (await popover.isVisible()) fail('the offer stayed after the selection was cleared');
  };
  try {
    const para = page.locator('.slm-card-body p').first();
    const box = await para.boundingBox();
    const y = box.y + 12;

    await page.mouse.move(box.x + 4, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 260, y, { steps: 10 });
    await page.mouse.up();
    await offered('drag');
    await shot(page, `${tag}-drag`);

    // While text is selected the arrows are the selection's.
    const before = await kicker(page);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    if ((await kicker(page)) !== before) fail('ArrowRight turned the page while text was selected');
    await cleared();

    await page.mouse.move(box.x + 260, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 4, y, { steps: 10 });
    await page.mouse.up();
    await offered('backward drag');
    await cleared();

    await page.mouse.dblclick(box.x + 20, y);
    await offered('double click');
    await cleared();

    const takeaway = page.locator('.slm-takeaway p').first();
    const sentence = (await takeaway.innerText()).trim();
    await takeaway.click({ clickCount: 3 });
    if (await offered('triple click')) {
      await shot(page, `${tag}-triple`);
      await popover.locator('button').click();
      await page.waitForTimeout(900);
      const sent = await editorText(page);
      const quoted = sentence.split(/\s+/).slice(0, 4).join(' ');
      if (!sent.includes(quoted)) fail(`"Ask in chat" did not quote the selection ("${quoted}") into the chat box: ${JSON.stringify(sent.slice(0, 200))}`);
      report[tag] = { quoted, chatBoxChars: sent.length };
    }
  } catch (err) {
    fail(`stopped: ${err.message.split('\n')[0]}`);
    await page.screenshot({ path: join(out, `${tag}-ERROR.png`) });
  } finally {
    await page.close();
  }
}

/** An answer long and wide enough to scroll both ways: a long identity, an eight-column table, many paragraphs. */
const LONG = String.raw`@meta
version: 2
subject: Math
topic: Newton iteration table
question: Use Newton's method on f(x) = x^3 - 2x - 5 starting from x = 2 and tabulate the iterations.
qid: q1
archetype: numeric
mode: full
@endmeta
@step id=s1
title: Write the iteration and one long identity
@formula id=e1
$$\int_{0}^{\infty} \frac{x^{3}}{e^{x}-1}\,dx = \sum_{n=1}^{\infty}\int_0^\infty x^3 e^{-nx}\,dx = \sum_{n=1}^{\infty}\frac{3!}{n^4} = 6\,\zeta(4) = 6\cdot\frac{\pi^4}{90} = \frac{\pi^4}{15} \approx 6.493939402266829149096022179247$$
@endformula
@body
The update is $x_{n+1} = x_n - \dfrac{f(x_n)}{f'(x_n)}$.

| n | x_n | f(x_n) | f'(x_n) | x_{n+1} | absolute error | error ratio | remark on convergence |
|---|---|---|---|---|---|---|---|
| 0 | 2.000000000 | -1.000000000 | 10.000000000 | 2.100000000 | 5.4485e-03 | n/a | first step overshoots |
| 1 | 2.100000000 | 0.061000000 | 11.230000000 | 2.094568121 | 1.6606e-05 | 3.05e-03 | quadratic regime begins |
| 2 | 2.094568121 | 0.000185723 | 11.161646919 | 2.094551482 | 1.5e-10 | 9.03e-06 | digits double each step |

${Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1}: the reading column scrolls, so the keys that scroll can be measured.`).join('\n\n')}
@endbody
@endstep
@step id=s2
title: Read the root from the table
@body
The iterates settle at $x \approx 2.0945515$.
@endbody
@endstep
@solution
The root is $x \approx 2.0945515$.
@endsolution
@end`;

const readTop = (page, selector = '.slm-read') => page.evaluate((sel) => {
  const el = document.querySelector('stemlm-root').shadowRoot.querySelector(sel);
  return el ? Math.round(el.scrollTop) : null;
}, selector);
const hostTop = (page) => page.evaluate(() => Math.round(document.querySelector('.scroll').scrollTop));
const focusedIn = (page) => page.evaluate(() => {
  const active = document.querySelector('stemlm-root').shadowRoot.activeElement;
  return active ? String(active.className).split(' ')[0] : null;
});

/**
 * The keys that scroll a page scroll the reading area: when the panel has just been opened, after
 * a click in the text, and in the Solution view. They never scroll the chat behind it, and the
 * reading area shows a ring only when it was reached with Tab.
 */
async function keys(scheme) {
  const tag = `keys-${scheme}`;
  const fail = (text) => problems.push(`${tag}: ${text}`);
  const page = await openAnswer(scheme, { capsule: LONG, question: 'Newton table' });
  const record = (report[tag] = {});
  try {
    const before = await hostTop(page);
    record.focusOnOpen = await focusedIn(page);
    if (record.focusOnOpen !== 'slm-read') fail(`the opened panel put focus on "${record.focusOnOpen}", not the reading area`);
    const press = async (key, where, selector, from = 0) => {
      await page.evaluate(({ selector, from }) => { document.querySelector('stemlm-root').shadowRoot.querySelector(selector).scrollTop = from; }, { selector, from });
      await page.keyboard.press(key);
      await page.waitForTimeout(450);
      const to = await readTop(page, selector);
      record[`${where} ${key}`] = `${from} -> ${to}`;
      return { from, to };
    };
    for (const key of ['PageDown', 'Space', 'ArrowDown']) {
      const { from, to } = await press(key, 'open', '.slm-read');
      if (!(to > from)) fail(`${key} did not scroll the reading area (${from} -> ${to})`);
    }
    const end = await press('End', 'open', '.slm-read');
    if (!(end.to > 1000)) fail(`End did not go to the end of the step (${end.to})`);
    const home = await press('Home', 'open', '.slm-read', end.to);
    if (home.to !== 0) fail(`Home left the reading area at ${home.to}`);
    // Left and Right still turn the page from here.
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    if (!(await kicker(page)).toLowerCase().includes('step 2')) fail('ArrowRight did not turn the page with focus in the reading area');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);

    // After a click in the text, as a mouse user arrives.
    await page.locator('.slm-card-title').first().click();
    const clicked = await press('PageDown', 'clicked', '.slm-read');
    if (!(clicked.to > clicked.from)) fail('PageDown did not scroll after a click in the text');

    // Reached with Tab it shows where focus is, on its top edge: the page is never boxed.
    await page.locator('#slm-tab-steps').focus();
    for (let i = 0; i < 40 && (await focusedIn(page)) !== 'slm-read'; i++) await page.keyboard.press('Tab');
    record.focusMark = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('stemlm-root').shadowRoot.querySelector('.slm-read'));
      return { outline: style.outlineStyle, edge: style.boxShadow };
    });
    if (record.focusMark.outline !== 'none') fail('the reading area is boxed by an outline while it holds focus');
    if (record.focusMark.edge === 'none') fail('the reading area shows nothing when reached with Tab');
    await shot(page, `${tag}-tabbed`);

    // The Solution view has its own scroller.
    await page.locator('#slm-tab-solution').click();
    await page.waitForTimeout(500);
    await page.locator('.slm-solution-step-title').first().click();
    const solution = await press('PageDown', 'solution', '.slm-solution-wrap');
    await shot(page, `${tag}-solution`);
    if (!(solution.to > solution.from)) fail('PageDown did not scroll the Solution view');

    if ((await hostTop(page)) !== before) fail('a key pressed in the panel scrolled the chat');
  } catch (err) {
    fail(`stopped: ${err.message.split('\n')[0]}`);
    await page.screenshot({ path: join(out, `${tag}-ERROR.png`) });
  } finally {
    await page.close();
  }
}

const clipboard = async (page) => {
  await page.bringToFront();
  return page.evaluate(() => navigator.clipboard.readText().catch((err) => `ERR ${err.message}`));
};

/**
 * Maths leaves the panel as LaTeX: the control on a formula block copies its source, and Ctrl+C
 * on a selection gives each formula between dollars instead of KaTeX's glyphs one per line.
 */
async function copy(scheme) {
  const tag = `copy-${scheme}`;
  const fail = (text) => problems.push(`${tag}: ${text}`);
  const page = await openAnswer(scheme);
  const record = (report[tag] = {});
  try {
    // Step 2 of the incline answer has a key relation and a body with display and inline maths.
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    const button = page.locator('.slm-formula-copy').first();
    await button.hover();
    await shot(page, `${tag}-formula`);
    await button.click();
    await page.waitForTimeout(250);
    record.button = await clipboard(page);
    if (record.button !== String.raw`\sum F_y = N - mg\cos\theta = 0`) fail(`"Copy LaTeX" put ${JSON.stringify(record.button)} on the clipboard`);
    if ((await button.innerText()).trim() !== 'Copied') fail('the control did not say "Copied"');
    await shot(page, `${tag}-copied`);

    // A whole paragraph of the working, by triple click.
    await page.locator('.slm-card-body p').first().click({ clickCount: 3 });
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(250);
    record.paragraph = await clipboard(page);
    if (record.paragraph.trim() !== 'The block does not leave the surface, so the perpendicular forces cancel.') fail(`a triple-clicked paragraph copied ${JSON.stringify(record.paragraph)}`);
    // The display equation below it, dragged across: cut through the middle, it is still copied whole.
    const equation = await page.locator('.slm-card-body .katex-display').first().boundingBox();
    await page.mouse.move(equation.x + equation.width / 2 - 60, equation.y + equation.height / 2);
    await page.mouse.down();
    await page.mouse.move(equation.x + equation.width / 2 + 60, equation.y + equation.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(250);
    record.equation = await clipboard(page);
    if (record.equation !== String.raw`$$N = mg\cos\theta = (5.0)(9.81)\cos 30^\circ = 42.5\ \text{N}$$`) fail(`a selection inside the display equation copied ${JSON.stringify(record.equation)}`);
    // The body and its equation together.
    await page.evaluate(() => {
      const body = document.querySelector('stemlm-root').shadowRoot.querySelector('.slm-card-body .slm-prose');
      const range = document.createRange();
      range.selectNodeContents(body);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    });
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(250);
    record.body = await clipboard(page);
    if (!record.body.includes('$$N = mg') || !record.body.startsWith('The block does not leave the surface')) fail(`the working copied as ${JSON.stringify(record.body)}`);
    if (record.body.split('\n').some((line) => line.trim().length === 1)) fail(`the working copied with a symbol on a line of its own: ${JSON.stringify(record.body)}`);
  } catch (err) {
    fail(`stopped: ${err.message.split('\n')[0]}`);
    await page.screenshot({ path: join(out, `${tag}-ERROR.png`) });
  } finally {
    await page.close();
  }
}

/** The incline answer with a figure the compiler must refuse and a check the model reported as failed. */
const DOUBTFUL = INCLINE
  .replace('fn: sqrt(2*3.2*x)\ndomain: 0 3', 'fn: sqrt(2*3.2*x)\ndomain: 0 3\nmystery_key: 7')
  .replace('status: pass\nnotes: Work-energy gives', 'status: fail\ncorrection: The speed is 3.6 m/s, not 3.2 m/s.\nnotes: Work-energy gives');

/**
 * What stemLM did and did not check is said once under every answer; what the model said about
 * its own answer is named as the model's, a failed check included; a figure that could not be
 * drawn leaves one line where it was.
 */
async function trust(scheme) {
  const tag = `trust-${scheme}`;
  const fail = (text) => problems.push(`${tag}: ${text}`);
  const page = await openAnswer(scheme, { capsule: DOUBTFUL });
  const record = (report[tag] = {});
  const text = (selector) => page.locator(selector).allInnerTexts();
  try {
    record.firstStep = await text('.slm-card .slm-origin-note');
    if (record.firstStep.length) fail('the check line shows before the answer');
    await page.locator('.slm-step-rail-btn').nth(3).click();
    await page.waitForTimeout(900);
    record.omitted = await text('.slm-figure-omitted');
    if (record.omitted.length !== 1) fail(`step 4's refused figure left ${record.omitted.length} lines`);
    if (await page.locator('.slm-card .slm-step-diagram').count()) fail('the refused figure was drawn');
    await shot(page, `${tag}-figure-left-out`);
    await page.locator('.slm-step-rail-btn').nth(4).click();
    await page.waitForTimeout(900);
    record.labels = await text('.slm-answer-note-label');
    record.failed = await text('.slm-answer-note-failed');
    record.under = await text('.slm-card .slm-origin-note');
    if (record.labels.join('|').toLowerCase() !== "the model's own check|the model assumed") fail(`the notes are labelled ${JSON.stringify(record.labels)}`);
    if (record.failed.length !== 1) fail('the failed check is not said');
    if (record.under.length !== 1 || !/does not verify/.test(record.under[0])) fail(`under the answer: ${JSON.stringify(record.under)}`);
    await page.evaluate(() => { const read = document.querySelector('stemlm-root').shadowRoot.querySelector('.slm-read'); read.scrollTop = read.scrollHeight; });
    await page.waitForTimeout(300);
    await shot(page, `${tag}-last-step`);
    await page.locator('#slm-tab-solution').click();
    await page.waitForTimeout(600);
    record.solution = await text('.slm-solution .slm-origin-note');
    if (record.solution.length !== 1) fail(`the Solution view closes with ${record.solution.length} check lines`);
    if (await page.locator('.slm-header .slm-origin-note').count()) fail('a stemLM answer carries an origin note under its question');
  } catch (err) {
    fail(`stopped: ${err.message.split('\n')[0]}`);
    await page.screenshot({ path: join(out, `${tag}-ERROR.png`) });
  } finally {
    await page.close();
  }
}

/**
 * The manual way in: an empty panel takes a pasted answer, in the stemLM format or as plain
 * prose, and studies it like any other. Text that holds no answer is refused under the field.
 */
async function paste(scheme) {
  const tag = `paste-${scheme}`;
  const fail = (text) => problems.push(`${tag}: ${text}`);
  const page = await ctx.newPage();
  const record = (report[tag] = {});
  try {
    await page.setViewportSize(WINDOW);
    await page.emulateMedia({ colorScheme: scheme });
    await page.route(`${hostOrigin(HOST)}/**`, (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(HOST, { scheme, empty: true }) }));
    await page.goto(hostUrl(HOST), { waitUntil: 'domcontentloaded' });
    await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
    await page.waitForTimeout(600);
    const res = await sendToTab(page, 'stemlm:open-panel');
    if (!res?.ok) throw new Error(`open-panel: ${JSON.stringify(res)}`);
    await panel(page).waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(900);
    await shot(page, `${tag}-empty`);

    await page.locator('.slm-paste-open').click();
    const field = page.locator('.slm-paste-field');
    await field.waitFor({ state: 'visible' });
    record.focused = await focusedIn(page);
    if (record.focused !== 'slm-paste-field') fail(`the opened form put focus on "${record.focused}"`);
    await field.fill('Thanks, that helps.');
    await page.locator('.slm-paste button[type="submit"]').click();
    await page.waitForTimeout(300);
    if (!(await page.locator('.slm-paste-error').isVisible())) fail('text with no answer in it was not refused under the field');
    await shot(page, `${tag}-refused`);

    await field.fill(INCLINE);
    await shot(page, `${tag}-form`);
    await page.locator('.slm-paste button[type="submit"]').click();
    await page.locator('.slm-card').first().waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(700);
    record.pasted = { steps: await page.locator('.slm-step-rail-btn').count(), title: await page.locator('.slm-card-title').first().innerText() };
    if (record.pasted.steps !== 5) fail(`the pasted answer opened with ${record.pasted.steps} steps`);
    if (await page.locator('.slm-header .slm-origin-note').count()) fail('a pasted stemLM answer is labelled as structured from the chat');
    await shot(page, `${tag}-studied`);
  } catch (err) {
    fail(`stopped: ${err.message.split('\n')[0]}`);
    await page.screenshot({ path: join(out, `${tag}-ERROR.png`) });
  } finally {
    await page.close();
  }
}

const STAGES = { selection, keys, copy, trust, paste };

try {
  for (const [name, run] of Object.entries(STAGES)) {
    if (only.some((o) => o in STAGES) && !only.includes(name)) continue;
    for (const scheme of SCHEMES) {
      await run(scheme);
      console.log('[reading]', `${name}-${scheme}`, JSON.stringify(report[`${name}-${scheme}`] ?? {}));
    }
  }
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}

writeFileSync(join(out, 'reading-check.json'), JSON.stringify({ problems, report }, null, 2));
if (problems.length) {
  console.log('\n[reading] problems:\n - ' + problems.join('\n - '));
  process.exitCode = 1;
} else {
  console.log('[reading] every rule holds; images in', out);
}
