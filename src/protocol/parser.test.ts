import { describe, it, expect } from 'vitest';
import { parse, parseCapsule, findCapsuleRaw, looksComplete, SOLUTION_DIAGRAM_TOKEN } from './parser';
import {
  FENCED_ELECTRICAL,
  TOLERANT_PARTIAL,
  NO_CAPSULE,
  NOISY_FENCED,
  OPAMP_NONINVERTING,
  OPAMP_NONINVERTING_RAILS,
  DIODE_HALFWAVE_RECTIFIER,
  DIODE_HALFWAVE_RECTIFIER_12V,
} from './__fixtures__';

describe('findCapsuleRaw', () => {
  it('extracts content from a ```stemlm fence', () => {
    const raw = findCapsuleRaw(FENCED_ELECTRICAL);
    expect(raw).toContain('@meta');
    expect(raw).toContain('@end');
    expect(raw).not.toContain('```');
  });

  it('extracts from a noisy message with preamble/trailer', () => {
    const raw = findCapsuleRaw(NOISY_FENCED);
    expect(raw).toContain('subject: Biology');
    expect(raw).not.toContain('Hope that helps');
  });

  it('extracts a bare @meta..@end span without a fence', () => {
    const raw = findCapsuleRaw(TOLERANT_PARTIAL);
    expect(raw?.startsWith('@meta')).toBe(true);
  });

  it('returns null when there is no capsule', () => {
    expect(findCapsuleRaw(NO_CAPSULE)).toBeNull();
  });
});

describe('looksComplete', () => {
  it('is true once the @end token is present on its own line', () => {
    expect(looksComplete(FENCED_ELECTRICAL)).toBe(true);
  });
  it('is false for a streaming fragment without @end', () => {
    const fragment = '```stemlm\n@meta\nsubject: Physics\n@endmeta\n@step\ntitle: Start';
    expect(looksComplete(fragment)).toBe(false);
  });
});

describe('parse warning and error codes', () => {
  it('flags inner triple backticks instead of silently trusting them', () => {
    const raw = [
      '```stemlm',
      '@meta',
      'version: 1',
      'subject: CS',
      'topic: Code fence',
      '@endmeta',
      '@step',
      'title: Trace code',
      '@body',
      'Do not use fences:',
      '```python',
      'print(1)',
      '```',
      '@endbody',
      '@solution',
      'Use inline `print(1)` instead.',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);
    expect(result.warningCodes).toContain('inner_triple_backticks');
  });

  it('normalizes invalid subjects and records a code', () => {
    const result = parseCapsule('@meta\nsubject: Astronomy\ntopic: Stars\n@endmeta\n@step\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end');
    expect(result.capsule?.meta.subject).toBe('General');
    expect(result.warningCodes).toContain('invalid_subject');
  });

  it('reports missing final @end while still recovering usable content', () => {
    const result = parseCapsule('@meta\nsubject: Physics\ntopic: Missing end\n@endmeta\n@step\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution');
    expect(result.status).toBe('ok');
    expect(result.warningCodes).toContain('missing_end');
  });

  it('keeps topic single-line when the model spills onto the next line', () => {
    const result = parseCapsule('@meta\nsubject: Math\ntopic: First line\nsecond line\n@endmeta\n@step\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end');
    expect(result.capsule?.meta.topic).toBe('First line');
  });

  it('parses the full problem statement from @meta question:', () => {
    const result = parseCapsule(
      '@meta\nsubject: Electrical\ntopic: Nodal analysis\nquestion: Find V_A when V_s = 48 V.\n@endmeta\n@step\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end',
    );
    expect(result.capsule?.meta.question).toBe('Find V_A when V_s = 48 V.');
  });
});

describe('parse (full capsule)', () => {
  const result = parse(FENCED_ELECTRICAL);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('parses meta', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toBe('Circuit format check');
    expect(result.capsule?.meta.version).toBe(1);
  });

  it('parses two steps with fields', () => {
    const steps = result.capsule!.steps;
    expect(steps).toHaveLength(2);
    expect(steps[0]!.title).toBe('Label the circuit');
    expect(steps[0]!.formula).toContain('V = IR');
    expect(steps[0]!.body).toContain('voltage');
    expect(steps[0]!.diagram?.type).toBe('svg');
    expect(steps[0]!.diagram?.content).toContain('<svg');
    expect(steps[0]!.takeaway).toContain('Format');
  });

  it('parses the solution block', () => {
    const cap = result.capsule!;
    expect(cap.solution).toContain('Gemini');
    expect(cap.solutionDiagrams).toHaveLength(0);
  });
});

