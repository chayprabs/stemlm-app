import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import {
  compileDiagram,
  presentCompiledDiagram,
  type CompiledDiagram,
} from '@/src/lib/resolve-diagram';
import { overlayMathSize, overlayStyle, renderOverlayHtml } from '@/src/lib/figure/overlay';
import { canonicalizeDiagramType } from '@/src/lib/figure/catalog';
import type { CompileFailCode, Overlay } from '@/src/lib/figure/types';
import { useStore } from '@/src/state/store';
import { CONTENT_SCALE_DIAGRAM_FACTOR } from '@/src/lib/settings';
import { MAX_DIAGRAM_UPSCALE } from '@/src/lib/diagram-bounds';
import { FigureLightbox, type LightboxOrigin } from './FigureLightbox';
import { IconExpand, IconWand } from './icons';
import { svgDrawsCaption } from '@/src/lib/svg-present';

export interface DiagramCompileFailure {
  family: string;
  code: CompileFailCode;
  failingKeys: string[];
  reason: string;
}

export interface DiagramRendererProps {
  diagram: Diagram;
  theme: ResolvedTheme;
  /** Display profile — step cards use tighter bounds than the solution tab. */
  size?: 'step' | 'solution';
  /** Own the section chrome so a hidden figure leaves no empty parent box. */
  section?: boolean;
  onCompileFailure?: (failure: DiagramCompileFailure | null) => void;
}

/** Wider than the step's 300 x 165 budget box (FIG-SIZE-02). */
const WIDE_FIGURE_ASPECT = 1.8;

/**
 * Frame width for a presented figure: the presenter's size, coupled to the height
 * budget (an independent max-height would letterbox the SVG and shift
 * percentage-positioned math labels). A wide figure may use the card's width up
 * to its own native size, so a many-device circuit is not shrunk to the nominal
 * width budget; the height budget still binds it (FIG-SIZE-02).
 */
export function diagramFrameWidth(svg: string, size: 'step' | 'solution', displayScale: number): string | undefined {
  const displayWidth = Number(/^<svg\b[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]);
  if (!(displayWidth > 0)) return undefined;
  const bounds = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const aspect = bounds && bounds[2]! / bounds[3]!;
  const wide = Boolean(aspect && aspect > WIDE_FIGURE_ASPECT);
  const heightBudget = size === 'solution' ? '--slm-content-solution-diagram-height, 270px' : '--slm-content-diagram-height, 241px';
  const heightLimitedWidth = aspect && (wide || !svg.includes('data-stemlm-tall="true"'))
    ? `, calc(var(${heightBudget}) * ${aspect})` : '';
  const widthCap = wide ? Math.max(displayWidth, Math.round(bounds![2]! * MAX_DIAGRAM_UPSCALE[size] * displayScale)) : displayWidth;
  return `min(100%, ${widthCap}px${heightLimitedWidth})`;
}

/**
 * Renders a step's diagram. A spec compiles once; theme changes only
 * recolor via presentSvg. Only a fully validated figure becomes visible.
 */
