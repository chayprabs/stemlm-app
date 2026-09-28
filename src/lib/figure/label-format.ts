/**
 * Shared figure-label notation. Engines keep plain label text (the layout kernel
 * measures it; `_ ^ { }` have no width there), and emit prints it the way a
 * textbook does: one-letter subscripts (V_out, x_i, T_{1/2}, 1s_A), superscripts
 * (m/s^2, 10^-3) and Greek letter names (sigma*, Delta H, \theta).
 */
export interface LabelRun {
  text: string;
  shift?: 'sub' | 'super';
}

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ',
  sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ',
  Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};
// `psi` is also a pressure unit, so the lowercase name converts only as \psi.
const GREEK_NAME = new RegExp(`(?<![A-Za-z])(?:\\\\(psi)|\\\\?(${Object.keys(GREEK).join('|')}))(?![a-z])`, 'g');

/** A one-letter (or Greek, or orbital like 1s) base, then `_` and a braced group or one word. */
const SUBSCRIPT = /(?<![A-Za-z0-9_])((?:\d?[A-Za-z]|[α-ωΑ-Ω])[*'′]?)_(\{[^{}]*\}|[A-Za-z0-9]+)(?![A-Za-z0-9_])/g;
const SUPERSCRIPT = /\^(\{[^{}]*\}|[+-]?[A-Za-z0-9]+)/g;
/** An explicitly braced subscript may follow any letter or bracket (CH_{3}COOH, Cu(OH)_{2}). */
const BRACED_SUBSCRIPT = /(?<=[A-Za-z)\]])_\{([^{}]*)\}/g;

const ELEMENT = '[A-Z][a-z]?';
const FORMULA = new RegExp(`^((?:${ELEMENT}\\d*|\\((?:${ELEMENT}\\d*)+\\)\\d*)+)(?:\\^?\\{?(\\d*[+-])\\}?)?(\\((?:aq|s|l|g)\\))?$`);

/**
 * A chemical species in label notation: counts become subscripts and a trailing charge a superscript.
 * A single-element ion takes its trailing digit as the charge (Fe2+ → Fe²⁺); a polyatomic ion keeps a
 * lone trailing digit as a count (NH4+ → NH₄⁺) and reads two as count + charge (SO42- → SO₄²⁻).
 * Anything that is not a formula is returned unchanged.
 */
export function chemicalNotation(text: string): string {
  const match = FORMULA.exec(text.trim());
  if (!match) return text;
  let body = match[1]!;
  let charge = match[2] ?? '';
  const elements = body.match(/[A-Z]/g)?.length ?? 0;
  const explicitCaret = /\^/.test(text);
  if (charge && !explicitCaret && /^[+-]$/.test(charge)) {
    const trailing = /(\d+)$/.exec(body)?.[1];
    if (trailing && (elements === 1 || trailing.length >= 2)) {
      const magnitude = elements === 1 ? trailing : trailing.slice(-1);
      body = body.slice(0, body.length - magnitude.length);
      charge = `${magnitude}${charge}`;
    }
  }
  const counts = body.replace(/(?<=[A-Za-z)])(\d+)/g, '_{$1}');
  return `${counts}${charge ? `^{${charge}}` : ''}${match[3] ?? ''}`;
}

const GREEK_ORBITAL: Record<string, string> = { s: 'σ', sigma: 'σ', σ: 'σ', p: 'π', pi: 'π', π: 'π', d: 'δ', delta: 'δ', δ: 'δ' };

/** Textbook notation for a level name: σ*2p → σ*₂ₚ (ASCII s/p/d and sigma/pi/delta read as σ/π/δ), t2g → t₂g. */
export function orbitalNotation(id: string): string {
  const molecular = /^(\d*)(σ|sigma|π|pi|δ|delta|[spd])(\*?)_?\{?(\d[spdf][xyz]?)\}?([gu]?)(\*?)$/i.exec(id.trim());
  if (molecular) {
    const greek = GREEK_ORBITAL[molecular[2]!.toLowerCase()]!;
    return `${molecular[1]}${greek}${molecular[3]}${molecular[6]}_{${molecular[4]}${molecular[5]}}`;
  }
  const mulliken = /^(\d*[abet])(\d?[gu]|\d)$/i.exec(id.trim());
  return mulliken ? `${mulliken[1]}_{${mulliken[2]}}` : id;
}

const unbrace = (value: string) => value.replace(/^\{([^{}]*)\}$/, '$1');

export function formatLabel(text: string): LabelRun[] {
  const greek = text.replace(GREEK_NAME, (_, psi: string | undefined, name: string | undefined) => (psi ? 'ψ' : GREEK[name!]!));
  const marks: { at: number; end: number; runs: LabelRun[] }[] = [];
  for (const match of greek.matchAll(SUBSCRIPT)) {
    marks.push({ at: match.index!, end: match.index! + match[0].length, runs: [{ text: match[1]! }, { text: unbrace(match[2]!), shift: 'sub' }] });
  }
  for (const match of greek.matchAll(BRACED_SUBSCRIPT)) {
    if (marks.some((mark) => match.index! < mark.end && mark.at < match.index! + match[0].length)) continue;
    marks.push({ at: match.index!, end: match.index! + match[0].length, runs: [{ text: match[1]!, shift: 'sub' }] });
  }
  for (const match of greek.matchAll(SUPERSCRIPT)) {
    if (marks.some((mark) => match.index! < mark.end && mark.at < match.index! + match[0].length)) continue;
    marks.push({ at: match.index!, end: match.index! + match[0].length, runs: [{ text: unbrace(match[1]!), shift: 'super' }] });
  }
  marks.sort((a, b) => a.at - b.at);
  const runs: LabelRun[] = [];
  const push = (run: LabelRun) => {
    if (!run.text) return;
    const last = runs.at(-1);
    if (last && !last.shift && !run.shift) last.text += run.text;
    else runs.push({ ...run });
  };
  let cursor = 0;
  for (const mark of marks) {
    push({ text: greek.slice(cursor, mark.at) });
    mark.runs.forEach(push);
    cursor = mark.end;
  }
  push({ text: greek.slice(cursor) });
  return runs.length ? runs : [{ text: '' }];
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** SVG text content for a label: escaped text, with tspans that shift and restore the baseline. */
export function labelMarkup(text: string, fontSize: number): string {
  const offset = { sub: 0.3 * fontSize, super: -0.4 * fontSize };
  let baseline = 0;
  let out = '';
  for (const run of formatLabel(text)) {
    const target = run.shift ? offset[run.shift] : 0;
    const dy = Number((target - baseline).toFixed(2));
    baseline = target;
    const attrs = `${dy ? ` dy="${dy}"` : ''}${run.shift ? ' font-size="75%"' : ''}`;
    out += attrs ? `<tspan${attrs}>${esc(run.text)}</tspan>` : esc(run.text);
  }
  return out;
}
