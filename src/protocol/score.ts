import { renderMermaid } from '@/src/lib/mermaid';
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import type { ResolvedTheme } from '@/src/lib/theme';
import type { Diagram } from './types';
import { parse } from './parser';
import { auditStepQuality } from './step-quality';

export interface RawScore {
  parse_ok: 0 | 1;
  clean_fence: 0 | 1;
  markers: 0 | 1 | 2;
  svg_valid: 0 | 1 | null;
  mermaid_valid: 0 | 1 | null;
  step_work_ok: 0 | 1;
  step_count: number;
  out_chars: number;
  warnings: string[];
  warning_codes: string[];
  error_code?: string;
}

function hasCleanStemlmFence(raw: string): boolean {
  const trimmed = raw.trim();
  return /^```+\s*stemlm\b/i.test(trimmed) && /```+\s*$/.test(trimmed);
}

function diagramsFromResult(raw: string): Diagram[] {
  const result = parse(raw);
  const capsule = result.capsule;
  if (!capsule) return [];
  return [
    ...capsule.steps.flatMap((step) => (step.diagram ? [step.diagram] : [])),
    ...capsule.solutionDiagrams,
  ];
}

function svgParses(svg: string): boolean {
  if (!svg) return false;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return !doc.querySelector('parsererror') && doc.documentElement.tagName.toLowerCase() === 'svg';
}

export async function scoreRaw(raw: string, theme: ResolvedTheme = 'light'): Promise<RawScore> {
  const result = parse(raw);
  const capsule = result.capsule;
  const diagrams = diagramsFromResult(raw);

  let svgValid: 0 | 1 | null = diagrams.some((d) => d.type === 'svg') ? 1 : null;
  let mermaidValid: 0 | 1 | null = diagrams.some((d) => d.type === 'mermaid') ? 1 : null;

  for (const diagram of diagrams) {
    if (diagram.type === 'svg') {
      const clean = sanitizeSvg(extractSvg(diagram.content));
      if (!svgParses(clean)) svgValid = 0;
    } else {
      try {
        const rendered = await renderMermaid(diagram.content, theme);
        const clean = sanitizeSvg(extractSvg(rendered));
        if (!svgParses(clean)) mermaidValid = 0;
      } catch {
        mermaidValid = 0;
      }
    }
  }

  const stepCount = capsule?.steps.length ?? 0;
  const parseOk = result.status === 'ok' && stepCount >= 3 ? 1 : 0;
  const stepWorkOk =
    capsule && capsule.steps.length > 0
      ? capsule.steps.every((step) => auditStepQuality(step).length === 0)
        ? 1
        : 0
      : 0;

  return {
    parse_ok: parseOk,
    clean_fence: hasCleanStemlmFence(raw) ? 1 : 0,
    markers: result.warningCodes.length === 0 ? 2 : result.status === 'empty' ? 0 : 1,
    svg_valid: svgValid,
    mermaid_valid: mermaidValid,
    step_work_ok: stepWorkOk,
    step_count: stepCount,
    out_chars: raw.length,
    warnings: result.warnings,
    warning_codes: result.warningCodes,
    error_code: result.errorCode,
  };
}
