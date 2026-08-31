# stemLM protocol ponytail report

Run from `the repository root`. The attached method was read from
`the external protocol-slim plan`; its stale
29,197-character budget was not reused. The upstream ULTRA ladder was also loaded from the local
skill and checked against [ponytail](https://github.com/DietrichGebert/ponytail): remove YAGNI,
reuse what already exists, then shorten only after behavior is understood.

## Budget

The baseline is the measured dirty working tree before this run, not the stale user-supplied
31,239-character figure. Each value is `characters / UTF-8 bytes / lines`.

| Section | Before | After | Δ chars |
|---|---:|---:|---:|
| `CORE_PROTOCOL` | 24,501 / 24,574 / 348 | 23,358 / 23,427 / 326 | -1,143 |
| `renderDiagramRegistry` | 5,063 / 5,073 / 109 | 3,454 / 3,464 / 98 | -1,609 |
| `getUniversalPlaybook` | 4,617 / 4,634 / 12 | 4,617 / 4,634 / 12 | 0 |
| `renderFollowupRegistry` | 2,088 / 2,092 / 19 | 2,088 / 2,092 / 19 | 0 |
| `renderArchetypeRegistry` | 2,076 / 2,147 / 11 | 2,025 / 2,096 / 11 | -51 |
| `renderVerificationRegistry` | 1,150 / 1,174 / 10 | 988 / 1,000 / 10 | -162 |
| `renderLevelDial` | 1,084 / 1,088 / 8 | 1,084 / 1,088 / 8 | 0 |
| `renderNotationLocale` | 823 / 825 / 9 | 823 / 825 / 9 | 0 |
| `renderWhenNotToDraw` | 695 / 697 / 11 | 695 / 697 / 11 | 0 |
| **assembled total** | **42,139 / 42,346 / 547** | **39,174 / 39,365 / 514** | **-2,965** |

Three repeated deterministic Figure Lab runs printed exactly `39,174 / 39,365 / 514` and 87
advertised catalog rows each time. The pinned blind model instrument and its frozen samples are
absent from this checkout and the external corpus path, so no model-quality mean, SD, or invented
2.4-point claim is reported.

## Job A — shared root cause

`src/content/controller.ts` already avoided pasting `CORE_PROTOCOL` after a successful attach.
The shared `attachTextFile()` path was the failure: after `input.files` proved that
`stemlm-protocol.txt` was present and prior files were preserved, it waited for a rendered filename
chip. Hosts can accept the native file without rendering that chip, so the function returned
`ok: false`; the controller then correctly—but unnecessarily for this false negative—used the full
inline fallback wall.

The shared fix is in `src/lib/file-inject.ts`: a verified native `FileList` is authoritative, so
the input path returns `{ ok: true, method: 'input' }` without the chip-only wait. No adapter or
caller patch was added.

Before the fix:

- `file-inject.test.ts` failed: expected `{ ok: true, method: 'input' }`, received `{ ok: false, method: 'input' }`.
- The real Gemini adapter/controller integration timed out at 5,000 ms while waiting for the absent chip.

After the fix, the focused Job A run passed both tests. The integration test now compares the
normalized composer contents against the exact short question + sentinel + preamble and rejects
`OUTPUT:` and the protocol-wall marker. The live Edge host probe inspected authenticated Gemini,
Claude, Grok, and ChatGPT DOMs read-only; no question was sent and no file was uploaded to a live
service.

## Cuts by category

### A — dead advertising

Removed only generated registry rows for `bz`, `dq`, `knot`, `mospi`, and `rama`. They have no
subject `diagrams:` listing, no exact local route evidence, and no alias. Subject-listed families,
the five demanded engines, the generic-demand `schematic`/`sphere` routes, alias-backed `ladder`,
and `seqnet` remain. `FAMILY_CATALOG`, aliases, and dispatch are untouched. The single standing
line says unlisted families mean OMIT; the omitted names remain only there for the catalog-token
audit.

Hypothesis: suppressing dead advertising must not remove a supported route. Test written first:
`protocol-audit.test.ts` fails before the cut on each dead row, then passes after it; the full
catalog-token and refusal tests also remain green.

### B — duplication

The pre-cut map is in `artifacts/figlab/slim/duplication-map.md`. The registry now uses its
`ENGINE`/`TEMPLATE` headings instead of repeating `engine`/`leftover` on every row. The five
registry engine-summary paragraphs became one compact anchor line because the complete per-key
schemas already live in `CORE_PROTOCOL`. Shared proof and verification failure instructions stay
at the core/registry anchors; repeated registry copies were removed.

Hypotheses/tests: the row-kind test fails before and passes after; the compact-schema-anchor test
fails before and passes after; the proof/failure-anchor test fails before and passes after; the
schema-first audit still finds every engine-consumed key.

### C — wording

Shortened precedence, ID, step-grammar, question-echo, geometry, gas, molecular, FBD, and typed
spec wording. Imperative meaning and pinned safety phrases remain. The full protocol audit,
no-hardcoding guards, parser tests, and all 1,293 suite tests pass.

### D — surplus exemplars

Removed duplicate `scene/apparatus`, `chem.smiles`, and `echem` format specimens. Retained one
specimen for each of the five engine families (`circuit`, `plot`, `scene`, `graph`, `table`) plus
the existing pinned `field` specimen. The exemplar inventory test was written first and failed on
`f4`, `f7`, and `f8`; it now passes, as does `exemplars-compile.test.ts`.

## Deliberately left long

`CORE_PROTOCOL`'s explicit schema block remains because the attach-failure fallback pastes core
without the appended registries. Removing it would shorten the file but make fallback diagrams
under-specified. `ponytail:` comments document this limitation in `protocol.ts`, `registries.ts`,
and `playbooks.ts`.

The subject TSV and `traps:` values remain because they are loop-paid, classifier-miss coverage.
`WHEN NOT TO DRAW`, refusal rules, capsule grammar, parser markers, alternate terminators, IDs,
block order, and the remaining exemplars remain because they are safety or compatibility floors.
No test was deleted, skipped, weakened, or rewritten.

## Verification

- `pnpm compile` — passed.
- `pnpm test` — 106 files, 1,293 tests passed.
- `pnpm build` — passed; Chrome MV3 extension built, 13.02 MB total.
- `npx vitest run src/protocol/protocol-audit.test.ts src/protocol/exemplars-compile.test.ts` — 2 files, 30 tests passed.
- `npx vitest run --config artifacts/figlab/vitest.figlab.config.ts` — Figure Lab measurement passed; repeated three times with identical output.

No accepted slimming cut was reverted; `artifacts/figlab/slim/reverted.md` records that and the
missing blind instrument.

net: -2965 chars
