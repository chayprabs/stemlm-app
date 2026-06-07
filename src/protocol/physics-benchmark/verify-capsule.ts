import { auditCapsuleDiagrams } from '../diagram-quality';
import { parse } from '../parser';
import { scoreRaw, type RawScore } from '../score';
import type { ParseStatus } from '../types';
import type { PhysicsBenchmarkSpec, PhysicsBenchmarkVerifyResult } from './types';

export interface PhysicsCapsuleVerificationReport {
  specId: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  parseStatus: ParseStatus;
  score: RawScore;
  numericVerification: PhysicsBenchmarkVerifyResult;
}

export async function verifyPhysicsCapsule(
  spec: PhysicsBenchmarkSpec,
  capsuleText: string,
): Promise<PhysicsCapsuleVerificationReport> {
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

  if (parseResult.capsule) {
    const diagramIssues = auditCapsuleDiagrams(parseResult.capsule);
    if (diagramIssues.length > 0) {
      errors.push(...diagramIssues.map((issue) => `diagram audit: ${issue}`));
    }
  }

  const numericVerification = spec.verify(capsuleText);
  if (!numericVerification.ok) {
    errors.push(...numericVerification.errors.map((error) => `numeric verification: ${error}`));
  }

  return {
    specId: spec.id,
    ok: errors.length === 0,
    errors,
    warnings,
    parseStatus: parseResult.status,
    score,
    numericVerification,
  };
}
