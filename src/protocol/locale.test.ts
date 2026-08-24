import { describe, it, expect } from 'vitest';
import { parseLocaleFields, circuitStdFromLocale, injectStdIntoSpec, familyUsesStd } from './locale';
import { parseCapsule } from './parser';
import { parseSpec, specGet } from '@/src/lib/figure/spec';
import { compileDiagramSpec } from '@/src/lib/figure/compile';

describe('parseLocaleFields', () => {
  it('parses SI, decimal, and circuit=IEC without treating IEEE as IEC', () => {
    const iec = parseLocaleFields('SI,decimal=.,circuit=IEC');
    expect(iec.units).toBe('SI');
    expect(iec.decimal).toBe('.');
    expect(iec.circuit).toBe('iec');
    expect(circuitStdFromLocale('SI,decimal=.,circuit=IEC')).toBe('iec');

    const ieee = parseLocaleFields('imperial,decimal=,,circuit=IEEE');
    expect(ieee.units).toBe('imperial');
    expect(ieee.decimal).toBe(',');
    expect(ieee.circuit).toBe('ieee');
  });
});

describe('injectStdIntoSpec', () => {
  it('injects std from locale onto circuit specs that omit it', () => {
    expect(familyUsesStd('circuit')).toBe(true);
    const injected = injectStdIntoSpec('V1: n1 0 DC 12\nR1: n1 0 1k', 'circuit=IEC', 'circuit');
    expect(injected).toMatch(/^std:\s*iec\b/m);
    expect(specGet(parseSpec('circuit', injected), 'std')).toBe('iec');
  });

  it('does not overwrite an existing std: line', () => {
    const kept = injectStdIntoSpec('std: ieee\nR1: n1 0 1k', 'circuit=IEC', 'circuit');
    expect(specGet(parseSpec('circuit', kept), 'std')).toBe('ieee');
  });
});

describe('parse/compile path uses locale circuit std', () => {
  it('locale circuit=IEC with a type=circuit spec and no std: compiles as iec', async () => {
    const raw = [
      '@meta',
      'version: 2',
      'subject: Electrical',
      'topic: Divider',
      'locale: SI,decimal=.,circuit=IEC',
      'question: Find the current.',
      '@endmeta',
      '@step id=s1',
      'title: Label all nodes',
      '@body',
      'V1 and R1 on the original circuit.',
      '@diagram id=f1 type=circuit',
      'V1: n1 0 DC 12',
      'R1: n1 0 1k',
      '@enddiagram',
      '@endstep',
      '@step id=s2',
      'title: Write Ohm law',
      '@body',
      '$I=V/R$.',
      '@endbody',
      '@endstep',
      '@step id=s3',
      'title: Substitute numeric values',
      '@body',
      'With $V=12\\,\\text{V}$: $I=12\\,\\text{mA}$.',
      '@endbody',
      '@endstep',
      '@solution',
      '$I=12\\,\\text{mA}$.',
      '@endsolution',
      '@end',
    ].join('\n');
    const result = parseCapsule(raw);
    expect(result.status).toBe('ok');
    expect(result.capsule?.meta.locale).toBe('SI,decimal=.,circuit=IEC');
    const diagram = result.capsule?.steps[0]?.diagram;
    expect(diagram?.type).toBe('circuit');
    expect(diagram?.content).not.toMatch(/nested/i);
    expect(specGet(parseSpec('circuit', diagram!.content), 'std')).toBe('iec');

    const compiled = await compileDiagramSpec(diagram!, 'step');
    expect(compiled.ok, compiled.ok ? 'circuit' : compiled.reason).toBe(true);
    if (!compiled.ok) return;
    expect(specGet(parseSpec('circuit', diagram!.content), 'std')?.toLowerCase()).toBe('iec');
    // IEC resistors are rectangles, not IEEE zigzags.
    expect(compiled.scene.strokes.some((s) => s.id === 'R1' && s.kind === 'rect')).toBe(true);
  });
});
