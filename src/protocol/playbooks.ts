/**
 * Subject playbooks. The builder appends exactly ONE of these to the core
 * protocol (chosen by the classifier or the user's override). Each gives the
 * model subject-specific guidance on atomic intermediate steps and what each
 * step's diagram should depict. Keep these dense — they ship in stemlm-protocol.txt.
 */
import type { Subject } from './types';

export const PLAYBOOKS: Record<Subject, string> = {
  Physics: `PHYSICS: one move/step; @body on every step (define symbols, substitute givens, compute with units). knowns → unknowns → principle → SVG of THIS state → governing eq (symbols only) → one substitution → isolate → number+units → check.
PRINCIPLES: mechanics Newton/kinematics/energy/momentum/rotation/Lagrangian; waves SHM/superposition/standing/resonance/Doppler; thermo laws/ideal gas/kinetic theory/cycles; E&M Coulomb/Gauss/fields/potential/circuits/Ampère/Faraday/Maxwell; optics reflection/refraction/lenses/mirrors/interference/diffraction; quantum photons/de Broglie/levels/uncertainty; nuclear decay/binding.
SVG (THIS step only): mechanics FBD — isolate ONE body, external forces only (label N,T,f,mg,F), axes separate (align to incline); rotation torque & lever arms; waves labeled axes+units; E&M field arrows, charges, equipotentials; optics axis, surface, F/2F, object/image arrows, principal rays with arrowheads, label do,di,f,m and real/virtual/upright/inverted; thermo PV or levels; modern energy ladder. Graphs: axes+units+ticks, named curves; never put labels on arrows.`,

  Chemistry: `CHEMISTRY: one move/step; @body on every step. species/phases → balance → moles (one species/step) → controlling relation → one substitution → next unknown → limiting reagent & units. mhchem: $\\ce{2H2 + O2 -> 2H2O}$.
PRINCIPLES: stoich mole ratios/limiting/% yield; pchem ΔH/ΔS/ΔG, K, rate laws/Arrhenius, spectra; organic curved-arrow mechanisms, R/S E/Z, conformations; inorganic periodic/VSEPR/MO/CFT; analytical titration, Beer, NMR/IR/MS/UV-Vis; electrochem half-reactions/Nernst/cells.
SVG REQUIRED on structure/mechanism/spectrum/orbital/energy/phase/unit-cell/cell steps. Step 1 of multi-part: overview (levels, MO, mechanism outline, or cell). THIS step: Lewis/line-angle with lone pairs & charges, VSEPR wedge/dash, curved arrows, MO (energy up, AO columns outside, MO center, σ/π/σ*/π*, electron arrows), reaction-coordinate, ICE boxes, labeled spectra, cell with electrodes & salt bridge. Every named species/bond/orbital/peak/electrode labeled. ≥40% of steps on diagram-intensive problems.`,

  Math: `MATH: one move/step; @body on every step. goal → name the rule for THIS line → apply once → simplify ONE expression → substitute → verify. Never two manipulations in one step; key lines in $$…$$.
PRINCIPLES: algebra/precalc factoring/identities/systems; calc limits/indeterminate, chain/product/quotient/u-sub, FTC; multivariable partials/gradient/Jacobians/Lagrange; lin alg RREF/rank/eigen/diagonalize; DE classify, separable/IF/char-root, Laplace; probability distributions/E[X]/Bayes/CI/tests; discrete counting/recurrences/graphs/induction; complex Cauchy/residues; numerical error/iteration. Prove: assumptions → deduce → conclude.
SVG after THIS move: graph (axes/units/ticks, intercepts, asymptotes, critical points), number line, shaded region, geometry with labels off edges, vector field/phase portrait with arrowheads, contours. Omit on purely symbolic algebra.`,

  Biology: `BIOLOGY: one move/step; @body on every step (define terms, mechanism, units if quantitative). structure/process → one phase → inputs → outputs → regulation/significance → misconception or numeric check.
PRINCIPLES: cell organelles/membranes/transport/cycle; genetics Mendel/linkage/HWE, replication/transcription/translation; physio homeostasis neuro/cardio/renal/respiratory; ecology growth/energy/food webs; evolution selection/speciation/phylogeny; micro growth/metabolism; immuno innate/adaptive; bioinformatics sequence/probability.
SVG (mermaid OK for linear pathways): cell/organelle/anatomy labels adjacent to glyphs; Punnett/pedigree; cycle stages; pathway left→right or top→bottom — pointed arrow = activation/flow, blunt bar = inhibition; gel/phylogeny labeled. No crossing edges or label overlap; THIS phase only.`,

  CS: `CS: one move/step; @body on every step (define state, trace one op, give complexity). restate+constraints → approach → trace ONE op on a concrete input → show DS state after that op → next op → correctness → time/space $O(\\cdot)$.
PRINCIPLES: algorithms D&C/greedy/DP/BFS/DFS/Dijkstra; DS array/list/stack/queue/heap/tree/hash/graph invariants; DP subproblem+recurrence, fill table, reconstruct; DB relational/SQL/NF/index; OS scheduling/concurrency/deadlock/memory; net layers/protocols; theory automata/decidability/NP reductions. Code only as inline \`code\`, never a fence.
DIAGRAM: mermaid for flow/sequence/state (quote labels A["v = u+at"], no ( ) { } \` ). SVG for array/tree/list/table/graph AT THAT STEP — DP: table after each fill, highlight current cell, candidates, chosen predecessor.`,

  Electrical: `ELECTRICAL: @diagram type=svg on nearly EVERY step. Completeness: every component named in @body MUST appear labeled in that step's SVG — partial fragments invalid. Step 1 = FULL original circuit OR full small-signal model.
PRINCIPLES: DC/AC Ohm/KVL/KCL, series-parallel, nodal/mesh, Thévenin/Norton, superposition, source transform; phasors impedance/resonance/pf; analog diode/BJT/MOSFET/op-amp small-signal; signals Laplace/Fourier/Bode; digital gates/FF; power per-unit/Ybus; control PID/stability.
SYMBOLS: signal L→R, VCC top, GND bottom; R zigzag/box, C plates, L coils, diode triangle+bar, BJT circle+emitter arrow, MOSFET, op-amp triangle +/−, dependent source diamond, independent source circle; junction dots, no 4-way crossings. HYBRID-π: B,C,E, $r_\\pi$, $g_m v_{be}$ (diamond) C→E, $R_E$ to GND, $R_C$ to $V_{CC}$, $v_{in}$ at base; $R_{out}$: $v_{in}=0$, $V_{test}$ at collector. OP-AMP: triangle +/−, $R_f$/$R_g$, rails, GND, all nodes wired. PHASOR: Re/Im arrowheads, values at projection foot, currents beside arrowhead not on stroke.
REQUIRED SVG: model, $R_{in}$/$R_{out}$/$A_v$, KCL/KVL, superposition, Thévenin, source killing. ≥8 primitives + ≥4 labels on model steps; ≥5 + ≥3 otherwise; never text-only. ≥55% of steps. Highlight what changed. Labels ≥10px off wires; name R1,L1,Vs,Id.`,

  Mechanical: `MECHANICAL: one move/step; @body on every step. body+assumptions → one FBD or thermo-state SVG → one governing eq → one substitution → one unknown → interpret (direction / FoS) → units.
PRINCIPLES: statics/dynamics equilibrium, FBD, kinematics/kinetics; MoM axial/shear/bending/torsion, strain, E, FoS; machines shafts/gears/cams/linkages/bearings; thermo Carnot/Otto/Rankine, engines, refrigeration; fluids Bernoulli/continuity/Re/viscosity; vibrations ωn/damping.
SVG THIS state: FBD one body, labeled external forces/moments & axes; stress element/section (bar with P, cut N=P, A=πd²/4, σ=P/A); shaft/gear; labeled P-V or T-S with units; flow CV with streamlines.`,

  Civil: `CIVIL: one move/step; @body on every step. idealise structure+supports+loads → ONE reaction → internals at ONE section → next section → one SFD/BMD segment → stress/deflection or design check → equilibrium.
PRINCIPLES: reactions, joints/sections for trusses; beams shear/moment, sagging/hogging, deflection; RC/steel checks, buckling; geotech stress/bearing/retaining; transport/hydraulics as applicable.
SVG THIS state: pin (triangle)/roller (circle)/fixed supports, reaction arrows, dimensions, loads to scale; then SFD (load jumps, area-under-shear → BMD); positive sagging, labeled x-axis+units. Show the section just solved.`,

  Chemical: `CHEMICAL ENG: one move/step; @body on every step. CV + numbered streams → basis/assumptions → ONE total or component balance → eq/transport only when needed → one unknown → stream table (total/component flows, compositions, units) → conservation check.
PRINCIPLES: material/energy balances steady/unsteady, recycle/purge/bypass; VLE, Raoult/fugacity; heat/mass transfer; CSTR/PFR, conversion, residence time; distillation reflux/McCabe-Thiele, absorption.
SVG THIS step: PFD/CV box, numbered inlet/outlet arrows, unit labeled (mixer/reactor/separator/exchanger), highlight stream/balance used; x-y or T-x-y with labeled axes when relevant.`,

  General: `GENERAL: pick the most specific subject and adopt its conventions. Atomic moves: givens with units → governing principle + why → one manipulation/step → numeric substitution with units → sanity/limit check. @body on every step (symbol defs + worked numbers when a formula is used). Never lump setup+solve. SVG (or mermaid for flows) whenever spatial/visual — THIS move's state only, labels offset from lines.`,
};

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}
