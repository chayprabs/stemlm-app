/**
 * Structural capsule fixtures for non-electrical subjects.
 * Format/pipeline smoke tests only — NOT pre-authored exam solutions.
 */

const MIN_SVG =
  '<svg viewBox="0 0 300 180"><line x1="20" y1="90" x2="280" y2="90" stroke="#333"/><text x="30" y="80" font-size="14">state</text></svg>';

function structuralCapsule(subject: string, topic: string): string {
  return [
    '```stemlm',
    '@meta',
    'version: 1',
    `subject: ${subject}`,
    `topic: ${topic}`,
    'question: Structural fixture — Gemini generates real solutions at runtime.',
    '@endmeta',
    '@step',
    'title: First pipeline check step',
    '@body',
    'Placeholder @body for format validation.',
    '@endbody',
    '@diagram type=svg',
    MIN_SVG,
    '@enddiagram',
    '@endstep',
    '@step',
    'title: Second pipeline check step',
    '@formula',
    '$$x = y$$',
    '@endformula',
    '@body',
    '$x$ is a symbol. With $y=1$: $x=1$.',
    '@endbody',
    '@diagram type=svg',
    MIN_SVG,
    '@enddiagram',
    '@endstep',
    '@step',
    'title: Third pipeline check step',
    '@body',
    'Third step completes minimum step count.',
    '@endbody',
    '@endstep',
    '@solution',
    'Structural fixture only.',
    '@endsolution',
    '@end',
    '```',
  ].join('\n');
}

export const CS_MIN_COINS_DP = structuralCapsule('CS', 'DP format check');
export const MECHANICAL_AXIAL_STRESS_BAR = structuralCapsule('Mechanical', 'Stress format check');
export const CIVIL_SIMPLY_SUPPORTED_BEAM = structuralCapsule('Civil', 'Beam format check');
export const CHEMICAL_NACL_MIXER = structuralCapsule('Chemical', 'Mixer format check');
export const PHYSICS_CONVEX_LENS = structuralCapsule('Physics', 'Optics format check');
