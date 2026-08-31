import type { Diagram } from '@/src/protocol/types';
import type { DiagramSizeProfile } from '@/src/lib/diagram-bounds';
import type { CompileResult, CompileCtx } from './types';
import {
  canonicalizeDiagramType,
  familyRequiredMissing,
  isKnownDiagramType,
  isRefuseType,
  lookupFamily,
} from './catalog';
import { parseSpec } from './spec';

export async function compileDiagramSpec(
  diagram: Diagram,
  profile: DiagramSizeProfile = 'step',
): Promise<CompileResult> {
  const family = canonicalizeDiagramType(diagram.type);
  const ctx: CompileCtx = { profile, family };

  if (isRefuseType(family)) {
    return { ok: false, code: 'refused', reason: `refused_family:${family}` };
  }
  if (family === 'svg' || family === 'mermaid') {
    return { ok: false, code: 'malformed', reason: 'hatch types are not compiled as specs' };
  }
  if (!isKnownDiagramType(family)) {
    return { ok: false, code: 'unknown', reason: `unknown_diagram_type:${family}` };
  }

  const spec = parseSpec(family, diagram.content);
  const missing = familyRequiredMissing(family, diagram.content);
  if (missing.length) {
    return { ok: false, code: 'malformed', reason: `missing ${missing.join(', ')}` };
  }

  const def = lookupFamily(family);
  const engine = def?.engine ?? family;

  try {
    if (engine === 'plot') {
      const { compilePlot } = await import('./engines/plot');
      return compilePlot(spec, ctx);
    }
    if (engine === 'scene') {
      const { compileScene } = await import('./engines/scene');
      return compileScene(spec, ctx);
    }
    if (engine === 'graph') {
      const { compileGraph } = await import('./engines/graph');
      return compileGraph(spec, ctx);
    }
    if (engine === 'table') {
      const { compileTable } = await import('./engines/table');
      return compileTable(spec, ctx);
    }
    if (engine === 'circuit') {
      const { compileCircuit } = await import('./engines/circuit');
      return compileCircuit(spec, ctx);
    }
    const { compileLeftover } = await import('./leftovers');
    return compileLeftover(family, spec, ctx);
  } catch (e) {
    return { ok: false, code: 'throw', reason: e instanceof Error ? e.message : 'compile failed' };
  }
}
