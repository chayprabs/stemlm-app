# Protocol duplication map

Measured against the dirty working tree at the start of this run: `assembleProtocolFile()` was
42,139 chars / 42,346 UTF-8 bytes / 547 lines. The current source tree already contains earlier
Figure Fidelity work; this map does not treat those changes as ours.

## Survivors

| Rule | Core/fallback | Registry | Builder | Decision |
|---|---|---|---|---|
| non-empty `@body`, one move, numeric/proof grammar | `core-protocol.md` | archetype rows | repair prompt | keep core, rows, and repair copy: each serves a different path |
| capsule fence, markers, IDs, block order | `core-protocol.md` | follow-up rows | repair/follow-up prompt | keep: core is the universal attached/fallback contract; builder copies are short path contracts |
| typed specs and compiler-owned SVG | core schemas | catalog rows | repair reminders | keep: core is fallback-complete; registry is catalog admission; builder is repair-only |
| verification failure | core `VERIFICATION-FAIL` | method rows | repair prompt | keep core and method-specific checks; no silent rewrite is permitted |
| follow-up patch/resolve/new | core mode grammar | follow-up table | short composer context | keep: the three consumers are not interchangeable |
| no-draw/refusal/text-source rules | core anchor | `WHEN NOT TO DRAW` | dynamic reminder | keep: the registry is the complete contract and is explicitly safety-critical |
| subject traps | none | playbook TSV | subject repair hint | keep every TSV row and trap; the method binds them |

## Cuts made

1. `renderDiagramRegistry()` now omits five template rows with neither subject-row listing nor
   available corpus-demand evidence: `bz`, `dq`, `knot`, `mospi`, `rama`. A one-line OMIT rule
   keeps the catalog tokens visible to the catalog-completeness test without advertising them.
   Risk: a future subject could need one; the subject-row listing or demand census must add it
   before advertising. Test: protocol-audit dead-row gate.
2. Removed the extra `scene/apparatus`, `chem.smiles`, and `echem` specimens from
   `core-protocol.md`. Five engine families retain one specimen each; the pinned field specimen
   remains because the existing audit asserts its field vocabulary. Risk: a model may need a
   leftover-specific visual example; registry rows and full schemas remain. Test: exact specimen
   inventory plus `exemplars-compile.test.ts`.
3. Removed the diagram-registry header lines that repeated the core's universal emitter and
   named-object rules. Kept the catalog warning line and SVG/AI-image prohibition because current
   audit tests pin them and the latter is a hard safety rule.
4. Replaced repeated `ENGINE`/`TEMPLATE` row-kind tokens with the section headings and a shared
   `type<TAB>keys` shape. Risk: a parser could rely on the old third-column label; test: the
   registry-shape audit proves the headings and absence of repeated kind cells.
5. Collapsed the five engine schema summaries into one registry line, retaining the core schema
   block as the fallback-complete source. Risk: a summary anchor could disappear; test: the
   schema-anchor audit checks the line and the core remains covered by the audit suite.
6. Removed a duplicate proof heading and repeated verification failure suffixes. Risk: a model
   could lose the mandatory visible-failure behavior; test: the proof/verification anchor audit
   checks both shared rules.
7. Shortened repeated imperative prose in the core while retaining pinned grammar, marker,
   refusal, no-draw, and safety language. Risk: a shortened line could weaken a contract; test:
   protocol-audit, parser, builder, and exemplar compilation tests.

## Deliberately retained

`core-protocol.md`'s long engine schema block is intentional: `CORE_PROTOCOL` is also pasted by
the attach-failure fallback, so removing it in favor of the appended registry would make fallback
answers under-specified. `ponytail:` comment in `registries.ts`/`protocol.ts` records this ceiling.

The subject TSV stays long because its `traps` column contains loop-paid regression rules. The
no-draw registry stays long because it prevents false diagrams for text-heavy and copyrighted
inputs. The remaining specimens stay because the existing engine-family gate and field audit pin
them.
