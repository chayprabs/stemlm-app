/**
 * Plain chat answers in the shapes the four assistants actually write, as Markdown. Test-only.
 * Fences are written `'''` so the answers can stay raw template strings.
 */
import type { Subject } from '@/src/protocol/types';
import type { IngestStrategy } from '../structure';

export interface AnswerFixture {
  name: string;
  question?: string;
  markdown: string;
  /** null: nothing worth structuring. */
  expect: null | {
    strategy: IngestStrategy;
    steps: number;
    subject?: Subject;
    /** Text the solution must contain; '' asserts there is none. */
    solution?: string;
  };
  /** Source lines that are chat chrome (a closing offer), dropped on purpose. */
  dropped?: string[];
}

function md(strings: TemplateStringsArray): string {
  return String.raw(strings).replace(/'''/g, '```').trim();
}

export const ANSWERS: AnswerFixture[] = [
  {
    name: 'chatgpt-quadratic-step-headings',
    question: 'Solve x^2 - 5x + 6 = 0',
    markdown: md`
Let's solve the quadratic equation step by step.

---

### Step 1: Identify the coefficients

The equation $x^2 - 5x + 6 = 0$ has the form $ax^2 + bx + c = 0$ with

$$
a = 1, \quad b = -5, \quad c = 6
$$

### Step 2: Compute the discriminant

$$
\Delta = b^2 - 4ac = (-5)^2 - 4(1)(6) = 1
$$

Since $\Delta > 0$, there are two distinct real roots.

### Step 3: Apply the quadratic formula

$$
x = \frac{-b \pm \sqrt{\Delta}}{2a} = \frac{5 \pm 1}{2}
$$

So $x = 3$ or $x = 2$.

---

### ✅ Final Answer

$$
\boxed{x = 2 \quad \text{or} \quad x = 3}
$$

Would you like me to show the factoring method as well?`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Math', solution: '\\boxed{x = 2' },
    dropped: ['Would you like me to show the factoring method as well?'],
  },
  {
    name: 'chatgpt-projectile-rules-between-steps',
    question: 'A ball is thrown at 20 m/s at 30 degrees above the horizontal. Find the range of the projectile.',
    markdown: md`
## Projectile range

We treat the ball as a projectile with no air resistance.

---

## Step 1: Resolve the initial velocity

$$
v_x = v_0\cos\theta = 20\cos 30^\circ = 17.3\ \text{m/s}
$$

$$
v_y = v_0\sin\theta = 20\sin 30^\circ = 10.0\ \text{m/s}
$$

---

## Step 2: Find the time of flight

The ball lands when its vertical displacement is zero:

$$
t = \frac{2v_y}{g} = \frac{2(10.0)}{9.8} = 2.04\ \text{s}
$$

---

## Step 3: Compute the range

$$
R = v_x t = 17.3 \times 2.04 = 35.3\ \text{m}
$$

---

**Final Answer:** The range is approximately $35.3\ \text{m}$.`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Physics', solution: 'approximately $35.3' },
  },
  {
    name: 'chatgpt-stoichiometry-mhchem',
    question: 'How many grams of water form when 4.0 g of hydrogen gas reacts with excess oxygen?',
    markdown: md`
### Step 1 — Write the balanced equation

$$
\ce{2H2 + O2 -> 2H2O}
$$

### Step 2 — Convert grams of $\ce{H2}$ to moles

$$
n(\ce{H2}) = \frac{4.0\ \text{g}}{2.016\ \text{g/mol}} = 1.98\ \text{mol}
$$

### Step 3 — Use the mole ratio

The ratio $\ce{H2} : \ce{H2O}$ is $2 : 2$, so $n(\ce{H2O}) = 1.98\ \text{mol}$.

### Step 4 — Convert moles of water to grams

$$
m = 1.98\ \text{mol} \times 18.02\ \text{g/mol} = 35.7\ \text{g}
$$

### Final Answer

About **35.7 g** of water forms.`,
    expect: { strategy: 'step-markers', steps: 4, subject: 'Chemistry', solution: '35.7 g' },
  },
  {
    name: 'chatgpt-binary-search-sections',
    question: 'Write binary search in Python and explain its time complexity.',
    markdown: md`
## Idea

Binary search keeps a window over a **sorted** array and halves it on every comparison, so the answer is found without visiting every element.

## Implementation

'''python
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
'''

## Complexity

Each iteration halves the window, so after $k$ iterations at most $n / 2^k$ elements remain. The loop stops when that is below 1, which gives $k = \lceil \log_2 n \rceil$.

- Time: $O(\log n)$
- Space: $O(1)$

Let me know if you'd like the recursive version too.`,
    expect: { strategy: 'headings', steps: 3, subject: 'CS', solution: '' },
    dropped: ["Let me know if you'd like the recursive version too."],
  },
  {
    name: 'chatgpt-multipart-homework',
    question: 'A 2 kg block slides down a frictionless 30 degree incline of length 5 m. (a) Find the acceleration. (b) Find the speed at the bottom. (c) Find the time taken.',
    markdown: md`
### (a) Acceleration

Along the incline only the component of gravity acts:

$$
a = g\sin\theta = 9.8 \times \sin 30^\circ = 4.9\ \text{m/s}^2
$$

### (b) Speed at the bottom

Starting from rest, $v^2 = 2as$:

$$
v = \sqrt{2(4.9)(5)} = 7.0\ \text{m/s}
$$

### (c) Time taken

$$
t = \frac{v}{a} = \frac{7.0}{4.9} = 1.43\ \text{s}
$$

### Summary

| Part | Result |
| --- | --- |
| (a) | $4.9\ \text{m/s}^2$ |
| (b) | $7.0\ \text{m/s}$ |
| (c) | $1.43\ \text{s}$ |`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Physics', solution: '| (a) | $4.9' },
  },
  {
    name: 'chatgpt-proof-prose-around-equations',
    question: 'Prove that the square root of 2 is irrational.',
    markdown: md`
We argue by contradiction. Suppose $\sqrt{2}$ is rational, so it can be written in lowest terms:

$$
\sqrt{2} = \frac{p}{q}, \qquad \gcd(p, q) = 1
$$

Squaring both sides and clearing the denominator gives

$$
p^2 = 2q^2
$$

so $p^2$ is even, and therefore $p$ is even. Write $p = 2k$. Substituting back:

$$
4k^2 = 2q^2 \implies q^2 = 2k^2
$$

Hence $q$ is even as well. But then $p$ and $q$ share the factor 2, contradicting $\gcd(p, q) = 1$.

Therefore $\sqrt{2}$ cannot be written as a fraction: it is irrational. $\blacksquare$`,
    expect: { strategy: 'paragraphs', steps: 3, subject: 'Math', solution: 'it is irrational' },
  },
  {
    name: 'chatgpt-conceptual-numbered-headings',
    question: 'Why is the sky blue?',
    markdown: md`
# Why the sky is blue

### 1. Sunlight is a mix of colours

Sunlight looks white, but it contains every colour of the visible spectrum, each with its own wavelength. Blue light has a short wavelength; red light has a long one.

### 2. Air molecules scatter short wavelengths more

When sunlight meets the molecules of the atmosphere it is scattered in all directions. The strength of this **Rayleigh scattering** grows as $1/\lambda^4$, so blue light is scattered roughly ten times more strongly than red.

### 3. Scattered blue reaches your eyes from everywhere

Because blue light is redirected across the whole sky, you see blue wherever you look, not only toward the Sun.

### Summary

The sky is blue because air scatters short-wavelength light far more than long-wavelength light.`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Physics', solution: 'air scatters short-wavelength' },
  },
  {
    name: 'chatgpt-integration-by-parts-bold-steps',
    question: 'Integrate x e^x dx',
    markdown: md`
We use integration by parts, $\int u\,dv = uv - \int v\,du$.

**Step 1: Choose $u$ and $dv$.**
Let $u = x$ and $dv = e^x\,dx$, so $du = dx$ and $v = e^x$.

**Step 2: Apply the formula.**

$$
\int x e^x\,dx = x e^x - \int e^x\,dx
$$

**Step 3: Finish the remaining integral.**

$$
\int e^x\,dx = e^x
$$

Putting it together:

$$
\boxed{\int x e^x\,dx = (x - 1)e^x + C}
$$`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Math', solution: '\\boxed{\\int x e^x' },
  },
  {
    name: 'chatgpt-series-circuit-with-table',
    question: 'Three resistors of 2 ohm, 3 ohm and 5 ohm are in series across a 20 V battery. Find the current and each voltage drop.',
    markdown: md`
### Step 1: Total resistance

For resistors in series the resistances add:

$$
R_{\text{total}} = 2 + 3 + 5 = 10\ \Omega
$$

### Step 2: Current

By Ohm's law,

$$
I = \frac{V}{R_{\text{total}}} = \frac{20}{10} = 2\ \text{A}
$$

### Step 3: Voltage drops

| Resistor | $V = IR$ |
|---|---|
| $2\ \Omega$ | $4\ \text{V}$ |
| $3\ \Omega$ | $6\ \text{V}$ |
| $5\ \Omega$ | $10\ \text{V}$ |

The drops add to $20\ \text{V}$, as they must.

**Final Answer:** $I = 2\ \text{A}$, with drops of $4\ \text{V}$, $6\ \text{V}$ and $10\ \text{V}$.`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Electrical', solution: '$I = 2\\ \\text{A}$' },
  },
  {
    name: 'chatgpt-spanish-pasos',
    question: 'Resuelve 3x + 5 = 20',
    markdown: md`
Vamos a resolver la ecuación paso a paso.

### Paso 1: Restar 5 en ambos lados

$$
3x + 5 - 5 = 20 - 5 \implies 3x = 15
$$

### Paso 2: Dividir entre 3

$$
x = \frac{15}{3} = 5
$$

### Paso 3: Comprobar

Sustituimos: $3(5) + 5 = 20$, así que la solución es correcta.

### Respuesta final

$$
x = 5
$$

¿Quieres que resuelva otro ejemplo?`,
    expect: { strategy: 'step-markers', steps: 3, solution: 'x = 5' },
    dropped: ['¿Quieres que resuelva otro ejemplo?'],
  },
  {
    name: 'claude-product-rule-bold-captions',
    question: 'Differentiate f(x) = x^2 sin(x)',
    markdown: md`
I'll use the product rule, since $f$ is a product of two functions.

**Setting up**

Write $f(x) = u(x)\,v(x)$ with $u = x^2$ and $v = \sin x$. Then $u' = 2x$ and $v' = \cos x$.

**Applying the product rule**

The product rule says $(uv)' = u'v + uv'$, so

$$
f'(x) = 2x\sin x + x^2\cos x
$$

**Simplifying**

Factoring out the common $x$ gives a tidier form.

So the derivative is $f'(x) = x\,(2\sin x + x\cos x)$.`,
    expect: { strategy: 'bold-leads', steps: 3, subject: 'Math', solution: "So the derivative is" },
  },
  {
    name: 'claude-merge-sort-sections',
    question: 'Explain merge sort and give its recurrence.',
    markdown: md`
## Approach

Merge sort is a divide-and-conquer algorithm: split the array in half, sort each half recursively, then merge the two sorted halves in linear time.

## Solution

'''python
def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]
'''

## Complexity analysis

The running time satisfies the recurrence

$$
T(n) = 2T(n/2) + \Theta(n)
$$

There are $\log_2 n$ levels of recursion and each level does $\Theta(n)$ work, so $T(n) = \Theta(n \log n)$. The merge needs $\Theta(n)$ extra space.`,
    expect: { strategy: 'headings', steps: 3, subject: 'CS', solution: '' },
  },
  {
    name: 'claude-equilibrium-numbered-bold-leads',
    question: 'For N2O4 ⇌ 2NO2 with Kc = 0.36 at 100 °C and initial [N2O4] = 0.10 M, find the equilibrium concentrations.',
    markdown: md`
Here's how to find the equilibrium concentrations with an ICE table.

1. **Write the equilibrium expression.** For $\ce{N2O4 <=> 2NO2}$ the constant is $K_c = \dfrac{[\ce{NO2}]^2}{[\ce{N2O4}]}$.
2. **Set up the changes.** Let $x$ be the amount of $\ce{N2O4}$ that dissociates. At equilibrium $[\ce{N2O4}] = 0.10 - x$ and $[\ce{NO2}] = 2x$.
3. **Substitute and solve.** $0.36 = \dfrac{(2x)^2}{0.10 - x}$ gives $4x^2 + 0.36x - 0.036 = 0$, whose positive root is $x = 0.060$.
4. **Compute the concentrations.** $[\ce{N2O4}] = 0.040\ \text{M}$ and $[\ce{NO2}] = 0.12\ \text{M}$.

**Check:** $\dfrac{0.12^2}{0.040} = 0.36$, which matches $K_c$.`,
    expect: { strategy: 'ordered-list', steps: 4, subject: 'Chemistry', solution: '' },
  },
  {
    name: 'claude-linear-system-prose',
    question: 'Solve the system 2x + y = 7 and x - y = 2',
    markdown: md`
Adding the two equations eliminates $y$, because the $y$ terms have opposite signs:

$$
(2x + y) + (x - y) = 7 + 2
$$

That leaves a single equation in $x$:

$$
3x = 9 \quad\Longrightarrow\quad x = 3
$$

Now substitute $x = 3$ into the second equation to recover $y$:

$$
3 - y = 2 \quad\Longrightarrow\quad y = 1
$$

So the solution is $(x, y) = (3, 1)$, which you can verify in the first equation: $2(3) + 1 = 7$.`,
    expect: { strategy: 'paragraphs', steps: 3, subject: 'Math', solution: '(x, y) = (3, 1)' },
  },
  {
    name: 'claude-photosynthesis-essay',
    question: 'How does photosynthesis work?',
    markdown: md`
Photosynthesis is the process by which plants, algae and some bacteria turn light energy into chemical energy stored in sugars. It takes place in the chloroplasts, mostly in leaf cells, and it has two linked stages that run in different parts of the organelle.

The first stage is the light-dependent reactions, which happen in the thylakoid membranes. Chlorophyll absorbs photons and uses their energy to split water, releasing oxygen as a by-product. The electrons that are freed travel along a transport chain, and the energy they give up is used to make ATP and NADPH.

The second stage is the Calvin cycle, which runs in the stroma and does not need light directly. Here the enzyme RuBisCO attaches carbon dioxide to a five-carbon sugar, and the ATP and NADPH from the first stage power the reduction of the product into a three-carbon sugar. Most of that sugar is recycled to keep the cycle turning, and the rest is exported to build glucose, starch and cellulose.

Taken together, the two stages convert carbon dioxide and water into sugar and oxygen, which is why photosynthesis underpins almost every food chain on Earth and maintains the oxygen in the atmosphere.`,
    expect: { strategy: 'paragraphs', steps: 4, subject: 'Biology', solution: '' },
  },
  {
    name: 'claude-parts-bold-markers',
    question: 'A fair die is rolled twice. (a) P(sum = 7)? (b) P(at least one six)?',
    markdown: md`
There are $6 \times 6 = 36$ equally likely outcomes.

**Part (a): Sum equals 7**

The favourable pairs are $(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)$, six in total.

$$
P(\text{sum} = 7) = \frac{6}{36} = \frac{1}{6}
$$

**Part (b): At least one six**

It is easier to count the complement. No six on either roll happens in $5 \times 5 = 25$ ways.

$$
P(\text{at least one six}) = 1 - \frac{25}{36} = \frac{11}{36}
$$`,
    expect: { strategy: 'step-markers', steps: 2, subject: 'Math', solution: '' },
  },
  {
    name: 'claude-induction-bold-leadins',
    question: 'Prove by induction that 1 + 2 + ... + n = n(n+1)/2',
    markdown: md`
**Base case.** For $n = 1$ the left side is $1$ and the right side is $\frac{1 \cdot 2}{2} = 1$, so the statement holds.

**Inductive hypothesis.** Assume that for some $k \ge 1$ we have $1 + 2 + \dots + k = \frac{k(k+1)}{2}$.

**Inductive step.** Adding $k + 1$ to both sides of the hypothesis:

$$
1 + 2 + \dots + k + (k+1) = \frac{k(k+1)}{2} + (k+1) = \frac{(k+1)(k+2)}{2}
$$

which is exactly the statement for $n = k + 1$.

**Conclusion.** By the principle of mathematical induction the formula holds for every integer $n \ge 1$.`,
    expect: { strategy: 'bold-leads', steps: 3, subject: 'Math', solution: 'By the principle of mathematical induction' },
  },
  {
    name: 'claude-french-etapes',
    question: 'Calcule la dérivée de f(x) = 3x^2 + 2x',
    markdown: md`
## Étape 1 : Identifier la règle

On dérive terme à terme avec la règle de la puissance, $(x^n)' = n x^{n-1}$.

## Étape 2 : Dériver chaque terme

$$
(3x^2)' = 6x, \qquad (2x)' = 2
$$

## Réponse finale

$$
f'(x) = 6x + 2
$$`,
    expect: { strategy: 'step-markers', steps: 2, solution: "f'(x) = 6x + 2" },
  },
  {
    name: 'claude-refusal',
    question: 'Write my entire graded exam for me and make it undetectable.',
    markdown: md`
I can't help with completing a graded exam on your behalf, since that would be academic dishonesty. I'd be glad to help you study the material instead: if you share the topics, I can explain the concepts and work through practice problems with you.`,
    expect: null,
  },
  {
    name: 'claude-two-line-answer',
    question: 'What is the derivative of sin x?',
    markdown: md`
The derivative of $\sin x$ is $\cos x$.

This follows from the limit definition together with the identity for $\sin(a + b)$.`,
    expect: null,
  },
  {
    name: 'gemini-newton-bold-numbered',
    question: 'A 5 kg box is pushed with a net force of 20 N. What is its acceleration?',
    markdown: md`
Here is how to find the acceleration of the box.

**1. Identify the Given Information**

* Mass ($m$): $5\ \text{kg}$
* Net force ($F$): $20\ \text{N}$

**2. Choose the Right Formula**

Newton's second law relates force, mass and acceleration:

$$F = ma$$

**3. Rearrange and Solve**

Solving for $a$ and substituting the values:

$$a = \frac{F}{m} = \frac{20\ \text{N}}{5\ \text{kg}} = 4\ \text{m/s}^2$$

**Final Answer:** The acceleration of the box is $4\ \text{m/s}^2$.`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Physics', solution: 'The acceleration of the box is' },
  },
  {
    name: 'gemini-molarity-bold-steps-bullets',
    question: 'What is the molarity of a solution made by dissolving 58.5 g of NaCl in 2.0 L of solution?',
    markdown: md`
To find the molarity, we need moles of solute per litre of solution.

**Step 1: Find the molar mass of NaCl**

* Na: $22.99\ \text{g/mol}$
* Cl: $35.45\ \text{g/mol}$
* Total: $58.44\ \text{g/mol}$

**Step 2: Convert mass to moles**

$$n = \frac{58.5\ \text{g}}{58.44\ \text{g/mol}} \approx 1.00\ \text{mol}$$

**Step 3: Divide by the volume**

$$M = \frac{n}{V} = \frac{1.00\ \text{mol}}{2.0\ \text{L}} = 0.50\ \text{M}$$

**Final Answer:**
The molarity of the solution is **0.50 M**.`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Chemistry', solution: '**0.50 M**' },
  },
  {
    name: 'gemini-conditional-probability-numbered-headings',
    question: 'A bag has 3 red and 2 blue marbles. Two are drawn without replacement. What is the probability both are red?',
    markdown: md`
### 1. Define the events

Let $A$ be "the first marble is red" and $B$ be "the second marble is red".

### 2. Probability of the first draw

There are 3 red marbles out of 5, so $P(A) = \frac{3}{5}$.

### 3. Probability of the second draw

After one red marble is removed, 2 red remain out of 4, so $P(B \mid A) = \frac{2}{4} = \frac{1}{2}$.

### 4. Multiply

$$P(A \cap B) = P(A)\,P(B \mid A) = \frac{3}{5} \times \frac{1}{2} = \frac{3}{10}$$

### Conclusion

The probability that both marbles are red is $\frac{3}{10}$, or 30%.`,
    expect: { strategy: 'step-markers', steps: 4, subject: 'Math', solution: 'or 30%' },
  },
  {
    name: 'gemini-two-sum-table-and-code',
    question: 'Explain the hash map solution to two-sum.',
    markdown: md`
## The idea

For each number, the value that would complete the pair is known: it is the target minus that number. A hash map lets us ask "have I already seen that value?" in constant time.

## The code

'''javascript
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}
'''

## How it compares

| Approach | Time | Space |
| :--- | :---: | :---: |
| Brute force | $O(n^2)$ | $O(1)$ |
| Hash map | $O(n)$ | $O(n)$ |

## Why it is correct

When index $i$ is reached, every earlier index is in the map. If a valid partner exists at an earlier index it is found at that moment; if it exists at a later index, the pair is found when the loop reaches that later index.`,
    expect: { strategy: 'headings', steps: 4, subject: 'CS', solution: '' },
  },
  {
    name: 'gemini-hindi-charan',
    question: '2x + 3 = 11 को हल कीजिए',
    markdown: md`
आइए इस समीकरण को चरण दर चरण हल करें।

**चरण 1: दोनों पक्षों से 3 घटाएँ**

$$2x + 3 - 3 = 11 - 3$$

इससे हमें $2x = 8$ मिलता है।

**चरण 2: दोनों पक्षों को 2 से भाग दें**

$$x = \frac{8}{2} = 4$$

**अंतिम उत्तर:** $x = 4$`,
    expect: { strategy: 'step-markers', steps: 2, solution: '$x = 4$' },
  },
  {
    name: 'gemini-kinematics-givens-then-prose',
    question: 'A car accelerates from rest at 3 m/s^2 for 6 s. How far does it travel?',
    markdown: md`
We can list what the problem gives us:

* Initial velocity: $u = 0$
* Acceleration: $a = 3\ \text{m/s}^2$
* Time: $t = 6\ \text{s}$

Because the acceleration is constant, the displacement follows from the second equation of motion:

$$s = ut + \tfrac{1}{2}at^2$$

Substituting the known values, the first term vanishes because the car starts from rest:

$$s = 0 + \tfrac{1}{2}(3)(6)^2 = 54\ \text{m}$$

Therefore, the car travels $54\ \text{m}$ in those six seconds.`,
    expect: { strategy: 'paragraphs', steps: 2, subject: 'Physics', solution: 'the car travels $54' },
  },
  {
    name: 'gemini-greeting',
    markdown: md`
Hello! I'm here to help with your studies. What would you like to work on today?`,
    expect: null,
  },
  {
    name: 'gemini-mermaid-figure-in-step',
    question: 'Describe the stages of the water cycle.',
    markdown: md`
### 1. Evaporation

Heat from the Sun turns liquid water in oceans, lakes and soil into water vapour, which rises into the atmosphere.

'''mermaid
graph LR
  A[Ocean] -->|evaporation| B[Vapour]
  B -->|condensation| C[Cloud]
  C -->|precipitation| A
