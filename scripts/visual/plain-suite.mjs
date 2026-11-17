/**
 * Plain answers: chats the model answered in its own words, with or without the stemLM guide.
 * The panel must still open on a study view, say that the view was structured and not checked,
 * and leave a reply that is not an answer alone.
 *
 * Driven by shoot.mjs (`--only plain` for all of it, or one name such as `--only plain-capture`).
 * Files: `plain-answer-<scheme>` (the original shot), then `plain-<what>-<scheme>[-<detail>]`.
 */
import { PLAIN_MARKDOWN } from './capsules.mjs';
import { hostOrigin, hostPage, plainAssistant, userTurn } from './hosts.mjs';
import { BINARY_SEARCH, DERIVATIVE, MOLARITY, PROJECTILE, REFUSAL } from './plain-answers.mjs';

const QUADRATIC_QUESTION = 'Solve 2x² − 4x − 6 = 0.';
const ORIGIN_NOTE = 'Structured from the chat answer.';

/** One plain answer per host, each in a different shape the structurer reads. */
const HOSTED = [
  ['chatgpt', { question: QUADRATIC_QUESTION, markdown: PLAIN_MARKDOWN }],
  ['claude', PROJECTILE],
  ['gemini', MOLARITY],
  ['grok', DERIVATIVE],
];

/** 25% of a 1360px window: the narrowest panel the split allows, about 340px. */
const NARROW = { viewport: { width: 1360, height: 900 }, splitRatio: 0.25 };
const SPLIT_KEYS = ['stemlm_setting_splitRatio', 'stemlm_split_ratio_user_set'];
const SAVED_KEYS = ['stemlm_saved_sessions', 'stemlm_saved_sessions_version'];

/** @param {object} h harness: openHost, openExtensionPage, sendToTab, shot, settle, setStored, getStored, clearStored, failures, only, schemes */
export async function plainSuites(h) {
  const suites = {
    answer: originalSuite,
    hosts: hostsSuite,
    mermaid: mermaidSuite,
    refusal: refusalSuite,
    offer: offerSuite,
    capture: captureSuite,
    narrow: narrowSuite,
    report: reportSuite,
    restore: restoreSuite,
  };
  // `--only plain` (or any prefix of it) runs everything; `--only plain-capture` runs one suite.
  const wanted = (name) => h.only.length === 0 ||
    h.only.some((o) => 'plain'.includes(o) || (o.startsWith('plain-') && `plain-${name}`.includes(o)));
  for (const [name, run] of Object.entries(suites)) {
    if (!wanted(name)) continue;
    for (const scheme of h.schemes) {
      const pages = [];
      try {
        await run({ ...h, track: (page) => (pages.push(page), page) }, scheme);
      } catch (err) {
        h.failures.push(`plain ${name} ${scheme}: ${err.message.split('\n')[0]}`);
        for (const page of pages) if (!page.isClosed()) await h.shot(page, `plain-${name}-${scheme}-ERROR`);
      } finally {
        for (const page of pages) if (!page.isClosed()) await page.close();
        // What a suite stored (a split ratio, a saved answer) must not reach the next one.
        await h.clearStored([...SPLIT_KEYS, ...SAVED_KEYS]);
      }
    }
  }
}

async function ready(h, page) {
  await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
}

/** The study view is open and says, once, where the answer came from. */
async function expectStructured(page) {
  const panel = page.locator('.slm-panel');
  await panel.waitFor({ state: 'visible', timeout: 20_000 });
  await panel.locator('.slm-card').first().waitFor({ state: 'visible', timeout: 20_000 });
  const note = await panel.locator('.slm-header .slm-origin-note').innerText();
  if (note.trim() !== ORIGIN_NOTE) throw new Error(`origin note reads "${note}"`);
  return panel;
}

async function step(h, page, panel, n) {
  await panel.focus();
  for (let i = 1; i < n; i++) await page.keyboard.press('ArrowRight');
  await h.settle(page, 800);
}

