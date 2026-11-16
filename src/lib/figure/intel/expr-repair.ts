/**
 * Expression and number notation -> the grammar of the Pratt evaluator (src/lib/figure/pratt.ts).
 *
 * The evaluator reads ASCII only: numbers, identifiers, `+ - * / ^ ( ) ,`, `**`, and the functions
 * and constants named below. It strips whitespace before tokenising, so `sin x` and `2 pi x` reach it
 * as the unknown variables `sinx` and `pix`, and `x(x-1)` as a call of an unknown function. This
 * module parses what people and models actually write (unicode operators, superscripts, LaTeX,
 * implicit products, bare function arguments) into a small tree and prints it back in that grammar.
 *
 * A repaired expression is returned only when the evaluator compiles it and its only free variable
 * is the plot variable. Notation with two readings (`sin x (x+1)`) is refused, never guessed.
 */
import { compileExpr } from '../pratt';

/** Function and constant names of pratt.ts (FUNS / CONSTS). */
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'ln',
  'log10', 'log2', 'sqrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'sign',
]);
const CONSTANTS = new Set(['pi', 'e', 'tau']);

/** Other spellings of an evaluator function. */
const FUNCTION_ALIASES: Readonly<Record<string, string>> = {
  arcsin: 'asin', arccos: 'acos', arctan: 'atan', sgn: 'sign', signum: 'sign', lg: 'log10',
};
/** Reciprocal trigonometric functions the evaluator lacks, as [numerator, denominator] of evaluator calls. */
const RECIPROCALS: Readonly<Record<string, readonly [string | null, string]>> = {
  sec: [null, 'cos'], csc: [null, 'sin'], cosec: [null, 'sin'], cot: ['cos', 'sin'],
};
const INVERSES: Readonly<Record<string, string>> = { sin: 'asin', cos: 'acos', tan: 'atan' };

const SUPERSCRIPTS: Readonly<Record<string, string>> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁽': '(', '⁾': ')', 'ⁿ': 'n', 'ˣ': 'x',
};
const FRACTIONS: Readonly<Record<string, string>> = {
  '½': '(1/2)', '⅓': '(1/3)', '⅔': '(2/3)', '¼': '(1/4)', '¾': '(3/4)', '⅕': '(1/5)', '⅛': '(1/8)',
};
const GREEK: Readonly<Record<string, string>> = {
  'π': 'pi', 'τ': 'tau', 'θ': 'theta', 'φ': 'phi', 'ϕ': 'phi', 'ω': 'omega', 'α': 'alpha', 'β': 'beta',
  'γ': 'gamma', 'λ': 'lambda', 'μ': 'mu', 'ρ': 'rho', 'σ': 'sigma',
};
const GREEK_NAMES = new Set(['theta', 'phi', 'omega', 'alpha', 'beta', 'gamma', 'lambda', 'mu', 'rho', 'sigma']);

/** LaTeX commands that become a plain word or operator. A command outside these tables refuses the repair. */
const LATEX_WORDS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'ln', 'log', 'exp', 'min', 'max', 'pi', 'tau', ...GREEK_NAMES,
]);
const LATEX_SYMBOLS: Readonly<Record<string, string>> = {
  cdot: '*', times: '*', ast: '*', div: '/', lvert: '|', rvert: '|', vert: '|', mid: '|',
  left: '', right: '', big: '', Big: '', bigl: '', bigr: '', Bigl: '', Bigr: '', displaystyle: '', limits: '',
  quad: ' ', qquad: ' ', ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', '{': '(', '}': ')',
};
const LATEX_WRAPPERS = new Set(['operatorname', 'mathrm', 'mathit', 'mathbf', 'text', 'textrm']);

export const MAX_EXPR_CHARS = 512;
const MAX_DEPTH = 48;

/** A table entry by its own key only: `constructor` is a word a model may write, not a function alias. */
function own<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

class Refused extends Error {}
const refuse = (): never => { throw new Refused(); };

type Node =
  | { t: 'num'; text: string }
  | { t: 'name'; text: string }
  | { t: 'call'; name: string; args: Node[] }
  | { t: 'neg'; arg: Node }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Node; right: Node };

