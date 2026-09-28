/**
 * PARSE-01: parser robustness corpus. Each variant is a way real model output or
 * DOM extraction deviates from the canonical capsule; the assertion is what the
 * student gets: whether the controller captures it (its real contract), and the
 * steps, figures, final check and takeaway that survive.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@/src/protocol/parser';
import { hasCaptureContract } from './controller';

const BASE = String.raw`@meta
version: 2
subject: Physics
topic: Block on a frictionless incline
question: A 2 kg block slides down a 30 degree frictionless incline. Find its acceleration.
qid: q1
archetype: numeric
level: intro
locale: SI,decimal=.,circuit=IEEE
mode: full
@endmeta
@step id=s1
title: Resolve gravity along the incline
@formula id=e1
$$a = g\sin\theta$$
@endformula
@body
$a$ is the acceleration along the slope. With $g=9.81\,\text{m/s}^2$ and $\theta=30^\circ$: $a=9.81\sin 30^\circ=4.905\,\text{m/s}^2$.
@endbody
@diagram id=f1 type=scene
kind: fbd
body: block
incline_deg: 30
force: W 19.6 N weight on block
force: N 17.0 N normal+ on block
@enddiagram
@takeaway
Only the slope component of gravity accelerates the block.
@endtakeaway
@quickcheck
q: What is the acceleration on a 60 degree slope?
a: $9.81\sin 60^\circ=8.50\,\text{m/s}^2$ because $a=g\sin\theta$.
@endquickcheck
@followup
How would friction change the result?
@endfollowup
@endstep
@step id=s2
title: Plot speed against time
@body
Starting from rest, $v=at=4.905\,t$ so speed grows linearly; after $2\,\text{s}$ it is $9.81\,\text{m/s}$.
@endbody
@diagram id=f2 type=plot
fn: 4.905*t
var: t
domain: 0 4
xlabel: t (s)
ylabel: v (m/s)
point: 2, 9.81
point_label: (2 s, 9.81 m/s)
@enddiagram
@endstep
@step id=s3
title: Check the units and a limiting case
@body
Units: $\text{m/s}^2\cdot 1 = \text{m/s}^2$. At $\theta=0$ the acceleration is $0$, and at $\theta=90^\circ$ it is $g$, as expected.
@endbody
@endstep
@verify
methods: units,limit
status: pass
notes: $a(90^\circ)=9.81\sin 90^\circ=9.81\,\text{m/s}^2=g$.
@endverify
@uncertainty
assumption: g=9.81 m/s^2
low_confidence: none
check: the incline angle
@enduncertainty
@solution
The block accelerates at $a=g\sin\theta=4.9\,\text{m/s}^2$ down the slope.
@endsolution
@end`;

const fence = (s: string, info = 'stemlm') => '```' + info + '\n' + s + '\n```';
const withoutBlock = (s: string, name: string) => s.replace(new RegExp(`@${name}\\n[\\s\\S]*?@end${name}\\n`), '');

interface Expect {
  capturable: boolean;
  steps?: number;
  figures?: string[];
  check?: 'pass' | 'fail' | 'none';
  takeaway?: boolean;
  topic?: string;
}

const FULL: Expect = {
  capturable: true,
  steps: 3,
  figures: ['f1:scene', 'f2:plot'],
  check: 'pass',
  takeaway: true,
  topic: 'Block on a frictionless incline',
};

const CORPUS: [string, string, Expect][] = [
  ['canonical, unfenced', BASE, FULL],
  ['fenced', fence(BASE), FULL],
  ['fence info in capitals', fence(BASE, 'stemLM'), FULL],
  ['prose before and after', `Here is the structured answer.\n\n${fence(BASE)}\n\nLet me know if you need more help!`, FULL],
  ['CRLF line endings', fence(BASE).replace(/\n/g, '\r\n'), FULL],
  ['closing fence glued after @end', `\`\`\`stemlm\n${BASE}\`\`\``, FULL],
  ['closing fence glued before @end', BASE.replace(/\n@end$/, '\n```@end'), FULL],
  ['text after @end', `${BASE}\nThanks for reading!`, FULL],
  ['missing @endstep', fence(BASE.replace('@endstep\n@step id=s2', '@step id=s2')), FULL],
  ['missing @endbody before a figure', fence(BASE.replace('4.905\\,\\text{m/s}^2$.\n@endbody', '4.905\\,\\text{m/s}^2$.')), FULL],
  ['every line indented', fence(BASE.split('\n').map((l) => `  ${l}`).join('\n')), FULL],
  ['blank line after every line', fence(BASE.replace(/\n/g, '\n\n')), FULL],
  ['title containing colons', fence(BASE.replace('title: Resolve gravity along the incline', 'title: Step 1: Resolve gravity: the slope part')), FULL],
  ['body mentioning @end mid-line', fence(BASE.replace('Only the slope component', 'At the @end of the slope, only the slope component')), FULL],
  ['smart quotes and dashes', fence(BASE.replace('How would friction change the result?', 'How would \u201ckinetic\u201d friction \u2014 \u03bc = 0.2 \u2014 change it?')), FULL],
  ['markers in mixed case', fence(BASE.replace('@takeaway', '@Takeaway').replace('@endtakeaway', '@EndTakeaway')), FULL],
  ['markers in capitals', fence(BASE.replace('@meta', '@META').replace('@endmeta', '@ENDMETA').replace(/@step id/g, '@STEP id')), FULL],
  ['tab inside a figure spec', fence(BASE.replace('body: block', 'body:\tblock')), FULL],
  ['non-breaking spaces everywhere', fence(BASE.replace(/ /g, '\u00a0')), FULL],
  ['byte-order mark', `\ufeff${fence(BASE)}`, FULL],
  ['zero-width spaces inside markers', fence(BASE.replace(/^@(step|endstep|body|endbody)/gm, '@\u200b$1')), FULL],
  ['zero-width spaces at every line end', fence(BASE.replace(/\n/g, '\u200b\n')), FULL],
  ['unknown block inside a step', fence(BASE.replace('@takeaway', '@hint\nTry drawing it first.\n@endhint\n@takeaway')), FULL],
  ['missing @endmeta', fence(BASE.replace('\n@endmeta', '')), FULL],
  ['trailing spaces on every line', fence(BASE.replace(/\n/g, '   \n')), FULL],
  ['two end markers glued on one line', fence(BASE.replace(/@endbody\n@endstep/g, '@endbody @endstep')), FULL],
  ['spaces around header "="', fence(BASE.replace('@diagram id=f1 type=scene', '@diagram  id = f1  type = scene')), FULL],
  ['quoted header values', fence(BASE.replace('@diagram id=f1 type=scene', '@diagram id="f1" type="scene"')), FULL],
  ['"key: value" in a header', fence(BASE.replace('@step id=s1', '@step id: s1')), FULL],
  ['no @verify (D11)', fence(withoutBlock(BASE, 'verify')), { ...FULL, check: 'none' }],
  ['no @uncertainty and no @solution (D11)', fence(withoutBlock(withoutBlock(BASE, 'uncertainty'), 'solution')), FULL],
  ['malformed @verify (PARSE-04, D30)', fence(BASE.replace('status: pass', 'status: probably').replace('methods: units,limit', 'methods: vibes')), { ...FULL, check: 'fail' }],
  ['a second capsule after the first', `${fence(BASE)}\n\nAnd again:\n\n${fence(BASE.replace('Resolve gravity along the incline', 'SECOND COPY'))}`, FULL],
  ['truncated before @verify', fence(BASE.slice(0, BASE.indexOf('@verify'))), { capturable: false }],
  ['stream cut with a resume token', fence(`${BASE.slice(0, BASE.indexOf('@step id=s3'))}@resume token=ab12cd34`), { capturable: false }],
  ['capsule inside a JSON string', JSON.stringify({ answer: BASE }), { capturable: false }],
  ['no capsule at all', 'The acceleration is 4.9 m/s^2.', { capturable: false }],
];

describe('parser robustness corpus (PARSE-01)', () => {
  it('holds at least 30 variants', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(30);
  });

  it.each(CORPUS)('%s', (_name, text, expected) => {
    const result = parse(text);
    expect(hasCaptureContract(result)).toBe(expected.capturable);
    if (!expected.capturable) return;
    const capsule = result.capsule!;
    if (expected.steps !== undefined) expect(capsule.steps).toHaveLength(expected.steps);
    if (expected.figures) {
      expect(capsule.steps.flatMap((s) => (s.diagram ? [`${s.diagram.id}:${s.diagram.type}`] : []))).toEqual(expected.figures);
    }
    if (expected.check) expect(capsule.verification?.status ?? 'none').toBe(expected.check);
    if (expected.check === 'fail') expect(capsule.verification?.correction).toBeTruthy();
    if (expected.takeaway) expect(capsule.steps[0]?.takeaway?.replace(/\u00a0/g, ' ')).toContain('slope component');
    if (expected.topic) expect(capsule.meta.topic.replace(/\u00a0/g, ' ')).toBe(expected.topic);
    expect(capsule.steps.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('parses a two-part question into both parts', () => {
    const multi = [
      '@meta', 'version: 2', 'subject: Math', 'topic: Two parts', 'question: (a) 2+2 (b) 3*3', 'qid: q1', 'archetype: numeric', 'mode: new', '@endmeta',
      '@q id=q1', 'topic: part a', 'question: 2+2', 'archetype: numeric', '@step id=q1.s1', 'title: Add', '@body', '$2+2=4$', '@endbody', '@endstep',
      '@verify', 'methods: backsub', 'status: pass', 'notes: $4-2=2$', '@endverify', '@uncertainty', 'assumption: none', 'low_confidence: none', 'check: none', '@enduncertainty', '@solution', '$4$', '@endsolution', '@endq',
      '@q id=q2', 'topic: part b', 'question: 3*3', 'archetype: numeric', '@step id=q2.s1', 'title: Multiply', '@body', '$3\\times3=9$', '@endbody', '@endstep',
      '@verify', 'methods: backsub', 'status: pass', 'notes: $9/3=3$', '@endverify', '@uncertainty', 'assumption: none', 'low_confidence: none', 'check: none', '@enduncertainty', '@solution', '$9$', '@endsolution', '@endq', '@end',
    ].join('\n');
    const result = parse(fence(multi));
    expect(hasCaptureContract(result)).toBe(true);
    expect(result.questions?.map((q) => q.steps[0]?.title)).toEqual(['Add', 'Multiply']);
  });
});
