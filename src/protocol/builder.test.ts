import { describe, it, expect } from 'vitest';
import {
  buildInjectionAppendix,
  buildInjectionPrompt,
  buildInjectionPayload,
  buildComposerStub,
  buildComposerAppendix,
  buildComposerPointer,
  composerTextHasProtocol,
  pageThreadHasProtocol,
  shouldReinjectOnNewQuestion,
  isEmptyFollowupSelection,
  buildFollowupCopyText,
  STEP_BODY_REQUIREMENT,
  buildProtocolFileContent,
  buildFollowupPrompt,
  buildFollowupPayload,
  buildFollowupComposerText,
  buildRepairPrompt,
  resolveSubject,
  PROTOCOL_FILENAME,
  STEMLM_SENTINEL,
  getDiagramRequirement,
} from './builder';
import coreBalancedTemplate from './core-protocol.md?raw';
import { CORE_PROTOCOL, CORE_PROTOCOL_BY_VARIANT, renderProtocol, PROTOCOL_VERSION } from './protocol';

describe('buildInjectionPrompt', () => {
  it('includes the question, protocol, and every subject registry row', () => {
    const { prompt, subject } = buildInjectionPrompt('Solve this circuit with a resistor and 12V voltage source');
    expect(subject).toBe('Electrical');
    expect(prompt).toContain('Solve this circuit');
    expect(prompt).toContain('OUTPUT:');
    expect(prompt).toContain('@meta');
    expect(prompt).toContain('Electrical');
    expect(prompt).toContain('@end');
    expect(prompt).toContain(`version: ${PROTOCOL_VERSION}`);
  });

  it('honors an explicit subject override', () => {
    const { prompt, subject } = buildInjectionPrompt('something vague', { subject: 'Chemistry' });
    expect(subject).toBe('Chemistry');
    expect(prompt).toContain('Chemistry');
    expect(prompt).toContain('Electrical');
    expect(prompt).toContain('Physics');
  });

  it('supports the ultra prompt variant as a depth dial, not a second essay', () => {
    const { prompt, variant } = buildInjectionPrompt('trace binary search code', {
      subject: 'CS',
      variant: 'ultra',
    });
    expect(variant).toBe('ultra');
    expect(prompt).toContain(CORE_PROTOCOL_BY_VARIANT.ultra);
    expect(prompt).toContain('DEPTH: deep');
    expect(prompt).toContain('Physics');
    expect(prompt).not.toMatch(/PHYSICS: one move\/step/);
  });

  it('normalizes CRLF in protocol templates so Windows checkouts stay consistent', () => {
    const crlf = coreBalancedTemplate.replace(/\n/g, '\r\n');
    expect(renderProtocol(crlf)).toBe(renderProtocol(coreBalancedTemplate));
  });

  it('keeps structural markers the parser relies on', () => {
    for (const marker of [
      '@meta', '@endmeta', '@step', '@endstep', '@formula', '@endformula',
      '@body', '@endbody', '@diagram', '@enddiagram', '@takeaway', '@endtakeaway',
      '@quickcheck', '@followup', '@endfollowup', '@solution', '@endsolution', '@end',
      '@verify', '@uncertainty', '@resume', '@q', '@patch',
      'stemlm',
    ]) {
      expect(CORE_PROTOCOL).toContain(marker);
    }
  });

  it('ultra variant is the deeper depth dial on the same protocol body', () => {
    const balanced = CORE_PROTOCOL_BY_VARIANT.balanced;
    const ultra = CORE_PROTOCOL_BY_VARIANT.ultra;
    expect(Buffer.byteLength(ultra, 'utf8')).toBeGreaterThan(Buffer.byteLength(balanced, 'utf8'));
    expect(ultra).toContain('VERIFICATION');
    expect(ultra).toMatch(/DEEP mode/i);
    expect(ultra).toContain('DEPTH: deep');
    expect(balanced).toContain('DEPTH: balanced');
    for (const marker of ['@meta', '@step', '@body', '@diagram', '@solution', '@end']) {
      expect(ultra).toContain(marker);
    }
  });

  it('handles an empty question gracefully', () => {
    const { prompt } = buildInjectionPrompt('   ');
    expect(prompt).toContain('has not typed a question');
  });

  it('is a last-resort inline paste of core markers, not leftover rows', () => {
    const { prompt } = buildInjectionPrompt('');
    expect(prompt).toContain('stemLM instructions');
    expect(prompt).toContain('OUTPUT:');
    expect(prompt).toContain('@meta');
    expect(prompt).not.toContain(PROTOCOL_FILENAME);
    expect(prompt).not.toContain('Follow the attached');
    expect(prompt).not.toContain('anatomy\tleftover');
    expect(prompt).not.toContain('DIAGRAM REGISTRY');
  });
});