'''

### 2. Condensation

As the vapour rises it cools and condenses around dust particles, forming the droplets that make up clouds.

### 3. Precipitation

When the droplets grow heavy enough they fall as rain, snow or hail, returning water to the surface where the cycle begins again.`,
    expect: { strategy: 'step-markers', steps: 3, solution: '' },
  },
  {
    name: 'gemini-heat-engine-numbered-bold',
    question: 'A heat engine absorbs 800 J from the hot reservoir and rejects 500 J to the cold reservoir. Find the work done and the efficiency.',
    markdown: md`
**1. Apply the first law to one cycle**

Over a complete cycle the internal energy returns to its starting value, so the net work equals the net heat:

$$W = Q_H - Q_C = 800 - 500 = 300\ \text{J}$$

**2. Compute the thermal efficiency**

$$\eta = \frac{W}{Q_H} = \frac{300}{800} = 0.375$$

**3. Interpret the result**

| Quantity | Value |
| --- | --- |
| Work output | $300\ \text{J}$ |
| Efficiency | $37.5\%$ |

Only 37.5% of the absorbed heat becomes work; the rest is rejected to the cold reservoir.`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Mechanical', solution: '' },
  },
  {
    name: 'gemini-chinese-steps',
    question: '求 x^2 的导数',
    markdown: md`
我们用导数的定义来求解。

**第一步：写出导数的定义**

$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$

**第二步：代入 $f(x) = x^2$**

$$\frac{(x+h)^2 - x^2}{h} = \frac{2xh + h^2}{h} = 2x + h$$

**第三步：取极限**

当 $h \to 0$ 时，$2x + h \to 2x$。

**答案：** $f'(x) = 2x$`,
    expect: { strategy: 'step-markers', steps: 3, solution: "$f'(x) = 2x$" },
  },
  {
    name: 'grok-terse-numbered-derivation-split-by-math',
    question: 'Find the minimum of f(x) = x^2 - 4x + 7',
    markdown: md`
1. Differentiate the function with respect to $x$:

$$
f'(x) = 2x - 4
$$

2. Set the derivative to zero to locate the critical point:

$$
2x - 4 = 0 \implies x = 2
$$

3. Check the second derivative, $f''(x) = 2 > 0$, so the critical point is a minimum.

4. Evaluate the function there:

$$
f(2) = 4 - 8 + 7 = 3
$$

Thus, the minimum value is $3$, attained at $x = 2$.`,
    expect: { strategy: 'ordered-list', steps: 4, subject: 'Math', solution: 'the minimum value is $3$' },
  },
  {
    name: 'grok-limit-inline-list',
    question: 'Evaluate the limit of (x^2 - 9)/(x - 3) as x approaches 3',
    markdown: md`
Direct substitution gives $0/0$, so simplify first.

1. Factor the numerator as a difference of squares: $x^2 - 9 = (x - 3)(x + 3)$.
2. Cancel the common factor, which is valid because $x \ne 3$ inside the limit: $\frac{(x-3)(x+3)}{x-3} = x + 3$.
3. Substitute $x = 3$ into the simplified expression: $3 + 3 = 6$.
4. Therefore, $\lim_{x \to 3} \frac{x^2 - 9}{x - 3} = 6$.`,
    expect: { strategy: 'ordered-list', steps: 3, subject: 'Math', solution: '= 6$' },
  },
  {
    name: 'grok-kirchhoff-bold-step-colon-outside',
    question: 'Use Kirchhoff’s voltage law to find the current in a loop with a 12 V source and resistors of 4 ohm and 2 ohm.',
    markdown: md`
**Step 1**: Assign a clockwise loop current $I$ and mark the polarity of each resistor drop.

**Step 2**: Write KVL around the loop, summing rises and drops:

$$
12 - 4I - 2I = 0
$$

**Step 3**: Solve for the current:

$$
I = \frac{12}{6} = 2\ \text{A}
$$

So the loop current is $2\ \text{A}$, flowing clockwise.`,
    expect: { strategy: 'step-markers', steps: 3, subject: 'Electrical', solution: 'the loop current is' },
  },
  {
    name: 'grok-pure-code',
    question: 'fizzbuzz in python',
    markdown: md`
'''python
for i in range(1, 101):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
'''

That prints the numbers 1 to 100 with the usual substitutions.`,
    expect: null,
  },
  {
    name: 'grok-fibonacci-dp-list-then-code',
    question: 'How do I compute Fibonacci numbers efficiently?',
    markdown: md`
Use bottom-up dynamic programming instead of naive recursion.

1. **Observe the overlap.** The naive recursion recomputes the same subproblems exponentially many times, because $F(n)$ calls $F(n-1)$ and $F(n-2)$, which share almost all of their work.
2. **Keep only what is needed.** Each value depends on the previous two, so two variables are enough and no table has to be stored.
3. **Iterate upward.** Start from $F(0) = 0$ and $F(1) = 1$ and roll the pair forward $n$ times.

'''python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
'''

Time complexity is $O(n)$ and space is $O(1)$, compared with $O(2^n)$ time for the naive version.`,
    expect: { strategy: 'ordered-list', steps: 3, subject: 'CS', solution: '' },
  },
  {
    name: 'grok-german-plain-schritt-leads',
    question: 'Löse 4x - 8 = 12',
    markdown: md`
Schritt 1: Addiere 8 auf beiden Seiten. Dadurch verschwindet die Konstante links.

$$
4x = 20
$$

Schritt 2: Teile beide Seiten durch 4.

$$
x = 5
$$

Schritt 3: Mache die Probe mit der Ausgangsgleichung, denn $4 \cdot 5 - 8 = 12$ stimmt.

Antwort: $x = 5$`,
    expect: { strategy: 'step-markers', steps: 3, solution: '$x = 5$' },
  },
  {
    name: 'grok-de-morgan-truth-table',
    question: 'Show that NOT (A AND B) equals (NOT A) OR (NOT B).',
    markdown: md`
The cleanest way to verify De Morgan's law is to compare both sides on every input.

| $A$ | $B$ | $\lnot(A \land B)$ | $\lnot A \lor \lnot B$ |
|---|---|---|---|
| 0 | 0 | 1 | 1 |
| 0 | 1 | 1 | 1 |
| 1 | 0 | 1 | 1 |
| 1 | 1 | 0 | 0 |

The last two columns agree on all four rows, and a Boolean identity is exactly a statement that two expressions agree on every assignment of their variables.

Therefore $\lnot(A \land B) = \lnot A \lor \lnot B$.`,
    expect: { strategy: 'paragraphs', steps: 1, solution: '\\lnot A \\lor \\lnot B' },
  },
  {
    name: 'grok-unit-conversion-terse-list',
    question: 'Convert 72 km/h to m/s',
    markdown: md`
1. Write the speed as a fraction: $72\ \text{km/h} = \frac{72\ \text{km}}{1\ \text{h}}$.
2. Replace kilometres by metres using $1\ \text{km} = 1000\ \text{m}$, and hours by seconds using $1\ \text{h} = 3600\ \text{s}$.
3. Simplify the numbers: $\frac{72 \times 1000}{3600} = 20$.

So $72\ \text{km/h} = 20\ \text{m/s}$.`,
    expect: { strategy: 'ordered-list', steps: 3, subject: 'Physics', solution: '= 20\\ \\text{m/s}$' },
  },
  {
    name: 'grok-eigenvalues-plain-final-line',
    question: 'Find the eigenvalues of the matrix [[2, 1], [1, 2]]',
    markdown: md`
The eigenvalues satisfy the characteristic equation $\det(A - \lambda I) = 0$:

$$
\det\begin{pmatrix} 2 - \lambda & 1 \\ 1 & 2 - \lambda \end{pmatrix} = (2 - \lambda)^2 - 1
$$

Expanding and factoring the quadratic in $\lambda$:

$$
\lambda^2 - 4\lambda + 3 = (\lambda - 1)(\lambda - 3) = 0
$$

Final answer: $\lambda_1 = 1$ and $\lambda_2 = 3$.`,
    expect: { strategy: 'paragraphs', steps: 2, subject: 'Math', solution: '$\\lambda_1 = 1$' },
  },
  {
    name: 'grok-dot-figure',
    question: 'Draw the state machine that accepts binary strings ending in 1.',
    markdown: md`
## States

The machine needs two states: $q_0$ for "the last symbol was not 1" (also the start state) and $q_1$ for "the last symbol was 1", which is the only accepting state.

## Transitions

Reading a 1 always moves to $q_1$ and reading a 0 always moves to $q_0$, whatever the current state is.

'''dot
digraph {
  q0 -> q1 [label="1"];
  q0 -> q0 [label="0"];
  q1 -> q1 [label="1"];
  q1 -> q0 [label="0"];
}
'''

'''dot
digraph { a -> b }
'''`,
    expect: { strategy: 'headings', steps: 2, solution: '' },
  },
  {
    name: 'legacy-setext-headings-and-bracket-math',
    question: 'Find the area of a circle of radius 3 cm',
    markdown: md`
Step 1: Recall the formula
--------------------------

The area of a circle of radius $r$ is

\[
A = \pi r^2
\]

Step 2: Substitute the radius
-----------------------------

\[
A = \pi (3)^2 = 9\pi \approx 28.3\ \text{cm}^2
\]

Answer
------

The area is about $28.3\ \text{cm}^2$.`,
    expect: { strategy: 'step-markers', steps: 2, subject: 'Math', solution: 'about $28.3' },
  },
  {
    name: 'nested-steps-restart-inside-parts',
    question: 'A capacitor of 2 µF is charged to 10 V. (a) Find the charge. (b) Find the stored energy.',
    markdown: md`
## Part A: Charge

### Step 1: Formula

$$Q = CV$$

### Step 2: Substitute

$$Q = (2 \times 10^{-6})(10) = 2 \times 10^{-5}\ \text{C}$$

## Part B: Energy

### Step 1: Formula

$$U = \tfrac{1}{2}CV^2$$

### Step 2: Substitute

$$U = \tfrac{1}{2}(2 \times 10^{-6})(10)^2 = 1 \times 10^{-4}\ \text{J}$$`,
    expect: { strategy: 'step-markers', steps: 2, subject: 'Electrical', solution: '' },
  },
  {
    name: 'long-preamble-becomes-first-step',
    question: 'Estimate how many piano tuners work in Chicago.',
    markdown: md`
This is a classic Fermi estimate, so the goal is not an exact number but a defensible order of magnitude built from quantities we can reason about. The approach is to estimate how much tuning work exists in the city each year and then divide by how much work a single tuner can do.

We will round aggressively throughout, because the uncertainty in each factor is far larger than any rounding error, and because round numbers make the multiplication easy to check by hand.

### Step 1: Pianos in the city

Chicago has about 3 million people, or roughly 1 million households. If one household in twenty owns a piano, there are about 50,000 pianos.

### Step 2: Tunings per year

A piano is tuned about once a year, so the demand is roughly 50,000 tunings per year.

### Step 3: Tunings per tuner

A tuner can do about 4 tunings a day for 250 working days, which is 1,000 tunings per year.

So there are roughly $50{,}000 / 1{,}000 = 50$ piano tuners in Chicago.`,
    expect: { strategy: 'step-markers', steps: 4, solution: 'roughly $50{,}000' },
  },
  {
    name: 'single-substantial-block',
    question: 'What is the escape velocity from Earth?',
    markdown: md`
Escape velocity is the speed at which an object's kinetic energy equals the magnitude of its gravitational potential energy, so that it can coast to infinity without further propulsion; setting $\tfrac{1}{2}mv^2 = \frac{GMm}{R}$ and cancelling the mass of the object gives $v = \sqrt{2GM/R}$, and with $G = 6.67 \times 10^{-11}\ \text{N m}^2/\text{kg}^2$, $M = 5.97 \times 10^{24}\ \text{kg}$ and $R = 6.37 \times 10^{6}\ \text{m}$ this evaluates to about $1.12 \times 10^{4}\ \text{m/s}$, or roughly $11.2\ \text{km/s}$, independent of the mass of the object and of the direction of launch as long as the path does not intersect the planet.`,
    expect: { strategy: 'paragraphs', steps: 1, subject: 'Physics', solution: '' },
  },
  {
    name: 'stemlm-spec-fence-as-figure',
    question: 'Sketch the forces on a block resting on a table.',
    markdown: md`
**Identify the forces.** Two forces act on the block: its weight $W = mg$ pointing down and the normal force $N$ from the table pointing up.

'''stemlm
type: fbd
body: block
force: W, down
force: N, up
'''

**Apply equilibrium.** The block does not accelerate, so the net vertical force is zero and $N = mg$.`,
    expect: { strategy: 'bold-leads', steps: 2, subject: 'Physics', solution: '' },
  },
];

/** Twenty-five numbered sections: more steps than a study rail should hold. */
export const MANY_STEPS = Array.from(
  { length: 25 },
  (_, i) => `### Step ${i + 1}: Move ${i + 1}\n\nWe carry out move ${i + 1} of the derivation and record the intermediate value $x_{${i + 1}} = ${i + 1}$.`,
).join('\n\n');
