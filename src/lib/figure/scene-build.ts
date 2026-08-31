import type {
  LabelPriority,
  Scene,
  SceneDimension,
  SceneLabel,
  SceneNode,
  ScenePanel,
  SceneStroke,
  SemanticColor,
  SlotHint,
  StrokeKind,
  StrokeRole,
} from './types';

export class SceneBuilder {
  nodes: SceneNode[] = [];
  strokes: SceneStroke[] = [];
  labels: SceneLabel[] = [];
  highlights: string[] = [];
  panels: ScenePanel[] = [];
  dimensions: SceneDimension[] = [];
  private n = 0;

  constructor(
    public family: string,
    public width: number,
    public height: number,
  ) {}

  uid(prefix: string): string {
    this.n += 1;
    return `${prefix}${this.n}`;
  }

  hl(ids: string[]): this {
    this.highlights.push(...ids);
    return this;
  }

  node(id: string, x: number, y: number, w: number, h: number, kind = 'box', glyph?: string): this {
    this.nodes.push({ id, kind, bbox: { x, y, w, h }, glyph });
    return this;
  }

  stroke(partial: Omit<SceneStroke, 'semanticColor'> & { semanticColor?: SemanticColor }): this {
    this.strokes.push({ semanticColor: 'neutral', ...partial });
    return this;
  }

  line(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts: { color?: SemanticColor; role?: StrokeRole; width?: number; dash?: boolean; markerEnd?: boolean; markerStart?: boolean; protected?: boolean } = {},
  ): this {
    return this.stroke({
      id,
      kind: 'line',
      points: [x1, y1, x2, y2],
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      width: opts.width,
      dash: opts.dash,
      markerEnd: opts.markerEnd,
      markerStart: opts.markerStart,
      protected: opts.protected,
    });
  }

  polyline(
    id: string,
    pts: number[],
    opts: { color?: SemanticColor; role?: StrokeRole; width?: number; dash?: boolean; markerEnd?: boolean; fill?: SceneStroke['fill']; pattern?: SceneStroke['pattern'] } = {},
  ): this {
    return this.stroke({
      id,
      kind: 'polyline',
      points: pts,
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      width: opts.width,
      dash: opts.dash,
      markerEnd: opts.markerEnd,
      fill: opts.fill,
      pattern: opts.pattern,
    });
  }

  polygon(id: string, pts: number[], opts: { color?: SemanticColor; role?: StrokeRole; fill?: SceneStroke['fill']; pattern?: SceneStroke['pattern']; width?: number } = {}): this {
    return this.stroke({
      id,
      kind: 'polygon',
      points: pts,
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      fill: opts.fill ?? 'none',
      pattern: opts.pattern,
      width: opts.width,
    });
  }

  path(id: string, d: string, opts: { color?: SemanticColor; role?: StrokeRole; width?: number; dash?: boolean; markerEnd?: boolean; fill?: SceneStroke['fill']; pattern?: SceneStroke['pattern'] } = {}): this {
    return this.stroke({
      id,
      kind: 'path',
      points: [],
      d,
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      width: opts.width,
      dash: opts.dash,
      markerEnd: opts.markerEnd,
      fill: opts.fill,
      pattern: opts.pattern,
    });
  }

  circle(id: string, cx: number, cy: number, r: number, opts: { color?: SemanticColor; role?: StrokeRole; fill?: SceneStroke['fill']; pattern?: SceneStroke['pattern']; width?: number } = {}): this {
    return this.stroke({
      id,
      kind: 'circle',
      points: [cx, cy, r],
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      fill: opts.fill ?? 'none',
      pattern: opts.pattern,
      width: opts.width,
    });
  }

