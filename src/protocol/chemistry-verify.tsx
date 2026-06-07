/**
 * End-to-end verification for chemistry question capsules:
 * parse, answer patterns, SVG pipeline, label layout, sizing, PDF profile.
 */
import React from 'react';
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import { presentSvg } from '@/src/lib/svg-present';
import { computeDisplaySize, DIAGRAM_BOUNDS, parseViewBox } from '@/src/lib/diagram-bounds';
import { renderToStaticMarkup } from 'react-dom/server';
import { Report, collectDiagrams } from '@/src/components/Report';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { buildReportDocument } from '@/src/lib/pdf';
import { parse } from './parser';
import { scoreRaw } from './score';
import { buildChemistryCapsule } from './chemistry-question-bank/build-capsule';
import type { ChemistryQuestionDef } from './chemistry-question-bank/types';
import type { Session } from './types';

export interface ChemistryVerifyResult {
  id: string;
  number: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  stepCount: number;
  diagramCount: number;
}

function normalizeVerifiedText(text: string): string {
  return text
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/ν/g, 'nu')
    .replace(/Δ/g, 'delta')
    .replace(/β/g, 'beta')
    .replace(/α/g, 'alpha')
    .replace(/°/g, ' deg ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

export async function verifyChemistryQuestion(
  def: ChemistryQuestionDef,
): Promise<ChemistryVerifyResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const raw = buildChemistryCapsule(def);
  const result = parse(raw);

  if (result.status !== 'ok' || !result.capsule) {
    errors.push(`Parse failed: ${result.errorCode ?? result.status}`);
    return { id: def.id, number: def.number, ok: false, errors, warnings, stepCount: 0, diagramCount: 0 };
  }

  const capsule = result.capsule;
  const stepCount = capsule.steps.length;
  if (stepCount < 3) errors.push(`Only ${stepCount} steps (need >= 3)`);

  const allText = [
    ...capsule.steps.map((s) => [s.body, s.formula ?? ''].join(' ')),
    capsule.solution,
  ].join(' ');

  const normalizedAllText = normalizeVerifiedText(allText);
  for (const pat of def.verifiedPatterns) {
    const found =
      typeof pat === 'string'
        ? allText.includes(pat) || normalizedAllText.includes(normalizeVerifiedText(pat))
        : pat.test(allText);
    if (!found) errors.push(`Missing verified answer pattern: ${String(pat)}`);
  }

  const diagrams = capsule.steps.flatMap((s) => (s.diagram?.type === 'svg' ? [s.diagram] : []));
  const minDiagrams = def.minDiagramSteps ?? Math.max(2, Math.ceil(stepCount * 0.4));
  if (diagrams.length < minDiagrams) {
    errors.push(`Only ${diagrams.length} diagram steps (need >= ${minDiagrams})`);
  }

  for (const [i, diagram] of diagrams.entries()) {
    const clean = sanitizeSvg(extractSvg(diagram.content));
    if (!svgParses(clean)) errors.push(`Step diagram ${i + 1}: invalid SVG after sanitize`);

    for (const profile of ['step', 'print'] as const) {
      const presented = presentSvg(clean, 'light', profile);
      if (!svgParses(presented)) errors.push(`Step diagram ${i + 1}: invalid after presentSvg (${profile})`);
      for (const issue of checkDiagramSizing(presented, profile)) {
        errors.push(`Step diagram ${i + 1} (${profile}): ${issue}`);
      }
      for (const issue of checkLabelCollisions(presented)) {
        warnings.push(`Step diagram ${i + 1} (${profile}): ${issue}`);
      }
    }
  }

  const score = await scoreRaw(raw);
  if (score.parse_ok !== 1) errors.push('scoreRaw: parse_ok failed');
  if (score.svg_valid === 0) errors.push('scoreRaw: svg_valid failed');
  if (score.step_work_ok !== 1) errors.push('scoreRaw: step_work_ok failed');

  try {
    const session: Session = {
      id: def.id,
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: def.question,
      capsule,
      reviewedStepIds: [],
      raw,
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

  if (result.warningCodes.length > 0) {
    warnings.push(...result.warningCodes.map((c) => `Parser warning: ${c}`));
  }

  return {
    id: def.id,
    number: def.number,
    ok: errors.length === 0,
    errors,
    warnings,
    stepCount,
    diagramCount: diagrams.length,
  };
}
