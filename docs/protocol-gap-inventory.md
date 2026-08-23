# stemLM remaining-gap inventory

A later agent can execute from this file. It is **not** a rewrite of the protocol and **not** a list of work that was never done.

**Product purpose:** a short composer inject + attached instruction file so even a weak model emits compileable, professor-style STEM capsules (atomic steps, formulas with the right grammar, compiler specs not SVG, verification the student can see).

**How to read:** every row is **add** / **remove** / **fix** / **keep**. `keep` means already shipped — do not treat it as missing. Research-catalog types that are **not** in `FAMILY_CATALOG` are marked **research-doc gap, do not smuggle** (do not tell the model to emit them).

**Sources:** shipped `assembleProtocolFile` / `buildProtocolFileContent` (`src/protocol/protocol.ts`, `core-protocol.md`, `registries.ts`, `playbooks.ts`), inject/follow-up (`builder.ts`, `controller.ts`, `file-inject.ts`, `session-question.ts`), parse/apply (`parser.ts`, `apply.ts`, `types.ts`), quality (`step-quality.ts`, `diagram-quality.ts`), catalog (`src/lib/figure/catalog.ts`, leftovers `src/lib/figure/leftovers/`), `docs/diagram-compiler-research.md` §9–§12 / §11.16 refuse, `docs/eval-rubric.md`.

---

## Closed coverage matrix

| Surface | Outcome |
|---|---|
| Thinking / emit grammar and archetypes | findings **and** keep |
| IDs / resume / version / forward-compat | findings **and** keep |
| Verification-fail and uncertainty | findings **and** keep |
| When-not-to-draw and leftover catalog (no invented `type=`) | findings **and** keep |
| Notation / level / locale | findings **and** keep |
| Non-STEM / ill-posed / already-answered | findings **and** keep |
| + inject, sentinel, thread pointer, photo/PDF/file | findings **and** keep |
| Follow-up patch vs resolve vs new | findings **and** keep |
| Parser/apply vs protocol (emit that parse drops, and reverse) | findings **and** keep |
| Quality-auditor vs archetype | findings **and** keep |
| Floor-model eval hole | finding (no invented scores) |
| Subject-registry traps vs compiler leftovers | findings **and** keep |
| Soft-language / per-subject essays / JSON capsule / AI images | keep (not true of current file) except named residual hedges |
| Panel capture | findings **and** keep |

---

## Already shipped — label **keep** (do not re-do)

