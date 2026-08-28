import { useEffect } from 'react';
import { getSettings } from '@/src/lib/settings';
import { applyTheme, persistThemeBoot, resolveTheme } from '@/src/lib/theme';
import { SavedLibraryOverlay } from '@/src/components/SavedLibraryOverlay';

export default function App() {
  useEffect(() => {
    getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      persistThemeBoot(s.theme, resolved);
      applyTheme(document.documentElement, resolved);
      applyTheme(document.body, resolved);
    });
  }, []);

  return (
    <div className="slm-library-page-shell">
      <SavedLibraryOverlay layout="page" onClose={() => window.close()} />
    </div>
  );
}
