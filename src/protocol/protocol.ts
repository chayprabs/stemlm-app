/**
 * The stemLM Capsule Protocol.
 *
 * This is the core instruction block injected into the chatbot. It tells the
 * model to return its answer in a single, machine-parseable fenced code block
 * that the extension can reliably extract from the page DOM (code fences render
 * inside <pre><code>, preserve whitespace, and are never "prettified").
 *
 * We use a line-delimited block format rather than JSON because answers are
 * full of LaTeX backslashes and inline SVG, both of which constantly break
 * strict JSON. The closing `@end` token doubles as our streaming-complete
 * signal.
 *
 * Keep this tight: it is sent on every question. Subject-specific guidance is
 * appended separately by the builder (one playbook at a time) for token economy.
 */

import coreTemplate from './core-protocol.md?raw';

export const CAPSULE_FENCE_TAG = 'stemlm';
export const CAPSULE_END_TOKEN = '@end';
export const PROTOCOL_VERSION = 1;

/**
 * The core protocol text lives in `core-protocol.md` (a compact ~1.7 kB file,
 * imported raw) so the prompt we paste into the chat composer stays small — a
 * giant inline paste laggs the composer and clutters the chat. The structural
 * tokens are injected here from the constants above so the protocol stays the
 * single source of truth for the parser.
 */
export const CORE_PROTOCOL = coreTemplate
  .replace(/__FENCE__/g, CAPSULE_FENCE_TAG)
  .replace(/__END__/g, CAPSULE_END_TOKEN)
  .replace(/__VER__/g, String(PROTOCOL_VERSION))
  .trim();
