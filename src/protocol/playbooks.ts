/**
 * Subject playbooks. The builder appends exactly ONE of these to the core
 * protocol (chosen by the classifier or the user's override). Each gives the
 * model subject-specific guidance on what the intermediate steps are and what
 * each step's diagram should depict. Kept short on purpose — the heavy lifting
 * is in protocol.ts; these just steer the domain.
 */
import type { Subject } from './types';

export const PLAYBOOKS: Record<Subject, string> = {
  Physics: `PHYSICS: knowns/unknowns + sketch → principle (Newton/energy/momentum/kinematics/fields) → free-body/ray/field diagram → equations → solve symbolically then substitute → check units & magnitude. SVG: labelled force arrows, rays after THIS surface (with normals/angles), motion/field vectors. Carry units & sig figs.`,

  Chemistry: `CHEMISTRY: species/phases/amounts → balanced equation → moles → controlling relation (stoichiometry/K/rate/thermo) → solve → check limiting reagent & units. mhchem: $\\ce{2H2 + O2 -> 2H2O}$. SVG: reaction-stage structures, energy profiles (reactants→TS→products, $\\Delta H$), ICE tables.`,

  Math: `MATH: name the rule before each move (chain/product/u-sub; each algebra manip; proof: claim→strategy→deductive steps) → never skip algebra → verify by substitution/edge case. Show key lines with $$…$$. SVG: labelled graphs/axes, geometric figures with marked lengths/angles, number lines, integral/probability regions.`,

  Biology: `BIOLOGY: define structures/processes → mechanism stage by stage (each phase/pathway step) → inputs/outputs → regulation/significance → common misconception. SVG (or mermaid for pathways): labelled cell/organelle diagrams, Punnett squares, cycle diagrams, curves — for that step's stage.`,

  CS: `CS: restate + constraints → approach → trace a small concrete input → data-structure state after each key op → correctness → time/space $O(\\cdot)$. Mermaid for control flow/sequence/state; SVG for arrays/trees/lists in their state AT THAT STEP. Code only as inline \`code\`, never a fence.`,

  Electrical: `ELECTRICAL: label nodes/components/reference directions → method (series-parallel/KVL/KCL/node/mesh/Thevenin) → equations → reduce stage by stage → back-substitute → check power balance. SVG: redraw only what's analysed so far — standard symbols, labelled node voltages & branch currents with arrows.`,

  Mechanical: `MECHANICAL: body + assumptions → free-body or thermo-state diagram → governing equations (equilibrium/energy/dynamics/fluids) → solve → interpret (factor of safety/efficiency/direction) → units check. SVG: force/moment arrows, stress/shear-bending sketches, linkage states, P-V/T-s plots.`,

  Civil: `CIVIL: idealise structure + supports + loads → reactions from equilibrium → internal forces (axial/shear/moment) section by section → shear/moment diagrams → stress/deflection or design check → verify equilibrium. SVG: beam/truss with pin/roller supports & load arrows, then SFD & BMD.`,

  Chemical: `CHEMICAL ENG: control volume + streams → basis → balances (in − out + gen = acc) → equilibrium/transport relations → solve → check conservation & units. SVG or mermaid: labelled process-flow diagram (units, stream flows/compositions) + the control volume for that balance.`,

  General: `GENERAL: first pick the most specific subject and adopt its conventions. Expose where students stick: setup → principle → work line by line → result → sanity check. Add an SVG (spatial/physical) or mermaid (flows/relations) diagram of that step's state whenever it clarifies.`,
};

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}
