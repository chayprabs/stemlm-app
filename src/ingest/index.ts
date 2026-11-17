/**
 * Universal answer ingest: any rendered chat answer -> the study structure the panel renders.
 *
 * No capsule and no model involved: `messageToMarkdown` recovers Markdown + LaTeX from the page,
 * `structureAnswer` segments it into steps. Sessions built this way were not checked by stemLM
 * and must be labelled so (the capsule carries no verification or uncertainty block).
 */
import { messageToMarkdown } from './dom-to-markdown';
import { structureAnswer, type StructuredAnswer } from './structure';

export { messageToMarkdown } from './dom-to-markdown';
export { structureAnswer } from './structure';
export type { IngestStrategy, StructuredAnswer } from './structure';

/** Rendered assistant message element -> study structure, or null when there is nothing worth structuring. */
export function structureMessage(message: Element, opt?: { question?: string }): StructuredAnswer | null {
  return structureAnswer(messageToMarkdown(message), opt);
}