| ID | What | Where | Why this is keep |
|---|---|---|---|
| K1 | **keep** Numeric/lab-only plug-in MUST (`NUMERIC/LAB only` in STEP GRAMMAR); proofs MUST NOT plug in | `core-protocol.md` STEP GRAMMAR L108–109; `STEP_BODY_REQUIREMENT` in `builder.ts`; `NUMERIC_PLUG_IN_ARCHETYPES` in `step-quality.ts` | Skeptic gap closed. Residual: undefined archetype still requires plug-in (Q1). |
| K2 | Thread short pointer, not only composer | `pageThreadHasProtocol` + `THREAD_PROTOCOL_SELECTORS` in `builder.ts`; `inject()` in `controller.ts` L133–166 | Criterion 2. Residual: selector set may miss Gemini’s real user bubble (I8). |
| K3 | `@patch` ops + `applyStepPatch`; `@resume` + `stitchResume` | `apply.ts`; parser `@patch`/`@resume`; controller `pendingResume` | Patch/nav possible. Residual: silent unknown ids; patch ignores solution/verify (P8–P9). |
| K4 | Subject **registry** (not playbook essays) | `playbooks.ts` `SUBJECT_REGISTRY`; `UNIVERSAL_PLAYBOOK_HEADER` | Old PHYSICS:/PRINCIPLES: chapters deleted. Residual: TSV duplicated with paragraph rows (R3). |
| K5 | `.txt` attach + short `--- stemLM ---` preamble | `PROTOCOL_FILENAME`, `STEMLM_SENTINEL`, `STUDENT_PREAMBLE`, `buildComposerStub` | Composer stays short. Residual: inline fallback still pastes the wall (I6); preamble still model-facing (I7). |
| K6 | Archetype registry including proof / symbolic / design / comparison / conceptual / code / lab / estimation | `ARCHETYPE_ROWS` in `registries.ts` | A proof has no plug-into-the-formula step. |
| K7 | Diagram registry generated from `FAMILY_CATALOG` (engines + leftovers + refuse) | `renderDiagramRegistry()` | No invented `type=` in the attached file. |
| K8 | When-not-to-draw (6 bullets + refuse + unchanged figure) | `renderWhenNotToDraw()` | Over-diagramming forbidden in the file. Residual: Electrical “nearly EVERY @step” in `getDiagramRequirement` (D6). |
| K9 | Version `2` in template; unknown version still parses known blocks | `PROTOCOL_VERSION`; parser `version = Number(v) \|\| 1` | Forward-compat. |
| K10 | One-shot; never echo protocol; precedence (structure > “just the answer”; language request wins language only) | `core-protocol.md` L1–16 | |
| K11 | Question echo, multi-`@q`, missing-data → `@uncertainty` | `core-protocol.md` L84–103 | Parser stores `meta.question`, `questions[]`. Residual: question is one line (P3). |
| K12 | Follow-up six cases in FOLLOW-UP CONTRACT | `renderFollowupRegistry()`; `FOLLOWUP_CONTRACT_SHORT` | Ask-in-chat short form does not paste the full file. Residual: more student utterances (F2); Copy path still appends compact grammar (F3). |
| K13 | Original figures; output language = question language; non-STEM / ill-posed / already-answered defined | `core-protocol.md` L14–16, L114 | No special UI for those capsules (N2). |
| K14 | DEPTH dial (`balanced` / `ultra`) is a header, not two essays | `protocol.ts` `DEPTH_BALANCED` / `DEPTH_DEEP` | `core-protocol.ultra.md` deleted. Residual: DEPTH_BALANCED still says skip no substitution (G2). |
| K15 | Anti-patterns **not** true of the current attached file: per-subject PRINCIPLES essays, JSON capsule, AI images, “should ideally” / “try to” / “where possible” | `hasSoftLanguage`; protocol-audit tests | Residual hedges: “Prefer” in DEPTH (G3). |

---

## Findings

Each item: **action**, surface, location, why it matters.

### G — Thinking / emit grammar and archetypes

| ID | Action | Location | Finding |
|---|---|---|---|
| G1 | **keep** | `core-protocol.md` L105–109; `ARCHETYPE_ROWS` | Grammar + archetype table exist and are imperative. |
| G2 | **fix** | `protocol.ts` `DEPTH_BALANCED` L42–43: `Do not skip symbol definitions or substitution.` | Contradicts K1 for proof/symbolic. A Flash model that obeys DEPTH will plug in on a proof. Scope to numeric/lab like STEP GRAMMAR. |
| G3 | **fix** | `protocol.ts` L43 `Prefer the standard textbook path.` | Soft language. Models treat Prefer as optional. Imperative or drop. |
| G4 | **fix** | `core-protocol.md` TEMPLATE `@body` L40–41 (always the XL numeric worked line) | Floor models copy the template. Proofs/conceptual get a fake numeric body. Add one non-numeric `@body` example in the template **or** label the example `NUMERIC/LAB example only`. |
| G5 | **fix** | `core-protocol.md` L2 `Visual steps MUST include a complete labeled @diagram SPEC` vs `renderWhenNotToDraw` | Unconditional MUST fights “OMIT on pure algebra / definition-only”. Weak models over-draw. Qualify: visual **state-changing** steps only. |
| G6 | **add** | Protocol FIRST PASS L181 vs parser | Protocol says `@verify` and `@uncertainty` are present; parser does **not** warn if omitted (`parser.ts` builds them only if blocks exist). Weak models skip the selling-point blocks. Add parser warnings `missing_verify` / `missing_uncertainty` (or equivalent) and keep capture usable. |
| G7 | **add** | Protocol IDS L77–80 vs `parseStep` default `id: openAttrs?.id \|\| step-${index}` | Missing ids make `@patch` and ask-in-chat unimplementable in practice. Warn (do not fail empty) when a step/formula/diagram has no emitted id. |
| G8 | **fix** | `STEP_COUNT_MIN = 3` `protocol.ts` L27; protocol “3-4 if trivial”; `@q` inner often 1–2 steps | Inner homework parts warn `invalid_step_count`. Either exempt `@q` children or drop min to 1 with a “typical 5–12” target only in the prompt. |
| G9 | **add** | TEMPLATE | Worked **engine** examples exist (circuit, scene, smiles, echem, ice). No worked **archetype** bodies except numeric. Not chapters — one line each for proof / code / lab in the template. |
| G10 | **keep** | `ARCHETYPE_ROWS.proof` | “NEVER a plug into the formula step” is in the registry. |

