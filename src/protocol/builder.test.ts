import { describe, it, expect } from 'vitest';
import { buildInjectionPrompt, buildFollowupPrompt, resolveSubject } from './builder';

describe('buildInjectionPrompt', () => {
  it('includes the question, protocol, and the routed playbook', () => {
    const { prompt, subject } = buildInjectionPrompt('Solve this circuit with a resistor and 12V voltage source');
    expect(subject).toBe('Electrical');
    expect(prompt).toContain('Solve this circuit');
    expect(prompt).toContain('OUTPUT CONTRACT');
    expect(prompt).toContain('ELECTRICAL / CIRCUITS PLAYBOOK');
    expect(prompt).toContain('@end');
  });

  it('honors an explicit subject override', () => {
    const { prompt, subject } = buildInjectionPrompt('something vague', { subject: 'Chemistry' });
    expect(subject).toBe('Chemistry');
    expect(prompt).toContain('CHEMISTRY PLAYBOOK');
  });

  it('handles an empty question gracefully', () => {
    const { prompt } = buildInjectionPrompt('   ');
    expect(prompt).toContain('has not typed a question');
  });
});

describe('resolveSubject', () => {
  it('classifies when Auto', () => {
    expect(resolveSubject('derivative and integral of polynomial', { subject: 'Auto' })).toBe('Math');
  });
  it('returns the override when provided', () => {
    expect(resolveSubject('derivative', { subject: 'Physics' })).toBe('Physics');
  });
});

describe('buildFollowupPrompt', () => {
  it('quotes the selection and asks for capsule format', () => {
    const prompt = buildFollowupPrompt({
      selection: 'Total resistance is R1 + R2',
      stepTitle: 'Solve for current',
      subject: 'Electrical',
    });
    expect(prompt).toContain('> Total resistance is R1 + R2');
    expect(prompt).toContain('Solve for current');
    expect(prompt).toContain('stemlm');
  });
});
