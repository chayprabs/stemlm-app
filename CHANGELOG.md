# Changelog

## Unreleased

### Study any answer

- The study panel works on answers that are not in the stemLM format. When the chat's reply is ordinary Markdown (the model ignored the guide, or the question was asked without it), stemLM reads the rendered message, recovers its LaTeX, and arranges it into steps. Such a session is labelled "Structured from the chat answer. Not checked by stemlm."; it has no quick checks or takeaways, because stemLM does not write content.
- The empty panel offers **Study the latest answer** when the chat has one.

### The guide

- The guide the chat model receives is rewritten in plain language at about a third of its old size (about 22,000 characters, down from 65,000), with a test that caps it. Every figure type is described in every subject's guide: those that fit the subject with an example, the rest as one line of keys. It now says what a step can contain (tables, lists, several lines of code), and how to answer later in a long chat.
- The guide file is attached only when the chat needs it: a new chat, a guide more than five student messages back, or an answer that came back out of format. Every question sent through stemLM carries a short reminder of the answer's shape, and follow-ups upload nothing. Before, the whole guide went with every question and every follow-up.
- Where the chat takes no file, a compact guide goes into the message as text, with a notice.
- Code blocks inside a step are kept whole.

### Figures

- **Notation repair.** A figure whose spec fails only on notation is now drawn: misspelt or aliased keys (`function:` for `fn:`), a worded range (`-3 to 3`), JSON or YAML wrapping, a missing `kind:`, bullets and bold around keys, and expressions written as `2x`, `x²` or `\frac{1}{x}`. Repair never adds, drops or changes content: an unknown key or an ambiguous reading leaves the figure out.
- **Other diagram notations.** Mermaid (flowcharts, state diagrams, sequence diagrams, class relations, mindmaps, pies, numeric gantts), Graphviz DOT, Markdown pipe tables and lists of arrows are translated into native specs and drawn by stemLM's own compiler. Mermaid itself is never run. A construct the native engines cannot express keeps the figure hidden.
- A figure drawn from repaired or translated notation is marked **Auto-corrected**.
- **New families:** sequence diagrams; truth tables computed from Boolean expressions, with minterm and maxterm lists; logic-gate circuits derived from Boolean expressions; binary, search and heap trees with computed traversals and heap validation.
- **Statistics and data:** charts (bar, grouped, stacked, line, histogram, pie, donut, box, scatter) that compute their own ticks, bins, percentages, quartiles, outliers and fitted line with r²; probability distributions drawn to scale with the shaded probability computed; number lines for intervals and inequalities; Venn diagrams that shade exactly the regions a set expression holds in.
- **Geometry and calculus:** triangles solved from whatever the problem gives (SSS, SAS, ASA, AAS, SSA) and drawn to scale, with the ambiguous case refused by name; coordinate-plane figures that read line and circle equations and compute distance, midpoint and slope; vector addition with the resultant computed; the unit circle with exact values at the special angles; slope fields with the solution through each given point integrated; polar and parametric curves.
- **Chemistry, biology and mechanics:** reaction energy profiles that find the transition states and compute the activation energy and enthalpy change; probability trees that check each node sums to 1 and multiply every path exactly; projectile motion to scale with range, maximum height and flight time computed; electron configurations and orbital box diagrams computed for Z = 1 to 118, including the standard exceptions and common ions; Bohr shell models; pedigree charts with generations computed from parentage.
- A plot of measured points with no stated range takes its range from the data. A long label in a probability tree wraps to two lines instead of hiding the figure.
- The guide's figure section for a question follows its subject better: plurals, statistics, and keywords such as enthalpy, entropy, stoichiometry and trigonometry, which could never match before.
- A dollar sign in a figure label is no longer deleted (an axis titled "Cost ($)" used to read "Cost ()").
- A graph may carry a caption or title. Flowchart boxes are no longer reshaped because of a word in their label. A type alias selects its variant (`type=heap` checks the heap property).
- The attached guide teaches the new families, generated from the same manifests the compiler is registered with.

### Reading

- Ordinary prose is no longer typeset as math: text such as "edges A-B 4, A-C 2", ranges and hyphenated terms is left as written, and the student's own question is never reclassified.
- Fixed two cases where text was deleted from an answer: a cleanup step removed words after a subscripted assignment, and `@end` or `@step` inside a sentence was stripped as a protocol marker.

### Interface

- Redesigned study panel on a new token system: step navigation as a strip of numbered marks, a step page set as a typeset page (kicker, title, key relation, working, figure plate, takeaway, quick check), the model's closing answer set apart on the last step and at the top of the Solution view, a two-line question that expands, and page turns that follow the direction of travel.
- The composer control shows the stemLM mark instead of a second plus sign, and has one place: beside the chat's own attach button, in its row, at that button's size, corner and ink. It keeps that place in every state (at rest, attaching, on, failed), follows the composer as it grows or the chat re-renders it, and is not shown at all where it has no such place: under a dialog, on a settings or builder page, beside an earlier message being edited.
- Pressing the stemLM button no longer opens the study panel or moves the page. The panel opens, waiting for the answer, when the question is sent. A press that fails says so beside the button.
- Where a chat will not take a file (ChatGPT signed out), the guide goes into the message as text and a line beside the button says so.
- Redesigned toolbar popup (says whether the current tab is a supported chat), welcome page (a live miniature of the panel built from the real components, in place of screenshots), saved questions (search shortcut, subject filters with counts, designed empty and no-results states, an explicit selection bar for merging) and settings (reading size with a live preview).
- Redesigned PDF report: a cover block, the conclusion first, typeset steps, quick checks printed as exercises with their answers collected after the last step, a contents list for merged files, and a footer with page numbers. Fixed the radical missing from equation labels on figures in the PDF, and descenders clipped at page breaks.

