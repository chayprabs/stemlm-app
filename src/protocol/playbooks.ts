/**
 * Subject playbooks. stemlm-protocol.txt always ships ALL of them so the model
 * can pick the matching section from the problem (no subject picker; classifier
 * is analytics-only and must not pin the protocol to one subject).
 */
import { SUBJECTS, type Subject } from './types';

export const PLAYBOOKS: Record<Subject, string> = {
  Physics: `PHYSICS: one move/step; @body on every step (define symbols, substitute givens, compute with units). knowns → unknowns → principle → SPEC of THIS state → governing eq (symbols only) → one substitution → isolate → number+units → check.
PRINCIPLES: mechanics Newton/kinematics/energy/momentum/rotation/Lagrangian; waves SHM/superposition/standing/resonance/Doppler; thermo laws/ideal gas/kinetic theory/cycles; E&M Coulomb/Gauss/fields/potential/circuits/Ampère/Faraday/Maxwell; optics reflection/refraction/lenses/mirrors/interference/diffraction; quantum photons/de Broglie/levels/uncertainty; nuclear decay/binding.
DIAGRAM catalog: step 1 scene kind=fbd (isolate ONE body, external forces N,T,f,mg,F, axes separate, align to incline) or plot of the given graph; rays as scene kind=ray with f, do (not pixels) and F/2F; fields as catalog names; energy ladders as mo/cft. Graphs: xlabel/ylabel with units. Never <svg>.`,

  Chemistry: `CHEMISTRY: one move/step; @body on every step. species/phases → balance → moles (one species/step) → controlling relation → one substitution → next unknown → limiting reagent & units. mhchem: $\\ce{2H2 + O2 -> 2H2O}$.
PRINCIPLES: stoich mole ratios/limiting/% yield; pchem ΔH/ΔS/ΔG, K, rate laws/Arrhenius, spectra; organic curved-arrow mechanisms, R/S E/Z, conformations; inorganic periodic/VSEPR/MO/CFT; analytical titration, Beer, NMR/IR/MS/UV-Vis; electrochem half-reactions/Nernst/cells.
DIAGRAM catalog: structures as chem.smiles; mechanisms as rxn SMILES + arrows (curved-arrow); MO/CFT as mo/cft level tuples; VSEPR as type=vsepr; Newman/Fischer/chair as those types — never SMILES-as-Newman; spectra as peak lists; ICE as table kind=ice; mhchem in @body. Every named species is a spec id. ≥40% of steps on diagram-intensive problems.`,

  Math: `MATH: one move/step; @body on every step. goal → name the rule for THIS line → apply once → simplify ONE expression → substitute → verify. Never two manipulations in one step; key lines in $$…$$.
PRINCIPLES: algebra/precalc factoring/identities/systems; calc limits/indeterminate, chain/product/quotient/u-sub, FTC; multivariable partials/gradient/Jacobians/Lagrange; lin alg RREF/rank/eigen/diagonalize; DE classify, separable/IF/char-root, Laplace; probability distributions/E[X]/Bayes/CI/tests; discrete counting/recurrences/graphs/induction; complex Cauchy/residues; numerical error/iteration. Prove: assumptions → deduce → conclude.
DIAGRAM catalog: plot after THIS move (fn, domain, intercepts, asymptotes); scene for geometry/vectors/phase portrait; table for matrices/RREF/eigen tableaux. Omit on purely symbolic algebra. Never <svg>.`,

  Biology: `BIOLOGY: one move/step; @body on every step (define terms, mechanism, units if quantitative). structure/process → one phase → inputs → outputs → regulation/significance → misconception or numeric check.
PRINCIPLES: cell organelles/membranes/transport/cycle; genetics Mendel/linkage/HWE, replication/transcription/translation; physio homeostasis neuro/cardio/renal/respiratory; ecology growth/energy/food webs; evolution selection/speciation/phylogeny; micro growth/metabolism; immuno innate/adaptive; bioinformatics sequence/probability.
DIAGRAM catalog: Punnett table; pedigree/pathway graph (pointed=activation, blunt bar=inhibition); HWE plot; cell/membrane/gel as named templates; mermaid OK for linear pathways. THIS phase only. Never <svg>.`,

  CS: `CS: one move/step; @body on every step (define state, trace one op, give complexity). restate+constraints → approach → trace ONE op on a concrete input → show DS state after that op → next op → correctness → time/space $O(\\cdot)$.
PRINCIPLES: algorithms D&C/greedy/DP/BFS/DFS/Dijkstra; DS array/list/stack/queue/heap/tree/hash/graph invariants; DP subproblem+recurrence, fill table, reconstruct; DB relational/SQL/NF/index; OS scheduling/concurrency/deadlock/memory; net layers/protocols; theory automata/decidability/NP reductions. Code only as inline \`code\`, never a fence.
DIAGRAM catalog: mermaid for flow/sequence/state (quote labels A["v = u+at"], no ( ) { } \` ). table for DP (highlight current cell); graph for trees/graphs/Dijkstra; array/list types for DS traces. Code as inline \`code\`, never a fence. Never <svg> coordinates.`,

  Electrical: `ELECTRICAL: @diagram type=circuit on nearly EVERY step. Completeness: every component named in @body MUST appear as a named id in that step's spec — partial fragments invalid. Step 1 = FULL original netlist OR type=hybridpi / type=opamp with required keys.
PRINCIPLES: DC/AC Ohm/KVL/KCL, series-parallel, nodal/mesh, Thévenin/Norton, superposition, source transform; phasors impedance/resonance/pf; analog diode/BJT/MOSFET/op-amp small-signal; signals Laplace/Fourier/Bode; digital gates/FF; power per-unit/Ybus; control PID/stability.
HYBRID-π: type=hybridpi with rpi, gm, RE, RC, B,C,E required (never omit RC). OP-AMP: type=opamp Rf, Rg, +/−, GND. PHASOR: type=phasor mag∠deg (values at projection foot). Bode: poles/zeros not a polyline. ≥55% of steps still apply as specs. highlight: restyles only. Never <svg>.`,

  Mechanical: `MECHANICAL: one move/step; @body on every step. body+assumptions → one FBD or thermo-state SPEC → one governing eq → one substitution → one unknown → interpret (direction / FoS) → units.
PRINCIPLES: statics/dynamics equilibrium, FBD, kinematics/kinetics; MoM axial/shear/bending/torsion, strain, E, FoS; machines shafts/gears/cams/linkages/bearings; thermo Carnot/Otto/Rankine, engines, refrigeration; fluids Bernoulli/continuity/Re/viscosity; vibrations ωn/damping.
DIAGRAM catalog: FBD scene; P-V/T-s plot; shaft/gear/cam templates. Never <svg>.`,

  Civil: `CIVIL: one move/step; @body on every step. idealise structure+supports+loads → ONE reaction → internals at ONE section → next section → one SFD/BMD segment → stress/deflection or design check → equilibrium.
PRINCIPLES: reactions, joints/sections for trusses; beams shear/moment, sagging/hogging, deflection; RC/steel checks, buckling; geotech stress/bearing/retaining; transport/hydraulics as applicable.
DIAGRAM catalog: beam template (pin (triangle)/roller/fixed), then type=sfd piecewise V(x), M(x); positive sagging. Show the section just solved. Never <svg>.`,

  Chemical: `CHEMICAL ENG: one move/step; @body on every step. CV + numbered streams → basis/assumptions → ONE total or component balance → eq/transport only when needed → one unknown → stream table (total/component flows, compositions, units) → conservation check.
PRINCIPLES: material/energy balances steady/unsteady, recycle/purge/bypass; VLE, Raoult/fugacity; heat/mass transfer; CSTR/PFR, conversion, residence time; distillation reflux/McCabe-Thiele, absorption.
DIAGRAM catalog: PFD with numbered streams; McCabe-Thiele as type=mccabe with α,zF,xD,R,q — do NOT list staircase corners; CSTR/PFR reactor glyphs. Stream table in @body. Never <svg>.`,

  General: `GENERAL: pick the most specific subject and adopt its conventions. Atomic moves: givens with units → governing principle + why → one manipulation/step → numeric substitution with units → sanity/limit check. @body on every step (symbol defs + worked numbers when a formula is used). Never lump setup+solve. Use that subject's diagram types (or mermaid for flows) whenever spatial/visual — THIS move's state only. Never <svg>.`,
};

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}

/** Header that tells the model to choose one section — never invent a subject. */
export const UNIVERSAL_PLAYBOOK_HEADER = `SUBJECT ROUTING: from the problem (text/image/PDF), set @meta subject: to exactly one of ${SUBJECTS.join('|')}. Apply ONLY that section below; ignore the others. Mixed problems → the dominant subject. Never invent a subject name.`;

/** Every subject playbook, for the attached protocol file. */
export function getUniversalPlaybook(): string {
  return `${UNIVERSAL_PLAYBOOK_HEADER}\n\n${SUBJECTS.map((s) => PLAYBOOKS[s]).join('\n\n')}`;
}
