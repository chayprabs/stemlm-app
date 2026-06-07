import { describe, it, expect } from 'vitest';
import { BIOLOGY_QUESTIONS } from './biology-question-bank';
import { verifyBiologyQuestion } from './biology-verify';
import { classifySubject } from './classifier';
import { buildBiologyCapsule } from './biology-question-bank/build-capsule';
import { parse } from './parser';
import { auditStepQuality } from './step-quality';
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import { presentSvg } from '@/src/lib/svg-present';
import { buildReportDocument } from '@/src/lib/pdf';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { collectDiagrams } from '@/src/components/Report';
import type { Session } from './types';

function checkLabelCollisions(svg: string): string[] {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const texts = [...doc.querySelectorAll('text')];
  const issues: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i]!;
      const b = texts[j]!;
      const ax = Number(a.getAttribute('x'));
      const ay = Number(a.getAttribute('y'));
      const bx = Number(b.getAttribute('x'));
      const by = Number(b.getAttribute('y'));
      if (Number.isNaN(ax) || Number.isNaN(ay) || Number.isNaN(bx) || Number.isNaN(by)) continue;
      if (Math.abs(ax - bx) < 3 && Math.abs(ay - by) < 3) {
        issues.push(`"${a.textContent}" vs "${b.textContent}" at (${ax},${ay})`);
      }
    }
  }
  return issues;
}

/** Required diagram topics from original 50-question spec (📊 items). */
const REQUIRED_DIAGRAM_TOPICS: Record<number, string[]> = {
  1: ['prokaryotic', 'cell'],
  2: ['membrane', 'mosaic'],
  3: ['energy', 'michaelis'],
  4: ['respiration', 'flow'],
  5: ['chloroplast'],
  6: ['cell cycle', 'cycle'],
  7: ['protein', 'structure'],
  8: ['replication', 'fork'],
  9: ['central dogma', 'dogma'],
  14: ['operon', 'lac'],
  15: ['neuron', 'action potential'],
  16: ['synapse'],
  17: ['heart', 'ecg'],
  18: ['respiratory', 'alveol'],
  19: ['digestive'],
  20: ['feedback', 'glucose'],
  21: ['growth', 'logistic'],
  23: ['food web', 'nitrogen'],
  24: ['selection', 'bell'],
  27: ['growth curve', 'bacterial'],
  28: ['virus', 'phage'],
  30: ['b cell', 't cell', 'lymph'],
  33: ['pcr', 'gel'],
  34: ['phylogen'],
  35: ['clon', 'plasmid'],
  37: ['meiosis'],
  38: ['pituitary', 'hpa'],
  39: ['root', 'dicot'],
  43: ['biome', 'latitude'],
  48: ['reflex'],
};

describe('biology honest audit — all 50 questions', () => {
  it('reports and enforces real verification for every question', async () => {
    // 50 questions × full PDF/diagram audit needs >5s default timeout
    const failures: string[] = [];
    const collisionReport: string[] = [];

    for (const def of BIOLOGY_QUESTIONS) {
      const classify = classifySubject(def.question);
      const result = await verifyBiologyQuestion(def);
      const raw = buildBiologyCapsule(def);
      const parsed = parse(raw);

      if (classify !== 'Biology') {
        failures.push(`Q${def.number}: classifies as ${classify}, not Biology`);
      }
      if (!result.ok) {
        failures.push(`Q${def.number}: verify failed — ${result.errors.join('; ')}`);
      }
      if (result.stepCount < 3) {
        failures.push(`Q${def.number}: only ${result.stepCount} steps`);
      }

      if (parsed.capsule) {
        for (const step of parsed.capsule.steps) {
          const issues = auditStepQuality(step);
          if (issues.length) {
            failures.push(`Q${def.number} step ${step.index} "${step.title}": ${issues.join(', ')}`);
          }
          if (step.diagram?.type === 'svg') {
            for (const profile of ['step', 'print'] as const) {
              const clean = presentSvg(
                sanitizeSvg(extractSvg(step.diagram.content)),
                'light',
                profile,
              );
              const collisions = checkLabelCollisions(clean);
              if (collisions.length) {
                collisionReport.push(
                  `Q${def.number} step ${step.index} (${profile}): ${collisions.join('; ')}`,
                );
              }
            }
          }
        }

        // PDF path must produce valid HTML for every question
        const session: Session = {
          id: def.id,
          createdAt: 0,
          updatedAt: 0,
          platform: 'gemini',
          question: def.question,
          capsule: parsed.capsule,
          reviewedStepIds: [],
          raw,
        };
        const diagramSvg: Record<string, string> = {};
        for (const d of collectDiagrams(session)) {
          const resolved = await resolveDiagramSvg(d.diagram, 'light', 'print');
          if (resolved) diagramSvg[d.key] = resolved;
        }
        const doc = buildReportDocument(session, diagramSvg);
        if (!/<!doctype\s+html/i.test(doc)) {
          failures.push(`Q${def.number}: PDF document build failed`);
        }
        if (!doc.includes('slm-report-mark') && !doc.includes('slm-report')) {
          failures.push(`Q${def.number}: PDF missing report structure`);
        }
      }

      const req = REQUIRED_DIAGRAM_TOPICS[def.number];
      if (req) {
        const allSvg = (parsed.capsule?.steps ?? [])
          .map((s) => (s.diagram?.type === 'svg' ? s.diagram.content.toLowerCase() : ''))
          .join(' ');
        const allText = [
          def.question,
          ...(parsed.capsule?.steps.map((s) => s.title + ' ' + s.body) ?? []),
        ]
          .join(' ')
          .toLowerCase();
        for (const topic of req) {
          if (!allSvg && !allText.includes(topic)) {
            failures.push(`Q${def.number}: missing expected diagram topic "${topic}"`);
          }
        }
      }
    }

    if (collisionReport.length) {
      console.warn('LABEL COLLISIONS:\n' + collisionReport.join('\n'));
    }
    if (failures.length) {
      console.error('AUDIT FAILURES:\n' + failures.join('\n'));
    }

    console.log(
      `AUDIT: ${BIOLOGY_QUESTIONS.length} questions, ${failures.length} failures, ${collisionReport.length} collision groups`,
    );

    expect(failures, failures.join('\n')).toEqual([]);
    // Collisions are warnings in verify but we treat as hard failures for "works perfectly"
    expect(collisionReport, collisionReport.join('\n')).toEqual([]);
  }, 120_000);
});
