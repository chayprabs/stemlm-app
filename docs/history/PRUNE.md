# Ponytail audit

Baseline captured before pruning. This file is the audit ledger; source code was not refactored.

## Baseline

- Branch: `codex/ponytail-audit`.
- `pnpm compile`: exit 0.
- `pnpm test`: 106 test files, 1,283 tests; all 1,283 passed before this audit. A later transient solenoid failure observed during concurrent work was not baseline and is now fixed.
- `pnpm build`: exit 0.
- Repository tree: 495,088,853 bytes at baseline.
- `artifacts/`: 3,584 files, 43,720,993 bytes.
- `output/`: 491 files, 13,201,502 bytes.
- `.output/chrome-mv3/`: 182 files, 12,999,714 bytes.
- `temp-icon/`: 17 files, 66,254 bytes.

### Built extension file-list contract (baseline)

The final `.output/chrome-mv3/` file list must equal this exact sorted list:

- assets/KaTeX_AMS-Regular-BQhdFMY1.woff2
- assets/KaTeX_AMS-Regular-DMm9YOAa.woff
- assets/KaTeX_AMS-Regular-DRggAlZN.ttf
- assets/KaTeX_Caligraphic-Bold-ATXxdsX0.ttf
- assets/KaTeX_Caligraphic-Bold-BEiXGLvX.woff
- assets/KaTeX_Caligraphic-Bold-Dq_IR9rO.woff2
- assets/KaTeX_Caligraphic-Regular-CTRA-rTL.woff
- assets/KaTeX_Caligraphic-Regular-Di6jR-x-.woff2
- assets/KaTeX_Caligraphic-Regular-wX97UBjC.ttf
- assets/KaTeX_Fraktur-Bold-BdnERNNW.ttf
- assets/KaTeX_Fraktur-Bold-BsDP51OF.woff
- assets/KaTeX_Fraktur-Bold-CL6g_b3V.woff2
- assets/KaTeX_Fraktur-Regular-CB_wures.ttf
- assets/KaTeX_Fraktur-Regular-CTYiF6lA.woff2
- assets/KaTeX_Fraktur-Regular-Dxdc4cR9.woff
- assets/KaTeX_Main-Bold-Cx986IdX.woff2
- assets/KaTeX_Main-Bold-Jm3AIy58.woff
- assets/KaTeX_Main-Bold-waoOVXN0.ttf
- assets/KaTeX_Main-BoldItalic-DxDJ3AOS.woff2
- assets/KaTeX_Main-BoldItalic-DzxPMmG6.ttf
- assets/KaTeX_Main-BoldItalic-SpSLRI95.woff
- assets/KaTeX_Main-Italic-3WenGoN9.ttf
- assets/KaTeX_Main-Italic-BMLOBm91.woff
- assets/KaTeX_Main-Italic-NWA7e6Wa.woff2
- assets/KaTeX_Main-Regular-B22Nviop.woff2
- assets/KaTeX_Main-Regular-Dr94JaBh.woff
- assets/KaTeX_Main-Regular-ypZvNtVU.ttf
- assets/KaTeX_Math-BoldItalic-B3XSjfu4.ttf
- assets/KaTeX_Math-BoldItalic-CZnvNsCZ.woff2
- assets/KaTeX_Math-BoldItalic-iY-2wyZ7.woff
- assets/KaTeX_Math-Italic-DA0__PXp.woff
- assets/KaTeX_Math-Italic-flOr_0UB.ttf
- assets/KaTeX_Math-Italic-t53AETM-.woff2
- assets/KaTeX_SansSerif-Bold-CFMepnvq.ttf
- assets/KaTeX_SansSerif-Bold-D1sUS0GD.woff2
- assets/KaTeX_SansSerif-Bold-DbIhKOiC.woff
- assets/KaTeX_SansSerif-Italic-C3H0VqGB.woff2
- assets/KaTeX_SansSerif-Italic-DN2j7dab.woff
- assets/KaTeX_SansSerif-Italic-YYjJ1zSn.ttf
- assets/KaTeX_SansSerif-Regular-BNo7hRIc.ttf
- assets/KaTeX_SansSerif-Regular-CS6fqUqJ.woff
- assets/KaTeX_SansSerif-Regular-DDBCnlJ7.woff2
- assets/KaTeX_Script-Regular-C5JkGWo-.ttf
- assets/KaTeX_Script-Regular-D3wIWfF6.woff2
- assets/KaTeX_Script-Regular-D5yQViql.woff
- assets/KaTeX_Size1-Regular-C195tn64.woff
- assets/KaTeX_Size1-Regular-Dbsnue_I.ttf
- assets/KaTeX_Size1-Regular-mCD8mA8B.woff2
- assets/KaTeX_Size2-Regular-B7gKUWhC.ttf
- assets/KaTeX_Size2-Regular-Dy4dx90m.woff2
- assets/KaTeX_Size2-Regular-oD1tc_U0.woff
- assets/KaTeX_Size3-Regular-CTq5MqoE.woff
- assets/KaTeX_Size3-Regular-DgpXs0kz.ttf
- assets/KaTeX_Size4-Regular-BF-4gkZK.woff
- assets/KaTeX_Size4-Regular-Dl5lxZxV.woff2
- assets/KaTeX_Size4-Regular-DWFBv043.ttf
- assets/KaTeX_Typewriter-Regular-C0xS9mPB.woff
- assets/KaTeX_Typewriter-Regular-CO6r4hn1.woff2
- assets/KaTeX_Typewriter-Regular-D3Ib7_Hf.ttf
- assets/pages-BFsxU23U.css
- assets/saved-library-DEcVZfaU.css
- assets/settings-DowWDxkG.css
- background.js
- chunks/arc-Ld5tJU6z.js
- chunks/architecture-7EHR7CIX-DqR0Fhp2.js
- chunks/architectureDiagram-3BPJPVTR-COgoUU9Y.js
- chunks/array-BifhSqXX.js
- chunks/blockDiagram-GPEHLZMM-f5cl39PI.js
- chunks/c4Diagram-AAUBKEIU-BzhikL9y.js
- chunks/channel-ulctMn7c.js
- chunks/chunk-2J33WTMH-CaoW0jQH.js
- chunks/chunk-3OPIFGDE-DHd55AT6.js
- chunks/chunk-4BX2VUAB-DtY8nmUT.js
- chunks/chunk-55IACEB6-Bf6DVK7P.js
- chunks/chunk-5ZQYHXKU-M-68Dbwj.js
- chunks/chunk-727SXJPM-CIt1jRrZ.js
- chunks/chunk-AQP2D5EJ-BPahT-8I.js
- chunks/chunk-BSJP7CBP-BbYAAbdG.js
- chunks/chunk-CSCIHK7Q-fG7ucgtP.js
- chunks/chunk-FMBD7UC4-DwhUqpb_.js
- chunks/chunk-KSCS5N6A-Belmwd47.js
- chunks/chunk-L5ZTLDWV-CmrHB1Bw.js
- chunks/chunk-LZXEDZCA-Doi5YGHQ.js
- chunks/chunk-ND2GUHAM-Dnmy6U5I.js
- chunks/chunk-NZK2D7GU-C3MWuKyb.js
- chunks/chunk-O5CBEL6O-BHj42uxj.js
- chunks/chunk-QZHKN3VN-DQG6cUBz.js
- chunks/chunk-WU5MYG2G-LOnZcnrV.js
- chunks/chunk-XPW4576I-sdLG5Six.js
- chunks/circuit-CWr0Yo3w.js
- chunks/classDiagram-4FO5ZUOK-Dg78Tm-4.js
- chunks/classDiagram-v2-Q7XG4LA2-Dg78Tm-4.js
- chunks/compile-C-gDeco8.js
- chunks/cose-bilkent-S5V4N54A-BJv5neFv.js
- chunks/cytoscape.esm-FqbQrHcz.js
- chunks/dagre-BM42HDAG-CrRp_eHy.js
- chunks/dagre-Bx709z4p.js
- chunks/dagre.esm-DoWWf988.js
- chunks/defaultLocale-C8Fc0cco.js
- chunks/diagram-2AECGRRQ-C-WBqUQ4.js
- chunks/diagram-5GNKFQAL-i9oJ33Zs.js
- chunks/diagram-KO2AKTUF-Difc5uo6.js
- chunks/diagram-LMA3HP47-BbkKULZZ.js
- chunks/diagram-OG6HWLK6-HplfMUBQ.js
- chunks/dist-ZzD3TEvk.js
- chunks/erDiagram-TEJ5UH35-Cw_T5cCE.js
- chunks/eventmodeling-FCH6USID-B3PvhAvS.js
- chunks/flowDiagram-I6XJVG4X-CXrsgbaf.js
- chunks/fonts-ehkX-Bab.js
- chunks/ganttDiagram-6RSMTGT7-D0LijKmz.js
- chunks/gitGraph-WXDBUCRP-BR_QZSYy.js
- chunks/gitGraphDiagram-PVQCEYII-Vw0DmQwq.js
- chunks/graph-BMM5Yo9D.js
- chunks/graphlib-B8gBHxth.js
- chunks/html2canvas-C8d_9WN1.js
- chunks/index.es-az23h7Av.js
- chunks/info-J43DQDTF-TQWhNeSZ.js
- chunks/infoDiagram-5YYISTIA-VUgJSEjK.js
- chunks/init-D6jRqBbL.js
- chunks/ishikawaDiagram-YF4QCWOH-BdPjvJUF.js
- chunks/journeyDiagram-JHISSGLW-8Whiyzy8.js
- chunks/jspdf.es.min-C1nOG79b.js
- chunks/kanban-definition-UN3LZRKU-u5XcZqUf.js
- chunks/leftovers-D5IX5UYF.js
- chunks/line-BmdOq0r5.js
- chunks/linear-Dq3g6dCH.js
- chunks/mermaid-parser.core-DRmqNFwm.js
- chunks/mermaid.core-HuoTWR4f.js
- chunks/mindmap-definition-RKZ34NQL-BQiBB8X1.js
- chunks/options-ay3XsngT.js
- chunks/ordinal-hYBb2elL.js
- chunks/packet-YPE3B663-DgZIQYul.js
- chunks/pages-DN9i6tkC.js
- chunks/path-BWPyau1x.js
- chunks/pdf-CT4Gh563.js
- chunks/pie-LRSECV5Y-Dr82NZIo.js
- chunks/pieDiagram-4H26LBE5-BgP81h53.js
- chunks/pipeline-DOx4Pfjj.js
- chunks/plot-But0TB8I.js
- chunks/popup-DYVtyDUx.js
- chunks/quadrantDiagram-W4KKPZXB-C7Uu9PgN.js
- chunks/radar-GUYGQ44K-CdDl1pPo.js
- chunks/requirementDiagram-4Y6WPE33-CqMlm76h.js
- chunks/rough.esm-CSKSodPl.js
- chunks/sankeyDiagram-5OEKKPKP-Blmu14ot.js
- chunks/saved-library-C94_Wns-.js
- chunks/saved-library-CBIfWOiq.js
- chunks/saved-sessions-CBPZon7Q.js
- chunks/scene-BxjBT7ci.js
- chunks/sequenceDiagram-3UESZ5HK-C0a4klCs.js
- chunks/settings-Cy5e-sxn.js
- chunks/slk-uYmJLy8o.js
- chunks/src-Birs_PWd.js
- chunks/stateDiagram-AJRCARHV-BIbSoX5G.js
- chunks/stateDiagram-v2-BHNVJYJU-DkrI1wPD.js
- chunks/table-AXFk5Adh.js
- chunks/timeline-definition-PNZ67QCA-DcNPoTMc.js
- chunks/treemap-LRROVOQU-BFvtoTcB.js
- chunks/treeView-BLDUP644-DSE2bIBX.js
- chunks/vennDiagram-CIIHVFJN-DxOIuZ94.js
- chunks/wardley-L42UT6IY-BrlGlZ7k.js
- chunks/wardleyDiagram-YWT4CUSO-Cqr_cL2J.js
- chunks/xychartDiagram-2RQKCTM6-BdHRX3k9.js
- content-scripts/content.css
- content-scripts/content.js
- icon/128.png
- icon/16.png
- icon/32.png
- icon/48.png
- icon/dark-128.png
- icon/dark-16.png
- icon/dark-32.png
- icon/dark-48.png
- icon/light-128.png
- icon/light-16.png
- icon/light-32.png
- icon/light-48.png
- manifest.json
- options.html
- pdf.html
- popup.html
- saved-library.html

