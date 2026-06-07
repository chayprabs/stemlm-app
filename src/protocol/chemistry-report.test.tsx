import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHEMISTRY_QUESTIONS } from './chemistry-question-bank';
import { verifyChemistryQuestion } from './chemistry-verify';
import { buildChemistryCapsule } from './chemistry-question-bank/build-capsule';
import { buildReportDocument } from '@/src/lib/pdf';
import { parse } from './parser';
import { collectDiagrams, Report } from '@/src/components/Report';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import type { Session } from './types';

describe('chemistry ground-truth report', () => {
  it('prints per-question metrics and asserts zero failures', async () => {
    const rows: string[] = [];
    let failed = 0;

    for (const def of CHEMISTRY_QUESTIONS) {
      const result = await verifyChemistryQuestion(def);
      if (!result.ok) failed++;

      const raw = buildChemistryCapsule(def);
      const parsed = parse(raw);
      const session: Session = {
        id: def.id,
        createdAt: 0,
        updatedAt: 0,
        platform: 'gemini',
        question: def.question,
        capsule: parsed.capsule!,
        reviewedStepIds: [],
        raw,
      };
      const diagramSvg: Record<string, string> = {};
      for (const d of collectDiagrams(session)) {
        diagramSvg[d.key] = await resolveDiagramSvg(d.diagram, 'light', 'print');
      }
      const pdfHtml = buildReportDocument(session, diagramSvg);
      const reportHtml = renderToStaticMarkup(<Report session={session} diagramSvg={diagramSvg} />);

      expect(pdfHtml).toMatch(/<!doctype html>/i);
      expect(reportHtml).toContain('slm-report-mark');
      expect(reportHtml).toContain('<svg');

      rows.push(
        `Q${String(def.number).padStart(2)} ok=${result.ok} steps=${result.stepCount} diagrams=${result.diagramCount} pdf=${pdfHtml.length}B report=${reportHtml.length}B errs=${result.errors.length} warn=${result.warnings.length}`,
      );
    }

    console.log('\n--- PER-QUESTION METRICS (live run) ---');
    for (const line of rows) console.log(line);
    console.log(`--- TOTAL: ${CHEMISTRY_QUESTIONS.length} questions, ${failed} failures ---\n`);

    expect(failed).toBe(0);
    expect(CHEMISTRY_QUESTIONS.length).toBe(50);
  }, 120000);
});
