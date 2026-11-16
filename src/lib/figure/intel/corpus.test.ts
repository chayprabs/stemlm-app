import { describe, expect, it } from 'vitest';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { repairDiagram } from './repair';
import { REPAIRABLE, UNTOUCHABLE } from './corpus';

describe('repair corpus: notation the strict compiler rejects', () => {
  it('holds at least 120 repairable and 30 untouchable cases with unique names', () => {
    expect(REPAIRABLE.length).toBeGreaterThanOrEqual(120);
    expect(UNTOUCHABLE.length).toBeGreaterThanOrEqual(30);
    const names = [...REPAIRABLE, ...UNTOUCHABLE].map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const entry of REPAIRABLE) {
    it(entry.name, async () => {
      const original = { type: entry.type, content: entry.content };
      expect((await compileDiagram(original)).ok, 'the source must fail the strict compiler').toBe(false);
      const result = repairDiagram(original);
      expect(result.diagram.content).toBe(entry.expect);
      expect(result.diagram.type).toBe(entry.expectType ?? entry.type);
      expect(result.repairs.length).toBeGreaterThan(0);
      const compiled = await compileDiagram(result.diagram);
      expect(compiled.ok ? '' : compiled.diagnostic.reason).toBe('');
      // Idempotent: the repaired spec is a fixed point.
      const again = repairDiagram(result.diagram);
      expect(again.repairs).toEqual([]);
      expect(again.diagram).toBe(result.diagram);
      // The input object is never mutated.
      expect(original).toEqual({ type: entry.type, content: entry.content });
    });
  }
});

describe('repair corpus: content and ambiguity are never repaired', () => {
  for (const entry of UNTOUCHABLE) {
    it(`${entry.name} (${entry.why})`, async () => {
      const result = repairDiagram({ type: entry.type, content: entry.content });
      expect((await compileDiagram(result.diagram)).ok, 'the figure must stay hidden').toBe(false);
      for (const text of entry.keeps ?? []) expect(result.diagram.content).toContain(text);
      expect(repairDiagram(result.diagram).repairs).toEqual([]);
    });
  }
});

describe('repair corpus: compile rate', () => {
  it('draws every repairable figure and none of the untouchable ones', async () => {
    let strict = 0;
    let repaired = 0;
    for (const entry of REPAIRABLE) {
      const original = { type: entry.type, content: entry.content };
      if ((await compileDiagram(original)).ok) strict++;
      if ((await compileDiagram(repairDiagram(original).diagram)).ok) repaired++;
    }
    let leaked = 0;
    for (const entry of UNTOUCHABLE) {
      if ((await compileDiagram(repairDiagram({ type: entry.type, content: entry.content }).diagram)).ok) leaked++;
    }
    console.log(`[repair corpus] strict compiler alone: ${strict}/${REPAIRABLE.length}; with repair: ${repaired}/${REPAIRABLE.length}; untouchable figures drawn: ${leaked}/${UNTOUCHABLE.length}`);
    expect(strict).toBe(0);
    expect(repaired).toBe(REPAIRABLE.length);
    expect(leaked).toBe(0);
  });
});
