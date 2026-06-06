import { useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  onSettingsChanged,
  setSettings,
  type Settings,
} from '@/src/lib/settings';
import { resolveTheme, applyTheme, type ThemePref } from '@/src/lib/theme';
import type { PromptVariant } from '@/src/protocol/protocol';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { StemMark } from '@/src/components/icons';

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
        aria-label={label}
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
    return onSettingsChanged(setLocal);
  }, []);

  useEffect(() => {
    const theme = resolveTheme(settings.theme);
    applyTheme(document.documentElement, theme);
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
        <span className="slm-brand-mark" aria-hidden="true">
          <StemMark width={16} height={16} />
        </span>
        <h1>
          <BrandWordmark /> Settings
        </h1>
      </header>

      <section className="slm-opt-card">
        <h2 className="slm-opt-title">Appearance</h2>
        <div className="slm-opt-row">
          <span className="slm-opt-text">
            <span className="slm-opt-label">Theme</span>
            <span className="slm-opt-hint">
              Auto follows your system light/dark setting. The panel sun/moon toggle saves light or
              dark here.
            </span>
          </span>
          <div className="slm-seg" role="group" aria-label="Theme">
            {(['auto', 'light', 'dark'] as ThemePref[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`slm-seg-btn ${settings.theme === t ? 'is-active' : ''}`}
                aria-pressed={settings.theme === t}
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
          hint="Off (default): each Gemini tab gets its own fresh workspace. On: the active study session follows you across Gemini tabs."
          checked={settings.shareAcrossTabs}
          onChange={(v) => update({ shareAcrossTabs: v })}
        />
        <Toggle
          label="Open the panel automatically"
          hint="Open the study panel when the answer starts — not while you're still typing."
          checked={settings.autoOpenOnAnswer}
          onChange={(v) => update({ autoOpenOnAnswer: v })}
        />
        <div className="slm-opt-row">
          <span className="slm-opt-text">
            <span className="slm-opt-label">Default subject</span>
            <span className="slm-opt-hint">
              Pre-selects the subject chip beside the inject button. Auto detects from your
              question.
            </span>
          </span>
          <select
            className="slm-select"
            value={settings.defaultSubject}
            aria-label="Default subject"
            onChange={(e) => update({ defaultSubject: e.target.value as Subject | 'Auto' })}
          >
            <option value="Auto">Auto (recommended)</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="slm-opt-card">
        <h2 className="slm-opt-title">Protocol</h2>
        <div className="slm-opt-row">
          <span className="slm-opt-text">
            <span className="slm-opt-label">Prompt variant</span>
            <span className="slm-opt-hint">
              Balanced is the production default. Ultra sends a shorter protocol to save tokens —
              use only if answers stay complete on your model.
            </span>
          </span>
          <div className="slm-seg" role="group" aria-label="Prompt variant">
            {(['balanced', 'ultra'] as PromptVariant[]).map((variant) => (
              <button
                key={variant}
                type="button"
                className={`slm-seg-btn ${settings.promptVariant === variant ? 'is-active' : ''}`}
                aria-pressed={settings.promptVariant === variant}
                onClick={() => update({ promptVariant: variant })}
              >
                {variant[0]!.toUpperCase() + variant.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="slm-opt-card">
        <h2 className="slm-opt-title">Privacy</h2>
        <Toggle
          label="Opt out of anonymous usage analytics"
          hint="We only count events like questions asked and PDFs exported — never your content."
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
