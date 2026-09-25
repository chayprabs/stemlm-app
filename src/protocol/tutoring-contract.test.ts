import { STUDY_GUIDE_REFERENCE } from '@/src/lib/study-guide';
import { describe, expect, it } from 'vitest';
import {
  buildComposerPointer,
  buildCoreFallbackAppendix,
  buildFollowupAskInChatPrompt,
  PROTOCOL_FILENAME,
} from './builder';
import { assembleProtocolFile, CORE_PROTOCOL } from './protocol';

const FILE = assembleProtocolFile();

describe('adaptive concise tutoring contract', () => {
  it('chooses a typical step range from complexity without padding to the hard maximum', () => {
    expect(FILE).toContain('typically 5–7 steps');
    expect(FILE).toContain('use 3–4 for shorter solves');
    expect(FILE).toContain('more only for distinct reasoning moves');
    expect(FILE).toContain('Never pad.');
    expect(CORE_PROTOCOL).not.toContain('Use the upper step-count bound');
  });

  it('asks for complete work in short readable tutor paragraphs instead of textbook prose', () => {
    expect(FILE).toContain('Concise, engaging tutor—not textbook prose.');
    expect(FILE).toContain('Include all work needed');
    expect(FILE).toContain('no background essay, repetition, or recap');
    expect(FILE).toContain('prose paragraphs to 1–2 sentences');
    expect(FILE).toContain('separate distinct ideas with a blank line');
  });

  it('groups related algebra into meaningful learning moves instead of fragmenting every line', () => {
    expect(FILE).toContain('A step is one meaningful learning move, not one line of algebra.');
    expect(FILE).toContain('Merge setup, substitution, and short algebra when they serve the same goal.');
    expect(FILE).toContain('Do not create separate steps for repeated eliminations, determinant expansions, or arithmetic on parallel unknowns.');
    expect(FILE).toContain('Plan the shortest complete route before emitting @step blocks.');
    expect(FILE).not.toMatch(/textbook-style solution/i);
    expect(FILE).not.toMatch(/one @step\s*=\s*one move/i);
    expect(FILE).not.toMatch(/never combine setup\+solve/i);
    expect(FILE).not.toMatch(/never two algebra moves in one @step/i);
  });

  it('sets a compact body rhythm without sacrificing necessary work', () => {
    expect(FILE).toContain('Aim for roughly 40–60 words in a normal computational @body.');
    expect(FILE).toContain('Shorter is fine for a setup or diagram step; longer only when correctness needs it.');
    expect(FILE).toContain('Define a symbol once, at first use; do not reintroduce the same variable in later steps.');
    expect(FILE).toContain('Use the literal numeric skeleton only when a quantity is introduced for the first time.');
    expect(FILE).toContain('For an already-defined symbol, begin with the equation or substitution; do not repeat “is” or “With givens”.');
    expect(FILE).toContain('Never restate the givens line by line.');
    expect(FILE).toContain('Never insert a manual line break inside a sentence.');
    expect(FILE).toContain('OMIT @takeaway when it only paraphrases the title, formula, or body.');
    expect(FILE).toContain('Carry the chosen sign convention and coherent units through every derived numeric line');
  });

  it('neutralizes deep mode so it adds necessary connective work rather than extra steps', () => {
    expect(CORE_PROTOCOL).toContain('DEPTH: deep');
    expect(CORE_PROTOCOL).toContain('Worked explanations use DEEP mode.');
    expect(CORE_PROTOCOL).toContain('DEEP means no skipped reasoning inside a meaningful step; it does not add extra steps');
    expect(CORE_PROTOCOL).not.toContain('DEPTH deep adds skipped algebra');
  });

  it('requires verification to perform and show the check after deriving the result', () => {
    expect(FILE).toContain('show the tested expression, substituted values, and recovered value');
    expect(FILE).toContain('Never claim a final-value check before that value is derived');
  });

  it('keeps solution as a concise synthesis instead of replaying the step algebra', () => {
    expect(FILE).toContain('Do not replay the step-by-step algebra in @solution');
  });

  it('makes circuit specs preserve the source topology before the compiler chooses geometry', () => {
    expect(FILE).toContain('Before emitting a circuit spec, reconstruct its connectivity as a node graph.');
    expect(FILE).toContain('Emit one device line per visible component.');
    expect(FILE).toContain('Terminals joined by uninterrupted conductor MUST use the same node token; terminals separated by a component MUST use different tokens.');
    expect(FILE).toContain("Count-check source components against device lines and verify every device's terminal nodes.");
    expect(FILE).toContain('Never invent input/output labels, merge distinct nodes, or add a ground rail absent from the source.');
  });

  it('keeps a diagram available at every step but only when it materially clarifies the move', () => {
    expect(FILE).toContain('At each step, consider whether one supported figure would materially clarify the move.');
    expect(FILE).toContain('Never draw to meet a quota.');
  });

  it('asks for a natural learner question instead of internal step-editing commands', () => {
    expect(FILE).toContain('a short, natural learner question');
    expect(FILE).toContain('Never tell the learner to redo a step');
    expect(FILE).toContain('never mention internal step ids');
  });

  it('tells later questions to re-read the attached protocol before answering', () => {
    const pointer = buildComposerPointer({ hasQuestion: true });
    expect(pointer).toContain(`Re-read and apply the earlier ${STUDY_GUIDE_REFERENCE}`);
    expect(pointer).toContain('attached file or inline fallback');
    expect(pointer).toContain('before answering');
    expect(Buffer.byteLength(pointer, 'utf8')).toBeLessThanOrEqual(400);
  });

  it('keeps attachment-failure paths fallback-complete for first and follow-up turns', () => {
    const initial = buildCoreFallbackAppendix('Find the mesh currents').prompt;
    const followup = buildFollowupAskInChatPrompt({
      selection: 'The shared-branch current is I2-I3.',
      intent: 'ask',
      subject: 'Electrical',
    });
    for (const prompt of [initial, followup]) {
      expect(prompt).toContain('ARCHETYPE REGISTRY');
      expect(prompt).toContain('VERIFICATION REGISTRY');
      expect(prompt).toContain('WHEN NOT TO DRAW');
      expect(prompt).toContain('ENGINE KEY SCHEMAS');
    }
  });

  it('inlines the full protocol when an existing problem attachment makes file injection uncertain', () => {
    const pointer = buildComposerPointer({ hasImageAttachment: true, hasQuestion: false });
    expect(pointer).toContain('ARCHETYPE REGISTRY');
    expect(pointer).toContain('VERIFICATION REGISTRY');
    expect(pointer).toContain('ENGINE KEY SCHEMAS');
  });

  it('keeps the student problem attachment separate from the protocol attachment', () => {
    expect(FILE).toContain('Transcribe only the student’s problem attachment');
    expect(FILE).toContain(`never copy ${PROTOCOL_FILENAME}`);
  });
});
