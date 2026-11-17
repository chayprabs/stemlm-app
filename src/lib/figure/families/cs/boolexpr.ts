/**
 * Boolean expressions for the truth and logic families: one tolerant reader for the common notations, one AST.
 *
 * Precedence, tightest first; binary operators associate to the left:
 *   1. complement   postfix ' ′ and a combining overline; prefix ! ~ ¬ NOT \overline{…} \bar{…}
 *   2. AND          · • * & && ∧ . × and juxtaposition (AB, A(B+C)); NAND
 *   3. XOR          ⊕ ^ ⊻ != ≠; XNOR ⊙ ==
 *   4. OR           + | || ∨; NOR
 * Words (AND OR NOT NAND NOR XOR XNOR) are read in any case, and also as functions: NAND(A, B, C).
 * An unparenthesised chain A·B·C is one three-input AND; (A·B)·C keeps the two gates the source wrote.
 *
 * Names. A single letter with optional digits or a subscript (A, x1, S_0) is always one variable. A longer run
 * of letters is ambiguous between a name (Cin, SEL) and a product of single-letter variables (AB). In order:
 *   - a declared input is a name; a run that splits into declared inputs in exactly one way is their product;
 *   - a run whose every letter also stands alone as a variable somewhere in the spec is a product (AB + A'C);
 *   - a well-known signal name (CLK, SEL, Cin, …) is a name;
 *   - when the spec writes AND or OR explicitly anywhere (·, *, &, AND, |, OR), nothing is juxtaposed: a name;
 *   - otherwise letters in alphabetical order are a product (AB, BCD, xy; ACin with a known name), as are
 *     numbered letters in any order (S1S0, x2x1); anything else is a name (KEY, DOOR, Sum, MemRead, SW1).
 * `inputs:` settles any case the rules read wrongly.
 */

export type GateOp = 'and' | 'or' | 'xor' | 'nand' | 'nor' | 'xnor';

export type BoolNode =
  | { kind: 'var'; name: string }
  | { kind: 'const'; value: 0 | 1 }
  | { kind: 'not'; arg: BoolNode }
  | { kind: GateOp; args: BoolNode[] };

export interface BoolOutput {
  /** The name on the left of `=`, or null when the line is a bare expression. */
  name: string | null;
  expr: BoolNode;
}

export interface BoolSystem {
  outputs: BoolOutput[];
  /** Variables in order of first appearance across the expressions. */
  variables: string[];
  /** Explicit order from `inputs:` or from a function-style left side F(A, B, C); null when neither is given. */
  declared: string[] | null;
}

export class BoolSyntaxError extends Error {}

type Token =
  | { t: 'run'; text: string }
  | { t: 'var'; name: string }
  | { t: 'const'; value: 0 | 1 }
  | { t: 'op'; op: GateOp; word: boolean; plus?: boolean }
  | { t: 'not' }
  | { t: 'post' }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' };

const MAX_TOKENS = 240;
const MAX_DEPTH = 24;