### P — IDs, resume, version, forward-compat, parser/apply vs protocol

| ID | Action | Location | Finding |
|---|---|---|---|
| P1 | **keep** | Protocol IDS; parser `parseMarkerAttrs`; `CapsuleMeta.version` | Emit path and parse path both know `id=` / `version:`. |
| P2 | **fix** | `parser.ts` `readInlineValue` for `question:` (single line) | Protocol: “full verbatim problem (all parts (a)(b)…)”. A photo transcription that wraps is truncated at the first line. Continuation lines in `@meta` are skipped (`isStructural` / unknown). **Add** multi-line `question:` until `@endmeta` or a new key. |
| P3 | **fix** | Same | `topic:` spilling to the next line is already ignored (keep). `locale:` is an opaque string, not structured IEC/decimal/SI. Fine for v2; **add** later if the compiler needs `std:`. |
| P4 | **keep** | Parser stores `qid`, `archetype`, `level`, `locale`, `mode`, `formulaId`, `diagram.id`, `uncertainty`, `verification`, `questions`, `patch`, `resumeToken` | Reverse mismatch is mostly **UI** (U1), not parse-drop. |
| P5 | **fix** | Reverse: parser accepts `@diagram type=svg` and raw `<svg>` (`isMalformedDiagram` svg branch; hatch in catalog) | Protocol: NEVER emit type=svg. Hatch remains for old corpora (research §6.8). **Keep** parse; **fix** repair to convert specs (already a repair line). Residual: quality still scores SVG-era codes (Q4). |
| P6 | **fix** | `pendingResume` on `StemController` only (memory) | Protocol resume is two Gemini messages. If the content script reloads, part 1 is lost. `loadConversation` does not stitch. **Add** stitch across `extractCapsules()` pairs with the same token when loading history. |
| P7 | **fix** | `stitchResume` `dropMeta` only the first `@meta…@endmeta` | A continuation that repeats `@q` wrappers can duplicate. Rare; document for the later agent. |
| P8 | **fix** | `applyStepPatch`: unknown `id` is skipped with no warning | Follow-up “step 3 is wrong” with `s3` vs `step-3` silently no-ops. **Add** a parse/apply warning `patch_unknown_id`. |
| P9 | **fix** | `applyStepPatch` returns `{ ...capsule, steps }` only | Protocol resolve updates solution; patch of a wrong numeric step leaves `@solution` and `@verify` stale. **Add** optional `@solution` / `@verify` / `@uncertainty` inside `@patch` or require resolve when the final answer changes. |
| P10 | **fix** | `enrichStepBody` copies a worked `@formula` into empty `@body` | Students see math, but the model is rewarded for omitting `@body`. Conflicts with “@body REQUIRED”. **Fix:** keep salvage for display, still warn `missing_step_body`. |
| P11 | **fix** | `step_body_too_long` at 420 chars / 4 sentences (`parser.ts`) | Professor-style one-move bodies (define + why the law applies + substitute) trip this on numeric/lab. **Fix:** raise or ignore math-only sentences; keep “two substitutions” as the real split signal. |
| P12 | **keep** | Unknown `@` blocks skipped | Forward-compat as specified. |
| P13 | **add** | Protocol `mode:` omitted | Follow-up full re-emit without `mode: patch` is treated as resolve when `pendingFollowUpCapture` (`controller.ts` `followUpSameQuestion`). Off-topic without `mode: new` **overwrites** the current question. **Add** a cheap topic/qid mismatch → new session. |