- The panel and the chat sit side by side as two columns; the chat is never narrowed below 480 px, and below a 760 px window the panel overlays it. While the panel is open the chat site's own sidebar is folded with the site's own button, and unfolded on close if stemLM folded it (a setting, on by default). Closing puts the page back exactly as it was.
- Steps appear while the answer is still being written. A finished plain answer or a refusal no longer waits ten seconds under the loading state.
- A panel that opens because an answer arrived no longer takes the keyboard, and the reading area scrolls with the keyboard.
- Copying maths copies its LaTeX, and each formula has a Copy LaTeX control. A suggested follow-up question is a button that fills the chat box.
- Every answer says what stemLM did and did not check; the model's own check is labelled as the model's, and a figure that could not be drawn says so.
- **Paste an answer** in the empty panel, and **Copy the guide** in the toolbar popup, give a way through on a site stemLM cannot read.
- Saved questions: Undo after deleting (also Ctrl+Z), a clear message when storage cannot be read, progress while a PDF is built, a retry for a failed export, and a window tall enough for five questions. Removing a question from the panel can be undone.
- The chat column stays readable: stemLM's answer shows as one line that opens the panel, and the lines stemLM adds under your question fold behind "Show the stemlm guide". Only an answer stemLM has read is folded, and a setting turns it off.
- Questions belong to their chat: the panel shows the current chat's questions, and follows the site when it moves between chats. Each question keeps the step you were on.
- After a reload the panel reopens on the restored answer. After the extension updates under an open tab, its actions say so with a Reload button. When a site's message box cannot be found, stemLM says so and points to Paste an answer.
- In auto, the panel follows the chat site's theme. In a short window or at 200% zoom the whole panel scrolls under a pinned top bar. Wide tables scroll in their own box. The step strip is one tab stop, with arrow, Home and End keys.
- One name for each thing in everything a student reads (question, panel, guide, chat box, answer), and no internal codes.
- A one-time hint after install points at the stemlm button.
- Fixed: a streamed answer whose last line began with `@end` (the start of `@endbody`) was taken as finished and opened a duplicate question.
- Fixed: a Stop button outside the chat box (for dictation) made stemLM think the chat was writing.
- Fixed: a second question asked without pressing the stemLM button overwrote the first answer and its saved copy.
- Fixed: selecting text in the panel never offered Ask in chat.

### For contributors

- Visual tools in `scripts/visual/` drive the built extension in headless Chromium against stand-in pages for the four chat sites and photograph every surface; a gallery tool compiles figure specs with the shipped compiler.
- The stand-in composers follow the DOM captured from the four sites (`scripts/visual/host-composers.mjs`), and `scripts/visual/control-check.mjs` measures the composer control against the chat's attach button in every state, theme and window width.
- New figure families are added as packs (a manifest and a compiler) under `src/lib/figure/families/`, with nothing else to register.
- The test suite runs about 30% faster: code that never touches a page runs in Node, and the controller tests move a fake clock instead of sleeping. `pnpm test:changed` and `pnpm test:related` run just the tests a change touches. Work-budget tests measure CPU rather than the wall clock, so they no longer fail on a busy machine.
- `scripts/guide-eval/` scores a folder of raw model answers with the shipped parser and figure compiler, for measuring a change to the guide.

## [2.0.0](https://github.com/chayprabs/stemlm-app/releases/tag/v2.0.0) — 2026-09-29

- Support ChatGPT, Claude, Gemini and Grok with provider-specific composer, attachment and answer-capture handling.
- Add a redesigned study workspace with Steps and Solution views, quick checks, contextual follow-ups, adjustable reading sizes, themes and panel width.
- Expand local typed-specification figure rendering across STEM subjects, including plots, circuits, chemistry, mechanics, biology, computing and tables.
- Validate figure specifications before display and hide unsupported or failed figures without leaving empty sections or raw source in the study view.
- Deliver **stemLM Guide.txt** through the composer + control with busy feedback, attachment confirmation and duplicate-action protection.
- Improve saved-question search, storage, workspace recovery and optional sharing across tabs.
- Export individual and merged solutions as paginated PDFs with locally bundled math and text fonts. PDF pages are rendered images rather than vector-only documents.
- Load the study panel separately when first opened to reduce initial work on chat pages.
- Disable extension telemetry in this build; remove the legacy analytics and prompt-variant settings.
- Add release installation/update instructions, license notices, SHA-256 checksums and build verification metadata.

See the [release notes](docs/releases/v2.0.0.md) for installation, requirements and limitations.

## [1.0.0](https://github.com/chayprabs/stemlm-app/releases/tag/v1.0.0) — 2026-06-08

First stable release: a Gemini study overlay with step cards, formulas, diagrams, protocol attachment, quick checks, saved sessions and PDF export.

[Full comparison: v1.0.0 to v2.0.0](https://github.com/chayprabs/stemlm-app/compare/v1.0.0...v2.0.0)
