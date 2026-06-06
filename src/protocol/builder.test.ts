import { describe, it, expect } from 'vitest';
import {
  buildInjectionPrompt,
  buildInjectionPayload,
  buildComposerStub,
  buildProtocolFileContent,
  buildFollowupPrompt,
  buildRepairPrompt,
  resolveSubject,
  PROTOCOL_FILENAME,
} from './builder';
import { CORE_PROTOCOL, CORE_PROTOCOL_BY_VARIANT } from './protocol';

describe('buildInjectionPrompt', () => {
  it('includes the question, protocol, and the routed playbook', () => {
    const { prompt, subject } = buildInjectionPrompt('Solve this circuit with a resistor and 12V voltage source');
    expect(subject).toBe('Electrical');
    expect(prompt).toContain('Solve this circuit');
    expect(prompt).toContain('OUTPUT:');
    expect(prompt).toContain('ELECTRICAL');
    expect(prompt).toContain('@end');
  });

  it('honors an explicit subject override', () => {
    const { prompt, subject } = buildInjectionPrompt('something vague', { subject: 'Chemistry' });
    expect(subject).toBe('Chemistry');
    expect(prompt).toContain('CHEMISTRY');
  });

  it('supports the ultra prompt variant behind an explicit option', () => {
    const { prompt, variant } = buildInjectionPrompt('trace binary search code', {
      subject: 'CS',
      variant: 'ultra',
    });
    expect(variant).toBe('ultra');
    expect(prompt).toContain(CORE_PROTOCOL_BY_VARIANT.ultra);
    expect(prompt).toContain('CS (one move per step)');
  });

  it('keeps the injected core prompt compact', () => {
    // The core protocol is sent on every question; keep it small so it doesn't
    // lag the composer. Subject playbook + question are added on top.
    expect(Buffer.byteLength(CORE_PROTOCOL, 'utf8')).toBeLessThanOrEqual(2600);
    // All structural markers the parser relies on must survive compression.
    for (const marker of [
      '@meta', '@endmeta', '@step', '@endstep', '@formula', '@endformula',
      '@body', '@endbody', '@diagram', '@enddiagram', '@takeaway', '@endtakeaway',
      '@quickcheck', '@followup', '@endfollowup', '@solution', '@endsolution', '@end',
      'stemlm',
    ]) {
      expect(CORE_PROTOCOL).toContain(marker);
    }
  });

  it('handles an empty question gracefully', () => {
    const { prompt } = buildInjectionPrompt('   ');
    expect(prompt).toContain('has not typed a question');
  });
});

describe('buildInjectionPayload', () => {
  it('puts protocol in the file and keeps the composer stub short', () => {
    const payload = buildInjectionPayload(
      'Solve this circuit with a resistor and 12V voltage source',
    );
    expect(payload.subject).toBe('Electrical');
    expect(payload.composerText).toContain('Solve this circuit');
    expect(payload.composerText).toContain(PROTOCOL_FILENAME);
    expect(payload.composerText).not.toContain('OUTPUT:');
    expect(payload.fileContent).toContain('OUTPUT:');
    expect(payload.fileContent).toContain('ELECTRICAL');
  });

  it('buildComposerStub references the attached filename only', () => {
    const stub = buildComposerStub('derivative question', 'Math');
    expect(stub).toContain('derivative question');
    expect(stub).toContain(PROTOCOL_FILENAME);
    expect(stub).not.toContain('MATH:');
  });

  it('buildProtocolFileContent includes one playbook', () => {
    const { content, subject } = buildProtocolFileContent({
      question: 'binary search trace',
      subject: 'CS',
    });
    expect(subject).toBe('CS');
    expect(content).toContain('CS (one move per step)');
    expect(content).toContain('OUTPUT:');
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
    expect(prompt).not.toContain('```stemlm');
  });
});

describe('buildRepairPrompt', () => {
  it('asks for a format-only re-emit without raw content', () => {
    const prompt = buildRepairPrompt({ errorCode: 'missing_end' });
    expect(prompt).toContain('missing_end');
    expect(prompt).toContain('fix only the format');
    expect(prompt).toContain('@end');
    expect(prompt).not.toContain('```stemlm');
  });
});
