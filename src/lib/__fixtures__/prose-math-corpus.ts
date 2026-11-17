/**
 * Adversarial corpus for `prepareMathForRender`: text a student or a model writes, with every
 * span tagged as prose (must reach Markdown exactly as written) or math (must reach KaTeX as
 * the given TeX). The prose cases are the ones that matter most: typesetting a graph edge, a
 * range or a hyphenated word as italic math corrupts the student's own question.
 */

export type CorpusSpan =
  /** `prepared` is the Markdown-level spelling when it differs, e.g. a literal `$` is escaped. */
  | { kind: 'prose'; text: string; prepared?: string }
  /** `source` is what was written; `tex` is what KaTeX must receive. */
  | { kind: 'math'; source: string; tex: string; prepared?: string };

export interface CorpusCase {
  group: string;
  spans: CorpusSpan[];
}

type Part = string | CorpusSpan;

/** A math span whose TeX is its source unless stated. */
export function m(source: string, tex = source, prepared?: string): CorpusSpan {
  return { kind: 'math', source, tex, prepared };
}

/** Math the author already delimited: `$x^2$`, `\(x^2\)`. */
function delimited(source: string, tex: string, prepared = `$${tex}$`): CorpusSpan {
  return { kind: 'math', source, tex, prepared };
}

/** Prose whose prepared spelling differs from the source (an escaped currency dollar). */
function p(text: string, prepared: string): CorpusSpan {
  return { kind: 'prose', text, prepared };
}

function entry(group: string, ...parts: Part[]): CorpusCase {
  return { group, spans: parts.map((part) => (typeof part === 'string' ? { kind: 'prose', text: part } : part)) };
}

export function corpusInput(c: CorpusCase): string {
  return c.spans.map((span) => (span.kind === 'prose' ? span.text : span.source)).join('');
}

export function corpusExpected(c: CorpusCase): string {
  return c.spans
    .map((span) => (span.kind === 'prose' ? span.prepared ?? span.text : span.prepared ?? `$${span.tex}$`))
    .join('');
}

export function isProseOnly(c: CorpusCase): boolean {
  return c.spans.every((span) => span.kind === 'prose');
}

