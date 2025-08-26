import React from 'react';
import { createRoot } from 'react-dom/client';
import { initFirebase } from './config/database.config';
import { ThemeProvider, ToastProvider, ToastContainer } from './shared';
import './shared/styles/globals.css';

const container = document.getElementById('root');
async function start() {
  await initFirebase();
  const { default: App } = await import('./app/App');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <ThemeProvider>
          <ToastProvider>
            <App />
            <ToastContainer position="top-right" />
          </ToastProvider>
        </ThemeProvider>
      </React.StrictMode>
    );
  }
}

start();


