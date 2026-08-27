import { Fragment } from 'react';
import type { Session, Diagram, Step } from '@/src/protocol/types';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { MathMarkdown } from './MathMarkdown';
import { BrandWordmark, StemMark, BRAND_SITE } from './brand';
import { StepIndexMark } from './step-index';
import { StepWork } from './StepWork';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { resolveSessionQuestion } from '@/src/lib/session-question';
import type { Overlay } from '@/src/lib/figure/types';
import { overlayPrintStyleAttr, renderOverlayHtml } from '@/src/lib/figure/overlay';
import { CapsuleSignals, StudentAnswerNotes } from './CapsuleSignals';

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
        <div className="slm-diagram-frame">
          <div className="slm-diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          {(overlays ?? []).map((overlay) => (
            <div
              key={overlay.id}
              className="slm-diagram-overlay"
              data-overlay-id={overlay.id}
              style={{ ...(cssToStyle(overlayPrintStyleAttr(overlay, vb)) as object) }}
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

function ReportStep({
  step,
  diagramSvg,
  diagramOverlays,
}: {
  step: Step;
  diagramSvg: Record<string, string>;
  diagramOverlays: Record<string, Overlay[]>;
}) {
  return (
    <article className="slm-report-step">
      <header className="slm-report-step-head">
        <StepIndexMark n={step.index} />
        <h3 className="slm-report-step-title">{step.title}</h3>
      </header>

      {shouldShowFormulaBlock(step) && step.formula && (
        <div className="slm-formula">
          <span className="slm-formula-label">Formula</span>
          <MathMarkdown content={step.formula} mathMode="display" />
        </div>
      )}

      <StepWork step={step} className="slm-step-work" />

      {step.diagram && (
        <div className="slm-step-diagram">
          <span className="slm-step-diagram-label">Diagram</span>
          <ResolvedDiagram
            svg={diagramSvg[diagramKey('step', step.index)]}
            overlays={diagramOverlays[diagramKey('step', step.index)]}
            fallback={step.diagram.content}
          />
        </div>
      )}

      {step.takeaway && (
        <div className="slm-takeaway">
          <span className="slm-takeaway-label">Takeaway</span>
          <MathMarkdown content={step.takeaway} />
        </div>
      )}
    </article>
  );
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
  const showTopic = Boolean(meta.topic && meta.topic !== question);
  const showSubject = Boolean(meta.subject && meta.subject !== 'General');

  return (
    <div className="slm-report">
      <header className="slm-report-head">
        <div className="slm-report-head-row">
          <div className="slm-report-brand-wrap">
            <BrandWordmark className="slm-report-wordmark" variant="light" height={22} />
          </div>
          {showSubject && <span className="slm-report-subject">{meta.subject}</span>}
        </div>
        {showTopic && <h1 className="slm-report-topic">{meta.topic}</h1>}
      </header>

      <section className="slm-report-q-block">
        <span className="slm-report-label">Q.</span>
        <div className="slm-report-q">
          <MathMarkdown content={question} className="slm-report-q-text" />
        </div>
      </section>

      <CapsuleSignals capsule={session.capsule} />

      <section className="slm-report-a" aria-label="Solution">
        {steps.map((step) => (
          <ReportStep
            key={step.id}
            step={step}
            diagramSvg={diagramSvg}
            diagramOverlays={diagramOverlays}
          />
        ))}

        {steps.length === 0 && solution.trim() && (
          <div className="slm-report-solution">
            {solutionParts.map((part, i) => {
              if (i % 2 === 1) {
                const idx = Number(part);
                if (!Number.isFinite(idx)) return <Fragment key={`d-${i}`} />;
                const solDiagram = solutionDiagrams[idx];
                return (
                  <div key={`d-${i}`} className="slm-step-diagram">
                    <span className="slm-step-diagram-label">Diagram</span>
                    <ResolvedDiagram
                      svg={diagramSvg[diagramKey('sol', idx)]}
                      overlays={diagramOverlays[diagramKey('sol', idx)]}
                      fallback={solDiagram?.content}
                    />
                  </div>
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

        <StudentAnswerNotes capsule={session.capsule} />
      </section>

      <footer className="slm-report-foot">
        <span>PDF made using stemLM</span>
        <a
          className="slm-report-foot-link"
          href={BRAND_SITE}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="stemlm.app"
        >
          <StemMark variant="light" size={16} />
        </a>
      </footer>
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
