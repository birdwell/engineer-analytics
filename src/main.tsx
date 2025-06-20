import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureAbortSignalTimeout } from './utils/abortSignalTimeout';

// Ensure AbortSignal.timeout is available in all environments
ensureAbortSignalTimeout();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
