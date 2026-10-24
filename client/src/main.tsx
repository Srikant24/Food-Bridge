import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runAxeAudit } from './utils/a11yAudit'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// In development, automatically audit accessibility and log WCAG violations to console
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      runAxeAudit();
    }, 1500);
  });
}

