import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MotionPreference } from './lib/motion-pref';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Follows prefers-reduced-motion unless the viewer opts in or out (lib/motion-pref.tsx). */}
    <MotionPreference>
      <App />
    </MotionPreference>
  </StrictMode>,
);
