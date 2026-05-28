import { Fragment } from 'react';
import type { Session } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';

/**
 * The plain-language full solution, with inline diagrams re-inserted at their
 * original positions (the parser left {{stemlm-diagram:N}} tokens behind).
 */
export function SolutionView({ session, theme }: { session: Session; theme: ResolvedTheme }) {
  const { solution, solutionDiagrams } = session.capsule;
  const parts = solution.split(solutionDiagramRegexGlobal());
  // split() with a capturing group interleaves: [text, idx, text, idx, ...]

  return (
    <div className="slm-solution slm-selectable">
      {parts.map((part, i) => {
        const isIndex = i % 2 === 1;
        if (isIndex) {
          const diagram = solutionDiagrams[Number(part)];
          return diagram ? (
            <DiagramRenderer key={`d-${i}`} diagram={diagram} theme={theme} large />
          ) : null;
        }
        return part.trim() ? <MathMarkdown key={`t-${i}`} content={part} /> : <Fragment key={`t-${i}`} />;
      })}
    </div>
  );
}
