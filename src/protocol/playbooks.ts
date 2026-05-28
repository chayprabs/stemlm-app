/**
 * Subject playbooks. The builder appends exactly ONE of these to the core
 * protocol (chosen by the classifier or the user's override). Each gives the
 * model subject-specific guidance on what the intermediate steps are and what
 * each step's diagram should depict. Kept short on purpose — the heavy lifting
 * is in protocol.ts; these just steer the domain.
 */
import type { Subject } from './types';

export const PLAYBOOKS: Record<Subject, string> = {
  Physics: `PHYSICS PLAYBOOK:
- Steps: (1) identify the system + knowns/unknowns and sketch it, (2) choose the principle (Newton's laws, energy, momentum, kinematics, fields), (3) draw the free-body / field / ray diagram, (4) write equations, (5) solve symbolically then substitute, (6) sanity-check units and magnitude.
- Diagrams (type=svg): free-body diagrams with labelled force vectors + arrowheads; ray diagrams showing the ray after THIS surface with normals and angles; field/vector diagrams; motion diagrams with velocity/acceleration vectors. Update the picture to the state at that step.
- Always carry units; give the final answer with units and correct significant figures.`,

  Chemistry: `CHEMISTRY PLAYBOOK:
- Steps: (1) read the system (species, phases, given amounts), (2) balanced equation, (3) convert to moles, (4) apply the controlling relationship (stoichiometry, equilibrium K, rate law, thermochemistry), (5) solve, (6) check limiting reagent / units.
- Use mhchem for all formulas and equations: $\\ce{2H2 + O2 -> 2H2O}$, $\\ce{H+}$, etc.
- Diagrams (type=svg): reaction-stage structures, energy profile diagrams (reactants -> TS -> products with $\\Delta H$), ICE-table sketches, or simple molecular structures for the stage being discussed.`,

  Math: `MATH PLAYBOOK:
- Steps: expose each transformation. For calculus show the rule applied (chain/product/u-sub) before evaluating; for algebra show each manipulation; for proofs state the claim, the strategy, then each deductive step.
- Display every key line with $$...$$. Do not skip algebra a student would get stuck on.
- Diagrams (type=svg): function graphs with axes/labels, geometric figures with marked lengths/angles, number lines, region sketches for integrals/probability. Use mermaid only for logical proof structure if helpful.`,

  Biology: `BIOLOGY PLAYBOOK:
- Steps: (1) define the structures/processes involved, (2) the mechanism stage by stage (e.g. each phase of mitosis, each step of a pathway), (3) inputs/outputs, (4) regulation/significance, (5) common misconceptions.
- Diagrams (type=svg): labelled cell/organelle/pathway diagrams, Punnett squares, cycle diagrams, or concentration/curve plots — depicting the specific stage of the step. Use mermaid for pathways/flows when cleaner.`,

  CS: `COMPUTER SCIENCE PLAYBOOK:
- Steps: (1) restate the problem + constraints, (2) approach/intuition, (3) trace the algorithm on a concrete small input, (4) the data structure state after each key operation, (5) correctness reasoning, (6) time/space complexity with $O(\\cdot)$.
- Diagrams: prefer type=mermaid for control flow (graph TD), call/sequence (sequenceDiagram), state machines, ER models. Use type=svg to draw arrays/trees/linked-lists/stacks in their state AT THAT STEP (boxes with indices/pointers).
- If code is part of the answer, put short snippets inside @body using markdown indentation/inline code, never triple backticks.`,

  Electrical: `ELECTRICAL / CIRCUITS PLAYBOOK:
- Steps: (1) label nodes, components, reference directions, (2) pick the method (series/parallel reduction, KVL/KCL, node-voltage, mesh, Thevenin), (3) write the equations, (4) reduce/solve stage by stage, (5) back-substitute for the requested quantity, (6) verify with power balance.
- Diagrams (type=svg): redraw the circuit at each step showing only what has been reduced/analysed so far — components as standard symbols (resistor zig-zag or box, capacitor, battery, ground), wires as lines, labelled node voltages and branch currents with arrowheads.`,

  Mechanical: `MECHANICAL ENGINEERING PLAYBOOK:
- Steps: (1) define the body/system + assumptions, (2) free-body or thermodynamic state diagram, (3) governing equations (equilibrium, energy, dynamics, fluid relations), (4) solve, (5) interpret (factor of safety, efficiency, direction), (6) units check.
- Diagrams (type=svg): free-body diagrams with forces/moments and arrowheads, stress/shear-bending sketches, mechanism/linkage states, or thermodynamic P-V / T-s style plots for the step.`,

  Civil: `CIVIL / STRUCTURAL PLAYBOOK:
- Steps: (1) idealise the structure + supports + loads, (2) reactions from equilibrium, (3) internal forces (axial/shear/moment) member by member or section by section, (4) draw shear/moment diagrams, (5) stress/deflection or design check, (6) verify against equilibrium.
- Diagrams (type=svg): the beam/truss with supports (pin/roller), load arrows, and at later steps the shear-force and bending-moment diagrams for the loaded member.`,

  Chemical: `CHEMICAL ENGINEERING PLAYBOOK:
- Steps: (1) draw the process/control volume + streams, (2) state mass/energy balance basis, (3) write balances (in - out + gen = acc), (4) apply equilibrium/transport relations, (5) solve, (6) check conservation and units.
- Diagrams (type=svg or mermaid): a labelled process flow diagram (units, streams with compositions/flows) and the control volume for the balance written in that step.`,

  General: `GENERAL STEM PLAYBOOK:
- First decide the most specific subject and adopt its conventions. Expose the intermediate steps where a student gets stuck: setup -> principle -> work shown line by line -> result -> sanity check.
- Add a diagram (type=svg for anything spatial/physical, type=mermaid for flows/relationships) whenever it makes the step clearer, depicting that step's state.`,
};

export function getPlaybook(subject: Subject): string {
  return PLAYBOOKS[subject] ?? PLAYBOOKS.General;
}
