# Dead-family advertising ledger

This is the pre-cut census used for category A. It is about protocol advertising only; the
catalog, aliases, parser, dispatch, and renderer remain unchanged.

## Evidence

The current topic-loop record reports demand for all five engine families: `scene` 626, `table`
348, `plot` 319, `graph` 224, and `circuit` 160. The subject registry lists 78 template families.
The aggregate slim plan reports zero demand for 69/110 families but does not name them, so that
stale aggregate was not used to guess deletions.

## Decision

| Family | Subject `diagrams:` | Demand/alias evidence | Action |
|---|---:|---|---|
| `bz` | no | no exact local route evidence; no alias | omit row; standing OMIT rule |
| `dq` | no | no exact local route evidence; no alias | omit row; standing OMIT rule |
| `knot` | no | no exact local route evidence; no alias | omit row; standing OMIT rule |
| `mospi` | no | no exact local route evidence; no alias | omit row; standing OMIT rule |
| `rama` | no | no exact local route evidence; no alias | omit row; standing OMIT rule |
| `schematic` | no | generic inventory mention | retain pending exact family index |
| `sphere` | no | generic inventory mention; core rule is safety-relevant | retain |
| `ladder` | no | canonical row for listed `mo/cft/jablonski/frost` aliases | retain |
| `seqnet` | no | alias of listed `oneline` | retain |

After the cut the generated registry has five engine rows and 82 template rows; the 17 refusal
tokens stay in the single refusal line. The five omitted names remain only in the standing line
`Unlisted families mean OMIT (including ...)`, which satisfies the existing catalog-token audit
without teaching the model an unavailable form.
