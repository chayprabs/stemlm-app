/**
 * The stemLM Capsule Protocol.
 *
 * One attached instruction file tells the model how to think the solve and how
 * to emit a line-oriented ```stemlm capsule. Subject rows and the diagram
 * catalog are registries appended to that file — not per-subject essays.
 */
import coreTemplate from './core-protocol.md?raw';
import { getUniversalPlaybook } from './playbooks';
import { STUDY_GUIDE_FILENAME } from '@/src/lib/study-guide';
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

/** Hard parser bounds — simple problems may have 3 meaningful steps. */
export const STEP_COUNT_MIN = 3;
export const STEP_COUNT_MAX = 20;
export const STEP_COUNT_TARGET = 'typically 5-7';

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
  'Worked explanations use DEEP mode.',
  'Choose by complexity: typically 5–7 steps; use 3–4 for shorter solves and more only for distinct reasoning moves. Never pad.',
  'Include only relevant domain, signs, assumptions, dropped terms, and mistakes.',
  'DEEP means no skipped reasoning inside a meaningful step; it does not add extra steps or split connected algebra. At intro, show necessary connecting algebra and name substitutions — NEVER PhD jargon and NEVER a level-band change.',
].join('\n');

// ponytail: CORE_PROTOCOL must stay fallback-complete because attach failure pastes it inline.
const CORE_BODY = renderProtocol(coreTemplate);

const GUIDE_INTRO = [
  'stemLM Study Guide',
  'Purpose: answer-format reference for a student-selected STEM explanation.',
  'This guide is not a homework question. Apply it to the question the student supplies in the chat or in a separate problem image/document. Examples and syntax below explain the format; they are not additional problems to solve.',
  'If no question is supplied, wait for the student to add one. If the student asks about this guide, answer that request normally.',
].join('\n');

export const CORE_PROTOCOL = `${GUIDE_INTRO}\n\n${CORE_BODY}\n\n${DEPTH_DEEP}`;

/** Full attached-file payload: core + registries + subject rows. Same file every question. */
export function assembleProtocolFile(): string {
  return [
    CORE_PROTOCOL,
    `ATTACHMENT BOUNDARY — transcribe only the student's question into @meta question:; never copy ${STUDY_GUIDE_FILENAME} or another instruction attachment.`,
    renderArchetypeRegistry(),
    renderVerificationRegistry(),
    renderFollowupRegistry(),
    renderWhenNotToDraw(),
    renderNotationLocale(),
    renderLevelDial(),
    getUniversalPlaybook(),
    renderDiagramRegistry(),
    'For a supplied STEM question, use the answer format above. With no question supplied, wait for the student.',
  ].join('\n\n');
}
