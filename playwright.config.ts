import { defineConfig, devices } from '@playwright/test';

// E2E en los tres motores (proposal.md P3, design.md §7.1 C17): Chromium, Firefox y WebKit.
// `testDir` apunta a las suites que llegan desde la tarea 0.15 (rebanada vertical) en adelante.
//
// `webServer` (tarea 0.15): la prueba "sin red" necesita el build real con el service worker
// activo (CLAUDE.md regla 8 — el único caso permitido de `vite build`). `npm run preview` sirve
// `dist/` tal cual sale del build, con `base` por omisión ("/") porque BASE_PUBLICA solo se fija
// en desplegar.yml — coincide con `baseURL` de aquí abajo.
//
// Diagnóstico permanente (corrección del E2E de Firefox en CI, PR #1): el primer fallo remoto llegó
// sin traza ni captura. Ahora cada prueba que falla deja su traza y su captura en `test-results/`
// (junto al `error-context.md`), y `ci.yml` las sube como artefacto cuando el job falla.
export default defineConfig({
  testDir: 'pruebas/e2e',
  reporter: 'dot',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
