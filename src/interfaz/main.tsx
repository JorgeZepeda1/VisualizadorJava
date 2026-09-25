// Punto de entrada real (design.md §1.2, ADR 013/014). Reemplaza el marcador `index.ts` de la
// tarea 0.1 — `index.html` ya apunta aquí desde esta tarea (0.14). El registro del service worker
// (tarea 0.11) se dispara después de montar, para no retrasar el primer pintado.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { registrarServiceWorker } from './pwa/registro.ts';

const raiz = document.getElementById('raiz');
if (!raiz) {
  throw new Error('No se encontró el elemento #raiz en index.html');
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registrarServiceWorker();
