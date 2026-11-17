import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from '@/src/components/MathMarkdown';
import { PROTOCOL_VERSION } from '@/src/protocol/protocol';
import type { Capsule } from '@/src/protocol/types';
import { MAX_ANSWER_CHARS, structureAnswer, type StructuredAnswer } from './structure';
import { ANSWERS, MANY_STEPS, type AnswerFixture } from './__fixtures__/answers';
import { cpuMs } from '../lib/cpu-time';

function structured(markdown: string, question?: string): StructuredAnswer {
  const result = structureAnswer(markdown, { question });
  if (!result) throw new Error('expected a structure');
  return result;
}

const WORKED = ANSWERS.filter((a): a is AnswerFixture & { expect: NonNullable<AnswerFixture['expect']> } => a.expect !== null);

/** Words that label structure and are consumed by it: "Step 2", "Final Answer", "第一步". */
const LABEL_WORDS = new Set([
  'step', 'paso', 'étape', 'schritt', 'part', 'final', 'answer', 'respuesta', 'réponse', 'finale', 'antwort',
  'conclusion', 'summary', 'चरण', 'अंतिम', 'उत्तर', '第一步', '第二步', '第三步',
]);

function tokens(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

function letters(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Everything the capsule shows. A title read off the step's opening sentence and a formula the
 * prose runs into repeat the body by design, so they count once.
 */
function shownText(capsule: Capsule, source: string): string {
  const parts: string[] = [];
  for (const step of capsule.steps) {
    const title = letters(step.title.replace(/…$/, ''));
    parts.push(step.body);
    if (!step.body.split('\n\n').some((block) => letters(block).startsWith(title))) parts.push(step.title);
    if (step.formula && !letters(step.body).includes(letters(step.formula))) parts.push(step.formula);
    if (step.diagram) parts.push(step.diagram.type, step.diagram.content);
  }
  parts.push(capsule.solution);
  // The topic is the answer's own title heading, or else comes from the question.
  if (letters(source).includes(letters(capsule.meta.topic))) parts.push(capsule.meta.topic);
  return parts.join('\n');
}

describe('structureAnswer: corpus of plain answers', () => {
  it('holds at least 40 answers', () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(40);
  });

  it.each(ANSWERS.filter((a) => a.expect === null).map((a) => [a.name, a] as const))('%s is not worth structuring', (_name, answer) => {
    expect(structureAnswer(answer.markdown, { question: answer.question })).toBeNull();
  });

  it.each(WORKED.map((a) => [a.name, a] as const))('%s: strategy, step count, subject and solution', (_name, answer) => {
    const { capsule, strategy, confidence } = structured(answer.markdown, answer.question);
    expect(strategy).toBe(answer.expect.strategy);
    expect(capsule.steps).toHaveLength(answer.expect.steps);
    if (answer.expect.subject) expect(capsule.meta.subject).toBe(answer.expect.subject);
    if (answer.expect.solution === '') expect(capsule.solution).toBe('');
    else if (answer.expect.solution) expect(capsule.solution).toContain(answer.expect.solution);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it.each(WORKED.map((a) => [a.name, a] as const))('%s: well-formed steps and no invented claims', (_name, answer) => {
    const { capsule } = structured(answer.markdown, answer.question);
    capsule.steps.forEach((step, i) => {
      expect(step.id).toBe(`s${i + 1}`);
      expect(step.index).toBe(i + 1);
      expect(step.title.trim()).not.toBe('');
      expect(step.title.length).toBeLessThanOrEqual(92);
      expect(step.title).not.toMatch(/^(?:#|\*\*|step\s*\d|\d+[.)]\s)/i);
      expect(step.title).not.toMatch(/[:：]$/);
      expect(step.body.trim()).not.toBe('');
      expect(step.takeaway).toBeUndefined();
      expect(step.quickCheck).toBeUndefined();
    });
    expect(capsule.verification).toBeUndefined();
    expect(capsule.uncertainty).toBeUndefined();
    expect(capsule.solutionDiagrams).toEqual([]);
    expect(capsule.meta.version).toBe(PROTOCOL_VERSION);
    expect(capsule.meta.topic.trim()).not.toBe('');
    expect(capsule.meta.question).toBe(answer.question);
  });

  it.each(WORKED.map((a) => [a.name, a] as const))('%s: every source word lands in exactly one place', (_name, answer) => {
    const { capsule } = structured(answer.markdown, answer.question);
    let source = answer.markdown;
    for (const line of answer.dropped ?? []) source = source.replace(line, '');
    const want = tokens(source);
    const got = tokens(shownText(capsule, source));
    const lost: string[] = [];
    const doubled: string[] = [];
    for (const [token, count] of want) {
      const shown = got.get(token) ?? 0;
      if (LABEL_WORDS.has(token)) continue;
      if (shown < count) lost.push(token);
      if (shown > count) doubled.push(token);
    }
    expect({ lost, doubled }).toEqual({ lost: [], doubled: [] });
  });

  it('keeps the step titles and strategies it found', () => {
    const outline = Object.fromEntries(
      ANSWERS.map((answer) => {
        const result = structureAnswer(answer.markdown, { question: answer.question });
        return [answer.name, result ? { strategy: result.strategy, topic: result.capsule.meta.topic, titles: result.capsule.steps.map((s) => s.title) } : null];
      }),
    );
    expect(outline).toMatchSnapshot();
  });

  // Renders the whole corpus through KaTeX: seconds when the suite runs in parallel, not the default 5.
  it('renders every title, body, formula and solution through MathMarkdown without a KaTeX error', { timeout: 60_000 }, () => {
    const html = (content: string, props: { inline?: boolean; mathMode?: 'display' } = {}) =>
      renderToStaticMarkup(createElement(MathMarkdown, { content, ...props }));
    for (const answer of WORKED) {
      const { capsule } = structured(answer.markdown, answer.question);
      const bodies = capsule.steps.map((s) => html(s.body));
      const rendered = [
        html(capsule.steps.map((s) => s.title).join(' / '), { inline: true }),
        ...bodies,
        ...capsule.steps.flatMap((s) => (s.formula ? [html(s.formula, { mathMode: 'display' })] : [])),
        capsule.solution ? html(capsule.solution) : '',
      ].join('\n');
      expect(rendered, answer.name).not.toContain('katex-error');
      // The render path must keep the body's blocks: every display equation, code block and table.
      for (const [i, step] of capsule.steps.entries()) {
        const body = bodies[i]!;
        const count = (re: RegExp, text: string) => text.match(re)?.length ?? 0;
        const where = `${answer.name} ${step.id}`;
        expect(count(/class="katex-display"/g, body), where).toBeGreaterThanOrEqual(count(/^\$\$$/gm, step.body) / 2 + count(/^\$\$.+\$\$$/gm, step.body));
        expect(count(/<pre>/g, body), where).toBe(count(/^```/gm, step.body) / 2);
        expect(count(/<table>/g, body), where).toBe(count(/^\|? ?:?-{3,}:? ?\|/gm, step.body));
        expect(count(/<li>/g, body), where).toBe(count(/^\s*(?:[-*]|\d+\.)\s/gm, step.body.replace(/```[\s\S]*?```/g, '')));
      }
    }
  });
});

describe('structureAnswer: strategy by evidence', () => {
  const para = (n: number) => `This paragraph is long enough to count as real content for step ${n} of the worked answer.`;

  it('prefers explicit step markers over headings and lists', () => {
    const md = `## Overview\n\n${para(0)}\n\n**Step 1: First**\n\n1. ${para(1)}\n2. ${para(2)}\n\n**Step 2: Second**\n\n${para(3)}\n\n## Notes\n\n${para(4)}`;
    expect(structured(md).strategy).toBe('step-markers');
  });

  it('uses headings at one level, ignores a lone title and treats a closing section as the solution', () => {
    const md = `# Titration of acetic acid\n\n## Setup\n\n${para(1)}\n\n### Detail\n\n${para(2)}\n\n## Calculation\n\n${para(3)}\n\n## Conclusion\n\nThe concentration is 0.1 M.`;
    const { capsule, strategy } = structured(md);
    expect(strategy).toBe('headings');
    expect(capsule.meta.topic).toBe('Titration of acetic acid');
    expect(capsule.steps.map((s) => s.title)).toEqual(['Setup', 'Calculation']);
    expect(capsule.steps[0]!.body).toContain('### Detail');
    expect(capsule.solution).toBe('The concentration is 0.1 M.');
  });

  it('falls through when a strategy would leave fewer than two steps', () => {
    const md = `## Solution\n\n1. ${para(1)}\n2. ${para(2)}\n3. ${para(3)}\n\n## Final Answer\n\n42`;
    const { capsule, strategy } = structured(md);
    expect(strategy).toBe('ordered-list');
    expect(capsule.steps).toHaveLength(3);
    expect(capsule.solution).toBe('42');
  });

  it('does not treat a short list of givens as the skeleton of the answer', () => {
    const md = `${para(1)} ${para(2)}\n\n1. m = 2 kg\n2. a = 3 m/s²\n\n${para(3)} ${para(4)}\n\n${para(5)} ${para(6)}`;
    expect(structured(md).strategy).toBe('paragraphs');
  });

  it('keeps emphasis at a paragraph start from becoming a step', () => {
    const md = `**Energy** is conserved here, so ${para(1)}\n\n**Momentum** is conserved too, and ${para(2)}\n\n${para(3)} ${para(4)}`;
    expect(structured(md).strategy).toBe('paragraphs');
  });

  it('returns one step for a substantial answer with no structure, and null for a slight one', () => {
    const single = structured(`${para(1)} ${para(2)} ${para(3)} ${para(4)} ${para(5)} ${para(6)}`);
    expect(single.capsule.steps).toHaveLength(1);
    expect(single.confidence).toBeLessThan(0.3);
    expect(structureAnswer(`${para(1)} ${para(2)}`)).toBeNull();
  });

  it.each([
    ['Step 1: Alpha', 'Step 2: Beta'],
    ['Step One — Alpha', 'Step Two — Beta'],
    ['STEP I. Alpha', 'STEP II. Beta'],
    ['Paso 1: Alpha', 'Paso 2: Beta'],
    ['Étape 1 : Alpha', 'Étape 2 : Beta'],
    ['Schritt 1: Alpha', 'Schritt 2: Beta'],
    ['Passo 1 - Alpha', 'Passo 2 - Beta'],
    ['Шаг 1. Alpha', 'Шаг 2. Beta'],
    ['चरण 1: Alpha', 'चरण 2: Beta'],
    ['الخطوة 1: Alpha', 'الخطوة 2: Beta'],
    ['ステップ1：Alpha', 'ステップ2：Beta'],
    ['步骤一：Alpha', '步骤二：Beta'],
    ['第一步：Alpha', '第二步：Beta'],
    ['1단계: Alpha', '2단계: Beta'],
    ['Stage 1: Alpha', 'Stage 2: Beta'],
    ['Phase 1 - Alpha', 'Phase 2 - Beta'],
    ['1) Alpha', '2) Beta'],
    ['1. Alpha', '2. Beta'],
  ])('reads "%s" as a step marker in a heading and in a bold lead', (first, second) => {
    for (const wrap of [(t: string) => `### ${t}`, (t: string) => `**${t}**`]) {
      const { capsule, strategy } = structured(`${wrap(first)}\n\n${para(1)}\n\n${wrap(second)}\n\n${para(2)}`);
      expect(strategy).toBe('step-markers');
      expect(capsule.steps.map((s) => s.title)).toEqual(['Alpha', 'Beta']);
    }
  });

  it.each([
    ['Part (a): Alpha', 'Part (b): Beta'],
    ['Part A — Alpha', 'Part B — Beta'],
    ['(a) Alpha', '(b) Beta'],
    ['(i) Alpha', '(ii) Beta'],
    ['a) Alpha', 'b) Beta'],
  ])('keeps the part letter of "%s" in the title', (first, second) => {
    const { capsule, strategy } = structured(`${first}\n\n${para(1)}\n\n${second}\n\n${para(2)}`);
    expect(strategy).toBe('step-markers');
    expect(capsule.steps.map((s) => s.title)).toEqual([`(${first.match(/[a-zA-Z]+(?=\)|:| —)/)![0].toLowerCase()}) Alpha`, `(${second.match(/[a-zA-Z]+(?=\)|:| —)/)![0].toLowerCase()}) Beta`]);
  });

  it('does not read a sentence that starts with "Step 1" as a marker', () => {
    const md = `Step 1 is usually the hardest part of this kind of problem, because ${para(1)} ${para(2)}\n\nStep 2 follows quickly once that is done, since ${para(3)} ${para(4)}`;
    const { capsule, strategy } = structured(md);
    expect(strategy).toBe('paragraphs');
    expect(capsule.steps[0]!.body).toContain('Step 1 is usually');
  });
});

describe('structureAnswer: titles', () => {
  const body = 'We carry out this move in full and write down everything that changes along the way.';

  it.each([
    ['### 🔹 Step 3 — **Solve for $x$:**', 'Solve for $x$'],
    ['### **Step 3: Solve.**', 'Solve'],
    ['### Step 3', 'We carry out this move in full and write down everything that changes along the way'],
    ['### Step 3: Use `numpy.dot` (fast)', 'Use `numpy.dot` (fast)'],
    ['### Step 3: Apply $F = ma$', 'Apply $F = ma$'],
  ])('cleans "%s"', (heading, title) => {
    const { capsule } = structured(`### Step 1: Start\n\n${body}\n\n### Step 2: Continue\n\n${body}\n\n${heading}\n\n${body}`);
    expect(capsule.steps[2]!.title).toBe(title);
  });

  it('caps a long title at a clause boundary without cutting through math', () => {
    const long = `### Step 1: First we rewrite the whole expression, using the identity $\\sin^2\\theta + \\cos^2\\theta = 1$ wherever the squared terms appear together in it\n\n${body}\n\n### Step 2: Next\n\n${body}`;
    const title = structured(long).capsule.steps[0]!.title;
    expect(title).toBe('First we rewrite the whole expression…');
    expect((title.match(/\$/g) ?? []).length % 2).toBe(0);
  });

  it('lifts a list item’s bold lead or first sentence out of the body', () => {
    const md = `1. **Differentiate.** Take $d/dx$ of both sides of the equation given in the problem statement.\n2. Rearrange the terms: move everything containing $y'$ to the left-hand side of the equation.\n3. Solve for the unknown derivative by dividing through by its coefficient.`;
    const { capsule } = structured(md);
    expect(capsule.steps.map((s) => s.title)).toEqual(['Differentiate', 'Rearrange the terms', 'Solve for the unknown derivative by dividing through by its coefficient']);
    expect(capsule.steps[0]!.body).toBe('Take $d/dx$ of both sides of the equation given in the problem statement.');
    expect(capsule.steps[1]!.body).toBe("move everything containing $y'$ to the left-hand side of the equation.");
    // One sentence is both the title and the whole step: the body is never left empty.
    expect(capsule.steps[2]!.body).toBe('Solve for the unknown derivative by dividing through by its coefficient.');
  });

  it('does not split a title at a decimal, an abbreviation or inside math', () => {
    const md = `1. Use approx. 3.14 for $\\pi$, i.e. the usual value: it is accurate enough for this estimate.\n2. Multiply by the radius squared, $r^2 = 2.5^2$. This gives the area of the circle in square metres.`;
    const { capsule } = structured(md);
    expect(capsule.steps[0]!.title).toBe('Use approx. 3.14 for $\\pi$, i.e. the usual value');
    expect(capsule.steps[1]!.title).toBe('Multiply by the radius squared, $r^2 = 2.5^2$');
  });
});

describe('structureAnswer: formula, figures, preamble, solution', () => {
  const intro = 'We start from the definition and substitute the values that the problem gives us.';

  it('mirrors a formula the prose runs into, and lifts one that stands alone', () => {
    const md = [
      '### Step 1: Flowing',
      `${intro} This gives:`,
      '$$\nx = 1\n$$',
      '### Step 2: Standing alone',
      `${intro}`,
      '$$\ny = 2\n$$',
      'Now the value is known.',
      '### Step 3: Only an equation',
      '$$\nz = 3\n$$',
    ].join('\n\n');
    const [flowing, alone, bare] = structured(md).capsule.steps;
    expect(flowing!.formula).toBe('x = 1');
    expect(flowing!.body).toContain('$$\nx = 1\n$$');
    expect(alone!.formula).toBe('y = 2');
    expect(alone!.body).toBe(`${intro}\n\nNow the value is known.`);
    expect(bare!.formula).toBeUndefined();
    expect(bare!.body).toBe('$$\nz = 3\n$$');
  });

  it('prefers the boxed equation, else the last one that states a relation', () => {
    const md = `### Step 1: A\n\n${intro}\n\n$$\na = 1\n$$\n\n$$\n\\boxed{b = 2}\n$$\n\n$$\nc = 3\n$$\n\nDone here.\n\n### Step 2: B\n\n${intro}\n\n$$\nd = 4\n$$\n\n$$\n\\frac{1}{2}\n$$\n\nDone there.`;
    const steps = structured(md).capsule.steps;
    expect(steps[0]!.formula).toBe('\\boxed{b = 2}');
    expect(steps[1]!.formula).toBe('d = 4');
  });

  it.each(['mermaid', 'dot', 'graphviz', 'stemlm', 'Mermaid'])('attaches a %s fence as the raw step diagram and removes it from the body', (lang) => {
    const md = `### Step 1: Draw\n\n${intro}\n\n\`\`\`${lang}\ngraph TD\n  A --> B\n\`\`\`\n\n### Step 2: Read\n\n${intro}`;
    const step = structured(md).capsule.steps[0]!;
    expect(step.diagram).toEqual({ type: lang.toLowerCase(), content: 'graph TD\n  A --> B' });
    expect(step.body).toBe(intro);
  });

  it('keeps one diagram per step, ordinary code and capsule fences in the body', () => {
    const md = `### Step 1: Draw\n\n${intro}\n\n\`\`\`dot\ndigraph { a -> b }\n\`\`\`\n\n\`\`\`dot\ndigraph { c -> d }\n\`\`\`\n\n\`\`\`python\nprint(1)\n\`\`\`\n\n### Step 2: Capsule\n\n${intro}\n\n\`\`\`stemlm\n@meta\nsubject: Math\n@endmeta\n\`\`\``;
    const [draw, capsule] = structured(md).capsule.steps;
    expect(draw!.diagram).toEqual({ type: 'dot', content: 'digraph { a -> b }' });
    expect(draw!.body).toContain('digraph { c -> d }');
    expect(draw!.body).toContain('```python\nprint(1)\n```');
    expect(capsule!.diagram).toBeUndefined();
    expect(capsule!.body).toContain('@meta');
  });

  it('folds a short preamble into the first step without letting it name the step', () => {
    const md = `Sure, here is the working.\n\n1. Expand the brackets on the left-hand side: this removes the product of the two binomials.\n2. Collect like terms on one side: the equation becomes a standard quadratic in the unknown.`;
    const first = structured(md).capsule.steps[0]!;
    expect(first.title).toBe('Expand the brackets on the left-hand side');
    expect(first.body).toBe('Sure, here is the working.\n\nthis removes the product of the two binomials.');
  });

  it('gives a long preamble its own first step', () => {
    const preamble = Array.from({ length: 5 }, () => intro).join(' ');
    const { capsule } = structured(`${preamble}\n\n### Step 1: A\n\n${intro}\n\n### Step 2: B\n\n${intro}`);
    expect(capsule.steps.map((s) => s.title)).toEqual(['We start from the definition and substitute the values that the problem gives us', 'A', 'B']);
    expect(capsule.steps[0]!.body).toBe(preamble);
  });

  it.each([
    ['**Answer:** $x = 4$', '$x = 4$'],
    ['Final answer: $x = 4$', '$x = 4$'],
    ['**Final Answer**\n\n$$\nx = 4\n$$', '$$\nx = 4\n$$'],
    ['#### ✅ Final Result\n\n$x = 4$ exactly.', '$x = 4$ exactly.'],
    ['Therefore, $x = 4$.', 'Therefore, $x = 4$.'],
    ['So $x = 4$.', 'So $x = 4$.'],
    ['∴ $x = 4$', '∴ $x = 4$'],
    ['The result is:\n\n$$\n\\boxed{x = 4}\n$$', 'The result is:\n\n$$\n\\boxed{x = 4}\n$$'],
    ['**Respuesta final:** $x = 4$', '$x = 4$'],
    ['**答案：** $x = 4$', '$x = 4$'],
    ['因此 $x = 4$。', '因此 $x = 4$。'],
  ])('lifts the closing result "%s" into the solution', (closing, solution) => {
    const { capsule } = structured(`### Step 1: A\n\n${intro}\n\n### Step 2: B\n\n${intro}\n\n${closing}`);
    expect(capsule.solution).toBe(solution);
    expect(capsule.steps).toHaveLength(2);
    expect(capsule.steps[1]!.body).toBe(intro);
  });

  it('keeps a body the render path cannot regroup: no line may start with "="', () => {
    const md = `### Step 1: Chain\n\n${intro}\n\n$$\nx = 1 + 2 \\\\\n= 3\n$$\n\nThe sum, written out:\n\n= 3 exactly.\n\nNext thought.\n\n### Step 2: End\n\n${intro}`;
    const step = structured(md).capsule.steps[0]!;
    expect(step.body).not.toMatch(/^\s*=/m);
    expect(step.formula).toBe('x = 1 + 2 \\\\ = 3');
    const html = renderToStaticMarkup(createElement(MathMarkdown, { content: step.body }));
    expect(html.match(/<p>/g)).toHaveLength(4);
    expect(html).toContain('= 3 exactly.');
  });

  it('leaves the solution empty rather than inventing one', () => {
    const { capsule } = structured(`### Step 1: A\n\n${intro}\n\n### Step 2: B\n\n${intro} So far so good, but nothing is concluded.`);
    expect(capsule.solution).toBe('');
  });

  it('drops a closing offer and horizontal rules, and nothing else', () => {
    const { capsule } = structured(`### Step 1: A\n\n${intro}\n\n---\n\n### Step 2: B\n\n${intro}\n\n***\n\nLet me know if you want a harder example!`);
    expect(capsule.steps[1]!.body).toBe(intro);
    expect(JSON.stringify(capsule)).not.toContain('Let me know');
  });

  it('caps the number of steps and keeps the merged titles as captions', () => {
    const { capsule, strategy } = structured(MANY_STEPS);
    expect(strategy).toBe('step-markers');
    expect(capsule.steps).toHaveLength(20);
    const all = capsule.steps.map((s) => `${s.title}\n${s.body}`).join('\n');
    for (let n = 1; n <= 25; n++) expect(all).toContain(`Move ${n}`);
  });
});

describe('structureAnswer: meta', () => {
  const steps = '### Step 1: A\n\nWe start from the definition and substitute the values that the problem gives us.\n\n### Step 2: B\n\nWe simplify the result as far as it goes and state it together with its unit.';

  it('takes the topic from the title heading, else a compact question, else the first step', () => {
    expect(structured(`# Free fall from a tower\n\n${steps}`, 'How long does it take to fall?').capsule.meta.topic).toBe('Free fall from a tower');
    expect(structured(steps, 'A stone is dropped from a 45 m tower. How long does it take to reach the ground below?').capsule.meta.topic).toBe('A stone is dropped from a 45 m…');
    expect(structured(steps).capsule.meta.topic).toBe('A');
  });

  it('does not use a generic heading as the topic', () => {
    expect(structured(`## Solution\n\n${steps}`, 'Find x').capsule.meta.topic).toBe('Find x');
  });

  it('never leaves a dangling math delimiter in a compact topic', () => {
    const topic = structured(steps, 'Compute the integral of the function $x^2 e^{-x} \\sin x$ from zero to infinity').capsule.meta.topic;
    expect((topic.match(/\$/g) ?? []).length % 2).toBe(0);
  });

  it('carries the question only when one was given', () => {
    expect(structured(steps, '  Find x  ').capsule.meta.question).toBe('Find x');
    expect('question' in structured(steps).capsule.meta).toBe(false);
  });

  it('reads the unit km as a unit, not as the Michaelis constant', () => {
    expect(structured(steps, 'Convert 72 km/h to m/s').capsule.meta.subject).not.toBe('Biology');
  });
});

describe('structureAnswer: robustness', () => {
  it('returns null for empty and non-string input', () => {
    expect(structureAnswer('')).toBeNull();
    expect(structureAnswer('   \n\n  ')).toBeNull();
    expect(structureAnswer(undefined as unknown as string)).toBeNull();
    expect(structureAnswer(42 as unknown as string)).toBeNull();
    expect(structureAnswer('ok', { question: 7 as unknown as string })).toBeNull();
  });

  it('is deterministic', () => {
    for (const answer of WORKED.slice(0, 12)) {
      expect(structureAnswer(answer.markdown, { question: answer.question })).toEqual(structureAnswer(answer.markdown, { question: answer.question }));
    }
  });

  it('is stable on its own output', () => {
    for (const answer of WORKED) {
      const first = structured(answer.markdown, answer.question).capsule;
      if (first.steps.length < 2) continue;
      const rebuilt = [
        // Level 1, so headings the bodies kept stay inside their step.
        ...first.steps.map((s, i) => `# Step ${i + 1}: ${s.title}\n\n${s.body}`),
        ...(first.solution ? [`# Final answer\n\n${first.solution}`] : []),
      ].join('\n\n');
      const second = structured(rebuilt, answer.question);
      expect(second.strategy, answer.name).toBe('step-markers');
      expect(second.capsule.steps.map((s) => s.title), answer.name).toEqual(first.steps.map((s) => s.title));
      expect(second.capsule.solution, answer.name).toBe(first.solution);
    }
  });

  it('never throws on malformed Markdown', () => {
    const hostile = [
      '$$\nunclosed display math\n\n' + 'text '.repeat(200),
      '```python\nunclosed fence\n' + 'x = 1\n'.repeat(100),
      '\\[ x = 1 ' + 'more '.repeat(100),
      '#'.repeat(5000),
      '1. '.repeat(3000),
      '**'.repeat(4000) + ' text',
      '> '.repeat(4000) + 'quote',
      '- a\n'.repeat(50).replace(/- a\n/g, (m, i: number) => ' '.repeat(i % 40) + m),
      '| a | b |\n|---|---|\n' + '| 1 | 2 |\n'.repeat(500),
      '### Step 1\n\n### Step 2\n\n### Step 3\n\n' + 'x'.repeat(400),
      '\u0000\uFFFF\uD800 Step 1: \u202E reversed ' + 'y'.repeat(400),
      '<script>alert(1)</script>\n\n**Step 1:** <img src=x onerror=alert(1)>\n\n**Step 2:** ' + 'z'.repeat(300),
    ];
    for (const input of hostile) expect(() => structureAnswer(input)).not.toThrow();
  });

  it('passes untrusted markup through as text, never as structure it executes', () => {
    const result = structured(`**Step 1:** <img src=x onerror=alert(1)> ${'safe text '.repeat(20)}\n\n**Step 2:** ${'more text '.repeat(20)}`);
    const html = renderToStaticMarkup(createElement(MathMarkdown, { content: result.capsule.steps[0]!.body }));
    expect(html).not.toContain('<img');
  });

  it('is bounded on 256 KB of input and ignores what lies beyond it', () => {
    const section = (n: number) => `### Step ${n}: Section ${n}\n\n${'A sentence of ordinary prose with $x_{1} = 2$ in it. '.repeat(40)}\n\n$$\ny = ${n}\n$$`;
    let big = '';
    for (let n = 1; big.length < MAX_ANSWER_CHARS + 60_000; n++) big += `${section(n)}\n\n`;
    const started = cpuMs();
    const result = structured(big);
    expect(cpuMs() - started).toBeLessThan(1500);
    expect(result.capsule.steps).toHaveLength(20);
    expect(JSON.stringify(result.capsule).length).toBeLessThan(MAX_ANSWER_CHARS * 1.2);

    const pathological = `${'a '.repeat(60_000)}\n\n${'$'.repeat(20_000)}\n\n${'**b** '.repeat(20_000)}`;
    const again = cpuMs();
    expect(() => structureAnswer(pathological)).not.toThrow();
    expect(cpuMs() - again).toBeLessThan(1500);
  });

  it('stays linear on lines built to make a pattern backtrack', () => {
    const filler = 'Ordinary prose that gives the answer enough substance to be structured at all. '.repeat(6);
    const lines = [
      `# ${' '.repeat(100_000)}x`,
      `Step${' '.repeat(100_000)}x`,
      `**Step${' '.repeat(100_000)}1**`,
      `\`\`\`${' '.repeat(100_000)}\``,
      '\\('.repeat(60_000),
      '['.repeat(100_000),
      `| a |\n${'-'.repeat(50_000)}${' '.repeat(50_000)}x |`,
      'e.g. '.repeat(40_000),
      `**${')'.repeat(100_000)}`,
      `Answer${' '.repeat(100_000)}x`,
      `${'x '.repeat(50_000)}\n${' '.repeat(100_000)}\n${'y '.repeat(50_000)}`,
    ];
    const started = cpuMs();
    for (const line of lines) {
      expect(() => structureAnswer(`${filler}\n\n${line}\n\n${filler}`, { question: line })).not.toThrow();
      expect(() => structureAnswer(`### Step 1: A\n\n${line}\n\n### Step 2: ${line}\n\n${filler}`)).not.toThrow();
    }
    expect(cpuMs() - started).toBeLessThan(3000);
  });
});