export const PROSE_MATH_CORPUS: CorpusCase[] = [
  // Graph edges, paths and weights: the reported bug.
  entry('graph', "Run Dijkstra's algorithm from A on the graph with edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3. What is the shortest distance to E?"),
  entry('graph', 'Why is B settled after C even though the edge A-B exists?'),
  entry('graph', 'Add the edge A-B and remove B-C.'),
  entry('graph', 'The path A-B-C-D has length 9.'),
  entry('graph', 'The path A->B->C has cost 7.'),
  entry('graph', 'The path A → B → C is shortest, and B ← C reverses.'),
  entry('graph', 'Edge u-v has weight 3, and the s-t cut has capacity 12.'),
  entry('graph', 'Weights: A-B = 4, A-C = 2, C-B = 1.'),
  entry('graph', 'Weights: A-B=4, A-C=2.'),
  entry('graph', 'A–B is an edge and u–v is another.'),
  entry('graph', 'Edges: (A, B), (B, C), (C, D).'),
  entry('graph', 'After the first pass dist[B] = 3 and dist[C] = 2.'),
  entry('graph', 'Relax when d[v] > d[u] + w(u, v).'),
  entry('graph', 'Relax edge (u, v) when d[u] + w(u, v) < d[v].'),
  entry('graph', 'Vertex A has neighbours B and C; settle C, then B, then D.'),
  entry('graph', 'Relax edge B→D: ', m('3 + 5 = 8'), '.'),

  // Hyphenated terms.
  entry('hyphen', 'The T-cell count is low and the B-cell count is normal.'),
  entry('hyphen', 'Plot time on the x-axis and speed on the y-axis.'),
  entry('hyphen', 'The x-intercept is 3 and the y-intercept is -2.'),
  entry('hyphen', 'A p-value below 0.05 rejects the null in a t-test.'),
  entry('hyphen', 'An n-type semiconductor and a p-n junction.'),
  entry('hyphen', 'The C-H bond and the C=O bond absorb in the infrared.'),
  entry('hyphen', 'The N≡N triple bond and the C=C double bond.'),
  entry('hyphen', 'An R-L-C circuit has an I-V curve and a B-H loop.'),
  entry('hyphen', 'Use k-means or the n-queens solver.'),
  entry('hyphen', 'beta-carotene and pH-dependent Na-K pump activity.'),
  entry('hyphen', 'A 3-phase, 2-input, 32-bit design in UTF-8.'),
  entry('hyphen', '2-methylpropane, cis-2-butene and 1,2-dichloroethane.'),
  entry('hyphen', '(R)-2-butanol and (S)-2-butanol are enantiomers.'),
  entry('hyphen', 'X-ray diffraction of an L-shaped I-beam.'),
  entry('hyphen', 'Model X-100 replaced the B-52.'),
  entry('hyphen', 'Use k-means with ', m('k = 3'), '.'),
  entry('hyphen', 'A ', m('T_1'), '-weighted scan.'),

  // Ranges, dates, versions, signed numbers.
  entry('range', 'See pages 3-5 and chapters 2-4.'),
  entry('range', 'Repeat 2-3 times for 10–20 N of force.'),
  entry('range', 'Ages 18-25 scored 3-2.'),
  entry('range', 'The interval 0-100 °C.'),
  entry('range', 'On 2024-01-15 at 10:30, version 2.0.1 shipped.'),
  entry('range', 'Call 555-123-4567 or see ISBN 978-3-16-148410-0.'),
  entry('range', 'On 3/4/2024 we met.'),
  entry('range', 'Support is available 24/7 with a 50/50 split.'),
  entry('range', 'The ratio is 3:2 and the score was 10/10.'),
  entry('range', 'The ratio x:y = 2:3 holds.'),
  entry('range', 'The temperature is -5 °C and the charge is -3 μC.'),
  entry('range', 'It dropped to -2 and then rose by +4.'),
  entry('range', 'A 4K display, a 3D model and a 10x speedup.'),
  entry('range', 'That is ', m('3/4'), ' of the incident intensity.'),

  // Slashes.
  entry('slash', 'and/or, either/or, input/output'),
  entry('slash', 'I/O bound, N/A, w/o, y/n, TCP/IP'),
  entry('slash', 'The ratio a/b is written with a slash.'),
  entry('slash', 'Compute a/b and x/2.'),
  entry('slash', 'The speed is 3 m/s, about 11 km/h.'),
  entry('slash', 'See src/lib/util.ts and https://example.com/a_b/c-d?x=1 for details.'),

  // Plain-ASCII words that only look like symbols.
  entry('ascii', 'The coefficient mu_k is 0.3 and the angle theta is 30 degrees.'),
  entry('ascii', 'The force is m g sin(theta) down the slope.'),
  entry('ascii', 'a = g sin(theta) - mu_k g cos(theta)'),
  entry('ascii', 'Use omega_n and theta_1, then max_i and log_2.'),
  entry('ascii', 'mu_k = 0.3'),
  entry('ascii', 'theta = 30 degrees and omega = 2 rad/s'),
  entry('ascii', 'v = u + at'),
  entry('ascii', 'F = ma and y = mx + b'),
  entry('ascii', 'speed = d/t = 5'),
  entry('ascii', 'P(heads) = 0.5 and P(A and B) = 0.2'),
  entry('ascii', 'The value (approximately) is fine.'),
  entry('ascii', 'It is (dimensionless), a ratio of (length/length).'),
  entry('ascii', 'It runs in O(n log n) time.'),
  entry('ascii', 'With n = 3 a triangle forms.'),
  entry('ascii', 'R_Y_ = 9/16'),
  entry('ascii', m('x_1 = 5'), ' if ', m('y_1 = 0')),

  // Code-like text outside backticks, and literal code.
  entry('code', 'Access arr[i-1] and arr[i+1], then return n-1.'),
  entry('code', 'Loop from 0 to n-1 with index i+1.'),
  entry('code', 'C++ and C# use x++ and y--.'),
  entry('code', 'a && b || c, and if (a == b) return;'),
  entry('code', 'The pointer p->next is null.'),
  entry('code', 'snake_case_name, max_value and x_1_2 are identifiers.'),
  entry('code', 'p.x = 5 in the struct.'),
  entry('code', 'Use `x_1 = 2` and `A-B` in code.'),
  entry('code', '```\nlet x_1 = $2;\na-b\n```'),
  entry('code', 'It is ', m('O(n^2)'), ' in the worst case and ', m('O(1)'), ' at best.'),
  entry('code', 'The recurrence ', m('T(n) = 2T(n/2) + n'), ' holds.'),
  entry('code', 'The function ', m('f(n) = f(n-1) + f(n-2)'), '.'),

  // Chemistry written as text.
  entry('chem', 'H2O is water, CO2 is a gas and C6H12O6 is glucose.'),
  entry('chem', 'The SN2 and E2 mechanisms; Fe2+ and Fe3+ ions; Na+ and Cl- ions.'),
  entry('chem', 'C(s) + O2(g) -> CO2(g)'),
  entry('chem', 'Zn(s) + 2HCl(aq) -> ZnCl2(aq) + H2(g)'),
  entry('chem', 'The pKa is 4.76 at pH 7.4 in a 0.1 M solution.'),
  entry('chem', 'The molecule ', m('\\ce{H2O}'), ' is water.'),

  // Units.
  entry('unit', 'A force of 5 N on a 2 kg mass for 5 s.'),
  entry('unit', 'A 5 V supply and a 10 Ω resistor at 25 °C and 1 atm.'),
  entry('unit', 'The torque is 2·5 N·m and the area is 3 × 4 m².'),
  entry('unit', 'The speed is ', m('9.8 m/s^2', '9.8\\,\\mathrm{m/s^2}'), '.'),
  entry('unit', 'rate ', m('4 s^-1', '4\\,\\mathrm{s^{-1}}')),
  entry('unit', 'area ', m('5 m^2', '5\\,\\mathrm{m^2}')),
  entry('unit', 'Assume ', m('g = 9.81 m/s^2', 'g = 9.81\\,\\mathrm{m/s^2}'), ' and ', m('v = 3 m/s', 'v = 3\\,\\mathrm{m/s}'), '.'),
  entry('unit', 'Set ', m('T=300 K', 'T=300\\,\\mathrm{K}'), ' and ', m('T_c = 273 K', 'T_c = 273\\,\\mathrm{K}'), '.'),
  entry('unit', 'Use ', m('5 kg·m/s^2', '5\\,\\mathrm{kg·m/s^2}'), ' of force.'),

  // Enumerations and labels.
  entry('enum', '(a) Find the velocity. (b) Find the acceleration.'),
  entry('enum', 'Part (a) asks for x; see Fig. 2(a) and Table 3(b).'),
  entry('enum', 'Options: (i) yes (ii) no; then (1) and (2).'),
  entry('enum', 'a) first b) second 1) third'),
  entry('enum', '(a) ', m('x^2 + 3x = 0'), ' (b) ', m('2x - 1 = 5')),

  // Currency and percentages.
  entry('money', 'It costs ', p('$', '\\$'), '5 and ', p('$', '\\$'), '10.'),
  entry('money', 'Cost is ', p('$', '\\$'), '5 today.'),
  entry('money', 'The yield rose 5% (63.2% of the final value).'),

  // Markdown that must survive.
  entry('markdown', '**bold** and *italic* with a [link](https://example.com/x_y).'),
  entry('markdown', '- item A-B\n- item C-D'),
  entry('markdown', '| edge | weight |\n| --- | --- |\n| A-B | 4 |'),
  entry('markdown', '> quoted A-B edge'),
  entry('markdown', '# Heading about A-B'),
  entry('markdown', '**', m('x = 5'), '** is bold math.'),

  // Math the author delimited, in every delimiter style.
  entry('delimited', 'Use ', delimited('$x^2$', 'x^2'), ' inline.'),
  entry('delimited', 'Use ', delimited('\\(x^2\\)', 'x^2'), ' and ', delimited('\\[E = mc^2\\]', 'E = mc^2', '$$E = mc^2$$')),
  entry('delimited', 'The path difference is\n', delimited('$$\\Delta L=(n_2-n_1)d$$', '\\Delta L=(n_2-n_1)d', '$$\n\\Delta L=(n_2-n_1)d\n$$'), '\nand it is dimensionless.'),
  entry('delimited', 'Because ', delimited('$n_2>n_1$', 'n_2>n_1'), ', light bends toward the normal.'),
  entry('delimited', delimited('$\\angle ABC = 90^{\\circ}$', '\\angle ABC = 90^{\\circ}')),
  entry('delimited', 'The edge A-B has weight ', delimited('$w = 4$', 'w = 4'), '.'),

  // Bare math that must still be promoted.
  entry('bare', 'Solve ', m('x^2 - 5x + 6 = 0')),
  entry('bare', m('x=2'), ' substitutes into the relation and recovers ', m('y=4'), '.'),
  entry('bare', 'where ', m('Z_C = \\frac{1}{j\\omega C}'), ' in series'),
  entry('bare', 'Compare ', m('n_1'), ' with ', m('n_2^2'), ' across the interface.'),
  entry('bare', 'The variable ', m('x_i'), ' and ', m('V_out', 'V_{out}'), ' are used; snake_case_name too.'),
  entry('bare', m('A_0'), ' is the initial level and ', m('A(t)'), ' is the level at time t.'),
  entry('bare', 'Limit check: ', m('μ_k → 0'), ' gives the frictionless result.'),
  entry('bare', 'Ka = ', m('1.8 x 10^-5', '1.8 \\times 10^{-5}'), '. Using an ICE table'),
  entry('bare', 'Three vectors ', m('\\vec{P}'), ', ', m('\\vec{Q}'), ' and ', m('\\vec{R}'), ' are shown.'),
  entry('bare', 'Activity is scaled by ', m('\\left(\\frac{1}{2}\\right)^{n}'), ' after n half-lives.'),
  entry('bare', m('x ≈ 173°'), ' (below 180°)'),
  entry('bare', 'The roots are ', m('sqrt(x+1)', '\\sqrt{x+1}'), ' and ', m('∛z', '\\sqrt[3]{z}'), '.'),
  entry('bare', 'If ', m('n > 0'), ' then let ', m('f(x) = x^2 + 1'), '.'),
  entry('bare', 'Since ', m('p + q = 1'), ', the sum is fixed.'),
  entry('bare', 'Step 2: ', m('2x + 3 = 7'), ' so ', m('x = 2'), '.'),
  entry('bare', m('x = -5'), ' and ', m('5 + 3 = 8'), ' and ', m('2^10 = 1024', '2^{10} = 1024')),
  entry('bare', 'Use ', m('a*b*c'), ' as the volume.'),
  entry('bare', m('G(s) = 1/(s+1)'), ' is the transfer function G(s).'),

  // Other languages and stray dollars.
  entry('language', 'Si ', m('x = 5'), ' y ', m('z = 3'), ', calcula x + z.'),
  entry('language', 'La réponse est A-B, pas C-D.'),
  entry('language', 'Die Kante A-B hat das Gewicht 4.'),
  entry('language', 'El ángulo theta es 30 grados y mu_k vale 0,3.'),
  entry('language', '设 ', m('x = 5'), '，则结果为 10。'),
  entry('dollar', 'Consider ', p('$', '\\$'), m('x = 5'), ' and then stop.'),
];