const WORD_OPS: Record<string, GateOp | 'not'> = { and: 'and', or: 'or', not: 'not', nand: 'nand', nor: 'nor', xor: 'xor', xnor: 'xnor' };
const TEX_OPS: Record<string, GateOp | 'not' | 'skip' | 'unwrap'> = {
  cdot: 'and', cdotp: 'and', times: 'and', land: 'and', wedge: 'and', bullet: 'and', ast: 'and',
  lor: 'or', vee: 'or', oplus: 'xor', odot: 'xnor',
  overline: 'not', bar: 'not', lnot: 'not', neg: 'not',
  left: 'skip', right: 'skip', displaystyle: 'skip', quad: 'skip', qquad: 'skip', big: 'skip', Big: 'skip',
  text: 'unwrap', mathrm: 'unwrap', mathit: 'unwrap', mathbf: 'unwrap', textbf: 'unwrap', textit: 'unwrap', operatorname: 'unwrap', mathsf: 'unwrap', mathtt: 'unwrap', texttt: 'unwrap',
};
const SYMBOL_OPS: Array<[string, GateOp]> = [
  ['&&', 'and'], ['||', 'or'], ['!=', 'xor'], ['==', 'xnor'],
  ['·', 'and'], ['•', 'and'], ['∙', 'and'], ['⋅', 'and'], ['*', 'and'], ['&', 'and'], ['∧', 'and'], ['⋀', 'and'], ['.', 'and'], ['×', 'and'],
  ['+', 'or'], ['|', 'or'], ['∨', 'or'], ['⋁', 'or'],
  ['⊕', 'xor'], ['^', 'xor'], ['⊻', 'xor'], ['≠', 'xor'], ['⊙', 'xnor'],
];
/** Multi-letter names that are signals, not products, wherever they appear. */
const KNOWN_SIGNALS = new Set([
  'en', 'in', 'clk', 'clr', 'rst', 'sel', 'set', 'cin', 'cout', 'sum', 'out', 'din', 'dout', 'bin', 'bout', 'gnd', 'vcc', 'vdd',
  'load', 'reset', 'clock', 'clear', 'enable', 'carry', 'borrow', 'data', 'select',
]);

const LETTER = /[A-Za-z\u0370-\u03FF]/;
const SIMPLE_NAME = /^[A-Za-z\u0370-\u03FF]\d*(?:_[A-Za-z0-9]+)?$/;

function isKnownSignal(text: string): boolean {
  return KNOWN_SIGNALS.has(text.replace(/\d+$/, '').toLowerCase());
}