describe('parse (tolerant / missing terminators)', () => {
  const result = parse(TOLERANT_PARTIAL);

  it('still recovers both steps', () => {
    expect(result.capsule?.steps).toHaveLength(2);
    expect(result.capsule?.steps[0]!.title).toBe('Apply the power rule');
    expect(result.capsule?.steps[1]!.title).toBe('Result');
  });

  it('captures body even without @endbody before next @step', () => {
    expect(result.capsule?.steps[0]!.body).toContain('exponent');
  });

  it('normalizes subject', () => {
    expect(result.capsule?.meta.subject).toBe('Math');
  });
});

describe('parse (no capsule)', () => {
  it('returns empty status', () => {
    const result = parse(NO_CAPSULE);
    expect(result.status).toBe('empty');
    expect(result.capsule).toBeUndefined();
  });
});

describe('parseCapsule subject normalization', () => {
  it('maps aliases to canonical subjects', () => {
    const r = parseCapsule('@meta\nsubject: computer science\ntopic: x\n@endmeta\n@step\ntitle: a\n@body\nb\n@endstep\n@end');
    expect(r.capsule?.meta.subject).toBe('CS');
  });

  it('maps physical chemistry and biochemistry to Chemistry', () => {
    const physChem = parseCapsule(
      '@meta\nsubject: physical chemistry\ntopic: x\n@endmeta\n@step\ntitle: a\n@body\nb\n@endstep\n@end',
    );
    const biochem = parseCapsule(
      '@meta\nsubject: biochemistry\ntopic: x\n@endmeta\n@step\ntitle: a\n@body\nb\n@endstep\n@end',
    );
    expect(physChem.capsule?.meta.subject).toBe('Chemistry');
    expect(biochem.capsule?.meta.subject).toBe('Chemistry');
  });
});

describe('parse (op-amp non-inverting capsule)', () => {
  const result = parse(OPAMP_NONINVERTING);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('classifies as Electrical with correct topic', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toBe('Non-inverting op-amp gain');
  });

  it('parses all six steps', () => {
    expect(result.capsule!.steps).toHaveLength(6);
  });

  it('step 1 draws the op-amp triangle symbol', () => {
    const s = result.capsule!.steps[0]!;
    expect(s.title).toBe('Draw the op-amp triangle symbol');
    expect(s.diagram?.type).toBe('svg');
    expect(s.diagram?.content).toContain('<polygon');
    expect(s.diagram?.content).toContain('<svg');
  });

  it('step 3 has the feedback resistor network diagram', () => {
    const s = result.capsule!.steps[2]!;
    expect(s.title).toBe('Attach the feedback resistor network');
    expect(s.diagram?.content).toContain('Rf');
    expect(s.diagram?.content).toContain('Rg');
    expect(s.diagram?.content).toContain('<rect');
  });

  it('step 4 invokes the virtual short', () => {
    const s = result.capsule!.steps[3]!;
    expect(s.title).toBe('Invoke the virtual short');
    expect(s.formula).toContain('V_+');
    expect(s.body).toContain('feedback forces');
    expect(s.takeaway).toContain('Virtual short');
  });

  it('step 6 has substitution placeholder body', () => {
    const s = result.capsule!.steps[5]!;
    expect(s.body).toContain('Substitute');
  });

  it('solution references the gain formula', () => {
    expect(result.capsule!.solution).toContain('V_{\\text{out}}');
    expect(result.capsule!.solution).toContain('virtual-short');
  });
});

describe('parse (op-amp rails structural fixture)', () => {
  const result = parse(OPAMP_NONINVERTING_RAILS);
  const capsule = result.capsule!;

  it('parses the structural op-amp fixture cleanly', () => {
    expect(result.status).toBe('ok');
    expect(capsule.meta.subject).toBe('Electrical');
    expect(capsule.steps.length).toBeGreaterThanOrEqual(5);
  });

  it('includes feedback network SVG primitives', () => {
    const diagram = capsule.steps[2]!.diagram!.content;
    expect(diagram).toContain('Rf');
    expect(diagram).toContain('Rg');
    expect(diagram).toContain('<rect');
  });
});

