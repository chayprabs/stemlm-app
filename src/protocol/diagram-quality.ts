/**
 * Diagram coverage checks for spatial / circuit problems.
 *
 * Catches capsules that parse OK but omit circuit SVGs the student needs to
 * follow node labeling, KCL/KVL, superposition, and Thevenin steps.
 */
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import type { Capsule, ParseWarningCode, Step, Subject } from './types';

const VISUAL_SUBJECTS = new Set<Subject>([
  'Electrical',
  'Physics',
  'Mechanical',
  'Civil',
  'Chemical',
  'Biology',
  'Math',
]);

const CIRCUIT_QUESTION =
  /\b(circuit|resistor|node[- ]?voltage|kcl|kvl|kirchhoff|thevenin|norton|superposition|mesh|branch|ground|dependent source|current source|voltage source|label all nodes|consider the circuit)\b/i;

const STEP_NEEDS_DIAGRAM_TITLE =
  /\b(label|node|ground|kcl|kvl|kirchhoff|circuit|branch|superposition|thevenin|norton|mesh|equivalent|reduc|kill|short|open|source|topology|schematic|wiring|phasor|impedance triangle|free[- ]body|beam|truss|ray diagram|optical|structure|control volume|pathway)\b/i;

const TOPOLOGY_STEP_TITLE =
  /\b(label|node|ground|kcl|kvl|circuit|branch|superposition|thevenin|norton|mesh|equivalent|reduc|kill|short|open|topology|schematic)\b/i;

function capsuleText(capsule: Capsule): string {
  const q = capsule.meta.question?.trim() ?? '';
  return `${q} ${capsule.meta.topic}`.trim();
}

export function isVisualDenseProblem(capsule: Capsule): boolean {
  const subject = capsule.meta.subject;
  if (subject === 'Electrical') return true;
  if (!VISUAL_SUBJECTS.has(subject)) return false;
  const text = capsuleText(capsule);
  if (CIRCUIT_QUESTION.test(text)) return true;
  if (subject === 'Physics' && /\b(ray|lens|mirror|free[- ]body|field line|circuit)\b/i.test(text)) {
    return true;
  }
  if (subject === 'Civil' && /\b(beam|truss|support|load|shear|moment)\b/i.test(text)) {
    return true;
  }
  if (subject === 'Mechanical' && /\b(free[- ]body|stress|shaft|gear|pulley)\b/i.test(text)) {
    return true;
  }
  return false;
}

export function stepNeedsDiagram(step: Step): boolean {
  const title = step.title ?? '';
  const body = step.body ?? '';
  if (TOPOLOGY_STEP_TITLE.test(title)) return true;
  if (/\b(node [A-Z]\b|nodes? [A-Z](?:,? [A-Z])+|ground|KCL|KVL|superposition|Thevenin|Norton)\b/i.test(body)) {
    return true;
  }
  return STEP_NEEDS_DIAGRAM_TITLE.test(title);
}

function diagramHasGraphics(step: Step): boolean {
  const diagram = step.diagram;
  if (!diagram || diagram.type !== 'svg') return false;
  return svgMarkupHasGraphicShapes(diagram.content);
}

function countStepDiagrams(capsule: Capsule): number {
  return capsule.steps.filter((s) => s.diagram?.content?.trim()).length;
}

function minDiagramCount(stepCount: number): number {
  return Math.max(2, Math.ceil(stepCount * 0.35));
}

export function auditCapsuleDiagrams(capsule: Capsule): ParseWarningCode[] {
  if (!isVisualDenseProblem(capsule)) return [];

  const issues: ParseWarningCode[] = [];
  const steps = capsule.steps;
  if (!steps.length) return issues;

  const diagramCount = countStepDiagrams(capsule);
  const requiredMin = minDiagramCount(steps.length);

  const first = steps[0]!;
  if (!first.diagram?.content?.trim()) {
    issues.push('missing_initial_circuit');
  } else if (!diagramHasGraphics(first)) {
    issues.push('diagram_lacks_graphics');
  }

  for (const step of steps) {
    if (!stepNeedsDiagram(step)) continue;
    if (!step.diagram?.content?.trim()) {
      if (!issues.includes('missing_circuit_diagram')) {
        issues.push('missing_circuit_diagram');
      }
      continue;
    }
    if (step.diagram.type === 'svg' && !diagramHasGraphics(step)) {
      if (!issues.includes('diagram_lacks_graphics')) {
        issues.push('diagram_lacks_graphics');
      }
    }
  }

  if (diagramCount < requiredMin && !issues.includes('insufficient_diagrams')) {
    issues.push('insufficient_diagrams');
  }

  return issues;
}

export function diagramQualityMessage(code: ParseWarningCode, capsule: Capsule): string {
  const steps = capsule.steps.length;
  const have = countStepDiagrams(capsule);
  const need = minDiagramCount(steps);
  switch (code) {
    case 'missing_initial_circuit':
      return `Step 1 must include @diagram type=svg showing the FULL original circuit — every component, node label, and ground.`;
    case 'missing_circuit_diagram':
      return `One or more topology steps (nodes, KCL/KVL, superposition, Thevenin, branch reduction) are missing @diagram type=svg.`;
    case 'insufficient_diagrams':
      return `Visual problem needs at least ${need} step diagrams (found ${have} on ${steps} steps). Add SVGs on setup, topology changes, and key analysis moves — never skip for laziness.`;
    case 'diagram_lacks_graphics':
      return `A @diagram block has text-only SVG (no line/path/rect/circle). Draw real circuit primitives — zigzag resistors, sources, wires, node labels.`;
    default:
      return `Circuit diagrams are incomplete for this visual problem.`;
  }
}

export function capsuleHasDiagramIssues(capsule: Capsule): boolean {
  return auditCapsuleDiagrams(capsule).length > 0;
}

export function primaryDiagramIssue(capsule: Capsule): ParseWarningCode | null {
  return auditCapsuleDiagrams(capsule)[0] ?? null;
}
