import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, getSettings, setSettings, type Settings } from '@/src/lib/settings';
import { resolveTheme, applyTheme, type ThemePref } from '@/src/lib/theme';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import type { PlatformId } from '@/src/platforms/types';

const PLATFORM_LABELS: Record<PlatformId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  grok: 'Grok',
  deepseek: 'DeepSeek',
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="slm-opt-row">
      <span className="slm-opt-text">
        <span className="slm-opt-label">{label}</span>
        {hint && <span className="slm-opt-hint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`slm-switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="slm-switch-knob" />
      </button>
    </label>
  );
}

export default function App() {
  const [settings, setLocal] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setLocal(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const theme = resolveTheme(settings.theme);
    applyTheme(document.body, theme);
  }, [settings.theme]);

  async function update(patch: Partial<Settings>) {
    const next = await setSettings(patch);
    setLocal(next);
  }

  if (!loaded) return null;

  return (
    <div className="slm-options">
      <header className="slm-options-head">
        <span className="slm-brand-dot" />
        <h1>stemLM Settings</h1>
      </header>

      <section className="slm-opt-card">
        <h2 className="slm-opt-title">Appearance</h2>
        <div className="slm-opt-row">
          <span className="slm-opt-text">
            <span className="slm-opt-label">Theme</span>
            <span className="slm-opt-hint">Auto follows your system light/dark setting.</span>
          </span>
          <div className="slm-seg">
            {(['auto', 'light', 'dark'] as ThemePref[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`slm-seg-btn ${settings.theme === t ? 'is-active' : ''}`}
                onClick={() => update({ theme: t })}
              >
                {t[0]!.toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="slm-opt-card">
        <h2 className="slm-opt-title">Behaviour</h2>
        <Toggle
          label="Share sessions across tabs"
          hint="Off (default): each chatbot tab gets its own fresh workspace."
          checked={settings.shareAcrossTabs}
          onChange={(v) => update({ shareAcrossTabs: v })}
        />
        <Toggle
          label="Open the panel automatically"
          hint="Open the study panel as soon as you add the stemLM prompt."
          checked={settings.autoOpenOnInject}
          onChange={(v) => update({ autoOpenOnInject: v })}
        />
        <div className="slm-opt-row">
          <span className="slm-opt-text">
            <span className="slm-opt-label">Default subject</span>
            <span className="slm-opt-hint">Auto detects the subject from your question.</span>
          </span>
          <select
            className="slm-select"
            value={settings.defaultSubject}
            onChange={(e) => update({ defaultSubject: e.target.value as Subject | 'Auto' })}
          >
            <option value="Auto">Auto</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="slm-opt-card">
        <h2 className="slm-opt-title">Where stemLM appears</h2>
        {(Object.keys(PLATFORM_LABELS) as PlatformId[]).map((id) => (
          <Toggle
            key={id}
            label={PLATFORM_LABELS[id]}
            checked={settings.enabledPlatforms[id]}
            onChange={(v) =>
              update({ enabledPlatforms: { ...settings.enabledPlatforms, [id]: v } })
            }
          />
        ))}
      </section>

      <section className="slm-opt-card">
        <h2 className="slm-opt-title">Privacy</h2>
        <Toggle
          label="Opt out of anonymous usage analytics"
          hint="We only count how many questions are asked and solved — never your content."
          checked={settings.analyticsOptOut}
          onChange={(v) => update({ analyticsOptOut: v })}
        />
      </section>

      <footer className="slm-options-foot">
        stemLM · structured STEM study overlay · settings save automatically
      </footer>
    </div>
  );
}
