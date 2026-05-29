import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getSavedSessions, deleteSavedSession } from '@/src/lib/saved-sessions';
import { getSettings } from '@/src/lib/settings';
import { resolveTheme, applyTheme } from '@/src/lib/theme';
import type { Session } from '@/src/protocol/types';
import { IconSpark, IconLayers, IconBook } from '@/src/components/icons';

const SUPPORTED =
  /chatgpt\.com|chat\.openai\.com|claude\.ai|gemini\.google\.com|perplexity\.ai|grok\.com|chat\.deepseek\.com/;

async function activeTab() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  } catch {
    return null;
  }
}

export default function App() {
  const [saved, setSaved] = useState<Session[]>([]);
  const [onSupported, setOnSupported] = useState(false);

  useEffect(() => {
    getSettings().then((s) => applyTheme(document.body, resolveTheme(s.theme)));
    getSavedSessions().then(setSaved);
    activeTab().then((tab) => setOnSupported(Boolean(tab?.url && SUPPORTED.test(tab.url))));
  }, []);

  async function send(type: string) {
    const tab = await activeTab();
    if (tab?.id != null) {
      try {
        await browser.tabs.sendMessage(tab.id, { type });
      } catch {
        /* no content script here */
      }
    }
    window.close();
  }

  async function remove(id: string) {
    await deleteSavedSession(id);
    setSaved(await getSavedSessions());
  }

  function openOptions() {
    try {
      browser.runtime.openOptionsPage();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="slm-popup">
      <div className="slm-popup-head">
        <span className="slm-brand-dot" />
        <h1>stemLM</h1>
      </div>
      <p className="slm-popup-sub">
        Structured STEM study overlay for ChatGPT, Claude, Gemini, Perplexity, Grok &amp; DeepSeek.
      </p>

      <div className="slm-popup-actions">
        <button
          type="button"
          className="slm-popup-btn primary"
          onClick={() => send('stemlm:open-panel')}
          disabled={!onSupported}
          title={onSupported ? '' : 'Open a supported AI chat (ChatGPT, Claude, Gemini, Perplexity, Grok, DeepSeek) first'}
        >
          <IconSpark /> Open study panel
        </button>
        <button
          type="button"
          className="slm-popup-btn"
          onClick={() => send('stemlm:load-conversation')}
          disabled={!onSupported}
        >
          <IconLayers /> Load conversation from this chat
        </button>
      </div>

      {!onSupported && (
        <p className="slm-popup-empty">
          Open ChatGPT, Claude, Gemini, Perplexity, Grok, or DeepSeek, then click the stemLM button
          next to the chat box.
        </p>
      )}

      <div className="slm-popup-section-title">Saved sessions</div>
      {saved.length === 0 ? (
        <p className="slm-popup-empty">No saved sessions yet. Save one from the panel to revisit it.</p>
      ) : (
        <ul className="slm-saved-list">
          {saved.map((s) => (
            <li key={s.id} className="slm-saved-item">
              <span className="slm-saved-meta">
                <span className="slm-saved-topic">
                  <IconBook width={13} height={13} /> {s.capsule.meta.topic}
                </span>
                <span className="slm-saved-sub">
                  {s.capsule.meta.subject} · {s.capsule.steps.length} steps
                </span>
              </span>
              <button
                type="button"
                className="slm-saved-del"
                title="Delete"
                onClick={() => remove(s.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="slm-popup-foot">
        <button type="button" className="slm-link" onClick={openOptions}>
          Settings →
        </button>
      </div>
    </div>
  );
}
