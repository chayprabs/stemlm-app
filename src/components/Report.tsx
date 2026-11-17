import { Fragment, type ReactNode } from 'react';
import type { Capsule, Session, Diagram, QuickCheck, Step } from '@/src/protocol/types';
import { resolveStepWorkText, shouldShowFormulaBlock } from '@/src/lib/step-display';
import { MathMarkdown } from './MathMarkdown';
import { BrandWordmark, BRAND_SITE } from './brand';
import { StepIndexMark } from './step-index';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { repeatsQuestion, resolveSessionQuestion } from '@/src/lib/session-question';
import type { Overlay } from '@/src/lib/figure/types';
import { overlayPrintStyleAttr, renderOverlayHtml } from '@/src/lib/figure/overlay';
import { CapsuleSignals, StudentAnswerNotes } from './CapsuleSignals';
import { OriginNote, REPORT_NOTE } from './OriginNote';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import { svgDrawsCaption } from '@/src/lib/svg-present';
import { CHAT_HOST_LAUNCH } from '@/src/platforms/hosts';

/**
 * The report's small print, the sentence the panel says under every answer. An answer structured
 * from a plain chat reply says where it came from in its own words instead (OriginNote).
 */
export { REPORT_NOTE };

export function diagramKey(scope: string, i: number, prefix = ''): string {
  return `${prefix}${scope}-${i}`;
}

/** Namespace for one question inside a merged document. */
export function entryPrefix(i: number): string {
  return `q${i + 1}-`;
}

/** Local calendar date, so a report made in the evening is not dated tomorrow (UTC). */
export function localDate(ms: number): string {
  return new Date(ms).toLocaleDateString('sv-SE'); // yyyy-mm-dd
}

/** What the compiler reported about a drawn figure besides its markup (src/lib/resolve-diagram.ts). */
export interface DiagramNote {
  /** Drawn from repaired or translated notation, not from the model's text as written. */
  corrected?: boolean;
  /** A title the rewrite surfaced that the spec did not carry as its caption. */
  caption?: string;
}

interface ReportFigures {
  diagramSvg: Record<string, string>;
  diagramOverlays?: Record<string, Overlay[]>;
  diagramNotes?: Record<string, DiagramNote>;
}

/** The resolved figures of a document, with the key prefix of the question being printed. */
interface Figures {
  svg: Record<string, string>;
  overlays: Record<string, Overlay[]>;
  notes: Record<string, DiagramNote>;
  prefix: string;
}

/** A figure that did not resolve prints nothing: no frame, no caption. */
function Figure({
  figures,
  scope,
  index,
  diagram,
}: {
  figures: Figures;
  scope: 'step' | 'sol';
  index: number;
  diagram: Diagram;
}) {
  const key = diagramKey(scope, index, figures.prefix);
  const svg = figures.svg[key];
  if (!svg || !svgMarkupHasGraphicShapes(svg)) return null;
  const vb = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1];
  const note = figures.notes[key];
  // A title that repair or translation surfaced is the caption too, as in the panel.
  const caption = diagram.caption ?? note?.caption;
  return (
    <figure className="slm-step-diagram">
      <div className="slm-report-diagram">
        <div className="slm-diagram-frame">
          <div className="slm-diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          {(figures.overlays[key] ?? []).map((overlay) => (
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
      {caption && !svgDrawsCaption(svg, caption) && (
        <figcaption className="slm-report-diagram-caption">{caption}</figcaption>
      )}
      {note?.corrected && (
        // A page has no hover, so the note carries its own explanation.
        <p className="slm-report-diagram-note">
          Auto-corrected. stemlm corrected this figure&apos;s notation before drawing it. Its content is unchanged.
        </p>
      )}
    </figure>
  );
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

function splitFirstWorkBlock(work: string): [string, string] {
  const separator = /\n\s*\n/.exec(work);
  if (!separator || separator.index == null) return [work.trim(), ''];
  return [
    work.slice(0, separator.index).trim(),
    work.slice(separator.index + separator[0].length).trim(),
  ];
}

/** A step's self-test, when it has both halves: the exercise is printed only with an answer to check against. */
function checkOf(step: Step): QuickCheck | null {
  const check = step.quickCheck;
  return check?.question && check.answer ? check : null;
}

