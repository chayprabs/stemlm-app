/**
 * Study-panel states the host suites do not reach: a narrow panel, a small window, many steps,
 * several questions, status lines, loading, the figure lightbox, awkward figure shapes, a long
 * question, a follow-up answer and both ends of the reading-size scale.
 *
 * Driven by shoot.mjs (`--only state` for all of them, or one name such as `--only state-narrow`).
 * Every file is `state-<suite>-<scheme>-<what>.png`.
 */
import { CIRCUIT, INCLINE } from './capsules.mjs';
import { HOST_IDS } from './hosts.mjs';
import {
  FIGURE_SHAPES,
  FOLLOWUP_ANSWER,
  FOURTEEN_STEPS,
  LONG_QUESTION,
  UNREADABLE_ANSWER,
  asQuestion,
} from './panel-fixtures.mjs';

const HOST = 'claude';
const INCLINE_QUESTION = 'A 5.0 kg block is released from rest on a 30° incline with μk = 0.20. Find its acceleration and its speed after 2.0 m.';
/** 25% of a 1360px window: the narrowest panel the split allows, about 340px. */
const NARROW = { viewport: { width: 1360, height: 900 }, splitRatio: 0.25 };
const SMALL_WINDOW = { width: 900, height: 760 };
const SETTING_KEYS = ['stemlm_settings', 'stemlm_setting_splitRatio', 'stemlm_split_ratio_user_set', 'stemlm_setting_contentScale'];

/** @param {object} h harness: openHost, sendToTab, shot, settle, setStored, clearStored, failures, want, schemes */
export async function panelStateSuites(h) {
  const suites = {
    narrow: narrowSuite,
    window: smallWindowSuite,
    manysteps: manyStepsSuite,
    sessions: sessionsSuite,
    banner: bannerSuite,
    loading: loadingSuite,
    lightbox: lightboxSuite,
    figures: figureShapesSuite,
    longq: longQuestionSuite,
    followup: followupSuite,
    scale: contentScaleSuite,
    short: shortPanelSuite,
    sitetheme: siteThemeSuite,
    firsthint: firstHintSuite,
  };
  for (const [name, run] of Object.entries(suites)) {
    if (!h.want(`state-${name}`)) continue;
    for (const scheme of h.schemes) {
      const pages = [];
      try {
        await run({ ...h, track: (page) => (pages.push(page), page) }, scheme, `state-${name}-${scheme}`);
      } catch (err) {
        h.failures.push(`state ${name} ${scheme}: ${err.message.split('\n')[0]}`);
        for (const page of pages) if (!page.isClosed()) await h.shot(page, `state-${name}-${scheme}-ERROR`);
      } finally {
        for (const page of pages) if (!page.isClosed()) await page.close();
        await h.clearStored(SETTING_KEYS);
      }
    }
  }
}

async function openAnswer(h, scheme, opt = {}) {
  const page = h.track(await h.openHost(HOST, scheme, {
    question: opt.question ?? INCLINE_QUESTION,
    capsule: opt.capsule ?? INCLINE,
    viewport: opt.viewport,
  }));
  await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
  if (opt.beforeLoad) await opt.beforeLoad(page);
  const res = await h.sendToTab(page, 'stemlm:load-conversation');
  if (!res?.ok) throw new Error(`load-conversation: ${JSON.stringify(res)}`);
  const panel = page.locator('.slm-panel');
  await panel.waitFor({ state: 'visible', timeout: 20_000 });
  await h.settle(page, 1200);
  return { page, panel };
}

async function step(h, page, panel, key = 'ArrowRight', times = 1) {
  for (let i = 0; i < times; i++) {
    await panel.focus();
    await page.keyboard.press(key);
    await h.settle(page, 420);
  }
  await h.settle(page, 350);
}

/**
 * Run an expression in the extension's own world of the page (its content script's globals),
 * which page.evaluate cannot reach.
 */
