import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from './db/db.js';
import { router } from './router.js';
import { installSyncTriggers } from './sync/triggers.js';
import './app.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('missing #root element');
createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
installSyncTriggers({ db });
