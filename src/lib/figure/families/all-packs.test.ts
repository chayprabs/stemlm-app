import { describe, expect, it } from 'vitest';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { FAMILY_COMPILERS } from './compilers';
import { FAMILY_MANIFESTS } from './manifest';

// A manifest without a compiler would not fail: the dispatcher falls back to a generic figure, which
// draws something the family never specified. And a pack is only looked at in the step size while it
// is built, so the two larger sizes are checked here for all of them.
describe('every pack family', () => {
  it.each(FAMILY_MANIFESTS.map((manifest) => [manifest.token, manifest] as const))(
    '%s has its own compiler and draws its specimen as written at every size',
    async (token, manifest) => {
      expect(typeof FAMILY_COMPILERS[token]).toBe('function');
      for (const profile of ['step', 'solution', 'print'] as const) {
        const compiled = await compileDiagram({ type: token, content: manifest.specimen }, profile);
        expect(compiled.ok, `${token} at ${profile}: ${compiled.ok ? '' : JSON.stringify(compiled.diagnostic)}`).toBe(true);
        expect(compiled.corrected, `${token} at ${profile} needed repair`).toBeUndefined();
      }
    },
  );
});
