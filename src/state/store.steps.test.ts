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

  it('does not expose reviewed tracking', () => {
    expect('toggleReviewed' in useStore.getState()).toBe(false);
    useStore.getState().addSession(longSession());
    expect('reviewedStepIds' in (useStore.getState().sessions[0] ?? {})).toBe(false);
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

  it('keeps solution-tab follow-ups on the solution view and step ones on the rail', () => {
    const s = longSession();
    useStore.getState().addSession(s);
    useStore.setState({ view: 'solution', activeStepIndex: 3 });
    const mini = {
      meta: s.capsule.meta,
      steps: [{ id: 'a1', index: 1, title: 'Scale', body: 'I doubles' }],
      solution: 'I doubles',
      solutionDiagrams: [] as [],
    };
    useStore.getState().addFollowup(s.id, {
      id: 'f-sol',
      anchorStepId: '@solution',
      capsule: mini,
      createdAt: 1,
    });
    expect(useStore.getState().view).toBe('solution');
    expect(useStore.getState().activeStepIndex).toBe(3);
    expect(useStore.getState().sessions[0]!.followups).toHaveLength(1);

    useStore.getState().addFollowup(s.id, {
      id: 'f-step',
      anchorStepId: s.capsule.steps[1]!.id,
      capsule: mini,
      createdAt: 2,
    });
    expect(useStore.getState().view).toBe('steps');
    expect(useStore.getState().activeStepIndex).toBeGreaterThan(1);
    expect(useStore.getState().sessions[0]!.followups).toHaveLength(2);
  });
});
