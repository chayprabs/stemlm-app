import { useEffect, useRef, useState } from 'react';
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { sanitizeSvg, extractSvg } from '@/src/lib/sanitize';
import { renderMermaid } from '@/src/lib/mermaid';

export interface DiagramRendererProps {
  diagram: Diagram;
  theme: ResolvedTheme;
  /** Larger paddings/min-height for the solution view. */
  large?: boolean;
}

/**
 * Renders a step's diagram. SVG is sanitized and injected directly; mermaid is
 * lazily compiled to SVG. Failures degrade gracefully to the raw source so the
 * student never sees a blank box.
 */
export function DiagramRenderer({ diagram, theme, large }: DiagramRendererProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setSvg(null);
    setFailed(false);

    if (diagram.type === 'svg') {
      const clean = sanitizeSvg(extractSvg(diagram.content));
      if (clean) setSvg(clean);
      else setFailed(true);
      return;
    }

    // mermaid
    renderMermaid(diagram.content, theme)
      .then((out) => {
        if (mounted.current) setSvg(out);
      })
      .catch(() => {
        if (mounted.current) setFailed(true);
      });

    return () => {
      mounted.current = false;
    };
  }, [diagram.content, diagram.type, theme]);

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
      className={`slm-diagram ${large ? 'slm-diagram--large' : ''}`}
      data-empty={svg ? undefined : 'true'}
    >
      {svg ? (
        <div className="slm-diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="slm-diagram-skeleton" aria-hidden />
      )}
      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}
