import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';
import { MathMarkdown } from '@/src/components/MathMarkdown';
import { PROSE_MATH_CORPUS, corpusInput, isProseOnly, type CorpusCase } from './__fixtures__/prose-math-corpus';

/** Stands in for the nth formula on both sides of the comparison. */
const slot = (n: number) => `⟦${n}⟧`;

/**
 * Whitespace is compared, except right beside a formula: a display block sits in its own
 * paragraph in one rendering and on its own line in the other. The spacing around `$…$` is
 * pinned exactly by the string-level corpus test.
 */
const squash = (text: string) => text.replace(/\s+/g, ' ').replace(/ ?(⟦\d+⟧) ?/g, '$1').trim();

/** What the panel shows: the rendered text, with each formula replaced by its slot. */
function renderPanel(content: string): { text: string; tex: string[]; errors: number } {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(createElement(MathMarkdown, { content }));
  const errors = host.querySelectorAll('.katex-error').length;
  const tex: string[] = [];
  for (const formula of [...host.querySelectorAll('.katex')]) {
    tex.push(formula.querySelector('annotation')?.textContent ?? '');
    formula.replaceWith(document.createTextNode(slot(tex.length - 1)));
  }
  return { text: squash(host.textContent ?? ''), tex, errors };
}

/**
 * The oracle: the same source through Markdown alone, with no math pass at all. Prose spans go
 * in as written and each math span as its slot, so any difference in the text is a difference
 * the math pass introduced.
 */
function renderWithoutMath(c: CorpusCase): string {
  let formulas = 0;
  const source = c.spans.map((span) => (span.kind === 'prose' ? span.text : slot(formulas++))).join('');
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, source));
  return squash(host.textContent ?? '');
}

describe('the corpus rendered through MathMarkdown', () => {
  const prose = PROSE_MATH_CORPUS.filter(isProseOnly);
  const mixed = PROSE_MATH_CORPUS.filter((c) => !isProseOnly(c));

  it.each(prose.map((c) => [corpusInput(c), c] as const))('shows prose %j as written, with no formula', (_input, c) => {
    const panel = renderPanel(corpusInput(c));
    expect(panel.tex).toEqual([]);
    expect(panel.text).toBe(renderWithoutMath(c));
  });

  it.each(mixed.map((c) => [corpusInput(c), c] as const))('typesets exactly the math spans of %j', (_input, c) => {
    const panel = renderPanel(corpusInput(c));
    expect(panel.errors).toBe(0);
    expect(panel.tex).toEqual(c.spans.flatMap((span) => (span.kind === 'math' ? [span.tex] : [])));
    expect(panel.text).toBe(renderWithoutMath(c));
  });

  it('renders the reported question without italic edges or glued weights', () => {
    const question =
      "Run Dijkstra's algorithm from A on the graph with edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3. What is the shortest distance to E?";
    const html = renderToStaticMarkup(createElement(MathMarkdown, { content: question }));
    expect(html).not.toContain('katex');
    expect(html).not.toContain('−');
    expect(html).toContain('edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, D-E 3.');
  });
});
