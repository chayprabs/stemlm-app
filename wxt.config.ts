import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { panelSplit } from './scripts/panel-split';

type OutputChunk = { type: 'chunk'; code: string };
type OutputAsset = { type: 'asset'; fileName: string; source: string | Uint8Array };
type OutputBundle = Record<string, OutputChunk | OutputAsset>;
type BundlePlugin = {
  name: string;
  enforce: 'post';
  generateBundle: (_options: unknown, bundle: OutputBundle) => void;
};

// Chrome refuses to load extension scripts whose contents fail its strict
// `IsStringUTF8` check. That check rejects Unicode "non-characters"
// (U+FDD0–U+FDEF, U+FFFE, U+FFFF and their astral equivalents) and we also
// defensively strip the BOM/ZWNBSP (U+FEFF) and C0 control characters. These
// code points can legitimately appear inside dependency string/regex literals
// (e.g. Unicode-range regexes), so we re-emit them as equivalent `\uXXXX`
// escapes — byte-for-byte identical at runtime, but guaranteed ASCII-safe so
// the bundle always loads in Chrome.
const UNSAFE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFEFF\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

function escapeUnsafeChars(code: string): string {
  return code.replace(UNSAFE_CHARS, (match) => {
    if (match.length === 2) {
      // Surrogate pair: only escape genuine non-characters (U+nFFFE / U+nFFFF),
      // leave ordinary astral characters (emoji, CJK ext, …) untouched.
      const low = (match.codePointAt(0) as number) & 0xffff;
      if (low !== 0xfffe && low !== 0xffff) return match;
      return (
        '\\u' + match.charCodeAt(0).toString(16).padStart(4, '0') +
        '\\u' + match.charCodeAt(1).toString(16).padStart(4, '0')
      );
    }
    return '\\u' + match.charCodeAt(0).toString(16).padStart(4, '0');
  });
}

function asciiSafeOutput(): BundlePlugin {
  return {
    name: 'stemlm:ascii-safe-output',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          file.code = escapeUnsafeChars(file.code);
        }
      }
    },
  };
}

// PERF-03: the study panel is its own script, loaded on first open (scripts/panel-split.ts).
const split = panelSplit(resolve('.'));

const KATEX_FONT_DIR = resolve('node_modules/katex/dist/fonts');
const PLEX_FONT_DIR = resolve('assets/fonts/ibm-plex');

// KaTeX's CSS inlines every face three times (woff2 + woff + ttf, ~1.5 MB of
// base64 in the content CSS) and chat hosts such as grok.com forbid `data:`
// fonts. Its @font-face rules go; src/lib/fonts.ts registers the woff2 files
// the extension ships under fonts/katex instead (PERF-02).
function bundledFontsOnly(): BundlePlugin {
  return {
    name: 'stemlm:bundled-fonts-only',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [key, file] of Object.entries(bundle)) {
        if (file.type !== 'asset') continue;
        if (/KaTeX_[\w-]+\.(woff2?|ttf)$/.test(file.fileName)) delete bundle[key];
        else if (file.fileName.endsWith('.css')) {
          file.source = String(file.source).replace(/@font-face\s*\{[^}]*font-family:\s*["']?KaTeX_[^}]*\}/g, '');
        }
      }
    },
  };
}

// stemLM WXT configuration.
// Analytics is disabled in the distributed client; no telemetry secret is
// injected into extension JavaScript. Provider permissions are HTTPS-only.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  imports: false, // we use explicit imports for clarity / testability
  zip: {
    // Extension artifact zips are built from .output/ only; these patterns apply to
    // Firefox source zips and any extra files WXT might bundle alongside the build.
    exclude: ['**/*.md', 'docs/**', 'scripts/**'],
    excludeSources: [
      'docs/**',
      '**/*.md',
      '!src/protocol/*.md',
      'scripts/**',
      'vitest.config.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      'pnpm-lock.yaml',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss(), asciiSafeOutput(), bundledFontsOnly()],
    define: {},
    // Chrome ignores <link rel="modulepreload"> on extension pages and warns
    // "cross-world extension resource mismatch" for each one (CONSOLE-01).
    build: { modulePreload: false },
  }),
  hooks: {
    // Bundled faces (src/lib/fonts.ts): KaTeX woff2 + IBM Plex with its OFL licence.
    'build:publicAssets': (_wxt, files) => {
      for (const [dir, dest, keep] of [[KATEX_FONT_DIR, 'katex', /\.woff2$/], [PLEX_FONT_DIR, 'ibm-plex', /\.woff2$|^OFL\.txt$/]] as const) {
        for (const name of readdirSync(dir)) {
          if (keep.test(name)) files.push({ absoluteSrc: resolve(dir, name), relativeDest: `fonts/${dest}/${name}` });
        }
      }
    },
    'vite:build:extendConfig': (entrypoints, config) => {
      const names = new Set(entrypoints.map((entry) => entry.name));
      if (names.has('content')) config.plugins = [...(config.plugins ?? []), split.boot as never];
      if (names.has('study-panel')) {
        config.plugins = [...(config.plugins ?? []), split.chunk as never];
        const output = config.build?.rollupOptions?.output;
        if (output && !Array.isArray(output)) output.globals = split.globals;
      }
    },
  },
  manifest: {
    name: 'stemlm',
    short_name: 'stemlm',
    description: 'Clear STEM solutions with useful steps and diagrams.',
    homepage_url: 'https://github.com/chayprabs/stemlm-app',
    minimum_chrome_version: '116',
    // unlimitedStorage: saved answers are never evicted to fit a quota (D12). No install warning.
    // scripting: after install/update, stemLM reaches chat tabs that were already open (D13).
    permissions: ['storage', 'unlimitedStorage', 'tabs', 'downloads', 'scripting'],
    host_permissions: [
      'https://claude.ai/*',
      'https://www.claude.ai/*',
      'https://gemini.google.com/*',
      'https://www.gemini.google.com/*',
      'https://grok.com/*',
      'https://www.grok.com/*',
    ],
    action: {
      default_title: 'stemlm',
    },
    web_accessible_resources: [
      {
        // Fonts load in the chat page's <head> for the panel's shadow root (D4); the
        // content script imports the study panel on first open (PERF-03).
        resources: ['fonts/katex/*.woff2', 'fonts/ibm-plex/*.woff2', 'study-panel.js'],
        matches: [
          'https://claude.ai/*',
          'https://www.claude.ai/*',
          'https://gemini.google.com/*',
          'https://www.gemini.google.com/*',
          'https://grok.com/*',
          'https://www.grok.com/*',
        ],
        use_dynamic_url: true,
      },
    ],
  },
});
