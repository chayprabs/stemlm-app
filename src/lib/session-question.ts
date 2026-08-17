/**
 * Panel heading text — always the student's question, never a step title.
 */
import type { Session } from '@/src/protocol/types';
import { normalizeComposerText } from '@/src/lib/composer-text';

/** Show the full question up to this length; above it, compress to a short line. */
const FULL_QUESTION_MAX = 280;
/** Hard cap for compressed one-line headings. */
const COMPACT_MAX = 200;

/** Remove stemLM composer noise from a stored question string. */
export function cleanSessionQuestion(text: string): string {
  return normalizeComposerText(stripInjectedNoise(text));
}

/** Best available question text: composer paste, model @meta question, then topic. */
export function resolveSessionQuestion(session: Session): string {
  const fromComposer = cleanSessionQuestion(session.question || '');
  if (fromComposer) return fromComposer;
  const fromMeta = normalizeComposerText(session.capsule.meta.question || '');
  if (fromMeta) return fromMeta;
  return (session.capsule.meta.topic || '').trim();
}

function stripInjectedNoise(text: string): string {
  const markers = [
    '--- stemLM',
    'stemLM instructions',
    'Ask your question here:',
    'stemLM follow-up context',
    'Follow the attached stemlm-protocol.txt',
    'stemlm-protocol.txt',
  ];
  let cut = text.length;
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1 && idx < cut) cut = idx;
  }
  return text.slice(0, cut).trim();
}

function normalizeLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.55 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

function compactLongQuestion(lines: string[]): string {
  const first = lines[0] ?? '';
  const partLines = lines.filter((line) => /^\([a-z]\)/i.test(line));
  if (partLines.length > 0) {
    const head = truncateAtWord(first, COMPACT_MAX - 16);
    return `${head} (${partLines.length} parts)`;
  }
  return truncateAtWord(lines.join(' '), COMPACT_MAX);
}

/** Question text for the panel header (full question or a short layman summary). */
export function sessionQuestionHeading(session: Session): string {
  const raw = resolveSessionQuestion(session);
  const lines = normalizeLines(raw);

  if (lines.length > 0) {
    const full = lines.join('\n');
    if (full.length <= FULL_QUESTION_MAX) return full;
    return compactLongQuestion(lines);
  }

  const topic = (session.capsule.meta.topic || '').trim();
  if (topic) return topic.length <= FULL_QUESTION_MAX ? topic : truncateAtWord(topic, COMPACT_MAX);

  return 'Study question';
}