function tokenize(source: string): Token[] {
  // NFD separates a precomposed overlined letter (Ā) into the letter and its combining macron.
  const text = source.normalize('NFD').replace(/[$`]/g, ' ');
  const tokens: Token[] = [];
  let i = 0;
  const push = (token: Token) => {
    tokens.push(token);
    if (tokens.length > MAX_TOKENS) throw new BoolSyntaxError('expression is too long');
  };
  /** The text of a `{…}` group starting at `at`, braces and commands removed, and the index after it. */
  const group = (at: number): { body: string; end: number } | null => {
    if (text[at] !== '{') return null;
    let depth = 0;
    for (let k = at; k < text.length; k++) {
      if (text[k] === '{') depth++;
      else if (text[k] === '}' && --depth === 0) return { body: text.slice(at + 1, k), end: k + 1 };
    }
    return null;
  };
  while (i < text.length) {
    const ch = text[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '\\') {
      const name = /^\\([A-Za-z]+|.)/.exec(text.slice(i))?.[1] ?? '';
      i += 1 + name.length;
      if (/^[,;:! ]$/.test(name)) continue;
      const meaning = Object.prototype.hasOwnProperty.call(TEX_OPS, name) ? TEX_OPS[name]! : null;
      if (!meaning) throw new BoolSyntaxError(`unknown symbol \\${name}`);
      if (meaning === 'skip') continue;
      if (meaning === 'unwrap') {
        while (text[i] === ' ') i++;
        const inner = group(i);
        if (inner) {
          tokenize(inner.body).forEach(push);
          i = inner.end;
        }
        continue;
      }
      push(meaning === 'not' ? { t: 'not' } : { t: 'op', op: meaning, word: false });
      continue;
    }
    if (LETTER.test(ch)) {
      let end = i + 1;
      while (end < text.length && (LETTER.test(text[end]!) || /\d/.test(text[end]!))) end++;
      let run = text.slice(i, end);
      if (text[end] === '_') {
        const braced = group(end + 1);
        const plain = /^[A-Za-z0-9]+/.exec(text.slice(end + 1))?.[0];
        const sub = braced ? braced.body.replace(/\\[A-Za-z]+|[^A-Za-z0-9]/g, '') : plain;
        if (sub) {
          run += `_${sub}`;
          end = braced ? braced.end : end + 1 + plain!.length;
        }
      }
      i = end;
      const word = Object.prototype.hasOwnProperty.call(WORD_OPS, run.toLowerCase()) ? WORD_OPS[run.toLowerCase()]! : null;
      if (word === 'not') push({ t: 'not' });
      else if (word) push({ t: 'op', op: word, word: true });
      else push({ t: 'run', text: run });
      continue;
    }
    if (ch === '0' || ch === '1') {
      if (/\d/.test(text[i + 1] ?? '')) throw new BoolSyntaxError('only the constants 0 and 1 are numbers here');
      push({ t: 'const', value: ch === '1' ? 1 : 0 });
      i++;
      continue;
    }
    const symbol = SYMBOL_OPS.find(([sign]) => text.startsWith(sign, i));
    if (symbol) {
      push({ t: 'op', op: symbol[1], word: false, plus: symbol[0] === '+' });
      i += symbol[0].length;
      continue;
    }
    if ("'′’‘ʹ\u0304\u0305".includes(ch)) push({ t: 'post' });
    else if ('!~¬￢'.includes(ch)) push({ t: 'not' });
    else if ('([{'.includes(ch)) push({ t: 'lp' });
    else if (')]}'.includes(ch)) push({ t: 'rp' });
    else if (ch === ',') push({ t: 'comma' });
    else throw new BoolSyntaxError(ch === '=' ? 'more than one = in the expression' : `unexpected character ${ch}`);
    i++;
  }
  return tokens;
}

interface NameContext {
  declared: string[];
  /** Single-letter names that stand alone as a variable somewhere in the spec. */
  standalone: Set<string>;
  /** The spec writes AND or OR explicitly somewhere, so it is not juxtaposing. */
  explicit: boolean;
}

/** Letter-plus-digits units of a run; a trailing subscript belongs to the last unit. */
function units(run: string): string[] | null {
  const [core, sub] = run.split('_') as [string, string | undefined];
  const parts = core.match(/[A-Za-z\u0370-\u03FF]\d*/g) ?? [];
  if (parts.join('') !== core || !parts.length) return null;
  if (sub) parts[parts.length - 1] += `_${sub}`;
  return parts;
}

/** Fewest parts made of single-letter units and known signal names; null when the run has a part that is neither. */
function signalSplit(run: string): string[] | null {
  if (run.includes('_')) return units(run);
  const mixed = /[a-z]/.test(run) && /[A-Z]/.test(run);
  if (mixed) {
    // Each capital starts a part that keeps the lowercase letters after it: ABCin is A, B, Cin.
    const chunks = run.match(/[A-Z][a-z]*\d*/g) ?? [];
    if (chunks.join('') !== run) return null;
    return chunks.every((chunk) => /^[A-Z]\d*$/.test(chunk) || isKnownSignal(chunk)) ? chunks : null;
  }
  const best: Array<string[] | null> = Array.from({ length: run.length + 1 }, () => null);
  best[run.length] = [];
  for (let at = run.length - 1; at >= 0; at--) {
    if (!LETTER.test(run[at]!)) continue;
    const candidates = [/^[A-Za-z\u0370-\u03FF]\d*/.exec(run.slice(at))![0]];
    for (const signal of KNOWN_SIGNALS) {
      if (run.slice(at, at + signal.length).toLowerCase() === signal) candidates.push(run.slice(at, at + signal.length) + (/^\d+/.exec(run.slice(at + signal.length))?.[0] ?? ''));
    }
    for (const part of candidates) {
      const rest = best[at + part.length];
      if (rest && (!best[at] || rest.length + 1 < best[at]!.length)) best[at] = [part, ...rest];
    }
  }
  return best[0] ?? null;
}

/** Ways to write `run` as a sequence of declared names. */
function declaredSplits(run: string, declared: string[], limit = 2): string[][] {
  const found: string[][] = [];
  const walk = (at: number, parts: string[]) => {
    if (found.length >= limit) return;
    if (at === run.length) { found.push(parts); return; }
    for (const name of declared) if (run.startsWith(name, at)) walk(at + name.length, [...parts, name]);
  };
  walk(0, []);
  return found;
}

function resolveRun(run: string, context: NameContext): string[] {
  if (context.declared.includes(run) || SIMPLE_NAME.test(run)) return [run];
  if (context.declared.length) {
    const splits = declaredSplits(run, context.declared);
    if (splits.length > 1) throw new BoolSyntaxError(`${run} can be read as more than one product of the declared inputs; write the operators`);
    if (splits.length === 1) return splits[0]!;
  }
  const distinct = (parts: string[]) => new Set(parts).size === parts.length;
  const letters = units(run);
  if (letters && letters.length > 1 && distinct(letters) && letters.every((unit) => context.standalone.has(unit) || context.declared.includes(unit))) return letters;
  if (isKnownSignal(run) || context.explicit) return [run];
  const parts = signalSplit(run);
  if (!parts || parts.length < 2 || !distinct(parts)) return [run];
  const single = parts.filter((part) => SIMPLE_NAME.test(part));
  const numbered = single.filter((part) => /\d/.test(part)).length;
  if (!single.length || (numbered && numbered !== single.length)) return [run];
  // Numbered units (S1S0, x1x2) cannot be one name, so only bare letters need the alphabetical evidence.
  const ordered = single.every((part, i) => i === 0 || part[0]!.toLowerCase() > single[i - 1]![0]!.toLowerCase());
  return numbered || ordered ? parts : [run];
}

function parseTokens(tokens: Token[]): BoolNode {
  let at = 0;
  let depth = 0;
  // Nodes closed by parentheses or a function call keep their own gate instead of merging into a chain.
  const closed = new WeakSet<BoolNode>();
  const peek = () => tokens[at];
  // After an operand a word such as NOR is the infix operator, never the start of a juxtaposed NOR(…) call.
  const startsOperand = (token: Token | undefined) => Boolean(token) && (token!.t === 'var' || token!.t === 'const' || token!.t === 'lp' || token!.t === 'not');
  const join = (op: GateOp, left: BoolNode, right: BoolNode): BoolNode => {
    const chains = op === 'and' || op === 'or' || op === 'xor';
    if (chains && left.kind === op && !closed.has(left)) return { kind: op, args: [...left.args, right] };
    return { kind: op, args: [left, right] };
  };
  const level = (ops: GateOp[], next: () => BoolNode, implicit: boolean) => (): BoolNode => {
    let left = next();
    for (;;) {
      const token = peek();
      if (token?.t === 'op' && ops.includes(token.op)) {
        at++;
        if (!peek() || peek()!.t === 'rp' || peek()!.t === 'comma') throw new BoolSyntaxError(`${token.op.toUpperCase()} is missing its right operand`);
        left = join(token.op, left, next());
      } else if (implicit && startsOperand(token)) {
        left = join('and', left, next());
      } else return left;
    }
  };
  const primary = (): BoolNode => {
    const token = peek();
    if (!token) throw new BoolSyntaxError('expression ends where an operand is expected');
    at++;
    if (token.t === 'var') return { kind: 'var', name: token.name };
    if (token.t === 'const') return { kind: 'const', value: token.value };
    if (token.t === 'lp' || (token.t === 'op' && token.word && peek()?.t === 'lp')) {
      if (++depth > MAX_DEPTH) throw new BoolSyntaxError('expression is nested too deeply');
      let node: BoolNode;
      if (token.t === 'op') {
        at++;
        const args = [or()];
        while (peek()?.t === 'comma') { at++; args.push(or()); }
        if (args.length < 2) throw new BoolSyntaxError(`${token.op.toUpperCase()}(…) needs at least two inputs`);
        node = { kind: token.op, args };
      } else node = or();
      if (peek()?.t !== 'rp') throw new BoolSyntaxError('a parenthesis is not closed');
      at++;
      depth--;
      // A fresh object: the same sub-node may also be the tail of an open chain elsewhere.
      node = node.kind === 'var' || node.kind === 'const' ? node : { ...node };
      closed.add(node);
      return node;
    }
    if (token.t === 'op') throw new BoolSyntaxError(`${token.op.toUpperCase()} is missing its left operand`);
    throw new BoolSyntaxError(token.t === 'rp' ? 'a parenthesis closes nothing' : token.t === 'post' ? 'a complement mark follows nothing' : 'a comma is outside a function');
  };
  const postfix = (): BoolNode => {
    let node = primary();
    while (peek()?.t === 'post') { at++; node = { kind: 'not', arg: node }; }
    return node;
  };
  const unary = (): BoolNode => {
    if (peek()?.t !== 'not') return postfix();
    at++;
    if (++depth > MAX_DEPTH) throw new BoolSyntaxError('expression is nested too deeply');
    const node: BoolNode = { kind: 'not', arg: unary() };
    depth--;
    return node;
  };
  const and = level(['and', 'nand'], unary, true);
  const xor = level(['xor', 'xnor'], and, false);
  const or: () => BoolNode = level(['or', 'nor'], xor, false);
  const root = or();
  if (at < tokens.length) {
    const token = tokens[at]!;
    throw new BoolSyntaxError(token.t === 'rp' ? 'a parenthesis closes nothing' : token.t === 'comma' ? 'a comma is outside a function' : 'an operator is missing between two operands');
  }
  return root;
}

interface Line {
  name: string | null;
  args: string[] | null;
  tokens: Token[];
}

function cleanName(text: string): string {
  return text.trim().replace(/\\(?:text|mathrm|mathit|operatorname)\s*/g, '').replace(/[{}\\$]/g, '').replace(/['’]/g, '′');
}

function splitLine(source: string): Line {
  const body = source.trim().replace(/^assign\s+/i, '').replace(/[;.]\s*$/, '');
  // The first assignment sign that is not part of ==, !=, >= separates the output name from its expression.
  const sign = /(?<![=!<>:])(?::=|<=|=)(?!=)|[←⇐]/.exec(body);
  if (!sign) return { name: null, args: null, tokens: tokenize(body) };
  const left = body.slice(0, sign.index).trim();
  const match = /^([^()]+?)\s*(?:\(([^()]*)\))?$/.exec(left);
  const name = match ? cleanName(match[1]!) : '';
  if (!match || !/^[A-Za-z\u0370-\u03FF][A-Za-z0-9_]*′?$/.test(name)) throw new BoolSyntaxError(`the left side of = must be an output name: ${left || '(empty)'}`);
  const args = match[2] === undefined ? null : match[2].split(/[,\s]+/).map(cleanName).filter(Boolean);
  return { name, args, tokens: tokenize(body.slice(sign.index + sign[0].length)) };
}

export function parseInputNames(raw: string): string[] {
  const names = raw.replace(/[[\](){}"'`$\\]/g, ' ').split(/[,;\s]+/).map((name) => name.trim()).filter(Boolean);
  for (const name of names) if (!/^[A-Za-z\u0370-\u03FF][A-Za-z0-9_]*$/.test(name)) throw new BoolSyntaxError(`inputs: ${name} is not a variable name`);
  return [...new Set(names)];
}

