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

const unbrace = (value: string) => value.replace(/^\{([^{}]*)\}$/, '$1');

export function formatLabel(text: string): LabelRun[] {
  const greek = text.replace(GREEK_NAME, (_, psi: string | undefined, name: string | undefined) => (psi ? 'ψ' : GREEK[name!]!));
  const marks: { at: number; end: number; runs: LabelRun[] }[] = [];
  for (const match of greek.matchAll(SUBSCRIPT)) {
    marks.push({ at: match.index!, end: match.index! + match[0].length, runs: [{ text: match[1]! }, { text: unbrace(match[2]!), shift: 'sub' }] });
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
