import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from '@/src/lib/figure/compile';
import { canonicalizeDiagramType } from '@/src/lib/figure/catalog';
import { assembleProtocolFile } from './protocol';
import type { Diagram } from './types';

function protocolExemplars(): Diagram[] {
  const diagrams: Diagram[] = [];
  const pattern = /^@diagram\b[^\r\n]*\r?\n([\s\S]*?)^@enddiagram\s*$/gim;
  for (const match of assembleProtocolFile().matchAll(pattern)) {
    const opening = match[0].slice(0, match[0].indexOf('\n'));
    const type = /\btype=([^\s]+)/i.exec(opening)?.[1];
    if (!type || /^<.*>$/.test(type)) continue;
    diagrams.push({
      id: /\bid=([^\s]+)/i.exec(opening)?.[1] ?? 'f1',
      type: canonicalizeDiagramType(type),
      content: (match[1] ?? '').trim(),
    });
  }
  return diagrams;
}

describe('attached protocol diagram exemplars', () => {
  it('compiles every shipped @diagram exemplar', async () => {
    const exemplars = protocolExemplars();
    expect(exemplars.length).toBeGreaterThan(0);

    const results = await Promise.all(exemplars.map((diagram) => compileDiagramSpec(diagram)));
    expect(results.every((result) => result.ok)).toBe(true);
  });
});
