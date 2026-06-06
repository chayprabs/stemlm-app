import { describe, it, expect } from 'vitest';
import { parse, parseCapsule } from './parser';
import { THEVENIN_ELECTRICAL } from './__fixtures__';
import { sanitizeSvg } from '@/src/lib/sanitize';

// ---------------------------------------------------------------------------
// 1. Thevenin capsule fixture — parse & structural validation
// ---------------------------------------------------------------------------

describe('Thevenin equivalent capsule (parse)', () => {
  const result = parse(THEVENIN_ELECTRICAL);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('parses subject as Electrical', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
  });

  it('parses topic', () => {
    expect(result.capsule?.meta.topic).toContain('Thevenin');
  });

  it('has 7 steps', () => {
    expect(result.capsule?.steps).toHaveLength(7);
  });

  it('step titles cover the full Thevenin workflow', () => {
    const titles = result.capsule!.steps.map((s) => s.title);
    expect(titles[0]).toContain('Label');
    expect(titles[1]).toContain('KVL');
    expect(titles[2]).toContain('loop current');
    expect(titles[3]).toContain('Vth');
    expect(titles[4]).toContain('Kill');
    expect(titles[5]).toContain('Rth');
    expect(titles[6]).toContain('Thevenin equivalent');
  });

  it('step 1 diagram is SVG and contains key elements', () => {
    const diag = result.capsule!.steps[0]!.diagram;
    expect(diag?.type).toBe('svg');
    expect(diag?.content).toContain('<svg');
    expect(diag?.content).toContain('<g');
    expect(diag?.content).toContain('<ellipse');
    expect(diag?.content).toContain('<polyline');
    expect(diag?.content).toContain('10V');
    expect(diag?.content).toContain('2Ω');
  });

  it('step 4 diagram labels Vth', () => {
    const diag = result.capsule!.steps[3]!.diagram;
    expect(diag?.type).toBe('svg');
    expect(diag?.content).toContain('70/11');
  });

  it('step 5 (sources killed) diagram has ground symbol polyline', () => {
    const diag = result.capsule!.steps[4]!.diagram;
    expect(diag?.content).toContain('<polyline');
    expect(diag?.content).toContain('GND');
  });

  it('step 7 diagram shows the final Thevenin equivalent', () => {
    const diag = result.capsule!.steps[6]!.diagram;
    expect(diag?.content).toContain('Rth');
    expect(diag?.content).toContain('Vth');
    expect(diag?.content).toContain('<ellipse');
  });

  it('solution contains the final numeric answers', () => {
    const sol = result.capsule!.solution;
    expect(sol).toContain('70');
    expect(sol).toContain('24');
  });

  it('solution has one inline SVG diagram', () => {
    expect(result.capsule!.solutionDiagrams).toHaveLength(1);
    expect(result.capsule!.solutionDiagrams[0]!.type).toBe('svg');
  });

  it('formulas appear on appropriate steps', () => {
    expect(result.capsule!.steps[1]!.formula).toContain('10');
    expect(result.capsule!.steps[2]!.formula).toContain('\\frac{5}{11}');
    expect(result.capsule!.steps[3]!.formula).toContain('\\frac{70}{11}');
    expect(result.capsule!.steps[5]!.formula).toContain('\\frac{24}{11}');
  });

  it('quickcheck is present on step 1 and step 7', () => {
    expect(result.capsule!.steps[0]!.quickCheck?.question).toContain('loop');
    expect(result.capsule!.steps[6]!.quickCheck?.question).toContain('load');
  });

  it('followup is present on the final step', () => {
    expect(result.capsule!.steps[6]!.followup).toContain('Norton');
  });

  it('takeaways are present on steps 1, 5, and 7', () => {
    expect(result.capsule!.steps[0]!.takeaway).toBeTruthy();
    expect(result.capsule!.steps[4]!.takeaway).toContain('short');
    expect(result.capsule!.steps[6]!.takeaway).toContain('load');
  });
});

// ---------------------------------------------------------------------------
// 2. Complex multi-element SVG sanitization — ensure realistic circuit
//    elements survive the sanitizer intact.
// ---------------------------------------------------------------------------

