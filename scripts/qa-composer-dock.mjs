/**
 * Visual + geometry QA for the stemLM inject control on the four chat hosts.
 * Usage: node scripts/qa-composer-dock.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'artifacts', 'composer-dock-qa');
mkdirSync(outDir, { recursive: true });

function hostHtml(id, layout = 'landing') {
  const chrome = `
    <style>
      html, body { margin: 0; background: #000; color: #fff; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: ${layout === 'thread' ? 'flex-end' : 'center'}; gap: 18px; }
      h1 { font-size: 28px; font-weight: 500; margin: 0; text-align: center; }
      .thread { flex: 1; width: min(720px, 92vw); padding: 24px 0; color: #bbb; }
      .pill { display: flex; align-items: center; gap: 10px; width: min(720px, 92vw); background: #2f2f2f; border-radius: 28px; padding: 10px 14px; box-sizing: border-box; margin-bottom: 16px; }
      button.plus { width: 36px; height: 36px; border: 0; border-radius: 10px; background: transparent; color: #fff; font-size: 22px; flex: none; }
      .ph { flex: 1; color: #8e8e8e; min-width: 0; }
      .trail { display: flex; align-items: center; gap: 8px; flex: none; color: #cfcfcf; font-size: 14px; }
      .chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; width: min(720px, 92vw); }
      .chips button { border: 1px solid #444; background: #1f1f1f; color: #ddd; border-radius: 999px; padding: 8px 12px; }
    </style>
  `;
  const chatgptPill = `
      <form>
        <div class="pill composer-pill" style="overflow:hidden;display:grid;grid-template-columns:auto 1fr auto;align-items:center">
          <button type="button" class="plus" data-testid="composer-plus-btn" aria-label="Add files and more" aria-haspopup="menu">+</button>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true" role="textbox" data-placeholder="Ask anything" class="ph">Ask anything</div>
          <div class="trail"><span>Think</span><span>🎙</span><span style="width:36px;height:36px;border-radius:50%;background:#248aff;display:inline-flex;align-items:center;justify-content:center">◉</span></div>
        </div>
      </form>`;
  const grokPill = `
      <form class="chat-input">
        <div class="pill" style="border:1px solid #333">
          <button type="button" class="plus" aria-label="Upload a file" aria-haspopup="menu">+</button>
          <textarea aria-label="Ask Grok anything" placeholder="What do you want to know?" class="ph" style="background:transparent;border:0;color:#8e8e8e;font:inherit;resize:none;height:24px">What do you want to know?</textarea>
          <div class="trail"><span>Fast ▾</span><span>🎙</span><span style="width:36px;height:36px;border-radius:50%;background:#fff;color:#000;display:inline-flex;align-items:center;justify-content:center">◉</span></div>
        </div>
      </form>`;
  if (id === 'chatgpt') {
    const chips =
      layout === 'chips'
        ? `<div class="chips"><button type="button" aria-label="Add files. Log in to use.">Add files. Log in to use.</button><button type="button">Summarize text</button></div>`
        : '';
    const thread = layout === 'thread' ? `<div class="thread"><p>Assistant reply about Kirchhoff's laws.</p></div>` : '';
    const heading = layout === 'thread' ? '' : `<h1>What’s on the agenda today?</h1>`;
    return `<!doctype html><html><head>${chrome}</head><body>${heading}${thread}${chatgptPill}${chips}</body></html>`;
  }
  if (id === 'grok') {
    const thread = layout === 'thread' ? `<div class="thread"><p>Grok reply</p></div>` : '';
    const heading = layout === 'thread' ? '' : `<h1>Grok</h1>`;
    return `<!doctype html><html><head>${chrome}</head><body>${heading}${thread}${grokPill}</body></html>`;
  }
  if (id === 'gemini') {
    return `<!doctype html><html><head>${chrome}</head><body>
      <h1>Hi Chaitanya, what's on your mind?</h1>
      <input-area-v2 class="input-area pill">
        <div class="leading-actions" style="display:flex;align-items:center">
          <button type="button" class="plus" aria-label="Open upload file menu">+</button>
        </div>
        <rich-textarea style="flex:1">
          <div class="ql-editor ph" contenteditable="true" role="textbox">Ask Gemini</div>
        </rich-textarea>
        <div class="trail"><span>Flash ▾</span><span>🎙</span></div>
      </input-area-v2>
    </body></html>`;
  }
  return `<!doctype html><html><head>${chrome}</head><body>
    <fieldset class="pill" style="flex-direction:column;align-items:stretch;border:0;width:min(720px,92vw);min-height:140px">
      <div class="ProseMirror" contenteditable="true" role="textbox" style="min-height:72px;color:#8e8e8e">Message Claude…</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button type="button" class="plus" aria-label="Open attachment menu" aria-haspopup="menu">+</button>
        <div class="trail"><span>Opus 5 Max ▾</span><span>🎙</span><span style="width:32px;height:32px;border-radius:8px;background:#d97757;display:inline-flex;align-items:center;justify-content:center">↑</span></div>
      </div>
    </fieldset>
  </body></html>`;
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const HOSTS = ['chatgpt', 'grok', 'gemini', 'claude'];

async function bundle() {
  const { execSync } = await import('node:child_process');
  const outfile = join(outDir, 'dock-entry.js');
  execSync(
    `pnpm exec esbuild "${join(root, 'scripts/qa/dock-entry.ts')}" --bundle --format=iife --platform=browser --outfile="${outfile}" --alias:@="${root}" --log-level=silent`,
    { cwd: root, stdio: 'inherit', shell: true },
  );
  return outfile;
}

async function loadPlaywright() {
  const { pathToFileURL } = await import('node:url');
  const candidates = [
    join(root, 'node_modules/playwright/index.js'),
    join(process.env.TEMP || '/tmp', 'stemlm-pw/node_modules/playwright/index.mjs'),
    join(process.env.TEMP || '/tmp', 'stemlm-pw/node_modules/playwright/index.js'),
  ];
  for (const file of candidates) {
    try {
      return require(file);
    } catch {
      try {
        return await import(pathToFileURL(file).href);
      } catch {
        /* try next */
      }
    }
  }
  throw new Error('Playwright is not installed. Install it in %TEMP%/stemlm-pw');
}

