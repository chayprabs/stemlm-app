/**
 * Diagram coverage + completeness checks for spatial / circuit problems.
 *
 * Catches capsules that parse OK but omit circuit SVGs or emit lazy fragments
 * (e.g. hybrid-π with only r_π and R_E, missing R_C, collector, v_in).
 */
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import { parseViewBox } from '@/src/lib/diagram-bounds';
import type { Capsule, ParseWarningCode, Step, Subject } from './types';
import { canonicalizeDiagramType, familyRequiredMissing, SPEC_FAMILIES } from '@/src/lib/figure/catalog';
import { parseSpec, specIds, specHas } from '@/src/lib/figure/spec';
import { samplePathD } from '@/src/lib/figure/geom';

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

const BIOLOGY_VISUAL_QUESTION =
  /\b(draw|sketch|diagrams?|labels?|labeled|cell|organelle|punnett|pedigree|pathway|cycle|membrane|anatomy|mitosis|meiosis|food web|phylogen\w+|gel electrophoresis|ecg|synapse|chloroplast|mitochondri|lac operon|action potential|respiratory|digestive tract|heart|neuron|virus|immune|calvin|krebs|glycolysis|hardy-?weinberg|pcr|blastocyst|gastrulation)\b/i;

const MATH_VISUAL_QUESTION =
  /\b(graph|sketch|plot|figure|number line|coordinate|level curve|contour|phase (?:plane|portrait)|vector field|geometry|triangle|circle|region|shade|eigenvector|basis|disk|paraboloid|polar)\b/i;

const GRAPH_LIKE_CONTEXT =
  /\b(graph|plot|axes?|axis|phase diagram|phase portrait|spectrum|spectra|titration curve|energy profile|reaction coordinate|p[- ]?v|t[- ]?s|distribution|bode|nyquist|root locus|contour|level curve|vector field|free energy|gibbs)\b/i;

const MO_CONTEXT =
  /\b(molecular orbital|mo diagram|orbital energy|energy level|sigma|π|pi orbital|antibonding|bonding orbital)\b/i;

const PHYSICS_FBD_CONTEXT = /\b(free[- ]body|fbd|force diagram|normal force|tension|friction|weight|incline)\b/i;

const PHYSICS_RAY_CONTEXT = /\b(ray diagram|optical axis|lens|mirror|focal|image distance|object distance)\b/i;

const BIOLOGY_PATHWAY_CONTEXT =
  /\b(pathway|cycle|signaling|signal transduction|metabolic|regulation|activation|inhibition|operon|cell cycle|calvin|krebs|glycolysis|food web)\b/i;

const CIRCUIT_QUESTION =
  /\b(circuit|resistor|capacitor|inductor|voltage|current|ohm|kirchhoff|kvl|kcl|thevenin|norton|superposition|mesh|branch|ground|dependent source|current source|label all nodes|consider the circuit|bjt|transistor|amplifier|hybrid|small[- ]signal|op-?amp|mosfet|common[- ]emitter|degeneration)\b/i;

const STEP_NEEDS_DIAGRAM_TITLE =
  /\b(label|node|ground|kcl|kvl|kirchhoff|circuit|branch|superposition|thevenin|norton|mesh|equivalent|reduc|kill|short|open|source|topology|schematic|wiring|phasor|impedance|draw|sketch|plot|graph|model|hybrid|small[- ]signal|bjt|transistor|mosfet|amplifier|op-?amp|gain|resistance|bandwidth|stability|feedback|rectifier|diode|free[- ]body|fbd|beam|truss|ray diagram|optical|lens|mirror|structure|mechanism|orbital|lewis|energy (?:level|diagram|profile)|spectrum|control volume|pathway|cycle|punnett|pedigree|number line|region|shade|vector field|phase (?:portrait|plane|diagram)|contour|stress|shear|bending moment|sfd|bmd|field (?:line|map|diagram))\b/i;

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
  /\bR[_]?\d+\b/gi,
  /\bC[_]?\d+\b/gi,
  /\bL[_]?\d+\b/gi,
  /\bD[_]?\d+\b/gi,
  /\bQ[_]?\d+\b/gi,
  /\br[_\s]?(?:π|pi)\b/gi,
  /r_π/gi,
  /\br[_]?o\b/gi,
  /\bg[_]?m\b/gi,
  /\bC[_]?(?:π|c|mu|μ)\b/gi,
  /\bV[_]?(?:in|out|cc|dd|ss|ee|be|ce|gs|ds|test|th)\b/gi,
  /\bI[_]?[A-Z]\b/gi,
  /\bGND\b/gi,
];

