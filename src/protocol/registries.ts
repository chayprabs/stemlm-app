/**
 * Compact registries shipped in stemlm-protocol.txt.
 *
 * Diagram rows are generated from the shipped FAMILY_CATALOG so the protocol
 * cannot invent compiler syntax. Archetype / verification / follow-up /
 * when-not-to-draw are imperative tables, not subject essays.
 */
import {
  FAMILY_CATALOG,
  REFUSE_FAMILIES_SET,
  SPEC_FAMILIES,
  type FamilyDef,
} from '@/src/lib/figure/catalog';
import { FAMILY_MANIFESTS } from '@/src/lib/figure/families/manifest';
import { SUBJECT_REGISTRY } from './playbooks';
import type { Archetype, VerifyMethod } from './types';
function keysOf(def: FamilyDef): string {
  const parts: string[] = [];
  if (def.required?.length) parts.push(`need:${def.required.join(',')}`);
  if (def.requiredAny?.length) parts.push(`any:${def.requiredAny.join('|')}`);
  if (def.variants) {
    for (const [kind, variant] of Object.entries(def.variants)) {
      parts.push(`${[kind, ...(variant.aliases ?? [])].join('/')}=>${variant.allowed.join('|')}`);
    }
  }
  return parts.join(' ') || 'keys:see-engine';
}

const CATALOG_ENTRIES: Array<[string, FamilyDef]> = [
  ...Object.entries(FAMILY_CATALOG),
  ['ladder', FAMILY_CATALOG.ladder!],
];
const CATALOG_TYPES = new Set(CATALOG_ENTRIES.map(([type]) => type));
// D2: a family is advertised only when a subject row names it at top level; parenthesised text lists an
// engine's variants (scene(ray) is scene kind: ray, not the ray template).
const SUBJECT_DIAGRAM_FAMILIES = new Set(
  Object.values(SUBJECT_REGISTRY)
    .flatMap(({ diagrams }) => diagrams.replace(/\([^)]*\)/g, '').match(/[a-z][a-z0-9.-]*/gi) ?? [])
    .map((type) => type.toLowerCase())
    .filter((type) => CATALOG_TYPES.has(type)),
);

function isAdvertised(type: string, def: FamilyDef): boolean {
  return def.kind === 'engine' || SUBJECT_DIAGRAM_FAMILIES.has(type);
}

/** One line per compiler family — appended to the attached file. */
export function renderDiagramRegistry(): string {
  // ponytail: engine summaries stay beside catalog rows because fallback omits this registry.
  const engines: string[] = [];
  const leftovers: string[] = [];
  const refuse: string[] = [];
  for (const [type, def] of CATALOG_ENTRIES) {
    if (def.kind === 'hatch') continue;
    if (def.kind === 'refuse') {
      refuse.push(type);
      continue;
    }
    if (!isAdvertised(type, def)) continue;
    const row = `${type}\t${keysOf(def)}`;
    if (def.kind === 'engine') engines.push(row);
    else leftovers.push(row);
  }
  engines.sort();
  leftovers.sort();
  refuse.sort();
  return [
    'DIAGRAM REGISTRY — compiler draws; name ids. NEVER <svg>, viewBox, path d=, text x= y=, markers, AI images.',
    'Use ENGINE types first, then the subject row; TEMPLATE only when row names it.',
    'ENGINE',
    'type\tkeys',
    ...engines,
    'ENGINE SCHEMAS — the `any` column is admission only, not an allowed-key list. plot data: x,y; x,y; scene kind: fbd uses body/force/axes; graph edge: from to label words; rankdir: LR|TB|TD; highlight: declared node. never emit `kind:` as a graph key; start/accept/decision/terminal: declared node ids; table rows: choose comma or semicolon for each whole row; use semicolons if a cell has commas; no commas in semicolon cells; never mix or pipe-delimit; circuit std ieee|iec; device V/R/C/L/I/D/M/S n1 n2 value; A n1 n2 n3; Q C B E npn|pnp; M D G S nmos|pmos; wire endpoint endpoint; probe/highlight; no wire_top/wire_bottom.',
    'TEMPLATE',
    'type\tkeys',
    ...leftovers,
    'TEMPLATE SAFE FORMS — unknown: omit. hash\tm: integer 1..10; buckets: bucket:value; array cells/rows; phasor vec LABEL magnitude∠degrees. Full grammar: TEMPLATE FORMS.',
    'Unlisted families mean OMIT (including bz,dq,knot,mospi,rama and any template not listed above).',
    'REFUSE — OMIT @diagram for these (do not emit a spec): ' + refuse.join(', '),
    'FLOW/STATE: flowcharts, state machines and automata are type=graph (decision:, terminal:, start:, accept:); a message sequence is an ordered type=table. NEVER emit type=svg or type=mermaid.',
  ].join('\n');
}

