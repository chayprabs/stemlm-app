# AGENTS.md — stemLM

> Added 2026-08-28 for the Figure Fidelity work. It is deliberately short: this file is loaded
> into **every** session and subagent in this repo, so it carries only the rules that must survive
> context loss. Delete it when that work is finished.

## The contract

`the external figure-fidelity plan`

Read it before doing anything. It defines the phases, the file-ownership map, the gates, and the
acceptance criteria. This file does not replace it and does not summarise it.

Your working directory is `artifacts/figlab/` (gitignored). `artifacts/figlab/STATE.md` is the
resume point — read it first if you are picking up an interrupted run.

## What this repo is

An MV3 browser extension. The model answers in one fenced `stemlm` capsule; figures inside it are
typed `key: value` **specs** in a small DSL, and **the extension compiles them to SVG locally with
no LLM in the render path**. Two subsystems decide figure quality:

- **ASK** — `src/protocol/` — the attached instruction file that teaches the DSL.
- **COMPILE** — `src/lib/figure/` — catalog → engine → Scene IR → layout kernel → SVG.

## The principle

**Generalize, never memorize.** Derive the rule under a figure *class*; never encode a specific
figure, question, value, component set, or molecule. Before any change, answer: *which problems
NOT in the training corpus does this help?* If none, discard it.

Two guard tests enforce this (`src/protocol/no-hardcoding.test.ts`,
`src/extension-runtime-no-hardcoding.test.ts`). They stay green and are never edited.

## Never

1. **No destructive git.** Never `checkout`, `reset`, `clean`, `stash`, `rm`, `commit`, `push`,
   `restore`, `branch -D`. `status` / `diff` / `log` are fine. **This machine runs
   `approval_policy = "never"` with full filesystem access — nothing will stop you. These rules
   are the only safety net there is.**
2. **Never delete, skip, weaken, or rewrite an existing test to make it pass.** No `.skip`, no
   `.only`, no loosened assertion. If an existing test fails, *your change is wrong* — revert the
   change, not the test.
3. **Never edit a file outside your lane's ownership** (plan §7.3). Append a change request to
   `artifacts/figlab/requests/<lane>.md` instead.
4. **Never add a dependency.** `dagre`, `smiles-drawer`, `wavedrom`, `katex`, `mermaid`, `sharp`
   are already installed. Never elkjs, jcampconverter, `expr-eval@2.0.2`, RDKit, Ketcher,
   CircuitJS, ChemDoodle (size / license / CVE — see `docs/diagram-compiler-research.md` §7.1, §24).
5. **Never `eval` or `new Function`.** MV3 forbids it; WASM needs `wasm-unsafe-eval`, which this
   extension does not declare. The in-house Pratt parser exists for exactly this reason.
6. **Never invent a `type=` token.** A family exists only if `FAMILY_CATALOG` has it, and is added
   only when a real engine renders it faithfully. Never re-add a `refuse` family.
7. **Never ship a figure that is wrong.** A wrong drawing is strictly worse than none. If a spec
   cannot be rendered faithfully, return `{ ok: false, code, reason }` — `DiagramRenderer` already
   shows the spec source, and that is the correct outcome. **An engine that returns `ok: true` on a
   spec it ignored is the worst failure mode in this codebase.**
8. **Never emit `<svg>`, `viewBox`, `path d=`, `text x= y=`, `width`, `height`, or `#000`** from
   protocol text. The compiler owns bounds and colour.

## Frozen files

`src/protocol/parser.ts`, `apply.ts`, `classifier.ts`, `score.ts`; `src/state/**`;
`src/platforms/**`; `entrypoints/**`; `package.json`; `wxt.config.ts`; both no-hardcoding guards.

`src/content/controller.ts` and `src/components/**` are frozen **except** for plan §16 (P7), which
only the integrator may do, only in that phase, and only within that section's enumerated scope.

## Verify

```bash
pnpm compile                                   # tsc --noEmit
pnpm test                                      # full vitest suite (happy-dom)
npx vitest run src/lib/figure                  # scoped + fast, use this during a lane
pnpm build                                     # wxt production build
npx vitest run --config artifacts/figlab/vitest.figlab.config.ts   # the Figure Lab
```

**Measured baseline on the committed tree, 2026-08-28:** `pnpm compile` clean (exit 0);
`pnpm test` → **82 files, 967 tests, 967 passed, 0 failed**. **967 is the floor** — never go below
it, and never reach it by weakening a test.

Never claim something works without the command output that proves it. Never estimate a number you
could measure. Every new test must be shown to fail before your change and pass after.

## House style

Match the surrounding code: comment density, naming, and idiom. Engines build Scene IR through
`SceneBuilder` and return `layoutAndCompile(...)`; they never emit SVG strings directly. Strokes
carry **semantic** colours (`neutral | accent | muted | danger | guide`), never hex.

## Environment

Windows. PowerShell 5.1 has no `&&` / `||` — use `;` with `if ($?)`, or a POSIX shell, but never
mix the two in one command. The training corpus lives on OneDrive and is slow: index it once into
JSON and never re-walk it.
