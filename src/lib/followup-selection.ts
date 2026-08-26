/**
 * Read and normalize text the student selected inside the study panel for
 * quote-reply follow-ups.
 */
import type { Session, Step } from '@/src/protocol/types';
import { resolveStepWorkText } from '@/src/lib/step-display';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';
import { SOLUTION_ANCHOR_ID } from '@/src/lib/step-entries';

/** Strip invisible chars and collapse noisy whitespace while keeping line breaks. */
export function normalizeFollowupSelection(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export interface PanelSelection {
  text: string;
  /** Viewport anchor for the selection popover (center-bottom of highlight). */
  x: number;
  y: number;
}

/** Read the current non-collapsed selection confined to `panel`. */
export function readPanelSelection(panel: HTMLElement): PanelSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!panel.contains(range.commonAncestorContainer)) return null;

  const anchor = range.commonAncestorContainer;
  const anchorEl =
    anchor.nodeType === Node.TEXT_NODE
      ? (anchor.parentElement as Element | null)
      : (anchor as Element);
  if (!anchorEl?.closest?.('.slm-selectable')) return null;

  const text = normalizeFollowupSelection(sel.toString());
  if (text.length < 3) return null;

  const rect = range.getBoundingClientRect();
  const hasBox = rect.width > 0 || rect.height > 0;

  return {
    text,
    x: hasBox ? rect.left + rect.width / 2 : 0,
    y: hasBox ? rect.bottom : 0,
  };
}

/**
 * Per-step Ask-in-chat context: enough for the model to answer a question
 * about THIS step without re-reading the whole thread. Unique per step.
 */
export function buildStepFollowupSelection(session: Session, step: Step): string {
  const steps = session.capsule.steps;
  const position = steps.findIndex((s) => s.id === step.id) + 1;
  const question =
    cleanSessionQuestion(session.question) ||
    session.capsule.meta.question?.trim() ||
    session.capsule.meta.topic;
  const lines = [
    `Problem: ${question}`,
    `Step ${position > 0 ? position : '?'} of ${steps.length} (${step.id}): ${step.title}`,
  ];
  if (step.formula) lines.push(`Formula: ${stripProtocolMarkers(step.formula)}`);
  const work = resolveStepWorkText(step);
  const body = work ? stripProtocolMarkers(work) : '';
  if (body) lines.push(`Work: ${body.slice(0, 320)}`);
  const takeaway = step.takeaway ? stripProtocolMarkers(step.takeaway) : '';
  if (takeaway) lines.push(`Takeaway: ${takeaway}`);
  return lines.join('\n');
}

/**
 * Whole-solution Ask-in-chat context (Solution tab): the problem, the route
 * taken (step titles), and the final answer — enough for questions that span
 * the entire solution rather than one step.
 */
export function buildSolutionFollowupSelection(session: Session): string {
  const question =
    cleanSessionQuestion(session.question) ||
    session.capsule.meta.question?.trim() ||
    session.capsule.meta.topic;
  const steps = session.capsule.steps;
  const lines = [`Problem: ${question}`];
  if (steps.length > 0) {
    const route = steps.map((s, i) => `${i + 1}. ${s.title}`).join('; ');
    lines.push(`Solution route (${steps.length} steps): ${route.slice(0, 480)}`);
  }
  const solution = session.capsule.solution
    ? stripProtocolMarkers(session.capsule.solution)
    : '';
  const lastTakeaway = steps[steps.length - 1]?.takeaway
    ? stripProtocolMarkers(steps[steps.length - 1]!.takeaway!)
    : '';
  const finalAnswer = solution || lastTakeaway;
  if (finalAnswer) lines.push(`Final answer: ${finalAnswer.slice(0, 360)}`);
  const prior = (session.followups ?? []).filter((f) => f.anchorStepId === SOLUTION_ANCHOR_ID);
  for (const f of prior.slice(-2)) {
    if (f.question) lines.push(`Earlier follow-up: ${f.question.slice(0, 180)}`);
    const ans = f.capsule.solution || f.capsule.steps[0]?.body || '';
    if (ans) lines.push(`Earlier follow-up answer: ${stripProtocolMarkers(ans).slice(0, 220)}`);
  }
  return lines.join('\n');
}

/**
 * Ask-in-chat context when the student asks from inside a previous follow-up
 * answer: quotes the anchor step plus that answer, so the chain stays coherent.
 */
export function buildFollowupChainSelection(opt: {
  problem: string;
  anchorStepTitle?: string;
  previousQuestion?: string;
  previousAnswer?: string;
}): string {
  const lines = [`Problem: ${opt.problem}`];
  if (opt.anchorStepTitle) lines.push(`Step in focus: ${opt.anchorStepTitle}`);
  if (opt.previousQuestion) lines.push(`Earlier follow-up question: ${opt.previousQuestion}`);
  if (opt.previousAnswer) {
    lines.push(`Earlier follow-up answer: ${stripProtocolMarkers(opt.previousAnswer).slice(0, 320)}`);
  }
  return lines.join('\n');
}

/** Context quoted into Gemini when the model omits @followup on the final step. */
export function buildLastStepFollowupSelection(session: Session, step: Step): string {
  const question =
    cleanSessionQuestion(session.question) ||
    session.capsule.meta.question?.trim() ||
    session.capsule.meta.topic;
  const lines = [`Problem: ${question}`, `Final step: ${step.title}`];
  const takeaway = step.takeaway ? stripProtocolMarkers(step.takeaway) : '';
  const work = resolveStepWorkText(step);
  const body = work ? stripProtocolMarkers(work) : '';
  if (takeaway) lines.push(`Takeaway: ${takeaway}`);
  else if (body) lines.push(`Context: ${body.slice(0, 280)}`);
  return lines.join('\n');
}
