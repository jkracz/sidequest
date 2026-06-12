import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { initTheme } from '../shared/theme';
import { BlockedApp } from './BlockedApp';

initTheme();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlockedApp />
  </React.StrictMode>
);