### V — Verification-fail and uncertainty

| ID | Action | Location | Finding |
|---|---|---|---|
| V1 | **keep** | `@verify` / `@uncertainty` template; `VERIFY_ROWS`; fail → visible correction | Named techniques exist (dimensional, units, limit, oom, backsub, conservation, alt). |
| V2 | **fix** | Dual instruction: `@verify status: fail` **and** a correction `@step` | Parser puts `correction:` on `VerificationBlock`; the extra step is just another step. Panel never shows `capsule.verification` or `capsule.uncertainty` (grep of `src/components` is empty). **Add** panel/PDF blocks for assumptions, low-confidence ids, fail+correction. This is the product fix for “users blame stemLM when the model is wrong.” |
| V3 | **fix** | `docs/eval-rubric.md` §2.4 and §2.12 | Rubric still: every body substitutes givens with units; diagrams judged as SVG completeness. Out of date vs spec ids + archetype gate. **Fix** the rubric doc (no new compiler syntax). |
| V4 | **add** | Protocol LAST step = verification **and** `@verify` block | Two places. Weak models emit a “Check units” step with no `@verify`. See G6. |
| V5 | **looked; none** invented methods | `VerifyMethod` union matches the protocol methods list | Do not add “dof” as a method token (Chemical traps mention DOF in prose — keep as trap, not a new enum). |

### D — When-not-to-draw and leftover catalog (no invented type=)

| ID | Action | Location | Finding |
|---|---|---|---|
| D1 | **keep** | `renderDiagramRegistry` from `FAMILY_CATALOG` | Attached file type list ⊆ catalog. Refuse line includes `isosurface, fea, jcamp, histology, involute, julia, gds, hazop, ribbon, bam, ashrae, pid-vendor, venn4, pasting3, cms, karyo-full, plant`. |
| D2 | **keep** | Protocol NEVER `<svg>`, mermaid-not-for-circuits, no AI images | Matches research §4 / §12.8. |
| D3 | **fix** | Registry dumps **every** leftover equally (anatomy…xfmr) | Floor models pick obscure tokens or skip. **Add** a one-line “prefer ENGINE then the subject row; TEMPLATE only when that row names it.” Do not delete the full list (classifier-miss safety). |
| D4 | **fix** | Many leftovers compile to cartoons (`compileGeneric` in `leftovers/rest.ts` L247–263: rectangle + `k=v` labels + a dashed guide; `compileTline` is a line grid) | Protocol can demand textbook figures the compiler cannot draw well. **Fix** is compiler quality (out of this analysis’s implement scope) — record as **compiler leftover cartoon**, do not invent new `type=`. |
| D5 | **research-doc gap, do not smuggle** | Research §9 / prior subject passes vs `FAMILY_CATALOG` | Tokens **not** in catalog (do not emit): `nline`, `shaft`, `punnett` as `type=` (use `table` `kind=punnett`), `pedigree` as type (use `graph`), `magcirc`, `devicemodel`, `crispr`, `western`, `karyo` (only `karyo-full` refuse), `IL` / `sfd-bmd` as distinct (alias already → `sfd`), `cv`, `rcm`, `pid`, `airfoil`, `ttt`, `poincare`, `penrose`, `orbital` 3D glyph, `heap`/`dfa` CS tokens. Route: existing engine/leftover or OMIT. |
| D6 | **fix** | `getDiagramRequirement('Electrical')` `builder.ts`: `on nearly EVERY @step` | Contradicts when-not-to-draw. Repair prompts still inject this. Align with Electrical `nodraw: unit conversion only; NEVER skip the circuit when components exist`. |
| D7 | **fix** | Physics `diagrams:` includes `sfd`; Mechanical includes `sfd` | Civil leftover. Risk: ME shafts drawn as beam SFD (trap already says NEVER civil sfd on a shaft — **keep** trap; **fix** Physics row drop `sfd` unless the problem is a beam). |
| D8 | **keep** | mermaid hatch for CS only (`renderDiagramRegistry` HATCH line) | Not an invented type. |
| D9 | **fix** | Catalog hybridpi `required: ['rpi','gm','re','rc']` vs protocol `RE,RC` / `B,C,E` | Keys are case-insensitive in `specKeysPresent` (lowercased). **keep** behavior; **fix** protocol text to show `rpi,gm,re,rc` so Flash copies parseable keys. Same for opamp `rf,rg` vs `Rf,Rg`. |
| D10 | **looked; none** | Inventing compiler syntax in the protocol | Current file does not smuggle D5 tokens as `type=`. |