type Token =
  | { t: 'num'; text: string }
  | { t: 'id'; text: string }
  | { t: 'op'; text: string }
  | { t: 'sup'; text: string }
  | { t: 'root' };

/** A balanced `{…}` group or one character, as a LaTeX argument. Returns the inner text and the index after it. */
function latexArgument(source: string, at: number): [string, number] {
  let i = at;
  while (source[i] === ' ') i++;
  if (source[i] !== '{') {
    if (i >= source.length) refuse();
    return [source[i]!, i + 1];
  }
  let depth = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}' && --depth === 0) return [source.slice(i + 1, j), j + 1];
  }
  return refuse();
}

/** LaTeX -> plain infix text. Single pass with bounded recursion on arguments. */
function latexToPlain(source: string, depth = 0): string {
  if (depth > MAX_DEPTH) refuse();
  let out = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (c === '{') { out += '('; i++; continue; }
    if (c === '}') { out += ')'; i++; continue; }
    if (c !== '\\') { out += c; i++; continue; }
    const word = /^[A-Za-z]+/.exec(source.slice(i + 1, i + 24))?.[0];
    const name = word ?? source[i + 1] ?? '';
    i += 1 + name.length;
    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
      const [top, afterTop] = latexArgument(source, i);
      const [bottom, afterBottom] = latexArgument(source, afterTop);
      out += `((${latexToPlain(top, depth + 1)})/(${latexToPlain(bottom, depth + 1)}))`;
      i = afterBottom;
    } else if (name === 'sqrt') {
      // Only the square root: an odd root of a negative number is real, a fractional power of it is not.
      if (source[i] === '[') refuse();
      const [inner, after] = latexArgument(source, i);
      out += `sqrt(${latexToPlain(inner, depth + 1)})`;
      i = after;
    } else if (LATEX_WRAPPERS.has(name)) {
      const [inner, after] = latexArgument(source, i);
      out += ` ${latexToPlain(inner, depth + 1)} `;
      i = after;
    } else if (LATEX_WORDS.has(name)) {
      out += ` ${name} `;
    } else if (Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, name)) {
      out += LATEX_SYMBOLS[name]!;
    } else {
      refuse();
    }
  }
  return out;
}

function tokenize(source: string, variable: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if ((c >= '0' && c <= '9') || (c === '.' && /\d/.test(source[i + 1] ?? ''))) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i, i + 40))![0];
      // `2e` is 2·e, and `2.` is 2: neither is exponent notation.
      tokens.push({ t: 'num', text: m.replace(/\.$/, '').replace(/\.(?=[eE])/, '') });
      i += m.length;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      const rest = source.slice(i, i + 64);
      // The declared variable wins as a whole word, so `v_0` or `x1` stay one name.
      const whole = /^[A-Za-z][A-Za-z0-9_]*/.exec(rest)![0];
      const word = whole.toLowerCase() === variable ? whole : /^[A-Za-z]+/.exec(rest)![0];
      tokens.push({ t: 'id', text: word.toLowerCase() });
      i += word.length;
      continue;
    }
    if (c === '*' && source[i + 1] === '*') { tokens.push({ t: 'op', text: '^' }); i += 2; continue; }
    if ('+-*/^(),|!_'.includes(c)) { tokens.push({ t: 'op', text: c }); i++; continue; }
    if ('[]'.includes(c)) { tokens.push({ t: 'op', text: c === '[' ? '(' : ')' }); i++; continue; }
    if ('×·⋅∙∗✕'.includes(c)) { tokens.push({ t: 'op', text: '*' }); i++; continue; }
    if ('÷∕⁄'.includes(c)) { tokens.push({ t: 'op', text: '/' }); i++; continue; }
    if ('−–‒﹣－'.includes(c)) { tokens.push({ t: 'op', text: '-' }); i++; continue; }
    if (c === '°') { tokens.push({ t: 'op', text: '°' }); i++; continue; }
    if (c === '√') { tokens.push({ t: 'root' }); i++; continue; }
    if (own(GREEK, c)) { tokens.push({ t: 'id', text: own(GREEK, c)! }); i++; continue; }
    if (own(FRACTIONS, c)) { tokens.push(...tokenize(own(FRACTIONS, c)!, variable)); i++; continue; }
    if (own(SUPERSCRIPTS, c) !== undefined) {
      let text = '';
      while (i < source.length && own(SUPERSCRIPTS, source[i]!) !== undefined) text += own(SUPERSCRIPTS, source[i++]!);
      tokens.push({ t: 'sup', text });
      continue;
    }
    refuse();
  }
  return tokens;
}

