import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { DiagramRenderer } from './DiagramRenderer';

/** Panel-level diagram well — matches hero side panel (#F1F5F5, min 110px). */
export function DiagramWell({
  diagram,
  theme,
}: {
  diagram: Diagram | undefined;
  theme: ResolvedTheme;
}) {
  if (!diagram) return null;

  return (
    <div className="slm-diagram-well" aria-label="Problem diagram">
      <DiagramRenderer diagram={diagram} theme={theme} />
    </div>
  );
}

export function firstSessionDiagram(
  steps: { diagram?: Diagram }[],
): Diagram | undefined {
  return steps.find((s) => s.diagram)?.diagram;
}