/** BJT hybrid-π only — not generic MOSFET/small-signal analysis */
const HYBRID_PI_CONTEXT =
  /\b(hybrid[- ]?π|hybrid[- ]?pi|hybrid|bjt|transistor|common[- ]emitter)\b/i;
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
  if (
    subject === 'Physics' &&
    /\b(ray|lens|mirror|free[- ]body|fbd|field (?:line|map)|circuit|incline|projectile|pulley|tension|trajectory|graph|wave|optical)\b/i.test(
      text,
    )
  ) {
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
  if (subject === 'Biology' && BIOLOGY_VISUAL_QUESTION.test(text)) {
    return true;
  }
  if (subject === 'Math' && MATH_VISUAL_QUESTION.test(text)) {
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
    if (STEP_NEEDS_DIAGRAM_TITLE.test(title)) return true;
    if (/\b(node [A-Z]\b|nodes? [A-Z](?:,? [A-Z])+|ground|KCL|KVL|superposition|Thevenin|Norton|hybrid|small[- ]signal|BJT|R[_]?in|R[_]?out)\b/i.test(body)) {
      return true;
    }
    return false;
  }

  if (TOPOLOGY_STEP_TITLE.test(title)) return true;
  if (/\b(node [A-Z]\b|nodes? [A-Z](?:,? [A-Z])+|ground|KCL|KVL|superposition|Thevenin|Norton|hybrid|small[- ]signal|BJT|R[_]?in|R[_]?out)\b/i.test(body)) {
    return true;
  }
  return STEP_NEEDS_DIAGRAM_TITLE.test(title);
}

function diagramHasGraphics(step: Step): boolean {
  const diagram = step.diagram;
  if (!diagram?.content?.trim()) return false;
  const type = canonicalizeDiagramType(diagram.type);
  if (type === 'svg') return svgMarkupHasGraphicShapes(diagram.content);
  if (type === 'mermaid') return true;
  return diagram.content.trim().length > 0;
}