class Parser {
  private i = 0;
  private bars = 0;
  private depth = 0;

  constructor(private readonly tokens: Token[], private readonly variable: string) {}

  parse(): Node {
    const node = this.additive();
    if (this.i < this.tokens.length) refuse();
    return node;
  }

  private peek(offset = 0): Token | undefined { return this.tokens[this.i + offset]; }
  private isOp(text: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.t === 'op' && token.text === text;
  }
  private eatOp(text: string): boolean {
    if (!this.isOp(text)) return false;
    this.i++;
    return true;
  }
  private enter(): void { if (++this.depth > MAX_DEPTH) refuse(); }
  private leave(): void { this.depth--; }

  private additive(): Node {
    this.enter();
    let left = this.product();
    for (;;) {
      if (this.eatOp('+')) left = { t: 'bin', op: '+', left, right: this.product() };
      else if (this.eatOp('-')) left = { t: 'bin', op: '-', left, right: this.product() };
      else break;
    }
    this.leave();
    return left;
  }

  /** An operand can start here: this is where a product may be implicit. */
  private startsOperand(): boolean {
    const token = this.peek();
    if (!token) return false;
    if (token.t === 'num' || token.t === 'id' || token.t === 'root') return true;
    // A bar after an operand closes the open absolute value; outside one it opens a new factor.
    return token.t === 'op' && (token.text === '(' || (token.text === '|' && this.bars === 0));
  }

  private product(): Node {
    let left = this.unary();
    for (;;) {
      if (this.eatOp('*')) left = { t: 'bin', op: '*', left, right: this.unary() };
      else if (this.eatOp('/')) left = { t: 'bin', op: '/', left, right: this.unary() };
      else if (this.startsOperand()) left = { t: 'bin', op: '*', left, right: this.power() };
      else break;
    }
    return left;
  }

  private unary(): Node {
    this.enter();
    let node: Node;
    if (this.eatOp('+')) node = this.unary();
    else if (this.eatOp('-')) node = { t: 'neg', arg: this.unary() };
    else node = this.power();
    this.leave();
    return node;
  }

  private power(): Node {
    const base = this.postfix();
    if (this.eatOp('^')) return { t: 'bin', op: '^', left: base, right: this.unary() };
    return base;
  }

  private superscript(text: string): Node {
    return new Parser(tokenize(text, this.variable), this.variable).parse();
  }

  private postfix(): Node {
    let node = this.primary();
    for (;;) {
      const token = this.peek();
      if (token?.t === 'sup') {
        this.i++;
        node = { t: 'bin', op: '^', left: node, right: this.superscript(token.text) };
      } else if (this.eatOp('°')) {
        node = { t: 'bin', op: '/', left: { t: 'bin', op: '*', left: node, right: { t: 'name', text: 'pi' } }, right: { t: 'num', text: '180' } };
      } else if (this.isOp('!')) {
        refuse();
      } else break;
    }
    return node;
  }

  private group(): Node {
    const inner = this.additive();
    if (!this.eatOp(')')) refuse();
    return inner;
  }

  private primary(): Node {
    const token = this.peek();
    if (!token) return refuse();
    this.i++;
    if (token.t === 'num') return { t: 'num', text: token.text };
    if (token.t === 'root') return { t: 'call', name: 'sqrt', args: [this.rootArgument()] };
    if (token.t === 'op' && token.text === '(') return this.group();
    if (token.t === 'op' && token.text === '|') {
      this.bars++;
      const inner = this.additive();
      if (!this.eatOp('|')) refuse();
      this.bars--;
      return { t: 'call', name: 'abs', args: [inner] };
    }
    if (token.t === 'id') return this.identifier(token.text);
    return refuse();
  }

