import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MathMarkdown } from '@/src/components/MathMarkdown';
import { Report } from '@/src/components/Report';
import type { Session } from '@/src/protocol/types';
import { prepareMathForRender } from './math-content';

/** The rendered text and the TeX of every formula, as the student would see them. */
function render(content: string, promote?: boolean): { text: string; tex: string[] } {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(createElement(MathMarkdown, { content, promote }));
  const tex: string[] = [];
  for (const formula of [...host.querySelectorAll('.katex')]) {
    tex.push(formula.querySelector('annotation')?.textContent ?? '');
    formula.replaceWith(document.createTextNode('⟦math⟧'));
  }
  return { text: host.textContent ?? '', tex };
}

describe("MathMarkdown promote={false}: the student's own words", () => {
  it.each([
    'Run Dijkstra from A on edges A-B 4, A-C 2',
    'find x if x_1 = 5',
    'Ka = 1.8 x 10^-5 and V_out = 3, with ½ of sqrt(x)',
    'Is f(x) = x^2 + 1 increasing when x > 0?',
    'It costs $5 and $10, and 2*3*4 = 24.',
    'a*b*c and m/s^2 and (1/2)^6 = 1/64',
  ])('shows %j exactly as typed', (question) => {
    expect(render(question, false)).toEqual({ text: question, tex: [] });
  });

  it('still typesets math the student delimited, in every delimiter style', () => {
    expect(render('Solve $x^2$ = 4 for x_1', false)).toEqual({ text: 'Solve ⟦math⟧ = 4 for x_1', tex: ['x^2'] });
    expect(render('Use \\(y^2\\) on edges A-B 4', false)).toEqual({ text: 'Use ⟦math⟧ on edges A-B 4', tex: ['y^2'] });
    expect(render('Then \\[z = 1\\] holds', false).tex).toEqual(['z = 1']);
    expect(render('Given\n$$\nE = mc^2\n$$\nfind x_2', false).tex).toEqual(['E = mc^2']);
    expect(render('Take $sqrt(x+1)$ here', false).tex).toEqual(['\\sqrt{x+1}']);
  });

  it('still typesets an explicit TeX command, and nothing around it that is only a guess', () => {
    const pasted = render('Three vectors \\vec{P} and \\vec{Q} are shown, with x_1 = 5 on edge A-B.', false);
    expect(pasted.tex).toEqual(['\\vec{P}', '\\vec{Q}']);
    expect(pasted.text).toBe('Three vectors ⟦math⟧ and ⟦math⟧ are shown, with x_1 = 5 on edge A-B.');
    expect(render('where \\theta = 5t^4/40 holds', false).tex).toEqual(['\\theta = 5t^4/40']);
  });

  it('removes delimiters a model put around a whole sentence without promoting what is inside', () => {
    expect(render('$Why is the current leaving C written as (V_C - V_D)/24$?', false)).toEqual({
      text: 'Why is the current leaving C written as (V_C - V_D)/24?',
      tex: [],
    });
  });

  it('promotes by default, and always for a formula block', () => {
    expect(render('find x if x_1 = 5').tex).toEqual(['x_1 = 5']);
    expect(render('find x if x_1 = 5', true).tex).toEqual(['x_1 = 5']);
    expect(prepareMathForRender('Z_L = j\\omega L', 'display', true, false)).toBe('$$\nZ_L = j\\omega L\n$$');
  });

  it('leaves the prepared string untouched outside Markdown mode too', () => {
    for (const question of ['edges A-B 4, A-C 2', 'find x if x_1 = 5', 'a*b*c = 24']) {
      expect(prepareMathForRender(question, 'auto', false, false)).toBe(question);
    }
  });
});

describe('the question as the report shows it', () => {
  const session: Session = {
    id: 'promote-off',
    createdAt: 1,
    updatedAt: 1,
    platform: 'claude',
    raw: '',
    question: 'Run Dijkstra from A on edges A-B 4, A-C 2 and find x if x_1 = 5, given $x^2$ = 25.',
    capsule: {
      meta: { version: 2, subject: 'Math', topic: 'Shortest paths' },
      steps: [{ id: 's1', index: 1, title: 'Relax the edges', body: 'Then x_1 = 5 follows.' }],
      solution: 'The distance is 6.',
      solutionDiagrams: [],
    },
  };

  it('keeps the question as typed while the model text is still promoted', () => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(createElement(Report, { session, diagramSvg: {} }));
    const question = host.querySelector('.slm-report-q-text')!;
    const tex = [...question.querySelectorAll('annotation')].map((node) => node.textContent);
    expect(tex).toEqual(['x^2']);
    for (const formula of [...question.querySelectorAll('.katex')]) formula.replaceWith(document.createTextNode('⟦math⟧'));
    expect(question.textContent).toBe('Run Dijkstra from A on edges A-B 4, A-C 2 and find x if x_1 = 5, given ⟦math⟧ = 25.');
    const body = [...host.querySelectorAll('annotation')].map((node) => node.textContent);
    expect(body).toContain('x_1 = 5');
  });
});