/**
 * Text the classifier still gets wrong, each with the outcome it should have. Kept out of the
 * main corpus so that corpus stays a hard gate; the test marks these as expected failures, so
 * fixing one fails that test until the case is moved up.
 */
export const KNOWN_GAPS: CorpusCase[] = [
  // A derivative written with a prime is not recognised as a function call.
  entry('gap', 'Then ', m("f'(x) = 2x"), '.'),
  // A line that opens with an absolute-value bar is taken for a table row.
  entry('gap', m('|x| < 3'), ' holds.'),
  // A day/month date that happens to be a proper fraction is set in the math font.
  entry('gap', 'The deadline is 9/11.'),
  // A lowercase edge with a weight reads as a subtraction.
  entry('gap', 'Edge u-v = 3.'),
  // A unit with an exponent and no number is promoted from the middle of the token.
  entry('gap', 'The answer is in ', m('rad/s^2', '\\mathrm{rad/s^2}'), '.'),
  // A named function call keeps its plain spelling and is set as a product of letters.
  entry('gap', 'Then ', m('y = sin(x)', 'y = \\sin(x)'), '.'),
  // A bare table cell is never promoted.
  entry('gap', '| symbol | value |\n| --- | --- |\n| ', m('n_1'), ' | 1.0 |'),
];
