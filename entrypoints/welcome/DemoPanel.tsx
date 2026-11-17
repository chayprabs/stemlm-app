import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Capsule } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import type { StepEntry } from '@/src/lib/step-entries';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { BrandWordmark, themeToBrandVariant } from '@/src/components/brand';
import { MathMarkdown } from '@/src/components/MathMarkdown';
import { DiagramRenderer } from '@/src/components/DiagramRenderer';
import { QuickCheck } from '@/src/components/QuickCheck';
import { StepList } from '@/src/components/StepList';
import { StepWork } from '@/src/components/StepWork';
import { AnswerBlock } from '@/src/components/AnswerBlock';
import { IconNavNext, IconNavPrev, IconTherefore } from '@/src/components/icons';
import { stepMotion, type StepDirection } from '@/src/components/step-motion';

/**
 * A working miniature of the study panel for the welcome page.
 *
 * It is built from the panel's own parts (the step strip, the math renderer, the figure compiler,
 * the quick check, the answer block) and styled by the panel's own sheet, so it shows what the
 * product looks like today rather than a picture of what it looked like once. Only the parts that
 * need a chat page are left out: saving, export and Ask in chat.
 */
export function DemoPanel({ capsule, question, theme }: { capsule: Capsule; question: string; theme: ResolvedTheme }) {
  const steps = capsule.steps;
  const total = steps.length;
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<StepDirection>(1);
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const readRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<StepEntry[]>(
    () => steps.map((step, i) => ({ kind: 'step', key: step.id, step, stepIndex: i, stepNumber: i + 1 })),
    [steps],
  );

  function go(next: number) {
    const clamped = Math.max(0, Math.min(total - 1, next));
    if (clamped === active) return;
    setDirection(clamped > active ? 1 : -1);
    setActive(clamped);
  }

  // The panel sheet lays itself out by `data-width` and aligns the strip to the page's scrollbar
  // gutter; the real panel measures both, so the miniature does too.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const read = readRef.current;
    if (!panel) return;
    const measure = () => {
      const w = panel.getBoundingClientRect().width;
      panel.dataset.width = w < 430 ? 'narrow' : w < 640 ? 'mid' : 'wide';
      if (read) panel.style.setProperty('--slm-scroll-gutter', `${Math.max(0, read.offsetWidth - read.clientWidth)}px`);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    readRef.current?.scrollTo?.({ top: 0 });
  }, [active]);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'ArrowRight') {
      go(active + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      go(active - 1);
      e.preventDefault();
    }
  }

  const step = steps[active];
  if (!step) return null;
  const isLast = active === total - 1;

  return (
    <section
      ref={panelRef}
      className="slm-panel slm-demo-panel"
      data-content-scale={2}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Live demo of the stemlm study panel. Use the left and right arrow keys to change step."
    >
      <header className="slm-header">
        <div className="slm-header-bar slm-header-top">
          <div className="slm-header-leading">
            <div className="slm-brand">
              <BrandWordmark className="slm-brand-name" variant={themeToBrandVariant(theme)} />
            </div>
          </div>
          <span className="slm-demo-flag">Example answer</span>
        </div>
        <div className="slm-header-title slm-topic-row">
          <div className="slm-question-meta">
            <span className="slm-question-subject">{capsule.meta.subject}</span>
            <span className="slm-question-topic">{capsule.meta.topic}</span>
          </div>
          <div className="slm-question-body">
            <div className="slm-topic-scroll is-single">
              <MathMarkdown content={question} className="slm-topic" />
            </div>
          </div>
        </div>
      </header>

      <div className="slm-body">
        <div className="slm-steps-hero">
          <div className="slm-steps-layout">
            <StepList entries={entries} activeIndex={active} onSelect={go} />
            <div className="slm-steps-detail">
              <div className="slm-read" ref={readRef}>
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.article key={step.id} className="slm-card" {...stepMotion(Boolean(reducedMotion), direction)}>
                    <header className="slm-card-head">
                      <p className="slm-card-kicker">
                        <span className="slm-card-kicker-step">Step {active + 1}</span>
                        <span className="slm-card-kicker-of">of {total}</span>
                      </p>
                      <h3 className="slm-card-title"><MathMarkdown content={step.title} inline /></h3>
                    </header>

                    {shouldShowFormulaBlock(step) && step.formula && (
                      <div className="slm-formula">
                        <span className="slm-formula-label">Formula</span>
                        <MathMarkdown content={step.formula} mathMode="display" />
                      </div>
                    )}

                    <StepWork step={step} className="slm-step-work slm-card-body" />

                    {step.diagram && <DiagramRenderer diagram={step.diagram} theme={theme} section />}

                    {step.takeaway && (
                      <div className="slm-takeaway">
                        <span className="slm-takeaway-label"><IconTherefore width={12} height={12} />Takeaway</span>
                        <MathMarkdown content={step.takeaway} />
                      </div>
                    )}

                    {step.quickCheck && <QuickCheck check={step.quickCheck} checkNumber={step.index} />}

                    {isLast && <AnswerBlock capsule={capsule} theme={theme} />}
                  </motion.article>
                </AnimatePresence>
              </div>

              <div className="slm-stepnav-slot">
                <footer className="slm-stepnav slm-stepnav--overlay" aria-label="Step navigation">
                  <button
                    type="button"
                    className="slm-stepnav-btn"
                    onClick={() => go(active - 1)}
                    disabled={active === 0}
                    aria-label="Previous step"
                  >
                    <IconNavPrev /> Prev
                  </button>
                  <span className="slm-stepnav-count" aria-hidden="true">
                    <span className="slm-stepnav-count-now">{active + 1}</span>
                    <span className="slm-stepnav-count-of">/ {total}</span>
                  </span>
                  <button
                    type="button"
                    className="slm-stepnav-btn slm-stepnav-btn--next"
                    onClick={() => go(active + 1)}
                    disabled={isLast}
                    aria-label="Next step"
                  >
                    Next <IconNavNext />
                  </button>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