  /** `√x`, `√2`, `√(x+1)`: the radical binds one atom, as it does in print. */
  private rootArgument(): Node {
    const token = this.peek();
    if (!token) return refuse();
    this.i++;
    if (token.t === 'num') return { t: 'num', text: token.text };
    if (token.t === 'op' && token.text === '(') return this.group();
    if (token.t === 'id' && this.isAtomName(token.text)) return { t: 'name', text: token.text };
    return refuse();
  }

  private isAtomName(name: string): boolean {
    return CONSTANTS.has(name) || name === this.variable;
  }

  private isFunctionName(name: string): boolean {
    return FUNCTIONS.has(name) || own(FUNCTION_ALIASES, name) !== undefined || own(RECIPROCALS, name) !== undefined || name === 'pow';
  }

  /** `sinx`, `xlnx`, `pix`: a run of known names written without spaces, split longest-first. */
  private splitRun(run: string): string[] | null {
    const names = [...FUNCTIONS, ...Object.keys(FUNCTION_ALIASES), ...Object.keys(RECIPROCALS), ...CONSTANTS, this.variable]
      .sort((a, b) => b.length - a.length);
    const parts: string[] = [];
    let rest = run;
    while (rest) {
      const next = names.find((name) => rest.startsWith(name));
      if (!next) return null;
      parts.push(next);
      rest = rest.slice(next.length);
    }
    return parts.length > 1 ? parts : null;
  }

  private identifier(name: string): Node {
    if (CONSTANTS.has(name) || name === this.variable) return { t: 'name', text: name };
    if (this.isFunctionName(name)) return this.application(name);
    const parts = this.splitRun(name);
    if (parts) {
      this.tokens.splice(this.i, 0, ...parts.slice(1).map((text): Token => ({ t: 'id', text })));
      return this.identifier(parts[0]!);
    }
    // Unknown name: kept so the caller sees it as a free variable and refuses the expression.
    return { t: 'name', text: name };
  }

  private exponentAfterName(): Node | undefined {
    const token = this.peek();
    if (token?.t === 'sup') {
      this.i++;
      return this.superscript(token.text);
    }
    if (!this.isOp('^')) return undefined;
    this.i++;
    const next = this.peek();
    if (!next) return refuse();
    if (next.t === 'num') { this.i++; return { t: 'num', text: next.text }; }
    if (next.t === 'op' && next.text === '(') { this.i++; return this.group(); }
    if (next.t === 'op' && next.text === '-' && this.peek(1)?.t === 'num') {
      const digits = this.peek(1) as { t: 'num'; text: string };
      this.i += 2;
      return { t: 'neg', arg: { t: 'num', text: digits.text } };
    }
    return refuse();
  }

  /** `log_2`, `log_{10}`, `log_e`: the base of a logarithm written as a subscript. */
  private logBase(): Node | undefined {
    if (!this.eatOp('_')) return undefined;
    const token = this.peek();
    if (!token) return refuse();
    this.i++;
    if (token.t === 'num') return { t: 'num', text: token.text };
    if (token.t === 'id' && CONSTANTS.has(token.text)) return { t: 'name', text: token.text };
    if (token.t === 'op' && token.text === '(') return this.group();
    return refuse();
  }

  /** The argument of a function written without parentheses: `sin 2x`, `ln x^2`, `cos πt`. */
  private bareArgument(): Node {
    let chain: Node | undefined;
    for (;;) {
      const token = this.peek();
      if (!token) break;
      let atom: Node;
      if (token.t === 'num') atom = { t: 'num', text: token.text };
      else if (token.t === 'id' && this.isAtomName(token.text)) atom = { t: 'name', text: token.text };
      else if (token.t === 'id' && !this.isFunctionName(token.text) && this.splitRun(token.text)) {
        this.tokens.splice(this.i, 1, ...this.splitRun(token.text)!.map((text): Token => ({ t: 'id', text })));
        continue;
      } else if (token.t === 'op' && token.text === '(') {
        // `sin x (x+1)`: the product may or may not belong to the argument.
        return refuse();
      } else break;
      this.i++;
      const sup = this.peek();
      if (sup?.t === 'sup') { this.i++; atom = { t: 'bin', op: '^', left: atom, right: this.superscript(sup.text) }; }
      else if (this.eatOp('^')) atom = { t: 'bin', op: '^', left: atom, right: this.unary() };
      chain = chain ? { t: 'bin', op: '*', left: chain, right: atom } : atom;
    }
    return chain ?? refuse();
  }