function assertReport(report) {
  const { id, dock, insideFrame, visible, slot, frame, viewport } = report;
  const issues = [];
  if (!visible) issues.push('inject control is not visible in the viewport');
  if (!slot || slot.width < 8 || slot.height < 8) issues.push('inject control has no box');
  if (!frame || frame.width < 80) issues.push('composer frame not found');

  if (id === 'chatgpt' || id === 'grok') {
    if (insideFrame) issues.push(`${id} inserted the control inside the composer box`);
    if (dock !== 'outside-shell') issues.push(`${id} dock is ${dock}, expected outside-shell`);
    if (slot && frame) {
      const leftGap = frame.left - slot.right;
      const above = slot.bottom <= frame.top + 2;
      const below = slot.top >= frame.bottom - 2;
      const leftOf = leftGap >= -2 && slot.left <= frame.left;
      if (viewport.width >= 900) {
        if (leftGap < -2) issues.push(`${id} overlaps the box on desktop (gap ${leftGap.toFixed(1)})`);
        if (slot.left > frame.left) issues.push(`${id} is not to the left of the box`);
      } else if (!leftOf && !above && !below) {
        const overlap = slot.right - frame.left;
        const leftPinned = slot.left <= 10 && overlap <= (slot.width || 32);
        if (!leftPinned) issues.push(`${id} covers the composer on a narrow viewport`);
      }
    }
    if (slot && frame && report.plus && viewport.width >= 900) {
      const dy = Math.abs(slot.top + slot.height / 2 - (report.plus.top + report.plus.height / 2));
      if (dy > 12) issues.push(`${id} is not vertically aligned with the host + (dy ${dy.toFixed(1)})`);
    }
  } else if (id === 'gemini' || id === 'claude') {
    if (dock !== 'before-plus') issues.push(`${id} dock is ${dock}, expected before-plus`);
    if (!insideFrame && !report.nextIsPlus) {
      issues.push(`${id} is not beside the host +`);
    }
  }
  return issues;
}

const { chromium } = await loadPlaywright();
const bundlePath = await bundle();
const browser = await chromium.launch({ headless: true });
const failures = [];
const summaries = [];