function ReportStep({ step, figures }: { step: Step; figures: Figures }) {
  const work = resolveStepWorkText(step);
  const [firstWork, continuationWork] = work ? splitFirstWorkBlock(work) : ['', ''];
  const check = checkOf(step);

  return (
    <article className="slm-report-step">
      <div className="slm-report-step-intro">
        <header className="slm-report-step-head">
          {/* The numeral hangs in the margin from this box: an offset on the SVG itself would move
              its drawing out of the image the rasteriser makes of it. */}
          <span className="slm-report-step-n"><StepIndexMark n={step.index} /></span>
          <h3 className="slm-report-step-title"><MathMarkdown content={step.title} inline /></h3>
        </header>

        {shouldShowFormulaBlock(step) && step.formula && (
          <div className="slm-formula">
            <MathMarkdown content={step.formula} mathMode="display" />
          </div>
        )}

        {firstWork && (
          <div className="slm-step-work slm-step-work--intro">
            <div className="slm-step-work-body slm-selectable">
              <MathMarkdown content={firstWork} />
            </div>
          </div>
        )}
      </div>

      {continuationWork && (
        <div className="slm-step-work slm-step-work--continuation">
          <div className="slm-step-work-body slm-selectable">
            <MathMarkdown content={continuationWork} />
          </div>
        </div>
      )}

      {step.diagram && <Figure figures={figures} scope="step" index={step.index} diagram={step.diagram} />}

      {step.takeaway && (
        <div className="slm-takeaway">
          <span className="slm-takeaway-label">Takeaway</span>
          <MathMarkdown content={step.takeaway} />
        </div>
      )}

      {check && (
        // `slm-takeaway` is also the class the paginator keeps on one page (pdf-raster.ts).
        <div className="slm-takeaway slm-report-check">
          <p className="slm-report-check-head">
            <span className="slm-takeaway-label">Check {step.index}</span>
            <span className="slm-report-check-hint">Answer after the last step</span>
          </p>
          <MathMarkdown content={check.question} />
        </div>
      )}
    </article>
  );
}

/** The model's closing synthesis, with the figures it embeds drawn in place. */
function SolutionBody({ capsule, figures }: { capsule: Capsule; figures: Figures }) {
  return capsule.solution.split(solutionDiagramRegexGlobal()).map((part, i) => {
    if (i % 2 === 1) {
      const index = Number(part);
      const diagram = capsule.solutionDiagrams[index];
      return diagram
        ? <Figure key={`d-${i}`} figures={figures} scope="sol" index={index} diagram={diagram} />
        : <Fragment key={`d-${i}`} />;
    }
    return part.trim() ? <MathMarkdown key={`t-${i}`} content={part} /> : <Fragment key={`t-${i}`} />;
  });
}

/**
 * Answers to the quick checks, collected after the working. A printed page cannot hide an answer
 * until it is asked for, so it is kept away from its exercise: the student commits first, then
 * turns to the key, the way a textbook sets its exercises.
 */
function CheckAnswers({ steps }: { steps: Step[] }) {
  const checked = steps.filter(checkOf);
  if (checked.length === 0) return null;
  return (
    <section className="slm-report-check-answers" aria-label="Check answers">
      <span className="slm-takeaway-label">Check answers</span>
      {checked.map((step) => (
        <div className="slm-report-check-answer" key={step.id}>
          <span className="slm-report-check-n">{step.index}</span>
          <MathMarkdown content={step.quickCheck!.answer} />
        </div>
      ))}
    </section>
  );
}

