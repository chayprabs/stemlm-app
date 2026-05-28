import { browser } from 'wxt/browser';

/**
 * Toolbar popup (M0 scaffold).
 *
 * Final version offers: Open panel, Load conversation, recent saved sessions,
 * and a link to settings. For now it renders a branded placeholder.
 */
export default function App() {
  async function openPanel() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await browser.tabs.sendMessage(tab.id, { type: 'stemlm:open-panel' });
      } catch {
        /* not a supported site */
      }
    }
    window.close();
  }

  return (
    <div
      className="w-[300px] p-4"
      style={{ background: 'var(--slm-bg)', color: 'var(--slm-fg)', fontFamily: 'var(--font-sans)' }}
    >
      <h1 className="text-base font-semibold" style={{ color: 'var(--slm-accent)' }}>
        stemLM
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--slm-fg-muted)' }}>
        Structured STEM study overlay for ChatGPT, Claude &amp; Gemini.
      </p>
      <button
        type="button"
        onClick={openPanel}
        className="mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold"
        style={{ background: 'var(--slm-accent)', color: 'var(--slm-accent-fg)' }}
      >
        Open study panel
      </button>
      <button
        type="button"
        onClick={() => browser.runtime.openOptionsPage()}
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: 'var(--slm-border)', color: 'var(--slm-fg)' }}
      >
        Settings
      </button>
    </div>
  );
}
