#!/usr/bin/env node
/**
 * Visual harness for the exported PDF report: every page of the real file, as a PNG.
 *
 *   STEMLM_OUT_DIR=.output-x npx wxt build
 *   node scripts/visual/pdf-report.mjs --ext .output-x/chrome-mv3 [--out dir] [--only incline,long]
 *
 * Each answer is captured by the real panel on a chat double and saved to the library, then
 * exported by the extension's own pdf.html (the merged file by the library's "Merge PDF"). The
 * page PNGs are not screenshots of a preview: each is the PDF's own page, rebuilt from the images
 * the exporter put in the file at the positions read back from the file's content streams. The
 * PDF is written beside them, and its page count is checked against the pages that were rendered.
 *
 * Cases: the demo answers of capsules.mjs, a deliberately long answer (13 steps, figures, long
 * equations, a wide table), an answer structured from a plain chat reply, and three answers merged.
 */
import { BROWSER, chromium } from './browser.mjs';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import sharp from 'sharp';
import { hostOrigin, hostPage, hostUrl } from './hosts.mjs';
import { CIRCUIT, DIJKSTRA, INCLINE } from './capsules.mjs';
import { BINARY_SEARCH } from './plain-answers.mjs';

/** A long answer: enough working to cross several pages, with everything that is hard to break well. */
const LONG = String.raw`@meta
version: 2
subject: Electrical
topic: Charging a capacitor through a resistor network
question: A 12 V source feeds R1 = 1.2 kΩ in series with the parallel pair R2 = 2.4 kΩ and C = 1.0 µF. The capacitor is uncharged when the switch closes at t = 0. Find the capacitor voltage and the current into it as functions of time, tabulate the transient, and find the energy stored and the energy dissipated while it charges. How long until the capacitor is within 1% of its final voltage?
qid: q1
archetype: numeric
level: undergrad
locale: SI,decimal=.,circuit=IEEE
mode: full
@endmeta
@step id=s1
title: Redraw the network the capacitor sees
@body
The capacitor sits across $R_2$. Everything to its left is a source and two resistors, so it can be replaced by one source and one resistor. Remove the capacitor and look back into the two terminals it was connected to.
@endbody
@diagram id=f1 type=circuit
std: ieee
V1: n1 0 DC 12
R1: n1 n2 1.2k
R2: n2 0 2.4k
probe: V_oc=n2
highlight: R2
caption: The network with the capacitor removed. The open-circuit voltage is taken across R2.
@enddiagram
@takeaway
Any network of sources and resistors looks like one source and one resistor from a pair of terminals.
@endtakeaway
@endstep
@step id=s2
title: Find the open-circuit voltage
@formula id=e1
$$V_{Th} = V_s\,\frac{R_2}{R_1 + R_2}$$
@endformula
@body
With the capacitor removed no current leaves the node, so $R_1$ and $R_2$ form a plain divider.

$$V_{Th} = 12\cdot\frac{2.4}{1.2 + 2.4} = 8.0\ \text{V}$$
@endbody
@endstep
@step id=s3
title: Find the resistance seen from the terminals
@formula id=e2
$$R_{Th} = \frac{R_1 R_2}{R_1 + R_2}$$
@endformula
@body
Replace the source by a short circuit. From the capacitor's terminals $R_1$ and $R_2$ are then in parallel.

$$R_{Th} = \frac{(1.2)(2.4)}{1.2 + 2.4} = 0.80\ \text{k}\Omega$$
@endbody
@quickcheck
q: If $R_2$ were removed altogether, what would $V_{Th}$ and $R_{Th}$ become?
a: $V_{Th} = 12\ \text{V}$ and $R_{Th} = 1.2\ \text{k}\Omega$, because with no path to ground the divider disappears and only $R_1$ is left in series.
@endquickcheck
@endstep
@step id=s4
title: Write Kirchhoff's voltage law for the reduced loop
@formula id=e3
$$V_{Th} = R_{Th}\,i(t) + v_C(t), \qquad i(t) = C\,\frac{dv_C}{dt}$$
@endformula
@body
The reduced circuit is a single loop: the 8.0 V source, the 0.80 kΩ resistor and the capacitor. The same current flows through the resistor and into the capacitor.

$$R_{Th}C\,\frac{dv_C}{dt} + v_C = V_{Th}$$

This is a first-order linear equation with constant coefficients. Its right-hand side is constant, so the solution is a constant plus a decaying exponential.
@endbody
@endstep
@step id=s5
title: Solve the first-order equation
@body
Try $v_C(t) = A + B e^{-t/\tau}$. Substituting gives $A = V_{Th}$ from the constant terms and $\tau = R_{Th}C$ from the exponential terms. The capacitor voltage cannot jump, so $v_C(0) = 0$ fixes $B = -V_{Th}$.

$$v_C(t) = V_{Th}\left(1 - e^{-t/\tau}\right) = 8.0\left(1 - e^{-t/(0.80\ \text{ms})}\right)\ \text{V}, \qquad i(t) = \frac{V_{Th}}{R_{Th}}\,e^{-t/\tau} = 10\,e^{-t/(0.80\ \text{ms})}\ \text{mA}$$

The current is largest at the instant the switch closes, when the uncharged capacitor behaves like a short circuit, and it falls to zero as the capacitor voltage approaches the open-circuit voltage. Nothing in this argument depends on the particular values: every first-order RC circuit driven by a constant source has the same shape, set by one number, the time constant.
@endbody
@takeaway
Initial value, final value and time constant are all that a first-order transient needs.
@endtakeaway
@endstep
@step id=s6
title: Evaluate the time constant
@formula id=e4
$$\tau = R_{Th}\,C$$
@endformula
@body
$$\tau = (0.80\times10^{3}\ \Omega)(1.0\times10^{-6}\ \text{F}) = 0.80\ \text{ms}$$

Check the units: $\Omega\cdot\text{F} = \dfrac{\text{V}}{\text{A}}\cdot\dfrac{\text{C}}{\text{V}} = \dfrac{\text{C}}{\text{A}} = \text{s}$.
@endbody
@quickcheck
q: Doubling the capacitance does what to the time taken to reach 5.06 V?
a: It doubles to $1.6\ \text{ms}$, because 5.06 V is 63.2% of the final value, reached at $t = \tau$, and $\tau = R_{Th}C$ is proportional to $C$.
@endquickcheck
@endstep
@step id=s7
title: Plot the capacitor voltage
@body
The voltage rises quickly at first and flattens as it nears 8.0 V. After one time constant it has covered 63.2% of the way.
@endbody
@diagram id=f2 type=plot
fn: 8*(1-exp(-x/0.8))
domain: 0 4
xlabel: t (ms)
ylabel: v_C (V)
eq: v_C=8\left(1-e^{-t/\tau}\right)
point: 0.8,5.06
point_label: 5.06 V at t = τ
caption: Capacitor voltage against time. The curve reaches 63.2% of its final value after one time constant.
@enddiagram
@endstep
@step id=s8
title: Plot the charging current
@body
The current starts at $V_{Th}/R_{Th} = 10\ \text{mA}$ and decays with the same time constant.
@endbody
@diagram id=f3 type=plot
fn: 10*exp(-x/0.8)
domain: 0 4
xlabel: t (ms)
ylabel: i (mA)
eq: i=10\,e^{-t/\tau}
point: 0.8,3.68
point_label: 3.68 mA at t = τ
@enddiagram
@endstep
@step id=s9
title: Tabulate the transient
@body
Evaluate both expressions at a few multiples of the time constant. The power in the resistor is $p_R = i^2 R_{Th}$ and the energy in the capacitor is $w_C = \tfrac12 C v_C^2$.

| $t$ (ms) | $t/\tau$ | $e^{-t/\tau}$ | $v_C$ (V) | $i$ (mA) | $p_R$ (mW) | $w_C$ (µJ) | % of final |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 1.000 | 0.00 | 10.00 | 80.0 | 0.00 | 0.0 |
| 0.40 | 0.5 | 0.607 | 3.15 | 6.07 | 29.4 | 4.96 | 39.3 |
| 0.80 | 1 | 0.368 | 5.06 | 3.68 | 10.8 | 12.8 | 63.2 |
| 1.60 | 2 | 0.135 | 6.92 | 1.35 | 1.47 | 23.9 | 86.5 |
| 2.40 | 3 | 0.050 | 7.60 | 0.50 | 0.198 | 28.9 | 95.0 |
| 4.00 | 5 | 0.0067 | 7.95 | 0.067 | 0.0036 | 31.6 | 99.3 |

By five time constants the capacitor is within 1% of its final voltage and the current is below 1% of its initial value.
@endbody
@endstep
@step id=s10
title: Find the energy stored and the energy dissipated
@body
The capacitor ends at 8.0 V. The resistor carries the charging current for the whole transient.

$$\begin{aligned} W_C &= \tfrac12 C V_{Th}^2 = \tfrac12 (1.0\times10^{-6})(8.0)^2 = 32\ \mu\text{J} \\ W_R &= \int_0^\infty i^2 R_{Th}\,dt = \frac{V_{Th}^2}{R_{Th}}\int_0^\infty e^{-2t/\tau}\,dt = \frac{V_{Th}^2}{R_{Th}}\cdot\frac{\tau}{2} = \tfrac12 C V_{Th}^2 = 32\ \mu\text{J} \end{aligned}$$

The two are equal whatever the resistance: half of the energy the equivalent source delivers is always lost in the resistor.
@endbody
@takeaway
Charging a capacitor from a constant source through a resistor wastes as much energy as it stores.
@endtakeaway
@endstep
@step id=s11
title: Find the time to reach 99% of the final voltage
@formula id=e5
$$1 - e^{-t/\tau} = 0.99$$
@endformula
@body
$$t = -\tau\ln(0.01) = (0.80\ \text{ms})(4.605) = 3.7\ \text{ms}$$

That is 4.6 time constants, consistent with the last row of the table.
@endbody
@quickcheck
q: How long does it take to reach half of the final voltage?
a: $t = \tau\ln 2 = (0.80)(0.693) = 0.55\ \text{ms}$, since $1 - e^{-t/\tau} = 0.5$ requires $e^{-t/\tau} = 0.5$.
@endquickcheck
@endstep
@step id=s12
title: Check the limits
@body
- At $t = 0$: $v_C = 0$ and $i = 10\ \text{mA}$, the current a short circuit across $R_2$ would draw from the Thevenin source.
- As $t \to \infty$: $v_C \to 8.0\ \text{V}$ and $i \to 0$, the divider with no load.
- With $R_2 \to \infty$: $V_{Th} \to 12\ \text{V}$ and $\tau \to R_1 C = 1.2\ \text{ms}$, the plain series RC circuit.
@endbody
@endstep
@step id=s13
title: State the result in terms of the original circuit
@body
In the original circuit the source current is not the capacitor current: part of it flows through $R_2$. At any instant $i_{R2} = v_C/R_2$, so the source supplies $i_s = i + v_C/R_2$, which starts at 10 mA and settles at $8.0/2.4 = 3.33\ \text{mA}$.
@endbody
@endstep
@verify
methods: units,limit,alt
status: pass
notes: Energy balance holds: the Thevenin source delivers C V_Th^2 = 64 uJ, of which 32 uJ is stored and 32 uJ is dissipated.
@endverify
@uncertainty
assumption: ideal source, ideal capacitor with no leakage, switch closes instantly
low_confidence: none
check: none
@enduncertainty
@solution
The capacitor charges as $v_C(t) = 8.0\,(1 - e^{-t/0.80\ \text{ms}})\ \text{V}$ with current $i(t) = 10\,e^{-t/0.80\ \text{ms}}\ \text{mA}$. It stores $32\ \mu\text{J}$, the same amount is dissipated in the resistance, and it is within 1% of 8.0 V after $3.7\ \text{ms}$.
@endsolution
@end`;

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

