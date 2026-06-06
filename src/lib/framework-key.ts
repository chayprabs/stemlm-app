import type { Session } from '@/src/protocol/types';

const SUBJECT_CODES: Record<string, string> = {
  Physics: 'PHY',
  Chemistry: 'CHEM',
  Math: 'MATH',
  Biology: 'BIO',
  CS: 'CS',
  Electrical: 'EE',
  Mechanical: 'MECH',
  Civil: 'CIV',
  Chemical: 'CHE',
  General: 'GEN',
};

/** Marketing-style taxonomy key for extraction badge (STEM-PHY-03-07-02). */
export function frameworkKey(session: Session): string {
  const code = SUBJECT_CODES[session.capsule.meta.subject] ?? 'GEN';
  const stepCount = String(session.capsule.steps.length).padStart(2, '0');
  const topicHash = session.capsule.meta.topic
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 2)
    .padEnd(2, '0');
  return `STEM-${code}-03-${topicHash}-${stepCount}`;
}
