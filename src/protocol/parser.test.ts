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
});

describe('parse (full capsule)', () => {
  const result = parse(FENCED_ELECTRICAL);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('parses meta', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toBe('Series resistor voltage');
    expect(result.capsule?.meta.version).toBe(1);
  });

  it('parses two steps with fields', () => {
    const steps = result.capsule!.steps;
    expect(steps).toHaveLength(2);
    expect(steps[0]!.title).toBe('Label the circuit');
    expect(steps[0]!.formula).toContain('V = IR');
    expect(steps[0]!.body).toContain('12');
    expect(steps[0]!.diagram?.type).toBe('svg');
    expect(steps[0]!.diagram?.content).toContain('<svg');
    expect(steps[0]!.takeaway).toContain('elements');
    expect(steps[0]!.quickCheck?.question).toContain('series');
    expect(steps[0]!.quickCheck?.answer).toContain('current');
    expect(steps[0]!.followup).toContain('R2');
  });

  it('parses the solution and extracts inline diagrams', () => {
    const cap = result.capsule!;
    expect(cap.solution).toContain('2');
    expect(cap.solutionDiagrams).toHaveLength(1);
    expect(cap.solutionDiagrams[0]!.type).toBe('mermaid');
    expect(cap.solution).toContain(SOLUTION_DIAGRAM_TOKEN(0));
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
    expect(s.diagram?.content).toContain('Rf=10k');
    expect(s.diagram?.content).toContain('Rg=2k');
    expect(s.diagram?.content).toContain('<rect');
  });

  it('step 4 invokes the virtual short', () => {
    const s = result.capsule!.steps[3]!;
    expect(s.title).toBe('Invoke the virtual short');
    expect(s.formula).toContain('V_+');
    expect(s.body).toContain('feedback forces');
    expect(s.takeaway).toContain('Virtual short');
  });

  it('step 6 computes Vout = 6 V', () => {
    const s = result.capsule!.steps[5]!;
    expect(s.formula).toContain('6');
    expect(s.body).toContain('6\\,\\text{V}');
  });

  it('solution references the gain formula', () => {
    expect(result.capsule!.solution).toContain('V_{\\text{out}}');
    expect(result.capsule!.solution).toContain('virtual-short');
  });
});

describe('parse (op-amp rail-check hard benchmark)', () => {
  const result = parse(OPAMP_NONINVERTING_RAILS);
  const capsule = result.capsule!;
  const allText = [
    ...capsule.steps.map((s) => s.formula ?? ''),
    ...capsule.steps.map((s) => s.body),
    capsule.solution,
  ].join(' ');

  it('parses the rail-check fixture cleanly', () => {
    expect(result.status).toBe('ok');
    expect(capsule.meta.subject).toBe('Electrical');
    expect(capsule.steps).toHaveLength(5);
  });

  it('computes gain, output, virtual-short node voltages, and no saturation', () => {
    expect(allText).toContain('=10');
    expect(allText).toContain('2.00');
    expect(allText).toMatch(/0\.20/);
    expect(allText).toMatch(/does not saturate|does not.*clip/i);
    expect(allText).toContain('\\pm12');
  });

  it('draws rails and the complete Rf/Rg feedback topology', () => {
    const diagram = capsule.steps[0]!.diagram!.content;
    expect(diagram).toContain('+12V');
    expect(diagram).toContain('−12V');
    expect(diagram).toContain('Vin=0.20V');
    expect(diagram).toContain('Vout=2.00V');
    expect(diagram).toContain('Rf=9k');
    expect(diagram).toContain('Rg=1k');
    expect(diagram).toContain('V−=0.20V');
    expect(diagram).toContain('V+=0.20V');
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
    expect(s.diagram?.content).toContain('5V');
  });

  it('step 3 computes peak current and average voltage', () => {
    const s = result.capsule!.steps[2]!;
    expect(s.title).toContain('peak');
    expect(s.formula).toMatch(/5.*mA|V_p/);
    expect(s.formula).toContain('\\pi');
  });

  it('solution includes average voltage', () => {
    expect(result.capsule!.solution).toContain('V_{\\text{avg}}');
    expect(result.capsule!.solution).toContain('1.59');
  });
});

describe('parse (12 V half-wave diode hard benchmark)', () => {
  const result = parse(DIODE_HALFWAVE_RECTIFIER_12V);
  const capsule = result.capsule!;
  const allText = [
    ...capsule.steps.map((s) => s.formula ?? ''),
    ...capsule.steps.map((s) => s.body),
    capsule.solution,
  ].join(' ');

  it('parses the 12 V rectifier fixture cleanly', () => {
    expect(result.status).toBe('ok');
    expect(capsule.meta.subject).toBe('Electrical');
    expect(capsule.steps).toHaveLength(4);
  });

  it('states peak voltage, peak current, average output, and conduction interval', () => {
    expect(allText).toContain('12');
    expect(allText).toMatch(/12\s*\\,\\text\{mA\}|12\\,\\text\{mA\}|12.*mA/);
    expect(allText).toContain('12/\\pi');
    expect(allText).toContain('3.82');
    expect(allText).toMatch(/2\\pi k<\\omega t<\(2k\+1\)\\pi/);
    expect(allText).toMatch(/blocking half-cycle|blocks/i);
  });

  it('draws a diode circuit and waveform with zero negative half-cycle labels', () => {
    const circuit = capsule.steps[0]!.diagram!.content;
    const waveform = capsule.steps[2]!.diagram!.content;
    expect(circuit).toContain('<polygon');
    expect(circuit).toContain('12Vp');
    expect(circuit).toContain('vo across load');
    expect(waveform).toContain('12 V peak');
    expect(waveform).toContain('Vavg=12/π=3.82V');
    expect(waveform).toContain('OFF at 0 V');
  });
});

describe('atomic step guidance', () => {
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
    const steps = Array.from({ length: 13 }, (_, i) =>
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
});