  private arguments(): Node[] {
    const args: Node[] = [];
    if (this.eatOp(')')) return args;
    do args.push(this.additive()); while (this.eatOp(','));
    if (!this.eatOp(')')) refuse();
    return args;
  }

  private application(written: string): Node {
    this.enter();
    const base = written === 'log' ? this.logBase() : undefined;
    const exponent = this.exponentAfterName();
    const args = this.eatOp('(') ? this.arguments() : [this.bareArgument()];
    let name = own(FUNCTION_ALIASES, written) ?? written;
    let node: Node;
    const inverse = exponent?.t === 'neg' && exponent.arg.t === 'num' && exponent.arg.text === '1' ? own(INVERSES, name) : undefined;
    if (inverse) name = inverse;
    if (name === 'pow') {
      if (args.length !== 2) refuse();
      node = { t: 'bin', op: '^', left: args[0]!, right: args[1]! };
    } else if (own(RECIPROCALS, name)) {
      if (args.length !== 1) refuse();
      const [top, bottom] = own(RECIPROCALS, name)!;
      node = {
        t: 'bin', op: '/',
        left: top ? { t: 'call', name: top, args } : { t: 'num', text: '1' },
        right: { t: 'call', name: bottom, args },
      };
    } else if (base) {
      if (args.length !== 1) refuse();
      const fixed = base.t === 'num' && base.text === '2' ? 'log2' : base.t === 'num' && base.text === '10' ? 'log10' : base.t === 'name' && base.text === 'e' ? 'ln' : undefined;
      node = fixed
        ? { t: 'call', name: fixed, args }
        : { t: 'bin', op: '/', left: { t: 'call', name: 'ln', args }, right: { t: 'call', name: 'ln', args: [base] } };
    } else {
      node = { t: 'call', name, args };
    }
    if (exponent && !inverse) node = { t: 'bin', op: '^', left: node, right: exponent };
    this.leave();
    return node;
  }
}

const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 } as const;

function rank(node: Node): number {
  if (node.t === 'bin') return PRECEDENCE[node.op];
  if (node.t === 'neg') return 3;
  return 5;
}

function print(node: Node): string {
  if (node.t === 'num' || node.t === 'name') return node.text;
  if (node.t === 'call') return `${node.name}(${node.args.map(print).join(', ')})`;
  const wrap = (child: Node, needed: boolean) => (needed ? `(${print(child)})` : print(child));
  if (node.t === 'neg') return `-${wrap(node.arg, rank(node.arg) < 2 || node.arg.t === 'neg')}`;
  const own = PRECEDENCE[node.op];
  if (node.op === '^') return `${wrap(node.left, rank(node.left) < 5)}^${wrap(node.right, rank(node.right) < 5)}`;
  const left = wrap(node.left, rank(node.left) < own);
  // A negative right operand is parenthesised: `2*(-x)` reads the same to everyone.
  const right = wrap(node.right, node.right.t === 'neg' || rank(node.right) < own || (rank(node.right) === own && (node.op === '-' || node.op === '/')));
  return own === 1 ? `${left} ${node.op} ${right}` : `${left}${node.op}${right}`;
}

/** `$…$`, `\(…\)`, backticks and quotes around a whole expression. */
function unwrapMath(source: string): string {
  let text = source.trim();
  for (let round = 0; round < 3; round++) {
    const before = text;
    text = text
      .replace(/^\$\$([\s\S]*)\$\$$/, '$1')
      .replace(/^\$([\s\S]*)\$$/, '$1')
      .replace(/^\\\(([\s\S]*)\\\)$/, '$1')
      .replace(/^\\\[([\s\S]*)\\\]$/, '$1')
      .replace(/^`([\s\S]*)`$/, '$1')
      .replace(/^"([\s\S]*)"$/, '$1')
      .replace(/^'([\s\S]*)'$/, '$1')
      .trim();
    if (text === before) break;
  }
  return text;
}

