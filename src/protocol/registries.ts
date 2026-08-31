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
import { SUBJECT_REGISTRY } from './playbooks';
import type { Archetype, VerifyMethod } from './types';

export const PROTOCOL_EMIT_VERSION = 2;

function keysOf(def: FamilyDef): string {
  const parts: string[] = [];
  if (def.required?.length) parts.push(`need:${def.required.join(',')}`);
  if (def.requiredAny?.length) parts.push(`any:${def.requiredAny.join('|')}`);
  return parts.join(' ') || 'keys:see-engine';
}

const CATALOG_ENTRIES: Array<[string, FamilyDef]> = [
  ...Object.entries(FAMILY_CATALOG),
  ['ladder', FAMILY_CATALOG.ladder!],
];
const CATALOG_TYPES = new Set(CATALOG_ENTRIES.map(([type]) => type));
const SUBJECT_DIAGRAM_FAMILIES = new Set(
  Object.values(SUBJECT_REGISTRY)
    .flatMap(({ diagrams }) => diagrams.match(/[a-z][a-z0-9.-]*/gi) ?? [])
    .filter((type) => CATALOG_TYPES.has(type.toLowerCase()))
    .map((type) => type.toLowerCase()),
);
// Topic-loop demand keeps the five engines; inventory evidence also retains schematic/sphere.
const CORPUS_DEMAND_FAMILIES = new Set(['scene', 'plot', 'table', 'graph', 'circuit', 'schematic', 'sphere']);

function isAdvertised(type: string, def: FamilyDef): boolean {
  if (def.kind === 'engine' || SUBJECT_DIAGRAM_FAMILIES.has(type) || CORPUS_DEMAND_FAMILIES.has(type)) return true;
  return CATALOG_ENTRIES.some(
    ([canonical, candidate]) =>
      (canonical === type || candidate.aliases?.includes(type)) &&
      (SUBJECT_DIAGRAM_FAMILIES.has(canonical) || candidate.aliases?.some((alias) => SUBJECT_DIAGRAM_FAMILIES.has(alias))),
  );
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
    'ENGINE SCHEMAS — the `any` column is admission only, not an allowed-key list. plot data: x,y; x,y; scene kind: fbd uses body/force/axes; graph edge: from to label words; rankdir: LR|TB|TD; highlight: declared node. never emit `kind:` as a graph key; table rows: choose comma or semicolon for each whole row; use semicolons if a cell has commas; no commas in semicolon cells; never mix or pipe-delimit; circuit std ieee|iec; device V/R/C/L/I/D/M/S n1 n2 value; A n1 n2 n3; wire endpoint endpoint; probe/highlight; no wire_top/wire_bottom.',
    'TEMPLATE',
    'type\tkeys',
    ...leftovers,
    'TEMPLATE SAFE FORMS — unknown: omit. hash\tm: integer 1..10; buckets: bucket:value; datapath A,B,C+relation; array cells/rows; isometric gamma,t0; phasor vec LABEL magnitude∠degrees.',
    'Unlisted families mean OMIT (including bz,dq,knot,mospi,rama).',
    'REFUSE — OMIT @diagram for these (do not emit a spec): ' + refuse.join(', '),
    'HATCH: mermaid is CS flow/sequence/state ONLY (quote every node label). NEVER emit type=svg.',
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
    'Givens+units → name the law → @formula symbols only → @body define each symbol, substitute givens, arithmetic with units → isolate one unknown. LAST step = verification. NEVER a "plug in later" step.',
  symbolic:
    'Goal → name the identity/theorem for THIS line → apply once → simplify ONE expression. NEVER two algebra moves in one @step. @formula = the relation; @body = why this identity applies and the rewritten form.',
  proof:
    'Assume/given → deduce one implication → next implication → conclude. NEVER a "plug into the formula" step. NEVER numeric substitution unless the claim is numeric. Each @step is one inference with the named rule.',
  design:
    'Specs/constraints → choose a topology/structure → one sizing/selection move → check against a constraint → next constraint. Diagram the artifact after each change. Flag unmet constraints in @uncertainty.',
  comparison:
    'Name the criterion → evaluate option A on that criterion (one step) → evaluate option B → verdict with the deciding quantity. NEVER mix two criteria in one step.',
  conceptual:
    'Definition in the problem\'s terms → mechanism/why → one consequence → a common misconception check. @formula only if a named law is stated. Diagram only if spatial/structural.',
  code:
    'Restate constraints → approach → trace ONE operation on a concrete input → show DS state after that op → next op → correctness + $O(\\cdot)$. Code as inline `code` NEVER a fence. Diagram the state AFTER the op, not the algorithm in the abstract.',
  lab:
    'Raw data + units + instrument precision → one reduction (mean, slope, calibration) → propagate uncertainty for THAT reduction → next reduction → report value ± uncertainty. Diagram apparatus (echem/scene) or the plot of THIS reduction.',
  estimation:
    'Identify scale → Fermi breakdown into 2–5 factors → one factor per @step with a stated source → combine → order-of-magnitude check against a known scale. Flag every assumed factor in @uncertainty.',
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
  backsub: 'Substitute the result into the original equation / ICE table / KCL node and recover 0 within rounding.',
  conservation: 'Mass, charge, energy, momentum, or KCL/KVL holds on the drawn system.',
  alt: 'A second method (Thevenin vs nodal, energy vs Newton, induction vs direct) agrees.',
};

export function renderVerificationRegistry(): string {
  return [
    'VERIFICATION REGISTRY — last @step verifies; emit @verify. On fail, add a visible correction @step naming error and set status: fail; NEVER silently replace value.',
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
    'LEVEL DIAL — infer from vocabulary, given structure, and named theorems. Set @meta level:. DEPTH deep then scales verbosity inside that band.',
    'band\tinfer when\twrite',
    'intro\tfind/calculate + high-school vocabulary, few givens\tName the law in words, substitute every given, keep symbols defined in English.',
    'undergrad\tstandard UG course (nodal, ICE, RREF, FBD, Punnett)\tName the law, state why it applies, one move per step, textbook diagram spec.',
    'advanced\tmasters language (Laplace-domain control, McCabe, MAG, Hilbert)\tState hypotheses/assumptions of the theorem; justify dropping terms.',
    'research\tPhD/research (QFT Feynman, Banach, MAG noise figure, original design)\tName the framework, the approximation, and the validity region. Do not patronize with intro analogies.',
    'intro + DEPTH deep\tDEPTH is deep and level is intro\tAdd skipped algebra and named substitutions. NEVER switch to research jargon.',
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
