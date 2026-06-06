import { describe, it, expect, vi } from 'vitest';
import {
  isStemLmMessage,
  isTrustedExtensionSender,
  parseStemLmMessage,
  type ExtensionMessageSender,
} from './messages';

vi.mock('wxt/browser', () => ({
  browser: { runtime: { id: 'ext-123' } },
}));

describe('messages', () => {
  it('accepts known message types', () => {
    expect(isStemLmMessage({ type: 'stemlm:ping' })).toBe(true);
    expect(isStemLmMessage({ type: 'stemlm:open-panel' })).toBe(true);
    expect(isStemLmMessage({ type: 'stemlm:load-conversation' })).toBe(true);
    expect(isStemLmMessage({ type: 'stemlm:evil' })).toBe(false);
    expect(isStemLmMessage(null)).toBe(false);
  });

  it('rejects senders from other extensions', () => {
    expect(isTrustedExtensionSender({ id: 'other' })).toBe(false);
    expect(isTrustedExtensionSender({ id: 'ext-123' })).toBe(true);
  });

  it('parses trusted messages only', () => {
    const sender: ExtensionMessageSender = { id: 'ext-123' };
    expect(parseStemLmMessage({ type: 'stemlm:open-panel' }, sender)?.type).toBe(
      'stemlm:open-panel',
    );
    expect(parseStemLmMessage({ type: 'stemlm:open-panel' }, { id: 'x' })).toBeNull();
  });
});
