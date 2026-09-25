import { defineConfig, devices } from '@playwright/test';

// E2E en los tres motores (proposal.md P3, design.md §7.1 C17): Chromium, Firefox y WebKit.
// `testDir` apunta a las suites que llegan en la tarea 0.15 (rebanada vertical) en adelante.
export default defineConfig({
  testDir: 'pruebas/e2e',
  reporter: 'dot',
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