async function inExtensionWorld(page, expression) {
  const cdp = await page.context().newCDPSession(page);
  const contexts = [];
  cdp.on('Runtime.executionContextCreated', (event) => contexts.push(event.context));
  await cdp.send('Runtime.enable');
  const world = contexts.find((c) => c.auxData?.type === 'isolated' && String(c.origin).startsWith('chrome-extension://'));
  if (!world) throw new Error('the extension world was not found on the page');
  await cdp.send('Runtime.evaluate', { expression, contextId: world.id });
  await cdp.detach();
}

/** The first mark of the strip must sit on the reading column's left edge. */
async function expectStripOnColumn(page) {
  const mark = await page.locator('.slm-step-rail-mark').first().boundingBox();
  const column = await page.locator('.slm-card').boundingBox();
  if (!mark || !column) throw new Error('strip or reading column not found');
  const off = Math.abs(mark.x - column.x);
  if (off > 1) throw new Error(`the strip is ${off.toFixed(1)}px off the reading column`);
}

/** Add a question and its answer to the layout double's thread, as the host would. */
async function appendTurn(page, question, capsule) {
  await page.evaluate(({ question, capsule }) => {
    const thread = document.getElementById('thread');
    const user = document.createElement('div');
    user.className = 'turn user';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = question;
    user.append(bubble);
    const assistant = document.createElement('div');
    assistant.className = 'turn assistant';
    assistant.setAttribute('data-testid', 'assistant-message');
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'language-stemlm';
    code.textContent = capsule;
    pre.append(code);
    assistant.append(pre);
    thread.append(user, assistant);
  }, { question, capsule });
}

async function narrowSuite(h, scheme, tag) {
  await h.setStored({ stemlm_setting_splitRatio: NARROW.splitRatio, stemlm_split_ratio_user_set: true });
  const { page, panel } = await openAnswer(h, scheme, { viewport: NARROW.viewport });
  await expectStripOnColumn(page);
  await h.shot(page, `${tag}-page`);
  await h.shot(page, `${tag}-step1`, { locator: panel });
  await step(h, page, panel, 'ArrowRight', 2);
  await h.shot(page, `${tag}-step3`, { locator: panel });
  await page.locator('.slm-quickcheck-reveal').first().click();
  await h.settle(page, 500);
  await page.locator('.slm-read').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await h.settle(page, 300);
  await h.shot(page, `${tag}-step3-end`, { locator: panel });
  await step(h, page, panel, 'ArrowRight', 2);
  await h.shot(page, `${tag}-step5`, { locator: panel });
  await page.locator('#slm-tab-solution').click();
  await h.settle(page, 900);
  await h.shot(page, `${tag}-solution`, { locator: panel });
}

async function smallWindowSuite(h, scheme, tag) {
  const { page, panel } = await openAnswer(h, scheme, { viewport: SMALL_WINDOW });
  await expectStripOnColumn(page);
  await h.shot(page, `${tag}-page`);
  await step(h, page, panel, 'ArrowRight', 2);
  await h.shot(page, `${tag}-step3`, { locator: panel });
  await page.locator('#slm-tab-solution').click();
  await h.settle(page, 900);
  await h.shot(page, `${tag}-solution`, { locator: panel });
}

async function manyStepsSuite(h, scheme, tag) {
  {
    const { page, panel } = await openAnswer(h, scheme, { capsule: FOURTEEN_STEPS, question: 'Derive the quadratic formula.' });
    await expectStripOnColumn(page);
    await h.shot(page, `${tag}-wide-step1`, { locator: panel });
    await step(h, page, panel, 'ArrowRight', 13);
    await h.shot(page, `${tag}-wide-step14`, { locator: panel });
    await page.close();
  }
  await h.setStored({ stemlm_setting_splitRatio: NARROW.splitRatio, stemlm_split_ratio_user_set: true });
  const { page, panel } = await openAnswer(h, scheme, {
    capsule: FOURTEEN_STEPS,
    question: 'Derive the quadratic formula.',
    viewport: NARROW.viewport,
  });
  await h.shot(page, `${tag}-narrow-step1`, { locator: panel });
  await step(h, page, panel, 'ArrowRight', 7);
  await h.shot(page, `${tag}-narrow-step8`, { locator: panel });
  await step(h, page, panel, 'ArrowRight', 6);
  await h.shot(page, `${tag}-narrow-step14`, { locator: panel });
  // The strip follows the reader back as well as forward.
  await step(h, page, panel, 'ArrowLeft', 11);
  await h.shot(page, `${tag}-narrow-step3-back`, { locator: panel });
  const inView = await page.locator('.slm-step-rail-item.is-active .slm-step-rail-mark').evaluate((mark) => {
    const rail = mark.closest('.slm-step-rail').getBoundingClientRect();
    const box = mark.getBoundingClientRect();
    return box.left >= rail.left && box.right <= rail.right;
  });
  if (!inView) throw new Error('the active mark scrolled out of the strip');
}

