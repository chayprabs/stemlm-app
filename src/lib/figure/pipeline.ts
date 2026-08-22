import type { CompileResult, Scene } from './types';
import { emitSvg } from './emit';
import { layoutScene, overlaysFromLayout } from './slk';

export function layoutAndCompile(scene: Scene): CompileResult {
  const laid = layoutScene(scene);
  if (!laid.ok) return laid;
  const svg = emitSvg(scene, laid);
  const overlays = overlaysFromLayout(laid);
  return { ok: true, svg, overlays, scene };
}
