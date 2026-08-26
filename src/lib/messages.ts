/**
 * Typed runtime messages between extension pages and content scripts.
 * Validate sender + payload before acting on untrusted input.
 */
import { browser } from 'wxt/browser';

export type StemLmMessage =
  | { type: 'stemlm:ping' }
  | { type: 'stemlm:open-panel' }
  | { type: 'stemlm:load-conversation' }
  | { type: 'stemlm:ask-here' }
  | { type: 'stemlm:open-saved-library' }
  | { type: 'stemlm:open-settings' };

const ALLOWED: StemLmMessage['type'][] = [
  'stemlm:ping',
  'stemlm:open-panel',
  'stemlm:load-conversation',
  'stemlm:ask-here',
  'stemlm:open-saved-library',
  'stemlm:open-settings',
];

export function isStemLmMessage(msg: unknown): msg is StemLmMessage {
  if (!msg || typeof msg !== 'object') return false;
  const type = (msg as { type?: unknown }).type;
  return typeof type === 'string' && (ALLOWED as string[]).includes(type);
}

/** Only accept messages from this extension (popup / background). */
export type ExtensionMessageSender = { id?: string };

export function isTrustedExtensionSender(sender: ExtensionMessageSender): boolean {
  try {
    return sender.id === browser.runtime.id;
  } catch {
    return false;
  }
}

export function parseStemLmMessage(
  msg: unknown,
  sender: ExtensionMessageSender,
): StemLmMessage | null {
  if (!isTrustedExtensionSender(sender)) return null;
  if (!isStemLmMessage(msg)) return null;
  return msg;
}
