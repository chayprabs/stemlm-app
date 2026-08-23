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
import type { Archetype, VerifyMethod } from './types';

export const PROTOCOL_EMIT_VERSION = 2;

function keysOf(def: FamilyDef): string {
  const parts: string[] = [];
  if (def.required?.length) parts.push(`need:${def.required.join(',')}`);
  if (def.requiredAny?.length) parts.push(`any:${def.requiredAny.join('|')}`);
  return parts.join(' ') || 'keys:see-engine';
}

/** One line per compiler family — appended to the attached file. */
export function renderDiagramRegistry(): string {
  const engines: string[] = [];
  const leftovers: string[] = [];
  const refuse: string[] = [];
  for (const [type, def] of Object.entries(FAMILY_CATALOG)) {
    if (def.kind === 'hatch') continue;
    if (def.kind === 'refuse') {
      refuse.push(type);
      continue;
    }
    const row = `${type}\t${def.kind}\t${keysOf(def)}`;
    if (def.kind === 'engine') engines.push(row);
    else leftovers.push(row);
  }
  engines.sort();
  leftovers.sort();
  refuse.sort();
  return [
    'DIAGRAM REGISTRY — compiler draws; you name ids. NEVER <svg>, viewBox, path d=, text x= y=, markers, AI images.',
    'Emit @diagram id=fN type=<token> then key: value lines, then @enddiagram. Max one @diagram per @step.',
    'Every object named in that step\'s @body MUST appear as a named id in the spec.',
    'Use ENGINE types first, then the subject row; emit a TEMPLATE type only when that row names it.',
    'ENGINE',
    'type\tkind\tkeys',
    ...engines,
    'TEMPLATE',
    'type\tkind\tkeys',
    ...leftovers,
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
    'ARCHETYPE REGISTRY — set @meta archetype: to exactly one token. The row dictates step grammar. A proof MUST NOT grow a numeric-substitution step.',
    'token\tstep grammar',
    ...Object.entries(ARCHETYPE_ROWS).map(([k, v]) => `${k}\t${v}`),
  ].join('\n');
}

export const VERIFY_ROWS: Record<VerifyMethod, string> = {
  dimensional: 'Every term in the governing equation has identical dimensions. Fail → @verify status: fail and a visible @correction step, not a silent rewrite.',
  units: 'Every numeric result carries coherent units; conversions are explicit. Fail → visible correction.',
  limit: 'A boundary (x→0, open-circuit, T→∞, R→0) recovers a known result. Fail → visible correction.',
  oom: 'The magnitude matches a back-of-envelope scale (or a textbook order). Fail → visible correction.',
  backsub: 'Substitute the result into the original equation / ICE table / KCL node and recover 0 within rounding. Fail → visible correction.',
  conservation: 'Mass, charge, energy, momentum, or KCL/KVL holds on the drawn system. Fail → visible correction.',
  alt: 'A second method (Thevenin vs nodal, energy vs Newton, induction vs direct) agrees. Fail → visible correction.',
};

export function renderVerificationRegistry(): string {
  return [
    'VERIFICATION REGISTRY — last @step is verification work. Also emit @verify. On fail, EMIT a visible correction @step (title names the error) and set @verify status: fail. NEVER silently replace the wrong value.',
    'method\trule',
    ...Object.entries(VERIFY_ROWS).map(([k, v]) => `${k}\t${v}`),
    'Pick every method that applies to this archetype/subject. Numeric: units + dimensional + one of limit|oom|backsub. Proof: alt or a named lemma check. Lab: units + uncertainty. Code: a concrete trace + complexity.',
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
    'WHEN NOT TO DRAW — over-diagramming is forbidden. OMIT @diagram when ANY of:',
    '1. The step does not change spatial, topological, visual, or apparatus state.',
    '2. Pure algebra / one-line rearrangement of a relation already used; the previous figure is unchanged.',
    '3. Definition-only or vocabulary step with no structure to show.',
    '4. Unit conversion, sig-fig rounding, or a numeric arithmetic line.',
    '5. The family is on the REFUSE list.',
    '6. A copyrighted textbook figure would be required — construct an original spec from the described physics instead, or OMIT if that is impossible.',
    'Unchanged figure: OMIT rather than copy. If a later step changes one element, emit a new spec of the FULL state and set highlight: on what changed.',
    'Max one @diagram per @step. NEVER a diagram "for completeness" on a non-visual move.',
  ].join('\n');
}

export function renderNotationLocale(): string {
  return [
    'NOTATION LOCALE — infer from the problem text/figures; put the choice in @meta locale:. NEVER mix conventions mid-solution.',
    'field\trule',
    'units\tSI unless the problem uses imperial/USCS; then stay imperial and say so in @uncertainty.',
    'decimal\t`.` unless the problem uses `,` as the decimal mark; then match the problem.',
    'sigfig\tFinal numbers match the least precise given. Keep one guard digit in intermediate @body lines and state it.',
    'circuit\tstd: ieee (ANSI) when the problem uses US textbook symbols; std: iec otherwise. Set locale: circuit=IEEE|IEC. Copy @meta locale circuit=IEEE|IEC into diagram std: ieee|iec unless the problem figure shows the other. NEVER mix in one netlist.',
    'g\tUse the value given. If missing: 9.81 m/s^2 and list it under @uncertainty assumption:. NEVER silently use 10 or 9.8.',
    'angles\tRadians in analysis unless the problem states degrees; convert explicitly.',
    'current\tPassive sign convention unless the problem draws otherwise. State the choice once.',
  ].join('\n');
}

export function renderLevelDial(): string {
  return [
    'LEVEL DIAL — infer from vocabulary, given structure, and named theorems. Set @meta level:. DEPTH (balanced|deep) then scales verbosity inside that band.',
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
