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

import coreBalancedTemplate from './core-protocol.md?raw';
import coreUltraTemplate from './core-protocol.ultra.md?raw';

export const CAPSULE_FENCE_TAG = 'stemlm';
export const CAPSULE_END_TOKEN = '@end';
export const PROTOCOL_VERSION = 1;
export type PromptVariant = 'balanced' | 'ultra';

/** Hard parser bounds — simple problems may have 3 atomic steps. */
export const STEP_COUNT_MIN = 3;
/** Target range in prompts for typical multi-step problems. */
export const STEP_COUNT_MAX = 12;
export const STEP_COUNT_TARGET = '5-12';

/**
 * The core protocol text lives in `core-protocol.md` (a compact file,
 * imported raw) so the prompt we attach as stemlm-protocol.txt stays small.
 * The structural tokens are injected here from the constants above so the
 * protocol stays the single source of truth for the parser.
 */
/** Normalize template text before token substitution (Windows CRLF must not inflate byte budgets). */
export function renderProtocol(template: string): string {
  return template
    .replace(/\r\n/g, '\n')
    .replace(/__FENCE__/g, CAPSULE_FENCE_TAG)
    .replace(/__END__/g, CAPSULE_END_TOKEN)
    .replace(/__VER__/g, String(PROTOCOL_VERSION))
    .trim();
}

export const CORE_PROTOCOL_BY_VARIANT: Record<PromptVariant, string> = {
  balanced: renderProtocol(coreBalancedTemplate),
  ultra: renderProtocol(coreUltraTemplate),
};

export const DEFAULT_PROMPT_VARIANT: PromptVariant = 'balanced';

export const CORE_PROTOCOL = CORE_PROTOCOL_BY_VARIANT[DEFAULT_PROMPT_VARIANT];
