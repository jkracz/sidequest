import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { initTheme } from '../shared/theme';
import { PopupApp } from './PopupApp';

initTheme();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