async function sessionsSuite(h, scheme, tag) {
  const second = (page) => appendTurn(page, 'A 12 V source feeds a loaded divider. Find the load voltage.', asQuestion(CIRCUIT, 'q2'));
  const third = (page) => appendTurn(page, 'Derive the quadratic formula.', asQuestion(FOURTEEN_STEPS, 'q3'));
  const { page, panel } = await openAnswer(h, scheme, { beforeLoad: async (p) => { await second(p); await third(p); } });
  await h.shot(page, `${tag}-three`, { locator: panel });
  await page.locator('.slm-session-chip').first().hover();
  await h.settle(page, 300);
  await h.shot(page, `${tag}-chip-hover`, { locator: panel });
  await page.locator('.slm-session-chip.is-active').hover();
  await h.settle(page, 300);
  await h.shot(page, `${tag}-active-chip-hover`, { locator: panel });
  // Removing a question says so and can be undone from the status line.
  await page.locator('.slm-session-chip').nth(1).hover();
  await page.locator('.slm-session-chip').nth(1).locator('.slm-session-pill-remove').click();
  await page.mouse.move(700, 500);
  await h.settle(page, 500);
  await h.shot(page, `${tag}-removed-notice`, { locator: panel });
  // Reached with Tab, so the focus ring is on camera.
  await page.locator('.slm-banner-undo').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await h.settle(page, 200);
  await h.shot(page, `${tag}-removed-undo-focus`, { locator: panel });
  await page.keyboard.press('Enter');
  await h.settle(page, 600);
  await h.shot(page, `${tag}-removed-undone`, { locator: panel });
  if (await page.locator('.slm-session-chip').count() !== 3) throw new Error('Undo did not bring the removed question back');
  await page.close();

  await h.setStored({ stemlm_setting_splitRatio: NARROW.splitRatio, stemlm_split_ratio_user_set: true });
  const narrow = await openAnswer(h, scheme, {
    viewport: NARROW.viewport,
    beforeLoad: async (p) => { await second(p); await third(p); },
  });
  await h.shot(narrow.page, `${tag}-narrow`, { locator: narrow.panel });
}

