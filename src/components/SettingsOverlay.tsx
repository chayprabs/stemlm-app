import { Fragment, useEffect, useState } from 'react';
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
import { BrandWordmark, themeToBrandVariant } from './brand';
import { IconClose } from './icons';
import { SETTINGS_LABEL } from '@/src/lib/saved-library';

/**
 * Footer links. Destinations are wired up separately — these render the row so
 * the layout is settled; each carries a `data-link` id for the handler to hook.
 */
export const SETTINGS_LEGAL_LINKS = [
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'contact', label: 'Contact Us' },
] as const;

export const ANALYTICS_LABEL = 'Share anonymous usage data';
export const ANALYTICS_HINT = 'Never your questions or answers.';

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
    <div className="slm-set-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`slm-set-seg-btn ${value === option.id ? 'is-active' : ''}`}
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
    <div className="slm-set-row">
      <div className="slm-set-row-top">
        <span className="slm-set-copy">
          <span className="slm-settings-label">{label}</span>
          <span className="slm-settings-hint">{hint}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          className={`slm-set-switch ${checked ? 'is-on' : ''}`}
          onClick={() => onChange(!checked)}
        >
          <span className="slm-set-knob" />
        </button>
      </div>
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
  // Presentation only for now: on by default, flips so both states are visible,
  // but deliberately not persisted and not wired to any analytics call yet.
  const [shareUsageData, setShareUsageData] = useState(true);

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
            <div className="slm-set-row">
              <span className="slm-settings-copy">
                <span className="slm-settings-label">Theme</span>
                <span className="slm-settings-hint">Follows your system.</span>
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
            <div className="slm-set-row">
              <span className="slm-settings-copy">
                <span className="slm-settings-label">Answers open on</span>
                <span className="slm-settings-hint">Steps or the full solution.</span>
              </span>
              <Segmented
                label="Answers open on"
                value={settings.defaultView}
                options={
                  [
                    { id: 'steps', label: 'Steps' },
                    { id: 'solution', label: 'Solution' },
                  ] as const
                }
                onChange={(defaultView) => void update({ defaultView })}
              />
            </div>
            <Toggle
              label="Share sessions across tabs"
              hint="Same session on every chat tab."
              checked={settings.shareAcrossTabs}
              onChange={(shareAcrossTabs) => void update({ shareAcrossTabs })}
            />
            <Toggle
              label="Open the panel automatically"
              hint="When the answer starts."
              checked={settings.autoOpenOnAnswer}
              onChange={(autoOpenOnAnswer) => void update({ autoOpenOnAnswer })}
            />
          </section>

          <section className="slm-settings-group">
            <h3 className="slm-settings-group-title">Privacy</h3>
            <Toggle
              label={ANALYTICS_LABEL}
              hint={ANALYTICS_HINT}
              checked={shareUsageData}
              onChange={setShareUsageData}
            />
          </section>
        </div>

        <footer className="slm-settings-foot">
          <p className="slm-settings-foot-note">Changes save automatically</p>
          <nav className="slm-settings-links" aria-label="About stemLM">
            {SETTINGS_LEGAL_LINKS.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 && <span className="slm-settings-links-sep" aria-hidden="true" />}
                <button type="button" className="slm-settings-link" data-link={item.id}>
                  {item.label}
                </button>
              </Fragment>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
