// Manifiesto de la PWA (design.md §1.2 "pwa/", ADR 014). Lo consume `vite.config.ts`
// (`VitePWA({ manifest: manifiesto })`) — separado en su propio archivo para poder probarlo sin
// necesitar un build real (CLAUDE.md regla 8).
import type { ManifestOptions } from 'vite-plugin-pwa';

export const manifiesto: Partial<ManifestOptions> = {
  name: 'Visualizador de Java paso a paso',
  short_name: 'Visualizador Java',
  description:
    'Ejecución de Java paso a paso para bachillerato, en español de México — sin cuentas ni conexión tras la primera visita.',
  lang: 'es-MX',
  start_url: '.',
  display: 'standalone',
  theme_color: '#1e293b',
  background_color: '#ffffff',
  icons: [
    { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
  ],
};
