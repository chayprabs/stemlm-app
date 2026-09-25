import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { parseSpec, specHasEmptyDeclaration } from './spec';

describe('figure declaration integrity', () => {
  for (const [type, content, omitted] of [
    ['circuit', 'R_a: input output 2k', 'R_b output 0 5k'],
    ['graph', 'node: A start\nnode: B finish', 'edge A B transition'],
    ['scene', 'kind: fbd\nbody: sled\nforce: W down', 'force N up'],
    ['table', 'kind: matrix\nrow: a,b', 'row c,d'],
  ]) {
    it(`${type} rejects an unparsed declaration instead of drawing a partial figure`, async () => {
      const result = await compileDiagramSpec({ type: type!, content: `${content}\n${omitted}` });
      expect(result.ok).toBe(false);
    });
  }

  for (const [type, content] of [
    ['circuit', 'R_a: input output 2k\nR_b:\n  - output 0 5k'],
    ['graph', 'node: A start\nnode: B finish\nedge:\n  - A B transition'],
    ['scene', 'kind: fbd\nbody: sled\nforce: W down\nforce:\n  - N up'],
    ['graph', 'node: A start\nedge:'],
    ['scene', 'kind: fbd\nbody: sled\nforce: W down\nforce:'],
  ]) {
    it(`${type} rejects an ignored list or empty declaration: ${content}`, async () => {
      const result = await compileDiagramSpec({ type: type!, content: content! });
      expect(result.ok).toBe(false);
    });
  }

  it('does not let a later populated list erase an earlier empty declaration', () => {
    const spec = parseSpec('table', 'row:\nrow:\n  - a,b\n  - c,d');
    expect(specHasEmptyDeclaration(spec, 'row')).toBe(true);
  });

  it('rejects a blank list item instead of dropping a declared row', () => {
    expect(() => parseSpec('table', 'rows:\n  - a,b\n  - \n  - c,d')).toThrow();
  });
});