async function bannerSuite(h, scheme, tag) {
  // An answer the parser refuses: an error with a technical detail behind "Details".
  {
    const { page, panel } = await openAnswer(h, scheme, { capsule: UNREADABLE_ANSWER });
    await h.shot(page, `${tag}-error-empty`, { locator: panel });
    const details = page.locator('.slm-banner-details summary');
    if (await details.count()) {
      await details.click();
      await h.settle(page, 250);
      await h.shot(page, `${tag}-error-details`, { locator: panel });
    }
    await page.close();
  }
  // An error over a loaded answer: the clipboard refuses, so Copy has to say so.
  {
    const { page, panel } = await openAnswer(h, scheme);
    await inExtensionWorld(
      page,
      `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } })`,
    );
    await page.locator('.slm-followup-action').first().click();
    await h.settle(page, 500);
    await page.locator('.slm-read').evaluate((el) => el.scrollTo({ top: 0 }));
    await h.settle(page, 200);
    await h.shot(page, `${tag}-error-over-answer`, { locator: panel });
    // The status line can be put away, and the keyboard goes back to the panel.
    await page.locator('.slm-banner-dismiss').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await h.settle(page, 200);
    await h.shot(page, `${tag}-error-dismiss-focus`, { locator: panel });
    await page.keyboard.press('Enter');
    await h.settle(page, 400);
    if (await page.locator('.slm-banner').count()) throw new Error('the status line did not go away when dismissed');
    await page.keyboard.press('ArrowRight');
    await h.settle(page, 600);
    await h.shot(page, `${tag}-error-dismissed-step2`, { locator: panel });
    await page.close();
  }
  // A status line that is not an error: the guide attached to an empty chat box.
  {
    const page = h.track(await h.openHost(HOST, scheme, { empty: true }));
    const btn = page.locator('[data-stemlm-inject="true"]').first();
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    await h.settle(page, 600);
    await btn.click();
    await h.settle(page, 2600);
    await h.sendToTab(page, 'stemlm:open-panel');
    const panel = page.locator('.slm-panel');
    await panel.waitFor({ state: 'visible', timeout: 15_000 });
    await h.settle(page, 900);
    await h.shot(page, `${tag}-info`, { locator: panel });
  }
}

async function loadingSuite(h, scheme, tag) {
  const page = h.track(await h.openHost(HOST, scheme, { empty: true }));
  const btn = page.locator('[data-stemlm-inject="true"]').first();
  await btn.waitFor({ state: 'visible', timeout: 15_000 });
  await h.settle(page, 600);
  await page.locator('.editor').first().click();
  await page.keyboard.type('A 5.0 kg block slides down a 30 degree incline with friction 0.20. Find its acceleration.');
  await btn.click();
  // Mid-attach: the three shapes of the mark rise in turn.
  await h.settle(page, 120);
  const dock = await page.locator('.dock').boundingBox();
  await h.shot(page, `${tag}-control-attaching`, {
    clip: dock && { x: Math.max(0, dock.x), y: Math.max(0, dock.y - 70), width: Math.min(1440, dock.width), height: dock.height + 70 },
  });
  await h.settle(page, 2600);
  // Nothing loads until the question is sent: the double sends it the way a chat does.
  await page.evaluate(() => window.__standin.send());
  await h.settle(page, 900);
  await h.sendToTab(page, 'stemlm:open-panel');
  const panel = page.locator('.slm-panel');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  await h.settle(page, 900);
  await h.shot(page, `${tag}-page`);
  await h.shot(page, `${tag}-panel`, { locator: panel });
}

async function lightboxSuite(h, scheme, tag) {
  const { page, panel } = await openAnswer(h, scheme);
  const enlarge = page.locator('.slm-diagram-enlarge').first();
  await enlarge.hover();
  await h.settle(page, 250);
  await h.shot(page, `${tag}-enlarge-hover`, { locator: page.locator('.slm-step-diagram').first() });
  await panel.focus();
  // Tab to the control so its focus ring is on camera.
  await enlarge.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await h.settle(page, 250);
  await h.shot(page, `${tag}-enlarge-focus`, { locator: page.locator('.slm-step-diagram').first() });
  await page.keyboard.press('Enter');
  await h.settle(page, 700);
  await h.shot(page, `${tag}-open`);
  await page.keyboard.press('Escape');
  await h.settle(page, 400);
  await step(h, page, panel, 'ArrowRight', 3);
  await page.locator('.slm-diagram-frame').first().click();
  await h.settle(page, 700);
  await h.shot(page, `${tag}-open-plot`);
}

