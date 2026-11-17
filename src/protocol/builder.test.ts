import { describe, expect, it } from 'vitest';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { STUDY_GUIDE_END, STUDY_GUIDE_REFERENCE } from '@/src/lib/study-guide';
import {
  buildComposerAppendix,
  buildComposerPointer,
  buildComposerStub,
  buildFollowupCopyText,
  buildInjectionAppendix,
  buildInjectionPayload,
  buildInjectionPrompt,
  composerExpectsGuideFile,
  composerHasInlineGuide,
  composerTextHasProtocol,
  GUIDE_PASTED_NOTICE,
  GUIDE_REFRESH_TURNS,
  guideNeeded,
  isEmptyFollowupSelection,
  pageThreadHasProtocol,
  PROTOCOL_FILENAME,
  sentStudentMessages,
  shouldReinjectOnNewQuestion,
  STEMLM_SENTINEL,
  THREAD_PROTOCOL_SELECTORS,
} from './builder';
import { parse } from './parser';
import { assembleGuide, GUIDE_INLINE_MAX_CHARS } from './protocol';
import { SUBJECTS } from './types';

const INCLINE = 'A 5.0 kg block is released from rest on a 30° incline. Find its acceleration.';
const PROJECTILE = 'A ball is thrown at 20 m/s at 35° above the horizontal. Find its range.';
const PUNNETT = 'Two heterozygous pea plants are crossed. Show the Punnett square and the genotype ratio.';

/** A student message as the chat shows it after sending. */
const attached = (question: string) => buildComposerStub(question);
const reminderOnly = (question: string) => `${question}\n\n${buildComposerPointer({ hasQuestion: true })}`;
const pasted = (question: string) => buildInjectionPrompt(question).prompt;

