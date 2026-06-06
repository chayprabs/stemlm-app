/**
 * Subject playbooks. The builder appends exactly ONE of these to the core
 * protocol (chosen by the classifier or the user's override). Each gives the
 * model subject-specific guidance on atomic intermediate steps and what each
 * step's diagram should depict.
 */
import type { Subject } from './types';

export const PLAYBOOKS: Record<Subject, string> = {
  Physics: `PHYSICS (one move per step): list knowns → name unknowns → pick principle (Newton/energy/momentum/kinematics/fields) → draw state diagram for this step → write governing equation (symbols only) → substitute one group of values → isolate target → numeric result → units & magnitude check. SVG: force arrows, rays after THIS surface, field vectors — labelled for the current state only.`,

  Chemistry: `CHEMISTRY (one move per step): identify species/phases → balance equation → convert to moles (one species per step) → pick controlling relation (stoich/K/rate/thermo) → substitute one value → solve for next unknown → check limiting reagent & units. mhchem: $\\ce{2H2 + O2 -> 2H2O}$. SVG: structures/energy profile/ICE table for THIS stage only.`,

  Math: `MATH (one move per step): restate goal → name the rule for THIS line (chain/product/u-sub/partials) → apply it once → simplify one expression → substitute values → verify. Never combine two algebra manipulations in one step. Show each key line with $$…$$. SVG: graph/figure/number line showing the state after this move.`,

  Biology: `BIOLOGY (one move per step): name structure/process → one mechanism phase at a time → inputs for this phase → outputs → regulation/significance → common misconception. SVG (or mermaid for pathways): cell/organelle/Punnett/cycle diagram for THIS phase only.`,

  CS: `CS (one move per step): restate + constraints → pick approach → trace one operation on a concrete input → show data-structure state after that op → next op → correctness argument → time/space $O(\\cdot)$. Mermaid for control flow; SVG for array/tree/list state AT THAT STEP. Code only as inline \`code\`, never a fence.`,

  Electrical: `ELECTRICAL (one move per step): label nodes & reference directions → pick method (series-parallel/KVL/KCL/node/mesh/Thevenin) → write one equation or one reduction → simplify one branch at a time → back-substitute one unknown → check power balance. AC/PHASOR: compute ω=2πf first → one reactance per step (XL=ωL, XC=1/ωC) → form impedance phasor Z=R+j(XL−XC) → compute |Z| → find I=V/|Z| → classify inductive (XL>XC) vs capacitive (XC>XL) → draw impedance triangle and voltage/current phasors. SVG: circuit with zigzag (R), coil arcs (L), parallel plates (C), labelled source, current arrow; impedance triangle with R on real axis, net reactance on imaginary axis, |Z| as hypotenuse; phasor diagram showing V and I with phase angle. Redraw only what's analysed so far — symbols, node voltages, branch currents, phasor arrows.`,

  Mechanical: `MECHANICAL (one move per step): identify body + assumptions → one free-body or thermo-state diagram → write one governing equation → substitute one term → solve for one unknown → interpret (direction/factor of safety) → units check. SVG: forces/moments/stress/P-V for THIS state only.`,

  Civil: `CIVIL (one move per step): idealise structure + supports + loads → solve for one reaction → internal forces at one section → next section → one SFD/BMD segment → stress/deflection or design check → verify equilibrium. SVG: beam/truss with loads, then shear/moment for the section just found.`,

  Chemical: `CHEMICAL ENG (one move per step): draw control volume + streams → pick basis → write one balance (mass/energy) → add one equilibrium/transport relation → solve for one unknown → check conservation & units. SVG/mermaid: PFD with the stream or CV used in THIS balance.`,

  General: `GENERAL: pick the most specific subject and its conventions. Break work into atomic moves: identify givens → choose principle → one manipulation per step → numeric substitution → sanity check. Never lump "setup" and "solve" together. Diagram = state after THIS move only.`,
};

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}
