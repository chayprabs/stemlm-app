import { describe, expect, it } from 'vitest';
import { resolveDiagram } from './resolve-diagram';

const complete = 'L: 8\nsupports: pin@0, roller@8\nloads: point 10kN@2\nV: 0 7.5; 2 7.5; 2 -2.5; 8 -2.5\nM: 0 0; 2 15; 8 0\nsign: sagging+';

describe('physical SFD admission in the shared panel/PDF path', () => {
  it.each([
    ['inconsistent shear and moment', complete.replaceAll('7.5', '8.5').replaceAll('-2.5', '-1.5').replace('2 15', '2 17')],
    ['out-of-span ordinates', complete.replace('8 -2.5', '9 -2.5')],
    ['reversed stations', complete.replace('0 7.5; 2 7.5', '2 7.5; 0 7.5')],
    ['incomplete span', complete.replace('8 -2.5', '7 -2.5')],
    ['fixed support drawn as a pin', complete.replace('pin@0', 'fixed@0')],
    ['upward load drawn downward', complete.replace('point 10kN@2', 'point 10kN up@2')],
    ['load magnitude contradicts shear jump', complete.replace('point 10kN@2', 'point 11kN@2')],
    ['negative load drawn downward', complete.replace('point 10kN@2', 'point -10kN@2')],
    ['nonzero end moment at a pin', 'L: 8\nsupports: pin@0, roller@8\nV: 0 0; 8 0\nM: 0 3; 8 3'],
    ['unrepresented concentrated couple', complete.replace('M: 0 0;', 'M: 0 0; 0 2;')],
  ])('hides %s without losing the diagnostic', async (_name, content) => {
    for (const profile of ['step', 'print'] as const) {
      const result = await resolveDiagram({ type: 'sfd', content }, 'light', profile);
      expect(result).toMatchObject({ ok: false, svg: '', overlays: [], diagnostic: { family: 'sfd', stage: 'compile', code: 'malformed' } });
    }
  });

  it.each(['step', 'print'] as const)('admits a balanced point-load figure in %s', async profile => {
    expect(await resolveDiagram({ type: 'sfd', content: complete }, 'light', profile)).toMatchObject({ ok: true });
  });

  it('admits sampled distributed loading with sign-consistent integrals', async () => {
    const content = 'L: 4\nsupports: pin@0, roller@4\nV: 0 2; 2 0; 4 -2\nM: 0 0; 1 1.5; 2 2; 3 1.5; 4 0';
    expect(await resolveDiagram({ type: 'sfd-bmd', content }, 'dark')).toMatchObject({ ok: true });
  });
});
