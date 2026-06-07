/**
 * Diagram coverage + completeness checks for spatial / circuit problems.
 *
 * Catches capsules that parse OK but omit circuit SVGs or emit lazy fragments
 * (e.g. hybrid-π with only r_π and R_E, missing R_C, collector, v_in).
 */
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import type { Capsule, ParseWarningCode, Step, Subject } from './types';

const VISUAL_SUBJECTS = new Set<Subject>([
  'Chemistry',
  'Electrical',
  'Physics',
  'Mechanical',
  'Civil',
  'Chemical',
  'Biology',
  'Math',
]);

const CHEMISTRY_VISUAL_QUESTION =
  /\b(draw|sketch|diagram|spectrum|orbital|energy level|molecular orbital|mo diagram|lewis|structure|conformation|newman|fischer|mechanism|energy profile|ice table|phase diagram|unit cell|lattice|spectroscop|nmr|ir\b|uv-?vis|titration curve|cell diagram|born-?haber|vsepr|hybrid)\b/i;

const CIRCUIT_QUESTION =
  /\b(circuit|resistor|capacitor|inductor|voltage|current|ohm|kirchhoff|kvl|kcl|thevenin|norton|superposition|mesh|branch|ground|dependent source|current source|label all nodes|consider the circuit|bjt|transistor|amplifier|hybrid|small[- ]signal|op-?amp|mosfet|common[- ]emitter|degeneration)\b/i;

const STEP_NEEDS_DIAGRAM_TITLE =
  /\b(label|node|ground|kcl|kvl|kirchhoff|circuit|branch|superposition|thevenin|norton|mesh|equivalent|reduc|kill|short|open|source|topology|schematic|wiring|phasor|impedance|draw|model|hybrid|small[- ]signal|bjt|transistor|mosfet|amplifier|op-?amp|gain|resistance|bandwidth|stability|feedback|rectifier|diode|free[- ]body|beam|truss|ray diagram|optical|structure|control volume|pathway)\b/i;

const TOPOLOGY_STEP_TITLE =
  /\b(label|node|ground|kcl|kvl|circuit|branch|superposition|thevenin|norton|mesh|equivalent|reduc|kill|short|open|topology|schematic|draw|model|hybrid|small[- ]signal|bjt|transistor|amplifier|op-?amp)\b/i;

const MODEL_STEP =
  /\b(draw|schematic|hybrid[- ]?π|hybrid[- ]?pi|small[- ]signal|equivalent circuit|bjt|transistor|op-?amp|mosfet|replace\s+(?:the\s+)?(?:bjt|transistor|device|op-?amp)\b)/i;

const EQUATION_DIAGRAM_STEP =
  /\b(solve\s+(?:the\s+)?\d|2\s*[×x]\s*2|matrix|gaussian|cramer|conductance matrix|equation system|system of equation)\b/i;

const TABLE_DIAGRAM_STEP = /\b(power balance|power table|verify.*power)\b/i;

const PURE_ALGEBRA_STEP =
  /\b(simplify|substitute numeric|solve for|back-substitut|units check|verify numerically|magnitude check)\b/i;

const COMPONENT_PATTERNS: RegExp[] = [
  /\bR[_]?C\b/gi,
  /\bR[_]?E\b/gi,
  /\bR[_]?B\b/gi,
  /\bR[_]?f\b/gi,
  /\bR[_]?g\b/gi,
  /\bR[_]?L\b/gi,
  /\bR[_]?in\b/gi,
  /\bR[_]?out\b/gi,
  /\bR[_]?th\b/gi,
  /\br[_\s]?(?:π|pi)\b/gi,
  /r_π/gi,
  /\bg[_]?m\b/gi,
  /\bC[_]?(?:π|c)\b/gi,
  /\bV[_]?(?:in|cc|ee|be|ce|test)\b/gi,
  /\bI[_]?[A-Z]\b/gi,
];

const HYBRID_PI_CONTEXT = /\b(hybrid|small[- ]signal|bjt|transistor|common[- ]emitter)\b/i;
const OPAMP_CONTEXT = /\bop-?amp\b/i;

const HYBRID_PI_REQUIRED_LABELS = ['rpi', 'gm', 're', 'rc'] as const;
const HYBRID_PI_NODE_LABELS = ['b', 'c', 'e'] as const;
const OPAMP_REQUIRED_LABELS = ['rf', 'rg'] as const;