/**
 * The pack families' grammar: one line and one compiling specimen each, read from the manifest
 * the compiler is registered with, so the guide cannot describe a form the compiler rejects.
 */
export function renderFamilyForms(): string {
  return [
    'FAMILY FORMS — one grammar line and one specimen per family; replace every value with question content. Where a family computes its result (truth-table rows, a gate network, a fitted line, a shaded probability), give the inputs only and NEVER supply the derived values.',
    ...FAMILY_MANIFESTS.flatMap((manifest) => {
      // The manifest writes its grammar as `token: …`; the SCHEMA line already names the family.
      const grammar = manifest.grammar.startsWith(`${manifest.token}: `) ? manifest.grammar.slice(manifest.token.length + 2) : manifest.grammar;
      const key = (manifest.required ?? manifest.requiredAny ?? manifest.keys)[0];
      return [
        `SCHEMA ${manifest.token} key=${key} :: ${grammar}. SPECIMEN follows.`,
        `@diagram id=f${manifest.token} type=${manifest.token}`,
        manifest.specimen,
        '@enddiagram',
      ];
    }),
  ].join('\n');
}

export function catalogSpecTypes(): string[] {
  return [...SPEC_FAMILIES].sort();
}

export function catalogRefuseTypes(): string[] {
  return [...REFUSE_FAMILIES_SET].sort();
}

export const ARCHETYPE_ROWS: Record<Archetype, string> = {
  numeric:
    'Compact givens+units → name the law → @formula symbols only → @body define new symbols, substitute givens, show arithmetic with units → report the result. Group parallel equations or unknowns in one meaningful solve step. LAST step = verification. NEVER a "plug in later" step.',
  symbolic:
    'Goal → name the identity/theorem → apply it and show the short connected simplification that completes this goal. @formula = the relation; @body = why it applies and the rewritten form. Split only when the next transformation has a different purpose.',
  proof:
    'Assume/given → build one logical inference chain with named rules → conclude. NEVER a "plug into the formula" step. NEVER numeric substitution unless the claim is numeric. Split when the proof changes lemma or strategy, not after every line.',
  design:
    'Specs/constraints → choose a topology/structure → group related sizing or selection work → check the deciding constraints. Diagram only a material visual state change, always as the complete artifact. Flag unmet constraints in @uncertainty.',
  comparison:
    'Name the criterion → evaluate option A on that criterion (one step) → evaluate option B → verdict with the deciding quantity. NEVER mix two criteria in one step.',
  conceptual:
    'Definition in the problem\'s terms → mechanism/why → one consequence → a common misconception check. @formula only if a named law is stated. Diagram only if spatial/structural.',
  code:
    'Restate constraints compactly → approach → trace one meaningful state transition on a concrete input (group trivial adjacent operations) → correctness + $O(\\cdot)$. Code as inline `code` NEVER a fence. Diagram the complete state AFTER the transition, not the algorithm in the abstract.',
  lab:
    'Raw data + units + instrument precision → group the connected reductions (mean, slope, calibration) that produce one result → propagate uncertainty → report value ± uncertainty. Split only when the analysis goal changes. Diagram apparatus (scene) or the plot of the material visual state.',
  estimation:
    'Identify scale → Fermi breakdown into 2–5 factors with stated sources → evaluate related factors compactly → combine → order-of-magnitude check against a known scale. Flag every assumed factor in @uncertainty.',
};

