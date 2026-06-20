import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { initTheme } from '../shared/theme';
import { OptionsApp } from './OptionsApp';

initTheme();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
