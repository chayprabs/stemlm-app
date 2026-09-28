import { useEffect, useState } from 'react';
import { getSettings } from '@/src/lib/settings';
import { applyTheme, persistThemeBoot, resolveTheme, type ResolvedTheme } from '@/src/lib/theme';
import { BrandWordmark, themeToBrandVariant } from '@/src/components/brand';
import { HostLogo } from '@/src/components/host-logos';
import { CHAT_HOST_LAUNCH } from '@/src/platforms/hosts';

/** Real screenshots of the extension, taken with the Playwright harness (ONBOARD-01). */
const STEPS = [
  {
    title: 'Ask in Claude, Gemini, or Grok',
    text: 'Type your question, then click the stemlm + button beside the chat box. It attaches the stemlm guide to your message.',
    image: '/welcome/attach.webp',
    size: [774, 144],
    alt: 'The stemlm + button beside a chat box, next to Send',
  },
  {
    title: 'Send, then study the steps',
    text: 'The answer opens in the study panel next to the chat, one step at a time, with its formulas and diagrams.',
    image: '/welcome/steps.webp',
    size: [802, 640],
    alt: 'The study panel showing a worked physics step with a force diagram',
  },
  {
    title: 'Keep what helps',
    text: 'Save an answer, download it as a PDF, or ask about any step right in the chat.',
    image: '/welcome/library.webp',
    size: [760, 250],
    alt: 'Saved questions, each with download, open, and delete actions',
  },
] as const;

/** First-run guide, opened once after install and linked from the toolbar popup. */
export default function App() {
  const [theme, setTheme] = useState<ResolvedTheme>(() =>
    document.documentElement.getAttribute('data-stemlm-theme') === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    void getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      persistThemeBoot(s.theme, resolved);
      applyTheme(document.documentElement, resolved);
      applyTheme(document.body, resolved);
      setTheme(resolved);
    });
  }, []);

  return (
    <main className="slm-welcome">
      <header className="slm-welcome-head">
        <BrandWordmark variant={themeToBrandVariant(theme)} height={26} />
      </header>
      <h1 className="slm-welcome-title">How to use stemlm</h1>
      <p className="slm-welcome-lede">Worked, step-by-step answers to STEM questions, laid out beside your chat.</p>

      <ol className="slm-welcome-steps">
        {STEPS.map((step, i) => (
          <li key={step.image} className="slm-welcome-step">
            <div className="slm-welcome-step-copy">
              <span className="slm-welcome-step-num" aria-hidden="true">{i + 1}</span>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
            <img className="slm-welcome-shot" src={step.image} alt={step.alt} width={step.size[0]} height={step.size[1]} loading={i === 0 ? 'eager' : 'lazy'} />
          </li>
        ))}
      </ol>

      <section className="slm-welcome-start" aria-labelledby="slm-welcome-start">
        <h2 id="slm-welcome-start">Start a chat</h2>
        <div className="slm-welcome-hosts">
          {CHAT_HOST_LAUNCH.map((host) => (
            <a key={host.id} className="slm-welcome-host" href={host.url} target="_blank" rel="noopener noreferrer">
              <HostLogo id={host.id} size={18} />
              {host.label}
            </a>
          ))}
        </div>
      </section>

      <p className="slm-welcome-note">
        stemlm has no server or account. It builds the study view in your browser, and the answers you save stay in
        your browser's extension storage.
      </p>
    </main>
  );
}
