import { createRoot } from 'react-dom/client';
import App from './App';
import 'katex/dist/katex.min.css';
import '../../assets/tailwind.css';
// The live demo is the study panel's own parts, so the page loads the panel's own sheet.
import '../../assets/panel.css';
import '../../assets/pages.css';
import { bootExtensionPageTheme } from '@/src/lib/theme-boot';
import { installFontFaces } from '@/src/lib/fonts';
import { extensionAssetUrl } from '@/src/lib/extension-context';

bootExtensionPageTheme();
installFontFaces(document, extensionAssetUrl);

createRoot(document.getElementById('root')!).render(<App />);
