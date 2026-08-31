import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import type { CompileSuccess, Scene } from './types';

function graph(content: string) {
  return compileDiagramSpec({ type: 'graph', content }, 'step');
}

function success(result: Awaited<ReturnType<typeof graph>>): CompileSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result;
}

function edgeId(index: number, from: string, to: string): string {
  return `edge-${index}-${encodeURIComponent(from)}-${encodeURIComponent(to)}`;
}

async function saveRender(id: string, result: CompileSuccess): Promise<void> {
  const directory = join(process.cwd(), 'artifacts', 'figlab', 'renders', 'L4');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${id}.svg`), result.svg, 'utf8');
}

function certificate(scene: Scene, expectedNodes: string[], expectedEdges: Array<{ from: string; to: string }>): boolean {
  const nodeIds = new Set(scene.nodes.map((node) => node.id));
  if (nodeIds.size !== expectedNodes.length || expectedNodes.some((id) => !nodeIds.has(id))) return false;
  return expectedEdges.every((edge, index) =>
    scene.strokes.some((stroke) => stroke.id === edgeId(index, edge.from, edge.to) && stroke.role === 'connector'),
  );
}

describe('L4 graph capability probes', () => {
  it('retains labelled semantic nodes, typed directed edges, and rankdir', async () => {
    const result = success(await graph([
      'node: source Input',
      'node: parse Parse',
      'node: emit Emit',
      'edge: source parse ordered-flow',
      'edge: parse emit directed-flow',
      'rankdir: LR',
    ].join('\n')));

    expect(result.scene.nodes.map((node) => node.id)).toEqual(['source', 'parse', 'emit']);
    expect(result.scene.strokes.filter((stroke) => stroke.role === 'connector')).toHaveLength(2);
    expect(result.scene.labels.filter((label) => label.anchorId?.startsWith('edge-'))).toHaveLength(2);
    const source = result.scene.nodes.find((node) => node.id === 'source')!;
    const emit = result.scene.nodes.find((node) => node.id === 'emit')!;
    expect(source.bbox.x).toBeLessThan(emit.bbox.x);
    await saveRender('directed-pipeline', result);
  });

  it('preserves cycles, self-loops, and antiparallel relations with distinct routed geometry', async () => {
    const result = success(await graph([
      'node: a A',
      'node: b B',
      'edge: a b waits-for',
      'edge: b a holds',
      'edge: a a retry',
      'rankdir: TB',
    ].join('\n')));

    const pair = result.scene.strokes.filter((stroke) => stroke.id === edgeId(0, 'a', 'b') || stroke.id === edgeId(1, 'b', 'a'));
    expect(pair).toHaveLength(2);
    expect(pair.every((stroke) => stroke.kind === 'path' || stroke.kind === 'arc')).toBe(true);
    expect(pair[0]!.d).not.toBe(pair[1]!.d);
    const selfLoop = result.scene.strokes.find((stroke) => stroke.id === edgeId(2, 'a', 'a'))!;
    expect(selfLoop.kind === 'path' || selfLoop.kind === 'arc').toBe(true);
    expect(selfLoop.markerEnd).toBe(true);
    await saveRender('typed-cycle-self-loop', result);
  });

  it('keeps highlight-only recompiles geometrically and label-position stable', async () => {
    const base = success(await graph([
      'node: alpha Alpha',
      'node: beta Beta',
      'edge: alpha beta flow',
    ].join('\n')));
    const highlighted = success(await graph([
      'node: alpha Alpha',
      'node: beta Beta',
      'edge: alpha beta flow',
      'highlight: beta',
    ].join('\n')));

    expect(highlighted.scene.strokes.map((stroke) => `${stroke.id}:${stroke.kind}:${stroke.d ?? stroke.points.join(',')}`))
      .toEqual(base.scene.strokes.map((stroke) => `${stroke.id}:${stroke.kind}:${stroke.d ?? stroke.points.join(',')}`));
    const textPositions = (svg: string) => [...svg.matchAll(/<text id="([^"]+)" x="([^"]+)" y="([^"]+)"/g)]
      .map((match) => `${match[1]}:${match[2]}:${match[3]}`);
    expect(textPositions(highlighted.svg)).toEqual(textPositions(base.svg));
    expect(highlighted.scene.highlights).toEqual(['beta']);
    await saveRender('highlighted-flow', highlighted);
  });

  it('round-trips graph nodes and edge endpoints, and rejects a deliberately wrong scene', async () => {
    const result = success(await graph([
      'node: left Left',
      'node: right Right',
      'edge: left right flow',
    ].join('\n')));
    const expectedNodes = ['left', 'right'];
    const expectedEdges = [{ from: 'left', to: 'right' }];
    expect(certificate(result.scene, expectedNodes, expectedEdges)).toBe(true);

    const wrong = {
      ...result.scene,
      strokes: result.scene.strokes.filter((stroke) => stroke.id !== edgeId(0, 'left', 'right')),
    };
    expect(certificate(wrong, expectedNodes, expectedEdges)).toBe(false);
    expect(certificate(result.scene, expectedNodes, [{ from: 'right', to: 'left' }])).toBe(false);
  });
});

describe('L4 graph fail-closed probes', () => {
  it('rejects an empty graph and truncated edge', async () => {
    const empty = await graph('');
    expect(empty).toMatchObject({ ok: false, code: 'malformed' });
    if (!empty.ok) expect(empty.reason).toMatch(/node.*edge|node or edge/);

    const truncated = await graph('edge: only-one-endpoint');
    expect(truncated).toMatchObject({ ok: false, code: 'malformed' });
  });

  it('rejects invalid rankdir instead of silently falling back', async () => {
    const result = await graph([
      'node: a A',
      'node: b B',
      'edge: a b flow',
      'rankdir: DIAGONAL',
    ].join('\n'));
    expect(result).toMatchObject({ ok: false, code: 'malformed' });
    if (!result.ok) expect(result.reason).toContain('rankdir');
  });

  it('refuses spatial map artwork rather than reducing it to arbitrary graph nodes', async () => {
    const result = await graph([
      'node: world World',
      'edge: world legend color-band',
    ].join('\n'));
    expect(result).toMatchObject({ ok: false, code: 'refused' });
    if (!result.ok) expect(result.reason).toContain('spatial map');
  });

  it('rejects an unsupported caption instead of silently dropping it', async () => {
    const result = await graph([
      'node: source Source',
      'node: target Target',
      'edge: source target flow',
      'caption: compiler structure',
    ].join('\n'));
    expect(result).toMatchObject({ ok: false, code: 'malformed' });
    if (!result.ok) expect(result.reason).toContain('unsupported graph key caption');
  });

  it('uses conventional process circles and resource squares for wait graphs', async () => {
    const result = success(await graph([
      'node: thread-1 Thread 1',
      'node: lock-1 Lock L1',
      'edge: thread-1 lock-1 holds',
    ].join('\n')));
    expect(result.scene.strokes.find((stroke) => stroke.id === 'thread-1')?.kind).toBe('ellipse');
    expect(result.scene.strokes.find((stroke) => stroke.id === 'lock-1')?.kind).toBe('rect');
  });

  it('does not refuse an abstract spatial relationship graph as map artwork', async () => {
    const result = await graph([
      'node: spatial Spatial',
      'node: region Region',
      'edge: spatial region flow',
    ].join('\n'));
    expect(result.ok).toBe(true);
  });

  it('fails closed when a node label cannot fit its node geometry', async () => {
    const result = await graph('node: x This label is deliberately wider than a graph node can contain');
    expect(result).toMatchObject({ ok: false, code: 'unsatisfiable' });
    if (!result.ok) expect(result.reason).toMatch(/label|node geometry|fit/i);
  });

  it('wraps structured relation labels without weakening the long-label guard', async () => {
    const result = await graph([
      'node: r_student "STUDENT(StudentID, StudentName)"',
      'node: r_course "COURSE(CourseID, CourseTitle, InstructorID)"',
      'node: r_instructor "INSTRUCTOR(InstructorID, InstructorName)"',
      'node: r_enrollment "ENROLLMENT(StudentID, CourseID, Grade)"',
      'edge: r_student r_enrollment StudentID-reference',
      'edge: r_course r_enrollment CourseID-reference',
      'edge: r_instructor r_course InstructorID-reference',
      'rankdir: LR',
    ].join('\n'));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      const labels = result.scene.labels.map((label) => label.text ?? '');
      expect(labels.join(' ')).toContain('STUDENT(');
      expect(labels.join(' ')).toContain('ENROLLMENT(');
      expect(labels.some((label) => label.includes('StudentID'))).toBe(true);
    }
  });

  it('fails closed when layout compresses node boxes into overlaps', async () => {
    const result = await graph([
      'node: n1 One',
      'node: n2 Two',
      'node: n3 Three',
      'node: n4 Four',
      'node: n5 Five',
      'node: n6 Six',
      'node: n7 Seven',
      'node: n8 Eight',
    ].join('\n'));
    expect(result).toMatchObject({ ok: false, code: 'unsatisfiable' });
    if (!result.ok) expect(result.reason).toMatch(/overlap|frame|layout/i);
  });

  it('infers a number-line convention from numeric ordered nodes without boxing them', async () => {
    const result = success(await graph([
      'node: n0 -2',
      'node: n1 0',
      'node: n2 3',
      'edge: n0 n1 order',
      'edge: n1 n2 order',
    ].join('\n')));

    expect(result.scene.strokes.find((stroke) => stroke.id === 'number-line-axis')?.role).toBe('axis');
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('number-line-tick-'))).toHaveLength(3);
    expect(result.scene.strokes.some((stroke) => ['n0', 'n1', 'n2'].includes(stroke.id))).toBe(false);
    const values = result.scene.labels
      .filter((label) => ['-2', '0', '3'].includes(label.text ?? ''))
      .sort((a, b) => a.x - b.x)
      .map((label) => label.text);
    expect(values).toEqual(['-2', '0', '3']);
  });

  it('fails closed when reciprocal pointer relations cannot stay inside a readable frame', async () => {
    const edges = Array.from({ length: 8 }, (_, index) =>
      index % 2 === 0 ? `edge: a b pointer-${index}` : `edge: b a pointer-${index}`,
    );
    const result = await graph(['node: a A', 'node: b B', ...edges].join('\n'));
    expect(result).toMatchObject({ ok: false, code: 'unsatisfiable' });
    if (!result.ok) expect(result.reason).toMatch(/relation|reciprocal|readable|frame|layout/i);
  });
});

describe('L4 declared DEV renders', () => {
  it('executes each positive probe from artifacts/figlab/probes/L4.json', async () => {
    const probes = [
      {
        id: 'probe-directed-pipeline',
        content: ['node: source Input', 'node: parse Parse', 'node: emit Emit', 'edge: source parse flow', 'edge: parse emit flow', 'rankdir: LR'].join('\n'),
      },
      {
        id: 'probe-typed-dependency-cycle',
        content: ['node: worker-a Worker A', 'node: lock-a Lock A', 'node: worker-b Worker B', 'node: lock-b Lock B', 'edge: worker-a lock-a holds', 'edge: lock-a worker-b waits-for', 'edge: worker-b lock-b holds', 'edge: lock-b worker-a waits-for', 'rankdir: TB'].join('\n'),
      },
      {
        id: 'probe-bidirectional-reaction',
        content: ['node: alcohol Alcohol', 'node: alkene Alkene', 'edge: alcohol alkene forward', 'edge: alkene alcohol reverse', 'highlight: alcohol'].join('\n'),
      },
    ];
    for (const probe of probes) {
      const result = success(await graph(probe.content));
      if (probe.id === 'probe-typed-dependency-cycle') {
        expect(result.scene.strokes.find((stroke) => stroke.id === edgeId(3, 'lock-b', 'worker-a'))?.kind).toBe('path');
      }
      await saveRender(probe.id, result);
    }
  });
});
