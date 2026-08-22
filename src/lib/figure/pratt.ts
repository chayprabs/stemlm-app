/**
 * In-house Pratt / recursive-descent expression evaluator.
 * Never uses Function(), eval, or expr-eval.
 */
export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExprError';
  }
}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'id'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'eof' };

const FUNS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  log: Math.log10,
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  sign: Math.sign,
};

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = src.replace(/\s+/g, '');
  while (i < s.length) {
    const c = s[i]!;
    if ((c >= '0' && c <= '9') || c === '.') {
      const m = /^(\d*\.\d+|\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
      if (!m) throw new ExprError(`bad number at ${i}`);
      tokens.push({ kind: 'num', value: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
      tokens.push({ kind: 'id', value: m![0]!.toLowerCase() });
      i += m![0]!.length;
      continue;
    }
    if (c === '*' && s[i + 1] === '*') {
      tokens.push({ kind: 'op', value: '^' });
      i += 2;
      continue;
    }
    if ('+-*/^(),'.includes(c)) {
      tokens.push({ kind: 'op', value: c });
      i++;
      continue;
    }
    throw new ExprError(`unexpected '${c}' in expression`);
  }
  tokens.push({ kind: 'eof' });
  return tokens;
}

class Parser {
  i = 0;
  constructor(private tokens: Token[]) {}
  peek(): Token {
    return this.tokens[this.i] ?? { kind: 'eof' };
  }
  eat(): Token {
    return this.tokens[this.i++] ?? { kind: 'eof' };
  }
  matchOp(op: string): boolean {
    const t = this.peek();
    if (t.kind === 'op' && t.value === op) {
      this.eat();
      return true;
    }
    return false;
  }
}

export type CompiledExpr = (vars: Record<string, number>) => number;

export function compileExpr(source: string): CompiledExpr {
  const tokens = tokenize(source);
  const p = new Parser(tokens);

  function parseExpression(): (vars: Record<string, number>) => number {
    return parseAdd();
  }

  function parseAdd(): (vars: Record<string, number>) => number {
    let left = parseMul();
    for (;;) {
      if (p.matchOp('+')) {
        const right = parseMul();
        const L = left;
        left = (v) => L(v) + right(v);
      } else if (p.matchOp('-')) {
        const right = parseMul();
        const L = left;
        left = (v) => L(v) - right(v);
      } else break;
    }
    return left;
  }

  function parseMul(): (vars: Record<string, number>) => number {
    let left = parseUnary();
    for (;;) {
      if (p.matchOp('*')) {
        const right = parseUnary();
        const L = left;
        left = (v) => L(v) * right(v);
      } else if (p.matchOp('/')) {
        const right = parseUnary();
        const L = left;
        left = (v) => L(v) / right(v);
      } else {
        // Implicit multiplication: 2t, 2(t+1), pi t
        const n = p.peek();
        if (n.kind === 'id' || n.kind === 'num' || (n.kind === 'op' && n.value === '(')) {
          const right = parseUnary();
          const L = left;
          left = (v) => L(v) * right(v);
        } else break;
      }
    }
    return left;
  }

  function parseUnary(): (vars: Record<string, number>) => number {
    if (p.matchOp('+')) return parseUnary();
    if (p.matchOp('-')) {
      const inner = parseUnary();
      return (v) => -inner(v);
    }
    return parsePow();
  }

  function parsePow(): (vars: Record<string, number>) => number {
    const base = parsePrimary();
    if (p.matchOp('^')) {
      const exp = parseUnary();
      return (v) => base(v) ** exp(v);
    }
    return base;
  }

  function parsePrimary(): (vars: Record<string, number>) => number {
    const t = p.eat();
    if (t.kind === 'num') return () => t.value;
    if (t.kind === 'id') {
      const name = t.value;
      if (p.matchOp('(')) {
        const args: CompiledExpr[] = [];
        if (!p.matchOp(')')) {
          args.push(parseExpression());
          while (p.matchOp(',')) args.push(parseExpression());
          if (!p.matchOp(')')) throw new ExprError(`expected ) after ${name}(`);
        }
        const fn = FUNS[name];
        if (!fn) throw new ExprError(`unknown function ${name}`);
        return (v) => fn(...args.map((a) => a(v)));
      }
      if (name in CONSTS) {
        const c = CONSTS[name]!;
        return () => c;
      }
      return (v) => {
        if (!(name in v)) throw new ExprError(`unknown variable ${name}`);
        return v[name]!;
      };
    }
    if (t.kind === 'op' && t.value === '(') {
      const inner = parseExpression();
      if (!p.matchOp(')')) throw new ExprError('expected )');
      return inner;
    }
    throw new ExprError('expected number, variable, or (');
  }

  const expr = parseExpression();
  if (p.peek().kind !== 'eof') throw new ExprError('trailing input');
  return expr;
}

export function evaluateExpr(source: string, vars: Record<string, number>): number {
  return compileExpr(source)(vars);
}
