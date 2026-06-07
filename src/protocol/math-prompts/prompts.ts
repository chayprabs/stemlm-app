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
    "topic": "Exact differential equations and integrating factors",
    "question": "Solve the exact differential equation $$(2xy+y^2)\\,dx+(x^2+2xy)\\,dy=0,$$ and then find an integrating factor for $$(y^2-xy)\\,dx+x^2\\,dy=0$$ so that the second equation becomes exact and can be integrated."
  },
  {
    "id": "q13",
    "number": 13,
    "topic": "Variation of parameters for a second-order ODE",
    "question": "Solve the initial value problem $$y''-3y'+2y=\\frac{e^x}{1+e^x},\\qquad y(0)=0,\\qquad y'(0)=1,$$ using variation of parameters."
  },
  {
    "id": "q14",
    "number": 14,
    "topic": "Bessel equation of order 1/2 and Frobenius series",
    "question": "Solve $$x^2y''+xy'+\\left(x^2-\\frac14\\right)y=0$$ by the Frobenius method. Identify the equation as a Bessel equation of order $1/2$, derive the two series solutions, and connect them to $J_{1/2}(x)$ and $J_{-1/2}(x)$."
  },
  {
    "id": "q15",
    "number": 15,
    "topic": "Linear systems and phase portraits",
    "question": "For the linear system $$\\frac{d}{dt}\\begin{bmatrix}x\\\\y\\end{bmatrix}=\\begin{bmatrix}1&-4\\\\1&-3\\end{bmatrix}\\begin{bmatrix}x\\\\y\\end{bmatrix},$$ determine the eigenstructure, write the general solution, and sketch the phase portrait."
  },
  {
    "id": "q16",
    "number": 16,
    "topic": "Laplace transforms with a rectangular pulse",
    "question": "Solve $$y''+4y=g(t),\\qquad y(0)=0,\\qquad y'(0)=0,$$ by Laplace transforms when $$g(t)=1\\text{ for }0\\le t<\\pi,\\qquad g(t)=0\\text{ for }t\\ge\\pi.$$"
  },
  {
    "id": "q17",
    "number": 17,
    "topic": "Sturm-Liouville eigenvalues and eigenfunctions",
    "question": "Solve the boundary-value problem $$y''+\\lambda y=0,\\qquad y(0)=0,\\qquad y'(L)=0.$$ Find all eigenvalues and eigenfunctions."
  },
  {
    "id": "q18",
    "number": 18,
    "topic": "Analyticity and harmonic conjugates",
    "question": "Discuss the analyticity of $$f(z)=z^2\\bar z,$$ and find a harmonic conjugate for $$u(x,y)=x^3-3xy^2+2x.$$"
  },
  {
    "id": "q19",
    "number": 19,
    "topic": "Cauchy integral formula and contour evaluation",
    "question": "Evaluate $$\\oint_{|z|=2}\\frac{e^z}{z^2(z-1)}\\,dz$$ and discuss $$\\oint_{|z-i|=2}\\frac{\\cos z}{(z^2+1)^2}\\,dz.$$ For the second integral, first determine where the poles lie relative to the contour."
  },
  {
    "id": "q20",
    "number": 20,
    "topic": "Residue theorem for real integrals",
    "question": "Evaluate by residues $$\\int_{-\\infty}^{\\infty}\\frac{x^2}{(x^2+1)(x^2+4)}\\,dx$$ and $$\\int_0^{2\\pi}\\frac{d\\theta}{2+\\cos\\theta}.$$"
  },
  {
    "id": "q21",
    "number": 21,
    "topic": "Laurent series, singularities, and residues",
    "question": "Find the Laurent series expansions for the complex functions $$\\dfrac{\\sin z}{z^3}$$ and $$\\dfrac{1}{z^2(1-z)}$$ about their singular points. Classify the singularities and compute the relevant residues."
  },
  {
    "id": "q22",
    "number": 22,
    "topic": "Mobius maps, disk geometry, and Laplace on the upper half-plane",
    "question": "Let $$\\phi(z)=\\frac{z-i}{z+i}.$$ Show that this Mobius map sends the upper half-plane $$H=\\{x+iy:y>0\\}$$ conformally onto the unit disk $$D=\\{w:|w|<1\\}$$, find the inverse map, determine the image of the real axis and of the point $z=i$, and solve Laplace's equation on $H$ with boundary data $$U(x,0)=\\frac{x^2-1}{x^2+1}$$ by transporting the harmonic disk function $v(w)=\\operatorname{Re}w$."
  },
  {
    "id": "q23",
    "number": 23,
    "topic": "Probability density normalization and Gamma moments",
    "question": "A continuous random variable has density $$f(x)=cx^2e^{-x},\\qquad x\\ge 0,$$ and $f(x)=0$ for $x<0$. Find the normalizing constant $c$, compute $E[X]$ and $\\operatorname{Var}(X)$, and identify the distribution as a Gamma law."
  },
  {
    "id": "q24",
    "number": 24,
    "topic": "Joint densities, marginals, covariance, and a triangular probability",
    "question": "Let $X$ and $Y$ have joint density $$f(x,y)=6xy^2,\\qquad 0<x<1,\\ 0<y<1,$$ and $f(x,y)=0$ otherwise. Find the marginal densities of $X$ and $Y$, compute $\\operatorname{Cov}(X,Y)$, and evaluate $P(X+Y<1)$."
  },
  {
    "id": "q25",
    "number": 25,
    "topic": "Confidence interval and z-test for a population mean",
    "question": "A machine produces bolts whose lengths are normally distributed with known standard deviation $\\sigma=0.4$ cm. A sample of size $n=64$ has mean length $\\bar x=10.08$ cm. Construct a 95% confidence interval for the true mean $\\mu$, and test $$H_0:\\mu=10\\quad\\text{versus}\\quad H_1:\\mu\\ne 10$$ at the 5% significance level."
  },
  {
    "id": "q26",
    "number": 26,
    "topic": "Gamma MGF, moments, and sums of independent Gamma variables",
    "question": "Let $X\\sim \\operatorname{Gamma}(\\alpha,\\lambda)$ in the shape-rate convention, so $$f_X(x)=\\frac{\\lambda^\\alpha}{\\Gamma(\\alpha)}x^{\\alpha-1}e^{-\\lambda x},\\qquad x>0.$$ Find the moment generating function, use it to compute $E[X]$ and $\\operatorname{Var}(X)$, and show that the sum of independent Gamma variables with the same rate is again Gamma."
  },
  {
    "id": "q27",
    "number": 27,
    "topic": "Finite Markov chains: stationary law, return time, and two-step transitions",
    "question": "Consider the three-state Markov chain with transition matrix $$P=\\begin{bmatrix}\\tfrac12&\\tfrac12&0\\\\[2pt]\\tfrac14&\\tfrac12&\\tfrac14\\\\[2pt]0&\\tfrac12&\\tfrac12\\end{bmatrix}.$$ Find the stationary distribution $\\pi$, compute the mean return time to state $1$, and evaluate the two-step transition probability $P^2_{13}$."
  },
  {
    "id": "q28",
    "number": 28,
    "topic": "Heat equation on a finite interval by separation of variables",
    "question": "Solve the heat equation $$u_t=ku_{xx},\\qquad 0<x<L,\\ t>0,$$ with boundary conditions $$u(0,t)=u(L,t)=0$$ and initial condition $$u(x,0)=x(L-x).$$ Use separation of variables and express the solution as a sine series."
  },
  {
    "id": "q29",
    "number": 29,
    "topic": "Wave equation with Gaussian initial data and D'Alembert's formula",
    "question": "Solve the one-dimensional wave equation $$u_{tt}=c^2u_{xx},\\qquad -\\infty<x<\\infty,$$ with initial conditions $$u(x,0)=e^{-x^2},\\qquad u_t(x,0)=0.$$ Use D'Alembert's formula and simplify the answer."
  },
  {
    "id": "q30",
    "number": 30,
    "topic": "Laplace equation on a disk from Fourier boundary data",
    "question": "Solve Laplace's equation in the disk $0\\le r<a$ with boundary condition $$u(a,\\theta)=1+3\\cos\\theta-2\\sin 2\\theta.$$ Give the harmonic function $u(r,\\theta)$ that is regular at the center."
  },
  {
    "id": "q31",
    "number": 31,
    "topic": "Heat equation on the line and the error-function profile",
    "question": "Solve the heat equation $$u_t=ku_{xx},\\qquad -\\infty<x<\\infty,\\ t>0,$$ with initial data $$u(x,0)=\\begin{cases}1,&|x|<1,\\\\0,&|x|>1.\\end{cases}$$ Express the solution using the heat kernel and simplify it to an error-function formula."
  },
  {
    "id": "q32",
    "number": 32,
    "topic": "First-order PDE by characteristics",
    "question": "Solve the first-order PDE $$u_x+2xu_y=0$$ with initial condition $$u(0,y)=e^{-y^2}$$ using the method of characteristics."
  },
  {
    "id": "q33",
    "number": 33,
    "topic": "Newton-Raphson versus bisection",
    "question": "In numerical analysis, compare the Newton-Raphson method and the bisection method for finding the real root of the cubic polynomial $$x^3-2x-5=0.$$ Use bisection on the interval $[2,3]$ and Newton-Raphson with initial guess $x_0=2$."
  },
  {
    "id": "q34",
    "number": 34,
    "topic": "Gaussian quadrature on [-1, 1]",
    "question": "Use Gauss-Legendre quadrature to approximate $$\\int_{-1}^1 e^{x^2}\\,dx$$ with the 2-point and 3-point rules, and compare the results."
  },
  {
    "id": "q35",
    "number": 35,
    "topic": "Runge-Kutta fourth order method",
    "question": "Use the classical RK4 method with step size $$h=0.2$$ to approximate the solution of $$y'=y-t^2+1,\\qquad y(0)=0.5.$$ Compute the approximations at $$t=0.2$$ and $$t=0.4$$."
  },
  {
    "id": "q36",
    "number": 36,
    "topic": "LU decomposition and condition number",
    "question": "In this 3x3 linear algebra problem, solve the matrix system $$Ax=b$$ using LU decomposition for $$A=\\begin{bmatrix}3&1&0\\\\1&4&1\\\\0&1&3\\end{bmatrix},\\qquad b=\\begin{bmatrix}4\\\\6\\\\4\\end{bmatrix},$$ and compute the infinity-norm condition number of $A$."
  },
  {
    "id": "q37",
    "number": 37,
    "topic": "Newton divided differences",
    "question": "Using the data points $$(0,1),\\ (1,3),\\ (2,7),\\ (3,13),$$ construct the Newton divided-difference interpolating polynomial and simplify it. Show that it equals $$f(x)=x^2+x+1.$$"
  },
  {
    "id": "q38",
    "number": 38,
    "topic": "Power method for a dominant eigenvalue",
    "question": "Apply the power method to the matrix $$A=\\begin{bmatrix}4&1\\\\2&3\\end{bmatrix}$$ to approximate its dominant eigenvalue, starting from $$x^{(0)}=(1,0)^T.$$ Normalize each iterate by its largest component, and carry out four iterations."
  },
  {
    "id": "q39",
    "number": 39,
    "topic": "Subgroups and cosets of Z_12",
    "question": "In abstract algebra and modular arithmetic, describe all subgroups of the additive group $$\\mathbb Z_{12}$$ and compute the cosets of $$H=\\{0,4,8\\}.$$"
  },
  {
    "id": "q40",
    "number": 40,
    "topic": "Quotient rings and Gaussian integers",
    "question": "Show that $$\\mathbb Z[x]/(x^2+1)\\cong \\mathbb Z[i].$$ Then determine whether the ideal $$(x^2+1)$$ is prime, maximal, both, or neither in $$\\mathbb Z[x].$$"
  },
  {
    "id": "q41",
    "number": 41,
    "topic": "Chinese Remainder Theorem and modular arithmetic",
    "question": "Use the Chinese Remainder Theorem to solve $$x\\equiv 2\\pmod 3,\\qquad x\\equiv 3\\pmod 5,\\qquad x\\equiv 2\\pmod 7,$$ and compute $$2^{100}\\pmod{35}.$$"
  },
  {
    "id": "q42",
    "number": 42,
    "topic": "Finite fields and multiplicative order in F_8",
    "question": "Let $p(x)=x^3+x+1\\in \\mathbf F_2[x]$ and let $\\alpha$ be the class of $x$ in $\\mathbf F_2[x]/(p(x))$. Show that $p$ is irreducible over $\\mathbf F_2$, list the eight elements of the quotient field, reduce powers of $\\alpha$, and determine the multiplicative order of each nonzero element."
  },
  {
    "id": "q43",
    "number": 43,
    "topic": "Uniform convergence, completeness, and Arzela-Ascoli",
    "question": "For $f_n(x)=x^n$ on $[0,1]$, determine the pointwise limit and decide whether the convergence is uniform. Explain how the completeness of $C[0,1]$ fits into that conclusion. Then analyze $g_n(x)=\\sin(nx)/n$ on $[0,1]$ and use Arzela-Ascoli to explain why that family converges uniformly to $0$."
  },
  {
    "id": "q44",
    "number": 44,
    "topic": "Pointwise limit, non-uniform convergence, and exchanging integral and limit",
    "question": "Let $f_n(x)=\\frac{nx}{1+n^2x^2}$ on $[0,1]$. Find the pointwise limit, show that the convergence is not uniform, compute $\\int_0^1 f_n(x)\\,dx$, and justify whether the limit may be exchanged with the integral."
  },
  {
    "id": "q45",
    "number": 45,
    "topic": "Fourier series of x and Parseval identity",
    "question": "Find the Fourier series of $f(x)=x$ on $[-\\pi,\\pi]$, and then use Parseval's identity to prove that $$\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}.$$"
  },
  {
    "id": "q46",
    "number": 46,
    "topic": "Calculus of variations and the Euler-Lagrange equation",
    "question": "Minimize the functional $$J[y]=\\int_0^1 \\bigl(y'(x)^2+2y(x)\\bigr)\\,dx$$ subject to the boundary conditions $y(0)=0$ and $y(1)=0$. Derive the Euler-Lagrange equation, solve for the extremal, and compute the minimum value."
  },
  {
    "id": "q47",
    "number": 47,
    "topic": "Constrained minimization with two linear constraints",
    "question": "Minimize $$x^2+y^2+z^2$$ subject to the constraints $$x+2y+3z=6\\qquad\\text{and}\\qquad x+y=2.$$ Find the minimizing point and the minimum value."
  },
  {
    "id": "q48",
    "number": 48,
    "topic": "Laplace transforms, inverse transforms, and an integro-differential equation",
    "question": "Compute (a) $\\mathcal L\\{t^2e^{-3t}\\sin(2t)\\}$, (b) $\\mathcal L^{-1}\\left\\{\\dfrac{3s+7}{(s^2+2s+5)(s+1)}\\right\\}$, and (c) solve the integro-differential equation $$y'(t)+\\int_0^t y(\\tau)\\,d\\tau=1,\\qquad y(0)=0.$$"
  },
  {
    "id": "q49",
    "number": 49,
    "topic": "Steepest descent asymptotics and Stirling approximation",
    "question": "In asymptotic analysis, use the steepest-descent/Laplace method on the integral $$n!=\\Gamma(n+1)=\\int_0^{\\infty} t^n e^{-t}\\,dt$$ to derive Stirling's approximation. Identify the dominant saddle, carry out the quadratic expansion, and obtain the leading asymptotic formula for $n!$."
  },
  {
    "id": "q50",
    "number": 50,
    "topic": "Damped wave equation and the e^{-t} substitution",
    "question": "Solve the damped wave problem $$u_{tt}+2u_t=c^2u_{xx},\\qquad 0<x<\\pi,$$ with boundary conditions $u(0,t)=u(\\pi,t)=0$ and initial data $$u(x,0)=\\sin x,\\qquad u_t(x,0)=0.$$ Use the substitution $u(x,t)=e^{-t}v(x,t)$ and exploit the single sine mode in the initial data."
  },
] as MathPromptDef[];

export function getMathPromptByNumber(n: number): MathPromptDef | undefined {
  return MATH_PROMPTS.find((q) => q.number === n);
}
