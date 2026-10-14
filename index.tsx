// Ensure window.fetch has both getter and setter for external tooling / extensions
(function() {
  try {
    if (typeof window !== 'undefined') {
      const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (!desc || !desc.set) {
        let _fetch = window.fetch ? window.fetch.bind(window) : undefined;
        Object.defineProperty(window, 'fetch', {
          get: () => _fetch,
          set: (v) => { _fetch = v; },
          configurable: true,
          enumerable: true,
        });
      }
    }
  } catch (_) {}
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);