### L — Notation / level / locale

| ID | Action | Location | Finding |
|---|---|---|---|
| L1 | **keep** | `renderNotationLocale` (SI/imperial, decimal, sigfig, circuit IEEE/IEC, g, angles, current) | |
| L2 | **keep** | `renderLevelDial` intro/undergrad/advanced/research | |
| L3 | **add** | Locale table | Chemistry/biology notation is only in subject `traps` (mhchem, Punnett italics). Fine as traps. **Add** one locale row: `chem: mhchem \\ce{}; never SMILES-as-Newman` is already Chemistry.traps — **keep**. |
| L4 | **fix** | intro+`DEPTH: deep` | Underspecified: deep intro should add skipped algebra, not PhD jargon. One imperative sentence. |
| L5 | **fix** | `locale:` not used by circuit compiler (`std:` is per diagram) | Protocol asks `circuit=IEC\|IEEE` in `@meta` but examples hardcode `std: ieee`. **Add**: “copy `@meta locale` into `std:` unless the problem figure shows the other.” |
| L6 | **looked; none** | Soft “should ideally” in locale/level registries | Not present. |

### N — Non-STEM / ill-posed / already-answered

| ID | Action | Location | Finding |
|---|---|---|---|
| N1 | **keep** | `core-protocol.md` L14–16 | Defined. |
| N2 | **add** | Panel | These capsules look like normal step lists. **Add** a visible flag from `uncertainty` / topic so the student sees “insufficient data” / “not a STEM question.” |
| N3 | **fix** | Already-answered + missing `mode:` | See P13. |
| N4 | **looked; none** | Invented fourth subject name | Protocol: NEVER invent a subject; General row exists. |

### I — + inject, sentinel, thread pointer, photo/PDF/file

