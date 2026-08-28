import { createRoot } from 'react-dom/client';
import App from './App';
import 'katex/dist/katex.min.css';
import '../../assets/tailwind.css';
import '../../assets/pages.css';

createRoot(document.getElementById('root')!).render(<App />);
