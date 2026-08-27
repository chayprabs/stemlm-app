import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { Report, collectDiagrams, diagramKey } from './Report';
import { buildReportDocument, printStyles, reportFilename, reportPrintTitle } from '@/src/lib/pdf';
import { resolveDiagram, resolveDiagramSvg } from '@/src/lib/resolve-diagram';
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
    expect(html).toContain('slm-report-wordmark');
    expect(html).not.toContain('slm-wordmark-lm');
    expect(html).toContain('<path');
    const wordmark = html.slice(
      html.indexOf('slm-report-wordmark'),
      html.indexOf('</header>'),
    );
    expect(wordmark.match(/<circle/g)?.length).toBe(2);
    expect(html).not.toMatch(/Jun \d+, \d{4}/);
    expect(html).toContain('slm-report-label">Q'); // question label
    expect(html).toContain('What is the current?'); // the full question
    expect(html).not.toContain('slm-report-label">Answer');
    expect(html).toContain('Label the circuit'); // step title
    expect(html).toContain('slm-step-index');
    expect(html).toContain('slm-formula');
    expect(html).not.toContain('slm-report-solution');
    expect(html).toContain('s1'); // step diagram injected (vector svg)
    expect(html).toContain('katex');
    expect(html).toContain('<math');
    expect(html).toContain('PDF made using stemLM');
    expect(html).toContain('https://stemlm.app');
  });

  it('hides screenshot verification/uncertainty chrome and step-id chips', () => {
    const backSub =
      'Back-substitution yields (1/2)^6 = 1/64, matching the factor 64 in 108 days.';
    const session: Session = {
      id: 'r-half-life',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'A sample has half-life 18 days. After 108 days the radiation factor is 64. Why?',
      raw: '',
      capsule: {
        meta: { version: 2, subject: 'Physics', topic: 'Radioactive decay' },
        solution: 'Six half-lives give remaining fraction 1/64.',
        solutionDiagrams: [],
        steps: [
          {
            id: 's1',
            index: 1,
            title: 'Count the half-lives',
            body: '108 days / 18 days = 6 half-lives.',
          },
          {
            id: 's2',
            index: 2,
            title: 'Apply the decay factor',
            body: 'After 6 half-lives the remaining fraction is $(1/2)^6 = 1/64$.',
          },
        ],
        verification: {
          methods: ['units', 'backsub', 'oom'],
          status: 'pass',
          notes: backSub,
        },
        uncertainty: {
          assumptions: ['none'],
          lowConfidenceSteps: ['none'],
          studentChecks: ['Verify that half-life is 18 days and radiation factor is 64.'],
        },
      },
    };
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={{}} />);
    expect(html).not.toContain('slm-verify');
    expect(html).not.toContain('slm-uncertainty');
    expect(html).not.toContain('slm-step-id');
    expect(html).not.toMatch(/>Verification</i);
    expect(html).not.toMatch(/>Uncertainty</i);
    expect(html).not.toMatch(/\bstatus:\s*(pass|fail)\b/i);
    expect(html).not.toMatch(/\bmethods:\s/i);
    expect(html).not.toMatch(/student check/i);
    expect(html).not.toMatch(/low-confidence/i);
    expect(html).not.toContain('Verify that ');
    expect(html).not.toMatch(/>none</i);
    expect(html).not.toMatch(/assumption:\s*none/i);
    expect(html).toContain('Back-substitution yields');
    expect(html).toContain('matching the factor 64');
    expect(html).toContain('slm-answer-notes');
    expect(html).not.toMatch(/slm-answer-notes[^>]*>[\s\S]*<(h2|h3)/i);
    const scratch = resolve(
      'C:\\Users\\chait\\AppData\\Local\\Temp\\grok-goal-b5a9895ff4e4\\implementer',
    );
    mkdirSync(scratch, { recursive: true });
    writeFileSync(resolve(scratch, 'report.html'), html, 'utf8');
  });

  it('folds real assumptions and fail corrections into unlabeled answer prose', () => {
    const session: Session = {
      id: 'r-assume',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Find the current',
      raw: '',
      capsule: {
        meta: { version: 2, subject: 'Electrical', topic: 'Series current' },
        solution: 'I = 2 A after correction.',
        solutionDiagrams: [],
        steps: [
          {
            id: 's1',
            index: 1,
            title: 'Add the resistors',
            body: '$R_T$ is 6 ohm.',
          },
        ],
        verification: {
          methods: ['units'],
          status: 'fail',
          notes: 'mA vs A',
          correction: 'I is 2 A, not 2 mA',
        },
        uncertainty: {
          assumptions: ['take g as 9.81 metres per second squared', 'rms not peak'],
          lowConfidenceSteps: ['s2'],
          studentChecks: ['photo labels for current units'],
        },
      },
    };
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={{}} />);
    expect(html).toContain('take g as 9.81 metres per second squared');
    expect(html).toContain('I is 2 A, not 2 mA');
    expect(html).toContain('rms not peak');
    expect(html).toContain('mA vs A');
    expect(html).not.toContain('slm-verify');
    expect(html).not.toContain('slm-uncertainty');
    expect(html).not.toMatch(/>assumptions</i);
    expect(html).not.toContain('correction:');
    expect(html).not.toContain('photo labels for current units');
    expect(html).not.toContain('slm-step-id');
    expect(html).toContain('slm-answer-notes');
    expect(html.indexOf('slm-report-a')).toBeGreaterThan(-1);
    expect(html.indexOf('slm-answer-notes')).toBeGreaterThan(html.indexOf('slm-report-a'));
  });

  it('still flags non-STEM / insufficient data without protocol chrome', () => {
    const session: Session = {
      id: 'r-verify',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Find the current',
      raw: '',
      capsule: {
        meta: {
          version: 2,
          subject: 'General',
          topic: 'Not a STEM question',
          archetype: 'conceptual',
        },
        solution: 'Not a STEM solve; insufficient data for a numeric answer.',
        solutionDiagrams: [],
        steps: [
          {
            id: 's1',
            index: 1,
            title: 'Name why it is not STEM',
            body: 'The prompt is a poem, not a STEM question.',
          },
        ],
        verification: {
          methods: ['units'],
          status: 'fail',
          notes: 'no numeric given',
          correction: 'Stop; do not invent a current.',
        },
        uncertainty: {
          assumptions: ['insufficient data for I'],
          lowConfidenceSteps: ['s1'],
          studentChecks: ['confirm the request'],
        },
      },
    };
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={{}} />);
    expect(html).toMatch(/Not a STEM question/i);
    expect(html).toMatch(/Insufficient data/i);
    expect(html).toContain('insufficient data for I');
    expect(html).toContain('Stop; do not invent a current.');
    expect(html).toContain('no numeric given');
    expect(html).not.toContain('status: fail');
    expect(html).not.toContain('correction:');
    expect(html).not.toContain('confirm the request');
    expect(html).not.toContain('slm-step-id');
    expect(html).not.toContain('low-confidence');
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
    expect(html).toContain('slm-report-solution');
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
    expect(doc).toContain('KaTeX_Main');
    expect(doc).toContain('stemLM');
    expect(doc).toContain('What is the current?'); // the question
    expect(doc).toContain('s1'); // vector svg diagram embedded
    expect(doc).not.toContain('.katex .katex-html{display:none');
    expect(doc).toContain('katex-html');
    expect(doc).toContain('<math');
    expect(doc).not.toContain('html2canvas');
  });

  it('includes vector SVG and KaTeX/MathML overlays for a compiled plot spec', async () => {
    const plot = {
      type: 'plot',
      content: [
        'fn: 1.5*t^2 - 2*t',
        'var: t',
        'domain: 0 10',
        'xlabel: t (s)',
        'ylabel: \\alpha (rad/s^2)',
        'point: 10, 130',
        'point_label: 130',
        'drop: both',
        'eq: \\alpha(t)=1.5t^{2}-2t',
        'eq_slot: NE',
      ].join('\n'),
    };
    const resolved = await resolveDiagram(plot, 'light', 'print');
    const session = buildSession();
    session.capsule.steps[0]!.diagram = plot;
    const html = buildReportDocument(session, { [diagramKey('step', 1)]: resolved.svg }, {
      [diagramKey('step', 1)]: resolved.overlays,
    });
    expect(html).toContain('<svg');
    expect(html).toMatch(/<(polyline|path|line)\b/i);
    expect(html).not.toContain('foreignObject');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<image\b/i);
    expect(html).toMatch(/katex|mathml|<math/i);
  });

  it('print path for a divider circuit spec is vector SVG without foreignObject/image/script', async () => {
    const circuit = {
      type: 'circuit',
      content: [
        'std: ieee',
        'V1: n_in 0 DC 12',
        'R1: n_in n_a 4k',
        'R2: n_a 0 6k',
        'RL: n_a 0 10k',
        'highlight: R2',
      ].join('\n'),
    };
    const resolved = await resolveDiagram(circuit, 'light', 'print');
    expect(resolved.svg).toMatch(/<(line|polyline|rect|circle|path)\b/i);
    const session = buildSession();
    session.capsule.steps[0]!.diagram = circuit;
    const html = buildReportDocument(session, { [diagramKey('step', 1)]: resolved.svg });
    expect(html).toContain('<svg');
    expect(html).toContain('V1');
    expect(html).toContain('R1');
    expect(html).not.toContain('foreignObject');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<image\b/i);
  });

  it('print styles target A4 and current light reading tokens', () => {
    expect(printStyles()).toContain('@page');
    expect(printStyles()).toContain('A4');
    expect(printStyles()).toContain('#121212');
    expect(printStyles()).toContain('#efefef');
    expect(printStyles()).toContain('#FF6B2C');
    expect(printStyles()).not.toContain('#0ea5a0');
    expect(printStyles()).toContain('IBM Plex Sans');
    expect(printStyles()).toContain('IBM Plex Mono');
    expect(printStyles()).not.toContain('Inter');
    expect(printStyles()).not.toContain('JetBrains Mono');
    expect(printStyles()).toContain('max-width:125mm');
    expect(printStyles()).toContain('max-height:72mm');
    expect(printStyles()).toContain('font:11pt/1.5');
    expect(printStyles()).toContain('font-size:8.5pt');
    expect(printStyles()).not.toContain('border-radius:999px');
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
    expect(reportFilename(session)).toBe('stemLM');
    expect(reportFilename(session)).not.toMatch(/gemini|chatgpt|claude|grok/i);
    expect(reportFilename(session)).not.toMatch(/what-is-the-current|circuit/i);
  });

  it('uses a short print title without dates', () => {
    const session = buildSession();
    const doc = buildReportDocument(session, {});
    expect(reportPrintTitle(session)).toBe('stemLM');
    expect(doc).toContain('<title>stemLM</title>');
    expect(doc).not.toContain('<title>Circuit format check</title>');
    expect(doc).not.toContain('stemLM-what-is-the-current');
  });

  it('writes a Solution-tab print preview for visual QA', async () => {
    const plot = {
      type: 'plot' as const,
      content: [
        'fn: 1.5*t^2 - 2*t',
        'var: t',
        'domain: 0 10',
        'xlabel: t (s)',
        'ylabel: \\alpha (rad/s^2)',
        'point: 10, 130',
        'point_label: 130',
        'drop: both',
        'eq: \\alpha(t)=1.5t^{2}-2t',
        'eq_slot: NE',
      ].join('\n'),
    };
    const session: Session = {
      id: 'preview-angular',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question:
        'A particle is rotating in a circular path and at any instant its motion can be described as $\\theta = \\frac{5t^4}{40} - \\frac{t^3}{3}$. The angular acceleration of the particle after 10 seconds is ______ rad/s².',
      raw: '',
      capsule: {
        meta: { version: 2, subject: 'Physics', topic: 'Angular Acceleration from Position' },
        solution: 'Evaluate $\\alpha(10)=130$ rad/s².',
        solutionDiagrams: [],
        steps: [
          {
            id: 's1',
            index: 1,
            title: 'Simplify the angular position function',
            formula: '$\\theta(t) = \\frac{1}{8}t^4 - \\frac{1}{3}t^3$',
            body: '$\\theta$ is the angular position in radians. We are given $\\theta(t) = \\frac{5t^4}{40} - \\frac{t^3}{3}$. We simplify the fraction by dividing the numerator and denominator of the first term by 5, which yields the simplified position function.',
          },
          {
            id: 's2',
            index: 2,
            title: 'Differentiate to find angular velocity',
            formula: '$\\omega = \\frac{d\\theta}{dt}$',
            body: '$\\omega$ is the angular velocity in rad/s. Applying the power rule to differentiate $\\theta(t) = \\frac{1}{8}t^4 - \\frac{1}{3}t^3$ with respect to time $t$: $\\omega(t) = \\frac{4}{8}t^3 - \\frac{3}{3}t^2 = \\frac{1}{2}t^3 - t^2$.',
          },
          {
            id: 's3',
            index: 3,
            title: 'Differentiate to find angular acceleration',
            formula: '$\\alpha = \\frac{d\\omega}{dt}$',
            body: '$\\alpha$ is the angular acceleration in $rad/s^2$. Applying the power rule again to differentiate $\\omega(t) = \\frac{1}{2}t^3 - t^2$ with respect to time $t$: $\\alpha(t) = \\frac{3}{2}t^2 - 2t = 1.5t^2 - 2t$.',
            diagram: plot,
            takeaway:
              'Angular acceleration is the second time derivative of angular position: $\\alpha = \\frac{d^2\\theta}{dt^2}$.',
          },
          {
            id: 's4',
            index: 4,
            title: 'Substitute the given time to calculate acceleration',
            formula: '$\\alpha(10) = 1.5(10)^2 - 2(10)$',
            body: 'With the target time $t = 10\\text{ s}$: $\\alpha = 1.5(100) - 20 = 150 - 20 = 130\\text{ rad/s}^2$.',
          },
        ],
      },
    };
    const resolved = await resolveDiagram(plot, 'light', 'print');
    const html = buildReportDocument(
      session,
      { [diagramKey('step', 3)]: resolved.svg },
      { [diagramKey('step', 3)]: resolved.overlays },
    );
    const outDir = resolve(process.cwd(), 'output/pdf');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, 'preview.html'), html, 'utf8');
    expect(html).toContain('Angular Acceleration from Position');
    expect(html).toContain('PDF made using stemLM');
    expect(html).toContain('#FF6B2C');
    expect(html).not.toContain('slm-report-label">Answer');
    const plotSvg =
      html.match(/<svg[^>]*data-stemlm-family="plot"[\s\S]*?<\/svg>/)?.[0] ?? '';
    expect(plotSvg.length).toBeGreaterThan(80);
    const tickLabels = [...plotSvg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(
      (m) => m[1] ?? '',
    );
    expect(tickLabels.some((t) => /33333|140\.45/.test(t))).toBe(false);
    expect(html).toContain('slm-diagram-overlay');
    expect(html).toMatch(/class="slm-diagram-overlay"[^>]*left:\s*[\d.]+%/);
    expect(html).not.toMatch(/class="slm-diagram-overlay"[^>]*left:\s*[\d.]+px/);
  });
});
