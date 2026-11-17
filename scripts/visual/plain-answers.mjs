/**
 * Plain chat answers for the visual harness: what a model writes when it ignores the stemLM
 * guide, or was never given it. One per shape the ingest module reads structure from, plus the
 * replies it must leave alone. Written as Markdown; hosts.mjs renders each in a host's own markup.
 */

/** Numbered derivation: the steps are the items of one ordered list. */
export const PROJECTILE = {
  question: 'A ball is thrown at 20 m/s at 30° above the horizontal. How far away does it land? Use g = 9.8 m/s².',
  markdown: String.raw`We split the launch velocity into components and use the time of flight.

1. Resolve the initial velocity. The horizontal part is $v_x = v_0\cos\theta = 20\cos 30^\circ = 17.3\ \text{m/s}$ and the vertical part is $v_y = v_0\sin\theta = 20\sin 30^\circ = 10.0\ \text{m/s}$.
2. Find the time of flight. The ball returns to launch height when its vertical displacement is zero, so $t = \frac{2v_y}{g} = \frac{2(10.0)}{9.8} = 2.04\ \text{s}$.
3. Multiply the horizontal speed by that time. Nothing acts horizontally, so $R = v_x t = (17.3)(2.04) = 35.3\ \text{m}$.

Therefore the ball lands about $35.3\ \text{m}$ from where it was thrown.`,
};

/** Bold lead-ins, the way Gemini often heads its paragraphs. */
export const MOLARITY = {
  question: 'What is the molarity of a solution made by dissolving 5.85 g of NaCl in enough water to make 250 mL?',
  markdown: String.raw`**Find the molar mass.** Sodium is $22.99\ \text{g/mol}$ and chlorine is $35.45\ \text{g/mol}$, so NaCl is $58.44\ \text{g/mol}$.

**Convert the mass to moles.** Divide the mass by the molar mass:

$$n = \frac{m}{M} = \frac{5.85\ \text{g}}{58.44\ \text{g/mol}} = 0.100\ \text{mol}$$

**Convert the volume to litres.** $250\ \text{mL}$ is $0.250\ \text{L}$.

**Divide moles by volume.** Molarity is moles of solute per litre of solution:

$$c = \frac{n}{V} = \frac{0.100\ \text{mol}}{0.250\ \text{L}} = 0.400\ \text{mol/L}$$

**Answer:** the solution is $0.400\ \text{M}$ NaCl.`,
};

/** No headings, no list: prose that introduces one display equation after another. */
export const DERIVATIVE = {
  question: 'Differentiate f(x) = x² sin x and evaluate the derivative at x = π.',
  markdown: String.raw`This is a product of two functions, $u = x^2$ and $v = \sin x$, so the product rule applies:

$$\frac{d}{dx}(uv) = u'v + uv'$$

The two factors differentiate separately to $u' = 2x$ and $v' = \cos x$. Substituting them into the rule gives the derivative in full:

$$f'(x) = 2x\sin x + x^2\cos x$$

Now put $x = \pi$ into that expression. Since $\sin\pi = 0$ and $\cos\pi = -1$, only the second term survives:

$$f'(\pi) = 2\pi(0) + \pi^2(-1) = -\pi^2$$

So the slope of the curve at $x = \pi$ is $-\pi^2$, about $-9.87$.`,
};

/** A step that carries a Mermaid flowchart: drawn natively, marked as auto-corrected notation. */
export const BINARY_SEARCH = {
  question: 'Explain how binary search finds a value in a sorted array.',
  markdown: String.raw`Binary search halves the part of the array that can still hold the target, so it needs only about $\log_2 n$ comparisons.

### Step 1: Keep two bounds

Start with ${'`'}low${'`'} at the first index and ${'`'}high${'`'} at the last. The target, if it is present, is always between them.

### Step 2: Compare the middle element

Look at the element halfway between the bounds and decide which half to keep.

${'```'}mermaid
flowchart TD
  A[Pick mid] --> B{Compare with target}
  B -->|equal| C[Found]
  B -->|target smaller| D[Search left half]
  B -->|target larger| E[Search right half]
${'```'}

### Step 3: Repeat until the bounds cross

Each comparison discards half of what is left. When ${'`'}low${'`'} passes ${'`'}high${'`'} the target is not in the array.

**Final answer:** binary search runs in $O(\log n)$ time on a sorted array.`,
};

/** Not an answer: the panel must stay empty and claim nothing. */
export const REFUSAL = {
  question: 'Write my lab report for me and make it sound like I ran the experiment.',
  markdown: "I'm sorry, but I can't help with writing a report that presents an experiment you did not run as your own work. If you tell me what you measured, I can help you organise the results and explain the physics behind them.",
};