describe('parse (half-wave diode rectifier capsule)', () => {
  const result = parse(DIODE_HALFWAVE_RECTIFIER);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('classifies as Electrical', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toBe('Half-wave diode rectifier');
  });

  it('parses three steps', () => {
    expect(result.capsule!.steps).toHaveLength(3);
  });

  it('step 1 has the diode triangle-line symbol', () => {
    const s = result.capsule!.steps[0]!;
    expect(s.title).toBe('Draw the half-wave rectifier circuit');
    expect(s.diagram?.type).toBe('svg');
    expect(s.diagram?.content).toContain('<polygon');
    expect(s.diagram?.content).toContain('<circle');
    expect(s.diagram?.content).toContain('<rect');
  });

  it('step 2 sketches the output waveform with path arcs', () => {
    const s = result.capsule!.steps[1]!;
    expect(s.title).toBe('Sketch the rectified output waveform');
    expect(s.diagram?.content).toContain('<path');
    expect(s.diagram?.content).toContain('wave');
  });

  it('step 3 has peak current relation', () => {
    const s = result.capsule!.steps[2]!;
    expect(s.title).toContain('peak');
    expect(s.formula).toContain('I_p');
  });

  it('solution includes average voltage symbol', () => {
    expect(result.capsule!.solution).toContain('V_{\\text{avg}}');
  });
});

describe('parse (diode rectifier structural alias)', () => {
  const result = parse(DIODE_HALFWAVE_RECTIFIER_12V);
  const capsule = result.capsule!;

  it('parses the structural diode fixture cleanly', () => {
    expect(result.status).toBe('ok');
    expect(capsule.meta.subject).toBe('Electrical');
    expect(capsule.steps).toHaveLength(3);
  });

  it('draws diode circuit and waveform SVG primitives', () => {
    const circuit = capsule.steps[0]!.diagram!.content;
    const waveform = capsule.steps[1]!.diagram!.content;
    expect(circuit).toContain('<polygon');
    expect(waveform).toContain('<path');
  });
});

describe('atomic step guidance', () => {
  it('does not warn step_body_too_long for decimals inside math', () => {
    const r = parseCapsule(
      '@meta\nsubject: Physics\ntopic: test\n@endmeta\n@step\ntitle: Numeric work\n@body\nWith $m=0.5\\,\\text{kg}$ and $a=0.613\\,\\text{m/s}^2$, tension is $T=27.6\\,\\text{N}$.\n@endbody\n@endstep\n@step\ntitle: b\n@body\nok\n@endbody\n@endstep\n@step\ntitle: c\n@body\nok\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end',
    );
    expect(r.warningCodes).not.toContain('step_body_too_long');
  });

  it('warns when a step body packs multiple moves', () => {
    const body = [
      'First we substitute $x=2$.',
      'Then we expand the bracket.',
      'Next we collect like terms.',
      'Finally we divide by the coefficient.',
      'The result follows immediately.',
    ].join(' ');
    const r = parseCapsule(
      `@meta\nsubject: Math\ntopic: test\n@endmeta\n@step\ntitle: Do everything\n@body\n${body}\n@endbody\n@endstep\n@step\ntitle: b\n@body\nok\n@endbody\n@endstep\n@step\ntitle: c\n@body\nok\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end`,
    );
    expect(r.warningCodes).toContain('step_body_too_long');
  });

  it('warns when step count exceeds the maximum', () => {
    const steps = Array.from({ length: 21 }, (_, i) =>
      `@step\ntitle: Move ${i + 1}\n@body\nOne line.\n@endbody\n@endstep`,
    ).join('\n');
    const r = parseCapsule(`@meta\nsubject: Math\ntopic: test\n@endmeta\n${steps}\n@solution\ns\n@endsolution\n@end`);
    expect(r.warningCodes).toContain('invalid_step_count');
  });

  it('normalizes alternate @bodyend/@formulaend markers from the model', () => {
    const r = parseCapsule(
      [
        '@meta',
        'subject: Physics',
        'topic: Projectile range',
        '@endmeta',
        '@step',
        'title: Choose the range formula',
        '@formula',
        '$$R = \\frac{u^2\\sin(2\\theta)}{g}$$',
        '@formulaend',
        '@body',
        'Horizontal range from ground level.',
        '@bodyend',
        '@diagram type=svg',
        '<svg viewBox="0 0 80 40"><text x="4" y="20">range-diagram</text></svg>',
        '@diagramend',
        '@takeaway',
        'Same launch and landing height.',
        '@takeawayend',
        '@endstep',
        '@solution',
        'Done.',
        '@endsolution',
        '@end',
      ].join('\n'),
    );
    expect(r.capsule?.steps[0]!.formula).toContain('R =');
    expect(r.capsule?.steps[0]!.body).not.toContain('@bodyend');
    expect(r.capsule?.steps[0]!.diagram?.content).toContain('range-diagram');
    expect(r.capsule?.steps[0]!.takeaway).not.toContain('@takeawayend');
  });

  it('strips inline @formulaend on the same line as the formula', () => {
    const r = parseCapsule(
      [
        '@meta',
        'subject: Physics',
        'topic: Range',
        '@endmeta',
        '@step',
        'title: Formula',
        '@formula',
        '$$R = \\frac{u^2\\sin(2\\theta)}{g}$$ @formulaend',
        '@body',
        'Text @bodyend',
        '@endstep',
        '@solution',
        's',
        '@endsolution',
        '@end',
      ].join('\n'),
    );
    const step = r.capsule!.steps[0]!;
    expect(step.formula).toBe('$$R = \\frac{u^2\\sin(2\\theta)}{g}$$');
    expect(step.body).toBe('Text');
    expect(step.formula).not.toContain('@');
    expect(step.body).not.toContain('@');
  });

  it('salvages prose lines that omit the @body wrapper', () => {
    const raw = [
      '@meta',
      'subject: Electrical',
      'topic: Admittance',
      '@endmeta',
      '@step',
      'title: Calculate the conductive component of admittance',
      '@formula',
      '$$G = \\frac{1}{R}$$',
      '@endformula',
      '$G$ is conductance in siemens. With $R=20\\,\\Omega$: $G=1/20=0.05\\,\\text{S}$.',
      '@endstep',
      '@solution',
      '$G=0.05\\,\\text{S}$',
      '@endsolution',
      '@end',
    ].join('\n');
    const step = parseCapsule(raw).capsule!.steps[0]!;
    expect(step.body).toContain('conductance');
    expect(step.body).toContain('0.05');
  });
});