/** [name, chat host, what the double shows] */
const CASES = [
  ['incline', 'chatgpt', { capsule: INCLINE, question: 'A 5.0 kg block is released from rest on a 30° incline with μk = 0.20. Find its acceleration and its speed after 2.0 m.' }],
  ['circuit', 'claude', { capsule: CIRCUIT, question: 'A 12 V source feeds R1 = 2 kΩ in series with R2 = 4 kΩ. A 4 kΩ load is connected across R2. Find the load voltage.' }],
  ['dijkstra', 'gemini', { capsule: DIJKSTRA, question: "Run Dijkstra's algorithm from A on the graph with edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3. What is the shortest distance to E?" }],
  ['long', 'grok', { capsule: LONG, question: 'A 12 V source feeds R1 = 1.2 kΩ in series with the parallel pair R2 = 2.4 kΩ and C = 1.0 µF. The capacitor is uncharged when the switch closes at t = 0. Find the capacitor voltage and the current into it as functions of time, tabulate the transient, and find the energy stored and the energy dissipated while it charges. How long until the capacitor is within 1% of its final voltage?' }],
  ['ingest', 'claude', BINARY_SEARCH],
];
/** The merged file: a stemLM answer, an answer structured from the chat, and another stemLM answer. */
const MERGED = ['incline', 'ingest', 'dijkstra'];