export function DiagramRenderer({ diagram, theme, size = 'step', section = false, onCompileFailure }: DiagramRendererProps) {
  const [result, setResult] = useState<{ content: string; type: string; size: string; compiled: CompiledDiagram } | null>(null);
  const [lightbox, setLightbox] = useState<LightboxOrigin | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // The reader's content-size preference scales the rendered figure box.
  // PDF export resolves its own 'print' profile and never reads this.
  const displayScale = useStore((state) => CONTENT_SCALE_DIAGRAM_FACTOR[state.settings.contentScale]);
  const requestId = useRef(0);
  const failureCallback = useRef(onCompileFailure);
  failureCallback.current = onCompileFailure;
  const captionId = `slm-diagram-caption-${useId().replaceAll(':', '')}`;

  useEffect(() => {
    const id = ++requestId.current;
    setResult(null);
    failureCallback.current?.(null);

    void compileDiagram(diagram, size).then((compiled) => {
      if (requestId.current !== id) return;
      setResult({ content: diagram.content, type: diagram.type, size, compiled });
    });

    return () => {
      requestId.current += 1;
    };
  }, [diagram.content, diagram.type, size]);

  // Match the source during render, before effects run, so old graphics never
  // flash underneath a new step's caption while its compilation is pending.
  const compiled = result?.content === diagram.content && result.type === diagram.type && result.size === size
    ? result.compiled : null;
  const resolved = useMemo(() => compiled ? presentCompiledDiagram(compiled, theme, size, displayScale) : null,
    [compiled, theme, size, displayScale]);
  // Presented again for the lightbox so its SVG ids never collide with the inline copy.
  const enlarged = useMemo(() => lightbox && compiled ? presentCompiledDiagram(compiled, theme, size, displayScale) : null,
    [lightbox, compiled, theme, size, displayScale]);
  useEffect(() => {
    if (resolved && !resolved.ok) {
      failureCallback.current?.({ ...resolved.diagnostic, family: canonicalizeDiagramType(diagram.type), failingKeys: specKeys(diagram.content) });
    }
  }, [resolved, diagram.type, diagram.content]);

  if (!resolved?.ok) return null;
  const { svg, overlays } = resolved;
  // A title that repair or translation surfaced (a `title:` line, a Mermaid title) is the caption too.
  const caption = diagram.caption ?? resolved.caption;
  const accessibleLabel = caption || `${canonicalizeDiagramType(diagram.type)} diagram`;
  const viewBox = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1];
  const bounds = viewBox?.trim().split(/[\s,]+/).map(Number);
  const aspect = bounds && bounds[2]! / bounds[3]!;
  const frameWidth = diagramFrameWidth(svg, size, displayScale);
  const figure = (
    <figure
      className={`slm-diagram slm-diagram--${size}`}
      role="img"
      aria-label={caption ? undefined : accessibleLabel}
      aria-labelledby={caption ? captionId : undefined}
    >
        <div
          ref={frameRef}
          className="slm-diagram-frame"
          // A size container, so math labels can size themselves by the frame's rendered width.
          style={frameWidth ? { width: frameWidth, containerType: 'inline-size' } : undefined}
          onClick={section ? openLightbox : undefined}
        >
          <div
            className="slm-diagram-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {renderOverlays(overlays)}
        </div>
      {caption && (
        // A caption the figure already draws stays for screen readers only, so it is not shown twice.
        <figcaption id={captionId} className={svgDrawsCaption(svg, caption) ? 'slm-sr-only' : undefined}>{caption}</figcaption>
      )}
    </figure>
  );
  if (!section) return figure;
  return (
    <div className="slm-step-diagram">
      <div className="slm-step-diagram-head">
        <span className="slm-step-diagram-label">
          Diagram
          {resolved.corrected && (
            // Drawn from repaired notation, not the model's text verbatim: say so (content is never changed).
            <span className="slm-diagram-note" title="stemlm corrected this figure's notation before drawing it. Its content is unchanged.">
              <IconWand width={11} height={11} /> Auto-corrected
            </span>
          )}
        </span>
        <button type="button" className="slm-icon-btn slm-diagram-enlarge" aria-label="Enlarge diagram" title="Enlarge diagram" aria-haspopup="dialog" onClick={openLightbox}>
          <IconExpand width={15} height={15} />
        </button>
      </div>
      {figure}
      {lightbox && enlarged?.ok && (
        <FigureLightbox
          origin={lightbox}
          aspect={aspect || 300 / 165}
          label={accessibleLabel}
          caption={caption}
          theme={theme}
          onClose={() => setLightbox(null)}
        >
          <div className="slm-diagram-svg" dangerouslySetInnerHTML={{ __html: enlarged.svg }} />
          {renderOverlays(enlarged.overlays)}
        </FigureLightbox>
      )}
    </div>
  );

  function openLightbox() {
    const frame = frameRef.current;
    if (!frame) return;
    setLightbox({
      container: frame.closest('#stemlm-app') ?? frame.ownerDocument.body,
      width: frame.getBoundingClientRect().width,
      fontSize: Number.parseFloat(getComputedStyle(frame).fontSize) || 15,
    });
  }

  function renderOverlays(list: Overlay[]) {
    return list.map((overlay) => {
      const pos = overlayStyle(overlay, viewBox, size);
      const mathSize = frameWidth && bounds ? overlayMathSize(overlay, bounds[2]!) : undefined;
      return (
        <div
          key={overlay.id}
          className="slm-diagram-overlay"
          data-overlay-id={overlay.id}
          style={{
            position: 'absolute',
            left: bounds ? `${100 * (overlay.x - bounds[0]!) / bounds[2]!}%` : pos.left,
            top: bounds ? `${100 * (overlay.y - bounds[1]!) / bounds[3]!}%` : pos.top,
            transform: pos.transform,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            ...(mathSize ? { '--slm-math-size': mathSize } as CSSProperties : {}),
          }}
          dangerouslySetInnerHTML={{ __html: renderOverlayHtml(overlay) }}
        />
      );
    });
  }
}

function specKeys(content: string): string[] {
  return [...new Set(content.split('\n')
    .map((line) => /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:/.exec(line)?.[1]?.toLowerCase())
    .filter((key): key is string => Boolean(key)))];
}
