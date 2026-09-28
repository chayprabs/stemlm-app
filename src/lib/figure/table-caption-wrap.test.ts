import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

function svgTexts(svg: string): { text: string; y: number }[] {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return [...doc.querySelectorAll('text')].map((t) => ({ text: t.textContent ?? '', y: Number(t.getAttribute('y') ?? 0) }));
}

// Live Claude 2026-09-27: a correct DFA transition table was hidden (table_caption_exceeds_frame)
// because its one-line caption was wider than the frame.
describe('a table caption longer than one line', () => {
  const rows = [
    'headers: State,on 0,on 1,Meaning',
    'row: q0 (start),q1,q0,no progress toward 01',
    'row: q1,q1,q2,input ends in 0',
    'row: q2 (accept),q1,q0,input ends in 01',
  ];

  it.each([
    'Complete transition function of the DFA for strings ending in 01',
    'Every state keeps the longest suffix that is still a prefix of the target pattern, so no information is lost',
  ])('wraps under the table instead of hiding it: %s', async (caption) => {
    const result = await compileDiagramSpec({ type: 'table', content: ['kind: matrix', ...rows, `caption: ${caption}`].join('\n') });
    console.log('CAPTION_WRAP', result.ok ? 'ok' : JSON.stringify((result as { diagnostic?: unknown }).diagnostic));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const texts = svgTexts(result.svg);
    const words = caption.split(/\s+/);
    const captionTexts = texts.filter((t) => t.text.trim() && caption.includes(t.text.trim()) && t.text.trim().split(/\s+/).length > 1);
    expect(captionTexts.map((t) => t.text.trim()).join(' ')).toBe(words.join(' '));
    const gridBottom = Math.max(...texts.filter((t) => t.text === 'q2 (accept)' || t.text === 'input ends in 01').map((t) => t.y));
    for (const line of captionTexts) expect(line.y).toBeGreaterThan(gridBottom);
  });

  it('still refuses a caption word that cannot fit the frame', async () => {
    const result = await compileDiagramSpec({ type: 'table', content: ['kind: matrix', ...rows, `caption: ${'x'.repeat(400)}`].join('\n') });
    expect(result.ok).toBe(false);
  });
});
