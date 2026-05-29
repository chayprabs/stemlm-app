/**
 * Builds the text we inject into the chatbot composer.
 *
 *  - buildInjectionPrompt: the student's question + core protocol + ONE subject
 *    playbook (chosen by the classifier or an explicit override).
 *  - buildFollowupPrompt: a quote-reply that drills into a selected part of a
 *    step and asks the model to answer again in the same capsule format, so the
 *    new answer renders below in the panel.
 */
import type { Subject } from './types';
import { CORE_PROTOCOL } from './protocol';
import { getPlaybook } from './playbooks';
import { classifySubject } from './classifier';

const SEP = '\n\n--- stemLM instructions (do not remove) ---\n';

export interface BuildOptions {
  /** 'Auto' => classify from the question; otherwise force this subject. */
  subject?: Subject | 'Auto';
}

export interface BuildResult {
  prompt: string;
  subject: Subject;
}

export function resolveSubject(question: string, opt?: BuildOptions): Subject {
  if (opt?.subject && opt.subject !== 'Auto') return opt.subject;
  return classifySubject(question);
}

export function buildInjectionPrompt(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const q = (question || '').trim();
  const head = q.length > 0 ? q : '(The student has not typed a question yet — ask them to type one.)';
  const prompt = `${head}${SEP}${CORE_PROTOCOL}\n\n${getPlaybook(subject)}`;
  return { prompt, subject };
}

export interface FollowupOptions {
  /** The text the student selected to drill into. */
  selection: string;
  /** The step title for context (optional). */
  stepTitle?: string;
  /** Subject so we keep the right playbook conventions. */
  subject?: Subject;
}

export function buildFollowupPrompt(opt: FollowupOptions): string {
  const subject = opt.subject ?? 'General';
  const quoted = (opt.selection || '').trim();
  const context = opt.stepTitle ? ` (from the step "${opt.stepTitle}")` : '';
  return [
    `Dig deeper into this specific part of your previous answer${context}:`,
    '',
    quoted
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n'),
    '',
    'Explain it more thoroughly — expand the reasoning, add the missing intermediate steps, and clarify anything subtle.',
    'Answer using the SAME stemLM capsule format as before (one ```stemlm code block, @meta ... @end, with step diagrams).',
    '',
    getPlaybook(subject),
  ].join('\n');
}