/** Programming-language spellings: `Math.sin`, `np.exp`, `math.pi`. */
function stripNamespaces(source: string): string {
  return source.replace(/\b(?:Math|math|np|numpy)\./g, '');
}

/**
 * `y = …`, `f(x) = …`: the left side names the curve, the right side is the function. A left side
 * that is the variable itself (`x = 2`) is an equation, not a function of the variable.
 */
function dropLeftSide(source: string, variable: string): string {
  const first = source.indexOf('=');
  if (first < 0) return source;
  if (source.indexOf('=', first + 1) >= 0) refuse();
  const left = source.slice(0, first).trim().replace(/\\(?:left|right)/g, '').replace(/[{}\s]/g, '');
  const match = /^([A-Za-z][A-Za-z0-9_]{0,15})(?:\(([A-Za-z][A-Za-z0-9_]{0,15})\))?$/.exec(left);
  if (!match) return refuse();
  const name = match[1]!.toLowerCase();
  if (match[2] ? match[2].toLowerCase() !== variable : name === variable || CONSTANTS.has(name) || FUNCTIONS.has(name)) refuse();
  return source.slice(first + 1);
}

/** Names the evaluator would look up in its variables, or null when it cannot compile the source. */
export function freeVariables(source: string): Set<string> | null {
  if (source.length > MAX_EXPR_CHARS) return null;
  try {
    const seen = new Set<string>();
    const probe = new Proxy({}, {
      has: (_target, name) => { if (typeof name === 'string') seen.add(name); return true; },
      get: () => 1.37,
    });
    compileExpr(source)(probe as Record<string, number>);
    return seen;
  } catch {
    return null;
  }
}

/** The evaluator compiles `source` and reads no variable but `variable`. */
export function isUsableExpression(source: string, variable = 'x'): boolean {
  const free = freeVariables(source);
  return free !== null && [...free].every((name) => name === variable);
}

function rewrite(source: string, variable: string): string | null {
  try {
    let text = unwrapMath(source);
    text = dropLeftSide(stripNamespaces(text), variable);
    if (text.includes('\\') || text.includes('{')) text = latexToPlain(text);
    const tokens = tokenize(text, variable);
    if (!tokens.length) return null;
    return print(new Parser(tokens, variable).parse());
  } catch {
    // Refused notation, or input too deep to parse: either way there is no rewrite.
    return null;
  }
}

/**
 * `source` in the evaluator's grammar. Returns it unchanged when the evaluator already reads it,
 * and null when no faithful rewrite compiles (the caller then leaves the value alone).
 */
export function repairExpression(source: string, variable = 'x'): string | null {
  if (typeof source !== 'string' || !source.trim() || source.length > MAX_EXPR_CHARS) return null;
  const name = variable.trim().toLowerCase();
  if (isUsableExpression(source, name)) return source;
  const rewritten = rewrite(source, name);
  return rewritten !== null && isUsableExpression(rewritten, name) ? rewritten : null;
}

/**
 * The one variable `source` is a function of, when the evaluator cannot read it in `x`.
 * Only single letters and Greek letter names qualify: a longer unknown word is more likely a
 * misspelt function than a variable.
 */
export function inferVariable(source: string): string | null {
  if (typeof source !== 'string' || source.length > MAX_EXPR_CHARS) return null;
  const words = new Set((unwrapMath(source).toLowerCase().match(/[a-z]+|[θφϕωαβγλμρσ]/g) ?? []).map((word) => own(GREEK, word) ?? word));
  const candidates = new Set<string>();
  for (const word of words) {
    if (FUNCTIONS.has(word) || CONSTANTS.has(word) || own(FUNCTION_ALIASES, word) !== undefined || own(RECIPROCALS, word) !== undefined) continue;
    if (GREEK_NAMES.has(word)) candidates.add(word);
    for (const letter of word) if (letter !== 'e') candidates.add(letter);
  }
  const usable = [...candidates].filter((candidate) => {
    const repaired = repairExpression(source, candidate);
    return repaired !== null && freeVariables(repaired)?.has(candidate);
  });
  return usable.length === 1 ? usable[0]! : null;
}

