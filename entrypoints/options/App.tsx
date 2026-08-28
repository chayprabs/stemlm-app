import { useEffect, useRef, useState } from 'react';
import { getSettings } from '@/src/lib/settings';
import { applyTheme, persistThemeBoot, resolveTheme } from '@/src/lib/theme';
import { SettingsOverlay } from '@/src/components/SettingsOverlay';
import { watchFitCurrentWindowToContent } from '@/src/lib/fit-extension-window';

export default function App() {
  const [ready, setReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      persistThemeBoot(s.theme, resolved);
      applyTheme(document.documentElement, resolved);
      applyTheme(document.body, resolved);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !shellRef.current) return;
    return watchFitCurrentWindowToContent(shellRef.current, {
      minWidth: 440,
      maxWidth: 480,
      maxHeight: 640,
    });
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="slm-settings-page-shell" ref={shellRef}>
      <SettingsOverlay layout="page" onClose={() => window.close()} />
    </div>
  );
}
