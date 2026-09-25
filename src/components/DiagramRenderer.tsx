import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import {
  compileDiagram,
  presentCompiledDiagram,
  type CompiledDiagram,
} from '@/src/lib/resolve-diagram';
import { overlayStyle, renderOverlayHtml } from '@/src/lib/figure/overlay';
import { canonicalizeDiagramType } from '@/src/lib/figure/catalog';
import type { CompileFailCode, Overlay } from '@/src/lib/figure/types';
import { useStore } from '@/src/state/store';
import { CONTENT_SCALE_DIAGRAM_FACTOR } from '@/src/lib/settings';
import { FigureLightbox, type LightboxOrigin } from './FigureLightbox';
import { IconExpand } from './icons';

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
  const accessibleLabel = diagram.caption || `${canonicalizeDiagramType(diagram.type)} diagram`;

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
  const displayWidth = Number(/^<svg\b[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]);
  const viewBox = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1];
  const bounds = viewBox?.trim().split(/[\s,]+/).map(Number);
  const aspect = bounds && bounds[2]! / bounds[3]!;
  const heightBudget = size === 'solution' ? '--slm-content-solution-diagram-height, 270px' : '--slm-content-diagram-height, 241px';
  // Couple the width to the height budget: independent max-height would
  // letterbox the SVG and shift percentage-positioned math labels.
  const heightLimitedWidth = aspect && !svg.includes('data-stemlm-tall="true"')
    ? `, calc(var(${heightBudget}) * ${aspect})` : '';
  const figure = (
    <figure
      className={`slm-diagram slm-diagram--${size}`}
      role="img"
      aria-label={diagram.caption ? undefined : accessibleLabel}
      aria-labelledby={diagram.caption ? captionId : undefined}
    >
        <div
          ref={frameRef}
          className="slm-diagram-frame"
          style={displayWidth > 0 ? { width: `min(100%, ${displayWidth}px${heightLimitedWidth})` } : undefined}
          onClick={section ? openLightbox : undefined}
        >
          <div
            className="slm-diagram-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {renderOverlays(overlays)}
        </div>
      {diagram.caption && <figcaption id={captionId}>{diagram.caption}</figcaption>}
    </figure>
  );
  if (!section) return figure;
  return (
    <div className="slm-step-diagram">
      <div className="slm-step-diagram-head">
        <span className="slm-step-diagram-label">Diagram</span>
        <button type="button" className="slm-icon-btn slm-diagram-enlarge" aria-label="Enlarge diagram" aria-haspopup="dialog" onClick={openLightbox}>
          <IconExpand width={15} height={15} />
        </button>
      </div>
      {figure}
      {lightbox && enlarged?.ok && (
        <FigureLightbox
          origin={lightbox}
          aspect={aspect || 300 / 165}
          label={accessibleLabel}
          caption={diagram.caption}
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
