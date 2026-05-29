import { defineConfig } from 'wxt';
import type { Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

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

function asciiSafeOutput(): Plugin {
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

// stemLM WXT configuration.
// GA4 Measurement Protocol credentials are injected at build time via env vars
// (see .env.example). They are intentionally empty by default — the analytics
// module no-ops until the user fills them in.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  imports: false, // we use explicit imports for clarity / testability
  vite: () => ({
    plugins: [tailwindcss(), asciiSafeOutput()],
    define: {
      __GA_MEASUREMENT_ID__: JSON.stringify(process.env.STEMLM_GA_MEASUREMENT_ID ?? ''),
      __GA_API_SECRET__: JSON.stringify(process.env.STEMLM_GA_API_SECRET ?? ''),
    },
  }),
  manifest: {
    name: 'stemLM — Structured STEM Study Overlay',
    description:
      'Turn ChatGPT, Claude & Gemini into a guided STEM study workspace: step-by-step solutions, step-synced diagrams, quick-checks, and clean PDF export.',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: [
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
      '*://claude.ai/*',
      '*://gemini.google.com/*',
      '*://*.perplexity.ai/*',
      '*://grok.com/*',
      '*://*.grok.com/*',
      '*://chat.deepseek.com/*',
    ],
    action: {
      default_title: 'stemLM — study overlay',
    },
    web_accessible_resources: [
      {
        resources: ['icon/*.png'],
        matches: [
          '*://chatgpt.com/*',
          '*://chat.openai.com/*',
          '*://claude.ai/*',
          '*://gemini.google.com/*',
          '*://*.perplexity.ai/*',
          '*://grok.com/*',
          '*://*.grok.com/*',
          '*://chat.deepseek.com/*',
        ],
      },
    ],
  },
});
