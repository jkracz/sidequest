import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { BlockedApp } from './BlockedApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlockedApp />
  </React.StrictMode>
);
