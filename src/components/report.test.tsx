import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Report, collectDiagrams, diagramKey } from './Report';
import { buildReportDocument, printStyles, reportFilename } from '@/src/lib/pdf';
import { parse } from '@/src/protocol/parser';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import type { Session } from '@/src/protocol/types';

function buildSession(): Session {
  const result = parse(FENCED_ELECTRICAL);
  return {
    id: 'r1',
    createdAt: 0,
    updatedAt: 0,
    platform: 'chatgpt',
    question: 'What is the current?',
    capsule: result.capsule!,
    reviewedStepIds: [],
    raw: '',
  };
}

describe('collectDiagrams', () => {
  it('keys every step + solution diagram', () => {
    const session = buildSession();
    const diagrams = collectDiagrams(session);
    // step 1 has an svg; solution has one mermaid
    const keys = diagrams.map((d) => d.key);
    expect(keys).toContain(diagramKey('step', 1));
    expect(keys).toContain(diagramKey('sol', 0));
  });
});

describe('Report renderToStaticMarkup', () => {
  it('renders a self-contained report with content', () => {
    const session = buildSession();
    const diagramSvg = {
      [diagramKey('step', 1)]: '<svg id="s1"><circle r="1"/></svg>',
      [diagramKey('sol', 0)]: '<svg id="m1"><rect/></svg>',
    };
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={diagramSvg} />);

    expect(html).toContain('stemLM');
    expect(html).toContain('Q.'); // question label
    expect(html).toContain('What is the current?'); // the full question
    expect(html).toContain('Ans.'); // answer label
    expect(html).toContain('Label the circuit'); // step title
    expect(html).toContain('Solution'); // full solution subheading
    expect(html).toContain('s1'); // step diagram injected (vector svg)
    expect(html).toContain('m1'); // solution diagram injected (vector svg)
    // KaTeX rendered the formula (with MathML for font-independent printing)
    expect(html).toContain('katex');
    expect(html).toContain('<math'); // MathML present for vector PDF
  });

  it('does not throw without diagrams resolved', () => {
    const session = buildSession();
    expect(() => renderToStaticMarkup(<Report session={session} diagramSvg={{}} />)).not.toThrow();
  });
});

describe('buildReportDocument (vector print PDF)', () => {
  it('builds a self-contained HTML document with the report + print styles', () => {
    const session = buildSession();
    const diagramSvg = { [diagramKey('step', 1)]: '<svg id="s1"><circle r="1"/></svg>' };
    const doc = buildReportDocument(session, diagramSvg);

    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<style>');
    expect(doc).toContain('stemLM');
    expect(doc).toContain('What is the current?'); // the question
    expect(doc).toContain('s1'); // vector svg diagram embedded
    // Math shown via MathML, KaTeX HTML hidden → no webfonts needed.
    expect(doc).toContain('.katex .katex-html{display:none');
    expect(doc).toContain('<math');
    // No raster/AI image pipeline.
    expect(doc).not.toContain('html2canvas');
  });

  it('print styles target A4 and textbook typography', () => {
    expect(printStyles()).toContain('@page');
    expect(printStyles()).toContain('A4');
  });

  it('builds a sensible filename', () => {
    const session = buildSession();
    expect(reportFilename(session)).toMatch(/^stemLM-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/);
  });
});
