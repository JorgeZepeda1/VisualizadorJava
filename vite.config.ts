import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { manifiesto } from './src/interfaz/pwa/manifiesto.ts';

// La ruta base se toma de BASE_PUBLICA (design.md §9). P1 fija el repositorio real
// (JorgeZepeda1/VisualizadorJava → /VisualizadorJava/, ya usado en .github/workflows/desplegar.yml);
// en desarrollo y pruebas locales la raíz basta.
const basePublica = process.env.BASE_PUBLICA ?? '/';

export default defineConfig({
  base: basePublica,
  // El trabajador se importa con el sufijo `?worker` de Vite (src/trabajador/cliente.ts), NUNCA
  // `new Worker(new URL('./trabajador.ts', import.meta.url))`: esa forma tiene un defecto real en
  // Vite 8.3.1/Rolldown — nombra el chunk emitido con la extensión LITERAL del origen
  // (`trabajador-<hash>.ts`) en vez de `.js`, y la mayoría de los servidores estáticos (incluidos
  // `vite preview` y GitHub Pages) sirven `.ts` como `video/mp2t` (MPEG transport stream); el
  // navegador rechaza cargarlo como módulo ES y el trabajador nunca arranca. Verificado con un
  // build real (tarea 0.15): con `?worker`, el chunk sale `.js` correctamente por omisión.
  plugins: [
    react(),
    // PWA mínima (tarea 0.11, ADR 014): precache completo (incluidos el trabajador — un chunk JS
    // más del build de Vite — y la galería de corpus/) para que la app cargue sin red tras la
    // primera visita (C12). `registerType: 'prompt'` deja el aviso «Hay una versión nueva» para el
    // lote 5 (M23) — aquí el registro base (src/interfaz/pwa/registro.ts) ya lo deja listo.
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: manifiesto,
      includeAssets: ['icono-192.png', 'icono-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
      },
    }),
  ],
});
