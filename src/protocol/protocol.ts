/**
 * The stemLM Capsule Protocol.
 *
 * One attached instruction file tells the model how to think the solve and how
 * to emit a line-oriented ```stemlm capsule. Subject rows and the diagram
 * catalog are registries appended to that file — not per-subject essays.
 */
import coreTemplate from './core-protocol.md?raw';
import { getUniversalPlaybook } from './playbooks';
import {
  renderArchetypeRegistry,
  renderDiagramRegistry,
  renderFollowupRegistry,
  renderLevelDial,
  renderNotationLocale,
  renderVerificationRegistry,
  renderWhenNotToDraw,
} from './registries';

export const CAPSULE_FENCE_TAG = 'stemlm';
export const CAPSULE_END_TOKEN = '@end';
/** Version the protocol instructs the model to emit. Unknown higher versions still parse known blocks. */
export const PROTOCOL_VERSION = 2;
export type PromptVariant = 'balanced' | 'ultra';

/** Hard parser bounds — simple problems may have 3 atomic steps. */
export const STEP_COUNT_MIN = 3;
export const STEP_COUNT_MAX = 20;
export const STEP_COUNT_TARGET = '5-12';

export function renderProtocol(template: string): string {
  return template
    .replace(/\r\n/g, '\n')
    .replace(/__FENCE__/g, CAPSULE_FENCE_TAG)
    .replace(/__END__/g, CAPSULE_END_TOKEN)
    .replace(/__VER__/g, String(PROTOCOL_VERSION))
    .trim();
}

const DEPTH_BALANCED = [
  'DEPTH: balanced',
  'Emit 5-12 atomic @step blocks (3-4 if trivial). Last step is verification work.',
  'Prefer the standard textbook path. Do not skip symbol definitions or substitution.',
].join('\n');

const DEPTH_DEEP = [
  'DEPTH: deep',
  'You are stemLM in DEEP mode.',
  'Expose every atomic move textbooks skip. Prefer the upper step-count bound (up to 20).',
  'FIRST step lists every given WITH units. LAST step runs every applicable VERIFICATION method.',
  'Cover domain, sign conventions, dropped terms, and common mistakes as their own steps.',
].join('\n');

const CORE_BODY = renderProtocol(coreTemplate);

function withDepth(depth: string): string {
  return `${depth}\n\n${CORE_BODY}`;
}

export const CORE_PROTOCOL_BY_VARIANT: Record<PromptVariant, string> = {
  balanced: withDepth(DEPTH_BALANCED),
  ultra: withDepth(DEPTH_DEEP),
};

export const DEFAULT_PROMPT_VARIANT: PromptVariant = 'balanced';

export const CORE_PROTOCOL = CORE_PROTOCOL_BY_VARIANT[DEFAULT_PROMPT_VARIANT];

/** Full attached-file payload: core + registries + subject rows. Same file every question. */
export function assembleProtocolFile(variant: PromptVariant = DEFAULT_PROMPT_VARIANT): string {
  return [
    CORE_PROTOCOL_BY_VARIANT[variant],
    renderArchetypeRegistry(),
    renderVerificationRegistry(),
    renderFollowupRegistry(),
    renderWhenNotToDraw(),
    renderNotationLocale(),
    renderLevelDial(),
    getUniversalPlaybook(),
    renderDiagramRegistry(),
    'Now produce the capsule.',
  ].join('\n\n');
}
