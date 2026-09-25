import { describe, expect, it } from 'vitest';
import { FAMILY_CATALOG } from './catalog';
import { compileDiagramSpec } from './compile';

describe('catalog/engine key agreement', () => {
  for (const [family, def] of Object.entries(FAMILY_CATALOG)) {
    if (def.kind === 'hatch' || def.kind === 'refuse') continue;
    const variants = def.variants ? Object.entries(def.variants) : [['1', undefined] as const];
    for (const [kind, variant] of variants) {
    for (const key of new Set([...(def.required ?? []), ...(def.requiredAny ?? []), ...(variant?.allowed ?? [])])) {
      it(`${family}.${kind}.${key} is not an unsupported engine key`, async () => {
        const content = [...new Set([...(def.required ?? []), ...(variant?.required ?? []), ...(variant?.requiredAny.slice(0, 1) ?? []), key])]
          .map((name) => `${name}: ${name === 'kind' ? kind : '1'}`).join('\n');
        const result = await compileDiagramSpec({ type: family, content });
        if (!result.ok) {
          expect(result.code).not.toBe('throw');
          expect(result.reason.toLowerCase()).not.toMatch(new RegExp(`unsupported[^\\n]*key[: _]+${key.toLowerCase()}\\b`));
        }
      });
    }
    }
  }

  it('every advertised phasor alternative actually renders a vector', async () => {
    for (const key of FAMILY_CATALOG.phasor!.requiredAny!) {
      const result = await compileDiagramSpec({ type: 'phasor', content: `${key}: ${key === 'vec' ? 'A 1∠0' : '1 0'}` });
      expect(result.ok, key).toBe(true);
    }
  });
});
