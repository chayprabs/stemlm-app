/**
 * Demo answers for the visual harness. They are format fixtures for screenshots,
 * written the way a chat model answers; they are not shipped with the extension.
 */

export const INCLINE = String.raw`@meta
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

export const CIRCUIT = String.raw`@meta
version: 2
subject: Electrical
topic: Voltage divider with a load
question: A 12 V source feeds R1 = 2 kΩ in series with R2 = 4 kΩ. A 4 kΩ load is connected across R2. Find the load voltage.
qid: q1
archetype: numeric
level: intro
locale: SI,decimal=.,circuit=IEEE
mode: full
@endmeta
@step id=s1
title: Redraw the divider with its load
@body
$R_2$ and $R_L$ share both nodes, so they are in parallel. $V_{out}$ is the voltage at their common top node.
@endbody
@diagram id=f1 type=circuit
std: ieee
V1: n1 0 DC 12
R1: n1 n2 2k
R2: n2 0 4k
RL: n2 0 4k
probe: V_out=n2
highlight: RL
@enddiagram
@endstep
@step id=s2
title: Combine the parallel pair
@formula id=e1
$$R_p = \frac{R_2 R_L}{R_2 + R_L}$$
@endformula
@body
$$R_p = \frac{(4)(4)}{4+4} = 2\ \text{k}\Omega$$
@endbody
@quickcheck
q: Two equal resistors in parallel give what fraction of one of them?
a: One half, because $R_p = R\cdot R/(2R) = R/2$; here $4/2 = 2\ \text{k}\Omega$.
@endquickcheck
@endstep
@step id=s3
title: Apply the divider rule and verify with current
@formula id=e2
$$V_{out} = V_s\,\frac{R_p}{R_1 + R_p}$$
@endformula
@body
$$V_{out} = 12\cdot\frac{2}{2+2} = 6.0\ \text{V}$$

Check: $I = 12/(4\ \text{k}\Omega) = 3\ \text{mA}$, and $I R_p = (3\ \text{mA})(2\ \text{k}\Omega) = 6.0\ \text{V}$.
@endbody
@endstep
@verify
methods: backsub
status: pass
notes: I = 12 V / 4 kOhm = 3 mA; I*Rp = 3 mA * 2 kOhm = 6.0 V.
@endverify
@uncertainty
assumption: ideal source and resistors
low_confidence: none
check: none
@enduncertainty
@solution
Loading the divider halves the lower leg to $2\ \text{k}\Omega$, so $V_{out} = 6.0\ \text{V}$.
@endsolution
@end`;

export const DIJKSTRA = String.raw`@meta
version: 2
subject: CS
topic: Shortest path with Dijkstra
question: Run Dijkstra's algorithm from A on the graph with edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3. What is the shortest distance to E?
qid: q1
archetype: code
level: undergrad
locale: SI,decimal=.,circuit=IEEE
mode: full
@endmeta
@step id=s1
title: Lay out the weighted graph
@body
Start with $d(A)=0$ and every other distance $\infty$. The frontier holds only A.
@endbody
@diagram id=f1 type=graph
node: A A
node: B B
node: C C
node: D D
node: E E
edge: A B 4
edge: A C 2
edge: C B 1
edge: B D 5
edge: C D 8
edge: D E 3
rankdir: LR
highlight: A
@enddiagram
@endstep
@step id=s2
title: Relax edges in order of smallest tentative distance
@body
Settling A sets $d(B)=4$, $d(C)=2$. Settling C improves $d(B)=2+1=3$ and sets $d(D)=10$. Settling B improves $d(D)=3+5=8$. Settling D sets $d(E)=8+3=11$.
@endbody
@diagram id=f2 type=table
kind: matrix
headers: Settled, A, B, C, D, E
row: A, 0, 4, 2, ∞, ∞
row: C, 0, 3, 2, 10, ∞
row: B, 0, 3, 2, 8, ∞
row: D, 0, 3, 2, 8, 11
highlight: 11
@enddiagram
@quickcheck
q: Why is B settled after C even though the edge A-B exists?
a: Because C has the smaller tentative distance, 2 < 4, and settling C lowers $d(B)$ to $2+1=3$.
@endquickcheck
@endstep
@step id=s3
title: Read off the path and check it
@body
The path is A → C → B → D → E with length $2+1+5+3=11$. The only alternative through C-D costs $2+8+3=13$, so 11 is minimal.
@endbody
@endstep
@verify
methods: alt
status: pass
notes: Alternative A-C-D-E = 2+8+3 = 13 > 11; A-B-D-E = 4+5+3 = 12 > 11.
@endverify
@uncertainty
assumption: edges are undirected with non-negative weights
low_confidence: none
check: none
@enduncertainty
@solution
The shortest distance from A to E is $11$, along A → C → B → D → E.
@endsolution
@end`;

/** A plain answer with no capsule: what a model writes when it ignores the guide. */
export const PLAIN_MARKDOWN = String.raw`To solve the quadratic $2x^2 - 4x - 6 = 0$ we can use the quadratic formula.

### Step 1: Identify the coefficients

Comparing with $ax^2 + bx + c = 0$ gives $a = 2$, $b = -4$, $c = -6$.

### Step 2: Compute the discriminant

$$\Delta = b^2 - 4ac = (-4)^2 - 4(2)(-6) = 16 + 48 = 64$$

Since $\Delta > 0$ there are two distinct real roots.

### Step 3: Apply the quadratic formula

$$x = \frac{-b \pm \sqrt{\Delta}}{2a} = \frac{4 \pm 8}{4}$$

So $x_1 = 3$ and $x_2 = -1$.

**Final answer:** $x = 3$ or $x = -1$.`;
