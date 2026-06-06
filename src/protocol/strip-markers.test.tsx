import { describe, it, expect } from 'vitest';
import { parseCapsule } from './parser';
import { normalizeCapsuleText, stripProtocolMarkers } from './strip-markers';

describe('stripProtocolMarkers', () => {
  it('removes inline @formulaend glued to a formula line', () => {
    expect(stripProtocolMarkers('$$R = \\frac{u^2}{g}$$ @formulaend')).toBe('$$R = \\frac{u^2}{g}$$');
  });

  it('removes inline @bodyend and @takeawayend', () => {
    expect(stripProtocolMarkers('Range assumes level ground. @bodyend')).toBe(
      'Range assumes level ground.',
    );
    expect(stripProtocolMarkers('Same height launch and landing. @takeawayend')).toBe(
      'Same height launch and landing.',
    );
  });

  it('removes canonical @endformula and standalone marker lines', () => {
    expect(stripProtocolMarkers('$$x^2$$\n@endformula\nmore')).toBe('$$x^2$$\nmore');
    expect(stripProtocolMarkers('@bodyend\nActual text')).toBe('Actual text');
  });

  it('removes @diagram type=svg marker lines', () => {
    expect(stripProtocolMarkers('Before\n@diagram type=svg\nAfter')).toBe('Before\nAfter');
  });
});

describe('normalizeCapsuleText', () => {
  it('splits inline @formulaend onto its own @endformula line', () => {
    const raw = '@formula\n$$R = 1$$ @formulaend\n@body\nHi\n@bodyend';
    const normalized = normalizeCapsuleText(raw);
    expect(normalized).toContain('$$R = 1$$\n@endformula');
    expect(normalized).toContain('Hi\n@endbody');
  });
});

describe('parseCapsule marker stripping', () => {
  it('never leaves @formulaend in stored formula, body, or takeaway', () => {
    const r = parseCapsule(
      [
        '@meta',
        'subject: Physics',
        'topic: Projectile range',
        '@endmeta',
        '@step',
        'title: Choose the range formula',
        '@formula',
        '$$R = \\frac{u^2\\sin(2\\theta)}{g}$$ @formulaend',
        '@body',
        'Horizontal range from ground level. @bodyend',
        '@takeaway',
        'Same launch and landing height. @takeawayend',
        '@endstep',
        '@solution',
        'Final answer here. @solutionend',
        '@endsolution',
        '@end',
      ].join('\n'),
    );
    const step = r.capsule!.steps[0]!;
    expect(step.formula).not.toMatch(/@/);
    expect(step.body).not.toMatch(/@/);
    expect(step.takeaway).not.toMatch(/@/);
    expect(r.capsule!.solution).not.toMatch(/@solutionend/);
  });
});
