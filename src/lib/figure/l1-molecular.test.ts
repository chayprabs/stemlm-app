import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import type { CompileSuccess } from './types';

function requireSuccess(content: string): CompileSuccess {
  const result = compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' });
  expect(result.ok, result.ok ? undefined : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result;
}

describe('L1 molecular scene primitive', () => {
  it.each([
    [
      'PCR strand extension',
      [
        'kind: molecular',
        'strand: template dna 3to5',
        'strand: coding dna 5to3',
        'primer: forward on template 5to3',
        'primer: reverse on coding 5to3',
        'fragment: amplicon on template 5to3',
        'actor: polymerase dna-polymerase',
        'relation: polymerase synthesizes amplicon',
      ].join('\n'),
      ['strand-template', 'strand-coding', 'primer-forward', 'primer-reverse', 'fragment-amplicon', 'actor-polymerase'],
    ],
    [
      'replication fork',
      [
        'kind: molecular',
        'strand: leading-template dna 3to5',
        'strand: lagging-template dna 5to3',
        'fork: replication-fork leading-template lagging-template',
        'primer: rna-primer on lagging-template 5to3',
        'fragment: okazaki-1 on lagging-template 5to3',
        'actor: helicase helicase',
        'actor: primase primase',
        'relation: helicase opens replication-fork',
      ].join('\n'),
      ['fork-replication-fork', 'primer-rna-primer', 'fragment-okazaki-1', 'actor-helicase', 'actor-primase'],
    ],
    [
      'transcription bubble',
      [
        'kind: molecular',
        'strand: coding dna 5to3',
        'strand: template dna 3to5',
        'bubble: transcription-bubble coding template polymerase',
        'product: nascent-rna rna from template 5to3',
        'actor: polymerase rna-polymerase',
        'relation: polymerase synthesizes nascent-rna',
      ].join('\n'),
      ['bubble-transcription-bubble', 'product-nascent-rna', 'actor-polymerase'],
    ],
    [
      'translation and gene expression',
      [
        'kind: molecular',
        'strand: mrna rna 5to3',
        'actor: ribosome ribosome',
        'actor: adapter trna',
        'product: peptide polypeptide from mrna 5to3',
        'relation: ribosome reads mrna',
        'relation: adapter delivers peptide',
      ].join('\n'),
      ['strand-mrna', 'actor-ribosome', 'actor-adapter', 'product-peptide'],
    ],
  ])('renders %s with semantic geometry', (_name, content, ids) => {
    const compiled = requireSuccess(content);
    const actualIds = new Set([
      ...compiled.scene.nodes.map((node) => node.id),
      ...compiled.scene.strokes.map((stroke) => stroke.id),
      ...compiled.scene.labels.map((label) => label.id),
    ]);
    for (const id of ids) expect(actualIds.has(id)).toBe(true);
    expect(compiled.scene.strokes.length).toBeGreaterThan(4);
    expect(compiled.svg).toMatch(/<svg\b/);
  });

  it('fails closed for an incomplete molecular reference', () => {
    const result = compileScene(parseSpec('scene', [
      'kind: molecular',
      'strand: template dna 3to5',
      'primer: p1 on missing 5to3',
    ].join('\n')), { profile: 'step', family: 'scene' });
    expect(result).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));
  });

  it.each([
    ['an unsupported relation', 'kind: molecular\nstrand: a dna 5to3\nactor: polymerase polymerase\nrelation: polymerase catalyzes a'],
    ['a duplicate cross-kind id', 'kind: molecular\nstrand: enzyme dna 5to3\nactor: enzyme polymerase'],
    ['a product id collision', 'kind: molecular\nstrand: template dna 3to5\nproduct: template rna from template 5to3'],
    ['multiple topologies', 'kind: molecular\nstrand: a dna 5to3\nstrand: b dna 3to5\nactor: polymerase polymerase\nfork: f1 a b\nbubble: b1 a b polymerase'],
    ['an invalid orientation', 'kind: molecular\nstrand: a dna sideways\nactor: enzyme polymerase'],
  ])('fails closed for %s', (_name, content) => {
    const result = compileScene(parseSpec('scene', content), { profile: 'step', family: 'scene' });
    expect(result).toEqual(expect.objectContaining({ ok: false, code: 'malformed' }));
  });

  it('keeps fork products and fragments attached to their declared source arms', () => {
    const compiled = requireSuccess([
      'kind: molecular',
      'strand: leading-template dna 3to5',
      'strand: lagging-template dna 5to3',
      'fork: replication-fork leading-template lagging-template',
      'product: leading-product dna from leading-template 5to3',
      'fragment: okazaki-1 on lagging-template 5to3',
      'fragment: okazaki-2 on lagging-template 5to3',
      'actor: helicase helicase',
      'actor: polymerase polymerase',
      'relation: polymerase extends leading-product',
      'relation: polymerase extends okazaki-1',
      'relation: polymerase extends okazaki-2',
    ].join('\n'));
    const leading = compiled.scene.strokes.find((stroke) => stroke.id === 'strand-leading-template');
    const lagging = compiled.scene.strokes.find((stroke) => stroke.id === 'strand-lagging-template');
    const product = compiled.scene.strokes.find((stroke) => stroke.id === 'product-leading-product');
    const fragments = compiled.scene.strokes.filter((stroke) => stroke.id.startsWith('fragment-okazaki-'));
    expect(leading?.points.length).toBeGreaterThanOrEqual(4);
    expect(lagging?.points.length).toBeGreaterThanOrEqual(4);
    expect(product?.points.length).toBeGreaterThanOrEqual(4);
    expect(fragments).toHaveLength(2);
    const leadingY = leading?.points[1] ?? 0;
    const laggingY = lagging?.points[1] ?? 0;
    expect(Math.abs((product?.points[1] ?? 0) - leadingY)).toBeLessThan(24);
    expect(fragments.every((stroke) => Math.abs((stroke.points[1] ?? 0) - laggingY) < 24)).toBe(true);
    expect(compiled.scene.strokes.filter((stroke) => stroke.id.startsWith('relation-'))).toHaveLength(0);
  });

  it('writes representative molecular renders for raster inspection', async () => {
    const cases = [
      ['pcr', ['kind: molecular', 'strand: template dna 3to5', 'strand: coding dna 5to3', 'primer: forward on template 5to3', 'fragment: amplicon on template 5to3', 'actor: polymerase dna-polymerase'].join('\n')],
      ['fork', ['kind: molecular', 'strand: leading-template dna 3to5', 'strand: lagging-template dna 5to3', 'fork: replication-fork leading-template lagging-template', 'product: leading-product dna from leading-template 5to3', 'fragment: okazaki-1 on lagging-template 5to3', 'fragment: okazaki-2 on lagging-template 5to3', 'actor: helicase helicase', 'actor: polymerase polymerase', 'relation: polymerase extends leading-product', 'relation: polymerase extends okazaki-1', 'relation: polymerase extends okazaki-2'].join('\n')],
      ['bubble', ['kind: molecular', 'strand: coding dna 5to3', 'strand: template dna 3to5', 'actor: polymerase rna-polymerase', 'bubble: bubble coding template polymerase', 'product: transcript rna from template 5to3'].join('\n')],
      ['translation', ['kind: molecular', 'strand: mrna rna 5to3', 'actor: ribosome ribosome', 'actor: adapter trna', 'product: peptide polypeptide from mrna 5to3'].join('\n')],
    ] as const;
    const outputDir = resolve('artifacts/figlab/renders/L1-molecular');
    await mkdir(outputDir, { recursive: true });
    for (const [name, content] of cases) {
      const result = requireSuccess(content);
      await writeFile(join(outputDir, `${name}.svg`), result.svg, 'utf8');
    }
    expect(cases).toHaveLength(4);
  });
});