function miniCapsule(diagramOpen: string, body: string): string {
  return [
    '@meta',
    'subject: Math',
    'topic: Spec parse',
    '@endmeta',
    '@step',
    'title: Draw the figure',
    '@body',
    'Named objects appear as ids.',
    '@endbody',
    diagramOpen,
    body,
    '@enddiagram',
    '@endstep',
    '@solution',
    'done',
    '@endsolution',
    '@end',
  ].join('\n');
}

describe('parse @diagram spec families', () => {
  it('preserves type=plot and is not malformed when fn: is present', () => {
    const r = parseCapsule(
      miniCapsule(
        '@diagram type=plot',
        [
          'fn: 1.5*t^2 - 2*t',
          'var: t',
          'domain: 0 10',
          'xlabel: t (s)',
          'ylabel: \\alpha (rad/s^2)',
          'point: 10, 130',
          'eq: \\alpha(t)=1.5t^{2}-2t',
          'caption: kinematics',
        ].join('\n'),
      ),
    );
    const d = r.capsule!.steps[0]!.diagram!;
    expect(d.type).toBe('plot');
    expect(r.warningCodes).not.toContain('malformed_diagram');
    expect(d.caption).toBe('kinematics');
    expect(d.content).toContain('fn: 1.5*t^2 - 2*t');
  });

  it('flags type=plot without fn/data/peaks/poles as malformed_diagram', () => {
    const r = parseCapsule(miniCapsule('@diagram type=plot', 'xlabel: t\nylabel: y'));
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('plot');
    expect(r.warningCodes).toContain('malformed_diagram');
  });

  it('preserves type=chem.smiles (does not become chem)', () => {
    const r = parseCapsule(miniCapsule('@diagram type=chem.smiles', 'smiles: CC(=O)O'));
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('chem.smiles');
    expect(r.warningCodes).not.toContain('malformed_diagram');
  });

  it('accepts hyphen alias chem-smiles as chem.smiles', () => {
    const r = parseCapsule(miniCapsule('@diagram type=chem-smiles', 'smiles: CCO'));
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('chem.smiles');
  });

  it('preserves type=circuit netlist', () => {
    const r = parseCapsule(
      miniCapsule(
        '@diagram type=circuit',
        ['std: ieee', 'V1: n_in 0 DC 12', 'R1: n_in n_a 4k', 'R2: n_a 0 6k', 'RL: n_a 0 2k'].join('\n'),
      ),
    );
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('circuit');
    expect(r.warningCodes).not.toContain('malformed_diagram');
  });

  it('preserves type=scene FBD', () => {
    const r = parseCapsule(
      miniCapsule(
        '@diagram type=scene',
        ['kind: fbd', 'body: block', 'incline_deg: 30', 'force: mg down weight'].join('\n'),
      ),
    );
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('scene');
  });

  it('preserves type=table ICE', () => {
    const r = parseCapsule(
      miniCapsule(
        '@diagram type=table',
        ['kind: ice', 'species: N2, H2, NH3', 'I: 1, 3, 0', 'C: -x, -3x, +2x', 'E: 1-x, 3-3x, 2x'].join('\n'),
      ),
    );
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('table');
  });

  it('preserves type=graph nodes/edges', () => {
    const r = parseCapsule(
      miniCapsule(
        '@diagram type=graph',
        ['rankdir: LR', 'node: A hexokinase', 'node: B glucose', 'edge: B A consumption'].join('\n'),
      ),
    );
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('graph');
  });

  it('keeps type=svg hatch with <svg', () => {
    const r = parseCapsule(
      miniCapsule('@diagram type=svg', '<svg viewBox="0 0 10 10"><circle r="1"/></svg>'),
    );
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('svg');
    expect(r.warningCodes).not.toContain('malformed_diagram');
  });

  it('does not collapse unknown type=notafamily to svg', () => {
    const r = parseCapsule(miniCapsule('@diagram type=notafamily', 'foo: bar'));
    expect(r.capsule!.steps[0]!.diagram!.type).toBe('notafamily');
    expect(r.warningCodes).toContain('unknown_diagram_type');
  });

  it('malforms a non-svg spec that contains raw <svg', () => {
    const r = parseCapsule(
      miniCapsule('@diagram type=plot', 'fn: x\n<svg viewBox="0 0 1 1"></svg>'),
    );
    expect(r.warningCodes).toContain('malformed_diagram');
  });

  it('preserves leftover hybridpi / sfd-bmd tokens', () => {
    const hp = parseCapsule(
      miniCapsule('@diagram type=hybridpi', 'rpi: 1k\ngm: 50m\nRE: 270\nRC: 2.2k'),
    );
    expect(hp.capsule!.steps[0]!.diagram!.type).toBe('hybridpi');
    const sfd = parseCapsule(miniCapsule('@diagram type=sfd-bmd', 'L: 8\nV: 0 1; 8 1'));
    expect(sfd.capsule!.steps[0]!.diagram!.type).toBe('sfd');
  });
});