async function figureShapesSuite(h, scheme, tag) {
  const { page, panel } = await openAnswer(h, scheme, { capsule: FIGURE_SHAPES, question: 'Show three figures.' });
  const names = ['tall', 'wide', 'timing', 'tiny'];
  for (let i = 0; i < names.length; i++) {
    if (i > 0) await step(h, page, panel);
    await h.shot(page, `${tag}-${names[i]}`, { locator: panel });
    await page.locator('.slm-diagram-enlarge').first().click();
    await h.settle(page, 700);
    await h.shot(page, `${tag}-${names[i]}-lightbox`);
    await page.keyboard.press('Escape');
    await h.settle(page, 350);
  }
  await page.close();

  await h.setStored({ stemlm_setting_splitRatio: NARROW.splitRatio, stemlm_split_ratio_user_set: true });
  const narrow = await openAnswer(h, scheme, { capsule: FIGURE_SHAPES, question: 'Show three figures.', viewport: NARROW.viewport });
  for (let i = 0; i < names.length; i++) {
    if (i > 0) await step(h, narrow.page, narrow.panel);
    await h.shot(narrow.page, `${tag}-narrow-${names[i]}`, { locator: narrow.panel });
  }
  await narrow.page.locator('.slm-diagram-enlarge').first().click();
  await h.settle(narrow.page, 700);
  await h.shot(narrow.page, `${tag}-narrow-tiny-lightbox`);
}

async function longQuestionSuite(h, scheme, tag) {
  const { page, panel } = await openAnswer(h, scheme, { capsule: LONG_QUESTION, question: 'A ball is thrown from a cliff.' });
  await h.shot(page, `${tag}-collapsed`, { locator: panel });
  const toggle = page.locator('.slm-question-toggle');
  await toggle.click();
  await h.settle(page, 400);
  await h.shot(page, `${tag}-expanded`, { locator: panel });
  await page.close();

  await h.setStored({ stemlm_setting_splitRatio: NARROW.splitRatio, stemlm_split_ratio_user_set: true });
  const narrow = await openAnswer(h, scheme, { capsule: LONG_QUESTION, question: 'A ball is thrown from a cliff.', viewport: NARROW.viewport });
  await h.shot(narrow.page, `${tag}-narrow-collapsed`, { locator: narrow.panel });
  await narrow.page.locator('.slm-question-toggle').click();
  await h.settle(narrow.page, 400);
  await h.shot(narrow.page, `${tag}-narrow-expanded`, { locator: narrow.panel });
}

async function followupSuite(h, scheme, tag) {
  const { page, panel } = await openAnswer(h, scheme);
  await step(h, page, panel);
  await page.locator('.slm-followup-action--ask').click();
  await h.settle(page, 2800);
  const question = 'Why does friction depend on the normal force and not on the weight directly?';
  await page.keyboard.type(question);
  await h.shot(page, `${tag}-asked`);
  await appendTurn(page, question, FOLLOWUP_ANSWER);
  await page.locator('.slm-card--followup').waitFor({ state: 'visible', timeout: 20_000 });
  await h.settle(page, 900);
  await h.shot(page, `${tag}-card`, { locator: panel });
  await page.locator('.slm-read').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await h.settle(page, 300);
  await h.shot(page, `${tag}-card-end`, { locator: panel });
  // Past the follow-up: its mark stays in the strip, filled like any visited step.
  await step(h, page, panel);
  await h.shot(page, `${tag}-after`, { locator: panel });
}

/** A short window, the same CSS viewport as 200% zoom on 1440x900: only the bar stays pinned. */
async function shortPanelSuite(h, scheme, tag) {
  const { page, panel } = await openAnswer(h, scheme, {
    viewport: { width: 720, height: 450 },
    beforeLoad: (p) => appendTurn(p, 'A 12 V source feeds a loaded divider. Find the load voltage.', asQuestion(CIRCUIT, 'q2')),
  });
  await h.shot(page, `${tag}-top`, { locator: panel });
  await panel.evaluate((el) => el.scrollTo({ top: 260 }));
  await h.settle(page, 300);
  await h.shot(page, `${tag}-scrolled`, { locator: panel });
  await page.locator('.slm-stepnav-btn--next').click();
  await h.settle(page, 800);
  await h.shot(page, `${tag}-next`, { locator: panel });
  const bar = await page.locator('.slm-header-bar').boundingBox();
  const box = await panel.boundingBox();
  if (!bar || !box || Math.abs(bar.y - box.y) > 1) throw new Error('the bar is not pinned to the top of a short panel');
}