function capsuleText(capsule: Capsule): string {
  const q = capsule.meta.question?.trim() ?? '';
  return `${q} ${capsule.meta.topic}`.trim();
}

function stepText(step: Step): string {
  return `${step.title} ${step.body} ${step.formula ?? ''}`;
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
  if (subject === 'Chemistry' && CHEMISTRY_VISUAL_QUESTION.test(text)) {
    return true;
  }
  return false;
}

function isElectrical(capsule: Capsule): boolean {
  return capsule.meta.subject === 'Electrical';
}

export function stepNeedsDiagram(step: Step, capsule?: Capsule): boolean {
  const title = step.title ?? '';
  const body = step.body ?? '';
  const text = stepText(step);

  if (capsule && isElectrical(capsule)) {
    if (TOPOLOGY_STEP_TITLE.test(title) || MODEL_STEP.test(text)) return true;
    if (/\b(R[_]?[A-Z]|r[_]?(?:π|pi)|g[_]?m|V[_]?be|collector|emitter|base|hybrid|small[- ]signal)\b/i.test(text)) {
      return true;
    }
    if (PURE_ALGEBRA_STEP.test(title) && !TOPOLOGY_STEP_TITLE.test(body)) return false;
    return true;
  }

  if (TOPOLOGY_STEP_TITLE.test(title)) return true;
  if (/\b(node [A-Z]\b|nodes? [A-Z](?:,? [A-Z])+|ground|KCL|KVL|superposition|Thevenin|Norton|hybrid|small[- ]signal|BJT|R[_]?in|R[_]?out)\b/i.test(body)) {
    return true;
  }
  return STEP_NEEDS_DIAGRAM_TITLE.test(title);
}

function diagramHasGraphics(step: Step): boolean {
  const diagram = step.diagram;
  if (!diagram || diagram.type !== 'svg') return false;
  return svgMarkupHasGraphicShapes(diagram.content);
}

function countSvgPrimitives(svg: string): number {
  const matches = svg.match(/<(line|path|polyline|polygon|rect|circle|ellipse)\b/gi);
  return matches?.length ?? 0;
}

function countSvgLabels(svg: string): number {
  const matches = svg.match(/<text\b/gi);
  return matches?.length ?? 0;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[\\{}_\s$]/g, '').replace(/π/g, 'pi');
}

export function extractMentionedComponents(text: string): string[] {
  const found = new Set<string>();
  for (const re of COMPONENT_PATTERNS) {
    const matches = text.match(re);
    if (!matches) continue;
    for (const m of matches) {
      found.add(normalizeForMatch(m));
    }
  }
  return [...found];
}

function extractSvgTextContent(svg: string): string {
  const parts: string[] = [];
  const re = /<text[^>]*>([^<]*)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) parts.push(m[1]!);
  return parts.join(' ');
}

export function svgMentionsComponent(svg: string, component: string): boolean {
  const hay = normalizeForMatch(extractSvgTextContent(svg));
  const needle = normalizeForMatch(component);
  if (!needle) return false;
  if (hay.includes(needle)) return true;
  if (needle === 'rpi' && (hay.includes('rpi') || hay.includes('rπ'))) return true;
  return false;
}

function diagramStepKind(step: Step): 'model' | 'equation' | 'table' | 'circuit' {
  const text = stepText(step);
  if (MODEL_STEP.test(text)) return 'model';
  if (EQUATION_DIAGRAM_STEP.test(text)) return 'equation';
  if (TABLE_DIAGRAM_STEP.test(text)) return 'table';
  return 'circuit';
}

