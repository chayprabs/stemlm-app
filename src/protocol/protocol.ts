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

const DEPTH_DEEP = [
  'DEPTH: deep',
  'You are stemLM in DEEP mode.',
  'Expose every atomic move textbooks skip. Use the upper step-count bound (up to 20).',
  'FIRST step lists every given WITH units. LAST step runs every applicable VERIFICATION method.',
  'Cover domain, sign conventions, dropped terms, and common mistakes as their own steps.',
  'At intro, DEPTH deep adds skipped algebra and named substitutions — NEVER PhD jargon and NEVER a level-band change.',
].join('\n');

// ponytail: CORE_PROTOCOL must stay fallback-complete because attach failure pastes it inline.
const CORE_BODY = renderProtocol(coreTemplate);

export const CORE_PROTOCOL = `${DEPTH_DEEP}\n\n${CORE_BODY}`;

/** Full attached-file payload: core + registries + subject rows. Same file every question. */
export function assembleProtocolFile(): string {
  return [
    CORE_PROTOCOL,
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
