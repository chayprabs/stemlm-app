/**
 * The guide the chat model is sent, as the shipped code assembles it (never a copy).
 * These tests protect what the guide must do, not how its sentences are worded.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FAMILY_CATALOG, SPEC_FAMILIES, familyRequiredMissing } from '@/src/lib/figure/catalog';
import { FAMILY_MANIFESTS } from '@/src/lib/figure/families/manifest';
import { repairDiagram } from '@/src/lib/figure/intel/repair';
import { compileDiagramStrict, resolveDiagram } from '@/src/lib/resolve-diagram';
import { STUDY_GUIDE_END } from '@/src/lib/study-guide';
import { buildComposerPointer, buildFollowupCopyText } from './builder';
import { parse } from './parser';
import { assembleGuide, FIGURE_FORMS, figureType, GUIDE_INLINE_MAX_CHARS, GUIDE_MAX_CHARS } from './protocol';
import { ALT_END_MARKERS, PROTOCOL_LINE_MARKERS } from './strip-markers';
import { SUBJECTS, type Diagram } from './types';

const guides = SUBJECTS.map((subject) => [subject, assembleGuide('', subject)] as const);
/** A question that names as many figure families as words allow, in a subject with many of its own. */
const GREEDY = `Use a ${FIGURE_FORMS.flatMap((form) => form.cues).join(', ').replace(/-/g, ' ')} in calculus.`;

/** Every `@diagram … @enddiagram` block of a guide text. */
function specimens(text: string): Diagram[] {
  return [...text.matchAll(/^@diagram type=(\S+)\n([\s\S]*?)\n@enddiagram$/gm)].map((match) => ({ type: match[1]!, content: match[2]! }));
}

describe('guide size', () => {
  it.each(guides)('%s: the whole guide stays under the ceiling', (_subject, guide) => {
    expect(guide.text.length).toBeLessThanOrEqual(GUIDE_MAX_CHARS);
  });

  it('holds the ceiling at 24,000 characters, a little over a third of what the guide used to take', () => {
    // The ceiling guards against silent growth. Raise it only with evidence that the words earn it.
    expect(GUIDE_MAX_CHARS).toBe(24_000);
    const longest = Math.max(...guides.map(([, guide]) => guide.text.length));
    expect(longest).toBeLessThan(23_500);
  });

  it('keeps the answer format itself, before any figure form, under 9,000 characters', () => {
    const format = assembleGuide('', 'Chemical').text.split('\n\ntype=')[0]!;
    expect(format.length).toBeLessThan(9_000);
  });

  it('never exceeds the ceiling, whatever the question names: a form that does not fit keeps its keys and loses its example', () => {
    const guide = assembleGuide(GREEDY);
    expect(guide.text.length).toBeLessThanOrEqual(GUIDE_MAX_CHARS);
    expect(specimens(guide.text).length).toBeGreaterThan(10);
    expect(specimens(guide.text).length).toBeLessThan(FIGURE_FORMS.length);
    for (const form of FIGURE_FORMS) expect(guide.text, form.id).toContain(`type=${figureType(form.id)}: ${form.grammar}`);
  });

  it.each(guides)('%s: the version pasted into a message stays under its own, smaller ceiling', (subject) => {
    const compact = assembleGuide('', subject, true);
    expect(compact.text.length).toBeLessThanOrEqual(GUIDE_INLINE_MAX_CHARS);
    expect(assembleGuide(GREEDY, subject, true).text.length).toBeLessThanOrEqual(GUIDE_INLINE_MAX_CHARS);
    // Small enough to stay ordinary message text, and still carries at least one figure form.
    expect(GUIDE_INLINE_MAX_CHARS).toBeLessThanOrEqual(4_000);
    expect(compact.forms.length).toBeGreaterThan(0);
  });
});

