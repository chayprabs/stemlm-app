/** Math exam prompts — questions only; solutions/diagrams come from Gemini at runtime. */
import type { MathPromptDef } from './types';

export const MATH_PROMPTS: MathPromptDef[] = [
  {
    "id": "q01",
    "number": 1,
    "topic": "Limits and L Hopital",
    "question": "Evaluate (a) lim_{x→0} (e^x-1-x-x²/2)/x³, (b) lim_{x→∞} x²ln(1+1/x)-x, (c) lim_{x→0+} x^x. For (c), explain why direct substitution fails."
  },
  {
    "id": "q02",
    "number": 2,
    "topic": "Continuity and differentiability at a point",
    "question": "Let f(x)=x^2\\sin(1/x) for x \\neq 0 and f(0)=0. Show (a) f is continuous at 0, (b) f'(0)=0, and (c) f' is not continuous at 0, so f is not C^1."
  },
  {
    "id": "q03",
    "number": 3,
    "topic": "Partial derivatives, gradients, and critical points",
    "question": "Let f(x,y)=x^3y-xy^3. Compute the partial derivatives, the gradient at (1,1), the directional derivative in the unit direction u=(3,-4)/5, and find and classify the critical points."
  },
  {
    "id": "q04",
    "number": 4,
    "topic": "Taylor series and remainder estimates",
    "question": "Find the Maclaurin polynomial for ln(1+x) through x^5, use it to approximate ln(1.2), and bound the error with a Lagrange remainder estimate. Show that a 5-term truncation gives error less than 10^-4."
  },
  {
    "id": "q05",
    "number": 5,
    "topic": "Polar, cylindrical, and triple integrals",
    "question": "Evaluate (a) \\iint_R (x^2+y^2)\\,dA over the polar region r=2\\cos\\theta, and (b) \\iiint_V z\\,dV where V lies between z=4-x^2-y^2 and z=x^2+y^2."
  },
  {
    "id": "q06",
    "number": 6,
    "topic": "Green and Stokes theorems",
    "question": "Use (a) Green's theorem to evaluate \\oint_C (y^2\\,dx+x^2\\,dy) where C is the counterclockwise triangle with vertices (0,0), (1,0), (0,1), and (b) Stokes' theorem for F=(xz,yz,xy) on the paraboloid z=1-x^2-y^2 above z=0 with upward orientation."
  },
  {
    "id": "q07",
    "number": 7,
    "topic": "Rank, null space, and column space",
    "question": "Let $$A=\\begin{bmatrix}1&2&-1&3\\\\2&4&1&5\\\\-1&-2&3&-1\\\\3&6&0&8\\end{bmatrix}.$$ Row reduce $A$, determine $\\operatorname{rank}(A)$, find a basis for $\\mathcal N(A)$ and a basis for $\\operatorname{Col}(A)$, and verify the rank-nullity theorem."
  },
  {
    "id": "q08",
    "number": 8,
    "topic": "Eigenvalues, diagonalization, and matrix powers",
    "question": "For the matrix $$A=\\begin{bmatrix}4&1&0\\\\2&3&0\\\\0&0&5\\end{bmatrix},$$ find the eigenvalues and corresponding eigenvectors, show that this matrix is diagonalizable, and compute $A^{10}$."
  },
  {
    "id": "q09",
    "number": 9,
    "topic": "Gram-Schmidt and Legendre polynomials",
    "question": "Apply Gram-Schmidt to the basis $\\{1,x,x^2\\}$ in $P_2$ with inner product $$\\langle f,g\\rangle=\\int_{-1}^1 f(x)g(x)\\,dx.$$ Produce an orthogonal (or orthonormal) basis, project $x^3$ onto $\\operatorname{span}\\{1,x,x^2\\}$, and explain the connection with Legendre polynomials."
  },
  {
    "id": "q10",
    "number": 10,
    "topic": "Singular value decomposition and least squares",
    "question": "For the matrix $$B=\\begin{bmatrix}3&0\\\\4&0\\\\0&5\\end{bmatrix},$$ find an SVD of this matrix, compute the pseudoinverse $B^+$, and solve the least-squares problem for $$b=(1,1,1)^T.$$"
  },
  {
    "id": "q11",
    "number": 11,
    "topic": "Quadratic forms and orthogonal diagonalization",
    "question": "Consider the quadratic form $$Q(x)=2x_1^2+4x_1x_2+5x_2^2-2x_2x_3+x_3^2.$$ Find the symmetric matrix $A$ with $Q(x)=x^TAx$, determine the eigenvalues of $A$, orthogonally diagonalize $A$, and show that the minimum of $Q(x)$ on the unit sphere $\\lVert x\\rVert=1$ is the smallest eigenvalue."
  },
  {
    "id": "q12",
    "number": 12,
    "topic": "Divergence theorem and flux integrals",
    "question": "Let $\\mathbf F(x,y,z)=(x^2,y^2,z^2)$ and $S$ be the outward-oriented unit sphere $x^2+y^2+z^2=1$. Evaluate (a) the surface integral $\\iint_S \\mathbf F\\cdot d\\mathbf S$ directly, (b) the same flux using the divergence theorem, and (c) verify that $\\nabla\\cdot\\mathbf F$ integrates to the same value over the unit ball."
  },
  {
    "id": "q13",
    "number": 13,
    "topic": "Fourier series and orthogonal expansions",
    "question": "Find the Fourier series of $f(x)=x$ on $(-\\pi,\\pi)$. Compute the coefficients $a_n$ and $b_n$, sketch the $2\\pi$-periodic extension, and use Parseval's identity to evaluate $\\sum_{n=1}^\\infty 1/n^2$."
  },
  {
    "id": "q14",
    "number": 14,
    "topic": "Laplace transforms for differential equations",
    "question": "Solve the initial-value problem $y''+2y'+5y=\\cos t$ with $y(0)=1$, $y'(0)=0$ using the Laplace transform. Show each partial-fraction decomposition step and invert the transform to obtain $y(t)$."
  },
  {
    "id": "q15",
    "number": 15,
    "topic": "Second-order linear ODEs with constant coefficients",
    "question": "Find the general solution of $y^{(4)}-5y''+4y=0$. Then solve $y^{(4)}-5y''+4y=e^{2x}+\\sin x$ by undetermined coefficients and verify the answer by substitution."
  },
  {
    "id": "q16",
    "number": 16,
    "topic": "Systems of linear differential equations",
    "question": "For the system $\\mathbf x'=A\\mathbf x$ with $$A=\\begin{bmatrix}1&2\\\\2&1\\end{bmatrix},$$ find eigenvalues and eigenvectors, write the general solution, and determine the stability of the origin. If $\\mathbf x(0)=(3,1)^T$, compute $\\mathbf x(t)$ explicitly."
  },
  {
    "id": "q17",
    "number": 17,
    "topic": "Conditional probability and Bayes theorem",
    "question": "A diagnostic test has sensitivity $0.95$ and specificity $0.90$. If the disease prevalence is $0.02$, compute (a) $P(\\text{disease}\\mid\\text{positive})$, (b) $P(\\text{no disease}\\mid\\text{negative})$, and (c) explain how Bayes' theorem combines the likelihoods with the prior."
  },
  {
    "id": "q18",
    "number": 18,
    "topic": "Combinatorics and counting principles",
    "question": "Combinatorics counting: how many ways can 12 distinct books be arranged on a shelf if 3 specific books must stay together? How many 5-card poker hands contain exactly one pair? Prove both results using permutations and combinations."
  },
  {
    "id": "q19",
    "number": 19,
    "topic": "Binomial theorem and generating identities",
    "question": "Expand $(1+x)^{10}$ through the $x^4$ term using the binomial theorem. Then prove that $\\sum_{k=0}^n \\binom{n}{k}=2^n$ and $\\sum_{k=0}^n (-1)^k\\binom{n}{k}=0$ for $n\\ge1$ by evaluating $(1+x)^n$ at $x=1$ and $x=-1$."
  },
  {
    "id": "q20",
    "number": 20,
    "topic": "Modular arithmetic and the Chinese Remainder Theorem",
    "question": "Solve the congruence system $x\\equiv 2\\pmod 3$, $x\\equiv 3\\pmod 5$, $x\\equiv 4\\pmod 7$ using the Chinese Remainder Theorem. Verify the solution and state the least positive residue."
  },
  {
    "id": "q21",
    "number": 21,
    "topic": "Series convergence tests",
    "question": "Determine whether each series converges: (a) $\\sum_{n=2}^\\infty \\frac{1}{n\\ln n}$, (b) $\\sum_{n=1}^\\infty \\frac{n^2}{2^n}$, (c) $\\sum_{n=1}^\\infty \\frac{(-1)^{n+1}}{\\sqrt n}$. Name the test used in each case and justify absolute or conditional convergence."
  },
  {
    "id": "q22",
    "number": 22,
    "topic": "Power series and radius of convergence",
    "question": "Find the radius and interval of convergence of $\\sum_{n=1}^\\infty \\frac{(x-1)^n}{n4^n}$. Check endpoints separately and express the sum as a closed form when $|x-1|<4$."
  },
  {
    "id": "q23",
    "number": 23,
    "topic": "Implicit function theorem and level curves",
    "question": "For $F(x,y)=x^3+y^3-3xy=0$, use implicit differentiation to find $dy/dx$ at $(2,1)$. Determine where the level curve has vertical tangents and sketch the nodal cubic near the origin."
  },
  {
    "id": "q24",
    "number": 24,
    "topic": "Jacobian and change of variables in multiple integrals",
    "question": "Evaluate $\\iint_D (x^2+y^2)\\,dA$ where $D$ is the ellipse $x^2/4+y^2/9\\le1$ by the substitution $x=2u$, $y=3v$. Compute the Jacobian determinant and verify the result in Cartesian coordinates."
  },
  {
    "id": "q25",
    "number": 25,
    "topic": "Conservative vector fields and potential functions",
    "question": "Show that $\\mathbf F(x,y)=(2xy+y^2,\\,x^2+2xy)$ is conservative on $\\mathbb R^2$, find a potential function $\\phi$ with $\\nabla\\phi=\\mathbf F$, and evaluate $\\int_C \\mathbf F\\cdot d\\mathbf r$ from $(0,0)$ to $(2,3)$ along any smooth path."
  },
  {
    "id": "q26",
    "number": 26,
    "topic": "Surface integrals and parametrized surfaces",
    "question": "Parametrize the paraboloid $z=x^2+y^2$ for $0\\le z\\le4$ and compute $\\iint_S z\\,dS$. Then find the surface area of the same patch and compare with the lateral area of the circumscribing cylinder."
  },
  {
    "id": "q27",
    "number": 27,
    "topic": "Vector calculus identities",
    "question": "Vector calculus: prove the identities (a) $\\nabla\\cdot(\\nabla\\times\\mathbf F)=0$, (b) $\\nabla\\times(\\nabla f)=\\mathbf 0$, and (c) $\\nabla\\cdot(f\\mathbf F)=f\\nabla\\cdot\\mathbf F+\\mathbf F\\cdot\\nabla f$ for smooth scalar $f$ and vector field $\\mathbf F$."
  },
  {
    "id": "q28",
    "number": 28,
    "topic": "Separation of variables for the heat equation",
    "question": "Solve the one-dimensional heat equation $u_t=\\alpha^2 u_{xx}$ on $0<x<\\pi$ with $u(0,t)=u(\\pi,t)=0$ and $u(x,0)=\\sin(3x)$. Find the series solution, state how many modes contribute, and sketch $u(x,t)$ at $t=0$ and $t=\\pi^2/(9\\alpha^2)$."
  },
  {
    "id": "q29",
    "number": 29,
    "topic": "Discrete Fourier transform",
    "question": "Compute the DFT of the sequence $(1,2,1,-1)$. Recover the original sequence by the inverse DFT and explain how orthogonality of complex exponentials underlies the transform."
  },
  {
    "id": "q30",
    "number": 30,
    "topic": "Numerical integration and Simpson error bounds",
    "question": "Approximate $\\int_0^1 e^{-x^2}\\,dx$ using Simpson's rule with $n=4$ subintervals. Bound the truncation error using the standard Simpson error formula and compare with the trapezoidal rule on the same partition."
  },
  {
    "id": "q31",
    "number": 31,
    "topic": "Newton-Raphson root finding",
    "question": "Use Newton's method to approximate a root of $f(x)=x^3-x-1$ starting from $x_0=1.5$. Carry out three iterations, estimate the local convergence rate, and prove quadratic convergence when $f'(x^*)\\neq0$."
  },
  {
    "id": "q32",
    "number": 32,
    "topic": "Fixed-point iteration and contraction mappings",
    "question": "Rewrite $x=\\cos x$ as a fixed-point problem and iterate $x_{n+1}=\\cos x_n$ from $x_0=0.5$. Prove that the map is a contraction on $[0,1]$ and hence the iteration converges to the unique solution of $x=\\cos x$."
  },
  {
    "id": "q33",
    "number": 33,
    "topic": "Lagrange interpolation polynomials",
    "question": "Construct the Lagrange interpolating polynomial of degree $\\le2$ through $(0,1)$, $(1,3)$, and $(2,2)$. Express it in monomial form and verify that the interpolant matches all data points."
  },
  {
    "id": "q34",
    "number": 34,
    "topic": "LU decomposition and triangular systems",
    "question": "Factor $$A=\\begin{bmatrix}2&1&0\\\\4&3&1\\\\0&2&2\\end{bmatrix}$$ as $PA=LU$ with partial pivoting. Solve $A\\mathbf x=(1,2,3)^T$ using forward and back substitution."
  },
  {
    "id": "q35",
    "number": 35,
    "topic": "QR factorization and orthonormal bases",
    "question": "Apply Gram-Schmidt (or Householder QR) to the columns of $$B=\\begin{bmatrix}1&1\\\\1&2\\\\1&3\\end{bmatrix}$$ to obtain $B=QR$. Verify $Q^TQ=I$ and use $R$ to solve the least-squares problem $\\min\\|B\\mathbf x-(1,0,0)^T\\|$."
  },
  {
    "id": "q36",
    "number": 36,
    "topic": "Matrix condition number and perturbation analysis",
    "question": "For $$A=\\begin{bmatrix}1&1\\\\1&1.0001\\end{bmatrix},$$ compute $\\kappa_2(A)=\\|A\\|_2\\|A^{-1}\\|_2$. If $\\mathbf b$ is perturbed by $\\delta\\mathbf b$ with $\\|\\delta\\mathbf b\\|/\\|\\mathbf b\\|=10^{-8}$, bound the relative error in $\\mathbf x$ solving $A\\mathbf x=\\mathbf b$."
  },
  {
    "id": "q37",
    "number": 37,
    "topic": "Markov chains and steady-state distributions",
    "question": "A two-state Markov chain has transition matrix $$P=\\begin{bmatrix}0.7&0.3\\\\0.4&0.6\\end{bmatrix}.$$ Find the steady-state distribution $\\boldsymbol\\pi$ with $\\boldsymbol\\pi P=\\boldsymbol\\pi$ and $\\sum_i \\pi_i=1$, and compute the expected return time to state 1."
  },
  {
    "id": "q38",
    "number": 38,
    "topic": "Probability distributions and moments",
    "question": "Let $X\\sim\\mathrm{Binomial}(n,p)$. Derive $E[X]$, $\\mathrm{Var}(X)$, and the probability generating function. For $n=10$, $p=0.3$, compute $P(X\\ge4)$ exactly."
  },
  {
    "id": "q39",
    "number": 39,
    "topic": "Moment generating functions",
    "question": "Find the moment generating function of an exponential random variable with rate $\\lambda$. Use it to compute the first four moments and verify the variance $\\lambda^{-2}$."
  },
  {
    "id": "q40",
    "number": 40,
    "topic": "Central limit theorem application",
    "question": "An assembly line produces parts with mean weight $100$ g and standard deviation $2$ g. For a sample of $n=64$ parts, approximate $P(99.5<\\bar X<100.5)$ using the central limit theorem and justify the normal approximation."
  },
  {
    "id": "q41",
    "number": 41,
    "topic": "Hypothesis testing for a normal mean",
    "question": "Test $H_0:\\mu=50$ versus $H_1:\\mu\\neq50$ at $\\alpha=0.05$ given a random sample with $\\bar x=52.3$, $s=4.1$, $n=25$. Report the test statistic, $p$-value, and conclusion assuming approximate normality."
  },
  {
    "id": "q42",
    "number": 42,
    "topic": "Confidence intervals for proportions",
    "question": "In a survey of $400$ voters, $220$ support a proposition. Construct a $95\\%$ confidence interval for the population proportion using both the Wald and Wilson score methods and compare interval widths."
  },
  {
    "id": "q43",
    "number": 43,
    "topic": "Multiple linear regression",
    "question": "Fit the model $y=\\beta_0+\\beta_1 x_1+\\beta_2 x_2+\\varepsilon$ to the data $(x_1,x_2,y)$: $(1,0,2)$, $(0,1,1)$, $(1,1,3)$, $(2,1,4)$. Find the least-squares estimates, the fitted values, and $R^2$."
  },
  {
    "id": "q44",
    "number": 44,
    "topic": "Bayesian inference with conjugate priors",
    "question": "For $X\\mid\\theta\\sim\\mathrm{Poisson}(\\theta)$ with prior $\\theta\\sim\\mathrm{Gamma}(\\alpha,\\beta)$, derive the posterior distribution after observing $x_1,\\ldots,x_n$. With $\\alpha=2$, $\\beta=1$, and data $(3,1,4)$, compute the posterior mean and a $90\\%$ credible interval."
  },
  {
    "id": "q45",
    "number": 45,
    "topic": "Lagrange multipliers and constrained optimization",
    "question": "Find the maximum and minimum of $f(x,y)=x^2+y^2$ subject to $x^2+xy+y^2=1$ using Lagrange multipliers. Identify all critical points and classify them with the bordered Hessian."
  },
  {
    "id": "q46",
    "number": 46,
    "topic": "Convex functions and Jensen inequality",
    "question": "Prove that $f(x)=e^x$ is convex on $\\mathbb R$. Use Jensen's inequality to show that for positive weights $w_i$ summing to 1, $\\exp(\\sum w_i x_i)\\le\\sum w_i e^{x_i}$, with equality iff all $x_i$ are equal."
  },
  {
    "id": "q47",
    "number": 47,
    "topic": "Linear programming and graphical solution",
    "question": "Maximize $3x+2y$ subject to $x+y\\le4$, $2x+y\\le5$, $x\\ge0$, $y\\ge0$. Graph the feasible region, identify corner points, evaluate the objective at each vertex, and state the optimal solution."
  },
  {
    "id": "q48",
    "number": 48,
    "topic": "Dynamic programming knapsack problem",
    "question": "Discrete mathematics optimization: solve the 0-1 knapsack problem with capacity $W=7$ and items (weight, value): $(2,3)$, $(3,4)$, $(4,5)$, $(5,8)$ by filling a recurrence table. Recover the optimal item set and prove the recurrence relation used."
  },
  {
    "id": "q49",
    "number": 49,
    "topic": "Linear recurrence relations",
    "question": "Solve the linear recurrence relation $a_{n+2}-5a_{n+1}+6a_n=2^n$ with $a_0=0$, $a_1=1$. Find the homogeneous and particular terms and a closed-form sequence for $a_n$."
  },
  {
    "id": "q50",
    "number": 50,
    "topic": "Generating functions and coefficient extraction",
    "question": "Find the ordinary generating function for the sequence $a_n=\\binom{n+2}{2}$. Use partial fractions or differentiation to extract a closed form and verify the first five terms."
  },
  {
    "id": "q51",
    "number": 51,
    "topic": "Inclusion-exclusion principle",
    "question": "How many integers from 1 to 1000 are divisible by 2, 3, or 5? Solve using the inclusion-exclusion principle and show the general formula for $|A\\cup B\\cup C|$."
  },
  {
    "id": "q52",
    "number": 52,
    "topic": "Group theory and cyclic groups",
    "question": "Prove that every subgroup of a cyclic group is cyclic. Describe all subgroups of $\\mathbb Z_{24}$ and list the elements of order 8 in $\\mathbb Z_{24}$."
  },
  {
    "id": "q53",
    "number": 53,
    "topic": "Symmetric groups and permutations",
    "question": "Group theory permutations: write $\\sigma=(1\\,3\\,5)(2\\,4)$ in $S_5$ as a composition of transpositions. Compute $\\sigma^3$, $\\operatorname{sgn}(\\sigma)$, and the order of $\\sigma$."
  },
  {
    "id": "q54",
    "number": 54,
    "topic": "Ring theory and ideals in Z",
    "question": "Ring theory: show that every ideal in $\\mathbb Z$ is principal. Determine which of the following are prime ideals: $(6)$, $(7)$, $(12)$. Decompose the quotient ring $\\mathbb Z/(12)$ into a direct sum of fields."
  },
  {
    "id": "q55",
    "number": 55,
    "topic": "Polynomial rings and irreducibility",
    "question": "Decide whether $x^4+x+1$ is irreducible over $\\mathbb Q$ using Eisenstein's criterion or reduction modulo $p$. If reducible, factor it completely in $\\mathbb Q[x]$."
  },
  {
    "id": "q56",
    "number": 56,
    "topic": "Finite fields and modular polynomial arithmetic",
    "question": "Construct the field $\\mathbb F_8$ as $\\mathbb F_2[x]/(x^3+x+1)$. List all elements, give addition and multiplication tables for a primitive element, and compute the multiplicative inverse of $x^2+1$."
  },
  {
    "id": "q57",
    "number": 57,
    "topic": "Boolean algebra simplification",
    "question": "Boolean algebra: simplify the expression $(A+B)(A'+C)(B+C)$ using algebraic identities. Draw the corresponding Karnaugh map and verify that the minimal sum-of-products matches your simplification."
  },
  {
    "id": "q58",
    "number": 58,
    "topic": "Mathematical induction",
    "question": "Prove by mathematical induction that every integer $n\\ge2$ factors uniquely into primes in number theory. Then use induction to show the summation identity $1^2+2^2+\\cdots+n^2=n(n+1)(2n+1)/6$."
  },
  {
    "id": "q59",
    "number": 59,
    "topic": "Countable and uncountable sets",
    "question": "Prove that $\\mathbb Q$ is countable by an explicit enumeration. Show that the set of finite binary sequences is countable but the set of all infinite binary sequences is uncountable using Cantor's diagonal argument."
  },
  {
    "id": "q60",
    "number": 60,
    "topic": "Metric spaces and completeness",
    "question": "Show that $(C[0,1],\\|\\cdot\\|_\\infty)$ is a complete metric space. Give an example of a Cauchy sequence in $(\\mathbb Q,|\\cdot|)$ that does not converge in $\\mathbb Q$ and explain why completeness fails."
  },
  {
    "id": "q61",
    "number": 61,
    "topic": "Normed spaces and the Banach fixed-point theorem",
    "question": "On the Banach space $(C[0,1],\\|\\cdot\\|_\\infty)$, define $T(f)(x)=\\int_0^x f(t)\\,dt$. Prove $T$ is a contraction with constant 1 (hence not directly applying Banach) and modify the setup to apply the fixed-point theorem to $f(x)=\\frac12\\cos x+\\frac12\\int_0^x f(t)\\,dt$."
  }
] as MathPromptDef[];

export function getMathPromptByNumber(n: number): MathPromptDef | undefined {
  return MATH_PROMPTS.find((q) => q.number === n);
}