export function renderArchetypeRegistry(): string {
  return [
    'ARCHETYPE REGISTRY — set @meta archetype: to exactly one token. The row dictates step grammar.',
    'token\tstep grammar',
    ...Object.entries(ARCHETYPE_ROWS).map(([k, v]) => `${k}\t${v}`),
  ].join('\n');
}

export const VERIFY_ROWS: Record<VerifyMethod, string> = {
  dimensional: 'Every term in the governing equation has identical dimensions. Fail → @verify status: fail and a visible @correction step, not a silent rewrite.',
  units: 'Every numeric result carries coherent units; conversions are explicit.',
  limit: 'A boundary (x→0, open-circuit, T→∞, R→0) recovers a known result.',
  oom: 'The magnitude matches a back-of-envelope scale (or a textbook order).',
  backsub: 'After deriving the result, show its substitution into the original equation / ICE table / KCL node and the value recovered within rounding.',
  conservation: 'After deriving the result, show the substituted mass, charge, energy, momentum, or KCL/KVL balance and the value recovered.',
  alt: 'A second method (Thevenin vs nodal, energy vs Newton, induction vs direct) agrees.',
};

export function renderVerificationRegistry(): string {
  return [
    'VERIFICATION REGISTRY — last @step performs and shows a check; emit @verify with the tested expression and recovered value. Never claim a check before its result is derived. On fail, add a visible correction @step naming error and set status: fail; NEVER silently replace value.',
    'method\trule',
    ...Object.entries(VERIFY_ROWS).map(([k, v]) => `${k}\t${v}`),
    'Pick applicable methods. Numeric: units + dimensional + one of limit|oom|backsub. Proof: alt/lemma. Lab: units + uncertainty. Code: trace + complexity.',
  ].join('\n');
}

export function renderFollowupRegistry(): string {
  return [
    'FOLLOW-UP CONTRACT — classify the student message. Emit @meta mode: and qid: of the CURRENT question unless off-topic.',
    'case\taction\temit',
    'step N is wrong\tPATCH replace that step id; keep other ids\tmode: patch ; @patch op=replace id=sN then the corrected @step',
    'solve it another way\tRESOLVE full re-emission, same qid, new method\tmode: resolve ; full @step list, new ids s1…',
    'explain it simpler\tPATCH rewrite @body/@formula of named ids; keep ids\tmode: patch ; @patch op=replace per simplified step',
    'change this value and redo\tRESOLVE with the new given, same qid\tmode: resolve ; @meta question: restates the changed given',
    'add a step\tPATCH insert after the named id\tmode: patch ; @patch op=insert after=sN then @step id=sNa',
    'off-topic / new problem\tNEW question object\tmode: new ; @q id=q<next> (do not overwrite q1)',
    'revert last patch\tPATCH restore the last patched step id; if unknown, RESOLVE same qid\tmode: patch ; @patch op=replace the last patched id',
    'only the diagram is wrong\tPATCH that step\'s @diagram; keep @body and ids\tmode: patch ; @patch op=replace id=sN with same @body, corrected @diagram',
    'translate this\tPATCH rewrite title/body/solution in the requested language; keep ids, math, specs\tmode: patch',
    'hint, don\'t solve\tPATCH add a hint or rewrite @body as a hint; NEVER dump the final numeric answer\tmode: patch',
    'check my working\tPATCH mark each student line; do not replace with a fresh solve unless a line is wrong\tmode: patch',
    'multiple-choice\tRESOLVE; one @step names the correct option and why others fail; same qid\tmode: resolve',
    'skip to the answer\tstructure still wins: emit full steps; @solution restates the answer\tmode: resolve',
    'change two givens\tRESOLVE with both new givens, same qid\tmode: resolve ; @meta question: restates both changed givens',
    'explain this formula only\tPATCH the named formula step; OMIT a new homework blob\tmode: patch',
    'empty follow-up\tNO-OP; emit nothing and do not open a new @q\t(no capsule)',
    'Ask-in-chat NEVER looks like a new homework blob. Patch/resolve stay on the current qid. Off-topic is the only path that opens a new @q. Empty follow-up is a no-op.',
  ].join('\n');
}

