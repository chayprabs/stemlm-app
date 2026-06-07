import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Report, collectDiagrams, diagramKey } from './Report';
import { buildReportDocument, printStyles, reportFilename, reportPrintTitle } from '@/src/lib/pdf';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { parse } from '@/src/protocol/parser';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import type { Session } from '@/src/protocol/types';

function buildSession(): Session {
  const result = parse(FENCED_ELECTRICAL);
  return {
    id: 'r1',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
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
  });
});

describe('Report renderToStaticMarkup', () => {
  it('renders a self-contained report with content', () => {
    const session = buildSession();
    const diagramSvg = {
      [diagramKey('step', 1)]: '<svg id="s1"><circle r="1"/></svg>',
    };
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={diagramSvg} />);

    expect(html).toContain('stemLM');
    expect(html).toContain('slm-report-mark');
    expect(html).not.toMatch(/Jun \d+, \d{4}/);
    expect(html).toContain('slm-report-label">Q'); // question label
    expect(html).toContain('What is the current?'); // the full question
    expect(html).toContain('slm-report-label">Answer'); // answer label
    expect(html).toContain('Label the circuit'); // step title
    expect(html).toContain('Solution'); // full solution subheading
    expect(html).toContain('s1'); // step diagram injected (vector svg)
    // KaTeX rendered the formula (with MathML for font-independent printing)
    expect(html).toContain('katex');
    expect(html).toContain('<math'); // MathML present for vector PDF
  });

  it('does not throw without diagrams resolved', () => {
    const session = buildSession();
    expect(() => renderToStaticMarkup(<Report session={session} diagramSvg={{}} />)).not.toThrow();
  });

  it('renders question and solution without step cards for saved snapshots', () => {
    const session = buildSession();
    session.capsule.steps = [];
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={{}} />);

    expect(html).toContain('What is the current?');
    expect(html).toContain('Solution');
    expect(html).not.toContain('slm-report-step');
    expect(html).not.toContain('Label the circuit');
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

  it('print styles target A4 and extension brand tokens', () => {
    expect(printStyles()).toContain('@page');
    expect(printStyles()).toContain('A4');
    expect(printStyles()).toContain('#0ea5a0');
    expect(printStyles()).toContain('Inter');
    expect(printStyles()).toContain('JetBrains Mono');
    expect(printStyles()).toContain('max-width:125mm');
    expect(printStyles()).toContain('max-height:72mm');
  });

  it('embeds admittance triangle with normalized markers for PDF export', async () => {
    const diagram = {
      type: 'svg' as const,
      content:
        '<svg viewBox="0 0 320 220"><defs>' +
        '<marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12">' +
        '<path d="M0,0 L12,6 L0,12 L4,6 Z" fill="#000"/></marker></defs>' +
        '<line x1="40" y1="160" x2="200" y2="160" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>' +
        '<line x1="200" y1="160" x2="200" y2="60" stroke="#ffa500" stroke-width="2" marker-end="url(#arrow)"/>' +
        '<line x1="40" y1="160" x2="200" y2="60" stroke="#16a34a" stroke-width="2.5" marker-end="url(#arrow)"/>' +
        '</svg>',
    };
    const svg = await resolveDiagramSvg(diagram, 'light', 'print');
    const session: Session = {
      id: 'adm-pdf',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Parallel RLC admittance',
      capsule: {
        meta: { version: 1, subject: 'Electrical', topic: 'Admittance' },
        steps: [
          {
            id: 'step-1',
            index: 1,
            title: 'Combine components to find total admittance',
            body: '',
            diagram,
          },
        ],
        solution: 'Y_total',
        solutionDiagrams: [],
      },
      reviewedStepIds: [],
      raw: '',
    };
    const doc = buildReportDocument(session, { [diagramKey('step', 1)]: svg });
    expect(doc).not.toContain('userSpaceOnUse');
    expect(doc).not.toContain('fill="#000"');
    expect(doc).toContain('fill="#3b82f6"');
    expect(doc).toContain('fill="#ffa500"');
    expect(doc).toContain('fill="#16a34a"');
    expect(doc).toContain('slm-report-diagram');
  });

  it('builds a sensible filename for save', () => {
    const session = buildSession();
    expect(reportFilename(session)).toMatch(/^stemLM-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/);
  });

  it('uses a short print title without dates', () => {
    const session = buildSession();
    const doc = buildReportDocument(session, {});
    expect(reportPrintTitle(session)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(doc).toContain('<title>Circuit format check</title>');
    expect(doc).not.toContain('stemLM-what-is-the-current');
  });
});
