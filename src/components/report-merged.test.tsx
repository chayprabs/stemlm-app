import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MergedReport,
  Report,
  collectDiagrams,
  collectMergedDiagrams,
  diagramKey,
  entryPrefix,
  mergedReportKicker,
} from './Report';
import type { Diagram, Session, Subject } from '@/src/protocol/types';

const svgDiagram = (id: string): Diagram => ({
  type: 'svg',
  content: `<svg id="${id}"><circle r="1"/></svg>`,
});

function session(
  id: string,
  question: string,
  overrides: { subject?: Subject; topic?: string; diagram?: Diagram } = {},
): Session {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question,
    raw: '',
    capsule: {
      meta: {
        version: 1,
        subject: overrides.subject ?? 'Physics',
        topic: overrides.topic ?? `${id} topic`,
      },
      steps: [
        {
          id: `${id}-s1`,
          index: 1,
          title: `${id} step`,
          body: `${id} work`,
          ...(overrides.diagram ? { diagram: overrides.diagram } : {}),
        },
      ],
      solution: `${id} answer`,
      solutionDiagrams: [],
    },
  };
}

describe('MergedReport', () => {
  const sessions = [
    session('a', 'Find the impedance.', { subject: 'Electrical', topic: 'RLC impedance' }),
    session('b', 'Find the net force.', { subject: 'Physics', topic: 'Newton second law' }),
    session('c', 'Solve the quadratic.', { subject: 'Math', topic: 'Quadratic formula' }),
  ];

  it('carries the brand header and the sign-off exactly once', () => {
    const html = renderToStaticMarkup(<MergedReport sessions={sessions} diagramSvg={{}} />);

    expect(html.match(/slm-report-wordmark/g)).toHaveLength(1);
    expect(html.match(/PDF made using stemlm/g)).toHaveLength(1);
    expect(html.match(/https:\/\/stemlm\.app/g)).toHaveLength(1);
    expect(html.match(/slm-report-head-row/g)).toHaveLength(1);
    expect(html.match(/class="slm-report-foot"/g)).toHaveLength(1);
  });

  it('provides one document-level heading for the merged report', () => {
    const html = renderToStaticMarkup(<MergedReport sessions={sessions} diagramSvg={{}} />);

    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('<h1 class="slm-report-title">Study questions</h1>');
  });

  it('keeps each step heading, formula, and first work block in one print group', () => {
    const withFormula = session('formula', 'Evaluate the relation.', {
      topic: 'Grouped formula',
    });
    withFormula.capsule.steps[0] = {
      ...withFormula.capsule.steps[0]!,
      formula: '$$y = mx + b$$',
      body: 'First worked paragraph.\n\nLater continuation that may break normally.',
    };
    const html = renderToStaticMarkup(<MergedReport sessions={[withFormula]} diagramSvg={{}} />);
    const groupStart = html.indexOf('slm-report-step-intro');
    const headStart = html.indexOf('slm-report-step-head', groupStart);
    const formulaStart = html.indexOf('slm-formula', groupStart);
    const workStart = html.indexOf('slm-step-work--intro', groupStart);

    expect(groupStart).toBeGreaterThan(-1);
    expect(headStart).toBeGreaterThan(groupStart);
    expect(formulaStart).toBeGreaterThan(headStart);
    expect(workStart).toBeGreaterThan(formulaStart);
  });

  it('numbers every question and keeps each topic and subject with it', () => {
    const html = renderToStaticMarkup(<MergedReport sessions={sessions} diagramSvg={{}} />);

    expect(html).toContain('3 questions');
    for (const label of ['Q1', 'Q2', 'Q3']) {
      // Once in the contents, once heading its question.
      expect(html.split(`slm-report-label">${label}<`)).toHaveLength(3);
    }
    expect(html).toContain('RLC impedance');
    expect(html).toContain('Quadratic formula');
    expect(html).toContain('Electrical');
    expect(html.match(/class="slm-report-entry"/g)).toHaveLength(3);

    // Questions appear in the order given, each before the next question's label.
    const q1 = html.indexOf('Find the impedance.');
    const q2 = html.indexOf('Find the net force.');
    const q3 = html.indexOf('Solve the quadratic.');
    expect(q1).toBeGreaterThan(-1);
    expect(q2).toBeGreaterThan(q1);
    expect(q3).toBeGreaterThan(q2);
    // Each answer sits between its own question and the next one.
    expect(html.indexOf('a step')).toBeGreaterThan(q1);
    expect(html.indexOf('a step')).toBeLessThan(q2);
    expect(html.indexOf('b step')).toBeLessThan(q3);
  });

  it('lists the questions on the first page, in order and without page numbers', () => {
    const html = renderToStaticMarkup(<MergedReport sessions={sessions} diagramSvg={{}} />);
    const contents = html.slice(html.indexOf('<ol class="slm-report-contents">'), html.indexOf('</ol>'));
    // Inside the header, so the paginator keeps the list with the title.
    expect(html.indexOf('<ol class="slm-report-contents">')).toBeLessThan(html.indexOf('</header>'));
    expect(contents.match(/<li>/g)).toHaveLength(3);
    expect(contents.indexOf('RLC impedance')).toBeGreaterThan(-1);
    expect(contents.indexOf('Newton second law')).toBeGreaterThan(contents.indexOf('RLC impedance'));
    expect(contents.indexOf('Quadratic formula')).toBeGreaterThan(contents.indexOf('Newton second law'));
    // The list is laid out before the document is cut into pages, so it cannot name them.
    expect(contents).not.toMatch(/\bp(?:age|\.)\s*\d/i);
  });

  it('flows continuously — no forced page break between questions', () => {
    const html = renderToStaticMarkup(<MergedReport sessions={sessions} diagramSvg={{}} />);
    expect(html).not.toMatch(/page-break-before/);
    expect(html).not.toMatch(/break-before/);
    expect(html).not.toMatch(/slm-report-pagebreak/);
  });

  it('keeps every question inside one report container', () => {
    const html = renderToStaticMarkup(<MergedReport sessions={sessions} diagramSvg={{}} />);
    expect(html.match(/class="slm-report slm-report--merged"/g)).toHaveLength(1);
  });

  it('renders a single question without merge chrome', () => {
    const one = [session('solo', 'Only one.')];
    const html = renderToStaticMarkup(<MergedReport sessions={one} diagramSvg={{}} />);
    expect(html).toContain('1 question');
    expect(html).not.toContain('1 questions');
    expect(html).not.toContain('slm-report-contents');
    expect(mergedReportKicker(1)).toBe('1 question');
    expect(mergedReportKicker(4)).toBe('4 questions');
  });
});

