import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import { presentSvg } from '@/src/lib/svg-present';
import { computeDisplaySize, DIAGRAM_BOUNDS, parseViewBox } from '@/src/lib/diagram-bounds';
import { Report, collectDiagrams } from '@/src/components/Report';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { buildReportDocument } from '@/src/lib/pdf';
import { auditCapsuleDiagrams } from '../diagram-quality';
import { parse } from '../parser';
import { scoreRaw, type RawScore } from '../score';
import type { ParseStatus, Session } from '../types';
import type { BiologyBenchmarkSpec, BiologyBenchmarkVerifyResult } from './types';

export interface BiologyCapsuleVerificationReport {
  specId: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  parseStatus: ParseStatus;
  score: RawScore;
  conceptVerification: BiologyBenchmarkVerifyResult;
  stepCount: number;
  diagramCount: number;
}

function svgParses(svg: string): boolean {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return !doc.querySelector('parsererror') && doc.documentElement.tagName.toLowerCase() === 'svg';
}

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
        issues.push(`Labels collide at (${ax},${ay}): "${a.textContent}" and "${b.textContent}"`);
      }
    }
  }
  return issues;
}

function checkDiagramSizing(svg: string, profile: 'step' | 'print'): string[] {
  const issues: string[] = [];
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const vb = doc.documentElement.getAttribute('viewBox');
  const parsed = parseViewBox(vb);
  if (!parsed) {
    issues.push('Missing or invalid viewBox');
    return issues;
  }
  const { width, height } = computeDisplaySize(vb, profile);
  const { maxW, maxH } = DIAGRAM_BOUNDS[profile];
  if (width > maxW + 2 || height > maxH + 2) {
    issues.push(`Display size ${width}x${height} exceeds ${profile} bounds ${maxW}x${maxH}`);
  }
  return issues;
}

export async function verifyBiologyCapsule(
  spec: BiologyBenchmarkSpec,
  capsuleText: string,
): Promise<BiologyCapsuleVerificationReport> {
  const parseResult = parse(capsuleText);
  const score = await scoreRaw(capsuleText);
  const errors: string[] = [];
  const warnings = [...parseResult.warnings];

  if (parseResult.status !== 'ok' || !parseResult.capsule) {
    errors.push(`Capsule parse failed with status "${parseResult.status}" (${parseResult.errorCode ?? 'no code'}).`);
  }

  if (score.parse_ok !== 1) errors.push('scoreRaw.parse_ok failed.');
  if (score.clean_fence !== 1) warnings.push('Capsule fence is not clean.');
  if (score.step_work_ok !== 1) errors.push('scoreRaw.step_work_ok failed.');
  if (score.svg_valid === 0) errors.push('scoreRaw.svg_valid failed.');

  const capsule = parseResult.capsule;
  const stepCount = capsule?.steps.length ?? 0;
  const diagrams = capsule?.steps.flatMap((s) => (s.diagram?.type === 'svg' ? [s.diagram] : [])) ?? [];
  const diagramCount = diagrams.length;

  if (capsule) {
    if (stepCount < 3) errors.push(`Only ${stepCount} steps (need >= 3)`);

    const minDiagrams = Math.max(2, Math.ceil(stepCount * 0.35));
    if (diagramCount < minDiagrams) {
      errors.push(`Only ${diagramCount} diagram steps (need >= ${minDiagrams})`);
    }

    const diagramIssues = auditCapsuleDiagrams(capsule);
    if (diagramIssues.length > 0) {
      errors.push(...diagramIssues.map((issue) => `diagram audit: ${issue}`));
    }

    for (const [i, diagram] of diagrams.entries()) {
      const clean = sanitizeSvg(extractSvg(diagram.content));
      if (!svgParses(clean)) errors.push(`Step diagram ${i + 1}: invalid SVG after sanitize`);

      for (const profile of ['step', 'print'] as const) {
        const presented = presentSvg(clean, 'light', profile);
        if (!svgParses(presented)) {
          errors.push(`Step diagram ${i + 1}: invalid after presentSvg (${profile})`);
        }
        for (const issue of checkDiagramSizing(presented, profile)) {
          errors.push(`Step diagram ${i + 1} (${profile}): ${issue}`);
        }
        for (const issue of checkLabelCollisions(presented)) {
          warnings.push(`Step diagram ${i + 1} (${profile}): ${issue}`);
        }
      }
    }

    try {
      const session: Session = {
        id: spec.id,
        createdAt: 0,
        updatedAt: 0,
        platform: 'gemini',
        question: spec.question,
        capsule,
        reviewedStepIds: [],
        raw: capsuleText,
      };
      const diagramSvg: Record<string, string> = {};
      for (const d of collectDiagrams(session)) {
        const resolved = await resolveDiagramSvg(d.diagram, 'light', 'print');
        if (resolved) diagramSvg[d.key] = resolved;
      }
      const html = renderToStaticMarkup(<Report session={session} diagramSvg={diagramSvg} />);
      if (!html.includes('slm-report-mark')) errors.push('Report render missing report mark');
      const doc = buildReportDocument(session, diagramSvg);
      if (!/<!doctype\s+html/i.test(doc)) errors.push('PDF document build failed');
    } catch (e) {
      errors.push(`PDF/Report path failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const conceptVerification = spec.verify(capsuleText);
  if (!conceptVerification.ok) {
    errors.push(...conceptVerification.errors.map((error) => `concept verification: ${error}`));
  }

  if (parseResult.warningCodes.length > 0) {
    warnings.push(...parseResult.warningCodes.map((code) => `Parser warning: ${code}`));
  }

  return {
    specId: spec.id,
    ok: errors.length === 0,
    errors,
    warnings,
    parseStatus: parseResult.status,
    score,
    conceptVerification,
    stepCount,
    diagramCount,
  };
}