| ID | Action | Location | Finding |
|---|---|---|---|
| I1 | **keep** | `STEMLM_SENTINEL`, user text above, stub below; `cleanSessionQuestion` strips at sentinel | User text does not merge in the stored question. |
| I2 | **keep** | File attach `stemlm-protocol.txt` `text/plain` | Lowest overhead; Gemini ingest proven. Do not switch to `.md`/`.json` without measuring host attach. |
| I3 | **keep** | `pageThreadHasProtocol` | Residual I8. |
| I4 | **fix** | `OverlayButton` L176–181: if `buttonInjected`, click **toggles the panel**, does not inject | After send, `resetInjection` on empty composer (tick). If composer still has the stub, second + opens the panel instead of injecting a new question. **Fix:** if composer/thread already has protocol **and** the question text changed, inject pointer even when `buttonInjected` (or reset on question change always). |
| I5 | **fix** | `attachTextFile` L348–351: `preserveExisting` + failed drop → `{ ok: false }` | Photo/PDF already attached: additive drop 200ms timeout; then **refuse** input assign so the image is not replaced. Then `inject()` falls through to **inline wall** (`buildInjectionAppendix`) unless `alreadyInThread`. First-time image question dumps ~29 kB into the composer — the original UX failure. **Fix:** retry additive attach longer, or assign with `keepExisting: true` when `input.multiple` works (already attempted in `assignFileToInput`). |
| I6 | **fix** | `buildInjectionAppendix` / `buildInjectionPrompt` paste `assembleProtocolFile` | Last-resort is the wall. **Fix:** even fallback should be pointer + “open the attached file” if any chip exists; if truly no file API, paste **core template only** (markers), not every leftover row. |
| I7 | **fix** | `STUDENT_PREAMBLE` (`builder.ts`) | Mixes product copy (“textbook-style solution”) with model orders (“Reply with one fenced stemlm block”). Student-facing should stay product copy; model orders can live only in the file. Pointer is better. |
| I8 | **fix** | `THREAD_PROTOCOL_SELECTORS` | Guessed: `user-query`, `[data-message-author-role="user"]`, etc. Gemini may use other custom elements. If selectors miss, second + pastes `STUDENT_PREAMBLE` again. **Add** a host-specific user-turn selector in `platforms/gemini.ts` once verified on the live page; until then, also scan conversation roots for `stemlm-protocol.txt` **outside** the composer (wider than user-role). |
| I9 | **add** | Protocol question echo | Mentions image/text/PDF/file, not JSON. Harmless; **add** “any attached file is the problem, not the protocol file.” |
| I10 | **keep** | Image-only stub does not contain `@meta` in the composer (moved to “capsule question field”) | Avoids blending. |
| I11 | **fix** | Host drops file chips every turn (plan risk) | `hasNamedAttachment` short-circuits re-attach. If the chip is gone, re-attach runs. With a problem image, I5 can fail. **Fix** I5 first. |
| I12 | **keep** | Classifier analytics-only; composer does not pin `(Electrical)` | |
| I13 | **looked; none** | JSON capsule inject | Not used. |

### F — Follow-up contract

| ID | Action | Location | Finding |
|---|---|---|---|
| F1 | **keep** | Six cases: wrong step / another way / simpler / change value / add step / off-topic | In file + short composer form. |
| F2 | **add** | Same registry | Student utterances **not** enumerated: revert last patch; “only the diagram is wrong”; “translate this”; “hint, don’t solve”; “check *my* working”; multiple-choice; “skip to the answer” (precedence already wins structure); change **two** givens; “explain this formula only”; empty follow-up slot. Each needs patch vs resolve vs new. Empty slot should no-op. |
| F3 | **fix** | `FollowupBar` Copy → `buildFollowupPrompt` = `FOLLOWUP_QUESTION_SLOT` + context + `SEP` + `COMPACT_GRAMMAR` | Ask-in-chat file path is short. **Copy** still includes `--- stemLM instructions`. **Fix:** Copy should be the short composer form (`buildFollowupComposerText` + question slot), not the inline fallback. |
| F4 | **keep** | Follow-up re-attaches the protocol file | Needed if Gemini drops chips. Composer stays short. |
| F5 | **fix** | Dig-deeper default `mode: patch` unless “another method” | Model often re-emits a full capsule; controller then **replaces** the current session (`followUpSameQuestion`). That can look like a new homework blob in the panel (same session, all new ids). **Add:** if incoming ids are a disjoint set, treat as resolve (replace) but keep `qid`; if `mode: new`, add session. |
| F6 | **add** | Student types a follow-up in Gemini **without** Ask-in-chat | No short contract is injected. Capture may still parse a capsule if the model remembers the file. **Add:** optional watcher that, on send with an existing session and no sentinel, does not need protocol re-inject (file in thread) — already the Gemini default. Residual: model may answer in prose. Document as host-limitation. |
| F7 | **looked; none** | Full protocol re-paste on Ask-in-chat file path | `buildFollowupComposerText` has no `OUTPUT:` / no `ARCHETYPE REGISTRY`. |