/** The original shot: ChatGPT with math the host left unrendered, opened from the popup's last chat. */
async function originalSuite(h, scheme) {
  const html = PLAIN_MARKDOWN
    .split(/\n\n+/)
    .map((block) => block.startsWith('### ') ? `<h3>${block.slice(4)}</h3>` : `<p>${block.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('\n');
  const page = h.track(await h.openHost('chatgpt', scheme, { html, question: QUADRATIC_QUESTION }));
  await ready(h, page);
  await h.sendToTab(page, 'stemlm:load-conversation');
  const panel = await expectStructured(page);
  await h.settle(page, 1500);
  await h.shot(page, `plain-answer-${scheme}`);
  await step(h, page, panel, 3);
  await h.shot(page, `plain-answer-${scheme}-last-step`, { locator: panel });
  await page.locator('#slm-tab-solution').click();
  await h.settle(page, 900);
  await h.shot(page, `plain-answer-${scheme}-solution`, { locator: panel });
}

/** Each host's own markup (typeset math, code toolbars, reply chrome), opened as the popup's "Open study panel" does. */
async function hostsSuite(h, scheme) {
  for (const [id, answer] of HOSTED) {
    const page = h.track(await h.openHost(id, scheme, answer));
    await ready(h, page);
    const res = await h.sendToTab(page, 'stemlm:open-panel');
    if (!res?.ok || !res.loaded) throw new Error(`${id} open-panel: ${JSON.stringify(res)}`);
    const panel = await expectStructured(page);
    await h.settle(page, 1200);
    await h.shot(page, `plain-${id}-${scheme}`);
    await step(h, page, panel, 2);
    await h.shot(page, `plain-${id}-${scheme}-step2`, { locator: panel });
    await page.close();
  }
}

/** A Mermaid fence inside a step is drawn by the figure compiler and marked as corrected notation. */
async function mermaidSuite(h, scheme) {
  const page = h.track(await h.openHost('claude', scheme, BINARY_SEARCH));
  await ready(h, page);
  await h.sendToTab(page, 'stemlm:open-panel');
  const panel = await expectStructured(page);
  await step(h, page, panel, 2);
  await panel.locator('.slm-step-diagram svg').first().waitFor({ state: 'visible', timeout: 15_000 });
  await panel.locator('.slm-diagram-note').first().waitFor({ state: 'visible', timeout: 5_000 });
  await h.settle(page, 600);
  await h.shot(page, `plain-mermaid-${scheme}`);
  await h.shot(page, `plain-mermaid-${scheme}-crop`, { locator: panel });
}

/** A refusal is not an answer: the panel opens empty, offers nothing, and shows no status line. */
async function refusalSuite(h, scheme) {
  const page = h.track(await h.openHost('gemini', scheme, REFUSAL));
  await ready(h, page);
  await h.sendToTab(page, 'stemlm:open-panel');
  const panel = page.locator('.slm-panel');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  // Longer than the empty panel's recheck, so an offer or a banner would have appeared by now.
  await h.settle(page, 2200);
  if (await panel.locator('.slm-card, .slm-banner, .slm-empty-load').count()) throw new Error('a refusal produced a study view, a status line or an offer');
  if (!(await panel.locator('.slm-empty').count())) throw new Error('the empty state is missing');
  await h.shot(page, `plain-refusal-${scheme}`);
}

async function appendTurns(page, html) {
  await page.evaluate((markup) => {
    const thread = document.getElementById('thread');
    thread.querySelector('.hero')?.remove();
    thread.insertAdjacentHTML('beforeend', markup);
  }, html);
}

/** An answer that arrives while the empty panel is open: the offer appears, and one press opens it. */
async function offerSuite(h, scheme) {
  const page = h.track(await h.openHost('claude', scheme, { empty: true, katex: true }));
  await ready(h, page);
  await h.sendToTab(page, 'stemlm:open-panel');
  const panel = page.locator('.slm-panel');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  await appendTurns(page, userTurn('claude', MOLARITY.question) + plainAssistant('claude', MOLARITY.markdown));
  const offer = panel.locator('.slm-empty-load');
  await offer.waitFor({ state: 'visible', timeout: 8_000 });
  await h.settle(page, 400);
  await h.shot(page, `plain-offer-${scheme}`);
  await offer.click();
  await expectStructured(page);
  await h.settle(page, 1000);
  await h.shot(page, `plain-offer-${scheme}-opened`, { locator: panel });
}

/**
 * The narrowest panel, on a chat with two plain answers: both open, the newest in front, and the
 * origin line has to wrap under a long question without crowding the question switch above it.
 */
async function narrowSuite(h, scheme) {
  await h.setStored({ stemlm_setting_splitRatio: NARROW.splitRatio, stemlm_split_ratio_user_set: true });
  const page = h.track(await h.openHost('claude', scheme, { ...MOLARITY, viewport: NARROW.viewport }));
  await ready(h, page);
  await appendTurns(page, userTurn('claude', PROJECTILE.question) + plainAssistant('claude', PROJECTILE.markdown));
  const res = await h.sendToTab(page, 'stemlm:open-panel');
  if (res?.loaded !== 2) throw new Error(`open-panel on two plain answers: ${JSON.stringify(res)}`);
  const panel = await expectStructured(page);
  await h.settle(page, 1200);
  await h.shot(page, `plain-narrow-${scheme}`);
  await h.shot(page, `plain-narrow-${scheme}-step1`, { locator: panel });
  await page.locator('#slm-tab-solution').click();
  await h.settle(page, 900);
  await page.locator('.slm-solution-wrap').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await h.settle(page, 400);
  await h.shot(page, `plain-narrow-${scheme}-solution-end`, { locator: panel });
}

/**
 * Saved from the panel, then opened from the library as its report: the page a PDF is made from
 * still says the answer was structured and not checked, and still ends on the answer's conclusion.
 */
async function reportSuite(h, scheme) {
  // The report is one paper-white page whatever the theme.
  if (scheme !== 'light') return;
  const page = h.track(await h.openHost('claude', scheme, PROJECTILE));
  await ready(h, page);
  await h.sendToTab(page, 'stemlm:open-panel');
  const panel = await expectStructured(page);
  await panel.locator('.slm-icon-btn--save').click();
  await panel.locator('.slm-icon-btn--save[aria-pressed="true"]').waitFor({ state: 'visible', timeout: 8_000 });
  const [snapshot] = (await h.getStored(SAVED_KEYS[0])) ?? [];
  if (snapshot?.origin !== 'ingest') throw new Error(`the saved answer's origin is ${JSON.stringify(snapshot?.origin)}`);
  const report = h.track(await h.openExtensionPage(`pdf.html?id=${encodeURIComponent(snapshot.id)}`, scheme, { width: 900, height: 1000 }));
  await report.locator('.slm-report').waitFor({ state: 'visible', timeout: 20_000 });
  const text = await report.locator('.slm-report').innerText();
  if (!text.includes(ORIGIN_NOTE)) throw new Error('the report does not say where the answer came from');
  if (!(text.split('Multiply the horizontal speed by that time')[1] ?? '').includes('from where it was thrown')) throw new Error("the report lost the answer's conclusion");
  // The topic of a structured answer is the opening of its question: printing both says it twice.
  if (await report.locator('h1.slm-report-topic').count()) throw new Error('the report heads the page with the question it prints below');
  await h.settle(report, 600);
  await h.shot(report, 'plain-report', { fullPage: true });
}

/**
 * A reload brings the structured answer back from the tab's own backup, still marked. The chat is
 * served empty the second time, so what opens cannot have been read from the page again.
 */
async function restoreSuite(h, scheme) {
  if (scheme !== 'light') return;
  const page = h.track(await h.openHost('claude', scheme, PROJECTILE));
  await ready(h, page);
  await h.sendToTab(page, 'stemlm:open-panel');
  await expectStructured(page);
  // The backup is written a moment after the answer lands.
  await h.settle(page, 1200);
  await page.route(`${hostOrigin('claude')}/**`, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage('claude', { scheme, empty: true }) }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(h, page);
  const res = await h.sendToTab(page, 'stemlm:open-panel');
  if (!res?.ok || res.loaded) throw new Error(`open-panel after the reload: ${JSON.stringify(res)}`);
  await expectStructured(page);
  await h.settle(page, 900);
  await h.shot(page, 'plain-restore');
}

/**
 * The capture fallback: the student types a question, presses the stemlm button and sends; the
 * chat answers without the format. The double "sends" the way a host does: the draft becomes a
 * user turn, the composer empties, and the reply arrives.
 */
async function captureSuite(h, scheme) {
  const id = 'claude';
  const page = h.track(await h.openHost(id, scheme, { empty: true, katex: true }));
  const button = page.locator('[data-stemlm-inject="true"]').first();
  await button.waitFor({ state: 'visible', timeout: 15_000 });
  const editor = page.locator('.editor').first();
  await editor.click();
  await page.keyboard.type(PROJECTILE.question);
  await button.click();
  await h.settle(page, 2600);
  const draft = await editor.innerText();
  if (!draft.includes('stemLM')) throw new Error('the guide stub was not added to the draft');

  await page.evaluate(() => {
    const box = document.querySelector('.editor');
    box.textContent = '';
    box.dispatchEvent(new InputEvent('input', { bubbles: true }));
    for (const chip of document.querySelectorAll('.attachment-chip')) chip.remove();
  });
  await appendTurns(page, userTurn(id, draft));
  await h.settle(page, 700);
  await appendTurns(page, plainAssistant(id, PROJECTILE.markdown));
  const panel = page.locator('.slm-panel');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  await h.settle(page, 1500);
  await h.shot(page, `plain-capture-${scheme}-waiting`, { locator: panel });

  // The reply is read only once it has stopped changing for ten seconds.
  await expectStructured(page);
  // The note under the question is the one place the origin is said: no status line repeats it.
  if (await panel.locator('.slm-banner').count()) throw new Error(`a status line as well as the origin note: "${await panel.locator('.slm-banner').innerText()}"`);
  await h.settle(page, 900);
  await h.shot(page, `plain-capture-${scheme}`);
  await h.shot(page, `plain-capture-${scheme}-crop`, { locator: panel });
}