describe('merged diagram keys', () => {
  it('namespaces each question so identical step numbers never collide', () => {
    const withFigures = [
      session('a', 'First', { diagram: svgDiagram('fig-a') }),
      session('b', 'Second', { diagram: svgDiagram('fig-b') }),
    ];

    const keys = collectMergedDiagrams(withFigures).map((entry) => entry.key);
    expect(keys).toEqual(['q1-step-1', 'q2-step-1']);
    expect(new Set(keys).size).toBe(keys.length);

    const html = renderToStaticMarkup(
      <MergedReport
        sessions={withFigures}
        diagramSvg={{ 'q1-step-1': '<svg id="one" viewBox="0 0 20 20"><circle r="5"/></svg>', 'q2-step-1': '<svg id="two" viewBox="0 0 20 20"><circle r="5"/></svg>' }}
      />,
    );
    expect(html).toContain('id="one"');
    expect(html).toContain('id="two"');
  });

  it('leaves un-prefixed single-report keys unchanged', () => {
    const single = session('solo', 'Only one.', { diagram: svgDiagram('fig') });
    expect(collectDiagrams(single).map((d) => d.key)).toEqual(['step-1']);
    expect(diagramKey('step', 1)).toBe('step-1');
    expect(diagramKey('step', 1, entryPrefix(2))).toBe('q3-step-1');

    const html = renderToStaticMarkup(
      <Report session={single} diagramSvg={{ 'step-1': '<svg id="solo-fig" viewBox="0 0 20 20"><circle r="5"/></svg>' }} />,
    );
    expect(html).toContain('id="solo-fig"');
  });
});
