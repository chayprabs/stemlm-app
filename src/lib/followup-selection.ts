/**
 * Read and normalize text the student selected inside the study panel for
 * quote-reply follow-ups.
 */
import type { Session, Step } from '@/src/protocol/types';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';

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

/** Context quoted into Gemini when the model omits @followup on the final step. */
export function buildLastStepFollowupSelection(session: Session, step: Step): string {
  const question = cleanSessionQuestion(session.question) || session.capsule.meta.topic;
  const lines = [`Problem: ${question}`, `Final step: ${step.title}`];
  const takeaway = step.takeaway ? stripProtocolMarkers(step.takeaway) : '';
  const body = step.body ? stripProtocolMarkers(step.body) : '';
  if (takeaway) lines.push(`Takeaway: ${takeaway}`);
  else if (body) lines.push(`Context: ${body.slice(0, 280)}`);
  return lines.join('\n');
}
