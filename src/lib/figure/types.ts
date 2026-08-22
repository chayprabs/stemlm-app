/**
 * Scene IR for the stemLM Figure Compiler.
 * Families emit this; the Shared Layout Kernel owns collision, theme, and overlays.
 */
import type { DiagramSizeProfile } from '@/src/lib/diagram-bounds';

export type SemanticColor = 'neutral' | 'accent' | 'muted' | 'danger' | 'guide';

export type SlotHint = 'N' | 'E' | 'S' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'auto';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneNode {
  id: string;
  kind: string;
  bbox: BBox;
  /** Optional raw SVG fragment in scene coordinates (already escaped). */
  glyph?: string;
}

export type StrokeKind = 'line' | 'polyline' | 'path' | 'circle' | 'rect' | 'polygon' | 'ellipse';

export interface SceneStroke {
  id: string;
  kind: StrokeKind;
  /** Flattened numbers: line [x1,y1,x2,y2]; polyline/polygon points; circle [cx,cy,r]; rect [x,y,w,h]; ellipse [cx,cy,rx,ry]. */
  points: number[];
  d?: string;
  semanticColor: SemanticColor;
  width?: number;
  dash?: boolean;
  fill?: 'none' | SemanticColor | 'solid';
  markerEnd?: boolean;
  markerStart?: boolean;
  /** Tick marks etc. Labels may sit near these. */
  protected?: boolean;
}

export interface SceneLabel {
  id: string;
  text?: string;
  katex?: string;
  /** Explicit anchor in scene coordinates. */
  x: number;
  y: number;
  slotHint?: SlotHint;
  protected?: boolean;
  kind?: 'katex' | 'text';
  /** Optional target stroke/node id for leader lines. */
  anchorId?: string;
}

export interface Overlay {
  id: string;
  kind: 'katex' | 'text';
  source: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'hanging' | 'middle' | 'alphabetic';
  width: number;
  height: number;
}

export interface Scene {
  family: string;
  width: number;
  height: number;
  nodes: SceneNode[];
  strokes: SceneStroke[];
  labels: SceneLabel[];
  highlights: string[];
}

export type CompileFailCode =
  | 'malformed'
  | 'unknown'
  | 'unsatisfiable'
  | 'expr'
  | 'timeout'
  | 'refused'
  | 'throw';

export interface CompileSuccess {
  ok: true;
  svg: string;
  overlays: Overlay[];
  scene: Scene;
}

export interface CompileFailure {
  ok: false;
  reason: string;
  code: CompileFailCode;
}

export type CompileResult = CompileSuccess | CompileFailure;

export interface CompileCtx {
  profile: DiagramSizeProfile;
  family: string;
}

export const FONT_MIN = 12;
export const FRAME_PAD = 10;
export const LABEL_GAP = (fontSize: number) => Math.max(6, 0.55 * fontSize);