export function auditStepDiagramCompleteness(step: Step, capsule: Capsule): ParseWarningCode[] {
  const diagram = step.diagram;
  if (!diagram?.content?.trim() || diagram.type !== 'svg') return [];
  if (!diagramHasGraphics(step)) return ['diagram_lacks_graphics'];

  const svg = diagram.content;
  const text = stepText(step);
  const primitives = countSvgPrimitives(svg);
  const labels = countSvgLabels(svg);
  const issues: ParseWarningCode[] = [];

  const kind = diagramStepKind(step);
  const modelMinPrimitives = isElectrical(capsule) ? 8 : 4;
  const modelMinLabels = isElectrical(capsule) ? 4 : 2;
  const minPrimitives =
    kind === 'model'
      ? modelMinPrimitives
      : kind === 'equation'
        ? 1
        : kind === 'table'
          ? 2
          : isElectrical(capsule)
            ? 4
            : 4;
  const minLabels =
    kind === 'model' ? modelMinLabels : kind === 'equation' ? 1 : kind === 'table' ? 3 : 2;
  const isModel = kind === 'model';

  if (primitives < minPrimitives || labels < minLabels) {
    issues.push('diagram_incomplete');
  }

  if (isModel) {
    const mentioned = extractMentionedComponents(text);
    const missing = mentioned.filter((c) => !svgMentionsComponent(svg, c));
    if (missing.length > 0) {
      if (!issues.includes('diagram_incomplete')) issues.push('diagram_incomplete');
    }
  }

  if (isModel && isElectrical(capsule) && HYBRID_PI_CONTEXT.test(text)) {
    for (const need of HYBRID_PI_REQUIRED_LABELS) {
      if (!svgMentionsComponent(svg, need)) {
        if (!issues.includes('diagram_incomplete')) issues.push('diagram_incomplete');
      }
    }
    const nodeHits = HYBRID_PI_NODE_LABELS.filter((n) => svgMentionsComponent(svg, n)).length;
    if (nodeHits < 2) {
      if (!issues.includes('diagram_incomplete')) issues.push('diagram_incomplete');
    }
  }

  if (isElectrical(capsule) && OPAMP_CONTEXT.test(text) && (isModel || /\b(draw|feedback|Rf|Rg)\b/i.test(text))) {
    const opampHits = OPAMP_REQUIRED_LABELS.filter((n) => svgMentionsComponent(svg, n)).length;
    const mentionedOpamp = extractMentionedComponents(text).some((c) => c === 'rf' || c === 'rg');
    if (mentionedOpamp && opampHits < 2) {
      if (!issues.includes('diagram_incomplete')) issues.push('diagram_incomplete');
    }
    if (isModel && opampHits < 2) {
      if (!issues.includes('diagram_incomplete')) issues.push('diagram_incomplete');
    }
  }

  return issues;
}

function countStepDiagrams(capsule: Capsule): number {
  return capsule.steps.filter((s) => s.diagram?.content?.trim()).length;
}

function minDiagramCount(stepCount: number, capsule: Capsule): number {
  if (isElectrical(capsule)) {
    return Math.max(3, Math.ceil(stepCount * 0.55));
  }
  return Math.max(2, Math.ceil(stepCount * 0.4));
}

export function auditCapsuleDiagrams(capsule: Capsule): ParseWarningCode[] {
  if (!isVisualDenseProblem(capsule)) return [];

  const issues: ParseWarningCode[] = [];
  const steps = capsule.steps;
  if (!steps.length) return issues;

  const diagramCount = countStepDiagrams(capsule);
  const requiredMin = minDiagramCount(steps.length, capsule);

  const first = steps[0]!;
  if (!first.diagram?.content?.trim()) {
    issues.push('missing_initial_circuit');
  } else {
    for (const code of auditStepDiagramCompleteness(first, capsule)) {
      if (!issues.includes(code)) issues.push(code);
    }
  }

  for (const step of steps) {
    if (!stepNeedsDiagram(step, capsule)) continue;
    if (!step.diagram?.content?.trim()) {
      if (!issues.includes('missing_circuit_diagram')) issues.push('missing_circuit_diagram');
      continue;
    }
    for (const code of auditStepDiagramCompleteness(step, capsule)) {
      if (!issues.includes(code)) issues.push(code);
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
  const need = minDiagramCount(steps, capsule);
  switch (code) {
    case 'missing_initial_circuit':
      return `Step 1 must include @diagram type=svg showing the FULL original circuit/model — every component, node (B,C,E), ground, sources, and loads.`;
    case 'missing_circuit_diagram':
      return `One or more steps (models, KCL/KVL, gain/Rin/Rout, superposition, Thevenin) are missing @diagram type=svg. Electrical problems need a diagram on nearly every step.`;
    case 'insufficient_diagrams':
      return `Visual problem needs at least ${need} step diagrams (found ${have} on ${steps} steps). Add complete SVGs on setup, models, derivations, and topology changes — never skip.`;
    case 'diagram_lacks_graphics':
      return `A @diagram block has text-only SVG (no line/path/rect/circle). Draw real circuit primitives — resistors, BJT/hybrid-π, controlled sources, wires, node labels.`;
    case 'diagram_incomplete':
      return `A @diagram is too sparse or omits components named in @body (e.g. R_C, R_E, r_π, g_m, collector, v_in). Redraw the COMPLETE schematic for this step — every element you analyze must appear in the SVG with labels.`;
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
