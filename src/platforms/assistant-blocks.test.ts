import { afterEach, describe, expect, it } from 'vitest';
import { grokAdapter } from './grok';

// Live Grok 2026-09-27: the generic ".message-bubble" assistant selector also matched the student's
// own bubble (data-testid="user-message"), and selector-order results made it the "latest" reply:
// stemlm parsed the question it had just sent and reported "no stemlm answer" before Grok answered.
describe('assistant blocks never include the student’s own message', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const user = '<div data-testid="user-message" class="message-bubble">Find the current. --- stemLM --- Follow the attached stemLM study guide.</div>';
  const assistant = (text: string) => `<div data-testid="assistant-message" class="message-bubble"><div class="response-content-markdown">${text}</div></div>`;

  it('returns no reply while only the student’s message is on the page', () => {
    document.body.innerHTML = `<main>${user}</main>`;
    console.log('ASSISTANT_ONLY_USER', JSON.stringify(grokAdapter.getLatestAssistantText()));
    expect(grokAdapter.getLatestAssistantText()).toBe('');
    expect(grokAdapter.getAssistantBlocks()).toHaveLength(0);
  });

  it('returns the latest reply in page order, not the last selector’s match', () => {
    document.body.innerHTML = `<main>${assistant('First answer')}${user}${assistant('Second answer')}</main>`;
    expect(grokAdapter.getLatestAssistantText()).toContain('Second answer');
    expect(grokAdapter.getAssistantBlocks().map((block) => block.textContent)).toEqual(['First answer', 'Second answer']);
  });
});
