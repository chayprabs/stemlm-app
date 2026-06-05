import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, getSettings, setSettings, type Settings } from '@/src/lib/settings';
import { resolveTheme, applyTheme, type ThemePref } from '@/src/lib/theme';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import type { PlatformId } from '@/src/platforms/types';
import {
  IconLogo,
  IconSun,
  IconMoon,
  IconSpark,
  IconLayers,
  IconBook,
  IconCheck,
} from '@/src/components/icons';

const PLATFORM_LABELS: Record<PlatformId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  grok: 'Grok',
  deepseek: 'DeepSeek',
};

const THEME_OPTIONS: { id: ThemePref; label: string; Icon: typeof IconSun }[] = [
  { id: 'auto', label: 'Auto', Icon: IconSpark },
  { id: 'light', label: 'Light', Icon: IconSun },
  { id: 'dark', label: 'Dark', Icon: IconMoon },
];

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

function OptionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof IconSun;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="slm-opt-card">
      <div className="slm-opt-card-head">
        <span className="slm-opt-card-icon">
          <Icon width={14} height={14} />
        </span>
        <h2 className="slm-opt-title">{title}</h2>
      </div>
      <div className="slm-opt-body">{children}</div>
    </section>
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
        <span className="slm-brand-mark">
          <IconLogo width={16} height={16} />
        </span>
        <div className="slm-options-head-text">
          <h1>stemLM Settings</h1>
          <p className="slm-options-subtitle">Structured STEM study overlay — preferences save automatically</p>
        </div>
      </header>

      <div className="slm-options-stack">
        <OptionCard icon={IconSun} title="Appearance">
          <div className="slm-opt-row">
            <span className="slm-opt-text">
              <span className="slm-opt-label">Theme</span>
              <span className="slm-opt-hint">Auto follows your system light/dark setting.</span>
            </span>
            <div className="slm-seg" role="group" aria-label="Theme">
              {THEME_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`slm-seg-btn ${settings.theme === id ? 'is-active' : ''}`}
                  onClick={() => update({ theme: id })}
                >
                  <Icon width={13} height={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </OptionCard>

        <OptionCard icon={IconLayers} title="Behaviour">
          <Toggle
            label="Share sessions across tabs"
            hint="Off (default): each chatbot tab gets its own fresh workspace."
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
        </OptionCard>

        <OptionCard icon={IconBook} title="Where stemLM appears">
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
        </OptionCard>

        <OptionCard icon={IconCheck} title="Privacy">
          <Toggle
            label="Opt out of anonymous usage analytics"
            hint="We only count how many questions are asked and solved — never your content."
            checked={settings.analyticsOptOut}
            onChange={(v) => update({ analyticsOptOut: v })}
          />
        </OptionCard>
      </div>

      <footer className="slm-options-foot">
        stemLM · structured STEM study overlay · settings save automatically
      </footer>
    </div>
  );
}
