import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// stemLM WXT configuration.
// GA4 Measurement Protocol credentials are injected at build time via env vars
// (see .env.example). They are intentionally empty by default — the analytics
// module no-ops until the user fills them in.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  imports: false, // we use explicit imports for clarity / testability
  vite: () => ({
    plugins: [tailwindcss()],
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
        ],
      },
    ],
  },
});
