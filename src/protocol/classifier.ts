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
      // Strong, unambiguous CS signatures.
      { re: /\b(algorithm|algorithmic|big-?o|time complexity|space complexity|recursion|recursive|data structure|linked list|binary (search )?tree|bst\b|hash ?map|hash table|heap|stack|queue|graph traversal|bfs|dfs|dijkstra|dynamic programming|memoi[sz]ation|greedy|backtrack|binary search|merge sort|quick ?sort|sorting algorithm|time-?complexity|leetcode|pseudocode|state machine|finite automat|turing|np-?complete|regex|regular expression|compiler|operating system|deadlock|mutex|semaphore|concurrency|pointer|big o)\b/i, w: 3 },
      { re: /\b(python|java\b|javascript|typescript|c\+\+|c#|golang|\brust\b|kotlin|swift|sql\b|nosql|html|css|code|coding|program(ming)?|function|variable|loop|for ?loop|while ?loop|array|object|class|method|api\b|database|query|string|integer|boolean|compile|debug|runtime|stack overflow|binary)\b/i, w: 1 },
    ],
  },
  {
    subject: 'Electrical',
    patterns: [
      { re: /\b(circuit|resistor|capacitor|inductor|voltage|current|ohm'?s? law|ohm|kirchhoff|kvl|kcl|impedance|reactance|transistor|diode|op-?amp|operational amplifier|thevenin|norton|rms\b|node[- ]?voltage|mesh (analysis|current)|series and parallel|rc circuit|rl circuit|rlc|logic gate|boolean logic|truth table|flip-?flop|mosfet|bjt\b|amplifier|rectifier|capacitance|inductance|emf\b)\b/i, w: 3 },
      { re: /\b(electrical|electronics|ampere|amps?\b|watt|signal|frequency|waveform)\b/i, w: 1 },
    ],
  },
  {
    subject: 'Chemistry',
    patterns: [
      { re: /\b(mole|molar(ity| mass)?|stoichiometr|chemical (reaction|equation)|balance the (equation|reaction)|equilibrium constant|\bke?q\b|\bph\b|\bpoh\b|acid|base|alkal|titration|buffer|enthalp|entrop|gibbs|oxidation|reduction|redox|half[- ]reaction|electron configuration|periodic (table|trend)|ideal gas law|avogadro|concentration|molecule|molecular|compound|reagent|reactant|product|catalyst|valence|covalent|ionic bond|electronegativ|lewis structure|functional group|organic chemistr|isomer|hybridi[sz]ation|empirical formula)\b/i, w: 3 },
      { re: /\b(h2o|co2|nacl|hcl|naoh|nh3|h2so4|ch4|\\ce|solution|solute|solvent|salt|gas\b)\b/i, w: 2 },
    ],
  },
  {
    subject: 'Biology',
    patterns: [
      { re: /\b(cell|cellular|dna|rna|mrna|trna|protein|amino acid|enzyme|substrate|mitosis|meiosis|photosynthesis|cellular respiration|glycolysis|krebs|gene|genetic|allele|genotype|phenotype|chromosome|organism|ecosystem|species|membrane|osmosis|diffusion|atp\b|punnett|heredity|inherit|dominant|recessive|evolution|natural selection|neuron|synapse|hormone|homeostasis|bacteria|virus|antibody|immune|tissue|organ|nucleus|ribosome|mitochondri|chloroplast)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Civil',
    patterns: [
      { re: /\b(truss|beam|bending moment|shear force|shear[- ]and[- ]moment|simply supported|reinforced concrete|structural (analysis|engineer)|foundation|soil mechanic|geotechnical|load[- ]bearing|cantilever|deflection|support reaction|pin support|roller support|distributed load|point load|column buckling|retaining wall)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Chemical',
    patterns: [
      { re: /\b(mass balance|energy balance|material balance|distillation|reactor design|cstr|pfr\b|reflux|process flow|flowsheet|heat exchanger|fugacity|raoult'?s? law|mass transfer|unit operation|control volume|reflux ratio|vapor[- ]liquid equilibrium|vle\b|absorption column|chemical engineering)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Mechanical',
    patterns: [
      { re: /\b(torque|moment of inertia|\bgear\b|gearbox|\bshaft\b|bending stress|shear stress|stress and strain|young'?s modulus|thermodynamic cycle|carnot|otto cycle|heat engine|refrigerat|fluid mechanics|bernoulli|reynolds|viscosity|factor of safety|linkage|cam\b|crank|piston|pulley system|mechanical advantage|vibration|natural frequency)\b/i, w: 3 },
    ],
  },
  {
    subject: 'Physics',
    patterns: [
      { re: /\b(free[- ]body|projectile|kinematics?|newton'?s (first|second|third)? ?law|electric field|magnetic field|coulomb|gauss'?s? law|momentum|impulse|kinetic energy|potential energy|conservation of energy|refraction|reflection|snell'?s? law|lens|mirror|diffraction|interference|relativity|quantum|photon|wavelength|frequency|terminal velocity|incline(d plane)?|tension|normal force|centripetal|angular velocity|simple harmonic|pendulum)\b/i, w: 3 },
      { re: /\b(force|velocity|acceleration|energy|work|power|gravity|gravitational|mass\b|wave|optics?|joule|newton|friction|displacement|speed|distance|motion)\b/i, w: 1 },
    ],
  },
  {
    subject: 'Math',
    patterns: [
      { re: /\b(integral|integrate|integration|derivative|differentiate|differential|\blimit\b|matrix|matrices|determinant|eigen(value|vector)|vector space|linear algebra|probability|combinator|permutation|factorial|series|sequence|summation|theorem|proof|prove that|polynomial|quadratic|trigonometr|\bsine\b|cosine|tangent|logarithm|exponential|inequality|system of equations|complex number|set theory|modular arithmetic|geometry|triangle|circle|angle)\b/i, w: 3 },
      { re: /\b(equation|solve for|factor|simplify|calculate|evaluate|function|graph|slope|x\b|y\b)\b/i, w: 1 },
    ],
  },
];

/**
 * Priority used to break exact score ties (earlier = wins). Ordered most-
 * specific → most-generic so an engineering signature beats generic Physics/
 * Math when both fire on the same score.
 */
const PRIORITY: Subject[] = [
  'Chemical',
  'Civil',
  'Electrical',
  'Mechanical',
  'CS',
  'Chemistry',
  'Biology',
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
      const matches = text.match(
        new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'),
      );
      if (matches) score += w * matches.length;
    }
    if (score > 0) scores.set(rule.subject, score);
  }

  if (scores.size === 0) return 'General';

  let best: Subject = 'General';
  let bestScore = 0;
  for (const subject of PRIORITY) {
    const s = scores.get(subject) ?? 0;
    // Strictly greater so PRIORITY only breaks exact ties.
    if (s > bestScore) {
      bestScore = s;
      best = subject;
    }
  }

  // Auto should find the closest match: any genuine signal routes to a subject;
  // we only fall back to General when nothing matched at all.
  return bestScore >= 1 ? best : 'General';
}