function collect(node: BoolNode, into: string[]): void {
  if (node.kind === 'var') { if (!into.includes(node.name)) into.push(node.name); }
  else if (node.kind === 'not') collect(node.arg, into);
  else if (node.kind !== 'const') node.args.forEach((arg) => collect(arg, into));
}

/** Parse every `expr:` line of a spec together: how a name is read depends on the other lines. */
export function parseBoolSystem(sources: string[], inputs?: string): BoolSystem {
  if (!sources.length) throw new BoolSyntaxError('no expression');
  const lines = sources.map(splitLine);
  const fromArgs = lines.flatMap((line) => line.args ?? []);
  const declared = inputs !== undefined ? parseInputNames(inputs) : fromArgs.length ? [...new Set(fromArgs)] : null;
  const all = lines.flatMap((line) => line.tokens);
  const context: NameContext = {
    declared: declared ?? [],
    standalone: new Set(all.flatMap((token) => (token.t === 'run' && SIMPLE_NAME.test(token.text) ? [token.text] : []))),
    // `+` is the one OR sign of juxtaposed algebra; every other AND or OR spelling is the explicit style.
    explicit: all.some((token) => token.t === 'op' && (token.op === 'and' || token.op === 'nand' || token.op === 'nor' || (token.op === 'or' && !token.plus))),
  };
  const variables: string[] = [];
  const outputs = lines.map((line) => {
    if (!line.tokens.length) throw new BoolSyntaxError('an expression is empty');
    const resolved = line.tokens.flatMap((token): Token[] => (token.t === 'run' ? resolveRun(token.text, context).map((name) => ({ t: 'var', name })) : [token]));
    const expr = parseTokens(resolved);
    collect(expr, variables);
    return { name: line.name, expr };
  });
  return { outputs, variables, declared };
}

