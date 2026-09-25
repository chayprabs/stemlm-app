import { describe, expect, it } from 'vitest';
import { parseSpec } from './spec';
import {
  compileAnatomy,
  compileCellBio,
  compileCycle,
  compileMembrane,
  compileNewick,
  compileRama,
} from './leftovers/rest-bio';
import type { CompileResult } from './types';

const ctx = (family: string) => ({ family, profile: 'step' as const });

function expectFailure(result: CompileResult, reason: RegExp): void {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toMatch(reason);
}

function expectMalformed(result: CompileResult, reason: RegExp): void {
  expectFailure(result, reason);
  if (!result.ok) expect(result.code).toBe('malformed');
}

describe('L10 release remediation', () => {
  it('rejects a directed-cycle edge that is not represented by the declared order', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: directed-cycle',
      'node: A process',
      'node: B process',
      'edge: A B waits',
      'edge: B A waits',
      'edge: A A ignored',
      'order: A -> B -> A',
    ].join('\n')), ctx('cycle'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/edge|order|represented|cycle/i);
  });

  it('rejects an explicitly unsupported cycle kind instead of using the generic renderer', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: unsupported',
      'node: A source',
      'node: B target',
      'edge: A B connects',
    ].join('\n')), ctx('cycle'));
    expectMalformed(result, /unsupported.*cycle.*kind|unsupported.*kind/i);
  });

  const validConic = [
    'kind: conic',
    'node: parabola locus',
    'node: axis symmetry-line',
    'node: directrix line',
    'node: vertex point',
    'node: focus point',
    'edge: parabola axis symmetric-about',
    'edge: vertex axis lies-on',
    'edge: focus axis lies-on',
  ];

  const validMembrane = [
    'kind: membrane-cycle',
    'state: A inward-open',
    'state: B occluded',
    'order: A -> B -> A',
  ];

  it('rejects an empty Ramachandran point in mixed input', () => {
    expectMalformed(compileRama(parseSpec('rama', 'kind: ramachandran\npoint: 0 0\npoint:\npoint: 30 40'), ctx('rama')), /rama.*point|empty/i);
  });

  it('rejects an explicitly unsupported Ramachandran kind', () => {
    const result = compileRama(parseSpec('rama', 'kind: unsupported\npoint: 0 0'), ctx('rama'));
    expectMalformed(result, /unsupported.*rama.*kind|unsupported.*kind/i);
  });

  it('rejects a duplicate directed cycle edge', () => {
    expectMalformed(compileCycle(parseSpec('cycle', [
      'kind: directed-cycle',
      'node: A process',
      'node: B process',
      'node: C process',
      'edge: A B waits',
      'edge: A B waits',
      'edge: B C waits',
      'edge: C A waits',
      'order: A -> B -> C -> A',
    ].join('\n')), ctx('cycle')), /duplicate|cycle.*edge/i);
  });

  it('rejects an empty segment in a cycle order', () => {
    expectMalformed(compileCycle(parseSpec('cycle', [
      'kind: directed-cycle',
      'node: A process',
      'node: B process',
      'node: C process',
      'edge: A B waits',
      'edge: B C waits',
      'edge: C A waits',
      'order: A -> B -> -> C -> A',
    ].join('\n')), ctx('cycle')), /order|empty/i);
  });

  it('rejects duplicate phase groups', () => {
    expectMalformed(compileCycle(parseSpec('cycle', [
      'kind: phase-cycle',
      'node: A phase',
      'node: B group',
      'group: B contains=x,y',
      'group: B contains=x,y',
      'order: A -> B -> A',
    ].join('\n')), ctx('cycle')), /duplicate|group/i);
  });

  it('rejects a conic edge without a represented relation', () => {
    expectMalformed(compileAnatomy(parseSpec('anatomy', [...validConic, 'edge: focus directrix distance'].join('\n')), ctx('anatomy')), /conic.*edge|unsupported|represented/i);
  });

  it('rejects conic declarations that are duplicated or not represented', () => {
    const duplicateEdge = compileAnatomy(parseSpec('anatomy', [
      ...validConic,
      'edge: focus axis lies-on',
    ].join('\n')), ctx('anatomy'));
    expectMalformed(duplicateEdge, /duplicate|conic|represented/i);

    const extraNode = compileAnatomy(parseSpec('anatomy', [
      ...validConic,
      'node: auxiliary annotation',
    ].join('\n')), ctx('anatomy'));
    expectMalformed(extraNode, /extra|unrepresented|conic|node/i);
  });

  it('rejects a phase-cycle order that omits a declared phase', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: phase-cycle',
      'node: G1 phase',
      'node: S phase',
      'node: G2 phase',
      'order: G1 -> S -> G1',
    ].join('\n')), ctx('cycle'));
    expectMalformed(result, /order|phase|cycle/i);
  });

  it('rejects a phase-cycle group member that is not a declared phase node', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: phase-cycle',
      'node: G1 phase',
      'node: S phase',
      'node: G2 phase',
      'node: M group',
      'group: M contains=prophase,unknown-phase',
      'order: G1 -> S -> G2 -> M -> G1',
    ].join('\n')), ctx('cycle'));
    expectMalformed(result, /unknown|group|phase|declared/i);
  });

  it('rejects a paired anatomy node that is not in a group', () => {
    expectMalformed(compileAnatomy(parseSpec('anatomy', [
      'kind: paired-apparatus',
      'node: A paired',
      'node: B paired',
      'node: C paired',
      'group: left contains=A',
      'group: right contains=B',
      'edge: left right compares',
    ].join('\n')), ctx('anatomy')), /unlisted|group|paired/i);
  });

  it('rejects duplicate labels', () => {
    expectMalformed(compileAnatomy(parseSpec('anatomy', [...validConic, 'label: Focus attaches=focus', 'label: Focus attaches=focus'].join('\n')), ctx('anatomy')), /duplicate|label/i);
  });

  it('rejects an empty label declaration', () => {
    expectMalformed(compileAnatomy(parseSpec('anatomy', [...validConic, 'label:'].join('\n')), ctx('anatomy')), /empty|label|malformed/i);
  });

  it('rejects an empty membrane direction declaration', () => {
    expectMalformed(compileMembrane(parseSpec('membrane', [...validMembrane, 'direction:'].join('\n')), ctx('membrane')), /empty|direction/i);
  });

  it('rejects duplicate membrane directions', () => {
    expectMalformed(compileMembrane(parseSpec('membrane', [...validMembrane, 'direction: sodium outward', 'direction: sodium outward'].join('\n')), ctx('membrane')), /duplicate|direction/i);
  });

  it('rejects malformed node declarations in every graph-backed bio compiler', () => {
    expectFailure(compileCellBio(parseSpec('cell', [
      'kind: parallel-source',
      'node: A terminal',
      'node: B terminal',
      'node: malformed',
      'edge: A B source-branch epsilon resistance',
    ].join('\n')), ctx('cell')), /malformed-node/);

    expectFailure(compileCycle(parseSpec('cycle', [
      'kind: directed-cycle',
      'node: A process',
      'node: B process',
      'node: malformed',
      'order: A -> B -> A',
    ].join('\n')), ctx('cycle')), /malformed-node/);

    expectFailure(compileAnatomy(parseSpec('anatomy', [
      'kind: conic',
      'node: parabola locus',
      'node: axis symmetry-line',
      'node: directrix line',
      'node: vertex point',
      'node: focus point',
      'node: malformed',
    ].join('\n')), ctx('anatomy')), /malformed-node/);
  });

  it('rejects malformed edge declarations instead of compiling a partial graph', () => {
    expectFailure(compileCellBio(parseSpec('cell', [
      'kind: parallel-source',
      'node: A terminal',
      'node: B terminal',
      'edge: A B source-branch epsilon resistance',
      'edge: malformed',
    ].join('\n')), ctx('cell')), /malformed-edge/);

    expectFailure(compileCycle(parseSpec('cycle', [
      'kind: directed-weighted',
      'node: A source',
      'node: B target',
      'edge: A B weight=1',
      'edge: malformed',
    ].join('\n')), ctx('cycle')), /malformed-edge/);

    expectFailure(compileAnatomy(parseSpec('anatomy', [
      'kind: conic',
      'node: parabola locus',
      'node: axis symmetry-line',
      'node: directrix line',
      'node: vertex point',
      'node: focus point',
      'edge: vertex axis lies-on',
      'edge: malformed',
    ].join('\n')), ctx('anatomy')), /malformed-edge/);
  });

  it('renders every paired group that fits the frame', () => {
    const result = compileAnatomy(parseSpec('anatomy', [
      'organ: paired apparatus',
      'kind: paired-apparatus',
      'node: A paired',
      'node: B paired',
      'node: C paired',
      'group: left contains=A',
      'group: middle contains=B',
      'group: right contains=C',
      'edge: left middle compares',
    ].join('\n')), ctx('anatomy'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.panels?.filter((panel) => panel.id.endsWith('-panel'))).toHaveLength(3);
      expect(result.scene.labels.map((label) => label.text)).toEqual(expect.arrayContaining(['paired', 'paired', 'paired']));
    }
  });

  it('rejects unsupported paired-apparatus edges instead of dropping them', () => {
    const result = compileAnatomy(parseSpec('anatomy', [
      'kind: paired-apparatus',
      'node: A paired',
      'node: B paired',
      'group: left contains=A',
      'group: right contains=B',
      'edge: left right compares',
      'edge: left right unrelated',
    ].join('\n')), ctx('anatomy'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/edge|relation|unsupported|paired/i);
  });

  it('rejects a directed-weighted edge without a numeric weight', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: directed-weighted',
      'node: A source',
      'node: B target',
      'edge: A B connected',
    ].join('\n')), ctx('cycle'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/weight|edge|weighted/i);
  });

  it('rejects a directed-weighted edge that targets an undeclared node', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: directed-weighted',
      'node: A source',
      'node: B target',
      'edge: A B weight=1',
      'edge: B ghost weight=1',
    ].join('\n')), ctx('cycle'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/endpoint|node|declared|ghost/i);
  });

  it('refuses nested Newick until its full topology can be represented', () => {
    const result = compileNewick(parseSpec('newick', 'newick: (A,(B,C)D)E;'), ctx('newick'));
    expectFailure(result, /newick.*nested|nested.*newick/i);
    if (!result.ok) expect(result.code).toBe('refused');
  });

  it('rejects every malformed Ramachandran point, including mixed input', () => {
    const result = compileRama(parseSpec('rama', [
      'kind: ramachandran',
      'point: 0 0',
      'point: nope 90',
      'point: 30 40 extra',
    ].join('\n')), ctx('rama'));
    expectFailure(result, /rama.*point.*malformed|malformed.*rama.*point/i);
  });
});
