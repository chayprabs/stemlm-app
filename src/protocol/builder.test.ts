import { describe, it, expect } from 'vitest';
import {
  buildInjectionAppendix,
  buildInjectionPrompt,
  buildInjectionPayload,
  buildComposerStub,
  buildProtocolFileContent,
  buildFollowupPrompt,
  buildFollowupPayload,
  buildFollowupComposerText,
  buildRepairPrompt,
  resolveSubject,
  PROTOCOL_FILENAME,
  getDiagramRequirement,
} from './builder';
import coreBalancedTemplate from './core-protocol.md?raw';
import { CORE_PROTOCOL, CORE_PROTOCOL_BY_VARIANT, renderProtocol } from './protocol';
import { SUBJECTS } from './types';

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

  it('normalizes CRLF in protocol templates so Windows checkouts stay within budget', () => {
    const crlf = coreBalancedTemplate.replace(/\n/g, '\r\n');
    expect(renderProtocol(crlf)).toBe(CORE_PROTOCOL);
  });

  it('keeps the injected core prompt compact', () => {
    // The core protocol is sent on every question; keep it small so it doesn't
    // lag the composer. Subject playbook + question are added on top.
    expect(Buffer.byteLength(CORE_PROTOCOL, 'utf8')).toBeLessThanOrEqual(4000);
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

  it('ultra variant is deeper than balanced but stays within a usable budget', () => {
    const balanced = CORE_PROTOCOL_BY_VARIANT.balanced;
    const ultra = CORE_PROTOCOL_BY_VARIANT.ultra;
    // Ultra must be the *deeper* variant (longer than balanced), not a compressed one.
    expect(Buffer.byteLength(ultra, 'utf8')).toBeGreaterThan(Buffer.byteLength(balanced, 'utf8'));
    // ...but still bounded so it does not break composer usability.
    expect(Buffer.byteLength(ultra, 'utf8')).toBeLessThanOrEqual(6000);
    // Ultra adds the explicit depth directives the balanced default does not force.
    expect(ultra).toContain('VERIFICATION');
    expect(ultra).toMatch(/DEEP mode/i);
    // Same structural grammar as balanced (parser depends on these markers).
    for (const marker of ['@meta', '@step', '@body', '@diagram', '@solution', '@end']) {
      expect(ultra).toContain(marker);
    }
  });

  it('handles an empty question gracefully', () => {
    const { prompt } = buildInjectionPrompt('   ');
    expect(prompt).toContain('has not typed a question');
  });

  it('pastes the full protocol inline — never the old file-attach stub', () => {
    const { prompt } = buildInjectionPrompt('');
    expect(prompt).toContain('stemLM instructions');
    expect(prompt).toContain('OUTPUT:');
    expect(prompt).not.toContain(PROTOCOL_FILENAME);
    expect(prompt).not.toContain('Follow the attached');
  });
});

