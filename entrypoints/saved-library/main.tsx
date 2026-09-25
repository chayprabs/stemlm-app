import { createRoot } from 'react-dom/client';
import App from './App';
import 'katex/dist/katex.min.css';
import '../../assets/tailwind.css';
import '../../assets/pages.css';
import { bootExtensionPageTheme } from '@/src/lib/theme-boot';

bootExtensionPageTheme();

createRoot(document.getElementById('root')!).render(<App />);
