import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Onboarding from './Onboarding.jsx';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// Workbox is configured with skipWaiting + clientsClaim (see vite.config.js),
// so a new service worker takes control automatically without waiting for
// all tabs to close. The one thing that still needs a manual nudge is the
// already-open tab's in-memory JS/DOM — it keeps running the old bundle
// until we reload. 'controllerchange' fires exactly once when the new SW
// takes over, so we reload there instead of relying on onNeedRefresh (which
// only fires in 'prompt' mode, not 'autoUpdate'). The sessionStorage guard
// stops a reload loop if something ever fires this more than once.
registerSW({ immediate: true });

if ('serviceWorker' in navigator) {
navigator.serviceWorker.addEventListener('controllerchange', () => {
if (sessionStorage.getItem('sw-reloaded')) return;
sessionStorage.setItem('sw-reloaded', '1');
window.location.reload();
});
}

// /onboarding is the post-payment setup form (see src/Onboarding.jsx).
// Everything else falls through to the demo/dashboard app. vercel.json
// rewrites all paths to this same index.html, so pathname is checked
// here rather than adding a router dependency.
const isOnboarding = typeof window !== 'undefined' && window.location.pathname.replace(/\/$/, '') === '/onboarding';

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
{isOnboarding ? <Onboarding /> : <App />}
</React.StrictMode>
);