describe('buildInjectionAppendix', () => {
  it('returns only the separator and protocol (no question line)', () => {
    const { prompt, subject } = buildInjectionAppendix(
      'A projectile is launched at 20 m/s at 45 degrees',
    );
    expect(subject).toBe('Physics');
    expect(prompt.startsWith('\n\n--- stemLM instructions')).toBe(true);
    expect(prompt).toContain('CRITICAL');
    expect(prompt).toContain('non-empty @body');
    expect(prompt).toContain('FIRST PASS');
    expect(prompt).toContain('OUTPUT:');
    expect(prompt).toContain('Physics');
    expect(prompt).toContain('Electrical');
    expect(prompt).not.toContain('DIAGRAM REGISTRY');
    expect(prompt).not.toContain('anatomy\tleftover');
    expect(prompt).not.toContain('A projectile is launched');
  });

  it('asks the model to transcribe the image when the composer has no text', () => {
    const { prompt } = buildInjectionAppendix('', { hasImageAttachment: true });
    expect(prompt).toContain('problem image/PDF');
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
    expect(payload.composerText).toContain(STEMLM_SENTINEL);
    expect(payload.composerText).toContain('Follow the attached');
    expect(payload.composerText).not.toContain('OUTPUT:');
    expect(payload.composerText).not.toContain('@meta');
    expect(payload.composerText).not.toContain('(Electrical)');
    expect(payload.composerText).toContain('Infer the subject from the problem');
    expect(payload.composerText.indexOf('Solve this circuit')).toBeLessThan(
      payload.composerText.indexOf(STEMLM_SENTINEL),
    );
    expect(payload.fileContent).toContain('OUTPUT:');
    expect(payload.fileContent).toContain('ELECTRICAL');
    expect(payload.fileContent).toContain('PHYSICS');
    expect(payload.fileContent).toContain('CHEMISTRY');
    expect(payload.fileContent).toContain('MATH');
    expect(payload.fileContent).toContain('BIOLOGY');
    expect(payload.fileContent).toContain('MECHANICAL');
    expect(payload.fileContent).toContain('CIVIL');
    expect(payload.fileContent).toContain('CHEMICAL');
    expect(payload.fileContent).toContain('@resume');
    expect(payload.fileContent).toContain('@uncertainty');
    expect(payload.fileContent).toContain('WHEN NOT TO DRAW');
  });

  it('attaches the same universal file regardless of the classified subject', () => {
    const a = buildProtocolFileContent({ question: 'Solve this circuit with a resistor and 12V source' });
    const b = buildProtocolFileContent({ question: 'A projectile is launched at 20 m/s at 45 degrees' });
    const c = buildProtocolFileContent({ question: 'Balance ce{H2 + O2 -> H2O}' });
    expect(a.subject).toBe('Electrical');
    expect(b.subject).toBe('Physics');
    expect(a.content).toBe(b.content);
    expect(b.content).toBe(c.content);
  });

  it('teaches typed specs and does not instruct SVG coordinate craft', () => {
    const { content } = buildProtocolFileContent({ question: 'sizing' });
    expect(content).toContain('type=plot');
    expect(content).toContain('type=circuit');
    expect(content).toContain('chem.smiles');
    expect(content).toMatch(/NEVER <svg>|Never <svg>|never emit <svg>/i);
    expect(content).not.toMatch(/viewBox="0 0 300 180"/);
    expect(content).not.toMatch(/@diagram type=svg/);
    const stub = buildComposerStub('A kinematics graph question.');
    expect(stub).toMatch(/diagram/i);
    expect(stub).not.toContain('viewBox');
    expect(getDiagramRequirement('Electrical')).toContain('hybridpi');
    expect(getDiagramRequirement('Electrical')).not.toContain('nearly EVERY');
    expect(getDiagramRequirement('Electrical')).toContain('rpi, gm, re, rc');
    expect(getDiagramRequirement('Electrical')).not.toContain('viewBox="0 0 300 180"');
  });

  it('keeps the composer stub compact (full rules live in the attached file)', () => {
    const stub = buildComposerStub('A representative question for sizing.');
    expect(Buffer.byteLength(stub, 'utf8')).toBeLessThanOrEqual(900);
    expect(stub).toContain('Infer the subject from the problem');
  });

  it('puts every subject registry in the attached file, not a duplicated diagram wall', () => {
    const cases: [string, string][] = [
      ['Find the eigenvalues of this 2x2 matrix and graph the region', 'MATH'],
      ['Explain the Krebs cycle pathway in the mitochondrion', 'BIOLOGY'],
      ['Compute bending stress for this shaft and draw the free-body diagram', 'MECHANICAL'],
      ['Draw the SFD and BMD for a simply supported beam with a point load', 'CIVIL'],
      ['Mass balance on a mixer with two inlet streams and one outlet', 'CHEMICAL'],
    ];
    for (const [question, marker] of cases) {
      const { fileContent } = buildInjectionPayload(question);
      expect(fileContent, `protocol file for "${question}" should mention "${marker}"`).toContain(marker);
      expect(fileContent).toContain('OUTPUT:');
      expect(fileContent).toContain('PHYSICS');
      expect(fileContent).toContain('ELECTRICAL');
      expect(buildComposerAppendix()).toContain(PROTOCOL_FILENAME);
      expect(buildComposerAppendix()).not.toContain('OUTPUT:');
    }
  });

  it('buildComposerStub references the attached filename only', () => {
    const stub = buildComposerStub('derivative question');
    expect(stub).toContain('derivative question');
    expect(stub).toContain(PROTOCOL_FILENAME);
    expect(stub).not.toContain('MATH:');
  });

  it('buildProtocolFileContent includes every registry', () => {
    const { content, subject } = buildProtocolFileContent({
      question: 'binary search trace',
      subject: 'CS',
    });
    expect(subject).toBe('CS');
    expect(content).toContain('CS');
    expect(content).toContain('PHYSICS');
    expect(content).toContain('OUTPUT:');
    expect(content).toContain('ARCHETYPE REGISTRY');
  });

  it('classifies for analytics but does not pin the composer or file to that subject', () => {
    const question = 'Solve this circuit with a resistor and 12V voltage source';
    const payloads = [
      buildInjectionPayload(question),
      buildInjectionPayload(question, { subject: 'Auto' }),
      buildInjectionPayload(question, { subject: undefined }),
    ];

    for (const payload of payloads) {
      expect(payload.subject).toBe('Electrical');
      expect(payload.composerText).toContain('Follow the attached stemlm-protocol.txt');
      expect(payload.composerText).toContain('Infer the subject from the problem');
      expect(payload.composerText).not.toContain('(Electrical)');
      expect(payload.fileContent).toContain('ELECTRICAL');
      expect(payload.fileContent).toContain('PHYSICS');
      expect(payload.composerText).not.toContain('OUTPUT:');
    }

    expect(payloads[0]).toEqual(payloads[1]);
    expect(payloads[1]).toEqual(payloads[2]);
  });

  it('includes subject-specific textbook diagram conventions without prompt banks', () => {
    expect(getDiagramRequirement('Electrical')).toContain('hybridpi');
    expect(getDiagramRequirement('Electrical')).toContain('type=circuit');
    expect(getDiagramRequirement('Electrical')).not.toContain('nearly EVERY');
    expect(getDiagramRequirement('Chemistry')).toContain('chem.smiles');
    expect(getDiagramRequirement('Physics')).toContain('FREE-BODY');
    expect(getDiagramRequirement('Math')).toContain('type=plot');
    expect(getDiagramRequirement('Biology')).toContain('Punnett');
    expect(getDiagramRequirement('Civil')).toContain('type=sfd');
    expect(getDiagramRequirement('Chemical')).toContain('mccabe');
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

  it('quotes the selection and uses the short form, not the protocol wall', () => {
    const prompt = buildFollowupPrompt(opts);
    expect(prompt).toMatch(/^Ask your question here:/);
    expect(prompt).toContain('stemLM follow-up context');
    expect(prompt).toContain('> Total resistance is R1 + R2');
    expect(prompt).toContain('Solve for current');
    expect(prompt).toContain('FOLLOW-UP CONTRACT');
    expect(prompt).toContain('mode: patch');
    expect(prompt).not.toContain('--- stemLM instructions');
    expect(prompt).not.toContain('OUTPUT:');
    expect(prompt).not.toContain('ARCHETYPE REGISTRY');
    expect(prompt.indexOf('Ask your question here:')).toBeLessThan(
      prompt.indexOf('stemLM follow-up context'),
    );
    expect(prompt).not.toContain('```stemlm');
    expect(prompt).toContain(PROTOCOL_FILENAME);
  });

  it('uses ask intent copy for free-form last-step follow-ups', () => {
    const prompt = buildFollowupPrompt({ ...opts, intent: 'ask' });
    expect(prompt).toContain('finished the step-by-step solution');
    expect(prompt).toContain('type a follow-up');
  });

  it('buildFollowupComposerText references the attached protocol file', () => {
    const composer = buildFollowupComposerText(opts);
    expect(composer).toContain(PROTOCOL_FILENAME);
    expect(composer).not.toContain('(Electrical)');
    expect(composer).toContain('> Total resistance is R1 + R2');
    expect(composer).not.toContain('OUTPUT:');
    expect(composer).toContain('FOLLOW-UP CONTRACT');
    expect(composer.indexOf(PROTOCOL_FILENAME)).toBeLessThan(composer.indexOf('> Total resistance'));
  });

  it('keeps the follow-up composer stub compact (full rules ship in the file)', () => {
    const composer = buildFollowupComposerText({
      ...opts,
      intent: 'ask',
      selection: 'Problem: verify the vector section formula\nFinal step: Verify endpoints\nContext: boundary work',
    });
    expect(Buffer.byteLength(composer, 'utf8')).toBeLessThanOrEqual(4000);
    expect(composer).not.toContain('CRITICAL');
  });

  it('buildFollowupPayload pairs composer stub with protocol file content', () => {
    const payload = buildFollowupPayload(opts);
    expect(payload.composerText).toBe(buildFollowupComposerText(opts));
    expect(payload.fileContent).toContain('OUTPUT:');
    expect(payload.fileContent).toContain('ELECTRICAL');
    expect(payload.fileContent).toContain('PHYSICS');
    expect(payload.fileContent).toContain('FOLLOW-UP CONTRACT');
    expect(payload.subject).toBe('Electrical');
  });
});

describe('composer stubs', () => {
  it('appends a short file pointer without repeating the question', () => {
    const stub = buildComposerAppendix({ hasQuestion: true });
    expect(stub).toContain(PROTOCOL_FILENAME);
    expect(stub).toContain(STEMLM_SENTINEL);
    expect(stub).toContain('Infer the subject from the problem');
    expect(stub).not.toContain('(Physics)');
    expect(stub).not.toContain('OUTPUT:');
    expect(stub).not.toContain('has not typed');
    expect(Buffer.byteLength(stub, 'utf8')).toBeLessThanOrEqual(700);
    expect(composerTextHasProtocol(stub)).toBe(true);
  });

  it('mentions an attached image/PDF when that is the only prompt', () => {
    const stub = buildComposerAppendix({ hasImageAttachment: true, hasQuestion: false });
    expect(stub).toContain('image/PDF');
    expect(stub).toContain(PROTOCOL_FILENAME);
    expect(stub).not.toContain('@meta');
  });

  it('emits a short pointer when the protocol is already present', () => {
    const pointer = buildComposerPointer({ hasQuestion: true });
    expect(pointer).toContain(STEMLM_SENTINEL);
    expect(pointer).toContain('New problem');
    expect(pointer).toContain(PROTOCOL_FILENAME);
    expect(pointer).not.toContain('OUTPUT:');
    expect(Buffer.byteLength(pointer, 'utf8')).toBeLessThanOrEqual(400);
  });

  it('detects both file-stub and inline-paste protocol markers', () => {
    expect(composerTextHasProtocol('Follow the attached stemlm-protocol.txt exactly. Infer the subject from the problem.')).toBe(true);
    expect(composerTextHasProtocol('--- stemLM instructions (do not remove) ---')).toBe(true);
    expect(composerTextHasProtocol('--- stemLM ---\nstemLM is writing')).toBe(true);
    expect(composerTextHasProtocol('Find the range of a projectile')).toBe(false);
  });
});

describe('pageThreadHasProtocol', () => {
  it('detects a prior user turn after the composer has been cleared', () => {
    document.body.innerHTML = `
      <div data-message-author-role="user">A projectile --- stemLM --- Follow the attached stemlm-protocol.txt</div>
      <div id="ed" contenteditable="true">New question</div>
    `;
    const editor = document.getElementById('ed');
    expect(pageThreadHasProtocol(document, editor)).toBe(true);
    expect(pageThreadHasProtocol(document, editor)).toBe(
      composerTextHasProtocol(
        'A projectile --- stemLM --- Follow the attached stemlm-protocol.txt',
      ),
    );
  });

  it('does not treat the live composer as the thread', () => {
    document.body.innerHTML = `
      <div data-message-author-role="user">Just a question about range</div>
      <div id="ed" contenteditable="true">--- stemLM --- Follow the attached stemlm-protocol.txt</div>
    `;
    expect(pageThreadHasProtocol(document, document.getElementById('ed'))).toBe(false);
  });

  it('finds stemlm-protocol.txt in a conversation root outside the composer', () => {
    document.body.innerHTML = `
      <main class="conversation-container">
        <div class="turn">Previous turn attached stemlm-protocol.txt</div>
        <div id="ed" contenteditable="true">New question only</div>
      </main>
    `;
    expect(pageThreadHasProtocol(document, document.getElementById('ed'))).toBe(true);
  });
});

describe('shouldReinjectOnNewQuestion', () => {
  it('re-injects when protocol is present and the question changed', () => {
    expect(
      shouldReinjectOnNewQuestion({
        buttonInjected: true,
        question: 'New projectile question',
        lastQuestion: 'Old circuit question',
        hasProtocol: true,
      }),
    ).toBe(true);
  });

  it('toggles the panel when the question is unchanged', () => {
    expect(
      shouldReinjectOnNewQuestion({
        buttonInjected: true,
        question: 'Same question',
        lastQuestion: 'Same question',
        hasProtocol: true,
      }),
    ).toBe(false);
  });
});

describe('follow-up copy and empty slot', () => {
  it('Copy text is the short composer form without the instructions wall', () => {
    const text = buildFollowupCopyText({
      selection: 'Total resistance is R1 + R2',
      stepTitle: 'Solve for current',
      subject: 'Electrical',
      intent: 'ask',
    });
    expect(text).toMatch(/^Ask your question here:/);
    expect(text).toContain('FOLLOW-UP CONTRACT');
    expect(text).not.toContain('--- stemLM instructions');
    expect(text).not.toContain('OUTPUT:');
  });

  it('treats whitespace as an empty follow-up no-op', () => {
    expect(isEmptyFollowupSelection('')).toBe(true);
    expect(isEmptyFollowupSelection('   \n')).toBe(true);
    expect(isEmptyFollowupSelection('Why is R1 + R2?')).toBe(false);
  });
});

describe('numeric plug-in is scoped to numeric/lab', () => {
  it('repair/inject body rules do not globally MUST-format every formula as a plug-in', () => {
    expect(STEP_BODY_REQUIREMENT).toContain('NUMERIC/LAB only');
    expect(STEP_BODY_REQUIREMENT).toContain('NEVER force a numeric plug-in');
    expect(STEP_BODY_REQUIREMENT).toMatch(/proof MUST NOT plug into the formula/i);
    const file = buildProtocolFileContent({ question: 'sizing' }).content;
    expect(file).toContain('NUMERIC/LAB only');
    expect(file).toContain('NEVER force a numeric plug-in');
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