### Q — Quality auditor vs archetype

| ID | Action | Location | Finding |
|---|---|---|---|
| Q1 | **keep** | `stepNeedsNumericPlugIn`: numeric/lab only; missing archetype → **true** (legacy) | Proofs that **omit** `archetype:` still get `step_missing_substitution`. **Fix:** if title/body look like proof (or subject Math + no digits in givens), do not require plug-in — or warn `missing_archetype` instead of substitution. |
| Q2 | **keep** | Empty `@body` still hard-fails all archetypes | Correct. |
| Q3 | **fix** | `step_missing_symbol_defs` still runs for all formulas with greek | Proofs defining symbols in words may be fine; leave on. Residual only. |
| Q4 | **fix** | `diagram-quality.ts` still uses SVG-era codes (`diagram_lacks_graphics`, `diagram_bad_viewbox`, `missing_initial_circuit`, coverage ≥40%/≥55%) | Research retarget: completeness = spec ids. Auditor already has `familyRequiredMissing` / spec ids in places, but electrical coverage still counts diagrams like SVG homework. **Fix** retarget to spec membership (research §6.9 / §16). Out of protocol-text scope; record for later. |
| Q5 | **fix** | `docs/eval-rubric.md` dim 4–8 | Same SVG/substitution era. **Fix** doc. |
| Q6 | **looked; none** | Auditor inventing types | Does not. |

### E — Floor-model eval hole

| ID | Action | Location | Finding |
|---|---|---|---|
| E1 | **add** (process, not protocol syntax) | This sandbox; `docs/eval-rubric.md`; `package.json` `"eval": "tsx scripts/eval/run-eval.mjs"` with **no `tsx` dependency** | Live old-vs-new on a Flash-class host was **not** run. Do **not** invent scores. Structural golden parse ≠ ≥95% live compiler-parse. **Add:** install or drop `tsx`; keep questions **outside** `src/`; run the ~40 golden set on the floor model with a judge that never sees this inventory. |
| E2 | **fix** | Eval dimensions ignore `@verify` fail visibility and archetype grammar | Update rubric when E1 runs. |
| E3 | **keep** | No-hardcoding: question banks stay out of `src/` | Golden set belongs in scratch / gitignored artifacts. |

### R — Subject-registry traps vs compiler leftovers

| ID | Action | Location | Finding |
|---|---|---|---|
| R1 | **keep** | `SUBJECT_REGISTRY` traps (Newman≠SMILES, echem≠bio `cell`, Punnett=`table kind=punnett`, no shaft family, Chemical≠Chemistry, IEEE/IEC mix, …) | Merged from subject passes without essays. |
| R2 | **add** | Traps still thin vs research §9 | High-value **one-liners** to add later (not chapters): NMR δ right-to-left; Fischer D/L ≠ R/S; Oh t2g below eg; mermaid labels quoted; McCabe no stair corners (already Chemical.nodraw); sagging+ (already Civil). |
| R3 | **remove** | `getUniversalPlaybook` emits TSV **and** `PLAYBOOKS[s]` paragraph duplicates | Token cost, no new information. Keep TSV + header. |
| R4 | **fix** | Electrical leftover cartoons vs protocol “complex circuits, every wire” | Honesty: `type=circuit` netlist is the path; leftover `hybridpi`/`opamp` are frozen canvases. Protocol already says that. Compiler quality is D4. |
| R5 | **looked; none** | Subject essays in the attached file | `PHYSICS: one move/step` gone. |