describe('stable IDs, version, resume, multi-question, uncertainty', () => {
  it('keeps emitted step, formula, and figure ids instead of step-${index}', () => {
    const r = parseCapsule(
      [
        '@meta',
        'version: 2',
        'subject: Physics',
        'topic: Range',
        'question: Find the range of a 20 m/s launch at 45 degrees.',
        'qid: q1',
        'archetype: numeric',
        'level: intro',
        'locale: SI,decimal=.,circuit=IEC',
        '@endmeta',
        '@step id=s1',
        'title: Write the range formula',
        '@formula id=e1',
        '$$R=u^2\\sin 2\\theta/g$$',
        '@endformula',
        '@body',
        '$R$ is range in m.',
        '@endbody',
        '@diagram id=f1 type=plot',
        'fn: 20*t',
        'domain: 0 3',
        'xlabel: t (s)',
        'ylabel: x (m)',
        '@enddiagram',
        '@endstep',
        '@verify',
        'methods: units,limit',
        'status: fail',
        'notes: units of g were wrong',
        'correction: g is 9.81 m/s^2 not 9.81 cm/s^2',
        '@endverify',
        '@uncertainty',
        'assumption: g = 9.81 m/s^2 (not given)',
        'low_confidence: s1',
        'check: Confirm the photo shows 45 degrees not 45 rad',
        '@enduncertainty',
        '@solution',
        'Range follows from the formula.',
        '@endsolution',
        '@end',
      ].join('\n'),
    );
    expect(r.status).toBe('ok');
    expect(r.capsule?.meta.version).toBe(2);
    expect(r.capsule?.meta.qid).toBe('q1');
    expect(r.capsule?.meta.archetype).toBe('numeric');
    expect(r.capsule?.meta.question).toContain('20 m/s');
    expect(r.capsule?.steps[0]!.id).toBe('s1');
    expect(r.capsule?.steps[0]!.id).not.toBe('step-1');
    expect(r.capsule?.steps[0]!.formulaId).toBe('e1');
    expect(r.capsule?.steps[0]!.diagram?.id).toBe('f1');
    expect(r.capsule?.verification?.status).toBe('fail');
    expect(r.capsule?.verification?.correction).toContain('9.81');
    expect(r.capsule?.uncertainty?.assumptions[0]).toContain('9.81');
    expect(r.capsule?.uncertainty?.lowConfidenceSteps).toContain('s1');
  });

  it('still yields known blocks when version is a future number', () => {
    const r = parseCapsule(
      '@meta\nversion: 99\nsubject: Math\ntopic: Future\n@endmeta\n@step id=s1\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end',
    );
    expect(r.status).toBe('ok');
    expect(r.capsule?.meta.version).toBe(99);
    expect(r.capsule?.steps[0]!.id).toBe('s1');
  });

  it('parses multi-question input into N objects', () => {
    const r = parseCapsule(
      [
        '@meta',
        'version: 2',
        'subject: Physics',
        'topic: Homework page',
        '@endmeta',
        '@q id=q1',
        'topic: Range',
        'question: Find the range.',
        '@step id=q1.s1',
        'title: Write the range formula',
        '@body',
        '$R$ is range.',
        '@endbody',
        '@endstep',
        '@solution',
        'R = 40 m',
        '@endsolution',
        '@endq',
        '@q id=q2',
        'topic: Time of flight',
        'question: Find the time of flight.',
        '@step id=q2.s1',
        'title: Write the flight-time formula',
        '@body',
        '$T$ is time of flight.',
        '@endbody',
        '@endstep',
        '@solution',
        'T = 2.9 s',
        '@endsolution',
        '@endq',
        '@end',
      ].join('\n'),
    );
    expect(r.questions).toHaveLength(2);
    expect(r.questions![0]!.meta.qid).toBe('q1');
    expect(r.questions![1]!.meta.qid).toBe('q2');
    expect(r.questions![0]!.steps[0]!.id).toBe('q1.s1');
    expect(r.questions![1]!.steps[0]!.id).toBe('q2.s1');
    expect(r.capsule?.meta.qid).toBe('q1');
  });

  it('does not warn step_missing_substitution on a proof capsule', () => {
    const r = parse(
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Math',
        'topic: Even square',
        'question: Prove that if n is even then n^2 is even.',
        'archetype: proof',
        '@endmeta',
        '@step id=s1',
        'title: Assume n is even',
        '@body',
        'Let $n=2k$ for some integer $k$ (definition of even). This step does not substitute a numeric example.',
        '@endbody',
        '@endstep',
        '@step id=s2',
        'title: Expand n squared',
        '@formula id=e1',
        '$$n^2=(2k)^2=4k^2=2(2k^2)$$',
        '@endformula',
        '@body',
        '$n^2$ is twice the integer $2k^2$, so $n^2$ is even by definition.',
        '@endbody',
        '@endstep',
        '@step id=s3',
        'title: Conclude from the definition',
        '@body',
        'Every even $n$ has even $n^2$. No numeric plug-in was used.',
        '@endbody',
        '@endstep',
        '@solution',
        'If $n$ is even then $n^2$ is even.',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    );
    expect(r.status).toBe('ok');
    expect(r.capsule?.meta.archetype).toBe('proof');
    expect(r.warningCodes).not.toContain('step_missing_substitution');
    expect(r.capsule?.steps[1]!.id).toBe('s2');
  });

  it('records a resume token on a truncated capsule', () => {
    const r = parseCapsule(
      [
        '@meta',
        'version: 2',
        'subject: Math',
        'topic: Cut off',
        '@endmeta',
        '@step id=s1',
        'title: Start',
        '@body',
        'First move.',
        '@endbody',
        '@endstep',
        '@resume token=zz99aa00',
      ].join('\n'),
    );
    expect(r.resumeToken).toBe('zz99aa00');
    expect(r.capsule?.steps[0]!.id).toBe('s1');
  });
});