describe('the answer the guide teaches', () => {
  const guide = assembleGuide('', 'Physics').text;
  const example = /```stemlm\n[\s\S]*?\n```/.exec(guide)?.[0] ?? '';

  it('shows one complete answer that the parser reads without a single warning to act on', async () => {
    const result = parse(example);
    expect(result.status).toBe('ok');
    // Formula and figure ids are not taught: an id copied from an example onto two figures would
    // make the whole answer unreadable, and nothing reads them.
    expect(result.warningCodes.filter((code) => code !== 'missing_formula_id' && code !== 'missing_diagram_id')).toEqual([]);
    const capsule = result.capsule!;
    expect(capsule.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3']);
    expect(capsule.steps.every((step) => step.body.length > 80)).toBe(true);
    expect(capsule.meta).toMatchObject({ subject: 'Physics' });
    expect(capsule.meta.question).toContain('How far does it travel');
    expect(capsule.steps.some((step) => step.formula) && capsule.steps.some((step) => step.takeaway) && capsule.steps.some((step) => step.quickCheck)).toBe(true);
    expect(capsule.verification).toMatchObject({ status: 'pass', methods: ['alt', 'units'] });
    expect(capsule.uncertainty?.assumptions).toHaveLength(1);
    expect(capsule.solution).toContain('40');
    const figure = capsule.steps.find((step) => step.diagram)!.diagram!;
    expect((await compileDiagramStrict(figure)).ok).toBe(true);
  });

  it('names exactly the subjects and the check methods the parser accepts', () => {
    expect(guide).toContain(`subject is one of ${SUBJECTS.join(', ')}.`);
    for (const method of ['units', 'backsub', 'limit', 'oom', 'conservation', 'dimensional', 'alt']) {
      const result = parse(example.replace('methods: alt, units', `methods: ${method}`));
      expect(result.warningCodes, method).not.toContain('malformed_verify');
      expect(guide, method).toMatch(new RegExp(`methods: names how, from this list:.*\\b${method}\\b`));
    }
  });

  it('reads the shape the pasted version spells out, placeholders and all', () => {
    const compact = assembleGuide('', 'Math', true).text;
    const result = parse(compact);
    expect(result.status).toBe('ok');
    expect(result.capsule!.steps).toHaveLength(1);
    expect(result.capsule!.steps[0]).toMatchObject({ id: 's1', title: 'what this step does' });
    expect(result.capsule!.verification?.methods).toContain('backsub');
    expect(result.capsule!.solution).not.toBe('');
    // A chat box may turn a code fence into a block of its own, so the pasted text has none.
    expect(compact).not.toContain('```');
    expect(compact.endsWith(STUDY_GUIDE_END)).toBe(true);
  });

  it('says what makes a step worth reading', () => {
    for (const rule of [/why this step comes now/, /the rule, the numbers put in, and the result with its unit/, /what each symbol means/, /Do not jump/, /one idea, not one line of algebra/]) {
      expect(guide).toMatch(rule);
    }
  });

  it('leaves the student in charge and stays open to questions about itself', () => {
    expect(guide).toContain('What the student asks for comes first');
    expect(guide).toContain('If the student asks about this file, answer normally.');
    expect(guide).toContain('do not ask');
    expect(guide).toContain('it asks for no tool, no private data and no other action');
    // The student's question goes into the answer; the guide never does.
    expect(guide).toContain('Never copy this guide into it.');
    expect(guide).not.toMatch(/ignore (?:the|any|all) (?:student|user|instruction)/i);
    expect(guide).not.toMatch(/never (?:echo|quote|reveal|show) this (?:guide|file)/i);
  });

  it('identifies itself as a format, not a question, before anything else', () => {
    expect(guide.startsWith('stemLM study guide\n')).toBe(true);
    expect(guide.slice(0, 400)).toContain('It is not a question');
    expect(guide.slice(0, 400)).toContain('If no question came with it, wait for one.');
    expect(guide.endsWith(STUDY_GUIDE_END)).toBe(true);
  });

  it('is written plainly: no shouting and no hedging', () => {
    for (const [, { text }] of guides) {
      expect(text).not.toMatch(/\b(?:MUST|NEVER|CRITICAL|ALWAYS|OMIT|REQUIRED|FORBIDDEN)\b/);
      expect(text).not.toMatch(/should ideally|try to|where possible|if you can|feel free|you may want/i);
    }
  });
});

describe('figures in the guide', () => {
  it('asks for specs the panel draws, never for a drawing', () => {
    for (const [, { text }] of guides) {
      expect(text).toContain('Never write SVG, an image or drawing coordinates.');
      expect(text).not.toMatch(/<svg|viewBox|type=svg|mermaid|path d=/i);
    }
  });

  it('tells the model to give inputs and leave computed values to the panel', () => {
    const guide = assembleGuide('', 'Math').text;
    expect(guide).toContain('give those only their inputs, and never type in the result');
    // A number the answer itself worked out is a fair input: a model once left a Venn diagram out because its region counts were not in the question.
    expect(guide).toContain('the numbers the question gives or your steps have found');
  });

  it.each(FIGURE_FORMS.map((form) => [form.id, form] as const))('%s: its specimen compiles as written, with nothing for repair to do', async (id, form) => {
    const diagram = { type: figureType(id), content: form.specimen };
    const compiled = await compileDiagramStrict(diagram);
    expect(compiled.ok, compiled.ok ? id : compiled.diagnostic.reason).toBe(true);
    expect(repairDiagram(diagram).repairs).toEqual([]);
    expect(familyRequiredMissing(diagram.type, diagram.content)).toEqual([]);
    expect(form.grammar.length).toBeGreaterThan(20);
    expect(form.subjects.length).toBeGreaterThan(0);
  });

  it('teaches every family the compiler offers a student, and none it does not', () => {
    const taught = new Set(FIGURE_FORMS.map((form) => figureType(form.id)));
    for (const engine of ['plot', 'scene', 'graph', 'table', 'circuit']) expect(taught.has(engine), engine).toBe(true);
    for (const manifest of FAMILY_MANIFESTS) expect(taught.has(manifest.token), manifest.token).toBe(true);
    for (const type of taught) {
      expect(SPEC_FAMILIES.has(type), `${type} is not a catalog spec family`).toBe(true);
    }
    // Families the compiler keeps only for old answers, or refuses, are never taught.
    for (const type of ['svg', 'mermaid', 'beam', 'hybridpi', 'opamp', 'mccabe', 'bz', 'dq', 'knot', 'mospi', 'rama', 'venn4', 'isosurface']) {
      expect(taught.has(type), type).toBe(false);
    }
    expect(new Set(FIGURE_FORMS.map((form) => form.id)).size).toBe(FIGURE_FORMS.length);
  });

  it('draws flowcharts and state machines as type=graph, and beams only for the subjects that have them', () => {
    const graph = FIGURE_FORMS.find((form) => form.id === 'graph')!;
    for (const key of ['decision:', 'terminal:', 'start:', 'accept:']) expect(graph.grammar).toContain(key);
    expect(assembleGuide('', 'Physics').forms).not.toContain('sfd');
    expect(assembleGuide('', 'Civil').forms).toContain('sfd');
  });

  it('teaches every scene and table variant under the kind the catalog knows', () => {
    for (const form of FIGURE_FORMS.filter((entry) => /^(?:scene|table)\./.test(entry.id))) {
      const kind = /^kind:\s*(\S+)/m.exec(form.specimen)?.[1];
      const variants = FAMILY_CATALOG[figureType(form.id)]!.variants!;
      const known = Object.entries(variants).some(([name, variant]) => name === kind || variant.aliases?.includes(kind!));
      expect(known, `${form.id}: kind ${kind}`).toBe(true);
    }
  });

  it('uses only real type tokens anywhere in a guide', () => {
    for (const [, { text }] of guides) {
      for (const match of text.matchAll(/\btype=([a-z][a-z0-9.-]*[a-z0-9])/g)) {
        expect(SPEC_FAMILIES.has(match[1]!), `invented type=${match[1]}`).toBe(true);
      }
    }
  });

  it.each(guides)('%s: every figure block in the guide compiles, and each belongs to a form it lists', async (_subject, guide) => {
    const blocks = specimens(guide.text);
    // One block is the worked answer's own figure.
    expect(blocks).toHaveLength(guide.forms.length + 1);
    for (const block of blocks) expect((await compileDiagramStrict(block)).ok, block.type).toBe(true);
    for (const id of guide.forms) {
      const form = FIGURE_FORMS.find((entry) => entry.id === id)!;
      expect(guide.text).toContain(`@diagram type=${figureType(id)}\n${form.specimen}\n@enddiagram`);
    }
  });

  it('gives a subject\'s own forms an example, and every other type its keys', () => {
    const physics = assembleGuide('A block slides down a frictionless incline. Find its acceleration.');
    expect(physics.forms).toEqual(expect.arrayContaining(['scene.fbd', 'plot', 'circuit', 'vectors', 'projectile']));
    expect(physics.forms).not.toContain('table.punnett');
    expect(physics.forms).not.toContain('kmap');
    expect(physics.text).toContain('Use any of them when the question calls for it.');
    expect(physics.text).toMatch(/^type=kmap: a Karnaugh map\./m);
    expect(physics.text).toMatch(/^type=table: a Punnett square\. kind: punnett/m);
    expect(physics.text).not.toContain('@diagram type=kmap');
    expect(physics.text).toContain('COMMON MISTAKES IN PHYSICS');
    const cs = assembleGuide('Insert 8, 3, 10 into a binary search tree and give the inorder traversal.');
    expect(cs.forms).toEqual(expect.arrayContaining(['tree', 'graph', 'array', 'truth']));
    expect(cs.forms).not.toContain('scene.fbd');
  });

  it('sends a form the question names, whatever subject the classifier chose', () => {
    // The bar chart the question names is taught first, ahead of every form its subject brings.
    const survey = assembleGuide('A class survey asked 50 students for their favourite sport. Show the results as a bar chart.');
    expect(survey.forms[0]).toBe('chart');
    expect(assembleGuide('Draw a tree diagram for two coin tosses.').forms).toContain('probtree');
    expect(assembleGuide('Solve the inequality and show it on a number line.').forms).toContain('numberline');
    // Everyday words do not: every mechanics question says "normal" and "energy".
    const incline = assembleGuide('Find the normal force and the kinetic energy of the block on the incline.');
    expect(incline.forms).not.toContain('dist');
    expect(incline.forms).not.toContain('energy');
  });

  it('gives a question with no recognisable subject the everyday maths and statistics forms', () => {
    const general = assembleGuide('Show these results in a picture: 45, 67, 82, 55, 71');
    expect(general.forms).toEqual(expect.arrayContaining(['chart', 'dist', 'numberline', 'venn', 'plot', 'graph', 'table.matrix']));
    expect(general.text).not.toContain('COMMON MISTAKES');
  });

  it('sends a statistics question the maths forms', () => {
    const stats = assembleGuide('Find the median and the standard deviation of these marks: 45, 67, 82, 55, 71');
    expect(stats.forms).toEqual(expect.arrayContaining(['chart', 'dist', 'numberline', 'venn']));
    expect(stats.text).toContain('COMMON MISTAKES IN MATH');
  });

  it('keeps the shear and moment example physically consistent', async () => {
    const sfd = FIGURE_FORMS.find((form) => form.id === 'sfd')!;
    expect(await resolveDiagram({ type: 'sfd', content: sfd.specimen }, 'light')).toMatchObject({ ok: true });
  });
});

/**
 * Coverage: what the model is told it can use. Every figure family the guide teaches reaches every
 * subject, and everything the parser accepts is either taught or listed here with the reason it is
 * not. A new marker, field or family fails these tests until someone decides which it is.
 */
describe('coverage', () => {
  // Everything a model is ever sent about the answer format: the guide before its figure types
  // (a figure key such as `level:` is not a field of the answer), the reminder, and the follow-ups.
  const told = [
    assembleGuide('', 'Physics').text.split('\n\ntype=')[0]!,
    buildComposerPointer({ hasQuestion: true }),
    buildFollowupCopyText({ selection: 'Step 2', intent: 'ask', qid: 'q1' }),
  ].join('\n');

  it.each(guides)('%s: every figure type the guide teaches is there, with an example or with its keys', (_subject, guide) => {
    for (const form of FIGURE_FORMS) {
      expect(guide.text, form.id).toContain(`type=${figureType(form.id)}: ${form.grammar}`);
    }
    expect(guide.text).not.toContain('does not describe');
  });

  it('teaches the figure families the compiler draws faithfully, and names the ones it leaves out', () => {
    const taught = new Set(FIGURE_FORMS.map((form) => figureType(form.id)));
    // Older template families: still drawn when an old answer uses one, never taught. They were
    // left out of the guide before this one too, because they draw a fixed picture or refuse
    // common inputs (`beam` takes one central point load only).
    const NOT_TAUGHT = 'anatomy beam bz cam cd cell chair cmos column complex constel datapath division dq ecg echem eye feynman frame frost gear haworth hx hybridpi isometric jablonski knot ladder lewis linkage mccabe mechanism membrane minkowski mospi motor neuron newick oneline opamp openchan operon pcr pfd pipeline ponchon psych pwm rama ray rc reactor restriction ring schematic seqnet skiplist smith soil sphere ternary tline topology twoport wall xfmr';
    expect([...SPEC_FAMILIES].filter((type) => !taught.has(type)).sort().join(' ')).toBe(NOT_TAUGHT);
  });

  it('teaches every marker the parser reads, or says why not', () => {
    const NOT_TAUGHT: Record<string, string> = {
      '@resume': 'a cut-off answer is shown with its finished steps and the student is told to ask for the rest; the model is not asked to plan for it',
      '@patch': 'the panel still applies a patch an older answer sent, but no stemLM message asks for one',
      '@endpatch': 'closes @patch',
    };
    const markers = [...PROTOCOL_LINE_MARKERS, '@diagram'].filter((marker) => !(marker in ALT_END_MARKERS));
    expect(markers).toHaveLength(28);
    for (const marker of markers) {
      const taught = new RegExp(`(?:^|\\s)${marker}(?![a-z])`, 'm').test(told);
      expect(taught !== marker in NOT_TAUGHT, `${marker}: taught ${taught}`).toBe(true);
    }
  });

  it('teaches every field the parser reads, or says why not', () => {
    const NOT_TAUGHT: Record<string, string> = {
      version: 'the parser supplies it and nothing shown depends on it',
      level: 'nothing reads it',
      locale: 'it only chose the circuit symbol set, which the circuit type now sets with std:',
      low_confidence: 'the panel never shows it',
      check: 'the panel never shows it',
      after: 'only a patch that inserts a step uses it, and no stemLM message asks for one',
      op: 'only a patch uses it, and no stemLM message asks for one',
    };
    // archetype: is taught for the one case the panel shows: subject General with archetype
    // conceptual raises the "Not a STEM question" flag.
    expect(told).toContain('subject: General and archetype: conceptual');
    const source = readFileSync(resolve(__dirname, 'parser.ts'), 'utf8');
    // `assumptions?` is the one key read with an optional plural.
    const fields = [...source.matchAll(/readInlineValue\(\s*\w+,\s*'([a-z_]+?)(?:s\?)?'\s*\)/g)].map((match) => match[1]!);
    const attributes = [...source.matchAll(/\b(?:attrs|[a-z]+Attrs)\.([a-z]+)/g)].map((match) => match[1]!);
    const accepted = [...new Set([...fields, ...attributes])].sort();
    expect(accepted).toEqual(['a', 'after', 'archetype', 'assumption', 'check', 'correction', 'id', 'level', 'locale', 'low_confidence', 'methods', 'mode', 'notes', 'op', 'q', 'qid', 'question', 'status', 'subject', 'title', 'topic', 'type', 'version']);
    for (const field of accepted) {
      const taught = new RegExp(`(?:^|[\\s(])${field}[:=]`, 'm').test(told);
      expect(taught !== field in NOT_TAUGHT, `${field}: taught ${taught}`).toBe(true);
    }
  });

  it('says what a step can hold, and what it cannot', () => {
    const guide = assembleGuide('', 'CS').text;
    for (const allowed of ['Bold, bullet lists, numbered lists and tables all work', 'A table of values is a Markdown table in the body', 'a block that starts and ends with ~~~']) expect(guide).toContain(allowed);
    expect(guide).toContain('These do not work: images, HTML, links to pictures, and a line of three backticks');
    expect(guide).toContain('It may hold one @diagram');
    expect(guide).toContain('caption:');
  });

  it('covers the rest of the chat in the words the messages themselves use', () => {
    const guide = assembleGuide('', 'Math').text;
    expect(guide).toContain('LATER IN THIS CHAT');
    expect(guide).toContain('a line that starts with --- stemLM');
    expect(buildComposerPointer({ hasQuestion: true }).startsWith('--- stemLM')).toBe(true);
    const ask = buildFollowupCopyText({ selection: 'Step 2', intent: 'ask' });
    expect(ask).toContain('--- stemLM follow-up context');
    // The guide and the follow-up say the same thing in the same words.
    expect(guide).toContain('the question is about one step of an earlier answer, answer only that question, in 1 to 3 steps');
    expect(ask).toContain('about this step of your earlier answer');
    expect(ask).toContain('Answer only that question');
    expect(ask).toContain('1 to 3 steps');
    for (const rule of ['Each answer is a complete new block', 'When a message has no stemLM line, answer normally', 'unless the student asks about them', 'solve the question again in full and say what changed']) {
      expect(guide).toContain(rule);
    }
    expect(guide).toMatch(/usually 3 to 7 steps, and more \(up to 20\)/);
  });
});

describe('pack families in the guide', () => {
  // A pack family reaches the model only through the guide, and its manifest is the single source.
  it.each(FAMILY_MANIFESTS.map((manifest) => [manifest.token, manifest] as const))('%s is taught, with its own specimen, to every subject it names', (token, manifest) => {
    expect(manifest.subjects.length).toBeGreaterThan(0);
    for (const subject of manifest.subjects) {
      const guide = assembleGuide('', subject);
      expect(guide.forms, subject).toContain(token);
      expect(guide.text).toContain(`@diagram type=${token}\n${manifest.specimen}\n@enddiagram`);
    }
    // The guide cuts this prefix off, since it names the type itself.
    expect(manifest.grammar.startsWith(`${token}: `)).toBe(true);
    // The grammar line names every key the compiler admits the family by.
    for (const key of [...(manifest.required ?? []), ...(manifest.requiredAny ?? [])]) expect(manifest.grammar, key).toContain(`${key}:`);
  });
});
