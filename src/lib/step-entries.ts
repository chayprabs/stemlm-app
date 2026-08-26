/**
 * Flattened rail model: solution steps interleaved with the Ask-in-chat
 * follow-up answers anchored after them. The panel's active index points into
 * this list, so a follow-up entry navigates exactly like a step.
 */
import type { Session, Step, StepFollowup } from '@/src/protocol/types';

/**
 * Sentinel anchor id for Ask-in-chat asked from the Solution tab. These
 * follow-ups render at the bottom of the solution view and NEVER appear in
 * the step rail (and step follow-ups never appear in the solution view).
 */
export const SOLUTION_ANCHOR_ID = '@solution';

/** Follow-ups asked from the Solution tab, in ask order. */
export function solutionFollowups(session: Session | undefined): StepFollowup[] {
  return (session?.followups ?? []).filter((f) => f.anchorStepId === SOLUTION_ANCHOR_ID);
}

export type StepEntry =
  | {
      kind: 'step';
      key: string;
      step: Step;
      /** Index into capsule.steps. */
      stepIndex: number;
      /** 1-based number shown on the rail. */
      stepNumber: number;
    }
  | {
      kind: 'followup';
      key: string;
      followup: StepFollowup;
      /** Index into capsule.steps of the anchor step (-1 if the anchor vanished). */
      anchorStepIndex: number;
      /** 1-based position among follow-ups on the same anchor. */
      ordinal: number;
    };

export function buildStepEntries(session: Session | undefined): StepEntry[] {
  if (!session) return [];
  const steps = session.capsule.steps;
  const followups = session.followups ?? [];
  const byAnchor = new Map<string, StepFollowup[]>();
  const known = new Set(steps.map((s) => s.id));
  const lastStepId = steps[steps.length - 1]?.id;

  for (const f of followups) {
    // Solution-tab follow-ups live in the solution view, not the step rail.
    if (f.anchorStepId === SOLUTION_ANCHOR_ID) continue;
    // Orphaned anchors (patched-away step ids) fall back to the last step.
    const anchor = known.has(f.anchorStepId) ? f.anchorStepId : lastStepId;
    if (!anchor) continue;
    const list = byAnchor.get(anchor) ?? [];
    list.push(f);
    byAnchor.set(anchor, list);
  }

  const entries: StepEntry[] = [];
  steps.forEach((step, i) => {
    entries.push({ kind: 'step', key: `step:${step.id}`, step, stepIndex: i, stepNumber: i + 1 });
    const anchored = byAnchor.get(step.id) ?? [];
    anchored.forEach((followup, j) => {
      entries.push({
        kind: 'followup',
        key: `followup:${followup.id}`,
        followup,
        anchorStepIndex: i,
        ordinal: j + 1,
      });
    });
  });
  return entries;
}

/** Entry index of a follow-up id, or -1. */
export function findFollowupEntryIndex(entries: StepEntry[], followupId: string): number {
  return entries.findIndex((e) => e.kind === 'followup' && e.followup.id === followupId);
}

/** Entry index of a step (by capsule step index), or -1. */
export function findStepEntryIndex(entries: StepEntry[], stepIndex: number): number {
  return entries.findIndex((e) => e.kind === 'step' && e.stepIndex === stepIndex);
}