  rect(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { color?: SemanticColor; role?: StrokeRole; fill?: SceneStroke['fill']; pattern?: SceneStroke['pattern']; width?: number } = {},
  ): this {
    return this.stroke({
      id,
      kind: 'rect' as StrokeKind,
      points: [x, y, w, h],
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      fill: opts.fill ?? 'none',
      pattern: opts.pattern,
      width: opts.width,
    });
  }

  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, opts: { color?: SemanticColor; role?: StrokeRole; fill?: SceneStroke['fill']; pattern?: SceneStroke['pattern'] } = {}): this {
    return this.stroke({
      id,
      kind: 'ellipse',
      points: [cx, cy, rx, ry],
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      fill: opts.fill ?? 'none',
      pattern: opts.pattern,
    });
  }

  arc(
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    startDeg: number,
    endDeg: number,
    opts: { color?: SemanticColor; role?: StrokeRole; width?: number; dash?: boolean; markerEnd?: boolean } = {},
  ): this {
    const start = (startDeg * Math.PI) / 180;
    const end = (endDeg * Math.PI) / 180;
    const x1 = cx + rx * Math.cos(start);
    const y1 = cy + ry * Math.sin(start);
    const x2 = cx + rx * Math.cos(end);
    const y2 = cy + ry * Math.sin(end);
    const delta = endDeg - startDeg;
    return this.stroke({
      id,
      kind: 'arc',
      points: [cx, cy, rx, ry, startDeg, endDeg],
      d: `M ${x1} ${y1} A ${rx} ${ry} 0 ${Math.abs(delta) > 180 ? 1 : 0} ${delta >= 0 ? 1 : 0} ${x2} ${y2}`,
      semanticColor: opts.color ?? 'neutral',
      role: opts.role,
      width: opts.width,
      dash: opts.dash,
      markerEnd: opts.markerEnd,
    });
  }

  label(
    id: string,
    text: string,
    x: number,
    y: number,
    opts: { slot?: SlotHint; protected?: boolean; priority?: LabelPriority; katex?: boolean; anchorId?: string; groupId?: string; panelId?: string } = {},
  ): this {
    const lab: SceneLabel = {
      id,
      x,
      y,
      slotHint: opts.slot ?? 'auto',
      protected: opts.protected,
      priority: opts.priority ?? (opts.protected ? 'required' : 'optional'),
      anchorId: opts.anchorId,
      groupId: opts.groupId,
      panelId: opts.panelId,
    };
    if (opts.katex) lab.katex = text;
    else lab.text = text;
    lab.kind = opts.katex ? 'katex' : 'text';
    this.labels.push(lab);
    return this;
  }

  labelPair(
    groupId: string,
    designator: { id: string; text: string },
    value: { id: string; text: string },
    x: number,
    y: number,
    opts: { slot?: SlotHint; protected?: boolean; priority?: LabelPriority; anchorId?: string; panelId?: string } = {},
  ): this {
    const shared = {
      slot: opts.slot,
      protected: opts.protected,
      priority: opts.priority,
      anchorId: opts.anchorId,
      groupId,
      panelId: opts.panelId,
    };
    this.label(designator.id, designator.text, x, y - 8, shared);
    this.label(value.id, value.text, x, y + 8, shared);
    return this;
  }

  panel(id: string, role: string, x: number, y: number, w: number, h: number, parentId?: string): this {
    this.panels.push({ id, role, bbox: { x, y, w, h }, order: this.panels.length, parentId });
    return this;
  }

  dimension(
    id: string,
    fromId: string,
    toId: string,
    labelId?: string,
    orientation: SceneDimension['orientation'] = 'aligned',
  ): this {
    this.dimensions.push({ id, fromId, toId, labelId, orientation });
    return this;
  }

  scene(): Scene {
    const hi = new Set(this.highlights.map((s) => s.toLowerCase()));
    for (const s of this.strokes) {
      if (hi.has(s.id.toLowerCase())) s.semanticColor = 'accent';
    }
    return {
      family: this.family,
      width: this.width,
      height: this.height,
      nodes: this.nodes,
      strokes: this.strokes,
      labels: this.labels,
      highlights: this.highlights,
      panels: this.panels,
      dimensions: this.dimensions,
    };
  }
}

export function frameSize(profile: 'step' | 'solution' | 'print'): { w: number; h: number } {
  if (profile === 'print') return { w: 480, h: 275 };
  if (profile === 'solution') return { w: 340, h: 185 };
  return { w: 300, h: 165 };
}