function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Where the answer came from: chat host, the day it was made, how long the working is. */
function EntryMeta({ session }: { session: Session }) {
  const steps = session.capsule.steps.length;
  const items = [
    CHAT_HOST_LAUNCH.find((host) => host.id === session.platform)?.label,
    session.createdAt > 0 ? localDate(session.createdAt) : undefined,
    steps > 0 ? counted(steps, 'step') : undefined,
  ].filter(Boolean);
  if (items.length === 0) return null;
  return (
    <p className="slm-report-meta">
      {items.map((item) => <span key={item}>{item}</span>)}
    </p>
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
  diagramNotes = {},
  prefix = '',
  number,
}: ReportFigures & {
  session: Session;
  prefix?: string;
  /** Position in a merged document. A single report has one question and does not number it. */
  number?: number;
}) {
  const { meta, steps, solution } = session.capsule;
  const question = resolveSessionQuestion(session);
  const figures: Figures = { svg: diagramSvg, overlays: diagramOverlays, notes: diagramNotes, prefix };
  const showTopic = Boolean(meta.topic) && !repeatsQuestion(meta.topic, question);
  const showSubject = Boolean(meta.subject && meta.subject !== 'General');
  const Topic = number === undefined ? 'h1' : 'h2';
  const ingest = session.origin === 'ingest';
  // The closing synthesis is set apart as the answer. The solution can hold figures alone, and a
  // figure without a sentence concludes nothing.
  const answer = steps.length > 0 && solution.replace(solutionDiagramRegexGlobal(), '').trim() ? (
    // `slm-takeaway` is also the class the paginator keeps on one page (pdf-raster.ts).
    <div className="slm-takeaway slm-report-answer">
      <div className="slm-report-answer-box">
        <span className="slm-takeaway-label">Answer</span>
        <SolutionBody capsule={session.capsule} figures={figures} />
      </div>
    </div>
  ) : null;

  return (
    <section className="slm-report-entry">
      {(number !== undefined || showTopic || showSubject) && (
        <div className="slm-report-entry-head">
          {number !== undefined && <span className="slm-report-label">Q{number}</span>}
          {showSubject && <span className="slm-report-subject">{meta.subject}</span>}
          {showSubject && showTopic && <span className="slm-report-sep" aria-hidden="true">/</span>}
          {showTopic && <Topic className="slm-report-topic"><MathMarkdown content={meta.topic} inline /></Topic>}
        </div>
      )}

      <section className="slm-report-q-block">
        <MathMarkdown content={question} className="slm-report-q-text" promote={false} />
        <EntryMeta session={session} />
      </section>

      <CapsuleSignals capsule={session.capsule} />

      <section className="slm-report-a" aria-label="Solution">
        {/* A stemLM answer leads with its result, so it is found without rereading the working. */}
        {!ingest && answer}

        {steps.map((step) => <ReportStep key={step.id} step={step} figures={figures} />)}

        {steps.length === 0 && solution.trim() && (
          <div className="slm-report-solution">
            <SolutionBody capsule={session.capsule} figures={figures} />
          </div>
        )}

        {/* The conclusion of a chat reply was lifted out of its last step and reads on from it. */}
        {ingest && answer}

        <StudentAnswerNotes capsule={session.capsule} />
        <CheckAnswers steps={steps} />
        <OriginNote session={session} variant="print" />
      </section>
    </section>
  );
}

function ReportHead({ children }: { children?: ReactNode }) {
  return (
    <header className="slm-report-head">
      <div className="slm-report-head-row">
        <BrandWordmark className="slm-report-wordmark" variant="light" height={18} />
      </div>
      {children}
    </header>
  );
}

function ReportFoot({ note }: { note?: string }) {
  return (
    <footer className="slm-report-foot">
      {note && <p className="slm-report-smallprint">{note}</p>}
      <p className="slm-report-made">
        <span>PDF made using stemlm</span>
        <a className="slm-report-foot-link" href={BRAND_SITE} target="_blank" rel="noopener noreferrer">
          stemlm.app
        </a>
      </p>
    </footer>
  );
}

export function Report({
  session,
  diagramSvg,
  diagramOverlays = {},
  diagramNotes = {},
}: ReportFigures & { session: Session }) {
  return (
    <div className="slm-report">
      <ReportHead />

      <ReportEntry
        session={session}
        diagramSvg={diagramSvg}
        diagramOverlays={diagramOverlays}
        diagramNotes={diagramNotes}
      />

      <ReportFoot note={session.origin === 'ingest' ? undefined : REPORT_NOTE} />
    </div>
  );
}

export function mergedReportKicker(count: number): string {
  return counted(count, 'question');
}

