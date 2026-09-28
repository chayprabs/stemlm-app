# stemLM

stemLM is a browser extension that turns answers from Claude, Gemini, and Grok into a structured study view beside the chat. It parses one fenced `stemlm` capsule into steps, formulas, checks, and figures.

## The idea

The model emits typed diagram specs such as `type: plot` or `type: scene`; the extension compiles those specs to SVG locally. There is no LLM in the render path: layout, validation, sanitization, and display happen in the extension.

## What works today

- **Figures the guide teaches** (each has a compiling specimen in the guide and rule-level tests): plots, free-body diagrams, geometry, thermodynamic and gas-state scenes, ray optics, apparatus and molecular-biology scenes, tables (matrix, dynamic programming, ICE, Punnett), circuits including BJT and MOSFET stages, graphs for flowcharts, state machines and automata, skeletal structures from SMILES, and the template families array, list, stack, hash, K-map, Gantt, timing, truss, shear/moment (SFD/BMD), Mohr's circle, VSEPR, MO and crystal-field levels, NMR splitting, Newman and Fischer projections, phasors, fields, cycles, and gels.
- **Fail closed**: a spec that cannot be drawn faithfully is hidden rather than drawn wrong. Mermaid diagrams are not rendered.
- **Study panel**: step-by-step or full-solution view, KaTeX math, quick checks, "Ask in chat" follow-ups anchored to a step, saved-question library, PDF download, light and dark themes, five content sizes, and a narrow-window mode (below 600 px the panel covers the chat instead of squeezing it).
- **Cost on chat pages**: the content script is about 0.5 MB; the panel itself (markdown, KaTeX, figure engines) loads the first time you open it.

Model answers and diagram specs still need checking against the original problem.

## Install and develop

```bash
pnpm install --ignore-scripts
pnpm exec wxt prepare
pnpm dev              # Chrome development build with HMR
pnpm build            # production build
```

`--ignore-scripts` keeps dependency installation non-executable; `wxt prepare` is the only required project preparation step.

For a local install, run `pnpm build`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`. A "How to use stemLM" page opens after the first install.

Chrome and Edge (116 or later) are the supported browsers. In Edge, use `edge://extensions`. After updating an unpacked install, click its **Reload** control; open chat tabs receive the new version automatically, and a tab that does not show the stemLM **+** only needs a refresh. An update closes a study panel that was open (Chrome clears the extension's session storage); open the panel and choose **Load conversation** to bring the answer back. Keep the existing extension installed to retain its saved questions. `pnpm dev:firefox` exists but Firefox is untested.

## Using the study panel

Type a question or attach its image/PDF in a supported chatbot, then click the stemLM **+**. It attaches the study guide as `stemLM Guide.txt` and adds a short line below the question; the complete answer and diagram instructions live in that file. Wait for the chatbot's file preview, then send the question normally. If the upload cannot be confirmed, stemLM keeps your draft and says so instead of pasting the guide into the chat box.

When the answer arrives, the panel opens beside the chat with Steps and Solution views. Save keeps a snapshot in the saved-question library, which can reopen, download, or merge saved answers into one PDF. PDF export saves the file straight to Downloads, named after the topic and date. A successful local build cannot verify changes to the chatbots' own upload interfaces.

The extension has no stemLM backend or login. It runs on the supported chat sites and keeps study state in browser extension storage; see [PRIVACY.md](PRIVACY.md) for what each permission is used for.

## Tests

```bash
pnpm compile
pnpm test
pnpm build
npx vitest run src/lib/figure
```

Analytics is disabled in the release build. Do not add telemetry credentials to
the extension bundle; see [Privacy](PRIVACY.md).

## Project layout

```text
src/protocol/       capsule grammar, subject playbooks, diagram instructions
src/lib/figure/     catalog, engines, Scene IR, layout, SVG compilation
src/components/     study panel, steps, figures, PDF report
src/platforms/      supported chat-site adapters
entrypoints/        MV3 background, content, study panel, popup, options, library, PDF and welcome pages
assets/             CSS tokens, shipped styles, bundled IBM Plex fonts
public/             icons and welcome-page screenshots
scripts/            icon generation, external-input evaluation, the study-panel build split
```

## Adding a diagram family

Add a real, spec-driven engine under `src/lib/figure/engines/`, register its vocabulary and required keys in `src/lib/figure/catalog.ts`, and add a rule-level test under `src/lib/figure/`. Build through `SceneBuilder` and `layoutAndCompile`; do not emit SVG strings in an engine. Update protocol text only for vocabulary the engine actually renders. Generalize across figure classes, never special-case a question, value, or corpus image, and fail closed when the spec is incomplete.

## Analytics

Client analytics is disabled in this release. No telemetry secret or network sink is compiled into the MV3 bundle, and the existing event call sites are no-ops. Details are in [PRIVACY.md](PRIVACY.md).

## License and third-party materials

The project code and original stemLM assets are [MIT](LICENSE). No corpus image or textbook figure is included. IBM Plex Sans and IBM Plex Mono are bundled as Latin-1 woff2 subsets from IBM's official release, under the SIL Open Font License 1.1 ([`assets/fonts/ibm-plex/OFL.txt`](assets/fonts/ibm-plex/OFL.txt), shipped beside the fonts in builds). Production builds include the woff2 font files of the MIT-licensed `katex` package. No font is requested from a CDN. Host marks in the UI identify compatible services and remain the property of their respective owners; stemLM is not affiliated with them.

A 2026-09-27 re-check (`pnpm licenses list --prod`) found no copyleft runtime dependency requiring a different distribution license: `dompurify` offers Apache-2.0 alongside MPL-2.0, and `chroma-js` is BSD-3-Clause AND Apache-2.0; everything else is MIT, ISC, 0BSD, BSD or Apache-2.0. Dev-only copyleft or dual-license entries are `fx-runner`, `lightningcss`, `lightningcss-win32-x64-msvc`, and `web-ext-run` (MPL-2.0); `@img/sharp-win32-x64` (Apache-2.0 AND LGPL-3.0-or-later); and `node-forge` / `jszip` (BSD/MIT options alongside GPL options). Verify with `pnpm licenses list`.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [Terms of Use](docs/legal/TERMS.md).
