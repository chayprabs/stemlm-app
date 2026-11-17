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

/**
 * Stored records a library has to survive: an answer structured from a plain chat reply (its
 * topic is its question), code and display math in the question, one unbroken 300-character
 * token, a record with neither question nor topic, no steps, an impossible saved time, a chat
 * this build does not know, and two entries that are not records at all (dropped on read).
 */
export function savedEdgeCases(now = Date.now()) {
  const row = (id, fields) => ({
    id,
    question: '',
    savedAt: now - HOUR,
    platform: 'chatgpt',
    meta: { version: 2, subject: 'Physics', topic: '', qid: 'q1' },
    steps: [{ id: 's1', index: 1, title: 'Step 1', body: 'Seeded for the visual harness.' }],
    solution: 'Seeded for the visual harness.',
    solutionDiagrams: [],
    ...fields,
  });
  return [
    row('edge-ingest', {
      question: 'A ball is thrown at 20 m/s at 30° above the horizontal. How far away does it land? Use g = 9.8 m/s².',
      meta: { version: 2, subject: 'Physics', topic: 'A ball is thrown at 20 m/s at 30° above the horizontal', question: 'A ball is thrown at 20 m/s at 30° above the horizontal. How far away does it land? Use g = 9.8 m/s².' },
      origin: 'ingest',
      platform: 'claude',
      savedAt: now - 20 * 60_000,
      steps: [
        { id: 's1', index: 1, title: 'Resolve the initial velocity', body: String.raw`The horizontal part is $v_x = v_0\cos\theta = 17.3\ \text{m/s}$ and the vertical part is $v_y = v_0\sin\theta = 10.0\ \text{m/s}$.` },
        { id: 's2', index: 2, title: 'Find the time of flight', body: String.raw`The ball returns to launch height when $t = 2v_y/g = 2.04\ \text{s}$.` },
        { id: 's3', index: 3, title: 'Multiply the horizontal speed by that time', body: String.raw`$R = v_x t = 35.3\ \text{m}$.` },
      ],
      solution: String.raw`The ball lands about $35.3\ \text{m}$ from where it was thrown.`,
    }),
    row('edge-code', {
      question: 'Why does `for (let i = 0; i <= n; i++)` read past the end of `a[n]`, and how should the loop bound be written so that `sum += a[i]` stays inside the array?',
      meta: { version: 2, subject: 'CS', topic: 'Off-by-one loop bound', qid: 'q1' },
      platform: 'grok',
      savedAt: now - 3 * HOUR,
    }),
    row('edge-display-math', {
      question: String.raw`Show that $$\sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6}$$ by induction, and state where the inductive hypothesis is used.`,
      meta: { version: 2, subject: 'Math', topic: 'Sum of squares by induction', qid: 'q1' },
      platform: 'gemini',
      savedAt: now - 2 * DAY,
    }),
    row('edge-token', {
      question: `Simplify ${'x'.repeat(300)} and then explain the result.`,
      meta: { version: 2, subject: 'Math', topic: 'One very long token', qid: 'q1' },
      savedAt: now - 9 * DAY,
    }),
    row('edge-untitled', { steps: [], savedAt: now - 30 * DAY, meta: { version: 2, subject: '', topic: '' } }),
    row('edge-time', {
      question: 'A record whose saved time is not a time at all.',
      savedAt: 1e300,
      platform: 'bing',
      meta: { version: 2, subject: 'Chemistry', topic: 'Damaged record', qid: 'q1' },
    }),
    'not a record',
    { id: 7, question: 'Wrong types throughout', meta: null },
  ];
}

/** One answer long enough to take several pages and several seconds to export. */
export function savedLongAnswer(now = Date.now()) {
  const body = 'Apply the relation to the quantities given, keeping units on every line so that an error shows up as a mismatch. '
    + String.raw`Substituting the values gives $F = ma = (5.0\ \text{kg})(3.2\ \text{m/s}^2) = 16\ \text{N}$, which is then carried forward. `;
  return {
    id: 'seed-long',
    question: 'Work through the full derivation of the motion of a block on a rough incline, with every intermediate quantity stated.',
    savedAt: now - 5 * 60_000,
    platform: 'chatgpt',
    meta: { version: 2, subject: 'Physics', topic: 'Block on a rough incline, in full', qid: 'q1' },
    steps: Array.from({ length: 36 }, (_, n) => ({
      id: `s${n + 1}`,
      index: n + 1,
      title: `Carry the result into stage ${n + 1}`,
      body: body.repeat(4),
    })),
    solution: String.raw`The block accelerates at $3.2\ \text{m/s}^2$.`,
    solutionDiagrams: [],
  };
}