describe('buildInjectionAppendix', () => {
  it('returns only the separator and protocol (no question line)', () => {
    const { prompt, subject } = buildInjectionAppendix(
      'A projectile is launched at 20 m/s at 45 degrees',
    );
    expect(subject).toBe('Physics');
    expect(prompt.startsWith('\n\n--- stemLM instructions')).toBe(true);
    expect(prompt).toContain('CRITICAL — every @step MUST have a non-empty @body');
    expect(prompt).toContain('CRITICAL — physics visual problems MUST include @diagram type=svg');
    expect(prompt).toContain('FIRST PASS ONLY: produce the complete corrected capsule now');
    expect(prompt).toContain('OUTPUT:');
    expect(prompt).not.toContain('A projectile is launched');
  });

  it('asks the model to transcribe the image when the composer has no text', () => {
    const { prompt } = buildInjectionAppendix('', { hasImageAttachment: true });
    expect(prompt).toContain('problem image');
    expect(prompt).toContain('@meta question:');
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
    // Compact reminders only — full rules ship in the attached protocol file.
    expect(payload.composerText).toContain('Make the LAST step a verification');
    expect(payload.composerText).toContain('Draw @diagram type=svg on nearly EVERY step');
    expect(payload.composerText).not.toContain('OUTPUT:');
    expect(payload.fileContent).toContain('OUTPUT:');
    expect(payload.fileContent).toContain('ELECTRICAL');
  });

  it('keeps every subject protocol file within an attachment budget', () => {
    // The shipped artifact is core protocol + ONE playbook. Keep it bounded so the
    // attached stemlm-protocol.txt stays small and Flash-friendly.
    for (const subject of SUBJECTS) {
      for (const variant of ['balanced', 'ultra'] as const) {
        const { content } = buildProtocolFileContent({ question: 'sizing', subject, variant });
        const bytes = Buffer.byteLength(content, 'utf8');
        const budget = variant === 'ultra' ? 9000 : 8000;
        expect(bytes, `${subject}/${variant} protocol file is ${bytes} B`).toBeLessThanOrEqual(budget);
      }
    }
  });

  it('keeps the composer stub compact (full rules live in the attached file)', () => {
    // The stub is pasted into the live composer; keep it short so it does not lag
    // the editor or distract weaker (Flash) models. Detail ships in the .txt file.
    for (const subject of ['Electrical', 'Chemistry', 'Physics', 'Math', 'Biology'] as const) {
      const stub = buildComposerStub('A representative question for sizing.', subject);
      expect(Buffer.byteLength(stub, 'utf8')).toBeLessThanOrEqual(1200);
    }
  });

  it('injects the routed subject diagram rules into the inline appendix', () => {
    const cases: [string, string][] = [
      ['Find the eigenvalues of this 2x2 matrix and graph the region', 'math visual problems'],
      ['Explain the Krebs cycle pathway in the mitochondrion', 'biology visual problems'],
      ['Compute bending stress for this shaft and draw the free-body diagram', 'mechanical visual problems'],
      ['Draw the SFD and BMD for a simply supported beam with a point load', 'civil visual problems'],
      ['Mass balance on a mixer with two inlet streams and one outlet', 'chemical engineering visual problems'],
    ];
    for (const [question, marker] of cases) {
      const { prompt } = buildInjectionAppendix(question);
      expect(prompt, `appendix for "${question}" should mention "${marker}"`).toContain(marker);
    }
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

  it('uses classified subject in composerText and fileContent for auto routing', () => {
    const question = 'Solve this circuit with a resistor and 12V voltage source';
    const payloads = [
      buildInjectionPayload(question),
      buildInjectionPayload(question, { subject: 'Auto' }),
      buildInjectionPayload(question, { subject: undefined }),
    ];

    for (const payload of payloads) {
      expect(payload.subject).toBe('Electrical');
      expect(payload.composerText).toContain('Follow the attached stemlm-protocol.txt exactly (Electrical).');
      expect(payload.fileContent).toContain('ELECTRICAL');
      expect(payload.composerText).not.toContain('OUTPUT:');
    }

    expect(payloads[0]).toEqual(payloads[1]);
    expect(payloads[1]).toEqual(payloads[2]);
  });

  it('includes subject-specific textbook diagram conventions without prompt banks', () => {
    expect(getDiagramRequirement('Electrical')).toContain('input/signal flow left→right');
    expect(getDiagramRequirement('Electrical')).toContain('BJT with B/C/E');
    expect(getDiagramRequirement('Chemistry')).toContain('MO diagrams use AO columns outside');
    expect(getDiagramRequirement('Physics')).toContain('FREE-BODY');
    expect(getDiagramRequirement('Math')).toContain('origin/ticks/scale');
    expect(getDiagramRequirement('Biology')).toContain('SBGN-like');
    expect(getDiagramRequirement('Civil')).toContain('pin/roller/fixed support');
    expect(getDiagramRequirement('Chemical')).toContain('number every stream');
  });
});

describe('resolveSubject', () => {
  const circuitQuestion = 'Solve this circuit with a resistor and 12V voltage source';

  it('classifies when subject is Auto', () => {
    expect(resolveSubject('derivative and integral of polynomial', { subject: 'Auto' })).toBe('Math');
  });

  it('classifies when subject is omitted', () => {
    expect(resolveSubject(circuitQuestion)).toBe('Electrical');
    expect(resolveSubject(circuitQuestion, {})).toBe('Electrical');
    expect(resolveSubject(circuitQuestion, { subject: undefined })).toBe('Electrical');
  });

  it('treats Auto, undefined, and no option identically', () => {
    const noOpt = resolveSubject(circuitQuestion);
    const auto = resolveSubject(circuitQuestion, { subject: 'Auto' });
    const undef = resolveSubject(circuitQuestion, { subject: undefined });
    expect(auto).toBe(noOpt);
    expect(undef).toBe(noOpt);
    expect(noOpt).toBe('Electrical');
  });

  it('returns the override when provided', () => {
    expect(resolveSubject('derivative', { subject: 'Physics' })).toBe('Physics');
  });
});

describe('buildFollowupPrompt', () => {
  const opts = {
    selection: 'Total resistance is R1 + R2',
    stepTitle: 'Solve for current',
    subject: 'Electrical' as const,
  };

  it('quotes the selection and includes full core protocol + playbook for paste', () => {
    const prompt = buildFollowupPrompt(opts);
    expect(prompt).toMatch(/^Ask your question here:/);
    expect(prompt).toContain('stemLM follow-up context');
    expect(prompt).toContain('> Total resistance is R1 + R2');
    expect(prompt).toContain('Solve for current');
    expect(prompt).toContain('stemlm');
    expect(prompt).toContain('OUTPUT:');
    expect(prompt).toContain('ELECTRICAL');
    expect(prompt).toContain('stemLM instructions');
    expect(prompt.indexOf('Ask your question here:')).toBeLessThan(
      prompt.indexOf('stemLM follow-up context'),
    );
    expect(prompt.indexOf('stemLM follow-up context')).toBeLessThan(
      prompt.indexOf('stemLM instructions'),
    );
    expect(prompt).not.toContain('```stemlm');
    expect(prompt).not.toContain(PROTOCOL_FILENAME);
  });

  it('uses ask intent copy for free-form last-step follow-ups', () => {
    const prompt = buildFollowupPrompt({ ...opts, intent: 'ask' });
    expect(prompt).toContain('finished the step-by-step solution');
    expect(prompt).toContain('type a follow-up question');
  });

  it('buildFollowupComposerText references the attached protocol file', () => {
    const composer = buildFollowupComposerText(opts);
    expect(composer).toContain(PROTOCOL_FILENAME);
    expect(composer).toContain('> Total resistance is R1 + R2');
    expect(composer).not.toContain('OUTPUT:');
    expect(composer).toContain('No prose outside the block.');
  });

  it('buildFollowupPayload pairs composer stub with protocol file content', () => {
    const payload = buildFollowupPayload(opts);
    expect(payload.composerText).toBe(buildFollowupComposerText(opts));
    expect(payload.fileContent).toContain('OUTPUT:');
    expect(payload.fileContent).toContain('ELECTRICAL');
    expect(payload.subject).toBe('Electrical');
  });
});

describe('buildRepairPrompt', () => {
  it('asks for a format-only re-emit without raw content', () => {
    const prompt = buildRepairPrompt({ errorCode: 'missing_end' });
    expect(prompt).toContain('missing_end');
    expect(prompt).toContain("fix every step's @body work");
    expect(prompt).toContain('@end');
    expect(prompt).not.toContain('```stemlm');
  });
});