try {
  for (const host of HOSTS) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.setContent(hostHtml(host), { waitUntil: 'domcontentloaded' });
      await page.addScriptTag({ path: bundlePath });
      const report = await page.evaluate((id) => window.__stemlmQa.dock(id), host);
      const clip = report.frame
        ? {
            x: Math.max(0, report.frame.left - 80),
            y: Math.max(0, report.frame.top - 80),
            width: Math.min(vp.width, report.frame.width + 160),
            height: Math.min(vp.height, report.frame.height + 160),
          }
        : undefined;
      const shot = join(outDir, `${host}-${vp.name}.png`);
      await page.screenshot({ path: shot, clip, type: 'png' });
      const issues = assertReport(report);
      summaries.push({ host, viewport: vp.name, report, issues, shot });
      if (issues.length) failures.push({ host, viewport: vp.name, issues, report });
      await page.close();
    }
  }

  const extraCases = [
    { host: 'chatgpt', layout: 'thread', vp: VIEWPORTS[0] },
    { host: 'chatgpt', layout: 'chips', vp: VIEWPORTS[0] },
    { host: 'grok', layout: 'thread', vp: VIEWPORTS[0] },
  ];
  for (const extra of extraCases) {
    const page = await browser.newPage({ viewport: { width: extra.vp.width, height: extra.vp.height } });
    await page.setContent(hostHtml(extra.host, extra.layout), { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ path: bundlePath });
    const report = await page.evaluate((id) => window.__stemlmQa.dock(id), extra.host);
    const shot = join(outDir, `${extra.host}-${extra.layout}.png`);
    await page.screenshot({ path: shot, type: 'png' });
    const issues = assertReport(report);
    if (extra.layout === 'chips' && report.plus && report.frame) {
      const plusInside = report.plus.left >= report.frame.left - 2 && report.plus.right <= report.frame.right + 2;
      if (!plusInside) issues.push('suggestion chip was chosen as the host +');
    }
    summaries.push({ host: extra.host, viewport: extra.layout, report, issues, shot });
    if (issues.length) failures.push({ host: extra.host, viewport: extra.layout, issues, report });
    await page.close();
  }

  for (const host of ['chatgpt', 'grok']) {
    const vp = VIEWPORTS[0];
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.setContent(hostHtml(host), { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ path: bundlePath });
    await page.evaluate((id) => window.__stemlmQa.dock(id), host);
    await page.evaluate(() => window.scrollTo(0, 160));
    const after = await page.evaluate((id) => window.__stemlmQa.sync(id), host);
    const issues = assertReport(after);
    const dy = after.slot && after.frame
      ? Math.abs(after.slot.top + after.slot.height / 2 - (after.frame.top + after.frame.height / 2))
      : 99;
    if (dy > 14) issues.push(`${host} drifted after scroll (dy ${dy.toFixed(1)})`);
    summaries.push({ host, viewport: 'scroll', report: after, issues, shot: null });
    if (issues.length) failures.push({ host, viewport: 'scroll', issues, report: after });
    await page.close();
  }

  if (failures.length) {
    writeFileSync(join(outDir, 'report.json'), JSON.stringify({ summaries, failures }, null, 2));
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    writeFileSync(join(outDir, 'report.json'), JSON.stringify({ summaries, failures }, null, 2));
    console.log(`ok ${summaries.length} fixture checks → ${outDir}`);
    for (const row of summaries) {
      const r = row.report;
      console.log(
        `${row.host.padEnd(8)} ${row.viewport.padEnd(8)} dock=${r.dock} inside=${r.insideFrame} left=${r.slot?.left?.toFixed?.(1)} frameLeft=${r.frame?.left?.toFixed?.(1)}`,
      );
    }
  }

  const liveTargets = [
    { id: 'chatgpt', url: 'https://chatgpt.com/' },
    { id: 'grok', url: 'https://grok.com/' },
  ];
  const liveViewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  const liveFailures = [];
  for (const target of liveTargets) {
    for (const vp of liveViewports) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      });
      try {
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);
        await page.addScriptTag({ path: bundlePath });
        const report = await page.evaluate((id) => window.__stemlmQa.dock(id), target.id);
        const shot = join(outDir, `live-${target.id}-${vp.name}.png`);
        await page.screenshot({ path: shot, type: 'png' });
        const issues = assertReport({ ...report, viewport: { width: vp.width, height: vp.height } });
        console.log(
          `live ${target.id.padEnd(8)} ${vp.name.padEnd(8)} dock=${report.dock} inside=${report.insideFrame} visible=${report.visible} editor=${!!report.editor} plus=${!!report.plus} left=${report.slot?.left?.toFixed?.(1)} frameLeft=${report.frame?.left?.toFixed?.(1)}`,
        );
        if (!report.editor) issues.push('live editor not found');
        if (!report.visible) issues.push('live inject control not visible');
        if (issues.length) liveFailures.push({ host: target.id, viewport: vp.name, issues, report });
      } catch (err) {
        liveFailures.push({ host: target.id, viewport: vp.name, issues: [String(err)] });
      } finally {
        await page.close();
      }
    }
  }

  if (liveFailures.length) {
    console.error(JSON.stringify(liveFailures, null, 2));
    process.exitCode = 1;
  } else {
    console.log('live ok');
  }
} finally {
  await browser.close();
}
