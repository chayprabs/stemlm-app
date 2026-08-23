<div align="center">

# stemLM

**The structured way to solve STEM problems with AI.**

A Manifest V3 browser extension that turns **Gemini** into a guided, step-by-step
STEM study workspace — right beside the chat, in a real split screen.

[Install (unpacked)](#load-the-unpacked-build) | [How it works](#how-it-works) |
[Privacy](docs/legal/PRIVACY.md) | [Terms](docs/legal/TERMS.md) | [License](docs/legal/LICENSE)

</div>

---

AI is great at final answers but routinely skips the atomic intermediate steps where
students actually get stuck, and it formats every subject the same way. stemLM
fixes that: ask your question on Gemini, tap the small **stemLM** button next to
the send button, and the answer comes back as an ordered study capsule — with the
right formulas, a **diagram that updates at each step** (circuit state, ray path,
free-body diagram, reaction stage, data-structure state...), quick-checks,
copyable follow-ups, and a clean **PDF export** — rendered in stemLM's own
**resizable split-screen panel**, not buried in the chat thread.

Covers **Physics, Chemistry, Math, Biology, CS, and Electrical / Mechanical /
Civil / Chemical engineering.**

## Highlights

- **One-click Gemini button.** A small circular button that docks beside the
  composer and matches Gemini's light/dark chrome.
- **Protocol as a file, not a paste.** Clicking stemLM attaches `stemlm-protocol.txt`
  (full instructions + **every** subject playbook) next to any question, image, or PDF
  already in the composer, and inserts only a short stub — not a wall of inline text.
- **The model picks the subject.** The attached file is the same for every question.
  The model sets `@meta subject:` from the problem and applies that playbook. There
  is no subject picker on the button.
- **True split screen.** The chat page shrinks to one half and stays fully
  responsive; the study panel takes the other half. **Drag the divider to
  resize** — your ratio is remembered (default 50/50).
- **Opens at the right time.** The panel appears when the answer *starts*,
  not while you're still typing.
- **Fast, vector PDF.** Export a clean, textbook-style PDF (Q. / Ans., step by
  step, with your SVG diagrams) generated directly by the extension — no slow
  rasterisation, crisp and selectable.
- **No server, no login.** Everything runs in your browser. See [Privacy](docs/legal/PRIVACY.md).

## How it works

1. **Ask.** Type your question on [gemini.google.com](https://gemini.google.com)
   (or attach a photo/PDF of the problem) and click the small **stemLM** button
   next to the send button. stemLM attaches `stemlm-protocol.txt` without replacing
   your existing files, and inserts a short instruction stub (clicking again
   won't add it twice). The attached file includes every subject playbook; the
   model infers the subject from the problem (there is no subject picker).
2. **Structured answer.** The model is instructed to reply in a single
   machine-readable **"capsule"** (one ` ```stemlm ` code block) — far more
   reliable to read back from the page than scraping prose.
3. **Study.** When the answer starts, stemLM opens its split-screen panel and
   parses the completed capsule into step cards with step-synced diagrams, KaTeX
   formulas, takeaways, reveal-on-demand quick-checks, and a full solution.
4. **Go deeper.** Mark steps reviewed, copy/send ready-made follow-ups, **select
   any text → "Ask follow-up"** to drill in (the deeper answer comes back into
   the panel), **save** sessions, and **export a PDF**.
5. **Recover.** Closed the tab? Click the toolbar icon → **Load conversation**
   rebuilds the workspace from Gemini's saved history. No server, no login.

## Supported site

**[gemini.google.com](https://gemini.google.com)** only.

## Tech stack

- **[WXT](https://wxt.dev)** (Vite) — Manifest V3 framework
- **React 19 + TypeScript + Tailwind CSS v4** — UI, mounted in an isolated **Shadow DOM**
- **framer-motion** — animation | **zustand** — state
- **KaTeX** (+ `mhchem`) via `react-markdown` — math (rendered as **MathML** in the PDF)
- **Inline SVG (DOMPurify-sanitized) + Mermaid** — universal diagrams across every subject
- **Native print-to-PDF** — fast, vector export (no html2canvas)
- **GA4 Measurement Protocol** — optional, content-free analytics (the only MV3-legal option)

## Develop

```bash
pnpm install
pnpm dev            # WXT dev server (Chrome) with HMR
pnpm dev:firefox    # Firefox
pnpm build          # production build -> .output/chrome-mv3
pnpm zip            # packaged zip
pnpm test           # vitest unit/integration tests
pnpm compile        # tsc type-check
pnpm eval --file q.md   # offline eval: routing + prompt sizes (external Qs; see docs/eval-rubric.md)
```

### Load the unpacked build

1. `pnpm build`
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked**
   → select `.output/chrome-mv3`.
3. Open [gemini.google.com](https://gemini.google.com) and look for the **stemLM**
   button next to the chat box.

## Architecture

```
entrypoints/
  background.ts         install + error analytics; toolbar action
  content/index.ts      mounts button + panel (Shadow DOM anchored to <html>),
                        wires controller, theme, split-screen, session sync
  content/App.tsx       overlay button + split-screen page-shift
  popup/                toolbar popup: open panel / load conversation / saved sessions
  options/              settings page
src/
  platforms/            Gemini DOM adapter + detector + brand/layout config
  protocol/             capsule spec (core-protocol.md), playbooks, classifier,
                        builder, tolerant parser
  content/controller.ts orchestration: inject, stability-based capture, follow-up, load
  lib/file-inject.ts    attach stemlm-protocol.txt via Gemini upload pipeline
  components/           Panel, StepCard, DiagramRenderer, MathMarkdown, ResizeHandle,
                        Report (PDF) ...
  state/store.ts        zustand store (per-tab)
  lib/                  analytics, settings, theme, sanitize, pdf, mermaid, session-sync
```

### The capsule protocol (`src/protocol/`)

The model returns one ` ```stemlm ` code block using a line-delimited grammar
(`@meta / @step / @formula / @body / @diagram / @takeaway / @quickcheck /
@followup / @solution`, ending with `@end`). We use a delimiter format rather
than JSON because LaTeX backslashes and inline SVG constantly break JSON, and the
closing `@end` doubles as the streaming-complete signal. The **core instructions
live in [`core-protocol.md`](src/protocol/core-protocol.md)** plus compact
registries (archetype, diagram catalog, verification, follow-up). A `DEPTH: deep`
dial is the Settings `ultra` variant — not a second essay. On Gemini they ship
inside the attached `stemlm-protocol.txt`. The composer only gets a short
student-facing preamble under `--- stemLM ---`. The model sets `@meta subject:`
from the problem and applies the matching registry row. The parser
is tolerant (recovers from missing terminators and a dropped `@end`)
and never throws.

### Capture is resilient by design

The controller captures the answer using a **stability-based** strategy: a
complete capsule (terminating `@end`) is captured immediately, and an
unterminated one is captured once the assistant text has been completely stable
for ~1.5 s. It is **not** gated on any single "stop button" selector, so the
panel won't get stuck on a spinner if Gemini's streaming indicator lingers.

### Diagrams (works in every subject)

Each step's diagram reflects the **state at that step**. The model emits either
**inline SVG** (sanitised with DOMPurify — circuits, free-body/ray/optics,
chemistry structures, biology, geometry, graphs) or **Mermaid** (CS
flow/sequence/state). The PDF embeds the same SVG as vector — no raster images.

## Settings

Theme (Auto / Light / Dark — Auto follows your system), **share sessions across
tabs** (off by default → each tab is an independent workspace), open-on-answer,
prompt variant (balanced / ultra), split ratio (drag to set), and analytics opt-out.

## Analytics — endpoints wired, credentials are yours to add later

The analytics **endpoints and events are fully wired** but send **nothing** until
GA4 credentials are provided (safe no-op otherwise), and users can opt out. Only
content-free event counts are sent — never your questions or answers.
See [Privacy](docs/legal/PRIVACY.md). To enable:

1. GA4 → **Admin → Data Streams → Web** → copy the **Measurement ID** (`G-XXXXXXXXXX`).
2. In that stream → **Measurement Protocol API secrets → Create** → copy the **API secret**.
3. Copy `.env.example` to `.env` and fill in `STEMLM_GA_MEASUREMENT_ID` /
   `STEMLM_GA_API_SECRET`, then `pnpm build`.

Injected at build time in `wxt.config.ts` and consumed in `src/lib/analytics.ts`.

## Maintaining the Gemini selectors

The only part expected to drift over time is Gemini's DOM. Selectors live in
`src/platforms/gemini.ts` with **multiple fallback selectors** for the composer,
file upload, send button, assistant messages, and code blocks. If the button stops
appearing or answers stop being captured, update those selector arrays.

## Testing

- **Automated** (`pnpm test`): the tolerant capsule **parser** (golden fixtures
  incl. SVG/mermaid/tolerant recovery), a representative cross-subject **classifier**
  table, the per-subject **diagram-quality** audits, the **no-hardcoding** guards, the
  **prompt builder** (file-attach payload split), the **SVG sanitizer**, the
  **Gemini adapter** (DOM-contract fixtures), **file-inject**, the **controller**
  capture loop (stability + answer-started), the **PDF report / print-document
  builder**, and a full **integration** test driving the real Gemini adapter
  end-to-end (inject → MutationObserver capture → parsed session).

### Manual QA checklist (needs a Gemini account)

- [ ] Small stemLM button appears beside the Gemini composer
- [ ] Type a question → click button → `stemlm-protocol.txt` attaches + short stub appears (no protocol wall in the chat box)
- [ ] Attach a problem image or PDF, then click stemLM → protocol file is **added** (image/PDF stays) + short stub
- [ ] Panel opens **when the answer starts** and splits the screen; chat stays usable
- [ ] Drag the divider → ratio changes and persists (default 50/50)
- [ ] Answer is captured into step cards with step-synced diagrams (no stuck spinner)
- [ ] Quick-check reveal, mark-reviewed, prev/next + arrow keys, Esc closes
- [ ] Select text → "Ask follow-up" → deeper answer returns into the panel
- [ ] Save session → appears in the popup; **PDF export** downloads a fast vector PDF
- [ ] Close + reopen tab → toolbar → **Load conversation** rebuilds the workspace

## License

[MIT](docs/legal/LICENSE) | See also [Privacy Policy](docs/legal/PRIVACY.md) and [Terms of Use](docs/legal/TERMS.md).

---

_Built as a focused, no-login, no-server study tool. Your questions and answers
never leave your browser except to Gemini._
