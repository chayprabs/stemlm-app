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

    expect(html).toContain('stem');
    expect(html).toContain('LM');
    expect(html).toContain('What is the current?');
    expect(html).toContain('Question');
    expect(html).toContain('Answer');
    expect(html).toContain('Label the circuit');
    expect(html).toContain('Solution');
    expect(html).toContain('s1');
    expect(html).toContain('m1');
    expect(html).toContain('katex');
    expect(html).toContain('<math');
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
    expect(doc).toContain('stem');
    expect(doc).toContain('What is the current?');
    expect(doc).toContain('s1');
    expect(doc).toContain('.katex .katex-html{display:none');
    expect(doc).toContain('<math');
    expect(doc).not.toContain('html2canvas');
    expect(doc).toContain('#0ea5a0');
  });

  it('print styles target A4 and branded typography', () => {
    expect(printStyles()).toContain('@page');
    expect(printStyles()).toContain('A4');
    expect(printStyles()).toContain('Inter');
  });

  it('builds a sensible filename', () => {
    const session = buildSession();
    expect(reportFilename(session)).toMatch(/^stemLM-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/);
  });
});
