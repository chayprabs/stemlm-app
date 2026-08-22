import type { Scene, SceneLabel, SceneNode, SceneStroke, SemanticColor, SlotHint, StrokeKind } from './types';

export class SceneBuilder {
  nodes: SceneNode[] = [];
  strokes: SceneStroke[] = [];
  labels: SceneLabel[] = [];
  highlights: string[] = [];
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
    opts: { color?: SemanticColor; width?: number; dash?: boolean; markerEnd?: boolean; markerStart?: boolean; protected?: boolean } = {},
  ): this {
    return this.stroke({
      id,
      kind: 'line',
      points: [x1, y1, x2, y2],
      semanticColor: opts.color ?? 'neutral',
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
    opts: { color?: SemanticColor; width?: number; dash?: boolean; markerEnd?: boolean; fill?: SceneStroke['fill'] } = {},
  ): this {
    return this.stroke({
      id,
      kind: 'polyline',
      points: pts,
      semanticColor: opts.color ?? 'neutral',
      width: opts.width,
      dash: opts.dash,
      markerEnd: opts.markerEnd,
      fill: opts.fill,
    });
  }

  polygon(id: string, pts: number[], opts: { color?: SemanticColor; fill?: SceneStroke['fill']; width?: number } = {}): this {
    return this.stroke({
      id,
      kind: 'polygon',
      points: pts,
      semanticColor: opts.color ?? 'neutral',
      fill: opts.fill ?? 'none',
      width: opts.width,
    });
  }

  path(id: string, d: string, opts: { color?: SemanticColor; width?: number; dash?: boolean; markerEnd?: boolean; fill?: SceneStroke['fill'] } = {}): this {
    return this.stroke({
      id,
      kind: 'path',
      points: [],
      d,
      semanticColor: opts.color ?? 'neutral',
      width: opts.width,
      dash: opts.dash,
      markerEnd: opts.markerEnd,
      fill: opts.fill,
    });
  }

  circle(id: string, cx: number, cy: number, r: number, opts: { color?: SemanticColor; fill?: SceneStroke['fill']; width?: number } = {}): this {
    return this.stroke({
      id,
      kind: 'circle',
      points: [cx, cy, r],
      semanticColor: opts.color ?? 'neutral',
      fill: opts.fill ?? 'none',
      width: opts.width,
    });
  }

  rect(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { color?: SemanticColor; fill?: SceneStroke['fill']; width?: number } = {},
  ): this {
    return this.stroke({
      id,
      kind: 'rect' as StrokeKind,
      points: [x, y, w, h],
      semanticColor: opts.color ?? 'neutral',
      fill: opts.fill ?? 'none',
      width: opts.width,
    });
  }

  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, opts: { color?: SemanticColor; fill?: SceneStroke['fill'] } = {}): this {
    return this.stroke({
      id,
      kind: 'ellipse',
      points: [cx, cy, rx, ry],
      semanticColor: opts.color ?? 'neutral',
      fill: opts.fill ?? 'none',
    });
  }

  label(
    id: string,
    text: string,
    x: number,
    y: number,
    opts: { slot?: SlotHint; protected?: boolean; katex?: boolean; anchorId?: string } = {},
  ): this {
    const lab: SceneLabel = {
      id,
      x,
      y,
      slotHint: opts.slot ?? 'auto',
      protected: opts.protected,
      anchorId: opts.anchorId,
    };
    if (opts.katex) lab.katex = text;
    else lab.text = text;
    lab.kind = opts.katex ? 'katex' : 'text';
    this.labels.push(lab);
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
    };
  }
}

export function frameSize(profile: 'step' | 'solution' | 'print'): { w: number; h: number } {
  if (profile === 'print') return { w: 480, h: 275 };
  if (profile === 'solution') return { w: 340, h: 185 };
  return { w: 300, h: 165 };
}