### U — Panel capture (in scope: consume IDs / verify / multi-q)

| ID | Action | Location | Finding |
|---|---|---|---|
| U1 | **add** | `src/components/*` | No render of `uncertainty` / `verification`. Step nav is index, not `step.id`. Formula/figure ids unused. **Add** display + deep-link by id (makes F1 real for the student). |
| U2 | **keep** | Controller multi-`@q` → N sessions | |
| U3 | **keep** | Follow-up patch applies to active session | |
| U4 | **fix** | `loadConversation` ignores resume tokens and patches | History rebuild can split truncated answers. |
| U5 | **keep** | Repair is not auto-pasted into the composer | `offerRepairPrompt` sets an error status only. |

---

## Remove (only these)

| ID | Remove | Why |
|---|---|---|
| R3 | Duplicate `PLAYBOOKS` paragraphs in the attached file | TSV already ships every row. |
| G3 | “Prefer the standard textbook path” | Hedge. |
| G2 clause | Unscoped “Do not skip … substitution” in DEPTH balanced | Conflicts with proof grammar. |
| I6 wall | Full-file inline fallback when a file chip or thread pointer is possible | Recreates the original chat-scroll failure. |
| F3 | Copy-to-clipboard inline `SEP`+full compact appendix | Contradicts “follow-ups never paste the protocol wall.” Keep compact grammar only if file attach failed. |

Do **not** remove: `.txt` attach, sentinel, registries, `@patch`, resume, catalog-generated diagram list, numeric/lab plug-in scope, thread pointer.

---

## Add (protocol or compiler — later agent)

Prioritized by whether the **model file**, **inject**, **parser**, or **UI** is the bottleneck.

1. Parser warnings for missing `@verify` / `@uncertainty` / emitted ids (G6, G7).
2. Multi-line `question:` (P2).
3. Panel UI for uncertainty + verification-fail (V2, U1) — this is the “don’t blame the app” feature.
4. Image+protocol attach when `preserveExisting` (I5) — otherwise first photo question dumps the wall.
5. OverlayButton inject-on-new-question vs panel toggle (I4).
6. DEPTH / template / Electrical nearly-every-step contradictions (G2–G5, D6, D9).
7. Follow-up utterance table extras (F2) + Copy short form (F3) + disjoint-id resolve (F5, P13).
8. `loadConversation` resume stitch (P6, U4).
9. `applyStepPatch` unknown-id warning + solution/verify update (P8, P9).
10. Dedup `getUniversalPlaybook` (R3).
11. Live floor-model eval + rubric retarget (E1, E2, Q4, Q5) — **no invented scores**.
12. Gemini user-bubble selector verification (I8).
13. Research leftover **compiler quality** (D4) — not new `type=` names (D5).

---

## Anti-patterns (current file)

| Anti-pattern | Current attached file? |
|---|---|
| Per-subject prose chapters | **No** (keep). Duplicate TSV+paragraphs only (R3). |
| Soft “should ideally / try to / where possible” | **No**. Residual “Prefer” in DEPTH (G3). |
| JSON capsule | **No**. |
| AI images | **No** (forbidden in file). |
| Invented `type=` not in catalog | **No**. D5 lists research-only names **not** to smuggle. |
| Protocol that only works on frontier models | **Unknown** — E1 eval hole; template/DEPTH contradictions (G2–G4) hurt Flash specifically. |

---

## Execution notes for the next agent

- Do not re-introduce playbook essays, JSON capsules, or AI images.
- Do not add `type=punnett|shaft|nline|pedigree|…` to the protocol; route as D5.
- Do not treat K1–K15 as missing.
- Floor-model scores must be measured or explicitly `env-failure`; never filled in.
- Prefer parser/inject/UI fixes that make the **already-written** protocol actually show up for the student (V2, I5, U1) over adding more imperative prose.
