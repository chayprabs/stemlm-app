/**
 * `dist`: a probability distribution drawn to scale, with a shaded event and its probability.
 *
 *   kind:  normal | t | chi2 | exponential | uniform | binomial | poisson     (default normal)
 *   mean: 100   sd: 15        normal (also mu, sigma)
 *   df: 12                    t, chi2
 *   rate: 0.5                 exponential; poisson (also lambda)
 *   min: 0   max: 10          uniform
 *   n: 10   p: 0.3            binomial
 *   shade: 85 115             also `< 85`, `> 115`, `<= 3`, `outside 85 115`
 *   mark: 100                 repeatable: a vertical guide named on the axis
 *   xlabel:
 *
 * The probability is computed here from the distribution function, never read from the spec. On a
 * discrete distribution `shade: a b` includes both ends, and the printed statement says so.
 */
import { SceneBuilder, frameSize } from '../../scene-build';
import type { SpecDoc } from '../../spec';
import { parseQuantity, type Quantity } from './intervals';
import { binomialLaw, chiSquareLaw, exponentialLaw, normalLaw, poissonLaw, studentLaw, uniformLaw, type Law } from './mathstat';
import { EDGE, LINE, TEXT_H, finish, fmt, guard, nameAxis, niceScale, plain, present, put, putLeft, putRight, readAll, readOne, refuse, rejectKeys, textW } from './shared';

const PLOT_H = 72;
/** Bars of a discrete distribution stay wide enough to tell apart. */
const MAX_OUTCOMES = 61;

type Kind = 'normal' | 't' | 'chi2' | 'exponential' | 'uniform' | 'binomial' | 'poisson';

const KINDS: [RegExp, Kind][] = [
  [/^(?:normal|gaussian|bell(?:curve)?|z)$/, 'normal'],
  [/^(?:t|studentt|studentst)$/, 't'],
  [/^(?:chi2|chisq|chisquared?|χ2|χ²)$/, 'chi2'],
  [/^exp(?:onential)?$/, 'exponential'],
  [/^uniform$/, 'uniform'],
  [/^binom(?:ial)?$/, 'binomial'],
  [/^poisson$/, 'poisson'],
];
const PARAMETERS: Record<Kind, string[]> = {
  normal: ['mean', 'mu', 'sd', 'sigma'],
  t: ['df'],
  chi2: ['df'],
  exponential: ['rate', 'lambda'],
  uniform: ['min', 'max'],
  binomial: ['n', 'p'],
  poisson: ['rate', 'lambda'],
};
const NAMES: Record<Kind, string> = {
  normal: 'a normal distribution', t: 'a t distribution', chi2: 'a chi-square distribution', exponential: 'an exponential distribution',
  uniform: 'a uniform distribution', binomial: 'a binomial distribution', poisson: 'a Poisson distribution',
};

