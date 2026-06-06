/**
 * Subject playbooks. The builder appends exactly ONE of these to the core
 * protocol (chosen by the classifier or the user's override). Each gives the
 * model subject-specific guidance on atomic intermediate steps and what each
 * step's diagram should depict.
 */
import type { Subject } from './types';

export const PLAYBOOKS: Record<Subject, string> = {
  Physics: `PHYSICS (one move per step): list knowns → name unknowns → pick principle (Newton/energy/momentum/kinematics/fields) → draw state diagram for this step → write governing equation (symbols only) → substitute one group of values → isolate target → numeric result → units & magnitude check. OPTICS: draw optical axis, lens/mirror, F/2F marks, object/image arrows, parallel/focal/central rays; label do, di, f, m and real/virtual/upright/inverted. SVG: force arrows, rays after THIS surface, field vectors — labelled for the current state only.`,

  Chemistry: `CHEMISTRY (one move per step): identify species/phases → balance equation → convert to moles (one species per step) → pick controlling relation (stoich/K/rate/thermo) → substitute one value → solve for next unknown → check limiting reagent & units. mhchem: $\\ce{2H2 + O2 -> 2H2O}$. SVG: structures/energy profile/ICE table for THIS stage only.`,

  Math: `MATH (one move per step): restate goal → name the rule for THIS line (chain/product/u-sub/partials) → apply it once → simplify one expression → substitute values → verify. Never combine two algebra manipulations in one step. Show each key line with $$…$$. SVG: graph/figure/number line showing the state after this move.`,

  Biology: `BIOLOGY (one move per step): name structure/process → one mechanism phase at a time → inputs for this phase → outputs → regulation/significance → common misconception. SVG (or mermaid for pathways): cell/organelle/Punnett/cycle diagram for THIS phase only.`,

  CS: `CS (one move per step): restate + constraints → pick approach → trace one operation on a concrete input → show data-structure state after that op → next op → correctness argument → time/space $O(\\cdot)$. DP: show table/array cells after each fill, highlight current subproblem, candidate transitions, chosen predecessor, final recurrence and reconstruction. Mermaid for control flow; SVG for array/tree/list/table state AT THAT STEP. Code only as inline \`code\`, never a fence.`,

  Electrical: `ELECTRICAL (one move per step): label nodes & reference directions → pick method (series-parallel/KVL/KCL/node/mesh/Thevenin/Norton) → write one equation or one reduction → simplify one branch at a time → back-substitute one unknown → check power balance. EVERY @step with @formula: @body must define symbols ("$X_C$ is capacitive reactance in Ω") and show numeric substitution with units — never emit only $$X_C=1/(\\omega C)$$ with no work. NODE-VOLTAGE/MESH: mark reference ground with the 3-bar symbol inside a <g transform="translate(…)">; label each node with bold text (N1, N2…); show node-voltage variables (V₁, V₂) below each node; use <defs><marker><polygon></marker></defs> arrowheads with marker-end="url(#id)" on branch-current lines; highlight the KCL cut-set at each node with a dashed stroke-dasharray circle; current-source symbol = circle + internal arrowed line. AC/PHASOR: separate steps — (1) $\\omega=2\\pi f$ with numbers, (2) $X_L=\\omega L$ with plug-in, (3) $X_C=1/(\\omega C)$ with plug-in — never combine reactances in one step → form $Z=R+j(X_L-X_C)$ → compute $|Z|$ → find $I=V/|Z|$ with current phase opposite $\\angle Z$ → classify inductive ($X_L>X_C$, current lags) vs capacitive ($X_C>X_L$, current leads) → draw impedance triangle and voltage/current phasors. OP-AMP: draw triangle with +/− inputs, Rf/Rg feedback network, ground, rails, V+, V−, Vout; state ideal input current = 0 and virtual short under negative feedback; compute closed-loop gain and output, then check rail saturation/clipping. DIODE/RECTIFIER: identify diode orientation and ideal/non-ideal drop → state conduction condition → write piecewise output waveform → mark conduction/blocking intervals → compute V_peak, I_peak, and half-wave V_avg=V_p/π; draw the circuit symbol and waveform with zero negative half-cycles. SVG: circuit with zigzag (R), coil arcs (L), parallel plates (C), labelled source, current arrow; impedance triangle with R on real axis, signed net reactance on imaginary axis, |Z| as hypotenuse; phasor diagram showing V and I with phase angle. Redraw only what's analysed so far — symbols, node voltages, branch currents, phasor arrows.`,

  Mechanical: `MECHANICAL (one move per step): identify body + assumptions → one free-body or thermo-state diagram → write one governing equation → substitute one term → solve for one unknown → interpret (direction/factor of safety) → units check. AXIAL/STRESS: draw bar/cylinder with outward tensile arrows P, optional internal cut N=P, circular cross-section with d, area A=πd²/4, and uniform stress σ=P/A. SVG: forces/moments/stress/P-V for THIS state only.`,

  Civil: `CIVIL (one move per step): idealise structure + supports + loads → solve for one reaction → internal forces at one section → next section → one SFD/BMD segment → stress/deflection or design check → verify equilibrium. BEAMS: show pin/roller supports, reaction arrows, dimensions, load jumps in SFD, area-under-shear link, positive sagging BMD, x-axis and units. SVG: beam/truss with loads, then shear/moment for the section just found.`,

  Chemical: `CHEMICAL ENG (one move per step): draw control volume + numbered streams → pick basis/assumptions → write one total or component balance → add equilibrium/transport only when needed → solve one unknown → stream table (total, component flows, compositions, units) → check conservation. SVG: PFD/control volume with the stream or balance used in THIS step.`,

  General: `GENERAL: pick the most specific subject and its conventions. Break work into atomic moves: identify givens → choose principle → one manipulation per step → numeric substitution → sanity check. Every @step needs a non-empty @body with definitions + worked numbers when a formula is used. Never lump "setup" and "solve" together. Diagram = state after THIS move only.`,
};

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}