function specCoversComponent(content: string, type: string, component: string): boolean {
  const spec = parseSpec(type, content);
  const ids = specIds(spec).map(normalizeForMatch);
  const needle = normalizeForMatch(component);
  // Typed specs are checked by semantic membership, never by rendered SVG
  // labels or substring matches that can turn R1 into a false R10 hit.
  if (ids.some((id) => id === needle)) return true;
  if (specHas(spec, component)) return true;
  const variants = needle === 'rpi' ? [component, 'rpi', 'r_π'] : [component];
  if (variants.some((variant) => new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(variant)}(?=$|[^A-Za-z0-9])`, 'i').test(content))) {
    return true;
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countSvgPrimitives(svg: string): number {
  const matches = svg.match(/<(line|path|polyline|polygon|rect|circle|ellipse)\b/gi);
  return matches?.length ?? 0;
}

function countSvgLabels(svg: string): number {
  const matches = svg.match(/<text\b/gi);
  return matches?.length ?? 0;
}

function parseSvg(svg: string): SVGSVGElement | null {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return null;
  const root = doc.documentElement;
  return root?.tagName.toLowerCase() === 'svg' ? (root as unknown as SVGSVGElement) : null;
}

function textFontSize(el: Element): number {
  const raw = el.getAttribute('font-size') ?? el.parentElement?.getAttribute('font-size');
  const size = Number(raw);
  return Number.isFinite(size) && size > 0 ? size : 14;
}

function textPosition(el: Element): { x: number; y: number } | null {
  const x = Number(el.getAttribute('x'));
  const y = Number(el.getAttribute('y'));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function textBox(el: Element): { x1: number; y1: number; x2: number; y2: number } | null {
  const pos = textPosition(el);
  if (!pos) return null;
  const size = textFontSize(el);
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const width = Math.max(size * 0.7, text.length * size * 0.55);
  const height = size * 1.15;
  const anchor = el.getAttribute('text-anchor') ?? 'start';
  const x1 = anchor === 'middle' ? pos.x - width / 2 : anchor === 'end' ? pos.x - width : pos.x;
  const y1 = pos.y - height * 0.72;
  return { x1, y1, x2: x1 + width, y2: y1 + height };
}

function boxesOverlap(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function pathLineSegments(d: string): Segment[] {
  return samplePathD(d).map((s) => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }));
}

function collectSegments(root: Element): Segment[] {
  const segments: Segment[] = [];
  for (const line of root.querySelectorAll('line')) {
    if (line.closest('marker')) continue;
    segments.push({
      x1: Number(line.getAttribute('x1') ?? 0),
      y1: Number(line.getAttribute('y1') ?? 0),
      x2: Number(line.getAttribute('x2') ?? 0),
      y2: Number(line.getAttribute('y2') ?? 0),
    });
  }
  for (const poly of root.querySelectorAll('polyline, polygon')) {
    if (poly.closest('marker')) continue;
    const pts = (poly.getAttribute('points') ?? '')
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    for (let i = 0; i + 3 < pts.length; i += 2) {
      segments.push({ x1: pts[i]!, y1: pts[i + 1]!, x2: pts[i + 2]!, y2: pts[i + 3]! });
    }
  }
  for (const path of root.querySelectorAll('path')) {
    if (path.closest('marker')) continue;
    const d = path.getAttribute('d');
    if (d) segments.push(...pathLineSegments(d));
  }
  return segments.filter((s) =>
    [s.x1, s.y1, s.x2, s.y2].every((n) => Number.isFinite(n)),
  );
}

function distancePointToSegment(px: number, py: number, seg: Segment): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - seg.x1, py - seg.y1);
  const t = Math.max(0, Math.min(1, ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq));
  return Math.hypot(px - (seg.x1 + t * dx), py - (seg.y1 + t * dy));
}

function svgTextContent(svg: string): string {
  return extractSvgTextContent(svg).replace(/\s+/g, ' ').trim();
}

function hasAxisLikeLabels(text: string): boolean {
  return /\b(x|y|time|t|frequency|f|energy|e|gibbs|reaction coordinate|pressure|p|volume|v|temperature|entropy|wavelength|speed|radius|concentration|absorbance|potential|current|voltage)\b/i.test(text);
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

function auditSvgLayout(svg: string, step: Step, capsule: Capsule): ParseWarningCode[] {
  const issues: ParseWarningCode[] = [];
  const root = parseSvg(svg);
  const vb = parseViewBox(root?.getAttribute('viewBox') ?? /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1]);
  if (!vb) {
    issues.push('diagram_bad_viewbox');
    return issues;
  }

  const aspect = vb.w / vb.h;
  if (vb.w < 80 || vb.h < 45 || vb.w > 720 || vb.h > 520 || aspect > 4.2 || aspect < 0.25) {
    issues.push('diagram_bad_viewbox');
  }
  if (!root) return issues;

  const texts: Element[] = [...root.querySelectorAll('text')].filter((el) => !el.closest('marker'));
  const boxes = texts.flatMap((el) => {
    const box = textBox(el);
    return box ? [{ el, box }] : [];
  });

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const aText = (a.el.textContent ?? '').trim();
      const bText = (b.el.textContent ?? '').trim();
      if (!aText || !bText) continue;
      if (boxesOverlap(a.box, b.box)) {
        issues.push('diagram_label_collision');
        break;
      }
    }
    if (issues.includes('diagram_label_collision')) break;
  }

  const segments = collectSegments(root);
  for (const { el, box } of boxes) {
    const text = (el.textContent ?? '').trim();
    if (!text || /^(Re|Im|x|y)$/i.test(text)) continue;
    const center = { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };
    if (segments.some((seg) => distancePointToSegment(center.x, center.y, seg) < Math.max(4, textFontSize(el) * 0.25))) {
      issues.push('diagram_label_over_graphic');
      break;
    }
  }

  const text = `${capsuleText(capsule)} ${stepText(step)} ${svgTextContent(svg)}`;
  if (GRAPH_LIKE_CONTEXT.test(text)) {
    const lineCount = root.querySelectorAll('line, path, polyline').length;
    if (lineCount < 2 || countSvgLabels(svg) < 2 || !hasAxisLikeLabels(svgTextContent(svg))) {
      issues.push('diagram_missing_axes');
    }
  }

  if (MO_CONTEXT.test(text) && !/(σ|sigma|π|pi|energy|ao|mo|bonding|antibonding|\*)/i.test(svgTextContent(svg))) {
    issues.push('diagram_missing_axes');
  }

  if (BIOLOGY_PATHWAY_CONTEXT.test(text)) {
    const hasArrow = /marker-end|marker-start|points=|→|->|activation|inhibition/i.test(svg);
    if (!hasArrow || countSvgLabels(svg) < 3) {
      issues.push('diagram_incomplete');
    }
  }

  if (PHYSICS_FBD_CONTEXT.test(text)) {
    const hasForceLabels = /\b(N|T|f|mg|W|F[_\s]?[a-zA-Z]?|weight|normal|tension|friction)\b/i.test(svgTextContent(svg));
    if (!hasForceLabels || !/marker-end|polygon/i.test(svg)) {
      issues.push('diagram_incomplete');
    }
  }

  if (PHYSICS_RAY_CONTEXT.test(text)) {
    const hasOpticsLabels = /\b(F|2F|lens|mirror|object|image|axis|ray)\b/i.test(svgTextContent(svg));
    if (!hasOpticsLabels || !/marker-end|polygon/i.test(svg)) {
      issues.push('diagram_incomplete');
    }
  }

  const labels = countSvgLabels(svg);
  const primitives = countSvgPrimitives(svg);
  if (labels >= 4 && primitives <= 2) {
    issues.push('diagram_legend_only');
  }

  return [...new Set(issues)];
}

function auditSpecCompleteness(step: Step, capsule: Capsule): ParseWarningCode[] {
  const diagram = step.diagram!;
  const type = canonicalizeDiagramType(diagram.type);
  const issues: ParseWarningCode[] = [];
  const text = stepText(step);
  // The catalog is the admission boundary for typed specs. Unknown families
  // fail closed; known families are judged from their spec keys and ids.
  if (!SPEC_FAMILIES.has(type)) issues.push('diagram_incomplete');
  const missingKeys = familyRequiredMissing(type, diagram.content);
  if (missingKeys.length) issues.push('diagram_incomplete');

  if (isElectrical(capsule) && HYBRID_PI_CONTEXT.test(text) && (type === 'hybridpi' || /hybrid/i.test(text))) {
    for (const need of HYBRID_PI_REQUIRED_LABELS) {
      if (!specCoversComponent(diagram.content, type, need)) issues.push('diagram_incomplete');
    }
  }
  if (isElectrical(capsule) && OPAMP_CONTEXT.test(text) && (type === 'opamp' || /\b(draw|feedback|Rf|Rg)\b/i.test(text))) {
    for (const need of OPAMP_REQUIRED_LABELS) {
      if (!specCoversComponent(diagram.content, type, need)) issues.push('diagram_incomplete');
    }
  }
  const mentioned = extractMentionedComponents(text);
  if (mentioned.length > 0) {
    const missing = mentioned.filter((c) => !specCoversComponent(diagram.content, type, c));
    if (missing.length > 0) issues.push('diagram_incomplete');
  }
  // Do not apply SVG primitive/label/legend heuristics to a typed spec. The
  // family catalog's required/requiredAny keys and the spec-id membership
  // checks above are the source of truth for model output.
  return [...new Set(issues)];
}

export function auditStepDiagramCompleteness(step: Step, capsule: Capsule): ParseWarningCode[] {
  const diagram = step.diagram;
  if (!diagram?.content?.trim()) return [];
  const type = canonicalizeDiagramType(diagram.type);
  if (type !== 'svg' && type !== 'mermaid') {
    return auditSpecCompleteness(step, capsule);
  }
  if (type === 'mermaid') return [];
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

  for (const code of auditSvgLayout(svg, step, capsule)) {
    if (!issues.includes(code)) issues.push(code);
  }

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

function hasClosedSpec(step: Step): boolean {
  return Boolean(step.diagram?.content?.trim());
}

export function auditCapsuleDiagrams(capsule: Capsule): ParseWarningCode[] {
  if (!isVisualDenseProblem(capsule)) return [];

  const issues: ParseWarningCode[] = [];
  const steps = capsule.steps;
  if (!steps.length) return issues;

  const first = steps[0]!;
  if (stepNeedsDiagram(first, capsule) && !hasClosedSpec(first)) {
    issues.push('missing_initial_circuit');
  } else if (hasClosedSpec(first)) {
    for (const code of auditStepDiagramCompleteness(first, capsule)) {
      if (!issues.includes(code)) issues.push(code);
    }
  }

  for (const step of steps) {
    if (!stepNeedsDiagram(step, capsule)) continue;
    if (!hasClosedSpec(step)) {
      if (!issues.includes('missing_circuit_diagram')) issues.push('missing_circuit_diagram');
      continue;
    }
    if (step === first) continue;
    for (const code of auditStepDiagramCompleteness(step, capsule)) {
      if (!issues.includes(code)) issues.push(code);
    }
  }

  return issues;
}

export function diagramQualityMessage(code: ParseWarningCode, capsule: Capsule): string {
  const visualNeed = capsule.steps.filter((s) => stepNeedsDiagram(s, capsule)).length;
  const have = capsule.steps.filter((s) => stepNeedsDiagram(s, capsule) && s.diagram?.content?.trim()).length;
  const subject = capsule.meta.subject;
  switch (code) {
    case 'missing_initial_circuit':
      return subject === 'Electrical'
        ? `Step 1 must include @diagram type=circuit or type=hybridpi/opamp showing the FULL original circuit/model — every named id (B,C,E, rpi, gm, re, rc).`
        : `Step 1 must include @diagram with a complete SPEC of the visual model for this ${subject} problem — named parts, axes, and key relationships.`;
    case 'missing_circuit_diagram':
      return subject === 'Electrical'
        ? `One or more visual state-changing steps (models, KCL/KVL, gain/Rin/Rout, superposition, Thevenin) are missing a closed @diagram spec. Electrical: OMIT diagrams on unit conversion only; NEVER skip the circuit when components exist.`
        : `One or more visual ${subject} steps are missing @diagram specs. Add a typed spec for every draw/sketch/model/graph/pathway/state step.`;
    case 'insufficient_diagrams':
      return `Every visual state-changing step needs a closed @diagram spec (found ${have} of ${visualNeed}). Algebra and unit conversion may omit figures; never skip a topology/model/state change.`;
    case 'diagram_lacks_graphics':
      return `A @diagram block has no drawable content. Emit a typed spec (plot/scene/graph/table/circuit/template) naming every object, not a text-only legend.`;
    case 'diagram_incomplete':
      return subject === 'Electrical'
        ? `A @diagram spec omits components named in @body (e.g. R_C, R_E, r_π, g_m). Every analyzed id must appear as a named key in the spec (hybrid-π needs rpi, gm, re, rc).`
        : `A @diagram spec omits objects named in @body. Every analyzed structure, axis, force, curve, species, or node must appear as a named id in the spec.`;
    case 'diagram_bad_viewbox':
      return `A compiled @diagram has an invalid frame. The compiler owns bounds; do not emit viewBox or path coordinates.`;
    case 'diagram_label_collision':
      return `A compiled @diagram has overlapping labels. The compiler should fail closed — emit a cleaner spec with fewer labels.`;
    case 'diagram_label_over_graphic':
      return `A compiled @diagram places a label on a stroke. Emit ids only; the compiler places labels off curves and wires.`;
    case 'diagram_missing_axes':
      return `A plot-style @diagram is missing xlabel/ylabel with units, or domain/fn. Name axes in the spec.`;
    case 'diagram_legend_only':
      return `A @diagram spec has no series, nodes, or devices. Do not emit a "Symbols:" list — name real objects.`;
    default:
      return `Diagrams are incomplete for this visual problem.`;
  }
}

export function capsuleHasDiagramIssues(capsule: Capsule): boolean {
  return auditCapsuleDiagrams(capsule).length > 0;
}

export function primaryDiagramIssue(capsule: Capsule): ParseWarningCode | null {
  return auditCapsuleDiagrams(capsule)[0] ?? null;
}
