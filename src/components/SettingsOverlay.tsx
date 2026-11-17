import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { browser } from 'wxt/browser';
import {
  DEFAULT_SETTINGS,
  MAX_CONTENT_SCALE,
  MIN_CONTENT_SCALE,
  getSettings,
  normalizeContentScale,
  onSettingsChanged,
  setSettings,
  type ContentScale,
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
import { IconClose, IconTextLarger, IconTextSmaller } from './icons';
import { SETTINGS_LABEL } from '@/src/lib/saved-library';
import { useDialogFocus } from './use-dialog-focus';

/** Footer links. Plain anchors so they open a tab from the panel and the settings page alike. */
export const SETTINGS_LEGAL_LINKS = [
  { id: 'privacy', label: 'Privacy Policy', href: 'https://www.stemlm.app/privacy' },
  { id: 'terms', label: 'Terms & Conditions', href: 'https://www.stemlm.app/terms' },
  { id: 'contact', label: 'Contact Us', href: 'https://github.com/chayprabs/stemlm-app/issues' },
] as const;

function applyPageTheme(pref: ThemePref, resolved: ResolvedTheme, layout: 'overlay' | 'page') {
  if (layout === 'page' || document.documentElement.classList.contains('slm-popup-page')) {
    persistThemeBoot(pref, resolved);
    applyTheme(document.documentElement, resolved);
    applyTheme(document.body, resolved);
  }
}

/**
 * Reading size of answer text at each level, in px. Mirrors `.slm-panel[data-content-scale]` in
 * assets/panel.css (15px at level 2, one pixel a level); a test holds the two together.
 */
export const READING_SIZE_PX: Record<ContentScale, number> = { 1: 14, 2: 15, 3: 16, 4: 17, 5: 18 };

const READING_LEVELS: readonly ContentScale[] = [1, 2, 3, 4, 5];

function manifestVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return '';
  }
}

/** A setting: what it is called and what it does on the left, its control on the right. */
function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="slm-set-row">
      <span className="slm-set-copy">
        <span className="slm-settings-label">{label}</span>
        <span className="slm-settings-hint">{hint}</span>
      </span>
      {children}
    </div>
  );
}

/** One choice of a few. The thumb slides under the chosen label, like the panel's Steps | Solution. */
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
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  return (
    <div
      className="slm-set-seg"
      role="group"
      aria-label={label}
      style={{ '--slm-seg-count': options.length, '--slm-seg-index': index } as CSSProperties}
    >
      <span className="slm-set-seg-thumb" aria-hidden="true" />
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
    <Row label={label} hint={hint}>
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
    </Row>
  );
}

