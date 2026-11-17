import { describe, expect, it } from 'vitest';
import { compileDiagramStrict } from '@/src/lib/resolve-diagram';
import { isKnownDiagramType } from '@/src/lib/figure/catalog';
import { diagramFromFence, explainFence, isFigureFence } from './index';
import { REFUSED, TRANSLATED } from './corpus';

/** Targets whose compilers are being built separately: until they exist only the spec text is asserted. */
const PENDING_FAMILIES = ['sequence'];

describe('foreign corpus', () => {
  it('covers every notation with at least 60 translations and 20 refusals', () => {
    expect(TRANSLATED.length).toBeGreaterThanOrEqual(60);
    expect(REFUSED.length).toBeGreaterThanOrEqual(20);
    const notations = new Set(TRANSLATED.map((entry) => explainFence(entry.lang, entry.code).result?.notation));
    expect([...notations].sort()).toEqual(['arrows', 'dot', 'markdown-table', 'mermaid']);
    expect(new Set(TRANSLATED.map((entry) => entry.type))).toEqual(new Set(['graph', 'table', 'gantt', 'sequence', 'chart']));
  });

  describe('translates to the exact native spec, which the real compiler draws', () => {
    it.each(TRANSLATED)('$name', async (entry) => {
      const result = diagramFromFence(entry.lang, entry.code);
      expect(result?.diagram).toEqual({ type: entry.type, content: entry.content, ...(entry.caption ? { caption: entry.caption } : {}) });
      expect(result?.notes).toEqual(entry.notes);
      expect(isFigureFence(entry.lang, entry.code)).toBe(true);
      if (!isKnownDiagramType(entry.type)) {
        expect(PENDING_FAMILIES).toContain(entry.type);
        return;
      }
      const compiled = await compileDiagramStrict(result!.diagram);
      expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason).toBe('drawn');
    });
  });

  describe('refuses what it cannot translate faithfully', () => {
    it.each(REFUSED)('$name', (entry) => {
      const outcome = explainFence(entry.lang, entry.code);
      expect(outcome.result).toBeNull();
      expect(outcome.refusal?.reason ?? null).toBe(entry.reason);
      expect(diagramFromFence(entry.lang, entry.code)).toBeNull();
    });
  });

  it('is deterministic: the same source always yields the same spec and ids', () => {
    for (const entry of TRANSLATED) {
      expect(diagramFromFence(entry.lang, entry.code)).toEqual(diagramFromFence(entry.lang, entry.code));
    }
  });
});
