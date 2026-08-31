import { useEffect, useRef, useState } from 'react';
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import {
  compileDiagram,
  presentCompiledDiagram,
  type CompiledDiagram,
} from '@/src/lib/resolve-diagram';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import type { Overlay } from '@/src/lib/figure/types';
import { overlayStyle, renderOverlayHtml } from '@/src/lib/figure/overlay';
import { compileDiagramSpec } from '@/src/lib/figure/compile';
import { canonicalizeDiagramType } from '@/src/lib/figure/catalog';
import type { CompileFailCode } from '@/src/lib/figure/types';

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
  onCompileFailure?: (failure: DiagramCompileFailure | null) => void;
}

/**
 * Renders a step's diagram. Spec/mermaid compile once; theme changes only
 * recolor via presentSvg. Failures degrade to the raw source.
 */
export function DiagramRenderer({ diagram, theme, size = 'step', onCompileFailure }: DiagramRendererProps) {
  const [compiled, setCompiled] = useState<CompiledDiagram | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setCompiled(null);
    setSvg(null);
    setOverlays([]);
    setFailed(false);
    onCompileFailure?.(null);

    void compileDiagram(diagram, size).then(async (next) => {
      if (requestId.current !== id) return;
      if (!next.svg && onCompileFailure) {
        const type = canonicalizeDiagramType(diagram.type);
        if (type !== 'svg' && type !== 'mermaid') {
          const diagnostic = await compileDiagramSpec(diagram, size);
          if (requestId.current !== id) return;
          if (!diagnostic.ok) {
            onCompileFailure({
              family: type,
              code: diagnostic.code,
              failingKeys: specKeys(diagram.content),
              reason: diagnostic.reason,
            });
          }
        }
      }
      setCompiled(next);
    });

    return () => {
      requestId.current += 1;
    };
  }, [diagram.content, diagram.type, onCompileFailure, size]);

  useEffect(() => {
    if (!compiled) return;
    const resolved = presentCompiledDiagram(compiled, theme, size);
    if (resolved.svg && svgMarkupHasGraphicShapes(resolved.svg)) {
      setSvg(resolved.svg);
      setOverlays(resolved.overlays);
      setFailed(false);
    } else {
      setSvg(null);
      setOverlays([]);
      setFailed(true);
    }
  }, [compiled, theme, size]);

  if (failed) {
    return (
      <figure className="slm-diagram slm-diagram--failed">
        <pre className="slm-diagram-fallback">{diagram.content}</pre>
        {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure
      className={`slm-diagram slm-diagram--${size}`}
      data-empty={svg ? undefined : 'true'}
    >
      {svg ? (
        <div className="slm-diagram-frame">
          <div
            className="slm-diagram-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {overlays.map((overlay) => {
            const vb = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1];
            const pos = overlayStyle(overlay, vb, size);
            return (
              <div
                key={overlay.id}
                className="slm-diagram-overlay"
                data-overlay-id={overlay.id}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  transform: pos.transform,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
                dangerouslySetInnerHTML={{ __html: renderOverlayHtml(overlay) }}
              />
            );
          })}
        </div>
      ) : (
        <div className="slm-diagram-skeleton" aria-hidden />
      )}
      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}

function specKeys(content: string): string[] {
  return [...new Set(content.split('\n')
    .map((line) => /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:/.exec(line)?.[1]?.toLowerCase())
    .filter((key): key is string => Boolean(key)))];
}
