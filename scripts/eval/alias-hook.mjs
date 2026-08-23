/**
 * Resolve `@/` to the repo root and append `.ts` for Node ESM.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve as resolvePath, extname } from 'node:path';

const ROOT = resolvePath(fileURLToPath(new URL('../..', import.meta.url)));

function withTs(specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('file:') && !specifier.startsWith('@/')) {
    return specifier;
  }
  if (extname(specifier) || specifier.endsWith('.ts') || specifier.includes('?')) return specifier;
  return `${specifier}.ts`;
}

export async function resolve(specifier, context, nextResolve) {
  let next = specifier;
  if (specifier.startsWith('@/')) {
    next = pathToFileURL(resolvePath(ROOT, specifier.slice(2))).href;
  }
  const tryList = [next];
  const ts = withTs(next);
  if (ts !== next) tryList.push(ts);
  if (next.startsWith('file:') && !next.endsWith('.ts') && !next.includes('?')) {
    tryList.push(`${next}.ts`);
  }
  let lastErr;
  for (const cand of tryList) {
    try {
      return await nextResolve(cand, context);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
