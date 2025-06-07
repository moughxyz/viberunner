import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';
import './styles.css';

// Initialize Sentry as early as possible
Sentry.init({
  dsn: "https://7e4cc202ab26e009d2520ba4dfe5a080@o4509457868914688.ingest.us.sentry.io/4509457869832192",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});

// Apply dark mode class to document
document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);