import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La ruta base se toma de BASE_PUBLICA (design.md §9). P1 fija el repositorio real
// (JorgeZepeda1/VisualizadorJava → /VisualizadorJava/); en desarrollo y pruebas locales
// la raíz basta. El precache de la PWA se agrega en la tarea 0.11.
const basePublica = process.env.BASE_PUBLICA ?? '/';

export default defineConfig({
  base: basePublica,
  plugins: [react()],
});
