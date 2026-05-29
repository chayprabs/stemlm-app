/**
 * Subject playbooks. The builder appends exactly ONE of these to the core
 * protocol (chosen by the classifier or the user's override). Each gives the
 * model subject-specific guidance on what the intermediate steps are and what
 * each step's diagram should depict. Kept short on purpose — the heavy lifting
 * is in protocol.ts; these just steer the domain.
 */
import type { Subject } from './types';

export const PLAYBOOKS: Record<Subject, string> = {
  Physics: `PHYSICS: steps = system + knowns/unknowns (sketch) → principle (Newton/energy/momentum/kinematics/fields) → free-body/ray/field diagram → equations → solve symbolically then substitute → check units & magnitude. SVG: free-body diagrams with labelled force arrows, ray diagrams (ray after THIS surface, normals, angles), motion/field vectors. Always carry units & sig figs.`,

  Chemistry: `CHEMISTRY: steps = species/phases/amounts → balanced equation → moles → controlling relation (stoichiometry/equilibrium K/rate law/thermo) → solve → check limiting reagent/units. Use mhchem: $\\ce{2H2 + O2 -> 2H2O}$, $\\ce{H+}$. SVG: reaction-stage structures, energy profiles (reactants→TS→products, $\\Delta H$), ICE tables, molecular structures.`,

  Math: `MATH: expose every transformation — calculus: name the rule (chain/product/u-sub) before evaluating; algebra: each manipulation; proofs: claim → strategy → each deductive step. Display key lines with $$…$$; don't skip algebra. SVG: graphs with axes/labels, geometric figures with marked lengths/angles, number lines, integral/probability regions.`,

  Biology: `BIOLOGY: steps = define structures/processes → mechanism stage by stage (each phase/each pathway step) → inputs/outputs → regulation/significance → common misconceptions. SVG: labelled cell/organelle/pathway diagrams, Punnett squares, cycle diagrams, curves — for that step's stage. Mermaid for pathways/flows.`,

  CS: `CS: steps = restate problem + constraints → approach/intuition → trace on a small concrete input → data-structure state after each key op → correctness → time/space with $O(\\cdot)$. Mermaid for control flow (graph TD)/sequence/state/ER; SVG for arrays/trees/lists/stacks in their state AT THAT STEP. Code snippets inside @body via inline code, never triple backticks.`,

  Electrical: `ELECTRICAL/CIRCUITS: steps = label nodes/components/reference directions → pick method (series-parallel/KVL/KCL/node-voltage/mesh/Thevenin) → equations → reduce/solve stage by stage → back-substitute → verify with power balance. SVG: redraw the circuit showing only what's analysed so far — standard symbols, labelled node voltages & branch currents with arrowheads.`,

  Mechanical: `MECHANICAL: steps = body/system + assumptions → free-body or thermodynamic-state diagram → governing equations (equilibrium/energy/dynamics/fluids) → solve → interpret (factor of safety/efficiency/direction) → units check. SVG: free-body diagrams with forces/moments + arrowheads, stress/shear-bending sketches, linkage states, P-V/T-s plots.`,

  Civil: `CIVIL/STRUCTURAL: steps = idealise structure + supports + loads → reactions from equilibrium → internal forces (axial/shear/moment) section by section → shear/moment diagrams → stress/deflection or design check → verify equilibrium. SVG: beam/truss with supports (pin/roller) + load arrows, then shear-force & bending-moment diagrams.`,

  Chemical: `CHEMICAL ENG: steps = process/control volume + streams → balance basis → balances (in − out + gen = acc) → equilibrium/transport relations → solve → check conservation & units. SVG or mermaid: labelled process-flow diagram (units, streams with flows/compositions) + the control volume for that balance.`,

  General: `GENERAL STEM: first pick the most specific subject and adopt its conventions. Expose where students get stuck: setup → principle → work shown line by line → result → sanity check. Add an SVG (spatial/physical) or mermaid (flows/relationships) diagram showing that step's state whenever it clarifies.`,
};

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}
