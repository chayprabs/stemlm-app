/**
 * Answers that put the study panel into the states the everyday demos never reach: many steps,
 * a long multi-part question, tall / wide / tiny figures, a second question, a follow-up answer and
 * an answer the parser must refuse. Format fixtures for screenshots only; nothing here ships.
 */

const meta = ({ subject, topic, question, qid = 'q1', mode = 'full' }) => `@meta
version: 2
subject: ${subject}
topic: ${topic}
${question ? `question: ${question}\n` : ''}qid: ${qid}
archetype: numeric
level: intro
locale: SI,decimal=.,circuit=IEEE
mode: ${mode}
@endmeta`;

const QUADRATIC_STEPS = [
  ['Start from the general quadratic', String.raw`ax^2 + bx + c = 0`, String.raw`Assume $a \neq 0$, otherwise the equation is linear.`],
  ['Divide through by the leading coefficient', String.raw`x^2 + \frac{b}{a}x + \frac{c}{a} = 0`, String.raw`Every term is divided by $a$ so the square has coefficient 1.`],
  ['Move the constant to the right', String.raw`x^2 + \frac{b}{a}x = -\frac{c}{a}`, 'Only the terms in $x$ stay on the left.'],
  ['Find the number that completes the square', String.raw`\left(\frac{b}{2a}\right)^2 = \frac{b^2}{4a^2}`, 'Half the coefficient of $x$, squared.'],
  ['Add it to both sides', String.raw`x^2 + \frac{b}{a}x + \frac{b^2}{4a^2} = \frac{b^2}{4a^2} - \frac{c}{a}`, 'Adding the same quantity to both sides keeps the equation balanced.'],
  ['Write the left side as a perfect square', String.raw`\left(x + \frac{b}{2a}\right)^2 = \frac{b^2}{4a^2} - \frac{c}{a}`, 'The left side now factors exactly.'],
  ['Put the right side over a common denominator', String.raw`\left(x + \frac{b}{2a}\right)^2 = \frac{b^2 - 4ac}{4a^2}`, String.raw`Multiply $\frac{c}{a}$ by $\frac{4a}{4a}$.`],
  ['Name the discriminant', String.raw`\Delta = b^2 - 4ac`, String.raw`Its sign decides how many real roots there are.`],
  ['Take the square root of both sides', String.raw`x + \frac{b}{2a} = \pm\frac{\sqrt{\Delta}}{2a}`, String.raw`Both signs are kept: a square has two roots.`],
  ['Isolate the unknown', String.raw`x = -\frac{b}{2a} \pm \frac{\sqrt{\Delta}}{2a}`, String.raw`Subtract $\frac{b}{2a}$ from both sides.`],
  ['Combine into one fraction', String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`, 'The two terms share the denominator $2a$.'],
  ['Read the three cases off the discriminant', '', String.raw`$\Delta > 0$ gives two real roots, $\Delta = 0$ one repeated root, and $\Delta < 0$ a complex-conjugate pair.`],
  ['Check with the sum and product of the roots', String.raw`x_1 + x_2 = -\frac{b}{a}, \qquad x_1 x_2 = \frac{c}{a}`, 'Adding and multiplying the two roots reproduces the coefficients, as Vieta requires.'],
  ['Test the formula on a known equation', String.raw`x^2 - 5x + 6 = 0 \;\Rightarrow\; x = \frac{5 \pm 1}{2}`, 'The roots are $3$ and $2$, and $(x-3)(x-2)$ expands to the original.'],
];

/** Fourteen steps: the strip must scroll in a narrow panel and keep the current mark in view. */
export const FOURTEEN_STEPS = [
  meta({
    subject: 'Math',
    topic: 'Deriving the quadratic formula',
    question: 'Derive the quadratic formula by completing the square, and show how the discriminant decides the number of real roots.',
  }),
  ...QUADRATIC_STEPS.map(([title, formula, body], i) => [
    `@step id=s${i + 1}`,
    `title: ${title}`,
    ...(formula ? [`@formula id=e${i + 1}`, `$$${formula}$$`, '@endformula'] : []),
    '@body',
    body,
    '@endbody',
    '@endstep',
  ].join('\n')),
  '@solution',
  String.raw`Completing the square gives $x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}$, with the sign of $b^2 - 4ac$ fixing the number of real roots.`,
  '@endsolution',
  '@end',
].join('\n');

/** A question long enough to be clamped, with parts and inline math. */
export const LONG_QUESTION = [
  meta({
    subject: 'Physics',
    topic: 'Projectile launched from a cliff',
    question: String.raw`A ball is thrown from the edge of a 45 m cliff with an initial speed of 20 m/s at 30° above the horizontal. Neglect air resistance and take $g = 9.81\ \text{m/s}^2$. (a) How long is the ball in the air? (b) How far from the base of the cliff does it land? (c) What is its speed just before impact, and at what angle below the horizontal is it moving? (d) What is the maximum height above the ground that it reaches, and at what time? (e) If the launch angle were changed to 45° with the same speed, would the ball land closer to or farther from the cliff, and by how much?`,
  }),
  '@step id=s1',
  'title: Resolve the launch velocity',
  '@formula id=e1',
  String.raw`$$v_{0x} = v_0\cos\theta, \qquad v_{0y} = v_0\sin\theta$$`,
  '@endformula',
  '@body',
  String.raw`With $v_0 = 20\ \text{m/s}$ and $\theta = 30^\circ$: $v_{0x} = 17.3\ \text{m/s}$ and $v_{0y} = 10.0\ \text{m/s}$.`,
  '@endbody',
  '@endstep',
  '@step id=s2',
  'title: Solve the vertical motion for the flight time',
  '@formula id=e2',
  String.raw`$$y = h + v_{0y}t - \tfrac12 g t^2 = 0$$`,
  '@endformula',
  '@body',
  String.raw`$4.905t^2 - 10.0t - 45 = 0$ gives $t = 4.21\ \text{s}$ (the negative root is rejected).`,
  '@endbody',
  '@endstep',
  '@solution',
  String.raw`The ball is in the air for $4.21\ \text{s}$ and lands $72.9\ \text{m}$ from the base of the cliff.`,
  '@endsolution',
  '@end',
].join('\n');

/** One figure of each awkward shape: tall, wide, wider still, and very small. */
export const FIGURE_SHAPES = [
  meta({
    subject: 'CS',
    topic: 'Figure shapes',
    question: 'Show the stages of a compiler, a clocked register and a two-node graph.',
  }),
  '@step id=s1',
  'title: A tall figure: the compiler pipeline',
  '@body',
  'Each stage hands its result to the next.',
  '@endbody',
  '@diagram id=f1 type=graph',
  'node: A Read input',
  'node: B Parse tokens',
  'node: C Build tree',
  'node: D Check types',
  'node: E Emit code',
  'node: F Link',
  'edge: A B',
  'edge: B C',
  'edge: C D',
  'edge: D E',
  'edge: E F',
  'rankdir: TB',
  '@enddiagram',
  '@endstep',
  '@step id=s2',
  'title: A wide figure: the same pipeline left to right',
  '@body',
  'Read left to right.',
  '@endbody',
  '@diagram id=f2 type=graph',
  'node: A Read',
  'node: B Parse',
  'node: C Build',
  'node: D Check',
  'node: E Optimise',
  'node: F Emit',
  'node: G Link',
  'edge: A B',
  'edge: B C',
  'edge: C D',
  'edge: D E',
  'edge: E F',
  'edge: F G',
  'rankdir: LR',
  '@enddiagram',
  '@endstep',
  '@step id=s3',
  'title: A timing diagram',
  '@body',
  'The output follows the input one clock edge later.',
  '@endbody',
  '@diagram id=f3 type=timing',
  'signal: clk 0101010101010101',
  'signal: d 0011001100001111',
  'signal: q 0001100110000111',
  'caption: D flip-flop: q follows d on the rising edge',
  '@enddiagram',
  '@endstep',
  '@step id=s4',
  'title: A tiny figure: one edge',
  '@body',
  'Two nodes joined by an edge of weight 1.',
  '@endbody',
  '@diagram id=f4 type=graph',
  'node: A A',
  'node: B B',
  'edge: A B 1',
  'rankdir: LR',
  '@enddiagram',
  '@endstep',
  '@solution',
  'Figures of every shape sit in the same plate.',
  '@endsolution',
  '@end',
].join('\n');

/** The answer to an Ask-in-chat question about step 2 of the incline problem. */
export const FOLLOWUP_ANSWER = [
  meta({ subject: 'Physics', topic: 'Why friction depends on the normal force', mode: 'resolve' }),
  '@step id=r1',
  'title: Friction is set by how hard the surfaces press together',
  '@formula id=e1',
  String.raw`$$f_k = \mu_k N$$`,
  '@endformula',
  '@body',
  String.raw`Kinetic friction comes from the contact between the two surfaces. The harder they are pressed together, the larger it is, and the force pressing them together is the normal force $N$, not the weight.`,
  '',
  String.raw`On the incline only part of the weight presses into the surface: $N = mg\cos\theta = 42.5\ \text{N}$, less than the full weight of $49.1\ \text{N}$.`,
  '@endbody',
  '@takeaway',
  String.raw`Use $N$, not $mg$, whenever the surface is tilted or another force has a perpendicular component.`,
  '@endtakeaway',
  '@endstep',
  '@solution',
  String.raw`Friction depends on $N$ because $N$ measures the contact; the weight matters only through the part of it that presses into the surface.`,
  '@endsolution',
  '@end',
].join('\n');

/** Declares an answer but never delivers a step: the parser refuses it and the panel explains. */
export const UNREADABLE_ANSWER = [
  meta({ subject: 'Physics', topic: 'Block sliding down a rough incline' }),
  '@step id=s1',
  'title: Draw the forces on the block',
  '@body',
].join('\n');

/** Re-key a fixture so it loads as a separate question beside another one. */
export const asQuestion = (capsule, qid) => capsule.replace(/^qid: .*$/m, `qid: ${qid}`);
