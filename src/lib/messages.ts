/**
 * Typed runtime messages between extension pages and content scripts.
 * Validate sender + payload before acting on untrusted input.
 */
import { browser } from 'wxt/browser';

export type StemLmMessage =
  | { type: 'stemlm:ping' }
  | { type: 'stemlm:open-panel' }
  | { type: 'stemlm:load-conversation' };

const ALLOWED: StemLmMessage['type'][] = [
  'stemlm:ping',
  'stemlm:open-panel',
  'stemlm:load-conversation',
];

export function isStemLmMessage(msg: unknown): msg is StemLmMessage {
  if (!msg || typeof msg !== 'object') return false;
  const type = (msg as { type?: unknown }).type;
  return typeof type === 'string' && (ALLOWED as string[]).includes(type);
}

/** Only accept messages from this extension (popup / background). */
export type ExtensionMessageSender = { id?: string };

export function isTrustedExtensionSender(sender: ExtensionMessageSender): boolean {
  return sender.id === browser.runtime.id;
}

export function parseStemLmMessage(
  msg: unknown,
  sender: ExtensionMessageSender,
): StemLmMessage | null {
  if (!isTrustedExtensionSender(sender)) return null;
  if (!isStemLmMessage(msg)) return null;
  return msg;
}
