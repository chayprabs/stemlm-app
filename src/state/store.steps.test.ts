import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import { parse } from '@/src/protocol/parser';
import { TEN_STEP_ELECTRICAL } from '@/src/protocol/__fixtures-long-steps';
import type { Session } from '@/src/protocol/types';

function longSession(): Session {
  const capsule = parse(TEN_STEP_ELECTRICAL).capsule!;
  return {
    id: 's-long',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Mesh circuit',
    capsule,
    reviewedStepIds: [],
    raw: TEN_STEP_ELECTRICAL,
  };
}

describe('store step navigation (10 steps)', () => {
  beforeEach(() => {
    useStore.setState({
      sessions: [],
      activeSessionId: undefined,
      activeStepIndex: 0,
      status: 'idle',
    });
  });

  it('addSession resets to step 0', () => {
    const s = longSession();
    useStore.getState().addSession(s);
    expect(useStore.getState().activeStepIndex).toBe(0);
    expect(useStore.getState().sessions[0]!.capsule.steps).toHaveLength(10);
  });

  it('nextStep walks through all 10 steps', () => {
    useStore.getState().addSession(longSession());
    for (let i = 0; i < 9; i++) {
      expect(useStore.getState().activeStepIndex).toBe(i);
      useStore.getState().nextStep();
    }
    expect(useStore.getState().activeStepIndex).toBe(9);
    useStore.getState().nextStep();
    expect(useStore.getState().activeStepIndex).toBe(9);
  });

  it('prevStep walks back from step 10 to step 1', () => {
    useStore.getState().addSession(longSession());
    useStore.getState().setActiveStep(9);
    for (let i = 9; i > 0; i--) {
      expect(useStore.getState().activeStepIndex).toBe(i);
      useStore.getState().prevStep();
    }
    expect(useStore.getState().activeStepIndex).toBe(0);
    useStore.getState().prevStep();
    expect(useStore.getState().activeStepIndex).toBe(0);
  });

  it('setActiveStep clamps to valid range', () => {
    useStore.getState().addSession(longSession());
    useStore.getState().setActiveStep(99);
    expect(useStore.getState().activeStepIndex).toBe(9);
    useStore.getState().setActiveStep(-5);
    expect(useStore.getState().activeStepIndex).toBe(0);
  });

  it('toggleReviewed tracks all 10 step ids independently', () => {
    useStore.getState().addSession(longSession());
    const steps = useStore.getState().sessions[0]!.capsule.steps;
    for (const step of steps) {
      useStore.getState().toggleReviewed(step.id);
    }
    const reviewed = useStore.getState().sessions[0]!.reviewedStepIds;
    expect(reviewed).toHaveLength(10);
    expect(reviewed).toContain('step-10');
  });

  it('setActiveSession resets step index', () => {
    const a = longSession();
    const b = { ...longSession(), id: 's-other' };
    useStore.getState().addSession(a);
    useStore.getState().setActiveStep(7);
    useStore.getState().addSession(b);
    useStore.getState().setActiveSession(a.id);
    expect(useStore.getState().activeStepIndex).toBe(0);
  });
});
