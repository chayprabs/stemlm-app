import { useEffect, useRef, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { getSettings, onSettingsChanged } from '@/src/lib/settings';
import { analyticsEnabled } from '@/src/lib/analytics';
import { applyTheme, persistThemeBoot, resolveTheme, type ResolvedTheme } from '@/src/lib/theme';
import { injectControlCss } from '@/src/lib/inject-control-css';
import { STUDY_GUIDE_FILENAME } from '@/src/lib/study-guide';
import { BrandWordmark, themeToBrandVariant } from '@/src/components/brand';
import { HostLogo } from '@/src/components/host-logos';
import { InjectGlyph } from '@/src/components/InjectGlyph';
import { DiagramRenderer } from '@/src/components/DiagramRenderer';
import { MathMarkdown } from '@/src/components/MathMarkdown';
import { StepIndexMark } from '@/src/components/step-index';
import { IconArrowUpRight, IconPdf } from '@/src/components/icons';
import { CHAT_HOST_LAUNCH } from '@/src/platforms/hosts';
import { DEMO_CAPSULE, DEMO_QUESTION } from '@/src/components/pages/demo-answer';
import { GALLERY_FIGURES, type GalleryFigure } from '@/src/components/pages/figure-gallery';
import { DemoPanel } from './DemoPanel';

const SOURCE_URL = 'https://github.com/chayprabs/stemlm-app';
const PRIVACY_URL = 'https://www.stemlm.app/privacy';
const TERMS_URL = 'https://www.stemlm.app/terms';

/** The composer control's own rules, scoped to this page: the crops below are the real control. */
const CONTROL_CSS = injectControlCss('.slm-welcome ', (scheme) => `[data-stemlm-theme="${scheme}"]`);

const FACTS: readonly { title: string; text: string }[] = [
  {
    title: 'No account',
    text: 'No login, subscription or payment details. You keep using your own account with the chat service.',
  },
  {
    title: 'No study server',
    text: `stemlm reads the question and the answer on the chat page and builds the study view in your browser. ${
      analyticsEnabled()
        ? 'It sends only usage statistics, such as how often the panel opens, never your questions or answers. Turn them off in Settings.'
        : 'It sends no usage data.'
    }`,
  },
  {
    title: 'Saved in this browser',
    text: 'Questions you save stay in this browser’s extension storage until you delete them.',
  },
  {
    title: 'You press Send',
    text: 'The stemlm button attaches a guide to your message. stemlm never sends a message for you.',
  },
  {
    title: 'Laid out, not verified',
    text: 'The steps come from your AI model. stemlm lays them out and draws the figures they describe. It does not check them.',
  },
  {
    title: 'Open source',
    text: 'Every line of the extension is public under the MIT licence.',
  },
];

function manifestVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return '';
  }
}

/** A neutral send control for the composer crops: a shape, not any chat's button. */
function SendShape() {
  return (
    <span className="slm-welcome-send" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" />
        <path d="m6 11 6-6 6 6" />
      </svg>
    </span>
  );
}

/** The stemlm button as it is drawn in a chat box, in one of its real states. Decorative here. */
function ControlCrop({ state }: { state: 'idle' | 'attached' | 'open' }) {
  const stateClass = state === 'attached' ? 'is-attached' : state === 'open' ? 'is-panel-open' : '';
  return (
    <span className={`slm-inject-btn ${stateClass}`}>
      <InjectGlyph attached={state !== 'idle'} />
    </span>
  );
}

function Composer({ children, state, chip }: { children: ReactNode; state: 'idle' | 'attached' | 'open'; chip?: boolean }) {
  return (
    <div className="slm-welcome-composer">
      {chip && (
        <span className="slm-welcome-chip">
          <IconPdf width={13} height={13} />
          {STUDY_GUIDE_FILENAME}
        </span>
      )}
      <p className="slm-welcome-composer-text">{children}</p>
      <div className="slm-welcome-composer-row">
        <ControlCrop state={state} />
        <SendShape />
      </div>
    </div>
  );
}

