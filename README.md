# stemLM

**A structured STEM learning overlay for the AI chatbots students already use.**

stemLM is a Manifest V3 browser extension that sits on top of **ChatGPT, Claude, and
Gemini**. AI is great at final answers but routinely skips the 3–7 intermediate steps
where students actually get stuck, and it formats every subject the same way. stemLM
fixes that: you ask your question, tap the **stemLM** button next to the chat box, and
the answer comes back as an ordered, step‑by‑step study workspace — with the right
formulas, a **diagram that updates at each step** (circuit state, ray path, free‑body
diagram, reaction stage, data‑structure state…), quick‑checks, copyable follow‑ups, and
a clean **PDF export** — rendered in stemLM’s own panel, not buried in the chat thread.

Covers **Physics, Chemistry, Math, Biology, CS, and Electrical / Mechanical / Civil /
Chemical engineering**.

---

## How it works

1. **Ask.** Type your question in the chatbot and click the **stemLM** button docked next
   to the composer. It appends a compact, subject‑specific *playbook prompt* to your
   question (clicking again won’t add it twice).
2. **Structured answer.** The model is instructed to reply in a single machine‑readable
   **“capsule”** (one ` ```stemlm ` code block). This is far more reliable to read back
   from the page than scraping prose.
3. **Study.** stemLM detects the completed answer, parses it, and opens a right‑docked,
   half‑screen panel: step cards with step‑synced diagrams, KaTeX formulas, takeaways,
   reveal‑on‑demand quick‑checks, and a plain‑language full solution.
4. **Go deeper.** Mark steps reviewed, copy/send ready‑made follow‑up prompts, **select
   any text → “Ask follow‑up”** to drill in (the deeper answer comes back into the
   panel), **save** sessions, and **export a PDF** with a stemLM header.
5. **Recover.** Closed the tab? Click the toolbar icon → **Load conversation** rebuilds
   the workspace from the chatbot’s own saved history. No server, no login.

---

## Tech stack

- **[WXT](https://wxt.dev)** (Vite) — Manifest V3 framework
- **React 19 + TypeScript + Tailwind CSS v4** — UI, mounted in an isolated **Shadow DOM**
- **framer-motion** — animations · **zustand** — state
- **KaTeX** (+ `mhchem` for chemistry) via `react-markdown` — math
- **Inline SVG (DOMPurify‑sanitized) + Mermaid** — universal diagrams across every subject
- **html2pdf.js** — clean PDF export
- **GA4 Measurement Protocol** — privacy‑light analytics (the only MV3‑legal option)

---

## Develop

```bash
pnpm install
pnpm dev            # WXT dev server (Chrome) with HMR
pnpm dev:firefox    # Firefox
pnpm build          # production build -> .output/chrome-mv3
pnpm zip            # packaged zip
pnpm test           # vitest unit/integration tests
pnpm compile        # tsc type-check
```

### Load the unpacked build

1. `pnpm build`
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   select `.output/chrome-mv3`.
3. Open ChatGPT / Claude / Gemini and look for the **stemLM** button next to the chat box.

---

## Analytics — endpoints are wired, credentials are yours to add later

Per the project brief, the analytics **endpoints and events are fully wired in code** but
send **nothing** until you provide GA4 credentials (safe no‑op otherwise). There is **no
other server‑side code** — just GA4’s Measurement Protocol, which is free.

To turn it on:

1. Create a GA4 property → **Admin → Data Streams → Web → Create stream** → copy the
   **Measurement ID** (`G‑XXXXXXXXXX`).
2. In that stream → **Measurement Protocol API secrets → Create** → copy the **API secret**.
3. Copy `.env.example` to `.env` and fill in:
   ```
   STEMLM_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   STEMLM_GA_API_SECRET=your_secret
   ```
4. `pnpm build`. Done — events start flowing.

These are injected at build time in `wxt.config.ts` (`__GA_MEASUREMENT_ID__` /
`__GA_API_SECRET__`) and consumed in **`src/lib/analytics.ts`**.

**Events tracked** (each tagged with `platform`): `extension_installed`, `panel_opened`,
`question_asked`, `question_solved`, `step_reviewed`, `quickcheck_revealed`,
`followup_used`, `session_saved`, `pdf_exported`, `conversation_loaded`,
`extension_error`.

> **“How many people use it / how many questions are solved”** → `question_asked` counts
> questions sent through stemLM and `question_solved` counts answers successfully
> structured; active users come from GA4’s `client_id` / `session_id` (set automatically).
> Users can opt out in Settings.

When you build your own backend later, you can point `trackEvent` at your endpoint instead
of (or in addition to) GA4 — it’s a single function.

---

## Architecture

```
entrypoints/
  background.ts         install + error analytics; toolbar action
  content/index.ts      mounts button + panel (Shadow DOM), wires controller, theme, sync
  popup/                toolbar popup: open panel / load conversation / saved sessions
  options/              settings page
src/
  platforms/            DOM adapters (chatgpt/claude/gemini) + detector  ← the fragile bits
  protocol/             capsule spec, per-subject playbooks, classifier, builder, parser
  content/controller.ts orchestration: inject, observe, capture, follow-up, load
  components/           Panel, StepCard, DiagramRenderer, MathMarkdown, Report (PDF), …
  state/store.ts        zustand store (per-tab)
  lib/                  analytics, settings, theme, sanitize, pdf, mermaid, session-sync
```

### The capsule protocol (`src/protocol/protocol.ts`)

The model returns one ` ```stemlm ` code block using a line‑delimited grammar
(`@meta / @step / @formula / @body / @diagram / @takeaway / @quickcheck / @followup /
@solution`, ending with `@end`). We use a delimiter format rather than JSON because LaTeX
backslashes and inline SVG constantly break JSON, and the closing `@end` doubles as the
streaming‑complete signal. The parser is tolerant (recovers from missing terminators) and
never throws.

### Diagrams (works in every subject)

Each step’s diagram reflects the **state at that step**. The model emits either
**inline SVG** (sanitized with DOMPurify — covers circuits, free‑body/ray/optics,
chemistry structures, biology, geometry, graphs) or **Mermaid** (CS flow/sequence/state).
This is why a single mechanism covers all subjects without per‑domain schemas.

---

## Settings

Theme (Auto / Light / Dark — Auto follows your system), **Share sessions across tabs**
(off by default → each tab is an independent, fresh workspace), auto‑open panel on inject,
default subject routing, per‑platform toggles, and analytics opt‑out.

---

## Maintaining the site selectors

The only part expected to drift over time is the DOM selectors for the three chatbots.
They’re isolated and easy to update:

- `src/platforms/chatgpt.ts`, `claude.ts`, `gemini.ts`

Each adapter lists **multiple fallback selectors** for the composer, send button, assistant
messages, and code blocks. If a button stops appearing or answers stop being captured on a
site, update that site’s selector arrays — nothing else needs to change.

---

## Testing

- **Automated** (`pnpm test`, 54 tests): the tolerant capsule **parser** (golden fixtures
  incl. SVG/mermaid/tolerant recovery), **classifier**, **prompt builder**, **SVG
  sanitizer**, the three **platform adapters** (DOM‑contract fixtures), the **controller**
  capture loop, the PDF **report** rendering, and a full **integration** test that drives
  the real ChatGPT adapter end‑to‑end (inject → MutationObserver capture → parsed session).
- **Verified in a real (headless) browser:** panel renders steps + solution with KaTeX,
  inline SVG and Mermaid in both light/dark; PDF export produces a valid
  `data:application/pdf` with diagrams; the production build loads with all manifest
  references present and valid JS.

### Manual QA checklist (needs your own accounts)

On each of ChatGPT, Claude, Gemini:

- [ ] stemLM button appears next to the composer, only on these sites
- [ ] Type a question → click button → prompt is appended (once); panel opens
- [ ] Answer is captured and rendered as step cards with step‑synced diagrams
- [ ] Quick‑check reveal, mark‑reviewed, prev/next + arrow keys, Esc closes
- [ ] Select text → “Ask follow‑up” → deeper answer returns into the panel
- [ ] Save session → appears in the popup; PDF export downloads with the stemLM header
- [ ] Close + reopen tab → toolbar → **Load conversation** rebuilds the workspace
- [ ] Theme follows system; per‑tab isolation (and sharing when enabled)

---

## Known limitations / future work

- **Content‑script bundle size (~content.js):** WXT bundles each content script as a single
  IIFE (no code‑splitting), so Mermaid + html2pdf are included even though they’re used
  lazily. It loads once at `document_idle` and doesn’t block the page, but a future
  optimization is to move PDF/Mermaid into an MV3 **offscreen document** to slim the
  content script.
- **Live AI verification** requires your own accounts and is covered by the manual
  checklist above; everything else is covered by automated tests + headless rendering.

---

*Built as a focused, no‑login, no‑server study tool. Your questions and answers never
leave your browser except to the AI you already chose to use.*
