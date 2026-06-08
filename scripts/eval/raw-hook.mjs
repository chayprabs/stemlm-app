/**
 * Node ESM loader hook so the evaluation harness can import the REAL protocol
 * modules outside Vite/WXT. Vite resolves `import x from './file.md?raw'` to the
 * file's text; this hook reproduces that behavior for plain Node + tsx.
 *
 * Used only by scripts/eval (developer tooling) — never bundled into the extension.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('?raw')) {
    const resolved = await nextResolve(specifier.slice(0, -4), context);
    return { url: `${resolved.url}?raw`, shortCircuit: true, format: 'module' };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('?raw')) {
    const filePath = fileURLToPath(url.slice(0, -4));
    const content = await readFile(filePath, 'utf8');
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(content)};`,
    };
  }
  return nextLoad(url, context);
}
