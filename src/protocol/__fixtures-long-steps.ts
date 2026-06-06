/**
 * Fixtures for long (8–12 step) capsules — verifies parser, UI state, and export
 * paths handle realistic multi-step STEM answers.
 */

const MINI_SVG = (label: string) =>
  `<svg viewBox="0 0 120 40"><text x="8" y="24" font-size="12">${label}</text></svg>`;

/** Build a fenced capsule with `count` atomic steps (3–12). */
export function buildLongStepCapsule(
  count: number,
  opt?: { subject?: string; topic?: string },
): string {
  const subject = opt?.subject ?? 'Electrical';
  const topic = opt?.topic ?? `${count}-step circuit analysis`;
  const steps = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return [
      '@step',
      `title: Atomic move ${n}`,
      '@body',
      `Single cognitive move for step ${n} — one substitution or one reduction only.`,
      '@endbody',
      '@diagram type=svg',
      MINI_SVG(`Step ${n}`),
      '@enddiagram',
      '@endstep',
    ].join('\n');
  }).join('\n');

  return [
    '```stemlm',
    '@meta',
    'version: 1',
    `subject: ${subject}`,
    `topic: ${topic}`,
    '@endmeta',
    steps,
    '@solution',
    `Complete solution spanning all ${count} atomic moves with final numeric check.`,
    '@endsolution',
    '@end',
    '```',
  ].join('\n');
}

/** Ten-step mesh-style EE capsule (within the 5–12 target range). */
export const TEN_STEP_ELECTRICAL = buildLongStepCapsule(10, {
  topic: 'Mesh analysis of a three-mesh circuit',
});

export const TWELVE_STEP_ELECTRICAL = buildLongStepCapsule(12, {
  topic: 'Twelve-step Thevenin reduction',
});

export const EIGHT_STEP_MATH = buildLongStepCapsule(8, {
  subject: 'Math',
  topic: 'Integration by parts — eight atomic moves',
});
