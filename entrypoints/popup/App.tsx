import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  getSavedSessions,
  deleteSavedSession,
  downloadSavedSessionPdf,
  type SavedSessionSnapshot,
} from '@/src/lib/saved-sessions';
import { getSettings } from '@/src/lib/settings';
import { resolveTheme, applyTheme } from '@/src/lib/theme';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { IconClose, IconLayers, IconPdf, StemMark } from '@/src/components/icons';

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
  const [saved, setSaved] = useState<SavedSessionSnapshot[]>([]);
  const [onGemini, setOnGemini] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      const theme = resolveTheme(s.theme);
      applyTheme(document.documentElement, theme);
      applyTheme(document.body, theme);
    });
    getSavedSessions().then(setSaved);
    activeTab().then((tab) => setOnGemini(isGeminiUrl(tab?.url)));
  }, []);

  async function sendToTab(payload: { type: string }) {
    setSendError(null);
    const tab = await activeTab();
    if (tab?.id == null) {
      setSendError('No active tab found.');
      return;
    }
    try {
      await browser.tabs.sendMessage(tab.id, payload);
      window.close();
    } catch {
      setSendError('Reload the Gemini tab, then try again.');
    }
  }

  function send(type: string) {
    void sendToTab({ type });
  }

  async function downloadSaved(snapshot: SavedSessionSnapshot) {
    setDownloadError(null);
    setDownloadingId(snapshot.id);
    try {
      const result = await downloadSavedSessionPdf(snapshot.id);
      if (!result.ok) {
        setDownloadError('PDF export failed. Try again or use Save as PDF in the print dialog.');
      }
    } catch {
      setDownloadError('Could not export PDF. Try again.');
    } finally {
      setDownloadingId(null);
    }
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
          <StemMark width={16} height={16} />
        </span>
        <div className="slm-popup-head-text">
          <h1>
            <BrandWordmark />
          </h1>
          <p className="slm-popup-tagline">Structured STEM study overlay</p>
        </div>
      </header>

      <p className="slm-popup-sub">
        Structured STEM study overlay for Gemini. Injects the stemLM protocol into your chat so
        answers come back in a step-by-step study panel.
      </p>

      <section className="slm-popup-card" aria-label="Quick actions">
        {onGemini && (
          <p className="slm-popup-status">
            <span className="slm-status-dot" aria-hidden="true" />
            On Gemini — ready
          </p>
        )}

        <div className="slm-popup-actions">
          <button
            type="button"
            className="slm-popup-btn primary"
            onClick={() => send('stemlm:open-panel')}
            disabled={!onGemini}
            title={onGemini ? 'Open the study panel' : 'Open gemini.google.com first'}
          >
            Open study panel
          </button>
          <button
            type="button"
            className="slm-popup-btn"
            onClick={() => send('stemlm:load-conversation')}
            disabled={!onGemini}
            title={onGemini ? 'Load this chat into the study panel' : 'Open gemini.google.com first'}
          >
            <IconLayers width={15} height={15} />
            Load conversation from this chat
          </button>
        </div>

        {!onGemini && (
          <p className="slm-popup-hint">
            Open gemini.google.com, type your question, then click the stemLM button beside send.
          </p>
        )}
        {sendError && <p className="slm-popup-error">{sendError}</p>}
      </section>

      <section className="slm-popup-section" aria-label="Saved sessions">
        <h2 className="slm-popup-section-title">Saved sessions</h2>
        <p className="slm-popup-saved-hint">
          Question and solution are saved locally. Tap a session to download its PDF.
        </p>
        {downloadError && <p className="slm-popup-error">{downloadError}</p>}
        {saved.length === 0 ? (
          <p className="slm-popup-empty">
            No saved sessions yet. Save one from the panel to download it here later.
          </p>
        ) : (
          <ul className="slm-saved-list">
            {saved.map((s) => (
              <li key={s.id} className="slm-saved-item">
                <button
                  type="button"
                  className="slm-saved-open"
                  onClick={() => downloadSaved(s)}
                  disabled={downloadingId === s.id}
                  title="Download PDF"
                  aria-label={`Download PDF for ${s.meta.topic}`}
                >
                  <span className="slm-saved-meta">
                    <span className="slm-saved-topic">
                      <IconPdf width={13} height={13} aria-hidden="true" />
                      {s.meta.topic}
                    </span>
                    <span className="slm-saved-sub">
                      {downloadingId === s.id ? 'Preparing PDF…' : `${s.meta.subject} · PDF`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="slm-saved-del"
                  title="Delete saved session"
                  aria-label={`Delete ${s.meta.topic}`}
                  onClick={() => remove(s.id)}
                >
                  <IconClose width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="slm-popup-foot">
        <button type="button" className="slm-link" onClick={openOptions}>
          Settings →
        </button>
      </footer>
    </div>
  );
}
