import { useState } from 'react';

/**
 * Placeholder content-script app (M0 scaffold).
 *
 * Confirms React + Tailwind render correctly inside the Shadow DOM. Replaced by
 * the real overlay button + study panel in later milestones.
 */
export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <div data-stemlm-theme="light">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[2147483646] flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg"
        style={{ background: 'var(--slm-accent)', color: 'var(--slm-accent-fg)' }}
      >
        stemLM
      </button>

      {open && (
        <div
          className="fixed right-0 top-0 z-[2147483645] flex h-screen w-[min(480px,46vw)] flex-col border-l p-4"
          style={{
            background: 'var(--slm-bg)',
            color: 'var(--slm-fg)',
            borderColor: 'var(--slm-border)',
            boxShadow: 'var(--slm-shadow)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--slm-fg-muted)' }}>
            stemLM study panel — scaffold
          </p>
        </div>
      )}
    </div>
  );
}
