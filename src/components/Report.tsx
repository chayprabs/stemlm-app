import type { Session, Diagram } from '@/src/protocol/types';
import { resolveStepWorkText, shouldShowFormulaBlock } from '@/src/lib/step-display';
import { MathMarkdown } from './MathMarkdown';
import { BrandWordmark } from './BrandWordmark';
import { ExtensionLogo } from './ExtensionLogo';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';

export function diagramKey(scope: string, i: number): string {
  return `${scope}-${i}`;
}

function ResolvedDiagram({ svg }: { svg?: string }) {
  if (!svg) return null;
  return <div className="slm-report-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Report({
  session,
  diagramSvg,
}: {
  session: Session;
  diagramSvg: Record<string, string>;
}) {
  const { meta, steps, solution, solutionDiagrams } = session.capsule;
  const solutionParts = solution.split(solutionDiagramRegexGlobal());
  const question = (session.question || meta.topic || '').trim();

  return (
    <div className="slm-report">
      <header className="slm-report-head">
        <div className="slm-report-brand-wrap">
          <span className="slm-report-mark" aria-hidden="true">
            <ExtensionLogo size={24} />
          </span>
          <BrandWordmark className="slm-report-wordmark" />
        </div>
        {meta.subject && meta.subject !== 'General' && (
          <span className="slm-report-subject">{meta.subject}</span>
        )}
      </header>

      {meta.topic && meta.topic !== question && (
        <h1 className="slm-report-topic">{meta.topic}</h1>
      )}

      <section className="slm-report-q-block">
        <span className="slm-report-label">Q</span>
        <div className="slm-report-q">
          <div className="slm-report-q-text">{question}</div>
        </div>
      </section>

      <section className="slm-report-a">
        <span className="slm-report-label">Answer</span>
        <div className="slm-report-a-body">
          {steps.map((step) => {
            const work = resolveStepWorkText(step);
            return (
            <div key={step.id} className="slm-report-step">
              <h3 className="slm-report-step-title">
                <span className="slm-report-step-no">{step.index}</span>
                {step.title}
              </h3>
              {shouldShowFormulaBlock(step) && step.formula && (
                <div className="slm-report-formula">
                  <span className="slm-report-formula-label">Formula</span>
                  <MathMarkdown content={step.formula} />
                </div>
              )}
              {work && (
                <div className="slm-report-work">
                  <span className="slm-report-work-label">Work</span>
                  <div className="slm-report-body">
                    <MathMarkdown content={work} />
                  </div>
                </div>
              )}
              {step.diagram && (
                <ResolvedDiagram svg={diagramSvg[diagramKey('step', step.index)]} />
              )}
              {step.takeaway && (
                <div className="slm-report-takeaway">
                  <span className="slm-report-takeaway-label">Takeaway</span>
                  <MathMarkdown content={step.takeaway} />
                </div>
              )}
            </div>
            );
          })}

          {solution.trim() && (
            <div className="slm-report-solution">
              <h3 className="slm-report-solution-title">Solution</h3>
              {solutionParts.map((part, i) => {
                if (i % 2 === 1) {
                  const idx = Number(part);
                  return (
                    <ResolvedDiagram key={`d-${i}`} svg={diagramSvg[diagramKey('sol', idx)]} />
                  );
                }
                return part.trim() ? <MathMarkdown key={`t-${i}`} content={part} /> : null;
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="slm-report-foot">stemLM · stemlm.app</footer>
    </div>
  );
}

export function collectDiagrams(session: Session): { key: string; diagram: Diagram }[] {
  const out: { key: string; diagram: Diagram }[] = [];
  for (const step of session.capsule.steps) {
    if (step.diagram) out.push({ key: diagramKey('step', step.index), diagram: step.diagram });
  }
  session.capsule.solutionDiagrams.forEach((d, i) => {
    out.push({ key: diagramKey('sol', i), diagram: d });
  });
  return out;
}
