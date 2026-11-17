/**
 * The answer the welcome page's live demo renders.
 *
 * It is written exactly as a chat model writes one (the line-oriented capsule the stemLM guide
 * teaches) and goes through the real parser, so the demo shows the product's own pipeline from
 * text to page, not a mock of it. A test holds it to that: it must parse cleanly and every figure
 * in it must compile.
 */
import { parse } from '@/src/protocol/parser';
import type { Capsule } from '@/src/protocol/types';

const BODY = String.raw`@meta
version: 2
subject: Physics
topic: Block sliding down a rough incline
question: A 5.0 kg block is released from rest on a 30° incline. The coefficient of kinetic friction is 0.20. Find the block's acceleration and its speed after it has slid 2.0 m.
qid: q1
archetype: numeric
level: intro
locale: SI,decimal=.,circuit=IEEE
mode: full
@endmeta
@step id=s1
title: Draw the forces on the block
@body
Three forces act on the block: its weight $W = mg$, the normal force $N$ from the surface, and kinetic friction $f_k$ pointing up the incline because the block slides down.

Take $+x$ down the incline and $+y$ perpendicular to it. With $m = 5.0\ \text{kg}$ and $g = 9.81\ \text{m/s}^2$: $W = (5.0)(9.81) = 49.1\ \text{N}$.
@endbody
@diagram id=f1 type=scene
kind: fbd
body: block
incline_deg: 30
force: W 49.1 N weight on block
force: N 42.5 N normal+ on block
force: f_k 8.5 N up_incline on block
axes: local
@enddiagram
@takeaway
Tilt the axes with the incline so only the weight needs resolving.
@endtakeaway
@endstep
@step id=s2
title: Find the normal force from the perpendicular balance
@formula id=e1
$$\sum F_y = N - mg\cos\theta = 0$$
@endformula
@body
The block does not leave the surface, so the perpendicular forces cancel.

$$N = mg\cos\theta = (5.0)(9.81)\cos 30^\circ = 42.5\ \text{N}$$
@endbody
@quickcheck
q: If the incline were steeper, at 60°, would $N$ be larger or smaller than 42.5 N?
a: Smaller, because $N = mg\cos\theta$ and $\cos 60^\circ = 0.50 < \cos 30^\circ = 0.866$, giving $N = 24.5\ \text{N}$.
@endquickcheck
@followup
Why does friction depend on the normal force and not on the weight directly?
@endfollowup
@endstep
@step id=s3
title: Apply Newton's second law along the incline
@formula id=e2
$$\sum F_x = mg\sin\theta - f_k = ma$$
@endformula
@body
Kinetic friction is $f_k = \mu_k N = (0.20)(42.5) = 8.5\ \text{N}$.

$$a = \frac{mg\sin\theta - \mu_k N}{m} = \frac{24.5 - 8.5}{5.0} = 3.2\ \text{m/s}^2$$

The mass cancels in symbols: $a = g(\sin\theta - \mu_k\cos\theta)$.
@endbody
@takeaway
On an incline with friction, $a = g(\sin\theta - \mu_k\cos\theta)$, independent of mass.
@endtakeaway
@quickcheck
q: What value of $\mu_k$ would make the block slide at constant speed?
a: $\mu_k = \tan 30^\circ = 0.577$, since $a = 0$ requires $\sin\theta = \mu_k\cos\theta$.
@endquickcheck
@endstep
@step id=s4
title: Use constant-acceleration kinematics for the speed
@formula id=e3
$$v^2 = v_0^2 + 2a\,\Delta x$$
@endformula
@body
The block starts from rest, so $v_0 = 0$.

$$v = \sqrt{2a\,\Delta x} = \sqrt{2(3.2)(2.0)} = 3.6\ \text{m/s}$$
@endbody
@diagram id=f2 type=plot
fn: sqrt(2*3.2*x)
domain: 0 3
xlabel: distance slid (m)
ylabel: speed (m/s)
eq: v=\sqrt{2a\,\Delta x}
point: 2,3.58
point_label: 3.6 m/s at 2.0 m
@enddiagram
@endstep
@step id=s5
title: Check the result with energy
@body
Gravity does $mg\sin\theta\,\Delta x = (24.5)(2.0) = 49.1\ \text{J}$ and friction removes $f_k\,\Delta x = (8.5)(2.0) = 17.0\ \text{J}$.

$$\tfrac12 mv^2 = 49.1 - 17.0 = 32.1\ \text{J} \;\Rightarrow\; v = \sqrt{\frac{2(32.1)}{5.0}} = 3.6\ \text{m/s}$$

Both routes agree.
@endbody
@endstep
@verify
methods: units,alt,limit
status: pass
notes: Work-energy gives v = sqrt(2(32.1)/5.0) = 3.6 m/s, matching kinematics; with mu_k = 0 the formula reduces to a = g sin(theta) = 4.9 m/s^2.
@endverify
@uncertainty
assumption: g = 9.81 m/s^2; the block is released from rest
low_confidence: none
check: Confirm the friction coefficient given is kinetic, not static
@enduncertainty
@solution
The block accelerates at $a = g(\sin\theta - \mu_k\cos\theta) = 3.2\ \text{m/s}^2$ down the incline and reaches $v = 3.6\ \text{m/s}$ after sliding $2.0\ \text{m}$ from rest.
@endsolution
@end`;

// The model answers inside a fenced block tagged `stemlm`; built here because a raw template
// literal cannot hold the fence's own backticks.
const FENCE = '`'.repeat(3);
export const DEMO_ANSWER_TEXT = `${FENCE}stemlm\n${BODY}\n${FENCE}`;

export const DEMO_QUESTION =
  "A 5.0 kg block is released from rest on a 30° incline. The coefficient of kinetic friction is 0.20. Find the block's acceleration and its speed after it has slid 2.0 m.";

/** `null` only if the parser no longer accepts the text above; the page then leaves the demo out. */
export const DEMO_CAPSULE: Capsule | null = parse(DEMO_ANSWER_TEXT).capsule ?? null;
