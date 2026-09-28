import { afterEach, describe, expect, it } from 'vitest';
import { focusComposerQuestionSlot } from './factory';

/** What typing does: insert at the DOM caret. */
function typeAtCaret(text: string): void {
  const range = window.getSelection()!.getRangeAt(0);
  range.insertNode(document.createTextNode(text));
}

describe('Ask in chat puts the caret in the question slot of a paragraph editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Live Claude 2026-09-27 (ProseMirror): the question landed inside "--- stem|LM follow-up context".
  it('types the question on the blank line under the label, not inside the context marker', () => {
    document.body.innerHTML = [
      '<div class="ProseMirror" contenteditable="true">',
      '<p>Ask your question here:</p>',
      '<p><br class="ProseMirror-trailingBreak"></p>',
      '<p><br class="ProseMirror-trailingBreak"></p>',
      '<p>--- stemLM follow-up context (do not remove) ---</p>',
      '<p>Follow the attached stemLM study guide.</p>',
      '</div>',
    ].join('');
    const editor = document.querySelector<HTMLElement>('.ProseMirror')!;
    focusComposerQuestionSlot(editor);
    typeAtCaret('Why is the slope the acceleration?');
    const lines = [...editor.children].map((p) => p.textContent);
    console.log('QUESTION_SLOT', JSON.stringify(lines));
    expect(lines[0]).toBe('Ask your question here:');
    expect(lines[1]).toBe('Why is the slope the acceleration?');
    expect(lines[3]).toBe('--- stemLM follow-up context (do not remove) ---');
  });

  it('types right after the label when no blank line follows it', () => {
    document.body.innerHTML = '<div contenteditable="true"><p>Ask your question here:</p><p>--- stemLM follow-up context (do not remove) ---</p></div>';
    const editor = document.querySelector<HTMLElement>('[contenteditable]')!;
    focusComposerQuestionSlot(editor);
    typeAtCaret(' Why?');
    const lines = [...editor.children].map((p) => p.textContent);
    console.log('QUESTION_SLOT_INLINE', JSON.stringify(lines));
    expect(lines).toEqual(['Ask your question here: Why?', '--- stemLM follow-up context (do not remove) ---']);
  });
});
