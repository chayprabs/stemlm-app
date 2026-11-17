import { useRef } from 'react';
import type { Step } from '@/src/protocol/types';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';
import { useStore } from '@/src/state/store';
import { MathMarkdown } from './MathMarkdown';
import { IconCheck, IconCopy } from './icons';
import { COPY_FAILED, useCopy } from './use-copy';

/**
 * The key relation of a step, with a control that copies it as LaTeX. One block for the step
 * page, the Solution document and follow-up answers.
 */
export function FormulaBlock({ step }: { step: Step }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copyState, copy] = useCopy(() => useStore.getState().setStatus('error', COPY_FAILED));
  const formula = step.formula;
  if (!shouldShowFormulaBlock(step) || !formula) return null;

  /** What was typeset, without delimiters: ready for a LaTeX document. The step's own text when nothing was. */
  function latex(): string {
    const typeset = [...(ref.current?.querySelectorAll('annotation[encoding="application/x-tex"]') ?? [])]
      .map((source) => source.textContent?.trim() ?? '')
      .filter(Boolean);
    return typeset.length ? typeset.join('\n') : stripProtocolMarkers(formula!).trim();
  }

  return (
    <div className="slm-formula" ref={ref}>
      <div className="slm-formula-head">
        <span className="slm-formula-label">Formula</span>
        <button
          type="button"
          className="slm-formula-copy"
          onClick={() => void copy(latex)}
          data-state={copyState === 'idle' ? undefined : copyState}
        >
          {copyState === 'copied' ? <IconCheck width={13} height={13} /> : <IconCopy width={13} height={13} />}
          {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy LaTeX'}
        </button>
      </div>
      <MathMarkdown content={formula} mathMode="display" />
      <span className="slm-sr-only" role="status" aria-live="polite">
        {copyState === 'copied' ? 'Formula copied as LaTeX.' : copyState === 'failed' ? 'Could not copy the formula.' : ''}
      </span>
    </div>
  );
}