export function evaluate(node: BoolNode, value: (name: string) => boolean): boolean {
  switch (node.kind) {
    case 'var': return value(node.name);
    case 'const': return node.value === 1;
    case 'not': return !evaluate(node.arg, value);
    case 'and': return node.args.every((arg) => evaluate(arg, value));
    case 'nand': return !node.args.every((arg) => evaluate(arg, value));
    case 'or': return node.args.some((arg) => evaluate(arg, value));
    case 'nor': return !node.args.some((arg) => evaluate(arg, value));
    case 'xor': return node.args.filter((arg) => evaluate(arg, value)).length % 2 === 1;
    case 'xnor': return node.args.filter((arg) => evaluate(arg, value)).length % 2 === 0;
  }
}

/** The output column of a truth table: row r assigns the variables the bits of r, first variable most significant. */
export function truthColumn(node: BoolNode, variables: string[]): boolean[] {
  const index = new Map(variables.map((name, i) => [name, variables.length - 1 - i]));
  return Array.from({ length: 2 ** variables.length }, (_, row) => evaluate(node, (name) => {
    const bit = index.get(name);
    if (bit === undefined) throw new BoolSyntaxError(`variable ${name} has no column`);
    return ((row >> bit) & 1) === 1;
  }));
}

/** Structural identity: two sub-expressions share a gate exactly when their keys are equal. */
export function exprKey(node: BoolNode): string {
  if (node.kind === 'var') return `v:${node.name}`;
  if (node.kind === 'const') return `c:${node.value}`;
  if (node.kind === 'not') return `not(${exprKey(node.arg)})`;
  return `${node.kind}(${node.args.map(exprKey).join(',')})`;
}

const BASE: Record<GateOp, 'and' | 'or' | 'xor'> = { and: 'and', nand: 'and', or: 'or', nor: 'or', xor: 'xor', xnor: 'xor' };
const SIGN = { and: '·', or: ' + ', xor: ' ⊕ ' };

/** Textbook notation: A·B + C′. Parentheses appear only where the structure needs them. */
export function formatExpr(node: BoolNode): string {
  const atom = (child: BoolNode) => (child.kind === 'var' || child.kind === 'const' || child.kind === 'not' || child.kind === 'nand' || child.kind === 'nor' || child.kind === 'xnor' ? formatExpr(child) : `(${formatExpr(child)})`);
  if (node.kind === 'var') return node.name;
  if (node.kind === 'const') return String(node.value);
  if (node.kind === 'not') return `${atom(node.arg)}′`;
  const base = BASE[node.kind];
  // AND binds tighter than the sums, so a product inside a sum needs no parentheses; everything else is explicit.
  const inner = node.args.map((arg) => (base !== 'and' && arg.kind === 'and' ? formatExpr(arg) : atom(arg))).join(SIGN[base]);
  return node.kind === base ? inner : `(${inner})′`;
}
