/**
 * Lightweight client-side subject classifier.
 *
 * Used purely to pick ONE playbook to inject (token economy) — the model is
 * still told to re-classify and adapt if we guessed wrong, so a miss is never
 * fatal. Heuristic scoring over keyword/regex signals; ties resolve to the
 * higher-priority subject, and a weak signal falls back to General.
 */
import type { Subject } from './types';

interface Rule {
  subject: Subject;
  /** Weighted signals. */
  patterns: { re: RegExp; w: number }[];
}

const RULES: Rule[] = [
  {
    subject: 'CS',
    patterns: [
      { re: /\b(algorithm|big-?o|complexity|recursion|recursive|data structure|linked list|binary tree|hash ?map|stack|queue|graph traversal|dijkstra|dynamic programming|dp\b|sql|regex|compiler|pointer|runtime)\b/i, w: 3 },
      { re: /\b(python|java\b|javascript|typescript|c\+\+|golang|rust|code|function|variable|loop|array|class|api|database)\b/i, w: 1 },
    ],
  },
  {
    subject: 'Electrical',
    patterns: [
      { re: /\b(circuit|resistor|capacitor|inductor|voltage|current|ohm|kirchhoff|kvl|kcl|impedance|transistor|diode|op-?amp|thevenin|norton|rms|ac\b|dc\b|node voltage|mesh)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Chemistry',
    patterns: [
      { re: /\b(mole|molar|stoich|reaction|equilibrium|ph\b|acid|base|titration|enthalpy|entropy|oxidation|reduction|redox|bond|electron config|periodic|ideal gas|avogadro|concentration|molecule|compound|reagent)\b/i, w: 3 },
      { re: /\b(h2o|co2|nacl|hcl|naoh|\\ce)\b/i, w: 2 },
    ],
  },
  {
    subject: 'Biology',
    patterns: [
      { re: /\b(cell|dna|rna|protein|enzyme|mitosis|meiosis|photosynthesis|respiration|gene|allele|chromosome|organism|ecosystem|membrane|atp\b|punnett|evolution|neuron|homeostasis)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Mechanical',
    patterns: [
      { re: /\b(torque|moment of inertia|gear|shaft|stress|strain|beam|thermodynamic cycle|heat engine|fluid mechanic|bernoulli|free body|friction|kinematics|projectile|pulley)\b/i, w: 2 },
    ],
  },
  {
    subject: 'Civil',
    patterns: [
      { re: /\b(truss|beam load|bending moment|shear force|reinforced concrete|structural|foundation|soil|load bearing|cantilever|deflection)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Chemical',
    patterns: [
      { re: /\b(mass balance|distillation|reactor design|reflux|process flow|heat exchanger|fugacity|raoult|mass transfer|unit operation)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Physics',
    patterns: [
      { re: /\b(force|velocity|acceleration|momentum|energy|work|power|gravity|electric field|magnetic|wave|optic|lens|refraction|reflection|quantum|relativity|newton|joule|kinematic|dynamics|projectile)\b/i, w: 2 },
    ],
  },
  {
    subject: 'Math',
    patterns: [
      { re: /\b(integral|derivative|differentiate|limit|matrix|determinant|eigen|vector space|probability|combinatoric|series|sequence|theorem|proof|equation|polynomial|trigonometr|logarithm|factor)\b/i, w: 2 },
    ],
  },
];

/** Priority used to break ties (earlier = wins). */
const PRIORITY: Subject[] = [
  'Electrical',
  'Civil',
  'Chemical',
  'CS',
  'Chemistry',
  'Biology',
  'Mechanical',
  'Physics',
  'Math',
  'General',
];

export function classifySubject(question: string): Subject {
  const text = question || '';
  const scores = new Map<Subject, number>();

  for (const rule of RULES) {
    let score = 0;
    for (const { re, w } of rule.patterns) {
      const matches = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
      if (matches) score += w * matches.length;
    }
    if (score > 0) scores.set(rule.subject, score);
  }

  if (scores.size === 0) return 'General';

  let best: Subject = 'General';
  let bestScore = 0;
  for (const subject of PRIORITY) {
    const s = scores.get(subject) ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = subject;
    }
  }

  // Require a minimal signal, else stay General to avoid mis-routing.
  return bestScore >= 2 ? best : 'General';
}
