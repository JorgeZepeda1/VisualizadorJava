// Punto de entrada real (design.md §1.2, ADR 013/014). Reemplaza el marcador `index.ts` de la
// tarea 0.1 — `index.html` ya apunta aquí desde esta tarea (0.14). El registro del service worker
// (tareas 0.11 y 5.7) lo hace el contenedor `VersionNueva` dentro de un efecto: corre después de pintar,
// para no retrasar el primer pintado, y detiene la vigilancia de versiones si la app se desmonta.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './estilos/aplicacion.css';

const raiz = document.getElementById('raiz');
if (!raiz) {
  throw new Error('No se encontró el elemento #raiz en index.html');
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
