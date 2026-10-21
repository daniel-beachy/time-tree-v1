import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// After a redeploy, an open tab may request code chunks that no longer exist. Reload once to pick up the new build.
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('deeproots:reloaded') === location.href) return;
    sessionStorage.setItem('deeproots:reloaded', location.href);
  } catch { /* storage unavailable: still try one reload */ }
  e.preventDefault();
  location.reload();
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
