/**
 * Settings page (M0 scaffold). The full settings UI (theme, share-across-tabs,
 * auto-open, platform toggles, analytics opt-out) lands in M5.
 */
export default function App() {
  return (
    <div
      className="mx-auto max-w-2xl p-8"
      style={{ background: 'var(--slm-bg)', color: 'var(--slm-fg)', fontFamily: 'var(--font-sans)' }}
    >
      <h1 className="text-xl font-semibold" style={{ color: 'var(--slm-accent)' }}>
        stemLM Settings
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--slm-fg-muted)' }}>
        Settings coming online soon.
      </p>
    </div>
  );
}