function kindOf(text: string): Kind | undefined {
  const word = text.toLowerCase().replace(/[\s_'’-]+/g, '').replace(/distribution$/, '');
  return KINDS.find(([pattern]) => pattern.test(word))?.[1];
}

function number(raw: string, what: string): Quantity {
  const quantity = parseQuantity(raw);
  if (!quantity) refuse(`${what} "${plain(raw)}" is not a number`);
  return quantity;
}

/** One numeric parameter, under any of its names. */
function parameter(spec: SpecDoc, ...keys: string[]): number | undefined {
  const raw = readOne(spec, ...keys);
  if (raw === undefined) return undefined;
  const value = /%$/.test(raw) ? number(raw.slice(0, -1), keys[0]!).value / 100 : number(raw, keys[0]!).value;
  if (!Number.isFinite(value)) refuse(`${keys[0]} must be finite`);
  return value;
}

interface Model {
  law: Law;
  /** The outcomes drawn: a real interval, or the first and last integer of a discrete law. */
  lo: number;
  hi: number;
  caption: string;
  /** The random variable as the probability statement names it. */
  symbol: string;
  /** Values the axis names when nothing more specific is asked for (the normal's mean and whole deviations). */
  ticks?: number[];
  /** Places where the density jumps; the curve is drawn with a vertical edge there. */
  jumps: number[];
}

function readModel(spec: SpecDoc, alias: string | undefined): Model {
  const kindRaw = readOne(spec, 'kind');
  const stated = kindOf(kindRaw ?? alias ?? '');
  if (kindRaw !== undefined && !stated) refuse(`unknown distribution "${kindRaw}" (normal, t, chi2, exponential, uniform, binomial, poisson)`);
  if (!stated && present(spec, 'df')) refuse('df belongs to a t or a chi-square distribution: state kind: t or kind: chi2');
  const kind = stated
    ?? (present(spec, 'n') || present(spec, 'p') ? 'binomial'
      : present(spec, 'min') || present(spec, 'max') ? 'uniform'
        : present(spec, 'rate') ? 'exponential'
          : present(spec, 'lambda') ? 'poisson' : 'normal');
  rejectKeys(spec, NAMES[kind], [...new Set(Object.values(PARAMETERS).flat())].filter((key) => !PARAMETERS[kind].includes(key)));
  const need = (value: number | undefined, name: string) => value ?? refuse(`${NAMES[kind]} needs ${name}`);

  switch (kind) {
    case 'normal': {
      const mean = parameter(spec, 'mean', 'mu') ?? 0;
      const sd = parameter(spec, 'sd', 'sigma') ?? 1;
      if (!(sd > 0)) refuse('sd must be positive');
      return {
        law: normalLaw(mean, sd), lo: mean - 3.5 * sd, hi: mean + 3.5 * sd, jumps: [],
        caption: `μ = ${fmt(mean)}, σ = ${fmt(sd)}`, symbol: mean === 0 && sd === 1 ? 'Z' : 'X',
        // The mean first, then outward: when the numbers are long, the nearer ones are kept.
        ticks: [0, -1, 1, -2, 2, -3, 3].map((k) => Number((mean + k * sd).toPrecision(12))),
      };
    }
    case 't': {
      const df = need(parameter(spec, 'df'), 'df');
      if (!(df > 0)) refuse('df must be positive');
      const reach = df > 4 ? 4 : 5.5;
      return { law: studentLaw(df), lo: -reach, hi: reach, jumps: [], caption: `t, df = ${fmt(df)}`, symbol: 'T' };
    }
    case 'chi2': {
      const df = need(parameter(spec, 'df'), 'df');
      if (!(df > 0)) refuse('df must be positive');
      return { law: chiSquareLaw(df), lo: 0, hi: Math.ceil(df + 4 * Math.sqrt(2 * df)), jumps: [], caption: `χ², df = ${fmt(df)}`, symbol: 'χ²' };
    }
    case 'exponential': {
      const rate = need(parameter(spec, 'rate', 'lambda'), 'rate');
      if (!(rate > 0)) refuse('rate must be positive');
      return { law: exponentialLaw(rate), lo: 0, hi: 5 / rate, jumps: [0], caption: `Exponential, rate = ${fmt(rate)}`, symbol: 'X' };
    }
    case 'uniform': {
      const min = need(parameter(spec, 'min'), 'min');
      const max = need(parameter(spec, 'max'), 'max');
      if (!(max > min)) refuse('max must be greater than min');
      const air = (max - min) * 0.2;
      return { law: uniformLaw(min, max), lo: min - air, hi: max + air, jumps: [min, max], caption: `Uniform on [${fmt(min)}, ${fmt(max)}]`, symbol: 'X' };
    }
    case 'binomial': {
      const n = need(parameter(spec, 'n'), 'n');
      const p = need(parameter(spec, 'p'), 'p');
      if (!Number.isInteger(n) || n < 1) refuse('n must be a whole number of trials, 1 or more');
      if (!(p >= 0 && p <= 1)) refuse('p must be a probability between 0 and 1');
      // More outcomes than can be drawn: keep those within four standard deviations of the mean.
      const wide = n + 1 > MAX_OUTCOMES;
      const spread = 4 * Math.sqrt(n * p * (1 - p));
      return {
        law: binomialLaw(n, p), jumps: [], caption: `Binomial, n = ${fmt(n)}, p = ${fmt(p)}`, symbol: 'X',
        lo: wide ? Math.max(0, Math.floor(n * p - spread)) : 0,
        hi: wide ? Math.min(n, Math.ceil(n * p + spread)) : n,
      };
    }
    case 'poisson': {
      const lambda = need(parameter(spec, 'lambda', 'rate'), 'lambda');
      if (!(lambda > 0)) refuse('lambda must be positive');
      const spread = 4 * Math.sqrt(lambda);
      return { law: poissonLaw(lambda), jumps: [], caption: `Poisson, λ = ${fmt(lambda)}`, symbol: 'X', lo: Math.max(0, Math.floor(lambda - spread)), hi: Math.ceil(lambda + spread) + 1 };
    }
  }
}

/** The shaded event: between two bounds, outside them, or one tail. `strict` is how a tail was written (`<` or `<=`). */
type Shade =
  | { kind: 'between' | 'outside'; a: Quantity; b: Quantity }
  | { kind: 'below' | 'above'; at: Quantity; strict: boolean };

function readShade(spec: SpecDoc): Shade | undefined {
  const raw = readOne(spec, 'shade');
  if (raw === undefined) return undefined;
  const text = plain(raw).replace(/≤|=</g, '<=').replace(/≥|=>/g, '>=');
  const tail = /^(?:[A-Za-zχ][A-Za-z0-9²]*\s*)?(<=|>=|<|>)\s*(\S.*)$/.exec(text);
  if (tail) return { kind: tail[1]!.startsWith('<') ? 'below' : 'above', at: number(tail[2]!, 'shade'), strict: tail[1]!.length === 1 };
  const parts = text.replace(/^(?:outside|between|from)\b\s*/i, '').split(/\s*(?:[,;]|\bto\b|\band\b)\s*|\s+/i).filter(Boolean);
  if (parts.length !== 2) refuse(`shade "${plain(raw)}" is not understood (shade: 85 115, shade: < 85, shade: > 115, shade: outside 85 115)`);
  const [a, b] = parts.map((part) => number(part, 'shade')) as [Quantity, Quantity];
  if (!(a.value < b.value)) refuse('shade needs its lower bound first');
  if (/^outside\b/i.test(text)) return { kind: 'outside', a, b };
  // An infinite end makes the interval a tail.
  if (a.value === -Infinity) return { kind: 'below', at: b, strict: true };
  if (b.value === Infinity) return { kind: 'above', at: a, strict: true };
  return { kind: 'between', a, b };
}

/** Whether outcome `x` belongs to the event. On a discrete law `between` holds both ends and `outside` neither. */
function inEvent(shade: Shade, x: number): boolean {
  switch (shade.kind) {
    case 'between': return x >= shade.a.value && x <= shade.b.value;
    case 'outside': return x < shade.a.value || x > shade.b.value;
    case 'below': return shade.strict ? x < shade.at.value : x <= shade.at.value;
    default: return shade.strict ? x > shade.at.value : x >= shade.at.value;
  }
}

function probability(law: Law, shade: Shade): number {
  // P(X < x) and P(X > x); on a discrete law the neighbouring integer decides whether x itself counts.
  const under = (x: number, strict: boolean) => law.cdf(law.discrete ? (strict ? Math.ceil(x) - 1 : Math.floor(x)) : x);
  const over = (x: number, strict: boolean) => law.sf(law.discrete ? (strict ? Math.floor(x) : Math.ceil(x) - 1) : x);
  switch (shade.kind) {
    case 'below': return under(shade.at.value, shade.strict);
    case 'above': return over(shade.at.value, shade.strict);
    case 'outside': return under(shade.a.value, true) + over(shade.b.value, true);
    default: {
      // Subtract in the tail the interval lies in, so a far interval keeps its digits.
      const upper = shade.a.value >= law.mean;
      const p = upper ? over(shade.a.value, false) - over(shade.b.value, true) : under(shade.b.value, false) - under(shade.a.value, true);
      return Math.max(0, p);
    }
  }
}

/** Four decimals, as probability tables print; a smaller probability keeps two significant figures. */
function probabilityText(p: number): string {
  if (p === 0 || p >= 0.0001) return p.toFixed(4);
  const [mantissa, exponent] = p.toExponential(1).split('e') as [string, string];
  return `${mantissa}×10^{−${Math.abs(Number(exponent))}}`;
}

function statement(shade: Shade, symbol: string, discrete: boolean): string {
  const le = discrete ? '≤' : '<';
  switch (shade.kind) {
    case 'between': return `${shade.a.text} ${le} ${symbol} ${le} ${shade.b.text}`;
    case 'outside': return `${symbol} < ${shade.a.text} or ${symbol} > ${shade.b.text}`;
    case 'below': return `${symbol} ${shade.strict ? '<' : '≤'} ${shade.at.text}`;
    default: return `${symbol} ${shade.strict ? '>' : '≥'} ${shade.at.text}`;
  }
}

export const compileDist = guard((spec, ctx) => {
  const model = readModel(spec, ctx.alias);
  const { law } = model;
  const shade = readShade(spec);
  const marks = readAll(spec, 'mark').flatMap((raw) => plain(raw).split(/[,;]\s*|\s+/).filter(Boolean)).map((raw) => number(raw, 'mark'));
  const xlabel = readOne(spec, 'xlabel')?.trim();
  const bounds = shade ? ('at' in shade ? [shade.at] : [shade.a, shade.b]) : [];
  // Everything asked for is on the axis; a value far outside the distribution cannot be shown to scale.
  const named = [...bounds, ...marks].filter((quantity, i, all) => all.findIndex((other) => other.value === quantity.value) === i);
  if (named.some((quantity) => !Number.isFinite(quantity.value))) refuse('a mark or shade bound must be finite');
  const reach = model.hi - model.lo;
  const values = named.map((quantity) => quantity.value);
  if (values.some((value) => value < model.lo - reach || value > model.hi + reach)) refuse('a mark or shade bound lies too far from the distribution to draw to scale');
  const air = law.discrete ? 0 : reach * 0.03;
  let lo = Math.min(model.lo, ...values.map((value) => (law.discrete ? Math.floor(value) : value - air)));
  let hi = Math.max(model.hi, ...values.map((value) => (law.discrete ? Math.ceil(value) : value + air)));
  if (law.discrete) {
    if (hi - lo + 1 > MAX_OUTCOMES) refuse(`${hi - lo + 1} outcomes are too many to draw as separate bars`);
    // Each bar is centred on its integer.
    lo -= 0.5;
    hi += 0.5;
  }

  const { w } = frameSize(ctx.profile);
  const b = new SceneBuilder('dist', w, 0);
  const x0 = EDGE + 12;
  const x1 = w - EDGE - 12;
  const xAt = (value: number) => x0 + ((value - lo) / (hi - lo)) * (x1 - x0);

  // Header: what the distribution is, and the probability of the shaded event.
  const result = shade ? `P(${statement(shade, model.symbol, law.discrete)}) = ${probabilityText(probability(law, shade))}` : '';
  let top = EDGE;
  if (result && textW(model.caption) + textW(result) + 16 > w - 2 * EDGE) {
    if (textW(result) > w - 2 * EDGE) refuse('the probability statement is too long to print');
    put(b, 'caption', model.caption, w / 2, top + TEXT_H / 2);
    put(b, 'probability', result, w / 2, top + LINE + TEXT_H / 2);
    top += 2 * LINE;
  } else {
    if (result) {
      putLeft(b, 'caption', model.caption, EDGE, top + TEXT_H / 2);
      putRight(b, 'probability', result, w - EDGE, top + TEXT_H / 2);
    } else put(b, 'caption', model.caption, w / 2, top + TEXT_H / 2);
    top += LINE;
  }
  const plotTop = top + 5;
  const base = plotTop + PLOT_H;

  if (law.discrete) {
    const ks = Array.from({ length: Math.round(hi - lo) }, (_, i) => Math.round(lo + 0.5) + i);
    const peak = Math.max(...ks.map((k) => law.f(k)));
    const half = Math.min(9, ((x1 - x0) / ks.length) * 0.36);
    for (const k of ks) {
      const height = (law.f(k) / peak) * PLOT_H;
      if (height < 0.2) continue;
      const chosen = shade !== undefined && inEvent(shade, k);
      b.rect(`bar-${k}`, xAt(k) - half, base - height, 2 * half, height, { color: chosen ? 'accent' : 'neutral', fill: chosen ? 'ink' : 'paper', width: 1.2, role: 'geometry' });
    }
  } else {
    // Samples across the range, plus every place the shape has a corner: jumps of the density and the shade bounds.
    const tiny = (hi - lo) * 1e-9;
    const xs = [...Array.from({ length: 161 }, (_, i) => lo + ((hi - lo) * i) / 160), ...model.jumps.flatMap((x) => [x - tiny, x, x + tiny]), ...bounds.map((bound) => bound.value)]
      .filter((x) => x >= lo && x <= hi)
      .sort((p, q) => p - q);
    const density = xs.map((x) => law.f(x));
    // A density that is unbounded at its edge (chi-square with df < 2) is cut off at the tallest finite sample.
    const peak = Math.max(...density.filter((f) => Number.isFinite(f)));
    const yAt = (f: number) => base - (Math.min(f, peak) / peak) * PLOT_H;
    const region = (id: string, from: number, to: number) => {
      const inside = xs.flatMap((x, i) => (x >= from && x <= to ? [xAt(x), yAt(density[i]!)] : []));
      if (inside.length >= 4) b.polygon(id, [inside[0]!, base, ...inside, inside[inside.length - 2]!, base], { color: 'accent', fill: 'tint', width: 1.2, role: 'geometry' });
    };
    if (shade && 'at' in shade) region('shade', shade.kind === 'below' ? lo : shade.at.value, shade.kind === 'below' ? shade.at.value : hi);
    else if (shade?.kind === 'between') region('shade', shade.a.value, shade.b.value);
    else if (shade) {
      region('shade', lo, shade.a.value);
      region('shade-2', shade.b.value, hi);
    }
    b.polyline('curve', xs.flatMap((x, i) => [xAt(x), yAt(density[i]!)]), { width: 1.6, role: 'geometry', fill: 'none' });
  }

  b.line('axis', x0 - 6, base, x1 + 6, base, { role: 'axis', width: 1.2, protected: true });
  marks.forEach((mark, i) => b.line(`mark-${i}`, xAt(mark.value), base, xAt(mark.value), plotTop - 2, { color: 'guide', width: 1.1, role: 'guide' }));

  let regular = model.ticks;
  // Otherwise: the most nice ticks whose numbers print side by side.
  for (let maxTicks = 9; maxTicks >= 2 && !regular; maxTicks--) {
    const scale = niceScale(lo, hi, maxTicks, { expand: false, integer: law.discrete });
    const pitch = (scale.step / (hi - lo)) * (x1 - x0);
    if (scale.texts.every((text, i) => i === 0 || (textW(text) + textW(scale.texts[i - 1]!)) / 2 + 5 <= pitch)) regular = scale.ticks;
  }
  const labelY = base + 5 + TEXT_H / 2;
  nameAxis(b, xAt, labelY, named, regular ?? []).forEach((x, i) => b.line(`tick-${i}`, x, base, x, base + 3, { role: 'axis', width: 1, protected: true }));

  if (xlabel) {
    if (textW(xlabel) > w - 2 * EDGE) refuse('xlabel is too long to print on one line');
    put(b, 'xlabel', xlabel, w / 2, labelY + TEXT_H / 2 + 2 + TEXT_H / 2);
  }
  b.height = labelY + TEXT_H / 2 + (xlabel ? LINE + 1 : 0) + EDGE;
  return finish(b.scene());
});
