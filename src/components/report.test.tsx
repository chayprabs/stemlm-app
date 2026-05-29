import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Report, collectDiagrams, diagramKey } from './Report';
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
    expect(html).toContain('Series resistor voltage'); // topic
    expect(html).toContain('Label the circuit'); // step title
    expect(html).toContain('Step 1');
    expect(html).toContain('Full solution');
    expect(html).toContain('s1'); // step diagram injected
    expect(html).toContain('m1'); // solution diagram injected
    // KaTeX rendered the formula
    expect(html).toContain('katex');
  });

  it('does not throw without diagrams resolved', () => {
    const session = buildSession();
    expect(() => renderToStaticMarkup(<Report session={session} diagramSvg={{}} />)).not.toThrow();
  });
});