/** Five reading sizes on one track, with a line of sample text set at the chosen size. */
function ReadingSize({ value, onChange }: { value: ContentScale; onChange: (value: ContentScale) => void }) {
  return (
    <div className="slm-set-row slm-set-row--stack">
      <Row label="Reading size" hint="Size of answer text in the panel.">
        <span className="slm-set-scale">
          <IconTextSmaller width={15} height={15} aria-hidden="true" />
          <span className="slm-set-scale-track">
            {READING_LEVELS.map((level) => (
              <span key={level} className={`slm-set-scale-tick ${level <= value ? 'is-on' : ''}`} aria-hidden="true" />
            ))}
            <input
              type="range"
              className="slm-set-scale-input"
              min={MIN_CONTENT_SCALE}
              max={MAX_CONTENT_SCALE}
              step={1}
              value={value}
              aria-label="Reading size"
              aria-valuetext={`Level ${value} of ${MAX_CONTENT_SCALE}`}
              onChange={(e) => onChange(normalizeContentScale(Number(e.target.value)))}
            />
          </span>
          <IconTextLarger width={18} height={18} aria-hidden="true" />
        </span>
      </Row>
      <p className="slm-set-preview" style={{ fontSize: READING_SIZE_PX[value] }} aria-hidden="true">
        The block accelerates at 3.2 m/s².
      </p>
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
  const dialogRef = useDialogFocus<HTMLDivElement>('container');
  const [error, setError] = useState<string | null>(null);
  // What was just saved, for assistive technology: the controls already show it to the eye.
  const [saved, setSaved] = useState('');
  const writes = useRef(0);
  const version = manifestVersion();

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

  async function update(patch: Partial<Settings>, announce: string) {
    const prev = settings;
    const write = ++writes.current;
    // The control answers at once; storage catches up. A quick run of changes (arrow keys on the
    // reading-size scale) must each build on the last, so only the newest write settles the view.
    setLocal({ ...prev, ...patch });
    try {
      const next = await setSettings(patch);
      applyLiveSettings(next, prev);
      if (write !== writes.current) return;
      setLocal(next);
      const resolved = resolveTheme(next.theme);
      setTheme(resolved);
      applyPageTheme(next.theme, resolved, layout);
      setError(null);
      setSaved(`${announce}. Saved.`);
    } catch {
      if (write !== writes.current) return;
      setLocal(prev);
      setSaved('');
      setError('Could not save that setting. Try again.');
    }
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
        ref={dialogRef}
        className="slm-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slm-settings-title"
        tabIndex={-1}
      >
        <div className="slm-settings-dialog-head">
          <h2 id="slm-settings-title" className="slm-settings-dialog-title">
            <BrandWordmark variant={themeToBrandVariant(theme)} height={22} />
            <span className="slm-settings-kicker">{SETTINGS_LABEL}</span>
          </h2>
          <button type="button" className="slm-settings-close" aria-label="Close" onClick={onClose}>
            <IconClose width={16} height={16} />
          </button>
        </div>

        <div className="slm-settings-body">
          {error && <p className="slm-settings-error" role="alert">{error}</p>}
          <section className="slm-settings-group" aria-labelledby="slm-settings-appearance">
            <h3 id="slm-settings-appearance" className="slm-settings-group-title">Appearance</h3>
            <Row
              label="Theme"
              hint={settings.theme === 'auto' ? 'Follows your system.' : `Always ${settings.theme}.`}
            >
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
                onChange={(themePref) => void update({ theme: themePref }, `Theme: ${themePref}`)}
              />
            </Row>
            <ReadingSize
              value={settings.contentScale}
              onChange={(contentScale) =>
                void update({ contentScale }, `Reading size: level ${contentScale} of ${MAX_CONTENT_SCALE}`)}
            />
          </section>

          <section className="slm-settings-group" aria-labelledby="slm-settings-behaviour">
            <h3 id="slm-settings-behaviour" className="slm-settings-group-title">Behaviour</h3>
            <Row label="Answers open on" hint="The view a new answer starts in.">
              <Segmented
                label="Answers open on"
                value={settings.defaultView}
                options={
                  [
                    { id: 'steps', label: 'Steps' },
                    { id: 'solution', label: 'Solution' },
                  ] as const
                }
                onChange={(defaultView) => void update({ defaultView }, `Answers open on ${defaultView}`)}
              />
            </Row>
            <Toggle
              label="Share sessions across tabs"
              hint="Every chat tab shows the same open questions. When off, each tab starts fresh."
              checked={settings.shareAcrossTabs}
              onChange={(shareAcrossTabs) =>
                void update({ shareAcrossTabs }, `Share sessions across tabs: ${shareAcrossTabs ? 'on' : 'off'}`)}
            />
            <Toggle
              label="Open the panel automatically"
              hint="The study panel opens as soon as an answer starts arriving."
              checked={settings.autoOpenOnAnswer}
              onChange={(autoOpenOnAnswer) =>
                void update({ autoOpenOnAnswer }, `Open the panel automatically: ${autoOpenOnAnswer ? 'on' : 'off'}`)}
            />
          </section>
        </div>

        <footer className="slm-settings-foot">
          <div className="slm-settings-foot-row">
            <p className="slm-settings-foot-note">Changes save automatically</p>
            {version && <span className="slm-settings-version">stemlm {version}</span>}
          </div>
          <span className="slm-sr-only" role="status" aria-live="polite">{saved}</span>
          <nav className="slm-settings-links" aria-label="About stemlm">
            {SETTINGS_LEGAL_LINKS.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 && <span className="slm-settings-links-sep" aria-hidden="true" />}
                <a
                  className="slm-settings-link"
                  data-link={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.label}
                </a>
              </Fragment>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
