import { describe, expect, it } from 'vitest';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { buildComposerAppendix } from '@/src/protocol/builder';
import { STUDY_GUIDE_FILENAME } from '@/src/lib/study-guide';
import { hostAnswerHtml } from '@/src/ingest/__fixtures__/host-dom';
import { carriesStemlmText, figureFromFence, questionFromUserTurn, readPlainAnswer } from './plain-answer';

const WORKED_ANSWER = [
  '<p>We find the acceleration from the net force on the block.</p>',
  '<h3>Step 1: Resolve the weight</h3>',
  '<p>The component of gravity along the incline is $mg\\sin\\theta = (5.0)(9.8)\\sin 30^\\circ = 24.5\\ \\text{N}$.</p>',
  '<h3>Step 2: Subtract friction</h3>',
  '<p>Kinetic friction is $\\mu_k mg\\cos\\theta = (0.20)(5.0)(9.8)\\cos 30^\\circ = 8.5\\ \\text{N}$, directed up the incline.</p>',
  '<h3>Step 3: Apply Newton\'s second law</h3>',
  '<p>The net force is $24.5 - 8.5 = 16.0\\ \\text{N}$, so $a = F/m = 16.0/5.0 = 3.2\\ \\text{m/s}^2$.</p>',
  '<p><strong>Final answer:</strong> the block accelerates at $3.2\\ \\text{m/s}^2$ down the incline.</p>',
].join('');

function message(html: string, wrap: (inner: string) => string = (inner) => `<div class="msg">${inner}</div>`): Element {
  const host = document.createElement('div');
  host.innerHTML = wrap(html);
  return host.firstElementChild!;
}

describe('carriesStemlmText', () => {
  it.each([
    ['a whole capsule', FENCED_ELECTRICAL],
    ['a capsule that lost its opening', 'title: Find the current\n@body\n$I = V/R$\n@endbody\n@endstep\n@end'],
    ['the composer stub echoed back', `Here is what you sent:\n${buildComposerAppendix()}`],
    ['the inline guide heading', 'stemLM instructions (do not remove)\nOUTPUT: one fenced block'],
    ['the follow-up context header', '--- stemLM follow-up context (do not remove) ---\nStep 2'],
  ])('recognises %s', (_label, text) => {
    expect(carriesStemlmText(text)).toBe(true);
  });

  it.each([
    ['an ordinary worked answer', 'Step 1: resolve the weight. Step 2: subtract friction. The end result is 3.2 m/s^2.'],
    ['an answer that names the guide it could not open', `I could not open ${STUDY_GUIDE_FILENAME}, but here is the solution. First, resolve the weight.`],
    ['Python decorators that look like capsule tokens', '@patch("module.fetch")\n@step("the user logs in")\ndef test_login(fetch):\n    pass'],
    ['an address in running text', 'Write to me at tutor@endpoint.example if the end result differs.'],
  ])('leaves %s alone', (_label, text) => {
    expect(carriesStemlmText(text)).toBe(false);
  });
});

describe('figureFromFence', () => {
  it.each([
    ['mmd', 'mermaid'],
    ['graphviz', 'dot'],
    ['gv', 'dot'],
    ['Graphviz', 'dot'],
    ['stemlm-graph', 'graph'],
    ['stemlm:plot', 'plot'],
    ['stemlm.timing', 'timing'],
    ['STEMLM-Circuit', 'circuit'],
  ])('reads a %s fence as %s', (fence, type) => {
    expect(figureFromFence({ type: fence, content: 'x' })).toEqual({ type, content: 'x' });
  });

  it.each(['mermaid', 'dot', 'stemlm', 'graph'])('passes a %s fence through as written', (fence) => {
    const diagram = { type: fence, content: 'x', caption: 'c' };
    expect(figureFromFence(diagram)).toBe(diagram);
  });
});

