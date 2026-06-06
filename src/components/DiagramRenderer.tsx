import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { mountSvgMarkup } from '@/src/lib/mount-svg';

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
  const svgHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    setSvg(null);
    setFailed(false);

    void resolveDiagramSvg(diagram, theme).then((clean) => {
      if (!mounted.current) return;
      if (clean) setSvg(clean);
      else setFailed(true);
    });

    return () => {
      mounted.current = false;
    };
  }, [diagram.content, diagram.type, theme]);

  useLayoutEffect(() => {
    if (!svg || !svgHostRef.current) return;
    mountSvgMarkup(svgHostRef.current, svg);
  }, [svg]);

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
        <div ref={svgHostRef} className="slm-diagram-svg" />
      ) : (
        <div className="slm-diagram-skeleton" aria-hidden />
      )}
      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}
