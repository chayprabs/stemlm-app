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

/**
 * The student's selection as a live range, when it is not empty and lies inside `panel`.
 *
 * The panel lives in a shadow root. From the document, a selection in there reports itself
 * collapsed and its range is re-scoped to the host element, so neither can be trusted: the
 * composed range is the real one. A browser without it has the shadow root's own selection
 * (Chromium), and a panel outside a shadow root uses the document's.
 */
export function panelSelectionRange(panel: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const root = panel.getRootNode();
  let range: Range | null = null;
  if (!(root instanceof ShadowRoot)) {
    range = sel.getRangeAt(0);
  } else if (typeof sel.getComposedRanges === 'function') {
    const composed = sel.getComposedRanges({ shadowRoots: [root] })[0];
    if (composed) {
      range = document.createRange();
      range.setStart(composed.startContainer, composed.startOffset);
      range.setEnd(composed.endContainer, composed.endOffset);
    }
  } else {
    const own = (root as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.();
    range = own && own.rangeCount > 0 ? own.getRangeAt(0) : null;
  }
  if (!range || range.collapsed || !panel.contains(range.commonAncestorContainer)) return null;
  return range;
}

const BLOCK = /^(?:P|DIV|H[1-6]|BLOCKQUOTE|PRE|TABLE|UL|OL|SECTION|ARTICLE|HEADER|FIGURE|FIGCAPTION)$/;

/**
 * A node's text as it reads on the page: a blank line between blocks, one line per list item
 * and table row, a tab between table cells.
 */
function blockText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  const el = node instanceof Element ? node : null;
  // Controls and what is only there for a screen reader are not part of what was read.
  if (el?.matches('button, .slm-sr-only, [aria-hidden="true"]')) return '';
  const inner = [...node.childNodes].map(blockText).join('');
  if (!el) return inner;
  if (BLOCK.test(el.tagName)) return `\n\n${inner}\n\n`;
  if (/^(?:LI|TR|BR)$/.test(el.tagName)) return `${inner}\n`;
  return /^T[DH]$/.test(el.tagName) ? `${inner}\t` : inner;
}

/** The formula a node belongs to, with its display wrapper when it is set on its own line. */
function formulaAt(node: Node): Element | null {
  const formula = (node instanceof Element ? node : node.parentElement)?.closest('.katex') ?? null;
  return formula?.parentElement?.classList.contains('katex-display') ? formula.parentElement : formula;
}

/**
 * The text of a selection with each formula as the LaTeX it was typeset from, `$…$` in a line
 * and `$$…$$` on its own. KaTeX draws a formula as a stack of positioned spans, so the text the
 * browser reads from one is a symbol per line. A formula the selection cuts through is taken
 * whole: half of one has no source.
 */
export function selectionText(selected: Range): { text: string; hasMath: boolean } {
  const range = selected.cloneRange();
  // An end that only touches a formula's edge holds none of it: a triple click on a paragraph
  // ends at the very start of the equation below.
  const holds = (formula: Element, from: 'start' | 'end') => {
    const part = range.cloneRange();
    if (from === 'start') part.setEndAfter(formula);
    else part.setStartBefore(formula);
    return part.toString() !== '';
  };
  const first = formulaAt(range.startContainer);
  if (first) holds(first, 'start') ? range.setStartBefore(first) : range.setStartAfter(first);
  const last = formulaAt(range.endContainer);
  if (last) holds(last, 'end') ? range.setEndAfter(last) : range.setEndBefore(last);
  const fragment = range.cloneContents();
  let hasMath = false;
  for (const formula of [...fragment.querySelectorAll('.katex')]) {
    const tex = formula.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
    if (!tex) continue;
    hasMath = true;
    const display = formula.parentElement?.classList.contains('katex-display');
    (display ? formula.parentElement! : formula).replaceWith(display ? `\n\n$$${tex}$$\n\n` : `$${tex}$`);
  }
  const text = blockText(fragment)
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, hasMath };
}

/** Read the current non-collapsed selection confined to `panel`. */
export function readPanelSelection(panel: HTMLElement): PanelSelection | null {
  const range = panelSelectionRange(panel);
  if (!range) return null;

  // Either end may lie in the answer's text: a triple click selects a paragraph up to the start
  // of whatever follows it, which is outside.
  const inAnswerText = (node: Node) =>
    Boolean((node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element))?.closest?.('.slm-selectable'));
  if (!inAnswerText(range.startContainer) && !inAnswerText(range.endContainer)) return null;

  const text = normalizeFollowupSelection(selectionText(range).text);
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