/** A constant expression (`2π`, `-pi/2`, `1e3`) as a finite number, or null. */
export function evaluateConstant(source: string): number | null {
  const repaired = repairExpression(source.replace(/^\+/, ''), '\u0000');
  if (repaired === null) return null;
  try {
    const value = compileExpr(repaired)({});
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Shortest decimal text that reads back as `value` to twelve significant digits. */
export function formatNumber(value: number): string {
  const rounded = Number(value.toPrecision(12));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

const BOUND = String.raw`[^,;\s][^,;]*?`;
const RANGE_FORMS: readonly RegExp[] = [
  // -3 <= x <= 3
  new RegExp(String.raw`^(${BOUND})\s*(?:<=|≤|<)\s*[A-Za-zθ]\w{0,15}\s*(?:<=|≤|<)\s*(${BOUND})$`),
  // -3 to 3, -3..3, -3 … 3, -3 until 3
  new RegExp(String.raw`^(${BOUND})\s*(?:\bto\b|\.{2,3}|…|\buntil\b|\bthrough\b)\s*(${BOUND})$`, 'i'),
  // -3, 3 and -3; 3 and -3 : 3
  new RegExp(String.raw`^(${BOUND})\s*[,;:]\s*(${BOUND})$`),
  // -3 – 3 (a spaced dash between the bounds)
  new RegExp(String.raw`^(${BOUND})\s+[–—-]\s+(${BOUND})$`),
  // -3 3
  /^(\S+)\s+(\S+)$/,
];

/**
 * A two-bound range in any common notation as `min max`: `[-3, 3]`, `(-3,3)`, `-3..3`, `-3 to 3`,
 * `-3 <= x <= 3`, `x from -3 to 3`, `x ∈ [0, 2π]`, `min=-3 max=3`. Null when it is not exactly two
 * finite increasing bounds.
 */
export function repairRange(source: string): string | null {
  if (typeof source !== 'string' || source.length > 200) return null;
  let text = source.trim().replace(/[−‒﹣－]/g, '-');
  const named = /^(?:x_?)?min\s*[=:]\s*(.+?)\s*[,;]?\s*(?:x_?)?max\s*[=:]\s*(.+)$/i.exec(text);
  if (named) text = `${named[1]} to ${named[2]}`;
  text = text
    .replace(/^[A-Za-zθ]\w{0,15}\s*(?:∈|\bin\b|\bfrom\b|=|:)\s*/i, '')
    .replace(/^from\s+/i, '')
    .trim();
  const bracketed = /^[[(]\s*(.*?)\s*[\])]$/.exec(text);
  if (bracketed && !/[[\]()]/.test(bracketed[1]!.replace(/\([^()]*\)/g, ''))) text = bracketed[1]!;
  for (const form of RANGE_FORMS) {
    const match = form.exec(text);
    if (!match) continue;
    const min = evaluateConstant(match[1]!);
    const max = evaluateConstant(match[2]!);
    if (min === null || max === null) continue;
    return max > min ? `${formatNumber(min)} ${formatNumber(max)}` : null;
  }
  return null;
}

/**
 * A single number in another notation: unicode minus, a decimal comma (`12,5`), grouped thousands
 * with at least two groups (`1,250,000`). `1,000` alone is left: it reads as one thousand or as one.
 * A trailing unit is kept as written. Null when the text is not one number.
 */
export function repairNumber(source: string): string | null {
  const match = /^([+-]?)(\d[\d.,]*)(\s*[^\d\s.,][^\s]*)?$/.exec(source.trim().replace(/^[−–‒﹣－]/, '-'));
  if (!match) return null;
  const [, sign, digits, unit] = match as unknown as [string, string, string, string | undefined];
  let plain: string;
  if (/^\d+(?:\.\d+)?$/.test(digits)) plain = digits;
  else if (/^\d{1,3}(?:,\d{3}){2,}(?:\.\d+)?$/.test(digits)) plain = digits.replace(/,/g, '');
  else if (/^\d+,\d+$/.test(digits) && !/^\d{1,3},\d{3}$/.test(digits)) plain = digits.replace(',', '.');
  else return null;
  return `${sign}${plain}${unit ?? ''}`;
}
