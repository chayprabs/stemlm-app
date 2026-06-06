import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { scoreRaw } from './score';
import {
  buildLongStepCapsule,
  TEN_STEP_ELECTRICAL,
  TWELVE_STEP_ELECTRICAL,
  EIGHT_STEP_MATH,
} from './__fixtures-long-steps';
import { renderToStaticMarkup } from 'react-dom/server';
import { Report, collectDiagrams, diagramKey } from '@/src/components/Report';
import type { Session } from './types';

function sessionFrom(raw: string): Session {
  const result = parse(raw);
  return {
    id: 'long',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Long multi-step problem',
    capsule: result.capsule!,
    reviewedStepIds: [],
    raw,
  };
}

describe('long-step capsules (8–12 steps)', () => {
  for (const count of [8, 10, 12]) {
    describe(`${count} steps`, () => {
      const raw = buildLongStepCapsule(count);
      const result = parse(raw);

      it('parses with ok status and no step-count warning', () => {
        expect(result.status).toBe('ok');
        expect(result.capsule?.steps).toHaveLength(count);
        expect(result.warningCodes).not.toContain('invalid_step_count');
      });

      it('assigns consecutive 1-based step indices', () => {
        const indices = result.capsule!.steps.map((s) => s.index);
        expect(indices).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      });

      it('every step has title, body, and diagram', () => {
        for (const step of result.capsule!.steps) {
          expect(step.title.length).toBeGreaterThan(0);
          expect(step.body.length).toBeGreaterThan(0);
          expect(step.diagram?.type).toBe('svg');
        }
      });

      it('passes scoreRaw gate', async () => {
        const score = await scoreRaw(raw);
        expect(score.parse_ok).toBe(1);
        expect(score.step_count).toBe(count);
        expect(score.svg_valid).toBe(1);
      });
    });
  }

  it('13 steps emits invalid_step_count warning but still parses', () => {
    const result = parse(buildLongStepCapsule(13));
    expect(result.capsule?.steps).toHaveLength(13);
    expect(result.warningCodes).toContain('invalid_step_count');
    expect(result.status).toBe('ok');
  });
});

describe('ten-step electrical fixture (realistic)', () => {
  const result = parse(TEN_STEP_ELECTRICAL);

  it('is Electrical with mesh topic', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toContain('Mesh');
  });

  it('has exactly 10 steps', () => {
    expect(result.capsule?.steps).toHaveLength(10);
  });
});

describe('long-step PDF report render', () => {
  it('renders all 10 step titles in the report', () => {
    const session = sessionFrom(TEN_STEP_ELECTRICAL);
    const diagramSvg: Record<string, string> = {};
    for (const d of collectDiagrams(session)) {
      diagramSvg[d.key] = '<svg viewBox="0 0 10 10"><circle r="1"/></svg>';
    }
    const html = renderToStaticMarkup(<Report session={session} diagramSvg={diagramSvg} />);
    for (let i = 1; i <= 10; i++) {
      expect(html).toContain(`Atomic move ${i}`);
    }
    expect(collectDiagrams(session).map((d) => d.key)).toContain(diagramKey('step', 10));
    expect(html.match(/class="slm-report-step"/g)?.length).toBe(10);
  });

  it('renders all 12 steps without truncation', () => {
    const session = sessionFrom(TWELVE_STEP_ELECTRICAL);
    const html = renderToStaticMarkup(
      <Report session={session} diagramSvg={{}} />,
    );
    expect(session.capsule.steps).toHaveLength(12);
    expect(html).toContain('Atomic move 12');
  });
});

describe('eight-step math fixture', () => {
  it('parses as Math subject', () => {
    const result = parse(EIGHT_STEP_MATH);
    expect(result.capsule?.meta.subject).toBe('Math');
    expect(result.capsule?.steps).toHaveLength(8);
  });
});
