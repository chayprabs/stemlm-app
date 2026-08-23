import { Fragment } from 'react';
import type { Session, Diagram } from '@/src/protocol/types';
import { resolveStepWorkText, shouldShowFormulaBlock } from '@/src/lib/step-display';
import { MathMarkdown } from './MathMarkdown';
import { BrandWordmark } from './brand';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { resolveSessionQuestion } from '@/src/lib/session-question';
import type { Overlay } from '@/src/lib/figure/types';
import { overlayStyleAttr, renderOverlayHtml } from '@/src/lib/figure/overlay';
import { CapsuleSignals } from './CapsuleSignals';

export function diagramKey(scope: string, i: number): string {
  return `${scope}-${i}`;
}

function ResolvedDiagram({
  svg,
  overlays,
  fallback,
}: {
  svg?: string;
  overlays?: Overlay[];
  fallback?: string;
}) {
  if (svg) {
    const vb = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1];
    return (
      <div className="slm-report-diagram">
        <div className="slm-diagram-frame" style={{ position: 'relative' }}>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
          {(overlays ?? []).map((overlay) => (
            <div
              key={overlay.id}
              className="slm-diagram-overlay"
              data-overlay-id={overlay.id}
              style={{ ...(cssToStyle(overlayStyleAttr(overlay, vb, 'print')) as object) }}
              dangerouslySetInnerHTML={{ __html: renderOverlayHtml(overlay) }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (fallback?.trim()) {
    return (
      <pre className="slm-report-diagram slm-report-diagram-fallback">{fallback.trim()}</pre>
    );
  }
  return null;
}

function cssToStyle(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of css.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!key) continue;
    out[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = val;
  }
  return out;
}

export function Report({
  session,
  diagramSvg,
  diagramOverlays = {},
}: {
  session: Session;
  diagramSvg: Record<string, string>;
  diagramOverlays?: Record<string, Overlay[]>;
}) {
  const { meta, steps, solution, solutionDiagrams } = session.capsule;
  const solutionParts = solution.split(solutionDiagramRegexGlobal());
  const question = resolveSessionQuestion(session);

  return (
    <div className="slm-report">
      <header className="slm-report-head">
        <div className="slm-report-brand-wrap">
          <BrandWordmark className="slm-report-wordmark" variant="mono" height={22} />
        </div>
        {meta.subject && meta.subject !== 'General' && (
          <span className="slm-report-subject">{meta.subject}</span>
        )}
      </header>

      {meta.topic && meta.topic !== question && (
        <h1 className="slm-report-topic">{meta.topic}</h1>
      )}

      <section className="slm-report-q-block">
        <span className="slm-report-label">Q.</span>
        <div className="slm-report-q">
          <MathMarkdown content={question} className="slm-report-q-text" />
        </div>
      </section>

      <CapsuleSignals capsule={session.capsule} />

      <section className="slm-report-a">
        <span className="slm-report-label">Answer</span>
        <div className="slm-report-a-body">
          {steps.map((step) => {
            const work = resolveStepWorkText(step);
            return (
            <div key={step.id} className="slm-report-step">
              <h3 className="slm-report-step-title">
                <span className="slm-report-step-no">{step.index}</span>
                <span className="slm-step-id">{step.id}</span>
                {step.title}
              </h3>
              {shouldShowFormulaBlock(step) && step.formula && (
                <div className="slm-report-formula">
                  <span className="slm-report-formula-label">Formula</span>
                  <MathMarkdown content={step.formula} mathMode="display" />
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
                <ResolvedDiagram
                  svg={diagramSvg[diagramKey('step', step.index)]}
                  overlays={diagramOverlays[diagramKey('step', step.index)]}
                  fallback={step.diagram.content}
                />
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

          {steps.length === 0 && solution.trim() && (
            <div className="slm-report-solution">
              <h3 className="slm-report-solution-title">Solution</h3>
              {solutionParts.map((part, i) => {
                if (i % 2 === 1) {
                  const idx = Number(part);
                  if (!Number.isFinite(idx)) return <Fragment key={`d-${i}`} />;
                  const solDiagram = solutionDiagrams[idx];
                  return (
                    <ResolvedDiagram
                      key={`d-${i}`}
                      svg={diagramSvg[diagramKey('sol', idx)]}
                      overlays={diagramOverlays[diagramKey('sol', idx)]}
                      fallback={solDiagram?.content}
                    />
                  );
                }
                return part.trim() ? (
                  <MathMarkdown key={`t-${i}`} content={part} />
                ) : (
                  <Fragment key={`t-${i}`} />
                );
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