const SAVED = 'stemlm_saved_sessions';
const SAVED_VERSION = 'stemlm_saved_sessions_version';
/** Device pixels per PDF point: the exporter rasterises CSS pixels (0.75pt) at 2x. */
const PX_PER_PT = 2 / 0.75;

mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'stemlm-pdf-'));
const log = (...a) => console.log('[pdf]', ...a);

const ctx = await chromium.launchPersistentContext(profile, {
  ...BROWSER,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  viewport: { width: 1440, height: 900 },
});

let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 20_000 });
const extUrl = (path) => `chrome-extension://${new URL(sw.url()).host}/${path}`;
await new Promise((r) => setTimeout(r, 600));
for (const p of ctx.pages()) if (p.url().includes('welcome.html')) await p.close();

const failures = [];
const setSaved = (items) => sw.evaluate(([key, version, value]) => chrome.storage.local.set({ [key]: value, [version]: 2 }), [SAVED, SAVED_VERSION, items]);
const getSaved = () => sw.evaluate(async (key) => (await chrome.storage.local.get(key))[key] ?? [], SAVED);

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

/** Open the answer on its chat double, let the panel read it, and save it: the stored snapshot. */
async function capture(host, answer) {
  await setSaved([]);
  const page = await ctx.newPage();
  try {
    await page.route(`${hostOrigin(host)}/**`, (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostPage(host, answer) }));
    await page.goto(hostUrl(host), { waitUntil: 'domcontentloaded' });
    await page.locator('[data-stemlm-inject="true"]').first().waitFor({ state: 'attached', timeout: 15_000 });
    await sendToTab(page, answer.capsule ? 'stemlm:load-conversation' : 'stemlm:open-panel');
    const panel = page.locator('.slm-panel');
    await panel.locator('.slm-card').first().waitFor({ state: 'visible', timeout: 20_000 });
    await panel.locator('.slm-icon-btn--save').click();
    await panel.locator('.slm-icon-btn--save[aria-pressed="true"]').waitFor({ state: 'visible', timeout: 8_000 });
    const [snapshot] = await getSaved();
    if (!snapshot) throw new Error('nothing was saved');
    return snapshot;
  } finally {
    await page.close();
  }
}

