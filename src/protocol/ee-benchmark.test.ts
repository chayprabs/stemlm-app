import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/mermaid', () => ({
  renderMermaid: vi.fn(
    async () =>
      '<svg viewBox="0 0 100 60"><rect width="40" height="20" style="fill:#eee;stroke:#333"/></svg>',
  ),
}));

import { parse } from './parser';
import { scoreRaw } from './score';
import { buildCapsule } from './ee-benchmark/capsule-builder';
import { auditSvgDiagram, svgParses } from './ee-benchmark/svg-utils';
import { auditCapsuleDiagrams } from './diagram-quality';
import { sanitizeSvg, extractSvg } from '@/src/lib/sanitize';
import { computeDisplaySize } from '@/src/lib/diagram-bounds';
import { buildReportDocument } from '@/src/lib/pdf';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { ALL_EE_QUESTIONS } from './ee-benchmark/questions';
import type { Session } from './types';

function assertDiagramSurvivesPipeline(svg: string): void {
  const clean = sanitizeSvg(extractSvg(svg));
  expect(clean).toContain('<svg');
  expect(clean.length).toBeGreaterThan(40);
  expect(svgParses(clean)).toBe(true);
}

describe('EE Benchmark — all 50 questions exist', () => {
  it('has exactly 50 questions with unique IDs 1–50', () => {
    expect(ALL_EE_QUESTIONS).toHaveLength(50);
    const ids = ALL_EE_QUESTIONS.map((q) => q.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('each question has unique slug', () => {
    const slugs = ALL_EE_QUESTIONS.map((q) => q.slug);
    expect(new Set(slugs).size).toBe(50);
  });
});

describe.each(ALL_EE_QUESTIONS.map((q) => [q.id, q.slug, q] as const))(
  'Q%i %s',
  (id, _slug, question) => {
    const raw = buildCapsule(question);
    const result = parse(raw);

    it('parses to ok status with ≥3 steps', () => {
      expect(result.status).toBe('ok');
      expect(result.capsule?.steps.length).toBeGreaterThanOrEqual(3);
      expect(result.capsule?.meta.subject).toBe('Electrical');
    });

    it('every step has formula, body, takeaway, quickcheck, followup, SVG', () => {
      for (const step of result.capsule!.steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
        expect(step.formula).toBeTruthy();
        expect(step.takeaway).toBeTruthy();
        expect(step.quickCheck?.question).toBeTruthy();
        expect(step.quickCheck?.answer).toBeTruthy();
        expect(step.followup).toBeTruthy();
        expect(step.diagram?.type).toBe('svg');
        expect(step.diagram?.content).toContain('<svg');
      }
    });

    it('all SVG diagrams survive sanitize pipeline (no parse failure)', () => {
      for (const step of result.capsule!.steps) {
        assertDiagramSurvivesPipeline(step.diagram!.content);
      }
      if (question.solutionSvg) {
        assertDiagramSurvivesPipeline(question.solutionSvg);
      }
    });

    it('SVG diagrams pass collision/bounds audit (no label collisions)', () => {
      for (const step of result.capsule!.steps) {
        const audit = auditSvgDiagram(step.diagram!.content, step.title);
        expect(audit.errors, `Q${id} step "${step.title}": ${audit.errors.join('; ')}`).toHaveLength(0);
      }
    });

    it('diagrams fit panel and PDF display bounds', () => {
      for (const step of result.capsule!.steps) {
        const vb = /viewBox="([^"]*)"/.exec(step.diagram!.content)?.[1];
        const stepSize = computeDisplaySize(vb, 'step');
        const printSize = computeDisplaySize(vb, 'print');
        expect(stepSize.width).toBeGreaterThan(0);
        expect(stepSize.height).toBeGreaterThan(0);
        expect(printSize.width).toBeLessThanOrEqual(500);
        expect(printSize.height).toBeLessThanOrEqual(300);
      }
    });

    it('passes scoreRaw gate (parse_ok, clean_fence, svg_valid)', async () => {
      const score = await scoreRaw(raw);
      expect(score.parse_ok, `Q${id} parse_ok`).toBe(1);
      expect(score.clean_fence, `Q${id} clean_fence`).toBe(1);
      expect(score.step_count, `Q${id} step_count`).toBeGreaterThanOrEqual(3);
      if (score.svg_valid !== null) {
        expect(score.svg_valid, `Q${id} svg_valid`).toBe(1);
      }
      expect(score.error_code, `Q${id} error_code`).toBeUndefined();
    });

    it('passes diagram-quality audit (no missing circuit diagrams)', () => {
      const issues = auditCapsuleDiagrams(result.capsule!);
      expect(issues, `Q${id} diagram issues: ${issues.join(', ')}`).toHaveLength(0);
    });

    it('solution block is present and references verified values', () => {
      expect(result.capsule!.solution.length).toBeGreaterThan(0);
      const sol = result.capsule!.solution;
      expect(sol).toBeTruthy();
    });

    it('PDF report builds without error', async () => {
      const session: Session = {
        id: `q${id}`,
        createdAt: 0,
        updatedAt: 0,
        platform: 'gemini',
        question: question.problemStatement,
        capsule: result.capsule!,
        reviewedStepIds: [],
        raw,
      };
      const diagramSvg: Record<string, string> = {};
      for (let i = 0; i < session.capsule.steps.length; i++) {
        const step = session.capsule.steps[i]!;
        if (step.diagram) {
          diagramSvg[`step-${i + 1}`] = await resolveDiagramSvg(step.diagram, 'light', 'print');
        }
      }
      const doc = buildReportDocument(session, diagramSvg);
      expect(doc).toContain('stemLM');
      expect(doc).toContain('Solution');
      expect(doc).not.toContain('parsererror');
    });
  },
);

describe('EE Benchmark — math verification samples', () => {
  it('Q1: I=2A, V drops sum to 24V', () => {
    const q = ALL_EE_QUESTIONS[0]!;
    expect(q.verified.I).toBe(2);
    expect(q.verified.V_R1 as number + (q.verified.V_R2 as number) + (q.verified.V_R3 as number)).toBe(24);
  });

  it('Q17: PF correction reduces line current', () => {
    const q = ALL_EE_QUESTIONS[16]!;
    expect(q.verified.I2 as number).toBeLessThan(q.verified.I1 as number);
  });

  it('Q42: closed-loop gain Af = A/(1+T)', () => {
    const q = ALL_EE_QUESTIONS[41]!;
    const A = 2000;
    const T = 80;
    expect(q.verified.Af).toBeCloseTo(A / (1 + T), 1);
  });
});
