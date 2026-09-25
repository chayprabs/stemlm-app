import { describe, expect, it } from 'vitest';
import { formatLabel, labelMarkup } from './label-format';
import { compileDiagramSpec } from './compile';

const plain = (text: string) => formatLabel(text).map((run) => (run.shift ? `${run.shift}(${run.text})` : run.text)).join('');

describe('MATH-FIG-01 shared figure label notation', () => {
  it('prints one-letter subscripts, braced subscripts and orbital subscripts', () => {
    expect(plain('V_out')).toBe('Vsub(out)');
    expect(plain('f(x_i)')).toBe('f(xsub(i))');
    expect(plain('R_A')).toBe('Rsub(A)');
    expect(plain('T_{1/2}')).toBe('Tsub(1/2)');
    expect(plain('1s_A')).toBe('1ssub(A)');
    expect(plain('V_CE = 5 V')).toBe('Vsub(CE) = 5 V');
  });

  it('prints superscripts', () => {
    expect(plain('9.81 m/s^2')).toBe('9.81 m/ssuper(2)');
    expect(plain('10^-3 M')).toBe('10super(-3) M');
    expect(plain('e^{-kt}')).toBe('esuper(-kt)');
  });

  it('turns Greek letter names into symbols without touching ordinary words', () => {
    expect(plain('sigma*_1s')).toBe('σ*sub(1s)');
    expect(plain('DeltaH')).toBe('ΔH');
    expect(plain('Delta G = -RT ln K')).toBe('Δ G = -RT ln K');
    expect(plain('\\theta = 30 deg')).toBe('θ = 30 deg');
    expect(plain('2pi rad')).toBe('2π rad');
    expect(plain('epsilon1')).toBe('ε1');
    expect(plain('delta_P')).toBe('δsub(P)');
    expect(plain('pi bond')).toBe('π bond');
    for (const word of ['alphabet', 'pin@0', 'menu', 'chip']) expect(plain(word)).not.toMatch(/[α-ωΑ-Ω]/);
    expect(plain('beta-sheet')).toBe('β-sheet');
    expect(plain('120 psi')).toBe('120 psi');
  });

  it('never rewrites code identifiers', () => {
    for (const text of ['snake_case_name', 'max_value', 'x_1_2', 'arr_len', 'node_A']) expect(plain(text)).toBe(text);
  });

  it('emits escaped tspans that shift and restore the baseline in user units', () => {
    expect(labelMarkup('Plain <label> & text', 12)).toBe('Plain &lt;label&gt; &amp; text');
    const markup = labelMarkup('V_out = 5', 12);
    expect(markup).toBe('V<tspan dy="3.6" font-size="75%">out</tspan><tspan dy="-3.6"> = 5</tspan>');
    expect(labelMarkup('x^2', 10)).toBe('x<tspan dy="-4" font-size="75%">2</tspan>');
  });

  it('renders compiled figure labels in textbook notation', async () => {
    const result = await compileDiagramSpec({ type: 'table', content: 'kind: matrix\nheaders: i, x_i, f(x_i)\nrow: 0, 0.0, 1.000' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const texts = [...new DOMParser().parseFromString(result.svg, 'image/svg+xml').querySelectorAll('text')];
    expect(texts.map((text) => text.textContent)).toEqual(expect.arrayContaining(['xi', 'f(xi)']));
    expect(result.svg).not.toMatch(/>[^<]*x_i/);
    expect(result.scene.labels.map((label) => label.text)).toContain('x_i');
  });
});