/**
 * Runs in the export page before its own code. It keeps what the exporter makes: every page
 * image it rasterises and the finished PDF. The file is handed to the harness rather than to
 * the Downloads folder, and the window stays open so it can be read.
 */
function keepExport() {
  window.__slmImages = [];
  const toDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...rest) {
    const url = toDataURL.apply(this, rest);
    window.__slmImages.push({ width: this.width, height: this.height, url });
    return url;
  };
  const createObjectURL = URL.createObjectURL;
  URL.createObjectURL = function (blob) {
    if (blob instanceof Blob && blob.type === 'application/pdf') window.__slmPdf = blob;
    return createObjectURL.call(URL, blob);
  };
  for (const api of [globalThis.chrome, globalThis.browser]) {
    try {
      if (api?.downloads) api.downloads.download = async () => 1;
    } catch { /* a read-only API object: the file then goes to the browser's download folder */ }
  }
  window.close = () => {};
}

/** The PDF bytes and the images drawn while it was made, once the export page has finished. */
async function collect(page) {
  await page.waitForFunction(() => window.__slmPdf, null, { timeout: 180_000 });
  return page.evaluate(async () => {
    const bytes = new Uint8Array(await window.__slmPdf.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { pdf: btoa(binary), images: window.__slmImages };
  });
}

async function exportPage(path, drive) {
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') log('  page says:', msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => failures.push(`${path}: ${err.message.split('\n')[0]}`));
  await page.addInitScript(keepExport);
  try {
    await page.goto(extUrl(path), { waitUntil: 'load' });
    await drive?.(page);
    return await collect(page);
  } finally {
    await page.close();
  }
}

/** Where each page of the PDF places its images: [{ width, height, x, y }] in points, per page. */
function placements(pdf) {
  const text = pdf.toString('latin1');
  const pages = [];
  for (const page of text.matchAll(/\/Type\s*\/Page\b[^>]*\/Contents (\d+) 0 R/g)) {
    const head = new RegExp(`\\b${page[1]} 0 obj\\s*<<[^>]*\\/Length (\\d+)[^>]*>>\\s*stream\\r?\\n`).exec(text);
    if (!head) throw new Error(`content stream ${page[1]} not found`);
    const start = head.index + head[0].length;
    const stream = inflateSync(pdf.subarray(start, start + Number(head[1]))).toString('latin1');
    pages.push([...stream.matchAll(/([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm\s*\/I\d+ Do/g)]
      .map((m) => ({ width: Number(m[1]), height: Number(m[2]), x: Number(m[3]), y: Number(m[4]) })));
  }
  return pages;
}

/** Rebuild each A4 page from the PDF's own geometry and the images that went into it. */
async function writePages(name, { pdf, images }) {
  const bytes = Buffer.from(pdf, 'base64');
  writeFileSync(join(out, `${name}.pdf`), bytes);
  const pages = placements(bytes);
  // The exporter draws at the page column's width: first every page, then every running footer.
  const column = Math.max(...images.map((image) => image.width));
  const drawn = images.filter((image) => image.width === column);
  const perPage = pages[0]?.length ?? 0;
  if (pages.length === 0 || drawn.length !== pages.length * perPage) {
    failures.push(`${name}: the PDF has ${pages.length} pages of ${perPage} images, but ${drawn.length} images were rendered`);
    return [];
  }
  const media = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(bytes.toString('latin1'));
  const [sheetW, sheetH] = [Number(media[1]), Number(media[2])];
  const files = [];
  for (const [i, placed] of pages.entries()) {
    const composite = await Promise.all(placed.map(async (box, j) => ({
      input: await sharp(Buffer.from(drawn[j * pages.length + i].url.split(',')[1], 'base64'))
        .resize(Math.round(box.width * PX_PER_PT), Math.round(box.height * PX_PER_PT), { fit: 'fill' }).toBuffer(),
      left: Math.round(box.x * PX_PER_PT),
      top: Math.round((sheetH - box.y - box.height) * PX_PER_PT),
    })));
    const file = join(out, `${name}-p${i + 1}.png`);
    await sharp({ create: { width: Math.round(sheetW * PX_PER_PT), height: Math.round(sheetH * PX_PER_PT), channels: 3, background: '#ffffff' } })
      .composite(composite).png().toFile(file);
    files.push(file);
  }
  log(`${name}: ${pages.length} page${pages.length === 1 ? '' : 's'}, ${Math.round(bytes.length / 1024)} kB`);
  return files;
}

try {
  const snapshots = new Map();
  for (const [name, host, answer] of CASES) {
    if (!want(name) && !(want('merged') && MERGED.includes(name))) continue;
    try {
      snapshots.set(name, await capture(host, answer));
    } catch (err) {
      failures.push(`${name}: ${err.message.split('\n')[0]}`);
    }
  }

  for (const [name, snapshot] of snapshots) {
    if (!want(name)) continue;
    try {
      await setSaved([snapshot]);
      await writePages(name, await exportPage(`pdf.html?id=${encodeURIComponent(snapshot.id)}&mode=download`));
    } catch (err) {
      failures.push(`${name}: ${err.message.split('\n')[0]}`);
    }
  }

  if (want('merged') && MERGED.every((name) => snapshots.has(name))) {
    try {
      // The library lists newest first and merges in list order.
      const now = Date.now();
      await setSaved(MERGED.map((name, i) => ({ ...snapshots.get(name), savedAt: now - i * 60_000 })));
      await writePages('merged', await exportPage('saved-library.html', async (page) => {
        await page.locator('[data-merge="start"]').click();
        await page.locator('[data-merge="select-all"]').click();
        await page.locator('[data-merge="download"]').click();
      }));
    } catch (err) {
      failures.push(`merged: ${err.message.split('\n')[0]}`);
    }
  }
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}

if (failures.length) {
  console.log('\n[pdf] problems:\n - ' + failures.join('\n - '));
  process.exitCode = 1;
} else {
  log('pages written to', out);
}
