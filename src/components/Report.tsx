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

export function diagramKey(scope: string, i: number, prefix = ''): string {
  return `${prefix}${scope}-${i}`;
}

/** Namespace for one question inside a merged document. */
export function entryPrefix(i: number): string {
  return `q${i + 1}-`;
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
  prefix,
}: {
  step: Step;
  diagramSvg: Record<string, string>;
  diagramOverlays: Record<string, Overlay[]>;
  prefix: string;
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
            svg={diagramSvg[diagramKey('step', step.index, prefix)]}
            overlays={diagramOverlays[diagramKey('step', step.index, prefix)]}
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

/**
 * One question and its worked answer, without any brand chrome. A single-question
 * export wraps exactly one of these; a merged export stacks several so the next
 * question starts immediately below the previous answer instead of on a fresh page.
 */
export function ReportEntry({
  session,
  diagramSvg,
  diagramOverlays = {},
  prefix = '',
  label = 'Q.',
  heading,
}: {
  session: Session;
  diagramSvg: Record<string, string>;
  diagramOverlays?: Record<string, Overlay[]>;
  prefix?: string;
  label?: string;
  /** Per-question topic/subject line. Merged documents only — a single report puts it in the page header. */
  heading?: boolean;
}) {
  const { meta, steps, solution, solutionDiagrams } = session.capsule;
  const solutionParts = solution.split(solutionDiagramRegexGlobal());
  const question = resolveSessionQuestion(session);
  const showTopic = Boolean(meta.topic && meta.topic !== question);
  const showSubject = Boolean(meta.subject && meta.subject !== 'General');

  return (
    <section className="slm-report-entry">
      {heading && (showTopic || showSubject) && (
        <div className="slm-report-entry-head">
          {showTopic && <h2 className="slm-report-topic">{meta.topic}</h2>}
          {showSubject && <span className="slm-report-entry-subject">{meta.subject}</span>}
        </div>
      )}

      <section className="slm-report-q-block">
        <span className="slm-report-label">{label}</span>
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
            prefix={prefix}
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
                      svg={diagramSvg[diagramKey('sol', idx, prefix)]}
                      overlays={diagramOverlays[diagramKey('sol', idx, prefix)]}
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
    </section>
  );
}

function ReportHead({ kicker, topic }: { kicker?: string; topic?: string }) {
  return (
    <header className="slm-report-head">
      <div className="slm-report-head-row">
        <div className="slm-report-brand-wrap">
          <BrandWordmark className="slm-report-wordmark" variant="light" height={22} />
        </div>
        {kicker && <span className="slm-report-subject">{kicker}</span>}
      </div>
      {topic && <h1 className="slm-report-topic">{topic}</h1>}
    </header>
  );
}

function ReportFoot() {
  return (
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
  const { meta } = session.capsule;
  const question = resolveSessionQuestion(session);
  const showTopic = Boolean(meta.topic && meta.topic !== question);
  const showSubject = Boolean(meta.subject && meta.subject !== 'General');

  return (
    <div className="slm-report">
      <ReportHead
        kicker={showSubject ? meta.subject : undefined}
        topic={showTopic ? meta.topic : undefined}
      />

      <ReportEntry session={session} diagramSvg={diagramSvg} diagramOverlays={diagramOverlays} />

      <ReportFoot />
    </div>
  );
}

export function mergedReportKicker(count: number): string {
  return `${count} question${count === 1 ? '' : 's'}`;
}

/**
 * Several saved questions in one continuous document: one brand header at the
 * top, one "PDF made using stemLM" footer at the very end, and every answer
 * flowing straight into the next question so no page is left half empty.
 */
export function MergedReport({
  sessions,
  diagramSvg,
  diagramOverlays = {},
}: {
  sessions: Session[];
  diagramSvg: Record<string, string>;
  diagramOverlays?: Record<string, Overlay[]>;
}) {
  return (
    <div className="slm-report slm-report--merged">
      <ReportHead kicker={mergedReportKicker(sessions.length)} />

      {sessions.map((session, i) => (
        <ReportEntry
          key={`${session.id}-${i}`}
          session={session}
          diagramSvg={diagramSvg}
          diagramOverlays={diagramOverlays}
          prefix={entryPrefix(i)}
          label={`Q${i + 1}.`}
          heading
        />
      ))}

      <ReportFoot />
    </div>
  );
}

/** Strip math delimiters and markdown markers so text reads as plain prose. */
export function plainText(value: unknown): string {
  return String(value ?? '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]*)\$/g, '$1')
    .replace(/\\[()[\]]/g, '')
    .replace(/`{1,3}/g, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface PlainStep {
  index: number;
  title: string;
  formula: string;
  body: string;
  takeaway: string;
}

interface PlainEntryData {
  id: string;
  question: string;
  topic: string;
  steps: PlainStep[];
  solution: string;
}

/**
 * Pull every value out behind one guard, so the component below only ever
 * touches plain strings. A snapshot with a hostile shape — or a throwing
 * accessor — degrades to an empty entry instead of aborting the export.
 */
function toPlainEntry(session: Session, i: number): PlainEntryData {
  try {
    const capsule = session?.capsule;
    const topic = plainText(capsule?.meta?.topic);
    const rawSteps = Array.isArray(capsule?.steps) ? capsule.steps : [];
    return {
      id: String(session?.id ?? `q${i}`),
      question: plainText(session?.question || capsule?.meta?.question || topic),
      topic,
      steps: rawSteps.map((step, j) => ({
        index: typeof step?.index === 'number' ? step.index : j + 1,
        title: plainText(step?.title),
        formula: plainText(step?.formula),
        body: plainText(step?.body),
        takeaway: plainText(step?.takeaway),
      })),
      solution: plainText(capsule?.solution),
    };
  } catch {
    return { id: `q${i}`, question: '', topic: '', steps: [], solution: '' };
  }
}

/**
 * Last-resort renderer. No markdown, no KaTeX, no figures — only React text
 * nodes over pre-extracted strings, so it cannot throw whatever a snapshot
 * contains. `renderToStaticMarkup` does not honour error boundaries, so the
 * only way to guarantee a saved question always exports is to have a path with
 * nothing left to fail.
 */
export function PlainReport({ sessions }: { sessions: readonly Session[] }) {
  const list = (Array.isArray(sessions) ? sessions : []).map(toPlainEntry);
  const many = list.length > 1;
  return (
    <div className="slm-report slm-report--plain">
      <ReportHead kicker={many ? mergedReportKicker(list.length) : undefined} />

      {list.map((entry, i) => (
        <section className="slm-report-entry" key={`${entry.id}-${i}`}>
          {many && entry.topic && (
            <div className="slm-report-entry-head">
              <h2 className="slm-report-topic">{entry.topic}</h2>
            </div>
          )}
          <section className="slm-report-q-block">
            <span className="slm-report-label">{many ? `Q${i + 1}.` : 'Q.'}</span>
            <div className="slm-report-q">
              <div className="slm-prose slm-report-q-text">
                <p>{entry.question}</p>
              </div>
            </div>
          </section>
          <section className="slm-report-a" aria-label="Solution">
            {entry.steps.map((step, j) => (
              <article className="slm-report-step" key={`${entry.id}-s${j}`}>
                <header className="slm-report-step-head">
                  <h3 className="slm-report-step-title">
                    {step.index}. {step.title}
                  </h3>
                </header>
                {step.formula && (
                  <div className="slm-formula">
                    <span className="slm-formula-label">Formula</span>
                    <div className="slm-prose">
                      <p>{step.formula}</p>
                    </div>
                  </div>
                )}
                <div className="slm-step-work">
                  <span className="slm-step-work-label">Work</span>
                  <div className="slm-step-work-body">
                    <div className="slm-prose">
                      <p>{step.body}</p>
                    </div>
                  </div>
                </div>
                {step.takeaway && (
                  <div className="slm-takeaway">
                    <span className="slm-takeaway-label">Takeaway</span>
                    <p>{step.takeaway}</p>
                  </div>
                )}
              </article>
            ))}
            {entry.steps.length === 0 && entry.solution && (
              <div className="slm-report-solution">
                <div className="slm-prose">
                  <p>{entry.solution}</p>
                </div>
              </div>
            )}
          </section>
        </section>
      ))}

      <ReportFoot />
    </div>
  );
}

export function collectDiagrams(session: Session, prefix = ''): { key: string; diagram: Diagram }[] {
  const out: { key: string; diagram: Diagram }[] = [];
  // A snapshot written by an older build — or truncated by a storage prune —
  // can be missing either array. Collecting figures must never be the thing
  // that stops a saved question from exporting.
  const steps = Array.isArray(session.capsule?.steps) ? session.capsule.steps : [];
  const solutionDiagrams = Array.isArray(session.capsule?.solutionDiagrams)
    ? session.capsule.solutionDiagrams
    : [];
  for (const step of steps) {
    if (step?.diagram) {
      out.push({ key: diagramKey('step', step.index, prefix), diagram: step.diagram });
    }
  }
  solutionDiagrams.forEach((d, i) => {
    out.push({ key: diagramKey('sol', i, prefix), diagram: d });
  });
  return out;
}

/** Every diagram across a merged document, namespaced so keys never collide. */
export function collectMergedDiagrams(
  sessions: readonly Session[],
): { key: string; diagram: Diagram }[] {
  return sessions.flatMap((session, i) => collectDiagrams(session, entryPrefix(i)));
}
