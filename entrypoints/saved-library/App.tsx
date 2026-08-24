import { useEffect, useState } from 'react';
import { getSettings } from '@/src/lib/settings';
import { applyTheme, resolveTheme } from '@/src/lib/theme';
import { SavedLibraryOverlay } from '@/src/components/SavedLibraryOverlay';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      applyTheme(document.documentElement, resolved);
      applyTheme(document.body, resolved);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <div className="slm-library-page-shell">
      <SavedLibraryOverlay layout="page" onClose={() => window.close()} />
    </div>
  );
}
