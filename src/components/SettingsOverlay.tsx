import { useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  onSettingsChanged,
  setSettings,
  type Settings,
} from '@/src/lib/settings';
import { applyLiveSettings } from '@/src/lib/live-settings';
import {
  applyTheme,
  persistThemeBoot,
  resolveTheme,
  themeFromBootCache,
  type ResolvedTheme,
  type ThemePref,
} from '@/src/lib/theme';
import type { PromptVariant } from '@/src/protocol/protocol';
import { BrandWordmark, themeToBrandVariant } from './brand';
import { IconClose } from './icons';
import { SETTINGS_LABEL } from '@/src/lib/saved-library';

function applyPageTheme(pref: ThemePref, resolved: ResolvedTheme, layout: 'overlay' | 'page') {
  if (layout === 'page' || document.documentElement.classList.contains('slm-popup-page')) {
    persistThemeBoot(pref, resolved);
    applyTheme(document.documentElement, resolved);
    applyTheme(document.body, resolved);
  }
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="slm-settings-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`slm-settings-seg-btn ${value === option.id ? 'is-active' : ''}`}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="slm-settings-toggle">
      <span className="slm-settings-copy">
        <span className="slm-settings-label">{label}</span>
        <span className="slm-settings-hint">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`slm-settings-switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="slm-settings-switch-knob" />
      </button>
    </div>
  );
}

export function SettingsOverlay({
  onClose,
  layout = 'overlay',
}: {
  onClose: () => void;
  layout?: 'overlay' | 'page';
}) {
  const [settings, setLocal] = useState<Settings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ResolvedTheme>(() => themeFromBootCache());

  useEffect(() => {
    void getSettings().then((next) => {
      setLocal(next);
      const resolved = resolveTheme(next.theme);
      setTheme(resolved);
      applyPageTheme(next.theme, resolved, layout);
    });
    return onSettingsChanged((next) => {
      setLocal(next);
      const resolved = resolveTheme(next.theme);
      setTheme(resolved);
      applyPageTheme(next.theme, resolved, layout);
    });
  }, [layout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function update(patch: Partial<Settings>) {
    const prev = settings;
    const next = await setSettings(patch);
    setLocal(next);
    applyLiveSettings(next, prev);
    const resolved = resolveTheme(next.theme);
    setTheme(resolved);
    applyPageTheme(next.theme, resolved, layout);
  }

  return (
    <div
      className={`slm-settings-overlay slm-settings-overlay--${layout}`}
      data-stemlm-theme={theme}
      role="presentation"
    >
      {layout === 'overlay' && (
        <button
          type="button"
          className="slm-settings-overlay-backdrop"
          aria-label="Close settings"
          onClick={onClose}
        />
      )}
      <div
        className="slm-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slm-settings-title"
      >
        <div className="slm-settings-dialog-head">
          <h2 id="slm-settings-title" className="slm-settings-dialog-title">
            <BrandWordmark variant={themeToBrandVariant(theme)} height={28} />
            <span className="slm-settings-kicker">{SETTINGS_LABEL}</span>
          </h2>
          <button type="button" className="slm-settings-close" aria-label="Close" onClick={onClose}>
            <IconClose width={16} height={16} />
          </button>
        </div>

        <div className="slm-settings-body">
          <section className="slm-settings-group">
            <h3 className="slm-settings-group-title">Appearance</h3>
            <div className="slm-settings-stack">
              <span className="slm-settings-copy">
                <span className="slm-settings-label">Theme</span>
                <span className="slm-settings-hint">
                  Auto follows your system light/dark setting. The panel sun/moon toggle saves light
                  or dark here.
                </span>
              </span>
              <Segmented
                label="Theme"
                value={settings.theme}
                options={
                  [
                    { id: 'auto', label: 'Auto' },
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                  ] as const
                }
                onChange={(themePref) => void update({ theme: themePref })}
              />
            </div>
          </section>

          <section className="slm-settings-group">
            <h3 className="slm-settings-group-title">Behaviour</h3>
            <div className="slm-settings-rows">
              <Toggle
                label="Share sessions across tabs"
                hint="Off: each chat tab keeps its own workspace. On: the active study session follows you."
                checked={settings.shareAcrossTabs}
                onChange={(shareAcrossTabs) => void update({ shareAcrossTabs })}
              />
              <Toggle
                label="Open the panel automatically"
                hint="Open the study panel when the answer starts — not while you're still typing."
                checked={settings.autoOpenOnAnswer}
                onChange={(autoOpenOnAnswer) => void update({ autoOpenOnAnswer })}
              />
            </div>
          </section>

          <section className="slm-settings-group">
            <h3 className="slm-settings-group-title">Protocol</h3>
            <div className="slm-settings-stack">
              <span className="slm-settings-copy">
                <span className="slm-settings-label">Prompt variant</span>
                <span className="slm-settings-hint">
                  Balanced is the production default. Ultra sends a shorter protocol to save tokens.
                </span>
              </span>
              <Segmented
                label="Prompt variant"
                value={settings.promptVariant}
                options={
                  [
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'ultra', label: 'Ultra' },
                  ] as const satisfies readonly { id: PromptVariant; label: string }[]
                }
                onChange={(promptVariant) => void update({ promptVariant })}
              />
            </div>
          </section>

          <section className="slm-settings-group">
            <h3 className="slm-settings-group-title">Privacy</h3>
            <Toggle
              label="Opt out of anonymous usage analytics"
              hint="We only count events like questions asked and PDFs exported — never your content."
              checked={settings.analyticsOptOut}
              onChange={(analyticsOptOut) => void update({ analyticsOptOut })}
            />
          </section>
        </div>

        <p className="slm-settings-foot">Changes save automatically</p>
      </div>
    </div>
  );
}
