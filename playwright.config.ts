import { defineConfig, devices } from '@playwright/test';
import {
  CARPETA_CON_RUTA_BASE,
  PUERTO_CON_RUTA_BASE,
  RUTA_BASE_PUBLICA,
  URL_LOCAL_CON_RUTA_BASE,
  URL_PUBLICADA,
} from './pruebas/e2e/ruta-base.ts';

// E2E en los tres motores (proposal.md P3, design.md §7.1 C17): Chromium, Firefox y WebKit.
// `testDir` apunta a las suites que llegan desde la tarea 0.15 (rebanada vertical) en adelante.
//
// `webServer` (tarea 0.15): la prueba "sin red" necesita el build real con el service worker
// activo (CLAUDE.md regla 8 — el único caso permitido de `vite build`). `npm run preview` sirve
// `dist/` tal cual sale del build, con `base` por omisión ("/") — coincide con `baseURL` de aquí abajo.
//
// Segundo sitio (tarea 5.12, REQ-PLAT-008): GitHub Pages publica bajo `/VisualizadorJava/`, no en la raíz, y casi todo lo que sale mal al publicar sale mal por la ruta (un `/assets/…` absoluto, el
// alcance del service worker, el manifiesto, el trabajador). Así que ADEMÁS del sitio normal se construye otro con `BASE_PUBLICA=/VisualizadorJava/` —la misma variable, por el mismo camino de
// `vite.config.ts`, que usa `desplegar.yml`— en su propia carpeta (`dist-ruta-base/`) y se sirve en otro puerto; `despliegue.spec.ts` lo prueba en los tres motores. Esa misma suite corre contra el
// sitio YA publicado con `URL_DESPLEGADA=https://… npm run e2e -- despliegue`: en ese caso no se construye ni se levanta nada, y solo se toma ese archivo.
//
// Diagnóstico permanente (corrección del E2E de Firefox en CI, PR #1): el primer fallo remoto llegó
// sin traza ni captura. Ahora cada prueba que falla deja su traza y su captura en `test-results/`
// (junto al `error-context.md`), y `ci.yml` las sube como artefacto cuando el job falla.
export default defineConfig({
  testDir: 'pruebas/e2e',
  ...(URL_PUBLICADA === undefined ? {} : { testMatch: 'despliegue.spec.ts' }),
  reporter: 'dot',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer:
    URL_PUBLICADA === undefined
      ? [
          {
            command: 'npm run build && npm run preview -- --port 4173 --strictPort',
            url: 'http://localhost:4173',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command:
              `npm run build -- --outDir ${CARPETA_CON_RUTA_BASE} --emptyOutDir && ` +
              `npm run preview -- --outDir ${CARPETA_CON_RUTA_BASE} --port ${PUERTO_CON_RUTA_BASE} --strictPort`,
            env: { BASE_PUBLICA: RUTA_BASE_PUBLICA },
            url: URL_LOCAL_CON_RUTA_BASE,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ]
      : undefined,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
