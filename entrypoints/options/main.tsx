import { createRoot } from 'react-dom/client';
import App from './App';
import '../../assets/tailwind.css';
import '../../assets/pages.css';
import '../../assets/settings.css';

createRoot(document.getElementById('root')!).render(<App />);
