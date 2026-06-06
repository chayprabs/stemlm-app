import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getSavedSessions, deleteSavedSession } from '@/src/lib/saved-sessions';
import { getSettings } from '@/src/lib/settings';
import { resolveTheme, applyTheme } from '@/src/lib/theme';
import type { Session } from '@/src/protocol/types';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { IconLayers, IconBook, StemMark } from '@/src/components/icons';

const GEMINI_HOST = /(^|\.)gemini\.google\.com$/i;

async function activeTab() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  } catch {
    return null;
  }
}

function isGeminiUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return GEMINI_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export default function App() {
  const [saved, setSaved] = useState<Session[]>([]);
  const [onGemini, setOnGemini] = useState(false);

  useEffect(() => {
    getSettings().then((s) => applyTheme(document.body, resolveTheme(s.theme)));
    getSavedSessions().then(setSaved);
    activeTab().then((tab) => setOnGemini(isGeminiUrl(tab?.url)));
  }, []);

  async function sendToTab(payload: { type: string; id?: string }) {
    const tab = await activeTab();
    if (tab?.id != null) {
      try {
        await browser.tabs.sendMessage(tab.id, payload);
      } catch {
        /* no content script */
      }
    }
    window.close();
  }

  function send(type: string) {
    void sendToTab({ type });
  }

  function openSaved(id: string) {
    void sendToTab({ type: 'stemlm:open-saved-session', id });
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
      <header className="slm-popup-head">
        <span className="slm-brand-mark" aria-hidden="true">
          <StemMark width={14} height={14} />
        </span>
        <div className="slm-popup-head-text">
          <h1>
            <BrandWordmark />
          </h1>
          <p className="slm-popup-tagline">Structured STEM study overlay</p>
        </div>
      </header>
      <p className="slm-popup-sub">
        Structured STEM study overlay for Gemini. Attaches a small protocol file instead of pasting
        long instructions into your prompt.
      </p>

      {onGemini && <p className="slm-popup-status">On Gemini — ready</p>}

      <div className="slm-popup-actions">
        <button
          type="button"
          className="slm-popup-btn primary"
          onClick={() => send('stemlm:open-panel')}
          disabled={!onGemini}
          title={onGemini ? '' : 'Open gemini.google.com first'}
        >
          Open study panel
        </button>
        <button
          type="button"
          className="slm-popup-btn"
          onClick={() => send('stemlm:load-conversation')}
          disabled={!onGemini}
        >
          <IconLayers /> Load conversation from this chat
        </button>
      </div>

      {!onGemini && (
        <p className="slm-popup-empty">
          Open gemini.google.com, type your question, then click stemLM beside the send button.
        </p>
      )}

      <div className="slm-popup-section-title">Saved sessions</div>
      {saved.length === 0 ? (
        <p className="slm-popup-empty">No saved sessions yet. Save one from the panel to revisit it.</p>
      ) : (
        <ul className="slm-saved-list">
          {saved.map((s) => (
            <li key={s.id} className="slm-saved-item">
              <button
                type="button"
                className="slm-saved-open"
                onClick={() => openSaved(s.id)}
                disabled={!onGemini}
                title={onGemini ? 'Open in study panel' : 'Open gemini.google.com first'}
              >
                <span className="slm-saved-meta">
                  <span className="slm-saved-topic">
                    <IconBook width={13} height={13} /> {s.capsule.meta.topic}
                  </span>
                  <span className="slm-saved-sub">
                    {s.capsule.meta.subject} · {s.capsule.steps.length} steps
                  </span>
                </span>
              </button>
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
