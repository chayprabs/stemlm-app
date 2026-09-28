/**
 * PERF-03: the study panel is not part of the content script.
 *
 * The content script is parsed and run on every Claude / Gemini / Grok page
 * load, whether or not the panel is ever opened. The panel subtree (markdown +
 * KaTeX, the figure engines, SMILES and graph layout, animation) is built as
 * `study-panel.js` and imported into the content-script world the first time
 * the panel opens.
 *
 * The chunk must run against the content script's own module instances: one
 * React, one store, one controller. Every module both bundles reach is external
 * in study-panel.js and read from a registry the content script fills just
 * before the import. The list comes from the source import graphs, never from a
 * hand-kept list, so a new shared import cannot silently fork the store.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

export const CONTENT_ENTRY = 'entrypoints/content/index.ts';
/** Swapped for the study-panel.js loader in the content-script build. */
export const PANEL_LOADER = 'src/content/load-panel.ts';
export const PANEL_ENTRY = 'src/components/PanelHost.tsx';
export const PANEL_SCRIPT = '/study-panel.js';

/** Always one instance: hooks and context break across React copies. */
const ALWAYS_SHARED = ['react', 'react/jsx-runtime', 'react-dom', 'wxt/browser'];
const LOADER_ID = '\0stemlm-panel-loader';
const SHARED_ID = 'stemlm-shared:';

const IMPORT_RE =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

export interface ImportGraph {
  /** Root-relative repo files. */
  files: Set<string>;
  /** Bare package specifiers imported by those files. */
  packages: Set<string>;
}

const toKey = (root: string, file: string) => relative(root, file).replace(/\\/g, '/');

function resolveLocal(root: string, spec: string, from: string): string | null {
  const bare = spec.replace(/\?.*$/, '');
  let base: string;
  if (bare.startsWith('@/')) base = resolve(root, bare.slice(2));
  else if (bare.startsWith('.')) base = resolve(dirname(from), bare);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts'), resolve(base, 'index.tsx')]) {
    if (/\.(ts|tsx)$/.test(candidate) && existsSync(candidate)) return candidate;
  }
  return null;
}

/** Everything statically reachable from `entry`; `leaves` are included but not followed. */
export function importGraph(root: string, entry: string, leaves: ReadonlySet<string> = new Set()): ImportGraph {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [resolve(root, entry)];
  while (queue.length) {
    const file = queue.pop() as string;
    const key = toKey(root, file);
    if (files.has(key)) continue;
    files.add(key);
    if (leaves.has(key)) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2] ?? match[3];
      if (!spec || /^(?:import|export)\s+type\b/.test(match[0])) continue;
      const local = resolveLocal(root, spec, file);
      if (local) queue.push(local);
      else if (!spec.startsWith('.') && !spec.startsWith('@/')) packages.add(spec.replace(/\?.*$/, ''));
    }
  }
  return { files, packages };
}

/** Packages, then repo files, that the panel and the content script must share. */
export function sharedPanelModules(root: string): string[] {
  const boot = importGraph(root, CONTENT_ENTRY, new Set([PANEL_LOADER]));
  const panel = importGraph(root, PANEL_ENTRY);
  const packages = [...panel.packages].filter((name) => boot.packages.has(name) && !ALWAYS_SHARED.includes(name));
  const files = [...panel.files].filter((file) => boot.files.has(file));
  return [...ALWAYS_SHARED, ...packages.sort(), ...files.sort()];
}

interface ResolveContext {
  resolve(source: string, importer?: string, options?: { skipSelf?: boolean }): Promise<{ id: string } | null>;
}

export interface SplitPlugin {
  name: string;
  enforce: 'pre';
  resolveId(this: ResolveContext, source: string, importer?: string): Promise<string | { id: string; external: true } | null>;
  load?(id: string): string | null;
}

export function panelSplit(root: string) {
  const keys = sharedPanelModules(root);
  const fileKey = (id: string) => {
    const key = toKey(root, id.replace(/\?.*$/, ''));
    return keys.includes(key) ? key : null;
  };
  const browserSlot = `s${keys.indexOf('wxt/browser')}`;

  /** Content script: the loader fills the registry, then imports the chunk once. */
  const boot: SplitPlugin = {
    name: 'stemlm:panel-loader',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!/load-panel(\.ts)?$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      return resolved && toKey(root, resolved.id) === PANEL_LOADER ? LOADER_ID : null;
    },
    load(id) {
      if (id !== LOADER_ID) return null;
      const specifier = (key: string) => JSON.stringify(key.startsWith('src/') ? resolve(root, key).replace(/\\/g, '/') : key);
      return [
        ...keys.map((key, i) => `import * as s${i} from ${specifier(key)};`),
        `const shared = { ${keys.map((_, i) => `s${i}`).join(', ')} };`,
        'let pending = null;',
        'export function loadPanelHost() {',
        '  if (!pending) {',
        // A unique URL per content-script instance: a reloaded extension must not reuse a module bound to the old one.
        `    const url = ${browserSlot}.browser.runtime.getURL(${JSON.stringify(PANEL_SCRIPT)}) + "?instance=" + crypto.randomUUID();`,
        '    globalThis.__stemlmShared = shared;',
        '    pending = import(/* @vite-ignore */ url).then(() => {',
        '      const host = globalThis.__stemlmPanel;',
        '      if (typeof host !== "function") throw new Error("study-panel.js did not register the panel");',
        '      return host;',
        '    });',
        '    pending.catch(() => { pending = null; });',
        '  }',
        '  return pending;',
        '}',
      ].join('\n');
    },
  };

  /** study-panel.js: shared modules resolve to the registry instead of a second copy. */
  const chunk: SplitPlugin = {
    name: 'stemlm:panel-externals',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer) return null;
      let key: string | null = keys.includes(source) ? source : null;
      if (!key) {
        const resolved = await this.resolve(source, importer, { skipSelf: true });
        key = resolved ? fileKey(resolved.id) : null;
      }
      return key ? { id: `${SHARED_ID}s${keys.indexOf(key)}`, external: true } : null;
    },
  };

  const globals = Object.fromEntries(keys.map((_, i) => [`${SHARED_ID}s${i}`, `__stemlmShared.s${i}`]));
  return { keys, boot, chunk, globals };
}
