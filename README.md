# stemLM

stemLM is a browser extension that turns answers from Claude, Gemini, and Grok into a structured study view beside the chat. It parses one fenced `stemlm` capsule into steps, formulas, checks, and figures.

## The idea

The model emits typed diagram specs such as `type: plot` or `type: scene`; the extension compiles those specs to SVG locally. There is no LLM in the render path: layout, validation, sanitization, and display happen in the extension.

## What works today

Tables, plots, free-body scenes, and geometry scenes are the strongest supported figure paths. Most domain-specific scene figures still render as generic boxes or are refused; they are not faithful textbook drawings yet. When a spec cannot be rendered safely, the compiler should fail closed instead of inventing content.

## Install and develop

```bash
pnpm install --ignore-scripts
pnpm exec wxt prepare
pnpm dev              # Chrome development build with HMR
pnpm dev:firefox      # Firefox development build
pnpm build            # production build
```

`--ignore-scripts` keeps dependency installation non-executable; `wxt prepare` is the only required project preparation step.

For a local install, run `pnpm build`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`.

In Edge, use `edge://extensions`. When updating an existing unpacked install, click its
**Reload** control and refresh the chatbot tabs. Keep the existing extension installed to
retain its saved questions.

## Using the study panel

Type a question or attach its image/PDF in a supported chatbot, then click the stemLM **+**.
It uploads `stemlm-protocol.txt` and adds a short instruction below the question. The complete
diagram and answer instructions belong in that file. Wait for the chatbot's file preview,
then send the question normally. If the upload cannot be confirmed, stemLM preserves the
draft and shows an error instead of filling the composer with the protocol.

When the answer finishes, use Steps or Solution in the study panel. Save retains a snapshot
for the saved-question library; the library can reopen, download, or merge saved reports.
Model answers and diagram specs still need checking against the original problem. A successful
local build cannot verify changes to authenticated chatbot upload interfaces.

The extension has no stemLM backend or login. It runs on the supported chat sites and keeps study state in browser extension storage.

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
entrypoints/        MV3 background, content, popup, and options entrypoints
assets/             CSS tokens and shipped styles
scripts/            icon generation and external-input evaluation
```

## Adding a diagram family

Add a real, spec-driven engine under `src/lib/figure/engines/`, register its vocabulary and required keys in `src/lib/figure/catalog.ts`, and add a rule-level test under `src/lib/figure/`. Build through `SceneBuilder` and `layoutAndCompile`; do not emit SVG strings in an engine. Update protocol text only for vocabulary the engine actually renders. Generalize across figure classes, never special-case a question, value, or corpus image, and fail closed when the spec is incomplete.

## Analytics

Client analytics is disabled in this release. No telemetry secret or network sink is compiled into the MV3 bundle, and the existing event call sites are no-ops. Details are in [PRIVACY.md](PRIVACY.md).

## License and third-party materials

The project code and original stemLM assets are [MIT](LICENSE). No corpus image or textbook figure is included. No IBM Plex font binaries are bundled: IBM Plex is requested from Google Fonts. Production builds include KaTeX font assets from the MIT-licensed `katex` package. Host marks in the UI identify compatible services and remain the property of their respective owners; stemLM is not affiliated with them.

The 2026-08-31 dependency audit found no copyleft runtime dependency requiring a different distribution license. `dompurify` offers Apache-2.0 alongside MPL-2.0; `khroma` is MIT despite missing a package metadata field. Dev-only copyleft or dual-license entries are `fx-runner`, `lightningcss`, `lightningcss-win32-x64-msvc`, and `web-ext-run` (MPL-2.0); `@img/sharp-win32-x64` (Apache-2.0 AND LGPL-3.0-or-later); and `node-forge` / `jszip` (BSD/MIT options alongside GPL options). Verify with `pnpm licenses list`.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [Terms of Use](docs/legal/TERMS.md).