describe('the reminder every question carries', () => {
  const stub = buildComposerStub('Find the range of a projectile.');
  const reminder = stub.slice(stub.indexOf(STEMLM_SENTINEL));

  it('sits under the question, below the sentinel', () => {
    expect(stub.startsWith(`Find the range of a projectile.\n\n${STEMLM_SENTINEL}\n`)).toBe(true);
    expect(reminder.split('\n')).toHaveLength(17);
  });

  it('leaves a blank first line for the question when the chat box is empty, and none under a question', () => {
    expect(buildComposerStub('').startsWith(`\n${STEMLM_SENTINEL}\n`)).toBe(true);
    expect(buildComposerPointer().startsWith(`\n${STEMLM_SENTINEL}\n`)).toBe(true);
    expect(buildComposerAppendix({ hasQuestion: true }).startsWith(STEMLM_SENTINEL)).toBe(true);
    expect(buildComposerPointer({ hasQuestion: true }).startsWith(STEMLM_SENTINEL)).toBe(true);
  });

  it('is short enough to live in the student\'s own message', () => {
    expect(reminder.length).toBeLessThanOrEqual(350);
    expect(buildComposerPointer({ hasQuestion: true }).length).toBeLessThanOrEqual(350);
    // A chat box may turn a fence into a code block of its own; the reminder names the block in words.
    expect(reminder).not.toContain('```');
    expect(reminder).not.toContain(PROTOCOL_FILENAME);
    expect(reminder).not.toMatch(/\b[A-Z]{4,}\b/);
  });

  it('is enough by itself: an answer written from it is read as a complete stemLM answer', () => {
    // Every marker the reminder names, and nothing it does not.
    const markers = reminder.match(/@[a-z]+/g)!;
    expect(markers).toEqual(['@meta', '@endmeta', '@step', '@body', '@endbody', '@endstep', '@solution', '@endsolution', '@end']);
    const step = (n: number) => `@step id=s${n}\ntitle: Move ${n}\n@body\nBecause of rule ${n}, the value is $x_${n} = ${n}\\ \\text{m}$.\n@endbody\n@endstep`;
    const reply = ['```stemlm', '@meta', 'subject: Physics', 'topic: Range of a projectile', '@endmeta', step(1), step(2), step(3), '@solution', 'The range is $3\\ \\text{m}$.', '@endsolution', '@end', '```'].join('\n');
    const result = parse(reply);
    expect(result.status).toBe('ok');
    expect(result.capsule!.steps.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
    expect(result.capsule!.meta).toMatchObject({ subject: 'Physics', topic: 'Range of a projectile' });
    expect(result.capsule!.solution).toContain('range');
    for (const fatal of ['missing_end', 'missing_meta', 'missing_step_body', 'missing_step_id', 'invalid_step_count']) {
      expect(result.warningCodes, fatal).not.toContain(fatal);
    }
  });

  it('writes every marker on a line of its own, as the answer must', () => {
    // Shown the markers on one line with commas between them, a model wrote them back that way.
    for (const text of [reminder, buildFollowupCopyText({ selection: 'Step 1: range', intent: 'ask' }), buildFollowupCopyText({ selection: 'Step 1: range' })]) {
      const marked = text.split('\n').filter((line) => line.includes('@') && !line.includes('@diagram only if'));
      expect(marked.length).toBeGreaterThan(8);
      for (const line of marked) expect(line, line).toMatch(/^@[a-z]+(?: [a-z]+=\S+)?(?: id=\(.*\))?$/);
    }
  });

  it('says where the rest of the guide is: attached to this message, or earlier in the chat', () => {
    expect(stub).toContain(`The attached ${STUDY_GUIDE_REFERENCE} has the rest`);
    expect(buildComposerAppendix({ hasQuestion: true })).toBe(reminder);
    expect(buildComposerPointer({ hasQuestion: true, protocolAttachmentConfirmed: true })).toBe(reminder);
    const later = buildComposerPointer({ hasQuestion: true });
    expect(later).toContain(`The ${STUDY_GUIDE_REFERENCE} earlier in this chat has the rest`);
    expect(later.split('\n').slice(0, 16)).toEqual(reminder.split('\n').slice(0, 16));
  });

  it('asks for the question to be copied out when it came as an image or PDF', () => {
    for (const text of [
      buildComposerStub('', { hasImageAttachment: true }),
      buildComposerAppendix({ hasImageAttachment: true, hasQuestion: false }),
      buildComposerPointer({ hasImageAttachment: true, hasQuestion: false }),
    ]) {
      expect(text.startsWith('(Problem image/PDF is attached')).toBe(true);
      expect(text).toContain(STEMLM_SENTINEL);
    }
    expect(buildComposerAppendix({ hasImageAttachment: true, hasQuestion: true })).not.toContain('image/PDF');
  });

  it('never tells the model which subject the classifier chose', () => {
    const payload = buildInjectionPayload('Solve this circuit with a resistor and 12V voltage source');
    expect(payload.subject).toBe('Electrical');
    for (const subject of SUBJECTS) expect(payload.composerText).not.toContain(subject);
  });

  it('is recognised as stemLM text, and as expecting a file only when it says one is attached', () => {
    for (const text of [stub, buildComposerPointer({ hasQuestion: true }), pasted('Find x.')]) expect(composerTextHasProtocol(text)).toBe(true);
    expect(composerTextHasProtocol('Find the range of a projectile')).toBe(false);
    expect(composerExpectsGuideFile(stub)).toBe(true);
    expect(composerExpectsGuideFile(buildComposerPointer({ hasQuestion: true }))).toBe(false);
    expect(composerExpectsGuideFile(pasted('Find x.'))).toBe(false);
  });

  it('still recognises what earlier versions wrote', () => {
    const old = 'Find x.\n\n--- stemLM ---\nFollow the attached stemLM study guide as an answer-format reference for my question. Infer the subject from the problem.';
    expect(composerTextHasProtocol(old)).toBe(true);
    expect(composerExpectsGuideFile(old)).toBe(true);
    expect(composerTextHasProtocol('Follow the attached stemlm-protocol.txt')).toBe(true);
    expect(composerExpectsGuideFile('1789247745212_stemlm-protocol.txt')).toBe(true);
    expect(composerTextHasProtocol('--- stemLM instructions (do not remove) ---')).toBe(true);
  });
});

describe('the guide file', () => {
  it('is the guide for this question, under the plain file name', () => {
    const payload = buildInjectionPayload(INCLINE);
    expect(payload.subject).toBe('Physics');
    expect(payload.fileContent).toBe(assembleGuide(INCLINE).text);
    expect(payload.composerText).toBe(buildComposerStub(INCLINE));
    expect(PROTOCOL_FILENAME).toBe('stemLM Guide.txt');
  });

});

describe('the guide as message text, where the host takes no upload', () => {
  const question = 'A class survey asked 50 students for their favourite sport. Show the results as a bar chart.';
  const { prompt } = buildInjectionPrompt(question);

  it('keeps the question first and readable, then the sentinel, then the guide', () => {
    expect(prompt.startsWith(`${question}\n\n${STEMLM_SENTINEL}\n`)).toBe(true);
    expect(prompt.endsWith(STUDY_GUIDE_END)).toBe(true);
    expect(cleanSessionQuestion(prompt)).toBe(question);
  });

  it('is small enough to stay ordinary message text', () => {
    expect(prompt.length - question.length).toBeLessThanOrEqual(GUIDE_INLINE_MAX_CHARS + 120);
    expect(prompt).not.toContain('```');
    expect(prompt).not.toContain(PROTOCOL_FILENAME);
  });

  it('carries the answer shape and the figure form the question names', () => {
    expect(prompt).toContain('@step id=s1');
    expect(prompt).toContain('@diagram type=chart');
    expect(parse(prompt).capsule?.steps).toHaveLength(1);
  });

  it('is appended under a question already in the chat box without repeating it', () => {
    const appendix = buildInjectionAppendix(question).prompt;
    // The chat box adds its own blank line before appended text.
    expect(appendix.startsWith(`${STEMLM_SENTINEL}\n`)).toBe(true);
    expect(appendix).not.toContain(question);
    expect(`${question}\n\n${appendix}`).toBe(prompt);
    expect(buildInjectionAppendix('', { hasImageAttachment: true }).prompt).toContain('(Problem image/PDF is attached');
  });

  it('counts as arrived only when it arrived whole', () => {
    expect(composerHasInlineGuide(prompt)).toBe(true);
    expect(composerHasInlineGuide(prompt.slice(0, -40))).toBe(false);
    expect(composerHasInlineGuide(buildComposerStub(question))).toBe(false);
  });

  it('comes with one plain sentence that tells the student why the guide is in their message', () => {
    expect(GUIDE_PASTED_NOTICE).toBe('This chat did not take a file, so the guide is in your message as text.');
  });
});

describe('guideNeeded: when the full guide goes with a question', () => {
  it('attaches it to the first question of a chat', () => {
    expect(guideNeeded(INCLINE, [])).toBe(true);
    expect(guideNeeded(INCLINE, ['hello', 'what is a vector?'])).toBe(true);
  });

  it('is not fooled by a chat whose messages carry only the reminder', () => {
    // A reminder says the guide is "earlier in this chat"; that is not a guide.
    expect(guideNeeded(PROJECTILE, [reminderOnly(INCLINE)])).toBe(true);
    expect(guideNeeded(PROJECTILE, [reminderOnly(INCLINE), reminderOnly(PROJECTILE)])).toBe(true);
  });

  it('does not upload it again for the next question on the same subject', () => {
    expect(guideNeeded(PROJECTILE, [attached(INCLINE)])).toBe(false);
    expect(guideNeeded(INCLINE, [attached(INCLINE)])).toBe(false);
  });

  it('holds off for the following questions, then refreshes it', () => {
    const sent = [attached(INCLINE)];
    for (let turn = 1; turn < GUIDE_REFRESH_TURNS; turn += 1) {
      expect(guideNeeded(PROJECTILE, sent), `turn ${turn}`).toBe(false);
      sent.push(reminderOnly(PROJECTILE));
    }
    sent.push('thanks, and what about air resistance?');
    expect(sent.length - 1).toBe(GUIDE_REFRESH_TURNS);
    expect(guideNeeded(PROJECTILE, sent)).toBe(true);
    // The refreshed guide starts the count again.
    expect(guideNeeded(PROJECTILE, [...sent, attached(PROJECTILE)])).toBe(false);
  });

  it('attaches it again when the last answer did not come back in the format', () => {
    expect(guideNeeded(PROJECTILE, [attached(INCLINE)], false)).toBe(true);
  });

  it('does not upload it again for a new subject: the file describes every figure type', () => {
    expect(guideNeeded(PUNNETT, [attached(INCLINE)])).toBe(false);
    expect(guideNeeded(INCLINE, [attached(PUNNETT)])).toBe(false);
    expect(guideNeeded('For the block on the incline, write the truth table of the two switches.', [attached(INCLINE)])).toBe(false);
    // The file an incline question attached already gives the keys of a Punnett square.
    expect(assembleGuide(INCLINE).forms).not.toContain('table.punnett');
    expect(assembleGuide(INCLINE).text).toContain('type=table: a Punnett square.');
  });

  it('treats a guide pasted as text as the guide, and pastes again only for figure forms it left out', () => {
    expect(guideNeeded(INCLINE, [pasted(INCLINE)])).toBe(false);
    expect(guideNeeded(PROJECTILE, [pasted(INCLINE)])).toBe(false);
    // The pasted guide holds a few forms only: a Punnett square is not among a mechanics question's.
    expect(guideNeeded(PUNNETT, [pasted(INCLINE)])).toBe(true);
  });

  it('trusts the guide an earlier version attached: it described every figure form', () => {
    const old = `${INCLINE}\n\n--- stemLM ---\nFollow the attached stemLM study guide as an answer-format reference for my question.`;
    expect(guideNeeded(PROJECTILE, [old])).toBe(false);
  });
});

describe('sentStudentMessages', () => {
  const hosts: Array<[string, (text: string) => string]> = [
    ['ChatGPT', (text) => `<div data-message-author-role="user"><div class="whitespace-pre-wrap">${text}</div></div>`],
    ['Claude', (text) => `<div data-testid="user-message"><p>${text}</p></div>`],
    ['Gemini', (text) => `<user-query><div class="query-text"><p class="query-text-line">${text}</p></div></user-query>`],
    ['Grok', (text) => `<div class="message-bubble" data-testid="user-message">${text}</div>`],
  ];

  it.each(hosts)('%s: reads each of the student\'s turns once, in order, and never the chat box', (_host, turn) => {
    document.body.innerHTML = `<main>${turn(attached(INCLINE))}<div class="answer">@meta …</div>${turn(reminderOnly(PROJECTILE))}</main>
      <div id="ed" contenteditable="true">${attached('A draft not sent yet')}</div>`;
    const sent = sentStudentMessages(document, document.getElementById('ed'));
    expect(sent).toHaveLength(2);
    expect(sent[0]).toContain('30° incline');
    expect(sent[1]).toContain('thrown at 20 m/s');
    expect(guideNeeded(PROJECTILE, sent)).toBe(false);
  });

  it.each(hosts)('%s: a new chat, or one with only the reminder, gets the guide', (_host, turn) => {
    document.body.innerHTML = '<main></main><div id="ed" contenteditable="true">Find x.</div>';
    expect(guideNeeded(INCLINE, sentStudentMessages(document, document.getElementById('ed')))).toBe(true);
    document.body.innerHTML = `<main>${turn(reminderOnly(INCLINE))}</main><div id="ed" contenteditable="true"></div>`;
    expect(pageThreadHasProtocol(document, document.getElementById('ed'))).toBe(true);
    expect(guideNeeded(INCLINE, sentStudentMessages(document, document.getElementById('ed')))).toBe(true);
  });

  describe('a guide attached but not sent is not a guide the chat has', () => {
    /** A chat box as the hosts build it: the editor, and beside it (not inside it) the file chips. */
    const chatBox = (chip: string) => `<main>
        <form><div class="file-preview">${chip}</div><div id="ed" contenteditable="true">${attached(INCLINE)}</div></form>
      </main>`;
    const state = () => {
      const editor = document.getElementById('ed');
      return { thread: pageThreadHasProtocol(document, editor), sent: sentStudentMessages(document, editor) };
    };

    it('an empty chat with the guide chip and the reminder waiting in the chat box has no guide yet', () => {
      document.body.innerHTML = chatBox(PROTOCOL_FILENAME);
      expect(state()).toEqual({ thread: false, sent: [] });
      expect(guideNeeded(INCLINE, state().sent)).toBe(true);
    });

    it('still needs the guide after the student removes the chip and asks again', () => {
      document.body.innerHTML = chatBox('');
      expect(state()).toEqual({ thread: false, sent: [] });
      expect(guideNeeded(INCLINE, state().sent)).toBe(true);
    });

    it.each(['form', 'fieldset', 'input-area-v2', 'div role="form"'])('skips the whole chat box when it is a <%s>', (tag) => {
      const name = tag.split(' ')[0]!;
      document.body.innerHTML = `<main><${tag}><div class="file-preview">${PROTOCOL_FILENAME}</div><div id="ed" contenteditable="true"></div></${name}></main>`;
      expect(state().thread).toBe(false);
    });

    it('counts the guide once the message is sent, whatever waits in the chat box', () => {
      document.body.innerHTML = `<main><div data-message-author-role="user">${attached(INCLINE)}</div>
        <form><div id="ed" contenteditable="true">${PROJECTILE}</div></form></main>`;
      expect(state().thread).toBe(true);
      expect(guideNeeded(PROJECTILE, state().sent)).toBe(false);
    });
  });

  it('returns nothing where the host\'s turns cannot be told apart, which means: attach', () => {
    document.body.innerHTML = `<main><div class="turn">${attached(INCLINE)}</div></main>`;
    expect(sentStudentMessages(document, null)).toEqual([]);
    expect(guideNeeded(INCLINE, [])).toBe(true);
  });
});

describe('pageThreadHasProtocol', () => {
  it('detects a prior user turn after the composer has been cleared', () => {
    document.body.innerHTML = `
      <div data-message-author-role="user">A projectile --- stemLM --- Follow the attached stemlm-protocol.txt</div>
      <div id="ed" contenteditable="true">New question</div>
    `;
    expect(pageThreadHasProtocol(document, document.getElementById('ed'))).toBe(true);
  });

  it('does not treat the live composer as the thread', () => {
    document.body.innerHTML = `
      <div data-message-author-role="user">Just a question about range</div>
      <div id="ed" contenteditable="true">--- stemLM --- Follow the attached stemlm-protocol.txt</div>
    `;
    expect(pageThreadHasProtocol(document, document.getElementById('ed'))).toBe(false);
  });

  it('finds the guide file name in a conversation root outside the composer', () => {
    document.body.innerHTML = `
      <main class="conversation-container">
        <div class="turn">Previous turn attached stemlm-protocol.txt</div>
        <div id="ed" contenteditable="true">New question only</div>
      </main>
    `;
    expect(pageThreadHasProtocol(document, document.getElementById('ed'))).toBe(true);
  });

  it('does not invent unconfirmed Gemini user-only custom-element selectors', () => {
    const joined = THREAD_PROTOCOL_SELECTORS.join(' ');
    expect(joined).not.toMatch(/gemini-user/i);
    expect(joined).not.toMatch(/<user-turn/i);
    expect(THREAD_PROTOCOL_SELECTORS.some((s) => s.includes('stemlm-protocol'))).toBe(false);
  });
});

describe('shouldReinjectOnNewQuestion', () => {
  it('re-injects when stemLM text is present and the question changed', () => {
    expect(shouldReinjectOnNewQuestion({ buttonInjected: true, question: 'New projectile question', lastQuestion: 'Old circuit question', hasProtocol: true })).toBe(true);
  });

  it('toggles the panel when the question is unchanged', () => {
    expect(shouldReinjectOnNewQuestion({ buttonInjected: true, question: 'Same question', lastQuestion: 'Same question', hasProtocol: true })).toBe(false);
  });
});

describe('follow-ups', () => {
  const opts = { selection: 'Problem: Find I\nStep 2 of 4 (s2): Solve for current\nWork: Total resistance is R1 + R2', stepTitle: 'Solve for current', subject: 'Electrical' as const };
  const ask = buildFollowupCopyText({ ...opts, intent: 'ask' });

  it('leaves a slot for the student\'s question above the context', () => {
    expect(ask.startsWith('Ask your question here:\n\n\n--- stemLM follow-up context (do not remove) ---\n')).toBe(true);
    expect(ask).toContain('My question above is about this step of your earlier answer ("Solve for current"):');
    expect(ask).toContain('> Problem: Find I\n> Step 2 of 4 (s2): Solve for current\n> Work: Total resistance is R1 + R2');
    expect(cleanSessionQuestion(ask.replace('Ask your question here:\n\n\n', 'Why do the resistances add?\n\n'))).toBe('Why do the resistances add?');
  });

  it('is short, plain and needs no attachment', () => {
    expect(ask.length).toBeLessThanOrEqual(800);
    expect(ask).not.toContain('```');
    expect(ask).not.toContain(PROTOCOL_FILENAME);
    expect(ask).not.toContain(STUDY_GUIDE_REFERENCE);
    expect(ask).not.toMatch(/\b[A-Z]{4,}\b/);
    expect(composerTextHasProtocol(ask)).toBe(true);
    expect(composerExpectsGuideFile(ask)).toBe(false);
  });

  it('is enough by itself: the reply it asks for is read as an answer to hang under that step', () => {
    expect(ask).toContain('@meta\nmode: resolve\n@endmeta\n@step id=s1\n');
    const reply = ['```stemlm', '@meta', 'mode: resolve', '@endmeta', '@step id=s1', 'title: Why series resistances add', '@body', 'The same current $I$ flows through both, so the voltages add: $V = IR_1 + IR_2 = I(R_1 + R_2)$.', '@endbody', '@endstep', '@solution', 'They add because one current passes through both resistors.', '@endsolution', '@end', '```'].join('\n');
    const result = parse(reply);
    expect(result.status).toBe('ok');
    expect(result.capsule!.meta.mode).toBe('resolve');
    expect(result.capsule!.steps).toHaveLength(1);
    expect(result.warningCodes).not.toContain('missing_end');
    expect(result.patch).toBeUndefined();
  });

  it('names the qid of an older answer, which its reply must repeat to be matched', () => {
    expect(buildFollowupCopyText({ ...opts, intent: 'ask', qid: 'q1' })).toContain('@meta\nqid: q1\nmode: resolve\n@endmeta');
    expect(ask).not.toContain('qid');
  });

  it('asks about the whole answer from the solution view', () => {
    const whole = buildFollowupCopyText({ ...opts, intent: 'ask-solution' });
    expect(whole).toContain('My question above is about your whole earlier answer:');
    expect(whole).not.toContain('about this step');
    expect(whole).toContain('mode: resolve');
  });

  it('treats whitespace as an empty selection', () => {
    expect(isEmptyFollowupSelection('')).toBe(true);
    expect(isEmptyFollowupSelection('   \n')).toBe(true);
    expect(isEmptyFollowupSelection('Why is R1 + R2?')).toBe(false);
  });
});

describe('the question shown in the panel and saved in the library', () => {
  const question = 'Find the range of a projectile launched at 20 m/s.';

  it.each([
    ['guide attached', buildComposerStub(question)],
    ['reminder only', reminderOnly(question)],
    ['guide pasted as text', pasted(question)],
    ['question typed above a follow-up', buildFollowupCopyText({ selection: 'Step 1: range', intent: 'ask' }).replace('Ask your question here:\n\n\n', `${question}\n\n`)],
  ])('is the student\'s own text when the message is: %s', (_name, message) => {
    expect(cleanSessionQuestion(message)).toBe(question);
  });

  it.each([
    ['stub, 2026', `${question}\n\n--- stemLM ---\nFollow the attached stemLM study guide as an answer-format reference for my question. Infer the subject from the problem. Use its worked steps and diagram instructions.`],
    ['pointer, 2026', `${question}\n\n--- stemLM ---\nNew problem. Follow the attached stemLM study guide, including its diagram instructions.`],
    ['pointer without a file', `${question}\n--- stemLM ---\nNew problem. Re-read and apply the earlier stemLM study guide (attached file or inline fallback) before answering.`],
    ['guide pasted inline', `${question}\n\n--- stemLM instructions (do not remove) ---\nstemLM Study Guide\nOUTPUT: for a STEM solve using this format…`],
    ['first file name', `${question}\nFollow the attached stemlm-protocol.txt exactly. Infer the subject from the problem.`],
    ['follow-up, 2026', `${question}\n\n\n--- stemLM follow-up context (do not remove) ---\nFollow the attached stemLM study guide. Do not treat this as new homework.`],
  ])('is still clean for a message an earlier version wrote: %s', (_name, message) => {
    expect(cleanSessionQuestion(message)).toBe(question);
  });

  it.each([
    ['an image-only question', buildComposerStub('', { hasImageAttachment: true })],
    ['an image-only question, 2026', '(Problem image/PDF is attached — transcribe the full question into the capsule question field.)\n\n--- stemLM ---\nFollow the attached stemLM study guide.'],
    ['an empty follow-up slot', 'Ask your question here:\n\n\n--- stemLM follow-up context (do not remove) ---'],
  ])('is empty, never stemLM\'s own words, for %s', (_name, message) => {
    expect(cleanSessionQuestion(message)).toBe('');
  });
});
