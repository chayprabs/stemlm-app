import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import type { CompileSuccess } from './types';

async function shapes(content: string): Promise<Record<string, string | undefined>> {
  const result = await compileDiagramSpec({ type: 'graph', content });
  if (!result.ok) throw new Error(result.reason);
  const { strokes } = (result as CompileSuccess).scene;
  return Object.fromEntries(strokes.filter((stroke) => stroke.role === 'boundary').map((stroke) => [stroke.id, stroke.kind]));
}

// A word in a label is not a shape. The wait-for and ER conventions apply to those diagrams only.
describe('graph: roles read off label wording', () => {
  it('keeps a flowchart box a box when its label merely mentions a role', async () => {
    const drawn = await shapes([
      'node: a Read input',
      'node: b Check relationship',
      'node: c Start process',
      'node: d Report',
      'edge: a b',
      'edge: b c',
      'edge: c d',
    ].join('\n'));
    expect(drawn).toMatchObject({ a: 'rect', b: 'rect', c: 'rect', d: 'rect' });
  });

  it('draws the wait-for convention when processes and resources are both present', async () => {
    const drawn = await shapes('node: t1 Thread 1\nnode: l1 Lock L1\nedge: t1 l1 holds');
    expect(drawn).toMatchObject({ t1: 'ellipse', l1: 'rect' });
  });

  it('draws a graph made only of processes with the process shape', async () => {
    const drawn = await shapes('node: p1 Process P1\nnode: p2 Process P2\nedge: p1 p2 waits for');
    expect(drawn).toMatchObject({ p1: 'ellipse', p2: 'ellipse' });
  });

  it('draws ER relations as diamonds beside entities, with plain attribute nodes allowed', async () => {
    const drawn = await shapes([
      'node: s Student entity',
      'node: e Enrolls relationship',
      'node: c Course entity',
      'node: n Name',
      'edge: s e',
      'edge: e c',
      'edge: s n has',
    ].join('\n'));
    expect(drawn).toMatchObject({ s: 'rect', c: 'rect', n: 'rect' });
    expect(drawn.e).toBe('polygon');
  });

  it('never adds a role shape beside shapes the author declared', async () => {
    const drawn = await shapes([
      'node: a Start process',
      'node: b Lock acquired?',
      'node: c Done',
      'edge: a b',
      'edge: b c yes',
      'decision: b',
      'terminal: c',
    ].join('\n'));
    expect(drawn.a).toBe('rect');
    expect(drawn.b).toBe('polygon');
  });

  it('draws a translated Mermaid flowchart box as written', async () => {
    const compiled = await compileDiagram({ type: 'mermaid', content: 'graph TD\n  A[Check relationship] --> B[Save]' });
    expect(compiled.ok).toBe(true);
    expect(compiled.svg).not.toContain('<polygon id="A"');
  });
});
