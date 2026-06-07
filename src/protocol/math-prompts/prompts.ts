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
  }
] as MathPromptDef[];

export function getMathPromptByNumber(n: number): MathPromptDef | undefined {
  return MATH_PROMPTS.find((q) => q.number === n);
}
