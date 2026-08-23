# stemLM evaluation rubric & QA

How to evaluate stemLM's output quality at scale **without** baking any questions,
answers, diagrams, or oracles into the extension. The question set (e.g. the
250-question corpus) lives **outside** the repo and is never committed — the
`artifacts/` directory is git-ignored.

## 1. Harness (automatable here)

```bash
pnpm eval --file <questions.md>                 # routing + prompt sizes
pnpm eval --file <questions.md> --sample 5      # 5 per subject
pnpm eval --file <questions.md> --subject Physics
pnpm eval --file <questions.md> --answers <capsules.md|.json>   # + structural rubric
```

- **Inputs are external.** Pass `--file` (or set `STEMLM_EVAL_FILE`) pointing at a
  file you keep outside the repo. Question formats detected: numbered (`1.`/`Q1:`),
  markdown headings (`### …`), or blank-line-separated blocks.
- **Outputs** go to the git-ignored `artifacts/eval/` (`report.json` + `report.md`):
  - **Subject routing** distribution (does Auto land on the right subject?).
  - **Injected prompt sizes** per variant (`balanced` / `ultra`): composer-stub bytes
    and attached-file bytes (min/median/max). Use this to keep the stub small and the
    file within a sane attachment budget.
- **`--answers`** runs the real structural verifier (`verifyCapsule`) over locally
  captured Gemini capsules (a markdown/text file with one or more ` ```stemlm ` blocks,
  or a JSON array of `{ raw }`). It checks parse, step count, diagram coverage/
  completeness, SVG validity after sanitize, label collisions, panel + print sizing,
  and a successful PDF/Report build.

The harness uses the production classifier/builder/parser/verifier directly (via a
small `?raw` loader hook for Node); it does not duplicate prompt logic.

## 2. What to score (rubric dimensions)

For each question/answer, score:

1. **Subject routing** — Auto routes to the correct subject (or a defensible one).
2. **Parse success** — output is one ` ```stemlm ` capsule that parses with `status: ok`.
3. **Step count** — 5–12 atomic steps for typical problems (≥3); one move per step.
4. **Body quality** — every `@step` has a worked `@body`. Grammar is **archetype-gated**:
   numeric/lab bodies define symbols, substitute givens, and show arithmetic **with units**.
   Proof/symbolic/conceptual/code/comparison/design/estimation follow the ARCHETYPE REGISTRY
   row — a proof MUST NOT grow a numeric plug-in. Empty `@body` is always a fail.
5. **Diagram coverage** — visual **state-changing** steps carry a closed `@diagram` spec
   of a catalog `type=` (not SVG). OMIT on pure algebra, definition-only, unit conversion,
   or an unchanged figure (WHEN NOT TO DRAW). Do not score coverage as “≥40% of steps have SVG”.
6. **Diagram completeness** — spec-id completeness: every component/force/bond/axis/node
   named in `@body` appears as a **named id** in that step's spec. Completeness is spec
   membership, not SVG text or a 40%/55% step fraction.
7. **Compiled figure validity** — the compiler turns the spec into sanitized SVG; no
   `width/height/script/foreignObject/image/external refs`. The model MUST NOT emit
   `<svg>`, `viewBox`, or `path d=`.
8. **Label collisions** — compiled labels do not overlap; labels offset from lines.
9. **Panel bounds** — diagrams fit the step-card bounds (no overflow).
10. **PDF bounds** — diagrams fit the print bounds in the exported PDF.
11. **Correctness red flags** *(manual)* — spot wrong laws, dropped factors, bad units.
12. **Final solution completeness** — a verification **step** plus a visible `@verify`
    block (methods, status, notes; fail → correction) and `@uncertainty` (assumptions,
    low-confidence step ids, student check), and a `@solution` that restates the final
    answer(s) with units and assumptions. Do not invent live-model scores here.

Dimensions 2–10 and 12-structure are checked automatically by `--answers`;
1 is from the routing report; 11 and final-answer *correctness* require a human.

## 3. Manual QA (needs a Gemini account — not automatable here)

1. `pnpm build` → load `.output/chrome-mv3` as an unpacked extension in Chrome.
2. Open [gemini.google.com](https://gemini.google.com), paste a question, click the
   stemLM button.
3. Confirm `stemlm-protocol.txt` attaches and a short stub appears in the composer.
4. Confirm the panel opens when the answer starts and parses into step cards.
5. Inspect against the rubric above: archetype-gated worked bodies, spec-id-complete
   diagrams that fit the card, no label collisions, visible `@verify` / `@uncertainty`.
6. Export the PDF; confirm diagrams stay within print bounds and remain legible.
7. Try the **ultra** variant (Options → prompt variant) for deeper output on hard
   problems; confirm `balanced` stays reliable for everyday use.

## 4. Hard rules

- Never commit the question set, captured answers, or generated reports.
- Never add per-question solvers, answer oracles, or hardcoded diagrams to source —
  the no-hardcoding guard tests enforce this.