/** Compiles its figure only once it is near the viewport; a figure that will not draw takes its tile with it. */
function GalleryTile({ figure, theme }: { figure: GalleryFigure; theme: ResolvedTheme }) {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  if (failed) return null;
  return (
    <figure ref={ref} className="slm-welcome-fig">
      <div className="slm-welcome-fig-plate">
        {near && (
          <DiagramRenderer
            diagram={figure.diagram}
            theme={theme}
            onCompileFailure={(failure) => {
              if (failure) setFailed(true);
            }}
          />
        )}
      </div>
      <figcaption>
        <span className="slm-welcome-fig-label">{figure.label}</span>
        <span className="slm-welcome-fig-field">{figure.field}</span>
      </figcaption>
    </figure>
  );
}

/** First-run guide, opened once after install and linked from the toolbar popup. */
export default function App() {
  const [theme, setTheme] = useState<ResolvedTheme>(() =>
    document.documentElement.getAttribute('data-stemlm-theme') === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    const apply = (pref: Parameters<typeof resolveTheme>[0]) => {
      const resolved = resolveTheme(pref);
      persistThemeBoot(pref, resolved);
      applyTheme(document.documentElement, resolved);
      applyTheme(document.body, resolved);
      setTheme(resolved);
    };
    void getSettings().then((s) => apply(s.theme));
    return onSettingsChanged((s) => apply(s.theme));
  }, []);

  const version = manifestVersion();
  const demoStep = DEMO_CAPSULE?.steps.find((step) => step.formula);

  return (
    <div className="slm-welcome">
      <style>{CONTROL_CSS}</style>

      <header className="slm-welcome-top">
        <BrandWordmark variant={themeToBrandVariant(theme)} height={24} />
        <a className="slm-welcome-top-link" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          Source
          <IconArrowUpRight width={13} height={13} aria-hidden="true" />
        </a>
      </header>

      <main>
        <section className="slm-welcome-hero">
          <p className="slm-welcome-kicker">How to use stemlm</p>
          <h1 className="slm-welcome-title">Turn a chat answer into steps you can study.</h1>
          <p className="slm-welcome-lede">
            stemlm sits beside ChatGPT, Claude, Gemini and Grok. Ask a STEM question there and it lays the answer out
            one step at a time, with the formulas typeset and the figures drawn.
          </p>
          <nav className="slm-welcome-start" aria-label="Start in a chat">
            <span className="slm-welcome-start-label">Start in</span>
            <div className="slm-welcome-hosts">
              {CHAT_HOST_LAUNCH.map((host) => (
                <a key={host.id} className="slm-welcome-host" href={host.url} target="_blank" rel="noopener noreferrer">
                  <HostLogo id={host.id} size={18} />
                  {host.label}
                </a>
              ))}
            </div>
          </nav>
        </section>

        {DEMO_CAPSULE && (
          <section className="slm-welcome-section slm-welcome-demo" aria-labelledby="slm-welcome-demo-title">
            <div className="slm-welcome-section-head">
              <h2 id="slm-welcome-demo-title">Try it here</h2>
              <p>
                This is the study panel itself, on a built-in example. Move through it with the numbered marks, the
                buttons, or the arrow keys.
              </p>
            </div>
            <div className="slm-demo-frame">
              <div className="slm-demo-chat" aria-hidden="true" inert>
                <p className="slm-demo-chat-label">Your chat</p>
                <div className="slm-demo-thread">
                  <p className="slm-demo-bubble">{DEMO_QUESTION}</p>
                  <div className="slm-demo-reply">
                    <span style={{ width: '92%' }} />
                    <span style={{ width: '78%' }} />
                    <span style={{ width: '86%' }} />
                    <span style={{ width: '54%' }} />
                  </div>
                </div>
                <Composer state="open">Ask a follow-up</Composer>
              </div>
              <DemoPanel capsule={DEMO_CAPSULE} question={DEMO_QUESTION} theme={theme} />
            </div>
            <p className="slm-welcome-keys">
              <span>In the panel</span>
              <span className="slm-welcome-key-group">
                <kbd>←</kbd>
                <kbd>→</kbd>
                move between steps
              </span>
              <span className="slm-welcome-key-group">
                <kbd>Esc</kbd>
                closes the panel
              </span>
            </p>
          </section>
        )}

        <section className="slm-welcome-section" aria-labelledby="slm-welcome-how-title">
          <div className="slm-welcome-section-head">
            <h2 id="slm-welcome-how-title">Three steps</h2>
          </div>
          <ol className="slm-welcome-steps">
            <li className="slm-welcome-step">
              <div className="slm-welcome-illo" aria-hidden="true" inert>
                <Composer state="idle">A 5.0 kg block is released from rest on a 30° incline…</Composer>
              </div>
              <span className="slm-welcome-step-num">01</span>
              <h3>Ask</h3>
              <p>Type a STEM question in ChatGPT, Claude, Gemini or Grok, the way you normally would.</p>
            </li>
            <li className="slm-welcome-step">
              <div className="slm-welcome-illo" aria-hidden="true" inert>
                <Composer state="attached" chip>A 5.0 kg block is released from rest on a 30° incline…</Composer>
              </div>
              <span className="slm-welcome-step-num">02</span>
              <h3>Attach with the stemlm button</h3>
              <p>
                Click the stemlm button in the chat box. It attaches the stemlm guide to your message. Then press Send
                yourself.
              </p>
            </li>
            <li className="slm-welcome-step">
              <div className="slm-welcome-illo slm-welcome-illo--page" aria-hidden="true" inert>
                <div className="slm-welcome-sheet">
                  <div className="slm-welcome-marks">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`slm-step-rail-item${n === 2 ? ' is-active' : n < 2 ? ' is-past' : ''}`}>
                        <span className="slm-step-rail-mark"><StepIndexMark n={n} /></span>
                      </span>
                    ))}
                  </div>
                  {demoStep?.formula && (
                    <div className="slm-formula">
                      <span className="slm-formula-label">Formula</span>
                      <MathMarkdown content={demoStep.formula} mathMode="display" />
                    </div>
                  )}
                </div>
              </div>
              <span className="slm-welcome-step-num">03</span>
              <h3>Study</h3>
              <p>
                The answer opens beside the chat as steps, with formulas, figures and quick checks. Save it, export a
                PDF, or ask about any step.
              </p>
            </li>
          </ol>
        </section>

        <section className="slm-welcome-section" aria-labelledby="slm-welcome-draw-title">
          <div className="slm-welcome-section-head">
            <h2 id="slm-welcome-draw-title">What it can draw</h2>
            <p>
              Figures are not images from the model. The model writes a short description and stemlm draws it in your
              browser, the same way every time. If a description is incomplete, the figure is left out instead of
              guessed.
            </p>
          </div>
          <div className="slm-welcome-gallery">
            {GALLERY_FIGURES.map((figure) => (
              <GalleryTile key={figure.id} figure={figure} theme={theme} />
            ))}
          </div>
        </section>

        <section className="slm-welcome-section" aria-labelledby="slm-welcome-facts-title">
          <div className="slm-welcome-section-head">
            <h2 id="slm-welcome-facts-title">What stemlm does, and what it does not</h2>
          </div>
          <dl className="slm-welcome-facts">
            {FACTS.map((fact) => (
              <div key={fact.title} className="slm-welcome-fact">
                <dt>{fact.title}</dt>
                <dd>{fact.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="slm-welcome-foot">
        <span className="slm-welcome-foot-version">{version ? `stemlm ${version}` : 'stemlm'}</span>
        <nav className="slm-welcome-foot-links" aria-label="About stemlm">
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Source</a>
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy</a>
          <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms</a>
        </nav>
      </footer>
    </div>
  );
}