/**
 * The one-time hint after install, on every stand-in: beside the control, clear of the chat box and
 * of the chat's controls, still clear once a long question is typed, and gone after the first press.
 */
async function firstHintSuite(h, scheme, tag) {
  for (const id of HOST_IDS) {
    await h.setStored({ stemlm_first_run_hint: true });
    const page = h.track(await h.openHost(id, scheme, { empty: true }));
    const btn = page.locator('[data-stemlm-inject="true"]').first();
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    const hint = page.locator('.slm-first-hint[data-side]');
    await hint.waitFor({ state: 'visible', timeout: 5_000 });
    await h.settle(page, 500);
    const check = async (when) => {
      const box = await page.locator('[data-hc-composer]').first().boundingBox();
      const note = await hint.boundingBox();
      if (!box || !note) throw new Error(`${id} ${when}: no chat box or no hint`);
      const overlaps = note.x < box.x + box.width && note.x + note.width > box.x && note.y < box.y + box.height && note.y + note.height > box.y;
      if (overlaps) throw new Error(`${id} ${when}: the hint covers the chat box`);
      const top = Math.max(0, Math.min(box.y, note.y) - 24);
      const bottom = Math.max(box.y + box.height, note.y + note.height) + 24;
      return { x: Math.max(0, box.x - 24), y: top, width: Math.min(1440 - Math.max(0, box.x - 24), box.width + 48), height: bottom - top };
    };
    await h.shot(page, `${tag}-${id}`, { clip: await check('at rest') });
    await page.locator('.editor').first().click();
    await page.keyboard.type('A 5.0 kg block slides down a 30 degree incline.');
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Find its acceleration and its speed after 2.0 m.');
    await h.settle(page, 500);
    await h.shot(page, `${tag}-${id}-typed`, { clip: await check('typed') });
    await btn.click();
    await h.settle(page, 600);
    if (await page.locator('.slm-first-hint').count()) throw new Error(`${id}: the hint stayed after the first press`);
    await page.close();
  }
  await h.clearStored(['stemlm_first_run_hint']);
}

/** The chat site dark while the system is light (and the reverse): "auto" follows the site. */
async function siteThemeSuite(h, scheme, tag) {
  const os = scheme === 'dark' ? 'light' : 'dark';
  const page = h.track(await h.openHost(HOST, os, { question: INCLINE_QUESTION, capsule: INCLINE, scheme }));
  await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
  await h.sendToTab(page, 'stemlm:load-conversation');
  const panel = page.locator('.slm-panel');
  await panel.waitFor({ state: 'visible', timeout: 20_000 });
  await h.settle(page, 1200);
  await h.shot(page, `${tag}-site-${scheme}-os-${os}`);
  const worn = await panel.getAttribute('data-stemlm-theme');
  if (worn !== scheme) throw new Error(`the panel is ${worn} beside a ${scheme} site`);
}

async function contentScaleSuite(h, scheme, tag) {
  const { page, panel } = await openAnswer(h, scheme);
  const smaller = page.locator('.slm-content-scale-btn').first();
  const larger = page.locator('.slm-content-scale-btn').last();
  await smaller.click();
  await h.settle(page, 500);
  await h.shot(page, `${tag}-1-step1`, { locator: panel });
  await step(h, page, panel, 'ArrowRight', 2);
  await h.shot(page, `${tag}-1-step3`, { locator: panel });
  for (let i = 0; i < 4; i++) {
    await larger.click();
    await h.settle(page, 350);
  }
  await h.shot(page, `${tag}-5-step3`, { locator: panel });
  await step(h, page, panel, 'ArrowLeft', 2);
  await h.shot(page, `${tag}-5-step1`, { locator: panel });
  await step(h, page, panel, 'ArrowRight', 4);
  await h.shot(page, `${tag}-5-step5`, { locator: panel });
  await page.locator('#slm-tab-solution').click();
  await h.settle(page, 900);
  await h.shot(page, `${tag}-5-solution`, { locator: panel });
}