describe('SVG sanitizer preserves complex circuit elements', () => {
  const CIRCUIT_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">',
    '  <g id="circuit-group">',
    '    <line x1="40" y1="240" x2="40" y2="40" stroke="#222" stroke-width="2"/>',
    '    <rect x="120" y="28" width="60" height="24" rx="4" fill="none" stroke="#222" stroke-width="2"/>',
    '    <ellipse cx="220" cy="40" rx="6" ry="6" fill="#e53e3e"/>',
    '    <circle cx="380" cy="40" r="6" fill="#3182ce"/>',
    '    <polyline points="40,240 40,260" stroke="#222" stroke-width="2" fill="none"/>',
    '    <polygon points="100,10 120,40 80,40" fill="#ddd" stroke="#222" stroke-width="1"/>',
    '    <path d="M0,0 L10,5 L0,10 Z" fill="#222"/>',
    '    <text x="10" y="140" font-size="14" fill="#222">10V</text>',
    '    <text x="135" y="46" font-size="12" fill="#222">2Ω</text>',
    '  </g>',
    '  <g id="labels">',
    '    <text x="210" y="28" font-size="14" font-weight="bold" fill="#e53e3e">A</text>',
    '    <text x="370" y="28" font-size="14" font-weight="bold" fill="#3182ce">B</text>',
    '    <text x="20" y="258" font-size="12" fill="#888">GND</text>',
    '  </g>',
    '</svg>',
  ].join('\n');

  it('preserves <g> group elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<g');
  });

  it('preserves <ellipse> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('ellipse');
  });

  it('preserves <polyline> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('polyline');
  });

  it('preserves <polygon> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('polygon');
  });

  it('preserves <circle> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('circle');
  });

  it('preserves <rect> with rx attribute', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('rect');
    expect(out).toContain('rx=');
  });

  it('preserves <path> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<path');
  });

  it('preserves <text> with font attributes', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<text');
    expect(out).toContain('font-size');
  });

  it('preserves <line> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<line');
  });

  it('preserves node label text A, B, GND', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('>A<');
    expect(out).toContain('>B<');
    expect(out).toContain('GND');
  });

  it('preserves fill and stroke attributes', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('fill=');
    expect(out).toContain('stroke=');
  });

  it('preserves stroke-dasharray for dashed lines', () => {
    const dashed = '<svg viewBox="0 0 100 100"><line x1="0" y1="0" x2="100" y2="100" stroke="#222" stroke-width="2" stroke-dasharray="6,3"/></svg>';
    const out = sanitizeSvg(dashed);
    expect(out).toContain('stroke-dasharray');
  });

  it('preserves multiple resistors and voltage sources in one diagram', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('10V');
    expect(out).toContain('2Ω');
  });

  it('strips dangerous attributes but keeps the host element', () => {
    const evil = [
      '<svg viewBox="0 0 100 100">',
      '  <g id="ok"><ellipse cx="50" cy="50" rx="10" ry="10"/></g>',
      '  <script>alert("xss")</script>',
      '  <polyline points="0,0 50,50" onclick="evil()"/>',
      '</svg>',
    ].join('\n');
    const out = sanitizeSvg(evil);
    expect(out).toContain('ellipse');
    expect(out).toContain('polyline');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).not.toContain('onclick');
  });
});

// ---------------------------------------------------------------------------
// 3. Full round-trip: parse Thevenin fixture, then sanitize each SVG diagram.
// ---------------------------------------------------------------------------

describe('Thevenin SVG diagrams survive sanitization round-trip', () => {
  const result = parse(THEVENIN_ELECTRICAL);
  const steps = result.capsule!.steps;

  it('all step SVG diagrams survive sanitization', () => {
    for (const step of steps) {
      if (step.diagram?.type === 'svg') {
        const clean = sanitizeSvg(step.diagram.content);
        expect(clean).toContain('<svg');
        expect(clean.length).toBeGreaterThan(50);
      }
    }
  });

  it('step 1 SVG retains g, ellipse, polyline after sanitization', () => {
    const clean = sanitizeSvg(steps[0]!.diagram!.content);
    expect(clean).toContain('<g');
    expect(clean).toContain('ellipse');
    expect(clean).toContain('polyline');
  });

  it('step 5 (sources killed) SVG retains g, ellipse, polyline after sanitization', () => {
    const clean = sanitizeSvg(steps[4]!.diagram!.content);
    expect(clean).toContain('<g');
    expect(clean).toContain('ellipse');
    expect(clean).toContain('polyline');
  });

  it('step 7 (final equivalent) SVG retains ellipse, polyline after sanitization', () => {
    const clean = sanitizeSvg(steps[6]!.diagram!.content);
    expect(clean).toContain('ellipse');
    expect(clean).toContain('polyline');
  });

  it('solution diagram survives sanitization', () => {
    const solDiag = result.capsule!.solutionDiagrams[0]!;
    const clean = sanitizeSvg(solDiag.content);
    expect(clean).toContain('<svg');
    expect(clean).toContain('ellipse');
    expect(clean).toContain('<g');
  });
});
