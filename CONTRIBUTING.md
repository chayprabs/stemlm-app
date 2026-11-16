# Contributing to stemLM

Thanks for helping make STEM answers easier to follow. This guide covers how to report problems, set up the project, and get a change merged.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug.** Open a [bug report](https://github.com/chayprabs/stemlm-app/issues/new/choose) with the chat site, browser and steps to reproduce.
- **Report a wrong figure.** A figure that is drawn incorrectly is the most serious kind of bug in stemLM. Use the **Figure problem** template and include the figure spec the panel shows.
- **Report a chat-site change.** Claude, Gemini, Grok and ChatGPT change their pages often. If the **stemLM button** disappears or answers stop loading, tell us which site and when it started.
- **Improve the code or docs.** Pull requests are welcome. For anything larger than a small fix, open an issue first so we can agree on the approach.

Please remove personal information, private chats and account details from anything you post. Issues are public. Security problems go through [SECURITY.md](SECURITY.md), not the issue tracker.

## Set up

Follow [Development](README.md#development) in the README to install the tools, build the extension and load it in your browser. Before you open a pull request, run:

```bash
pnpm verify           # tsc --noEmit, the full Vitest suite, and a production build
```

While working on figures, `npx vitest run src/lib/figure` runs just the compiler tests.

## How the code fits together

1. A **platform adapter** in `src/platforms/` knows one chat site: where its composer is, how to attach a file, and where answers appear.
2. When you press the **stemLM button**, the content script (`entrypoints/content/`, `src/content/controller.ts`) attaches the instruction file built from `src/protocol/`. The file teaches the model to answer in a single fenced `stemlm` capsule.
3. As the answer streams in, the controller reads it and `src/protocol/parser.ts` turns the capsule into steps, formulas, quick checks and figure specs.
4. The **study panel** (`src/components/`, loaded on first open from `entrypoints/study-panel.ts`) renders the steps in a shadow root on the chat page.
5. Each figure spec goes to the **figure compiler** in `src/lib/figure/`: the catalog admits the family and checks required keys, an engine builds Scene IR, the layout kernel places labels, and the compiler emits SVG. Nothing in this path calls a language model.
6. Saved questions, settings and workspace state live in extension storage (`src/lib/`). PDF export runs in its own extension page (`entrypoints/pdf/`).

## Rules the codebase depends on

These are not style preferences. Changes that break them will not be merged.

### Generalize, never memorize

Fix the rule for a whole class of figures or questions, never one specific problem. Do not encode a particular question, value, component set, molecule or corpus image. Before you make a change, ask which problems that are *not* in your test case it helps. If the answer is none, it does not belong here.

Two guard tests enforce this: `src/protocol/no-hardcoding.test.ts` and `src/extension-runtime-no-hardcoding.test.ts`. They must stay green, and they are never edited to make a change pass.

### Never ship a wrong figure

A wrong drawing is worse than no drawing. If a spec cannot be rendered faithfully, the engine returns `{ ok: false, code, reason }` and the panel shows the spec source. An engine that returns `ok: true` for a spec it partly ignored is the worst failure mode in this codebase.

- A figure family exists only when `FAMILY_CATALOG` in `src/lib/figure/catalog.ts` lists it and a real engine renders it faithfully. Do not invent new `type=` tokens.
- Engines build Scene IR through `SceneBuilder` and return `layoutAndCompile(...)`. They never emit SVG strings directly.
- Strokes and fills use semantic colours (`neutral`, `accent`, `muted`, `danger`, `guide`), never hex values. The compiler owns bounds and colour.
- Protocol text never asks the model for raw `<svg>`, `viewBox`, `path d=`, coordinates, sizes or colours.

### Respect Manifest V3

- No `eval`, `new Function` or remotely hosted code. Parsing expressions uses the in-house Pratt parser for this reason.
- Model output is untrusted. Markdown renders without raw HTML, and compiled SVG passes through `src/lib/sanitize.ts` before it is mounted.
- The extension talks only to the supported chat sites and the services named in the [Privacy Policy](PRIVACY.md). Study content (questions, answers, saved solutions) reaches no one except the chat provider the user sends it to, and never goes into analytics.
- Host permissions stay HTTPS-only and limited to the supported chat sites. `src/manifest-surface.test.ts` guards what the manifest exposes to chat pages.

### Keep dependencies lean

Do not add a dependency without discussing it in an issue first. Size, licence and security all matter in a browser extension that runs on every chat page. Libraries that need WebAssembly or `eval` cannot be used.

## Tests

- Every behaviour change comes with a test. Show that the new test fails before your change and passes after it.
- Never delete, skip (`.skip`, `.only`) or loosen an existing test to make your change pass. If an existing test fails, the change is wrong, not the test.
- Tests run in [Vitest](https://vitest.dev/) with happy-dom and sit next to the code they cover as `*.test.ts` or `*.test.tsx`.
- For figures, write rule-level tests that exercise the class of spec (for example, "a force at an angle from the incline"), not a snapshot of one question.

## Common changes

### Add a figure family

1. Write an engine under `src/lib/figure/engines/` (core engines) or `src/lib/figure/leftovers/` (template families) that builds a scene with `SceneBuilder` and returns `layoutAndCompile(...)`.
2. Register the family, its aliases and its required keys in `src/lib/figure/catalog.ts`.
3. Add rule-level tests under `src/lib/figure/`, including the incomplete and contradictory specs your engine must refuse.
4. Teach the vocabulary in `src/protocol/` only after the engine renders it. `src/protocol/guide-specimens.test.ts` checks that every specimen in the guide compiles.

### Fix a chat-site adapter

Each site has one adapter in `src/platforms/` (`claude.ts`, `gemini.ts`, `grok.ts`, `chatgpt.ts`), with host and route matching in `hosts.ts` and `routes.ts`. Reproduce the site's current markup in `src/platforms/host-fixtures.ts`, add a failing test in `src/platforms/`, then fix the adapter. Keep selectors resilient: prefer roles and stable attributes over generated class names.

### Change the instruction file

The protocol lives in `src/protocol/` (`core-protocol.md`, `protocol.ts`, `playbooks.ts`, `registries.ts`). Describe grammar and rules, not worked answers to particular questions. Every line costs the user part of their chat provider's usage limit, so keep additions short.

### Change the interface

Styles use the tokens in `assets/tokens.css`; the panel's styles are in `assets/panel.css`. Check light and dark themes, all five text sizes, keyboard focus, and a narrow window (below 600 px the panel covers the chat). Include before and after screenshots in the pull request.

## Code style

- TypeScript in strict mode. `pnpm compile` must pass with no errors.
- Match the surrounding code: its naming, comment density and idioms. Comments explain *why*, not *what*.
- Keep functions small and changes focused. Unrelated refactors belong in their own pull request.

## Commits and pull requests

- Write commit subjects in the imperative, sentence case, without a type prefix: `Keep figure labels inside narrow panels`, not `fix: labels`.
- One logical change per pull request. Fill in the pull request template, link the issue, and describe anything a user would notice.
- If a change affects what the extension reads, stores or sends, say so. The [Privacy Policy](PRIVACY.md) and [Terms](TERMS.md) mirror the versions on [stemlm.app](https://stemlm.app); a maintainer updates the website first, then the copies here.
- Never commit `.env`, build output (`.output/`, `.wxt/`), credentials, or questions and answers captured from real chats.

## Licence

stemLM is released under the [MIT licence](LICENSE). By contributing, you agree that your contributions are licensed under the same terms.

## Questions

Open an [issue](https://github.com/chayprabs/stemlm-app/issues/new/choose) or email [founders@stemlm.app](mailto:founders@stemlm.app).