/** One line of the merged report's contents: the question's number and what it is about. */
function ContentsRow({ session, number }: { session: Session; number: number }) {
  const { subject, topic } = session.capsule.meta;
  const question = resolveSessionQuestion(session);
  return (
    <li>
      <span className="slm-report-label">Q{number}</span>
      {topic && !repeatsQuestion(topic, question)
        ? <MathMarkdown content={topic} inline />
        : <MathMarkdown content={question} inline promote={false} />}
      {subject && subject !== 'General' && <span className="slm-report-subject">{subject}</span>}
    </li>
  );
}

/**
 * Several saved questions in one continuous document: one brand header and a contents list at the
 * top, one sign-off at the very end, and every answer flowing straight into the next question so
 * no page is left half empty. The contents carry no page numbers: the list is laid out before the
 * document is cut into pages.
 */
export function MergedReport({
  sessions,
  diagramSvg,
  diagramOverlays = {},
  diagramNotes = {},
}: ReportFigures & { sessions: Session[] }) {
  return (
    <div className="slm-report slm-report--merged">
      <ReportHead>
        <h1 className="slm-report-title">Study questions</h1>
        <p className="slm-report-meta">
          <span>{mergedReportKicker(sessions.length)}</span>
          <span>{localDate(Date.now())}</span>
        </p>
        {sessions.length > 1 && (
          <ol className="slm-report-contents">
            {sessions.map((session, i) => (
              <ContentsRow key={`${session.id}-${i}`} session={session} number={i + 1} />
            ))}
          </ol>
        )}
      </ReportHead>

      {sessions.map((session, i) => (
        <ReportEntry
          key={`${session.id}-${i}`}
          session={session}
          diagramSvg={diagramSvg}
          diagramOverlays={diagramOverlays}
          diagramNotes={diagramNotes}
          prefix={entryPrefix(i)}
          number={i + 1}
        />
      ))}

      <ReportFoot note={REPORT_NOTE} />
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
  /** Structured from a plain chat reply: its conclusion follows the steps, and the report says so. */
  ingest: boolean;
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
      // A figure placeholder is not prose, and this report draws no figures.
      solution: plainText(String(capsule?.solution ?? '').replace(solutionDiagramRegexGlobal(), ' ')),
      ingest: session?.origin === 'ingest',
    };
  } catch {
    return { id: `q${i}`, question: '', topic: '', steps: [], solution: '', ingest: false };
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
    <div className={`slm-report slm-report--plain${many ? ' slm-report--merged' : ''}`}>
      <ReportHead>
        {many && <h1 className="slm-report-title">Study questions</h1>}
        {many && <p className="slm-report-meta"><span>{mergedReportKicker(list.length)}</span></p>}
      </ReportHead>

      {list.map((entry, i) => {
        const answer = entry.steps.length > 0 && entry.solution ? (
          <div className="slm-takeaway slm-report-answer">
            <div className="slm-report-answer-box">
              <span className="slm-takeaway-label">Answer</span>
              <p>{entry.solution}</p>
            </div>
          </div>
        ) : null;
        return (
          <section className="slm-report-entry" key={`${entry.id}-${i}`}>
            {many && (
              <div className="slm-report-entry-head">
                <span className="slm-report-label">Q{i + 1}</span>
                {entry.topic && <h2 className="slm-report-topic">{entry.topic}</h2>}
              </div>
            )}
            <section className="slm-report-q-block">
              <div className="slm-prose slm-report-q-text">
                <p>{entry.question}</p>
              </div>
            </section>
            <section className="slm-report-a" aria-label="Solution">
              {!entry.ingest && answer}
              {entry.steps.map((step, j) => (
                <article className="slm-report-step" key={`${entry.id}-s${j}`}>
                  <header className="slm-report-step-head">
                    <h3 className="slm-report-step-title">
                      {step.index}. {step.title}
                    </h3>
                  </header>
                  {step.formula && (
                    <div className="slm-formula">
                      <div className="slm-prose">
                        <p>{step.formula}</p>
                      </div>
                    </div>
                  )}
                  <div className="slm-step-work">
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
              {entry.ingest && answer}
              {entry.ingest && <OriginNote session={{ origin: 'ingest' }} variant="print" />}
            </section>
          </section>
        );
      })}

      <ReportFoot note={list.length === 1 && list[0]!.ingest ? undefined : REPORT_NOTE} />
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
