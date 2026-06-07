import { useEffect, useRef, useState } from 'react';
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';

export interface DiagramRendererProps {
  diagram: Diagram;
  theme: ResolvedTheme;
  /** Display profile — step cards use tighter bounds than the solution tab. */
  size?: 'step' | 'solution';
}

/**
 * Renders a step's diagram. SVG is sanitized and injected directly; mermaid is
 * lazily compiled to SVG. Failures degrade gracefully to the raw source so the
 * student never sees a blank box.
 */
export function DiagramRenderer({ diagram, theme, size = 'step' }: DiagramRendererProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setSvg(null);
    setFailed(false);

    void resolveDiagramSvg(diagram, theme, size).then((clean) => {
      if (requestId.current !== id) return;
      if (clean && svgMarkupHasGraphicShapes(clean)) setSvg(clean);
      else setFailed(true);
    });

    return () => {
      /* bump id so in-flight renders from a prior step are ignored */
    };
  }, [diagram.content, diagram.type, theme, size]);

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
        <div
          className="slm-diagram-svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="slm-diagram-skeleton" aria-hidden />
      )}
      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}
