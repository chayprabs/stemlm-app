/**
 * Saved answers for the visual harness, in the stored snapshot format
 * (src/lib/saved-session-storage.ts). Format fixtures for screenshots; not shipped.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** [subject, topic, question, platform, steps, age in ms] */
const BASE = [
  ['Physics', 'Block sliding down a rough incline',
    'A 5.0 kg block is released from rest on a 30° incline. The coefficient of kinetic friction is 0.20. Find the block\'s acceleration and its speed after it has slid 2.0 m.',
    'chatgpt', 5, 2 * HOUR],
  ['Math', 'Integration by parts',
    'Evaluate $\\int_0^{\\pi} x \\sin x \\, dx$ and explain which factor to differentiate.',
    'claude', 4, 9 * HOUR],
  ['Chemistry', 'Buffer pH after adding strong acid',
    'A buffer contains 0.25 mol of acetic acid and 0.30 mol of sodium acetate in 1.0 L. What is the pH after adding 0.050 mol of HCl? Take $K_a = 1.8 \\times 10^{-5}$.',
    'gemini', 6, 1 * DAY + 3 * HOUR],
  ['CS', 'Dijkstra on a weighted graph',
    'Run Dijkstra\'s algorithm from vertex A on the graph with edges AB 4, AC 2, BC 5, BD 10, CE 3, ED 4, DF 11 and give the shortest path to F.',
    'grok', 7, 2 * DAY],
  ['Electrical', 'Thevenin equivalent',
    'Find the Thevenin equivalent seen by the 6 Ω load in a circuit with a 12 V source, a 4 Ω series resistor and a 12 Ω shunt resistor.',
    'chatgpt', 4, 5 * DAY],
  ['Physics', 'Projectile range on level ground',
    'A ball is kicked at 22 m/s at 35° above the horizontal. How far does it travel before landing, and how long is it in the air?',
    'claude', 5, 12 * DAY],
  ['Math', 'Eigenvalues of a symmetric matrix',
    'Find the eigenvalues and an orthonormal set of eigenvectors of $A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}$.',
    'gemini', 3, 40 * DAY],
];

const LONG = ['Mechanical', 'Simply supported beam with two point loads',
  'A simply supported steel beam of span 6.0 m carries a point load of 12 kN at 2.0 m from the left support and a second point load of 8 kN at 4.5 m from the left support, together with its own weight of 1.5 kN/m along the whole span. Draw the shear force and bending moment diagrams, find the position and magnitude of the maximum bending moment, and check whether a section with $Z = 180 \\times 10^{3}\\ \\text{mm}^3$ keeps the bending stress below 165 MPa. State every assumption you make about the supports and the load path, and give the reactions to three significant figures.',
  'chatgpt', 8, 3 * DAY];

const EXTRA_SUBJECTS = ['Biology', 'Civil', 'Chemical', 'General'];
const PLATFORMS = ['chatgpt', 'claude', 'gemini', 'grok'];

function snapshot([subject, topic, question, platform, steps, age], i, now) {
  return {
    id: `seed-${i}`,
    question,
    savedAt: now - age,
    platform,
    meta: { version: 2, subject, topic, qid: 'q1' },
    steps: Array.from({ length: steps }, (_, n) => ({
      id: `s${n + 1}`,
      index: n + 1,
      title: `Step ${n + 1}`,
      body: 'Seeded for the visual harness.',
    })),
    solution: 'Seeded for the visual harness.',
    solutionDiagrams: [],
  };
}

/** `count` snapshots, newest first; index 2 is always the very long question when count > 2. */
export function savedSeed(count, now = Date.now()) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    if (i === 2) {
      rows.push(snapshot(LONG, i, now));
      continue;
    }
    const base = BASE[i % BASE.length];
    if (i < BASE.length) {
      rows.push(snapshot(base, i, now));
      continue;
    }
    // Past the hand-written set: vary subject, host and age so filters and counts have something to show.
    const round = Math.floor(i / BASE.length);
    const subject = i % 5 === 0 ? EXTRA_SUBJECTS[round % EXTRA_SUBJECTS.length] : base[0];
    rows.push(snapshot(
      [subject, `${base[1]} (variation ${round})`, `${base[2]} Variation ${round}.`, PLATFORMS[(i + round) % PLATFORMS.length], base[4], base[5] + round * 2 * DAY + i * HOUR],
      i,
      now,
    ));
  }
  return rows;
}
