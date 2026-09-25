import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Proyectos (design.md §7.1, §9): `motor` corre en Node sin DOM — motor, textos, presentación,
// trabajador, herramientas y las suites transversales de pruebas/ (diferencial, propiedades,
// compilación, traza, generadores) — y `interfaz` corre en jsdom para los componentes React.
// `navegadores` (Chromium/Firefox/WebKit reales) se agrega en la tarea 2.22.
// `passWithNoTests`: durante el andamiaje inicial algún proyecto puede no tener pruebas todavía
// (p. ej. `interfaz` hasta la tarea 0.14); no debe hacer fallar `npm test`.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'motor',
          environment: 'node',
          include: [
            'src/motor/**/*.test.ts',
            'src/textos/**/*.test.ts',
            'src/presentacion/**/*.test.ts',
            'src/trabajador/**/*.test.ts',
            'herramientas/**/*.test.ts',
            'pruebas/**/*.test.ts',
          ],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'interfaz',
          environment: 'jsdom',
          include: ['src/interfaz/**/*.test.{ts,tsx}'],
          // Desmonta el árbol de React entre pruebas (tarea 0.14: primeras pruebas de componentes
          // del repo) — ver src/interfaz/configuracion-pruebas.ts.
          setupFiles: ['src/interfaz/configuracion-pruebas.ts'],
        },
      },
    ],
  },
});