## Audit evidence

- Runtime graph roots: `wxt.config.ts`, `entrypoints/background.ts`, `entrypoints/content/index.ts`, `entrypoints/popup/main.tsx`, `entrypoints/options/main.tsx`, `entrypoints/pdf/main.ts`, and `entrypoints/saved-library/main.tsx`.
- The static graph resolved 132 reachable non-test runtime source files and reported 0 missing local imports.
- The generated manifest points to `background.js`, `content-scripts/content.js`, `popup.html`, `options.html`, `pdf.html`, `saved-library.html`, and `icon/{16,32,48,128}.png`; public icons match those paths.

## Findings and batch log

### Ranked findings

- `delete:` Finished Figure Lab and experiment artifacts are not loaded by the shipped extension and have no surviving test/script/CI caller; retain the plan-owned lab config and the L4 probe consumed by a surviving test. [artifacts/figlab/schema-first/**, artifacts/figlab/renders/**]
- `delete:` Generated PDF, Playwright, and QA output is neither shipped nor read as an input by surviving code; regenerate it on demand. [output/**]
- `delete:` Unreferenced temporary brand drafts and previews are not imported by runtime code or icon generation; keep the eight inputs used by `scripts/gen-icons.mjs` and `src/components/brand.tsx`. [temp-icon/stemlm-brand.html, temp-icon/stemlm-icon-accent.svg, temp-icon/stemlm-icon.svg, temp-icon/stemlm-logo-split.svg, temp-icon/stemlm-mark-animated-inverse.svg, temp-icon/stemlm-mark-animated.svg, temp-icon/stemlm-mark-inverse.svg, temp-icon/stemlm-mark-mono.svg, temp-icon/stemlm-mark.svg]
- `delete:` Standalone eval launchers have no package, CI, or surviving script caller; the maintained `run-eval.mjs` and its two loader hooks remain. [scripts/eval/inject-launch.mjs, scripts/eval/parse-golden.mjs]
- `delete:` The composer QA launcher and its sole entry module have no package, CI, or surviving script caller; permanent source tests remain. [scripts/qa-composer-dock.mjs, scripts/qa/dock-entry.ts]
- `yagni:` The progress rail component has no runtime, test, script, or CI consumer, but it remains because `src/components/**` is frozen by AGENTS.md; its CSS is also still part of the shipped panel stylesheet. [src/components/ProgressRail.tsx]
- `delete:` The figure barrel has no runtime, test, script, or CI consumer; surviving production imports are direct. [src/lib/figure/index.ts]
- `yagni:` `smiles-drawer`, `wavedrom`, and `@types/dompurify` have no surviving source/runtime import; `package.json` is frozen by the repo contract, so no dependency was removed. [package.json]
- `native:` No safe candidate found without source refactoring or editing frozen platform files. [none]
- `stdlib:` No safe candidate found without source refactoring or editing frozen files. [none]
- `shrink:` No safe candidate found that preserves the built file-list contract without source refactoring. [none]

### Preservation and graph evidence

- Copied 154,485 bytes to `docs/history/`: `CHANGELOG.md`, `TRENDS.md`, `backlog.md`, `emitter-instruction.v1.txt`, `blind-dev-sample.json`, `blind-heldout-sample.json`, and `p3-scorer-rubric.md`. The copies were hash-verified before deletion.
- `artifacts/figlab/probes/L4.json` remains at 2,299 bytes because `src/lib/figure/l4-graph.test.ts` reads it.
- The requested lab inventory was enumerated before pruning: 237 `*.lab.ts`/`*.lab.tsx` files, 830,212 bytes, all under ignored Figure Lab artifacts; no surviving package, test, script, or CI step invokes them.
- `docs/protocol-gap-inventory.md` and `docs/eval-rubric.md` were read and retained; the former is a maintained gap ledger and the latter is referenced by the eval workflow/manual QA.
- `docs/legal/**`, `public/**`, and `assets/**` were retained. The manifest's four icon paths resolve to `public/icon/{16,32,48,128}.png`.
- Direct dependency inspection found `sharp` in the retained production `scripts/gen-icons.mjs` and `src/components/brand.test.tsx`; it is not lab-only and was retained. No dependency or lockfile was changed.
- The runtime graph was traced from `wxt.config.ts`, all six entrypoint roots, and the generated manifest before pruning. The resolver found 132 reachable non-test source files and 0 missing local imports. No test under `src/` or `entrypoints/` was deleted.
- The completed Figure Lab verification reported 27 files and 309 tests passed before its generated experiment outputs were pruned.

### Deletion batches and gates

1. `delete` batch: removed 3,583 artifact files (43,718,694 bytes), retaining `artifacts/figlab/probes/L4.json`. The copied history is outside the ignored artifact tree.
2. `delete` batch: removed 491 generated output files (13,201,502 bytes).
3. `delete` batch: removed 9 temporary brand drafts (48,727 bytes).
4. `delete` batch: removed 4 standalone eval/QA files (22,657 bytes).
5. `delete` batch: removed the unreachable figure barrel (745 bytes); the attempted progress-rail deletion was restored because `src/components/**` is frozen by AGENTS.md.
6. `delete` batch: after the concurrent protocol task finished, removed its completed schema-first experiment and generated render outputs: 524 files / 4,801,331 bytes.
7. `delete` batch: after the required post-cleanup gates recreated generated render/PDF scratch, removed those 33 files / 187,963 bytes again.

After the initial deletion batches: `pnpm compile` exited 0; `pnpm test -- --reporter=dot` passed 106/106 test files and 1,283/1,283 tests; `pnpm build` exited 0. After the later completed-lab cleanup, the same gates passed with 106/106 test files and 1,286/1,286 tests.

### Final measurements

- Repository tree: 495,088,853 bytes before; 438,305,453 bytes after, a measured net reduction of 56,783,400 bytes (56.783400 MB). The after measurement includes `.git`, matching the baseline scope.
- `artifacts/`: 3,584 files / 43,720,993 bytes before; 2 files / 2,728 bytes after: `vitest.figlab.config.ts` and `probes/L4.json`.
- `output/`: 491 files / 13,201,502 bytes before; 0 files / 0 bytes after.
- `temp-icon/`: 17 files / 66,254 bytes before; 8 files / 17,527 bytes after.
- `scripts/`: the four deleted files are gone; 4 maintained scripts remain, totaling 17,055 bytes.
- `.output/chrome-mv3/`: 182 files / 12,999,714 bytes before; 182 files / 13,021,465 bytes after. The normalized logical file list is identical (131 entries, 0 missing, 0 extra); WXT content-hash suffixes changed on 90 generated names between builds, as expected. This is the accepted built-extension contract: the audit added or removed no built file. The prior +21,804-byte size change is from the concurrent schema-first protocol edit, which grew `src/protocol/core-protocol.md` from 13,270 to 24,177 bytes, not from this audit; that byte invariant is waived.

Removed paths are the complete recursive artifact/output scopes and the explicit files listed in the ranked findings. The only pre-existing source deletion visible in the worktree, `src/lib/figure/leftovers/rest.ts`, was not part of this audit and is not counted above.

### Workspace concurrency note

The after measurements above are the current post-cleanup snapshot after the separate `Refactor protocol template grammar` task released the workspace. Its completed `artifacts/figlab/schema-first/**` and generated render outputs were then removed as finished experiments. The required `pnpm test` and `pnpm build` runs recreated 33 generated files, which were removed again after those gates.

`artifacts/figlab/STATE.md` was gitignored lab scratch inside the directory this goal explicitly pruned, and belonged to a permanently stopped loop. Its deletion is accepted and instructed; its conclusions survive in `docs/history/TRENDS.md`, `docs/history/backlog.md`, and `docs/history/CHANGELOG.md`. It is not recreated.

net: -4,080 files, -56.783400 MB, -0 deps