export function renderWhenNotToDraw(): string {
  return [
    'WHEN NOT TO DRAW — OMIT @diagram if ANY:',
    '1. No spatial/topological/visual/apparatus state change.',
    '2. Pure algebra/rearrangement of a used relation; the figure is unchanged.',
    '3. Definition/vocabulary step with no structure.',
    '4. Unit conversion, rounding, or numeric arithmetic.',
    '5. Family is REFUSE.',
    '6. Text/copyrighted source: original spec or OMIT; never infer.',
    'Text/tabular source: keep its table/list/code layout; never substitute graph.',
    'Transformation: show input, every structural/data-state change, and output; never only endpoint.',
    'Unchanged figure: OMIT. If one element changes, emit the FULL new state and highlight it.',
    'Max one @diagram/@step; never a non-visual "for completeness" diagram.',
  ].join('\n');
}

export function renderNotationLocale(): string {
  return [
    'NOTATION LOCALE — infer from the problem text/figures; put the choice in @meta locale:. NEVER mix conventions mid-solution.',
    'field\trule',
    'units\tSI unless the problem uses imperial/USCS; then stay imperial and say so in @uncertainty.',
    'decimal\t`.` unless the problem uses `,` as the decimal mark; then match the problem.',
    'sigfig\tFinal numbers match the least precise given. Keep one guard digit in intermediate @body lines and state it.',
    'circuit\tstd: ieee for US symbols, else iec; locale circuit=IEEE|IEC; copy to diagram std; NEVER mix.',
    'g\tUse the value given. If missing: 9.81 m/s^2 and list it under @uncertainty assumption:. NEVER silently use 10 or 9.8.',
    'angles\tRadians in analysis unless the problem states degrees; convert explicitly.',
    'current\tPassive sign convention unless the problem draws otherwise. State the choice once.',
  ].join('\n');
}

export function renderLevelDial(): string {
  return [
    'LEVEL DIAL — infer from vocabulary, given structure, and named theorems. Set @meta level:. DEPTH deep makes each needed move explicit inside that band; it never adds moves by itself.',
    'band\tinfer when\twrite',
    'intro\tfind/calculate + high-school vocabulary, few givens\tName the law in words, substitute every given, keep symbols defined in English.',
    'undergrad\tstandard UG course (nodal, ICE, RREF, FBD, Punnett)\tName the law, state why it applies, group connected work into meaningful steps, and emit compiler-safe semantic specs.',
    'advanced\tmasters language (Laplace-domain control, McCabe, MAG, Hilbert)\tState hypotheses/assumptions of the theorem; justify dropping terms.',
    'research\tPhD/research (QFT Feynman, Banach, MAG noise figure, original design)\tName the framework, the approximation, and the validity region. Do not patronize with intro analogies.',
    'intro + DEPTH deep\tDEPTH is deep and level is intro\tShow necessary connecting algebra and name substitutions inside the same meaningful step. NEVER split work merely to look deep; NEVER switch to research jargon.',
    'LEGACY COMPATIBILITY — “At intro, DEPTH deep adds skipped algebra and named substitutions” / “Add skipped algebra and named substitutions” do NOT authorize extra steps. They mean: show necessary connecting algebra inside the same meaningful move.',
    'NEVER talk down to research; NEVER skip symbol definitions at intro. Student "in Hindi" (or any language) wins for OUTPUT LANGUAGE only — structure, diagrams, and verification still apply.',
  ].join('\n');
}

const SOFT_LANGUAGE = [
  'should ideally',
  'try to',
  'where possible',
  'if you can',
  'feel free',
  'you may want',
];

/** True when a protocol string contains banned hedging. */
export function hasSoftLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return SOFT_LANGUAGE.some((p) => lower.includes(p));
}