describe('readPlainAnswer', () => {
  it('structures a worked answer and keeps its Markdown as the raw text', () => {
    const answer = readPlainAnswer(message(WORKED_ANSWER), 'Find the acceleration of the block.');
    expect(answer).not.toBeNull();
    expect(answer!.capsule.steps.map((s) => s.title)).toEqual([
      'Resolve the weight', 'Subtract friction', "Apply Newton's second law",
    ]);
    expect(answer!.capsule.solution).toContain('3.2');
    expect(answer!.capsule.meta.question).toBe('Find the acceleration of the block.');
    expect(answer!.markdown).toContain('### Step 1: Resolve the weight');
    expect(answer!.markdown).not.toContain('@meta');
  });

  it('claims nothing the answer did not say: no check, no assumptions, no quick checks, no takeaways', () => {
    const { capsule } = readPlainAnswer(message(WORKED_ANSWER), '')!;
    expect(capsule.verification).toBeUndefined();
    expect(capsule.uncertainty).toBeUndefined();
    for (const step of capsule.steps) {
      expect(step.quickCheck).toBeUndefined();
      expect(step.takeaway).toBeUndefined();
      expect(step.followup).toBeUndefined();
    }
  });

  it('reads an answer in a host\'s own markup, typeset math included', () => {
    for (const host of ['chatgpt', 'claude', 'gemini', 'grok'] as const) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = hostAnswerHtml(host);
      const answer = readPlainAnswer(wrapper.firstElementChild!, 'Solve x^2 - 5x + 6 = 0.');
      expect(answer, host).not.toBeNull();
      expect(answer!.markdown, host).toContain('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
      expect(answer!.markdown, host).not.toMatch(/Copy|Thought for|Show thinking|Worked for/);
    }
  });

  it.each([
    ['a capsule', `<pre><code class="language-stemlm">${FENCED_ELECTRICAL.replace(/</g, '&lt;')}</code></pre>`],
    ['the guide echoed back', `<p>${'I will follow these rules. '.repeat(12)}</p><p>--- stemLM ---</p><p>Follow the attached stemLM study guide.</p>`],
    ['a short reply', '<p>Sure, which part should I explain?</p>'],
    ['a refusal', `<p>I'm sorry, but I can't help with that request. ${'It would not be appropriate. '.repeat(6)}</p>`],
    ['an empty message', ''],
  ])('refuses %s', (_label, html) => {
    expect(readPlainAnswer(message(html), 'Question')).toBeNull();
  });

  it('refuses the model\'s reasoning, however worked it looks', () => {
    const thoughts = message(WORKED_ANSWER, (inner) =>
      `<model-response><model-thoughts><div class="thoughts-content"><message-content>${inner}</message-content></div></model-thoughts></model-response>`);
    expect(readPlainAnswer(thoughts.querySelector('message-content')!, '')).toBeNull();
    expect(readPlainAnswer(message(WORKED_ANSWER, (inner) => `<message-content>${inner}</message-content>`), '')).not.toBeNull();
  });

  it('renames a step\'s figure fence to a type the figure compiler resolves', () => {
    const html = [
      '<p>Binary search halves the range that can still hold the target on every comparison it makes.</p>',
      '<h3>Step 1: Keep two bounds</h3>',
      '<p>Start with low at the first index and high at the last; the target is always between them.</p>',
      '<h3>Step 2: Compare the middle element</h3>',
      '<p>Look at the element halfway between the bounds and decide which half to keep.</p>',
      '<pre><code class="language-mmd">flowchart TD\n  A[Pick mid] --&gt; B{Compare}\n  B --&gt;|smaller| C[Left half]\n  B --&gt;|larger| D[Right half]</code></pre>',
      '<h3>Step 3: Repeat</h3>',
      '<p>Each comparison discards half of what is left, so about log2(n) comparisons are enough.</p>',
    ].join('');
    const { capsule } = readPlainAnswer(message(html), 'How does binary search work?')!;
    const figure = capsule.steps.find((s) => s.diagram)?.diagram;
    expect(figure?.type).toBe('mermaid');
    expect(figure?.content).toContain('flowchart TD');
  });

  it('reads a hostile message without throwing, and never returns its markup', () => {
    const deep = `${'<span>'.repeat(400)}x${'</span>'.repeat(400)}`;
    const html = `${WORKED_ANSWER}<p>${deep}</p><p><img src=x onerror="alert(1)"><script>alert(2)</script>&lt;script&gt;alert(3)&lt;/script&gt;</p>`;
    const answer = readPlainAnswer(message(html), '\u0000'.repeat(10));
    const text = `${answer?.markdown}\n${answer?.capsule.steps.map((s) => s.body).join('\n')}\n${answer?.capsule.solution}`;
    // Elements never come through: the image and the script are gone, content and all.
    expect(text).not.toMatch(/onerror|alert\(1\)|alert\(2\)/);
    // Text the model wrote that looks like a tag stays text: escaped, so Markdown cannot read it as HTML.
    expect(text).toContain('\\<script>alert(3)');
    expect(text).not.toMatch(/(?<!\\)<script/i);
  });
});

describe('questionFromUserTurn', () => {
  it('drops stemLM\'s stub from a sent turn', () => {
    const sent = `Find the acceleration of the block.\n\n${buildComposerAppendix({ hasQuestion: true })}`;
    expect(questionFromUserTurn(sent)).toBe('Find the acceleration of the block.');
  });

  it('keeps the question when the host lists the attached guide above it', () => {
    const sent = `${STUDY_GUIDE_FILENAME}\nDocument\nFind the acceleration of the block.\n--- stemLM ---\nFollow the attached stemLM study guide.`;
    expect(questionFromUserTurn(sent)).toBe('Find the acceleration of the block.');
    expect(questionFromUserTurn('stemlm-protocol.txt\n12 KB\n\nWhat is the pH?')).toBe('What is the pH?');
  });

  it('does not treat an ordinary first line as a file label', () => {
    expect(questionFromUserTurn('Document\nthe steps of mitosis.')).toBe('Document\nthe steps of mitosis.');
  });

  it('is empty when the turn held nothing but the stub', () => {
    expect(questionFromUserTurn(buildComposerAppendix())).toBe('');
    expect(questionFromUserTurn('')).toBe('');
  });
});
